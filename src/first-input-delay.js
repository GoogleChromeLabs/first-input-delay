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

(function() {
  var listenerOpts = {passive: true, capture: true};
  var eventTypes = [
    'click',
    'mousedown',
    'keydown',
    'touchstart',
    'pointerdown',
  ];

  var firstInputDelay;
  var firstInputEvent;
  var firstInputCallbacks = [];

  /**
   * Accepts a callback to be invoked once the first input delay and event
   * are known.
   * @param {!Function} callback
   */
  function onFirstInputDelay(callback) {
    firstInputCallbacks.push(callback);
    reportDelayIfReady();
  }

  /**
   * Records the first input delay and event, so subsequent events can be
   * ignored. All added event listeners are then removed.
   * @param {number} delay
   * @param {!Event} evt
   */
  function recordDelay(delay, evt) {
    if (!firstInputDelay) {
      firstInputDelay = delay;
      firstInputEvent = evt;

      eventTypes.forEach(function(eventType) {
        removeEventListener(eventType, onInput, listenerOpts);
      });

      reportDelayIfReady();
    }
  }

  /**
   * Reports the first input delay and event (if set) by invoking the set of
   * callback function (if set). If any of these are not set, nothing happens.
   */
  function reportDelayIfReady() {
    if (firstInputDelay && firstInputEvent && firstInputCallbacks.length > 0) {
      firstInputCallbacks.forEach(function(callback) {
        callback(firstInputDelay, firstInputEvent);
      });
      firstInputCallbacks = [];
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
      recordDelay(delay, evt);
      removeListeners();
    }

    /**
     * Responds to pointercancel events and removes pointer listeners.
     * If a pointercancel is the next event to fire after a pointerdown event,
     * it means this is a scroll or pinch/zoom interaction.
     */
    function onPointerCancel() {
      removeListeners();
    }

    /**
     * Removes added pointer event listeners.
     */
    function removeListeners() {
      removeEventListener('pointerup', onPointerUp, listenerOpts);
      removeEventListener('pointercancel', onPointerCancel, listenerOpts);
    }

    addEventListener('pointerup', onPointerUp, listenerOpts);
    addEventListener('pointercancel', onPointerCancel, listenerOpts);
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
      var now = performance.now();
      var eventTimeStamp = evt.timeStamp;

      // In some browsers event.timeStamp returns a DOMTimeStamp instead of
      // a DOMHighResTimeStamp, which means we need to compare it to
      // Date.now() instead of performance.now().
      if (eventTimeStamp > now) {
        now = +new Date;
      }

      var delay = now - eventTimeStamp;

      if (evt.type == 'pointerdown') {
        onPointerDown(delay, evt);
        return;
      }

      recordDelay(delay, evt);
    }
  }

  // TODO(tdresser): only register touchstart/pointerdown if other
  // listeners are present.
  eventTypes.forEach(function(eventType) {
    addEventListener(eventType, onInput, listenerOpts);
  });

  // Don't override the perfMetrics namespace if it already exists.
  window['perfMetrics'] = window['perfMetrics'] || {};

  // Expose `perfMetrics.onFirstInputDelay` as a promise that can be awaited.
  window['perfMetrics']['onFirstInputDelay'] = onFirstInputDelay;
})();
