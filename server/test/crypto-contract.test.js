import { describe, expect, it } from 'vitest';
import {
  decryptPaste,
  encryptPaste,
  fromB64u,
  toB64u,
} from '../../client/src/crypto.js';

describe('crypto contract v1', () => {
  it('round-trips unicode text', async () => {
    const payload = { v: 1, title: 't', text: 'secret ✓ বাংলা 🔐' };
    const { ciphertext, iv, key } = await encryptPaste(payload);
    expect(await decryptPaste({ ciphertext, iv }, key)).toEqual(payload);
  });

  it('uses the sizes written in docs/CRYPTO.md', async () => {
    const { iv, key, ciphertext } = await encryptPaste({ v: 1, text: 'x' });
    expect(iv).toHaveLength(16);
    expect(key).toHaveLength(43);
    expect(fromB64u(iv)).toHaveLength(12);
    expect(fromB64u(key)).toHaveLength(32);
    expect(ciphertext).toMatch(/^[A-Za-z0-9_-]+$/);
  });

  it('fails with the wrong key', async () => {
    const a = await encryptPaste({ v: 1, text: 'a' });
    const b = await encryptPaste({ v: 1, text: 'b' });
    await expect(decryptPaste(a, b.key)).rejects.toThrow();
  });

  it('fails if one bit of the ciphertext changes', async () => {
    const { ciphertext, iv, key } = await encryptPaste({ v: 1, text: 'a' });
    const bytes = fromB64u(ciphertext);
    bytes[0] ^= 1;
    await expect(
      decryptPaste({ ciphertext: toB64u(bytes), iv }, key),
    ).rejects.toThrow();
  });

  it('fails if the iv changes', async () => {
    const { ciphertext, iv, key } = await encryptPaste({ v: 1, text: 'a' });
    const bytes = fromB64u(iv);
    bytes[0] ^= 1;
    await expect(
      decryptPaste({ ciphertext, iv: toB64u(bytes) }, key),
    ).rejects.toThrow();
  });

  it('uses a fresh key and iv every time', async () => {
    const a = await encryptPaste({ v: 1, text: 'same' });
    const b = await encryptPaste({ v: 1, text: 'same' });
    expect(a.key).not.toBe(b.key);
    expect(a.iv).not.toBe(b.iv);
    expect(a.ciphertext).not.toBe(b.ciphertext);
  });
});
