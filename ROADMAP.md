# KryptoPaste Roadmap

Zero-knowledge encrypted pastebin. Anonymous, free, MIT licensed.

## Spec (short)

- No accounts. Browser-side AES-256-GCM. Link: `https://host/p/<id>#<key>`.
- Server stores only: `id`, `ciphertext`, `iv`, `expiresAt`, `burn`, `deleteTokenHash`.
- Limits: ciphertext max 100 KB, TTL max 30 days, rate limit per IP.
- Delete token shown once at creation; the server keeps only its hash.
- Never log paste content or IPs tied to pastes.

## Architecture

- Two containers, one origin: `web` (nginx serving the built React app, sets the strict CSP, forwards `/api` to `api`) and `api` (Node/Express). The browser talks only to `web`, so there is no CORS.
- The helmet headers on `api` stay as a second layer. The CSP that really protects the page must come from `web`.
- Pipeline: GitHub Actions (lint, test, audit, build both images, scan, push to GHCR, deploy).
- Kubernetes: `kind` locally and in CI. Two Deployments (`web`, `api`) and an Ingress (`/` to web, `/api` to api).
- Open question: free hosting for two always-on services. Decide at step 14. Fallback: a static host for `web`.
- `trust proxy` will need more than one hop once nginx sits in front of the API.
- IaC: OpenTofu for GitHub, Atlas, Render.
- Why not Vercel: it runs serverless functions, not our Docker image, and its Git auto-deploy would replace our pipeline. Maybe later for a static frontend.
- Free tiers change. Re-check limits before each cloud step.

## API

- `POST   /api/pastes` body `{ciphertext, iv, ttl, burn}` (`ttl` is `1h`, `1d`, `7d` or `30d`) returns `{id, deleteToken}`
- `GET    /api/pastes/:id` returns `{ciphertext, iv}` (deleted if burn-after-read)
- `DELETE /api/pastes/:id` header `x-delete-token`
- `GET    /api/health`
- `GET    /api/ready` readiness check (database connected)

## Steps

| #   | Step                             | What we build                                                                                                        | DevOps topic                                                 |
| --- | -------------------------------- | -------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------ |
| 0   | Foundations                      | Repo, docs, tools, Git workflow                                                                                      | Intro to DevOps, what DevOps is, what to learn, Git & GitHub |
| 1   | Setup                            | Folders, Express skeleton, env handling                                                                              | Build & deploy an API: Setup                                 |
| 2   | Code quality                     | ESLint + Prettier                                                                                                    | ESLint Prettier                                              |
| 3   | Database                         | Atlas dev project, Mongoose, Paste model, TTL index                                                                  | Database setup                                               |
| 4   | Logger & middleware              | Pino (privacy-safe), error handler                                                                                   | Logger & Middleware                                          |
| 5   | Security middleware              | helmet, CSP, rate limits, size limits                                                                                | Security Middleware, Warp Setup                              |
| 6   | Crypto contract + core paste API | `docs/CRYPTO.md`, create, read, atomic burn, strict validation                                                       | API build                                                    |
| 7  | Frontend (done) | React + Vite, create and read pages, WebCrypto module shared with server tests. Dev: Vite proxies `/api` to Express | Full stack wiring |
| 8   | Delete tokens                    | `DELETE` endpoint, constant-time token check (token creation already exists from step 6)                             | Authentication I                                             |
| 9   | Paste CRUD                       | Delete, expiry, burn, limits                                                                                         | The "User CRUD" slot                                         |
| 10  | Testing (done)                   | Vitest + Supertest, throwaway Mongo, crypto contract tests                                                           | Testing                                                      |
| 11  | CI (done)                        | GitHub Actions: lint, tests with Mongo service, audit, required checks                                               | CI/CD Pipelines, Build Your First Pipeline                   |
| 12  | Docker                           | Two Dockerfiles (`api`, `web` with nginx + CSP), Compose, GHCR                                                       | Docker, Dockerization                                        |
| 13  | Kubernetes                       | kind, two Deployments, Services, Ingress, smoke test in CI                                                           | Kubernetes, Kubernetes Demo                                  |
| 14  | Go live (CD)                     | Atlas + Render (two services, or a static host for `web`), auto deploy, health checks, uptime pinger                 | Deployment                                                   |
| 15  | IaC                              | OpenTofu for GitHub, Atlas, Render                                                                                   | Infrastructure as Code                                       |
| 16  | More DevOps                      | Trivy, Dependabot, CodeQL, rollbacks, monitoring                                                                     | More on DevOps                                               |
| 17  | Next steps                       | Hardening, optional Vercel/Cloudflare static frontend                                                                | Next Steps                                                   |

## Security ideas for later

- Pad ciphertext to size buckets.
- Optional password wrapping the key (PBKDF2 or Argon2).
- Strict CSP + Subresource Integrity.
- Reproducible builds so anyone can verify the served frontend.
