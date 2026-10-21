async function request(path, options) {
  const res = await fetch(path, {
    headers: { 'content-type': 'application/json' },
    cache: 'no-store',
    referrerPolicy: 'no-referrer',
    ...options,
  });
  let body = null;
  try {
    body = await res.json();
  } catch {
    // An empty or non-JSON answer is handled through res.status.
  }
  return { ok: res.ok, status: res.status, body };
}

export function createPaste({ ciphertext, iv, ttl, burn }) {
  return request('/api/pastes', {
    method: 'POST',
    body: JSON.stringify({ ciphertext, iv, ttl, burn }),
  });
}

export function fetchPaste(id) {
  return request(`/api/pastes/${id}`);
}
