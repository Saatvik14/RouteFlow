const crypto = require('crypto');
const path = require('path');
const supabase = require('../config/supabase');
const { PROOF_STORAGE_BUCKET } = require('../config/env');

const safeExtension = (file) => {
  const byMime = {
    'image/jpeg': '.jpg',
    'image/png': '.png',
    'image/webp': '.webp',
    'image/svg+xml': '.svg',
  };
  return byMime[file.mimetype] || path.extname(file.originalname || '').toLowerCase().slice(0, 8) || '.bin';
};

const storeFile = async ({ organizationId, routeId, orderId, proofType, file }) => {
  const sha256 = crypto.createHash('sha256').update(file.buffer).digest('hex');
  const common = {
    originalName: String(file.originalname || `${proofType}${safeExtension(file)}`).slice(0, 255),
    mimeType: file.mimetype,
    byteSize: file.size,
    sha256,
  };

  if (!PROOF_STORAGE_BUCKET || !supabase) {
    return { ...common, provider: 'database', storageKey: null, content: file.buffer };
  }

  const storageKey = [
    `organization-${organizationId}`,
    `route-${routeId}`,
    `stop-${orderId}`,
    `${Date.now()}-${crypto.randomUUID()}-${proofType}${safeExtension(file)}`,
  ].join('/');

  const { error } = await supabase.storage
    .from(PROOF_STORAGE_BUCKET)
    .upload(storageKey, file.buffer, {
      contentType: file.mimetype,
      cacheControl: '3600',
      upsert: false,
    });
  if (error) {
    const storageError = new Error('Proof file storage failed.');
    storageError.code = 'PROOF_STORAGE_FAILED';
    throw storageError;
  }

  return { ...common, provider: 'supabase', storageKey, content: null };
};

const deleteStoredFiles = async (storedFiles) => {
  if (!PROOF_STORAGE_BUCKET || !supabase) return;
  const keys = storedFiles.filter((file) => file.provider === 'supabase').map((file) => file.storageKey);
  if (keys.length > 0) await supabase.storage.from(PROOF_STORAGE_BUCKET).remove(keys);
};

const readStoredFile = async (proof) => {
  if (proof.storage_provider === 'database') return Buffer.from(proof.file_content);
  if (!PROOF_STORAGE_BUCKET || !supabase) {
    const error = new Error('Proof storage is unavailable.');
    error.code = 'PROOF_STORAGE_UNAVAILABLE';
    throw error;
  }
  const { data, error } = await supabase.storage.from(PROOF_STORAGE_BUCKET).download(proof.storage_key);
  if (error || !data) throw new Error('Proof file could not be read.');
  return Buffer.from(await data.arrayBuffer());
};

module.exports = { deleteStoredFiles, readStoredFile, storeFile };
