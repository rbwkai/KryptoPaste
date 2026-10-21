# KryptoPaste Roadmap

Zero-knowledge encrypted pastebin. Anonymous, free, MIT licensed.

## Spec (short)

- No accounts. Browser-side AES-256-GCM. Link: `https://host/p/<id>#<key>`.
- Server stores only: `id`, `ciphertext`, `iv`, `expiresAt`, `burn`, `deleteTokenHash`.
- Limits: ciphertext max 100 KB, TTL max 30 days, rate limit per IP.
- Delete token shown once at creation; the server keeps only its hash.
- Never log paste content or IPs tied to pastes.

## Architecture

- One Docker image: Express API + built React app (same origin).
- Dev DB: a separate Atlas M0 project (`kryptopaste-dev`, deleted before release). Prod DB: its own Atlas M0 project. Expiry via TTL index.
- Tests use a throwaway database, never the shared cloud DB (step 10).
- Pipeline: GitHub Actions (lint, test, build, scan, push to GHCR, deploy to Render).
- Prod host: Render free web service (sleeps when idle; uptime pinger).
- Kubernetes: `kind` locally and in CI (production runs on Render; there is no good free managed Kubernetes).
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

| #   | Step                             | What we build                                                                            | DevOps topic                                                 |
| --- | -------------------------------- | ---------------------------------------------------------------------------------------- | ------------------------------------------------------------ |
| 0   | Foundations                      | Repo, docs, tools, Git workflow                                                          | Intro to DevOps, what DevOps is, what to learn, Git & GitHub |
| 1   | Setup                            | Folders, Express skeleton, env handling                                                  | Build & deploy an API: Setup                                 |
| 2   | Code quality                     | ESLint + Prettier                                                                        | ESLint Prettier                                              |
| 3   | Database                         | Atlas dev project, Mongoose, Paste model, TTL index                                      | Database setup                                               |
| 4   | Logger & middleware              | Pino (privacy-safe), error handler                                                       | Logger & Middleware                                          |
| 5   | Security middleware              | helmet, CSP, rate limits, size limits                                                    | Security Middleware, Warp Setup                              |
| 6   | Crypto contract + core paste API | `docs/CRYPTO.md`, create, read, atomic burn, strict validation                           | API build                                                    |
| 7   | Frontend                         | React + Vite, WebCrypto, link in `#fragment`                                             | Full stack wiring                                            |
| 8   | Delete tokens                    | `DELETE` endpoint, constant-time token check (token creation already exists from step 6) | Authentication I                                             |
| 9   | Paste CRUD                       | Delete, expiry, burn, limits                                                             | The "User CRUD" slot                                         |
| 10  | Testing                          | Crypto tests, API tests                                                                  | Testing                                                      |
| 11  | CI                               | GitHub Actions: lint, test, build                                                        | CI/CD Pipelines, Build Your First Pipeline                   |
| 12  | Docker                           | Multi-stage Dockerfile, Compose, GHCR                                                    | Docker, Dockerization                                        |
| 13  | Kubernetes                       | kind, manifests, smoke test in CI                                                        | Kubernetes, Kubernetes Demo                                  |
| 14  | Go live (CD)                     | Atlas + Render, auto deploy, health checks, uptime pinger                                | Deployment                                                   |
| 15  | IaC                              | OpenTofu for GitHub, Atlas, Render                                                       | Infrastructure as Code                                       |
| 16  | More DevOps                      | Trivy, Dependabot, CodeQL, rollbacks, monitoring                                         | More on DevOps                                               |
| 17  | Next steps                       | Hardening, optional Vercel/Cloudflare static frontend                                    | Next Steps                                                   |

## Security ideas for later

- Pad ciphertext to size buckets.
- Optional password wrapping the key (PBKDF2 or Argon2).
- Strict CSP + Subresource Integrity.
- Reproducible builds so anyone can verify the served frontend.
