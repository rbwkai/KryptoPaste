// Reference implementation of docs/CRYPTO.md (v1).
// Step 7 moves this into the frontend.
const enc = new TextEncoder();
const dec = new TextDecoder();
const AAD = enc.encode('kryptopaste:v1');

export function toB64u(bytes) {
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin)
    .replaceAll('+', '-')
    .replaceAll('/', '_')
    .replaceAll('=', '');
}

export function fromB64u(text) {
  const b64 = text.replaceAll('-', '+').replaceAll('_', '/');
  const bin = atob(b64.padEnd(Math.ceil(b64.length / 4) * 4, '='));
  return Uint8Array.from(bin, (c) => c.charCodeAt(0));
}

export async function encryptPaste(payload) {
  const key = await crypto.subtle.generateKey(
    { name: 'AES-GCM', length: 256 },
    true,
    ['encrypt', 'decrypt'],
  );
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const data = enc.encode(JSON.stringify(payload));
  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv, additionalData: AAD },
    key,
    data,
  );
  const rawKey = new Uint8Array(await crypto.subtle.exportKey('raw', key));
  return {
    ciphertext: toB64u(new Uint8Array(encrypted)),
    iv: toB64u(iv),
    key: toB64u(rawKey),
  };
}

export async function decryptPaste({ ciphertext, iv }, keyText) {
  const key = await crypto.subtle.importKey(
    'raw',
    fromB64u(keyText),
    'AES-GCM',
    false,
    ['decrypt'],
  );
  const plain = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: fromB64u(iv), additionalData: AAD },
    key,
    fromB64u(ciphertext),
  );
  return JSON.parse(dec.decode(plain));
}
