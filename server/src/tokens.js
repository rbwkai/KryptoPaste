import { createHash, randomBytes } from 'node:crypto';

export function hashToken(token) {
  return createHash('sha256').update(token).digest('hex');
}

// The token is random, so a fast hash is enough (slow hashes are for passwords).
export function createDeleteToken() {
  const token = randomBytes(24).toString('base64url');
  return { token, hash: hashToken(token) };
}
