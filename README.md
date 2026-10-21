# KryptoPaste

![CI](https://github.com/rbwkai/KryptoPaste/actions/workflows/ci.yml/badge.svg)

An encrypted pastebin where the server can never read your pastes.

- Your browser encrypts the text (AES-256-GCM) before sending it.
- The server stores only encrypted data.
- The decryption key lives in the link after the `#`. Browsers never send that part to a server.
- No accounts. Free for everyone. MIT licensed.

## How it works

1. You write a paste. The browser makes a random key and encrypts it.
2. The server saves the encrypted blob and returns an id.
3. You get a link: `https://host/p/<id>#<key>`.
4. Anyone with the full link can read it. Without the link, nobody can, including us.

## Run locally

```bash
npm install
cp server/.env.example server/.env
npm run dev
curl http://localhost:3000/api/health
```

## Project layout

- `server/` Express API (the React client comes later in `client/`)
- `docs/` kickoff notes
- `ROADMAP.md` what we build, step by step
- `SECURITY.md` threat model and how to report problems

## Status

Early development. See `ROADMAP.md`.

## License

MIT
