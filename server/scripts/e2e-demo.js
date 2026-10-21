// Reference implementation of docs/CRYPTO.md. Step 7 moves these into the frontend.
const API = process.env.API_URL || 'http://localhost:6209';
const enc = new TextEncoder();
const dec = new TextDecoder();
const AAD = enc.encode('kryptopaste:v1');

function toB64u(bytes) {
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin)
    .replaceAll('+', '-')
    .replaceAll('/', '_')
    .replaceAll('=', '');
}

function fromB64u(text) {
  const b64 = text.replaceAll('-', '+').replaceAll('_', '/');
  const bin = atob(b64.padEnd(Math.ceil(b64.length / 4) * 4, '='));
  return Uint8Array.from(bin, (c) => c.charCodeAt(0));
}

async function encryptPaste(payload) {
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

async function decryptPaste({ ciphertext, iv }, keyText) {
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

async function api(path, options) {
  const res = await fetch(`${API}${path}`, {
    headers: { 'content-type': 'application/json' },
    ...options,
  });
  return { status: res.status, body: await res.json() };
}

async function createPaste(payload, burn) {
  const { ciphertext, iv, key } = await encryptPaste(payload);
  const res = await api('/api/pastes', {
    method: 'POST',
    body: JSON.stringify({ ciphertext, iv, ttl: '1h', burn }),
  });
  return { ...res, key, link: `${API}/p/${res.body.id}#${key}` };
}

// 1. Burn-after-read paste
const created = await createPaste(
  { v: 1, title: 'hello', text: 'secret text' },
  true,
);
console.log('create:', created.status, created.body);
console.log('link:', created.link);

// The reader only has the link.
const url = new URL(created.link);
const id = url.pathname.split('/').pop();
const keyFromLink = url.hash.slice(1);

const first = await api(`/api/pastes/${id}`);
console.log('first read:', first.status);
console.log('decrypted:', await decryptPaste(first.body, keyFromLink));

const second = await api(`/api/pastes/${id}`);
console.log('second read (should be 404):', second.status, second.body);

// 2. Wrong key must fail
const normal = await createPaste({ v: 1, text: 'not for you' }, false);
const read = await api(`/api/pastes/${normal.body.id}`);
const wrong = await encryptPaste({ v: 1, text: 'other' });
try {
  await decryptPaste(read.body, wrong.key);
  console.log('BUG: wrong key worked!');
} catch {
  console.log('wrong key rejected (good)');
}
