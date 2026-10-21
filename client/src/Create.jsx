import { useState } from 'react';
import { createPaste } from './api.js';
import CopyButton from './CopyButton.jsx';
import { encryptPaste } from './crypto.js';

const MAX_BYTES = 100 * 1024; // the server limit for ciphertext
const TAG_BYTES = 16; // AES-GCM adds a 16-byte tag

const EXPIRY = [
  ['1h', '1 hour'],
  ['1d', '1 day'],
  ['7d', '7 days'],
  ['30d', '30 days'],
];

export default function Create() {
  const [text, setText] = useState('');
  const [ttl, setTtl] = useState('1d');
  const [burn, setBurn] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [link, setLink] = useState('');

  async function submit() {
    if (busy || !text.trim()) return;
    setError('');

    const payload = { v: 1, title: '', lang: '', text };
    const size = new TextEncoder().encode(JSON.stringify(payload)).length;
    if (size + TAG_BYTES > MAX_BYTES) {
      setError('This is too large. The limit is about 100 KB.');
      return;
    }

    setBusy(true);
    try {
      // 1. Encrypt here, in the browser.
      const { ciphertext, iv, key } = await encryptPaste(payload);
      // 2. Send only the encrypted data. The key never goes to the server.
      const res = await createPaste({ ciphertext, iv, ttl, burn });

      if (res.status === 429) {
        setError(
          'Too many pastes from this connection. Please try again later.',
        );
      } else if (!res.ok) {
        setError('Something went wrong. Please try again.');
      } else {
        // 3. The key lives after the #, which browsers never send anywhere.
        setLink(`${location.origin}/p/${res.body.id}#${key}`);
        setText('');
      }
    } catch {
      setError('Could not reach the server.');
    } finally {
      setBusy(false);
    }
  }

  function onKeyDown(e) {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') submit();
  }

  if (link) {
    const expiry = EXPIRY.find(([value]) => value === ttl)[1];
    return (
      <section className="stack">
        <h1 className="title">Your link is ready.</h1>
        <p className="muted">
          Anyone with this link can read the paste. It holds the only copy of
          the key, so we cannot recover it for you.
        </p>
        <input
          className="field mono"
          readOnly
          value={link}
          aria-label="Paste link"
          onFocus={(e) => e.target.select()}
        />
        <div className="row">
          <CopyButton text={link} label="Copy link" primary />
          <a className="btn ghost" href="/">
            New paste
          </a>
        </div>
        <p className="hint">
          {burn ? 'Destroyed after the first read. ' : ''}Expires in {expiry}.
        </p>
      </section>
    );
  }

  return (
    <section className="stack">
      <h1 className="title">Paste something secret.</h1>
      <p className="muted">
        Encrypted in your browser before it leaves. We never see the text or the
        key.
      </p>

      <textarea
        className="field mono area"
        placeholder="Write or paste here…"
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={onKeyDown}
        spellCheck={false}
        autoFocus
        aria-label="Paste text"
      />

      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}

      <div className="row between">
        <div className="row">
          <div className="select">
            <select
              value={ttl}
              onChange={(e) => setTtl(e.target.value)}
              aria-label="Expires after"
            >
              {EXPIRY.map(([value, label]) => (
                <option key={value} value={value}>
                  Expires in {label}
                </option>
              ))}
            </select>
          </div>

          <label className="switch">
            <input
              type="checkbox"
              checked={burn}
              onChange={(e) => setBurn(e.target.checked)}
            />
            <span className="track" />
            Burn after reading
          </label>
        </div>

        <button
          className="btn primary"
          onClick={submit}
          disabled={busy || !text.trim()}
        >
          {busy ? 'Encrypting…' : 'Create link'}
        </button>
      </div>
    </section>
  );
}
