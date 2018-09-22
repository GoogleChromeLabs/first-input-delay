/*
 Copyright 2018 Google Inc. All Rights Reserved.
 Licensed under the Apache License, Version 2.0 (the "License");
 you may not use this file except in compliance with the License.
 You may obtain a copy of the License at

     http://www.apache.org/licenses/LICENSE-2.0

 Unless required by applicable law or agreed to in writing, software
 distributed under the License is distributed on an "AS IS" BASIS,
 WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 See the License for the specific language governing permissions and
 limitations under the License.
*/

(function(addEventListener, removeEventListener) {
  var firstInputEvent;
  var firstInputDelay;
  var firstInputTimeStamp;

  var callbacks = [];
  var listenerOpts = {passive: true, capture: true};
  var startTimeStamp = new Date;

  var pointerup = 'pointerup';
  var pointercancel = 'pointercancel';

  /**
   * Accepts a callback to be invoked once the first input delay and event
   * are known.
   * @param {!Function} callback
   */
  function onFirstInputDelay(callback) {
    callbacks.push(callback);
    reportFirstInputDelayIfRecordedAndValid();
  }

  /**
   * Records the first input delay and event, so subsequent events can be
   * ignored. All added event listeners are then removed.
   * @param {number} delay
   * @param {!Event} evt
   */
  function recordFirstInputDelay(delay, evt) {
    if (!firstInputEvent) {
      firstInputEvent = evt;
      firstInputDelay = delay;
      firstInputTimeStamp = new Date;

      eachEventType(removeEventListener);
      reportFirstInputDelayIfRecordedAndValid();
    }
  }

  /**
   * Reports the first input delay and event (if they're recorded and valid)
   * by running the array of callback functions.
   */
  function reportFirstInputDelayIfRecordedAndValid() {
    // In some cases the recorded delay is clearly wrong, e.g. it's negative
    // or it's larger than the time between now and when the page was loaded.
    // - https://github.com/GoogleChromeLabs/first-input-delay/issues/4
    // - https://github.com/GoogleChromeLabs/first-input-delay/issues/6
    // - https://github.com/GoogleChromeLabs/first-input-delay/issues/7
    if (firstInputDelay >= 0 &&
        firstInputDelay < firstInputTimeStamp - startTimeStamp) {
      callbacks.forEach(function(callback) {
        callback(firstInputDelay, firstInputEvent);
      });
      callbacks = [];
    }
  }

  /**
   * Handles pointer down events, which are a special case.
   * Pointer events can trigger main or compositor thread behavior.
   * We differenciate these cases based on whether or not we see a
   * pointercancel event, which are fired when we scroll. If we're scrolling
   * we don't need to report input delay since FID excludes scrolling and
   * pinch/zooming.
   * @param {number} delay
   * @param {!Event} evt
   */
  function onPointerDown(delay, evt) {
    /**
     * Responds to pointerup events and records a delay. If a pointer up event
     * is the next event after a pointerdown event, then it's not a sroll or
     * a pinch/zoom.
     */
    function onPointerUp() {
      recordFirstInputDelay(delay, evt);
      removePointerEventListeners();
    }

    /**
     * Responds to pointercancel events and removes pointer listeners.
     * If a pointercancel is the next event to fire after a pointerdown event,
     * it means this is a scroll or pinch/zoom interaction.
     */
    function onPointerCancel() {
      removePointerEventListeners();
    }

    /**
     * Removes added pointer event listeners.
     */
    function removePointerEventListeners() {
      removeEventListener(pointerup, onPointerUp, listenerOpts);
      removeEventListener(pointercancel, onPointerCancel, listenerOpts);
    }

    addEventListener(pointerup, onPointerUp, listenerOpts);
    addEventListener(pointercancel, onPointerCancel, listenerOpts);
  }

  /**
   * Handles all input events and records the time between when the event
   * was received by the operating system and when it's JavaScript listeners
   * were able to run.
   * @param {!Event} evt
   */
  function onInput(evt) {
    // Only count cancelable events, which should trigger behavior
    // important to the user.
    if (evt.cancelable) {
      // In some browsers `event.timeStamp` returns a `DOMTimeStamp` value
      // (epoch time) istead of the newer `DOMHighResTimeStamp`
      // (document-origin time). To check for that we assume any timestamp
      // greater than 1 trillion is a `DOMTimeStamp`, and compare it using
      // the `Date` object rather than `performance.now()`.
      // - https://github.com/GoogleChromeLabs/first-input-delay/issues/4
      var isEpochTime = evt.timeStamp > 1e12;
      var now = isEpochTime ? new Date : performance.now();

      // Input delay is the delta between when the system received the event
      // (e.g. evt.timeStamp) and when it could run the callback (e.g. `now`).
      var delay = now - evt.timeStamp;

      if (evt.type == 'pointerdown') {
        onPointerDown(delay, evt);
      } else {
        recordFirstInputDelay(delay, evt);
      }
    }
  }

  /**
   * Invokes the passed callback function for each event type with the
   * `onInput` function and `listenerOpts`.
   * @param {!Function} callback
   */
  function eachEventType(callback) {
    var eventTypes = [
      'click',
      'mousedown',
      'keydown',
      'touchstart',
      'pointerdown',
    ];
    eventTypes.forEach(function(eventType) {
      callback(eventType, onInput, listenerOpts);
    });
  }

  // TODO(tdresser): only register touchstart/pointerdown if other
  // listeners are present.
  eachEventType(addEventListener);

  // Don't override the perfMetrics namespace if it already exists.
  self['perfMetrics'] = self['perfMetrics'] || {};
  self['perfMetrics']['onFirstInputDelay'] = onFirstInputDelay;
})(addEventListener, removeEventListener);
