const test = require('node:test');
const assert = require('node:assert/strict');

const {
  createSecret,
  hashSecret,
  invitationStatusAt,
  maskEmail,
} = require('../api/src/controllers/invitationController');

test('invitation secrets are high entropy and only their deterministic digest is stored', () => {
  const first = createSecret();
  const second = createSecret();
  assert.notEqual(first, second);
  assert.ok(first.length >= 40);
  assert.match(hashSecret(first), /^[a-f0-9]{64}$/);
  assert.notEqual(hashSecret(first), first);
  assert.equal(hashSecret(first), hashSecret(first));
});

test('public invitation metadata masks the recipient address', () => {
  assert.equal(maskEmail('dispatcher@example.com'), 'di********@example.com');
  assert.equal(maskEmail('a@example.com'), 'a**@example.com');
  assert.equal(maskEmail('invalid'), '');
});

test('pending invitations expire at their server expiry time', () => {
  const now = Date.parse('2026-08-23T12:00:00.000Z');
  assert.equal(invitationStatusAt({ status: 'pending', expires_at: '2026-08-23T11:59:59.999Z' }, now), 'expired');
  assert.equal(invitationStatusAt({ status: 'pending', expires_at: '2026-08-23T12:00:01.000Z' }, now), 'pending');
  assert.equal(invitationStatusAt({ status: 'revoked', expires_at: '2026-08-22T00:00:00.000Z' }, now), 'revoked');
});
