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

## Steps 10-11: Testing and CI

**Testing**

- **Unit tests** are fast and need no database (validation, tokens, crypto). **Integration tests** call the real API with a real database. We have both.
- **Tests never touch the real database.** They use a throwaway local Mongo. `test-db.js` refuses to run if the URI looks like Atlas or the database name has no "test" in it, because a typo in an env var must never wipe real data.
- **Test the scary parts on purpose:** the burn race (10 simultaneous readers, exactly one wins), expired pastes that the TTL cleaner has not removed yet, tampered ciphertext, wrong keys, NoSQL-style input.
- **Each test starts clean.** `beforeEach` empties the collection, so tests cannot depend on each other.
- **Limiter counters live in memory per test file,** so the rate limit test has its own file.
- **Tests are living documentation.** `crypto-contract.test.js` checks the sizes and rules written in `docs/CRYPTO.md`. If the doc and the code disagree, a test goes red.

**CI**

- **CI** means a robot builds and tests every change. A red check means "do not merge".
- **`npm ci` vs `npm install`:** `ci` installs exactly what the lock file says and fails if it is out of date. Always use `ci` in pipelines, so builds are repeatable.
- **Caching** (`cache: npm`) saves minutes by reusing downloaded packages.
- **Service container:** the pipeline starts a real MongoDB next to the job, the same one we use locally.
- **Least privilege:** `permissions: contents: read` means a compromised step cannot push code or change the repo.
- **`concurrency`** cancels old runs when you push again. It saves free minutes.
- **Required checks + branch rules** turn CI from advice into a gate. This is what makes `main` always work.
- **Audit job is not required,** because new advisories can turn it red without any change from us.
- **Action versions** (`@v4`) are tags. The safer habit is pinning to a commit and letting Dependabot propose updates (step 16).
- **CI vs CD:** CI checks the code. CD (step 14) ships it. CD only makes sense after CI is trustworthy.
- **Match versions:** CI uses Node 22. If your Arch Node is newer, an odd bug can appear only in one place. That is a good reason for Docker (step 12): same Node everywhere.

## Step 7: Frontend

- **A CSP-friendly frontend:** no inline `<script>`, no inline `style=""`, no external files. React, Vite and plain CSS files meet that rule easily.
- **Self-hosted fonts:** Google Fonts would break our CSP and tell Google about every visitor. Fontsource ships fonts as npm packages, and Vite copies them into our own build. `assetsInlineLimit: 0` stops Vite from turning them into `data:` URLs, which the CSP would block.
- **Dev proxy vs real origin:** in dev, Vite forwards `/api` to Express, so the browser still sees one origin. Later, nginx does the same job. We never need CORS.
- **`vite preview` with the CSP header** lets us test the production build under the real policy before Docker exists.
- **StrictMode hazard:** React in dev runs effects twice. A "read" effect would read a burn paste twice and destroy it. We left StrictMode out, with a comment explaining why. General lesson: effects that cause side effects on the server must be safe to run twice.
- **Untrusted data stays text.** A decrypted paste is attacker-controlled. React shows it as text. We never use `dangerouslySetInnerHTML`. We also check the shape of the decrypted JSON.
- **Validate the key before calling the server.** A cut-off link would otherwise fetch (and burn) the paste, then fail to decrypt.
- **Known weakness:** a burn paste opened with a wrong but well-formed key is still destroyed. Fixing it needs a "peek" endpoint and a confirm step. It is on the future list.
- **Key out of the address bar only for burn pastes.** For normal pastes, keeping the key in the URL means refresh and bookmarks work.
- **One crypto file.** It lives in the client, and the server tests import it. The tests check the real code, not a copy.
- **Zero-knowledge is checkable.** DevTools, Network tab: no request ever contains the key.
- **Delete token not shown yet,** because the delete endpoint does not exist (steps 8 and 9).
- **Minimal tooling choice:** no React ESLint plugin, so we ignore capitalised "unused" names in client files. We can add the plugin later for hook rules.

## Step 12: Docker

- **Image vs container:** an image is the frozen package. A container is a running copy of it. We ship images, never "files on a server".
- **Same everywhere:** the Node version, OS libraries and nginx config are inside the image. Laptop, CI and production run the same thing.
- **Layer cache:** each Dockerfile line is a cached layer. Copy `package.json` and install dependencies BEFORE copying the source code, so editing code does not reinstall everything.
- **Multi-stage builds:** build tools stay in stage 1. The final image holds only what runs. Smaller, faster, and less for an attacker to use.
- **Build context:** we build from the repo root because the project is a monorepo with one lock file. `.dockerignore` keeps `node_modules`, `.git` and `.env` out of the build.
- **Never bake secrets into images.** Anyone who gets the image gets the secret. `.env` is excluded and passed at run time (`env_file`, later Kubernetes Secrets and Render env vars).
- **Non-root:** if an attacker breaks into the app, they are an ordinary user, not root. Also `cap_drop: ALL`, `no-new-privileges`, and a read-only filesystem for the API.
- **PID 1 and signals:** `docker stop` sends SIGTERM to the main process. Our graceful shutdown from step 4 handles it. `init: true` adds a tiny init process that cleans up child processes.
- **HEALTHCHECK:** Docker marks a container healthy or unhealthy. Compose `depends_on: service_healthy` makes `web` wait for `api`. We check liveness only, so a database blip does not restart the container.
- **Compose networking:** services reach each other by service name (`http://api:3000`). The same name works in Kubernetes, which is why `API_UPSTREAM` defaults to it.
- **Ports bound to 127.0.0.1:** `127.0.0.1:8080:8080` means only your own machine can reach it. Plain `8080:8080` would open it to your whole network.
- **nginx gotcha:** `add_header` inside a `location` REPLACES the headers from the `server` level instead of adding to them. We use `expires` in locations, which does not have this problem.
- **nginx privacy:** the default access log stores IP + URL, which would link visitors to paste ids. We turned it off.
- **Caching rules:** files in `/assets/` have a content hash in their name, so they can be cached for a year. `index.html` must never be cached, otherwise users keep seeing an old version after a deploy.
- **SPA fallback:** `try_files $uri /index.html` returns the app for paths like `/p/<id>`. Without it, refreshing a paste link would be a 404.
- **Config at start time:** nginx images fill `${VARIABLES}` into `/etc/nginx/templates/*.template` when the container starts. One image can run anywhere with a different `API_UPSTREAM`.
- **nginx resolves `api` at startup.** If the API is not reachable yet, nginx refuses to start. Compose handles it with `depends_on`.
- **Three CSPs, one policy:** helmet (API), Vite preview config and nginx all hold the same rules. If you change one, change all. The nginx one protects the real page.
- **CI smoke tests:** building is not enough. We start the containers and check that they work (API reaches a database, nginx serves the CSP).
- **Pinned tags:** `node:22-alpine` and `stable-alpine` are moving tags. Dependabot (step 16) will help us update them safely.
