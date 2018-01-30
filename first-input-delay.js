"use strict";

(function() {
  // TODO - only register touchstart / pointerdown if other listeners are present.
  const eventTypes = ['mousedown', 'keydown', 'touchstart', 'pointerdown'];
  let has_dispatched_delay_event = false;

  function dispatchDelayEvent(delay) {
    if (has_dispatched_delay_event)
      return;
    has_dispatched_delay_event = true;

    const firstInputDelayEvent = new CustomEvent('first-input', {detail: {delay}});
    document.dispatchEvent(firstInputDelayEvent);

    for (let eventType of eventTypes) {
      document.removeEventListener(eventType, onInput, {passive:true, capture:true});
    }
  }

  // Pointer events can trigger main or compositor thread behavior. We
  // differenciate these cases based on whether or not we see a
  // pointercancel. pointercancels are fired when we scroll. If we scroll, we
  // don't consider this a real input.
  function processPointerDown(delay) {
    function removeListeners() {
      document.removeEventListener('pointerup', processPointerUp, {passive:true, capture:true});
      document.removeEventListener('pointercancel', processPointerCancel, {passive:true, capture:true});
    }

    function processPointerUp() {
      dispatchDelayEvent(delay);
      removeListeners();
    }

    function processPointerCancel() {
      removeListeners();
    }

    document.addEventListener('pointerup', processPointerUp, {passive:true, capture:true});
    document.addEventListener('pointercancel', processPointerCancel, {passive:true, capture:true});
  }

  function onInput(event) {
    // Only count cancelable events, which should trigger behavior important to the user.
    if (event.cancelable == false)
      return;

    const delay = performance.now() - event.timeStamp;

    if (event.type == 'pointerdown') {
      processPointerDown(delay);
      return;
    }

    dispatchDelayEvent(delay);
  }

  for (let eventType of eventTypes)
    document.addEventListener(eventType, onInput, {passive:true, capture:true});
})();
