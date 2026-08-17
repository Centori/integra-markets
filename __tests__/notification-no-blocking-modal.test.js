/**
 * A foreground notification must not block the UI.
 *
 * Reported on build 88 (2026-08-17) with a screenshot: a "Breaking News /
 * Hormuz Tanker Traffic Slows to a Trickle / OK" dialog sat over the feed, and
 * had to be dismissed before any card could be read — repeatedly, because news
 * alerts were firing in a loop.
 *
 * The cause was in `setupNotificationListeners`:
 *
 *     Notifications.addNotificationReceivedListener(notification => {
 *       Alert.alert(notification.request.content.title,
 *                   notification.request.content.body);   // modal, blocks all
 *       ...
 *     });
 *
 * iOS already shows an unobtrusive banner for a foreground notification, so
 * this only added an interruption. Asserted at the source level because the
 * behaviour is a property of that listener body, and a snapshot of rendered
 * output would not catch it coming back.
 */

const fs = require('fs');
const path = require('path');

/**
 * Strip comments before matching.
 *
 * These assertions are about what the code DOES, and both fixes are documented
 * in place by comments that necessarily quote the old code they replaced — so
 * matching raw source would find `Alert.alert(...)` and
 * `highImpactNews.slice(0, 3)` inside the very explanations of their removal.
 */
function codeOnly(text) {
  return text
    .replace(/\/\*[\s\S]*?\*\//g, '')   // block comments
    .replace(/(^|[^:])\/\/.*$/gm, '$1'); // line comments, sparing "https://"
}

const SERVICE = path.join(__dirname, '..', 'app', 'services', 'notificationService.js');
const source = codeOnly(fs.readFileSync(SERVICE, 'utf8'));

/** Body of setupNotificationListeners, where the received-listener lives. */
function receivedListenerBody() {
  const start = source.indexOf('addNotificationReceivedListener');
  expect(start).toBeGreaterThan(-1);
  const end = source.indexOf('addNotificationResponseReceivedListener', start);
  return source.slice(start, end === -1 ? start + 2000 : end);
}

describe('foreground notification handling', () => {
  it('does not raise a blocking Alert.alert for received notifications', () => {
    const body = receivedListenerBody();
    const calls = body.match(/Alert\.alert\s*\(/g) || [];
    expect(calls).toHaveLength(0);
  });

  it('does not pass notification content straight into a dialog', () => {
    const body = receivedListenerBody();
    expect(body).not.toMatch(/Alert\.alert\([^)]*request\.content/s);
  });

  it('still forwards the notification to the app callback', () => {
    // Removing the modal must not also remove delivery — the app needs this to
    // refresh the feed or show an in-app indicator.
    const body = receivedListenerBody();
    expect(body).toMatch(/onNotificationReceived/);
  });

  it('keeps the tap handler wired', () => {
    expect(source).toMatch(/addNotificationResponseReceivedListener/);
    expect(source).toMatch(/onNotificationResponse/);
  });
});

describe('news alerts are de-duplicated before they are sent', () => {
  const MONITOR = path.join(__dirname, '..', 'app', 'services', 'alertMonitoringService.js');
  const monitor = codeOnly(fs.readFileSync(MONITOR, 'utf8'));

  it('checkNewsAlerts routes through selectNotifiable', () => {
    expect(monitor).toMatch(/selectNotifiable/);
  });

  it('no longer fires an unconditional slice of alerts every tick', () => {
    // The deluge: `for (const news of highImpactNews.slice(0, 3))` with no
    // memory of what had already been announced.
    expect(monitor).not.toMatch(/highImpactNews\.slice\(0,\s*3\)/);
  });

  it('carries url and published through so articles have a stable identity', () => {
    const fetchFn = monitor.slice(
      monitor.indexOf('async function fetchRealNewsData'),
      monitor.indexOf('class AlertMonitoringService')
    );
    expect(fetchFn).toMatch(/url:/);
    expect(fetchFn).toMatch(/published:/);
  });
});
