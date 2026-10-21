# DevOps Learnings (self notes)

A running notebook. One section per step.

## Steps 0-2: Foundations and skeleton

- Split `app.js` (builds the app) from `index.js` (starts the server). Tests can load the app without opening a port.
- ESLint finds bugs. Prettier fixes style. Config files in the repo mean everyone gets the same rules.
- `.env` is ignored by Git. `.env.example` is committed as a template with no secrets.

## Step 3: Database

- **Managed database (Atlas):** someone else runs, patches, and backs up the server. We only use it.
- **Separate dev and prod.** Dev gets its own Atlas project, so we can delete it without touching prod.
- **Connection string = secret.** It has the password inside. Never commit it. If it leaks, rotate the password in Atlas.
- **IP allowlist:** Atlas only accepts connections from listed IPs. Dev: our own IP. Later, Render has no fixed IP, so prod will need "allow from anywhere". Then the defense is a strong password + TLS + a least-privilege user.
- **Fail fast:** `config.js` crashes at startup if an env var is missing. A loud crash on deploy is better than a silent bug later.
- **TTL index:** MongoDB deletes expired documents, but its cleaner runs only about once a minute. So the code must also check `expiresAt` when reading. Never trust the cleaner for correctness.
- **Store less.** No timestamps, no extra fields. Data we never store can never leak.
- **Liveness vs readiness:** `/api/health` says "the process is alive". `/api/ready` says "the database works, send me traffic". Kubernetes and Render use both ideas.
- **Tests should not use the shared cloud DB.** We will use a throwaway database for tests (step 10).

## Step 4: Logger and error handling

- **Logs can leak data.** In a privacy app, the logger is part of the security design. We log method, route, status, request id. Nothing else.
- **Structured logs (JSON)** can be searched by machines. `pino-pretty` makes them readable only in dev.
- **Log levels** (`debug`, `info`, `warn`, `error`) are controlled by `LOG_LEVEL`, so prod can be quiet and dev can be loud.
- **Request id:** every request gets one, and it is returned in the `x-request-id` header. Helps follow one request through the logs.
- **Central error handler:** one place turns every failure into clean JSON. Users never see stack traces. We log only the error type, because error messages can contain user data.
- **Graceful shutdown:** Docker, Kubernetes, and Render stop apps by sending `SIGTERM`, then kill them after a few seconds. We stop accepting new requests, close the DB, and exit cleanly.

## Step 6: Crypto contract and core paste API

- **Write the contract first.** `docs/CRYPTO.md` says exactly what both sides do. Most crypto bugs are two sides disagreeing about a detail.
- **The `#fragment` trick:** browsers never put the part after `#` into HTTP requests. So the key stays on the user's side with no special server code.
- **AES-GCM** hides the data and also detects tampering. A wrong key or a changed byte makes decryption fail loudly.
- **IV (nonce) rule:** never reuse an IV with the same key. We make a new random key for every paste, so reuse cannot happen.
- **Validate everything at the edge.** The server checks type, length and allowed characters of every field. Strings only means `{"$gt": ""}` style NoSQL injection cannot reach Mongo.
- **Allow-lists beat free input.** `ttl` can only be one of four values, so nobody can store a paste for 100 years.
- **Race condition:** if two readers open a burn paste at the same moment, a "find, then delete" would let both read it. One atomic `findOneAndDelete` allows only one winner. Whenever "check then act" matters, make it one atomic action.
- **Same answer for missing, expired and burned.** A `404` for all three leaks nothing about what existed.
- **Fast hash is fine for random tokens.** Slow hashes (bcrypt, Argon2) are for guessable passwords. A 192-bit random token cannot be guessed.
- **`Cache-Control: no-store`** stops browsers and proxies from keeping copies.
- **Do not deploy yet:** no rate limits and no CSP until step 5.
