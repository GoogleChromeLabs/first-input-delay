# First Input Delay

A JavaScript library for measuring [First Input Delay (FID)](https://developers.google.com/web/updates/2018/05/first-input-delay) in the browser. See [the article](https://developers.google.com/web/updates/2018/05/first-input-delay) for a detailed metric description and explanation.

## Installation

You can install this library from npm by running:

```sh
npm install --save-dev first-input-delay
```

## Usage

To use this library to measure FID on your web site or application, you must do two things.

**1) Add the minified code in [`dist/first-input-delay.js`](/dist/first-input-delay.min.js) to the `<head>` of your document.**

The code in this file adds the necessary event listeners to detect the first user input, and since user input on a page can happen at any time, it's critical that this code runs as early as possible.

Since it's less than 400 bytes (gzipped), we recommended you inline it directly into your document `<head>` to avoid a blocking request.

**2) Register a callback to run when FID is detected.**

The code in step (1) above exposes the global method `perfMetrics.onFirstInputDelay()`, which takes a function that is invoked with the delay value in milliseconds as well as the `Event` object from the first input.

For example, to detect FID and report it as an event to Google Analytics, you could use the following code:

```js
// The perfMetrics object is created by the code that goes in <head>.
perfMetrics.onFirstInputDelay(function(delay, evt) {
  ga('send', 'event', {
    eventCategory: 'Perf Metrics',
    eventAction: 'first-input-delay',
    eventLabel: evt.type,
    // Event values must be an integer.
    eventValue: Math.round(delay),
    // Exclude this event from bounce rate calculations.
    nonInteraction: true,
  });
});
```

## Browser support

This code has been tested and known to work in all major browsers as well as Internet Explorer back to version 9.
