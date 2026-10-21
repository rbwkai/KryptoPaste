import { HttpError } from './middleware/error-handler.js';

export const TTL_SECONDS = {
  '1h': 60 * 60,
  '1d': 24 * 60 * 60,
  '7d': 7 * 24 * 60 * 60,
  '30d': 30 * 24 * 60 * 60,
};

export const MAX_CIPHERTEXT_BYTES = 100 * 1024;
const MAX_CIPHERTEXT_CHARS = Math.ceil((MAX_CIPHERTEXT_BYTES * 4) / 3);
const MIN_CIPHERTEXT_CHARS = 22; // at least the 16-byte GCM tag
const IV_CHARS = 16; // 12 bytes in base64url

const BASE64URL = /^[A-Za-z0-9_-]+$/;
export const ID_PATTERN = /^[A-Za-z0-9_-]{22}$/; // 16 bytes in base64url

function invalid() {
  return new HttpError(400, 'invalid_paste');
}

// Strict checks. Anything unexpected is rejected, nothing is "fixed".
export function parseCreateBody(body) {
  const { ciphertext, iv, ttl, burn } = body ?? {};

  if (
    typeof ciphertext !== 'string' ||
    ciphertext.length < MIN_CIPHERTEXT_CHARS ||
    ciphertext.length > MAX_CIPHERTEXT_CHARS ||
    !BASE64URL.test(ciphertext)
  ) {
    throw invalid();
  }
  if (typeof iv !== 'string' || iv.length !== IV_CHARS || !BASE64URL.test(iv)) {
    throw invalid();
  }
  if (typeof ttl !== 'string' || !Object.hasOwn(TTL_SECONDS, ttl)) {
    throw invalid();
  }
  if (burn !== undefined && typeof burn !== 'boolean') {
    throw invalid();
  }

  return { ciphertext, iv, ttlSeconds: TTL_SECONDS[ttl], burn: burn === true };
}
