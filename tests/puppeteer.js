const server = require('./server');
const puppeteer = require('puppeteer');
const assert = require('assert');
const PORT = 8080;
let i = 0;

/**
 * Puppeteer init method
 * @param {function} callback
 */
async function init(callback) {
  const browser = await puppeteer.launch({});
  for (i of [0, 1, 2, 3]) {
    await openPage(browser);
  }
  await browser.close();
  callback();
}

/**
 * Open url in browser
 * @param {*} browser
 */
async function openPage(browser) {
  const page = await browser.newPage();
  await page.goto(`http://localhost:${PORT}`, {
    waitUntil: 'networkidle0',
  });
  const result = await page.evaluate(inputDelayHandler, i);
  assert(result, `Got input delay value as ${result} for mousedown`);
  await page.close();
}

/**
 * FID value is returned
 * @param {number} i
 * @return {number} FID value is returned
 */
function inputDelayHandler(i) {
  return new Promise((resolve, reject) => {
    perfMetrics.onFirstInputDelay(function(delay, event) {
      resolve(delay);
    });
    const eventsArr = [
      () => {
        let mEvent = document.createEvent('MouseEvents');
        mEvent.initMouseEvent('touchstart', true, true, window);
        document.body.dispatchEvent(mEvent);
      },
      () => {
        let mEvent = document.createEvent('MouseEvents');
        mEvent.initMouseEvent('click', true, true, window);
        document.body.dispatchEvent(mEvent);
      },
      () => {
        let mEvent = document.createEvent('MouseEvents');
        mEvent.initMouseEvent('mousedown', true, true, window);
        document.body.dispatchEvent(mEvent);
      },
      () => {
        let kEvent = document.createEvent('KeyboardEvent');
        kEvent.initKeyboardEvent(
          'keydown', true, true, window, false, false, false, false, 40, 0
        );
        document.body.dispatchEvent(kEvent);
      },
    ];
    eventsArr[i]();

    /**
     * Page timeout
     */
    setTimeout(() => {
      reject(false);
    }, 1000);
  });
}

server.start(PORT);
init(() => {
  server.stop();
});
