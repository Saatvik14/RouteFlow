const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const appJson = JSON.parse(fs.readFileSync(path.join(__dirname, '../../app/app.json'), 'utf8'));
const fleetNotificationServiceCode = fs.readFileSync(path.join(__dirname, '../api/src/services/fleetNotificationService.js'), 'utf8');
const pushNotificationServiceCode = fs.readFileSync(path.join(__dirname, '../../app/src/services/notifications/pushNotificationService.ts'), 'utf8');

test('app.json contains POST_NOTIFICATIONS permission for Android 13+', () => {
  const permissions = appJson.expo.android.permissions || [];
  assert.ok(
    permissions.includes('android.permission.POST_NOTIFICATIONS'),
    'app.json must include android.permission.POST_NOTIFICATIONS'
  );
});

test('app.json contains expo-notifications plugin configured', () => {
  const plugins = appJson.expo.plugins || [];
  const hasNotificationsPlugin = plugins.some((p) => {
    if (typeof p === 'string') return p === 'expo-notifications';
    if (Array.isArray(p)) return p[0] === 'expo-notifications';
    return false;
  });
  assert.ok(hasNotificationsPlugin, 'app.json must configure expo-notifications plugin');
});

test('app.json intentFilters properly configure routefloww scheme and domain', () => {
  const intentFilters = appJson.expo.android.intentFilters || [];
  assert.ok(intentFilters.length >= 2, 'app.json should have separate intent filters for custom schemes and web domain');

  const customSchemeFilter = intentFilters.find((f) =>
    f.data?.some((d) => d.scheme === 'routefloww')
  );
  assert.ok(customSchemeFilter, 'intentFilters must support routefloww scheme');
  assert.notEqual(customSchemeFilter.autoVerify, true, 'Custom scheme intentFilter must NOT have autoVerify: true');

  const schemes = appJson.expo.scheme;
  assert.ok(
    schemes === 'routefloww' || (Array.isArray(schemes) && schemes.includes('routefloww')),
    'expo.scheme must register routefloww'
  );
});

test('fleetNotificationService includes direct routefloww:// deep link in email HTML', () => {
  assert.match(fleetNotificationServiceCode, /href="routefloww:\/\/marketplace"/);
  assert.match(fleetNotificationServiceCode, /href="https:\/\/routefloww\.com\/marketplace\?openApp=true"/);
});

test('fleetNotificationService sends high priority Expo push notifications with channelId and foreground display', () => {
  assert.match(fleetNotificationServiceCode, /channelId:\s*'fleet-routes'/);
  assert.match(fleetNotificationServiceCode, /priority:\s*'high'/);
  assert.match(fleetNotificationServiceCode, /_displayInForeground:\s*true/);
  assert.match(fleetNotificationServiceCode, /https:\/\/exp\.host\/--\/api\/v2\/push\/send/);
});

test('pushNotificationService configures MAX importance Android channel and token fallback', () => {
  assert.match(pushNotificationServiceCode, /Notifications\.AndroidImportance\.MAX/);
  assert.match(pushNotificationServiceCode, /Notifications\.getExpoPushTokenAsync/);
  assert.match(pushNotificationServiceCode, /registerPushToken/);
});
