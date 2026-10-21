# Security

## Goal

Nobody except people holding the full link can read a paste. This includes the server owner, the database, and the hosting provider.

## How we do it

- Encryption and decryption happen only in the browser (WebCrypto, AES-256-GCM).
- The key is in the URL `#fragment`, which browsers never send in requests.
- The server stores only: `id`, `ciphertext`, `iv`, `expiresAt`, `burn`, `deleteTokenHash`.
- Title, language, and text are all inside the encrypted payload.
- We never log paste content or tie IPs to pastes.
- Logs contain only method, route (paste ids hidden), status code, and a request id. No IPs, headers, or bodies.
- The full encryption design is in `docs/CRYPTO.md`.
- Strict CSP: only our own scripts run. No inline scripts, no third-party scripts, no framing. Referrer is never sent.
- Rate limits per visitor, held in memory only (never written to disk or logs). Request size and time limits protect against slow or huge requests.
- No CORS: other websites cannot read our API from a browser.

## What the server can learn

- Paste size, creation time, expiry time.
- Request IP and metadata (the hosting provider can see these too).

## What we do not protect against

- Anyone who has the full link.
- A compromised device or browser extension.
- A malicious server that serves tampered JavaScript. A web app must be trusted to serve honest code. We reduce this risk later with a strict CSP and open, verifiable builds.
- Link sharing over insecure channels.

## Reporting a vulnerability

Use GitHub: Security tab, then "Report a vulnerability" (private advisory). Please do not open a public issue for security problems.
