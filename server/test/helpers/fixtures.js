// The server cannot tell real ciphertext from random text, so fakes are fine here.
export function validBody(overrides = {}) {
  return {
    ciphertext: 'A'.repeat(40),
    iv: 'B'.repeat(16),
    ttl: '1h',
    burn: false,
    ...overrides,
  };
}
