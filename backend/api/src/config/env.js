const { resolveDeliveryProofConfig } = require('./deliveryProof');

const deliveryProof = resolveDeliveryProofConfig();

module.exports = {
    PROJECT_NAME: process.env.PROJECT_NAME,
    PORT: process.env.PORT || 5000,
    DATABASE_URL: process.env.DATABASE_URL,
    JWT_ACCESS_SECRET: process.env.JWT_ACCESS_SECRET || process.env.JWT_SECRET,
    JWT_REFRESH_SECRET:
      process.env.JWT_REFRESH_SECRET ||
      (process.env.JWT_SECRET ? `${process.env.JWT_SECRET}:refresh` : undefined),
    JWT_ACCESS_EXPIRES_IN: process.env.JWT_ACCESS_EXPIRES_IN || '15m',
    JWT_REFRESH_EXPIRES_IN: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
    APP_BASE_URL: process.env.APP_BASE_URL || 'http://localhost:8081',
    INVITATION_EXPIRES_HOURS: Number(process.env.INVITATION_EXPIRES_HOURS || 48),
    LOCATION_STALE_AFTER_SECONDS: Number(process.env.LOCATION_STALE_AFTER_SECONDS || 120),
    LOCATION_MIN_UPDATE_SECONDS: Number(process.env.LOCATION_MIN_UPDATE_SECONDS || 10),
    PROOF_STORAGE_BUCKET: process.env.PROOF_STORAGE_BUCKET || '',
    MAX_PROOF_FILE_BYTES: Number(process.env.MAX_PROOF_FILE_BYTES || 8 * 1024 * 1024),
    DELIVERY_PHOTO_PROOF_ENABLED: deliveryProof.photoEnabled,
    DELIVERY_OTP_PROOF_ENABLED: deliveryProof.otpEnabled,
    DELIVERY_PROOF_MODE: deliveryProof.mode,
    GEMINI_API_KEY: process.env.GEMINI_API_KEY || '',
    GEMINI_MODEL: process.env.GEMINI_MODEL || 'gemini-2.5-flash',
};
