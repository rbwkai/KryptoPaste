import { decryptPaste, encryptPaste } from './client-crypto.js';

const API = process.env.API_URL || 'http://localhost:3000';

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

const created = await createPaste(
  { v: 1, title: 'hello', text: 'secret text ✓ বাংলা' },
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

const normal = await createPaste({ v: 1, text: 'not for you' }, false);
const read = await api(`/api/pastes/${normal.body.id}`);
const wrong = await encryptPaste({ v: 1, text: 'other' });
try {
  await decryptPaste(read.body, wrong.key);
  console.log('BUG: wrong key worked!');
} catch {
  console.log('wrong key rejected (good)');
}
