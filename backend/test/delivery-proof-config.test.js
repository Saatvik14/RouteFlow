const test = require('node:test');
const assert = require('node:assert/strict');

const { resolveDeliveryProofConfig } = require('../api/src/config/deliveryProof');

test('photo proof is the safe default', () => {
  assert.deepEqual(resolveDeliveryProofConfig({}), {
    photoEnabled: true,
    otpEnabled: false,
    mode: 'photo',
  });
});

test('OTP proof can be enabled independently', () => {
  assert.equal(resolveDeliveryProofConfig({
    DELIVERY_PHOTO_PROOF_ENABLED: 'false',
    DELIVERY_OTP_PROOF_ENABLED: 'true',
  }).mode, 'otp');
});

test('delivery proof flags must be mutually exclusive', () => {
  assert.throws(() => resolveDeliveryProofConfig({
    DELIVERY_PHOTO_PROOF_ENABLED: 'true',
    DELIVERY_OTP_PROOF_ENABLED: 'true',
  }), /Exactly one delivery proof system/);
  assert.throws(() => resolveDeliveryProofConfig({
    DELIVERY_PHOTO_PROOF_ENABLED: 'false',
    DELIVERY_OTP_PROOF_ENABLED: 'false',
  }), /Exactly one delivery proof system/);
});
