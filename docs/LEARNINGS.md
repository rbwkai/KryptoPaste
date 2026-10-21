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

## Step 5: Security middleware

- **Why CSP matters most here:** our key lives in the page URL. Any script that runs on our page can read it. CSP tells the browser to run only scripts from our own server, so an injected script is blocked. Strict by default (`default-src 'none'`), then we allow only what we need.
- **Strict CSP has costs.** No inline scripts, no inline `style="..."` attributes, no third-party scripts or fonts. The frontend (step 7) must follow these rules. This is easier to do from day one than to fix later.
- **Defense in depth:** helmet headers + CSP + input validation + rate limits. No single layer is trusted alone.
- **Helmet** is a ready-made bundle of safe headers. We override only what we need.
- **No CORS on purpose.** The site and API share one origin, so we add no CORS headers. By default browsers then block other websites from reading our API. In dev, the Vite server will proxy to Express instead of calling it across origins.
- **Rate limiting order matters:** limiter first, body parsing second, so spammers cost less. Health and readiness checks come before the limiter, because monitors must never be blocked.
- **`trust proxy`:** behind a load balancer every request seems to come from the proxy's IP. Express can read the real IP from `X-Forwarded-For`, but only if told how many proxies to trust. Too low means all users share one limit. Too high means attackers can fake their IP. We make it a setting (`TRUST_PROXY`) and measure the right number at deploy time.
- **In-memory limiter:** counters live in RAM, are shared by no one, and reset on restart. Fine for one instance. With several copies (Kubernetes replicas) we would need a shared store. The IPs stay in RAM only and are never logged or saved.
- **Timeouts:** `headersTimeout` and `requestTimeout` cut off slow connections that try to hold the server busy (slowloris).
- **Abuse can fill a free database.** Rate limits slow one visitor down, but many visitors could still fill 512 MB. A global storage cap comes later.
- **`npm audit`** checks dependencies for known holes. It becomes a pipeline step in CI.
- **Report-only trick:** real teams first ship a CSP as `Content-Security-Policy-Report-Only`, which logs violations without blocking. We start strict because the frontend does not exist yet.
