# Docker Deployment Acceptance Checklist — 2026-04-29

## Done

- [x] `backend/Dockerfile` added.
- [x] `frontend/Dockerfile` added.
- [x] `frontend/nginx.conf` added.
- [x] `docker-compose.yml` added.
- [x] root `.env.example` added.
- [x] `.dockerignore` added.
- [x] README Docker startup section added.
- [x] Native backend settings load Docker/local env variables.
- [x] Compose config validates structurally.
- [x] Backend env settings have focused tests.

## Not verified in this environment

- [ ] `docker compose build` / `docker compose up` runtime verification: blocked because Docker daemon is not running/available (`dockerDesktopLinuxEngine` pipe missing).
- [ ] Manual browser check of `http://127.0.0.1:3000/`: depends on successful compose runtime.
- [ ] Live API check of `http://127.0.0.1:8000/api/v1/health`: depends on successful compose runtime.

## Verification evidence

- `docker compose config` → passed.
- `py -3 -m compileall -q backend/src` → passed.
- `py -3 -m pytest -q backend/tests/test_settings_env.py backend/tests/test_api_smoke.py --tb=short` → 5 passed.
- `py -3 -m pytest -q backend/tests --tb=short` → 230 passed, 103 warnings.
- `npm --prefix .\frontend run build` → passed.
- `py -3 .\.trellis\scripts\task.py validate .trellis/tasks/04-28-docker-deployment` → passed.
- `docker compose build` → blocked by Docker daemon unavailable, not a code/test pass.
