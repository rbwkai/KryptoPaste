import { describe, expect, it } from 'vitest';
import { createDeleteToken, hashToken } from '../src/tokens.js';

describe('delete tokens', () => {
  it('makes a 32-char url-safe token and a 64-char hex hash', () => {
    const { token, hash } = createDeleteToken();
    expect(token).toMatch(/^[A-Za-z0-9_-]{32}$/);
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
    expect(hashToken(token)).toBe(hash);
  });

  it('never makes the same token twice', () => {
    expect(createDeleteToken().token).not.toBe(createDeleteToken().token);
  });

  it('the hash does not reveal the token', () => {
    const { token, hash } = createDeleteToken();
    expect(hash).not.toContain(token);
  });
});
