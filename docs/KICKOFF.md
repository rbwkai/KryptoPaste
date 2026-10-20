# Kickoff Notes

## DevOps in one minute

DevOps means one team owns the full path: code, build, test, release, deploy, run, watch. The loop is plan, code, build, test, release, deploy, operate, monitor.

- Automate boring work. Keep everything as code. Get fast feedback from tests.
- Containers make it run the same everywhere.
- CI: tests run on every push. CD: passing code ships to production by itself.
- Watch it in production with logs, health checks, and alerts.

## Git rules

- `main` always works. Never commit to it directly.
- One branch per task: `feat/...`, `fix/...`, `chore/...`.
- Commits: `feat:`, `fix:`, `chore:`, `docs:`, `test:`, `ci:`.
- Never commit secrets. Deploy secrets go into GitHub Actions secrets.
- After the first merge: GitHub Settings, Rules, require a pull request (and later a green CI check) for `main`.
- Turn on secret scanning and Dependabot (free on public repos).

```bash
git switch -c feat/<task>
git add -p
git commit -m "feat: <what>"
git push -u origin feat/<task>
gh pr create --fill
gh pr merge --squash --delete-branch
git switch main && git pull
```

## Tools (Arch)

```bash
sudo pacman -S --needed git github-cli openssh nodejs npm \
  docker docker-compose docker-buildx \
  kubectl kind helm k9s opentofu act trivy \
  jq curl openssl
sudo systemctl enable --now docker
sudo usermod -aG docker $USER   # then log out and in
```

## Free accounts

GitHub, Render, MongoDB Atlas, UptimeRobot. None needs a card at signup, but re-check at each step.
