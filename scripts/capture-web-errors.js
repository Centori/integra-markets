// Load www.integramarkets.app in headless Chrome and dump every console message,
// page error, and failed network request. This is the actual truth about what
// the browser sees.

const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();

  const events = [];

  page.on('console', (msg) => {
    events.push({ type: 'console.' + msg.type(), text: msg.text() });
  });

  page.on('pageerror', (err) => {
    events.push({ type: 'pageerror', text: err.message, stack: err.stack });
  });

  page.on('requestfailed', (req) => {
    events.push({
      type: 'requestfailed',
      url: req.url(),
      err: req.failure() && req.failure().errorText,
    });
  });

  page.on('response', (res) => {
    if (res.status() >= 400) {
      events.push({ type: 'response.4xx-5xx', url: res.url(), status: res.status() });
    }
  });

  try {
    await page.goto('https://www.integramarkets.app/', {
      waitUntil: 'networkidle0',
      timeout: 45000,
    });
  } catch (e) {
    events.push({ type: 'goto.error', text: e.message });
  }

  // Give any deferred error boundaries a moment to render
  await new Promise((r) => setTimeout(r, 2500));

  const bodyText = await page.evaluate(() => document.body.innerText.slice(0, 800));
  events.push({ type: 'visible-body-text', text: bodyText });

  console.log(JSON.stringify(events, null, 2));

  await browser.close();
})();
