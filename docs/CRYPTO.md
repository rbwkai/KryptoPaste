# KryptoPaste Crypto Contract (v1)

## The idea in one picture

    WRITER'S BROWSER                    SERVER                    READER'S BROWSER
    ----------------                    ------                    ----------------
    make random key  ---------------X   (never sees key)
    encrypt text
    send ciphertext + iv  ---------->   store blob
                          <----------   id, deleteToken
    link = /p/<id>#<key>
              \________ shared by the writer (chat, email, ...) ________/
                                                                open link
                                        <---------- GET /api/pastes/<id>
                                        ----------> ciphertext + iv
                                                    decrypt with <key> from the link

The browser never sends the part after `#` to any server. That is the whole trick.

## Algorithm

- AES-256-GCM through the browser's WebCrypto API (`crypto.subtle`).
- GCM both encrypts and checks integrity. If anyone changes a single bit, decryption fails.
- WebCrypto only works on HTTPS pages (and localhost).

## What the browser does (create)

1. Build the payload: `{ "v": 1, "title": "", "lang": "", "text": "..." }`.
   Title, language and text are all inside, so the server cannot see them.
2. Encode it as UTF-8 bytes.
3. Make a fresh random 256-bit key (`generateKey`). One key per paste, never reused.
4. Make a random 12-byte IV (`getRandomValues`).
5. Encrypt with AES-GCM. Extra authenticated data (AAD) is the text `kryptopaste:v1`.
   AAD is not secret. It makes sure a blob only decrypts in the context it was made for.
6. WebCrypto returns `ciphertext + 16-byte tag` joined together. We keep it as one blob.
7. Encode everything as base64url without padding (letters, digits, `-`, `_`).
8. Send `{ ciphertext, iv, ttl, burn }` to the server.
9. Build the link: `https://<host>/p/<id>#<key>`. Show it once. Show the `deleteToken` separately.

## What the browser does (read)

1. Take `<id>` from the path and `<key>` from `location.hash`.
2. `GET /api/pastes/<id>` returns `{ ciphertext, iv, burn }`.
3. Decrypt with the key and the same AAD. If it fails, show "wrong or damaged link".
4. Clear the key from the address bar with `history.replaceState` (step 7).

## Formats

| Thing        | Size            | Encoding                                     |
| ------------ | --------------- | -------------------------------------------- |
| key          | 32 bytes        | base64url, 43 chars, only in the `#fragment` |
| iv           | 12 bytes        | base64url, 16 chars                          |
| ciphertext   | up to 100 KB    | base64url, max 136,534 chars                 |
| paste id     | 16 random bytes | base64url, 22 chars                          |
| delete token | 24 random bytes | base64url, 32 chars                          |

## What the server does

- Checks the shapes above, nothing more. It cannot look inside.
- `ttl` is only one of `1h`, `1d`, `7d`, `30d`. The server computes `expiresAt`.
- Stores `id, ciphertext, iv, burn, deleteTokenHash, expiresAt`.
- The delete token is random, so a plain SHA-256 hash is enough. Only the hash is stored.
- Read: returns `404` for missing, expired and burned pastes. All look the same.
- Burn-after-read: the first successful read deletes it, atomically.
- Sends `Cache-Control: no-store` on API answers.

## What the server (or a hacker with the database) learns

- Paste size (roughly), creation and expiry time, burn on or off.
- Network metadata such as IPs is visible to the hosting provider. We never log it.

## What this does NOT protect against

- **Anyone with the full link.** Share it carefully.
- **Malicious JavaScript** (for example a bug that allows XSS). It can read the key from the page. Defence: strict CSP, no third-party scripts, no inline scripts (step 5).
- **A hacked server that serves bad JavaScript.** A web app must trust the code it is served. Later: open builds that anyone can verify.
- **Browser history.** The full link, including the key, can be saved locally. We clear the hash after load.
- **Size leaks.** Padding to size buckets is a later improvement.

## Versioning

`v: 1` is inside the payload and `v1` is inside the AAD. A future format change becomes `v2` and the reader can tell.
