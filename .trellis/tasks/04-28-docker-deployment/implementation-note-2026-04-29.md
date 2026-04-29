# Docker Deployment Implementation Note — 2026-04-29

## Scope completed

- Added root Docker deployment files:
  - `docker-compose.yml`
  - `.dockerignore`
  - `.env.example`
- Added backend image:
  - `backend/Dockerfile`
  - Runs native FastAPI v1 app with `uvicorn fablemap_api.main:app`.
  - Uses `/data` volume via `FABLEMAP_OUTPUT_ROOT=/data` for JSON-file persistence.
  - Passes through existing `FABLEMAP_MYSQL_URL` so production can opt into MySQL when dependencies/config are present.
- Added frontend image:
  - `frontend/Dockerfile`
  - Builds React Router SPA and serves `build/client` with nginx.
  - `frontend/nginx.conf` proxies `/api` and `/generated` to backend and falls back app routes to `index.html`.
- Updated native backend settings to read Docker/local environment variables:
  - `FABLEMAP_OUTPUT_ROOT`
  - `FABLEMAP_FIXTURE_FILE`
  - `FABLEMAP_FRONTEND_ROOT`
  - `FABLEMAP_CORS_ORIGINS`
  - `FABLEMAP_SILLYTAVERN_URL`
  - `FABLEMAP_MYSQL_URL`, pool, overflow, echo.
- Added `backend/tests/test_settings_env.py` for env-driven settings behavior.
- Updated `README.md` with Docker Compose startup instructions.

## Deliberate scope decisions

- Did not add Redis: current code does not require Redis for this deployment path; adding an unused service would create false operational coupling.
- Did not add new Python/Node dependencies.
- Did not put owner LLM API keys in `.env.example`; owner credentials remain tavern/owner configuration data.

## Runtime validation status

- `docker compose config` passes.
- `docker compose build` could not run because Docker Desktop/Linux daemon is not available in this environment (`dockerDesktopLinuxEngine` pipe missing).
- Therefore `docker compose up` is not claimed as verified in this session.
