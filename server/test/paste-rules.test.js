import { describe, expect, it } from 'vitest';
import { HttpError } from '../src/middleware/error-handler.js';
import {
  MAX_CIPHERTEXT_BYTES,
  TTL_SECONDS,
  parseCreateBody,
} from '../src/paste-rules.js';
import { validBody } from './helpers/fixtures.js';

describe('parseCreateBody', () => {
  it('accepts a valid body and turns ttl into seconds', () => {
    const out = parseCreateBody(validBody({ ttl: '1d', burn: true }));
    expect(out.ttlSeconds).toBe(TTL_SECONDS['1d']);
    expect(out.burn).toBe(true);
  });

  it('defaults burn to false', () => {
    const body = validBody();
    delete body.burn;
    expect(parseCreateBody(body).burn).toBe(false);
  });

  it.each([
    ['no body', undefined],
    ['array body', []],
    [
      'ciphertext is an object (NoSQL trick)',
      validBody({ ciphertext: { $gt: '' } }),
    ],
    ['ciphertext too short', validBody({ ciphertext: 'abc' })],
    [
      'ciphertext has bad characters',
      validBody({ ciphertext: '!'.repeat(40) }),
    ],
    [
      'ciphertext too long',
      validBody({
        ciphertext: 'A'.repeat(Math.ceil((MAX_CIPHERTEXT_BYTES * 4) / 3) + 1),
      }),
    ],
    ['iv has the wrong length', validBody({ iv: 'B'.repeat(15) })],
    ['ttl is not allowed', validBody({ ttl: '100y' })],
    ['ttl is a prototype key', validBody({ ttl: 'constructor' })],
    ['ttl is missing', validBody({ ttl: undefined })],
    ['burn is not a boolean', validBody({ burn: 'yes' })],
  ])('rejects: %s', (_name, body) => {
    expect(() => parseCreateBody(body)).toThrow(HttpError);
  });
});
