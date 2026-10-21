import { useEffect, useState } from 'react';
import { fetchPaste } from './api.js';
import CopyButton from './CopyButton.jsx';
import { decryptPaste } from './crypto.js';

const KEY_PATTERN = /^[A-Za-z0-9_-]{43}$/;

const MESSAGES = {
  no_key:
    'This link has no key, so it cannot be decrypted. Make sure you copied the whole link, including the part after the #.',
  not_found:
    'This paste does not exist. It may have expired, been deleted, or already been read.',
  bad_key:
    'The key in this link does not match the paste. The link may be incomplete or damaged.',
  busy: 'Too many requests. Please try again in a moment.',
  failed: 'Something went wrong. Please try again.',
};

export default function Read({ id }) {
  const [state, setState] = useState({ status: 'loading' });

  useEffect(() => {
    const fail = (code) => setState({ status: 'error', code });

    // The key comes from the #fragment. It exists only in this browser.
    const key = location.hash.slice(1);

    async function load() {
      // Check the key BEFORE asking the server: a cut-off link must not
      // destroy a burn-after-read paste.
      if (!KEY_PATTERN.test(key)) return fail('no_key');

      try {
        const res = await fetchPaste(id);
        if (res.status === 404) return fail('not_found');
        if (res.status === 429) return fail('busy');
        if (!res.ok) return fail('failed');

        let payload;
        try {
          payload = await decryptPaste(res.body, key);
        } catch {
          return fail('bad_key');
        }
        // Never trust the shape of decrypted data.
        if (payload?.v !== 1 || typeof payload.text !== 'string') {
          return fail('bad_key');
        }

        // A burned paste cannot be opened again, so keep its key out of the
        // address bar and the browser history.
        if (res.body.burn) {
          history.replaceState(null, '', location.pathname);
        }
        setState({ status: 'ok', text: payload.text, burn: res.body.burn });
      } catch {
        fail('failed');
      }
    }

    load();
  }, [id]);

  if (state.status === 'loading') {
    return (
      <p className="muted pulse" aria-live="polite">
        Decrypting…
      </p>
    );
  }

  if (state.status === 'error') {
    return (
      <section className="stack">
        <h1 className="title">Cannot open this paste.</h1>
        <p className="muted">{MESSAGES[state.code]}</p>
        <div className="row">
          <a className="btn ghost" href="/">
            New paste
          </a>
        </div>
      </section>
    );
  }

  return (
    <section className="stack">
      <h1 className="title">Decrypted.</h1>
      {state.burn && (
        <p className="notice">
          This paste was destroyed on the server when you opened it. Copy it
          now, because it cannot be opened again.
        </p>
      )}
      {/* React shows this as plain text. Never use dangerouslySetInnerHTML here. */}
      <pre className="field mono output">{state.text}</pre>
      <div className="row">
        <CopyButton text={state.text} label="Copy text" primary />
        <a className="btn ghost" href="/">
          New paste
        </a>
      </div>
    </section>
  );
}
