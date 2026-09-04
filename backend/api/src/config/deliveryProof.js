const parseBoolean = (value, fallback) => {
  if (value === undefined || value === null || value === '') return fallback;
  const normalized = String(value).trim().toLowerCase();
  if (['true', '1', 'yes', 'on'].includes(normalized)) return true;
  if (['false', '0', 'no', 'off'].includes(normalized)) return false;
  throw new Error(`Invalid delivery-proof flag value: ${value}`);
};

const resolveDeliveryProofConfig = (environment = process.env) => {
  const photoEnabled = parseBoolean(
    environment.DELIVERY_PHOTO_PROOF_ENABLED,
    true
  );
  const otpEnabled = parseBoolean(
    environment.DELIVERY_OTP_PROOF_ENABLED,
    false
  );

  if (photoEnabled === otpEnabled) {
    throw new Error(
      'Exactly one delivery proof system must be enabled: set DELIVERY_PHOTO_PROOF_ENABLED and DELIVERY_OTP_PROOF_ENABLED to opposite boolean values.'
    );
  }

  return {
    photoEnabled,
    otpEnabled,
    mode: photoEnabled ? 'photo' : 'otp',
  };
};

module.exports = { parseBoolean, resolveDeliveryProofConfig };
