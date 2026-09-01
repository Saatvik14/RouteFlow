const test = require('node:test');
const assert = require('node:assert/strict');

const {
  buildPublicListing,
  normalizeCurrency,
  parseMoney,
  rangesOverlap,
  validateRouteWindow,
} = require('../api/src/services/marketplacePolicyService');

const now = new Date('2026-09-01T10:00:00.000Z');

test('public listings require lead time and close bidding before departure', () => {
  const listing = buildPublicListing({
    startValue: '2026-09-01T12:00:00.000Z',
    endValue: '2026-09-01T15:00:00.000Z',
    maxCost: '125.50',
    currency: 'gbp',
    now,
  });
  assert.equal(listing.maxCost, 125.5);
  assert.equal(listing.currency, 'GBP');
  assert.equal(listing.biddingClosesAt.toISOString(), '2026-09-01T11:45:00.000Z');
  assert.throws(
    () => buildPublicListing({
      startValue: '2026-09-01T10:29:59.000Z',
      endValue: '2026-09-01T11:00:00.000Z',
      maxCost: 40,
      currency: 'GBP',
      now,
    }),
    (error) => error.code === 'PUBLIC_ROUTE_TOO_SOON',
  );
});

test('route windows reject zero, reversed and excessively long ranges', () => {
  assert.throws(
    () => validateRouteWindow({ startValue: '2026-09-01T12:00:00Z', endValue: '2026-09-01T12:00:00Z' }),
    (error) => error.code === 'INVALID_ROUTE_TIME',
  );
  assert.throws(
    () => validateRouteWindow({ startValue: '2026-09-02T12:00:00Z', endValue: '2026-09-01T12:00:00Z' }),
    (error) => error.code === 'INVALID_ROUTE_TIME',
  );
  assert.throws(
    () => validateRouteWindow({ startValue: '2026-09-01T12:00:00Z', endValue: '2026-09-02T12:00:01Z' }),
    (error) => error.code === 'ROUTE_WINDOW_TOO_LONG',
  );
});

test('money and currency rules prevent invalid marketplace bids', () => {
  assert.equal(parseMoney('19.99'), 19.99);
  assert.equal(normalizeCurrency('inr'), 'INR');
  assert.throws(() => parseMoney(0), (error) => error.code === 'INVALID_MARKETPLACE_COST');
  assert.throws(() => parseMoney(12.345), (error) => error.code === 'INVALID_MARKETPLACE_COST');
  assert.throws(() => normalizeCurrency('USD'), (error) => error.code === 'INVALID_MARKETPLACE_CURRENCY');
});

test('time overlap uses half-open windows so back-to-back routes are allowed', () => {
  assert.equal(rangesOverlap('2026-09-01T10:00:00Z', '2026-09-01T11:00:00Z', '2026-09-01T10:30:00Z', '2026-09-01T12:00:00Z'), true);
  assert.equal(rangesOverlap('2026-09-01T10:00:00Z', '2026-09-01T11:00:00Z', '2026-09-01T11:00:00Z', '2026-09-01T12:00:00Z'), false);
});
