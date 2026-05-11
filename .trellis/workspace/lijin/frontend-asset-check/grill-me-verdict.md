# Grill-Me Verdict: frontend user asset usage check

Verdict: PASS with noted caveat fixed

Source of truth:
- Runtime source files under `frontend/app/components/soul-link-reference-artboards.tsx` and `frontend/app/routes/home.tsx`.
- Project-local user/material assets under `frontend/app/assets/soul-link-05-10/home-black/`, `frontend/app/assets/soul-link-05-10/home-light/`, and `frontend/app/assets/soul-link-05-10/user-cuts-light/`.
- Fresh Playwright DOM/image collection against `http://127.0.0.1:5173/` at 1536x1024 for dark and light themes.

Evidence:
- Dev server restarted and listening on `127.0.0.1:5173`.
- `curl --noproxy "*" http://127.0.0.1:5173/` returned HTTP 200; `http://127.0.0.1:5173/app/assets/soul-link-05-10/home-black/hero-system-visual.png` returned HTTP 200.
- Playwright report: `D:\work\ai-\.trellis\workspace\lijin\frontend-asset-check\asset-check-report.json`.
- Dark screenshot: `D:\work\ai-\.trellis\workspace\lijin\frontend-asset-check\home-black-1536x1024-current.png`.
- Light screenshot: `D:\work\ai-\.trellis\workspace\lijin\frontend-asset-check\home-light-1536x1024-current.png`.
- Dark page found 13/13 expected home-black assets, missing none.
- Light page found 7/7 expected light/user-cut assets, missing none.

Problems found:
1. [P1] `frontend/app/assets/soul-link-05-10/home-black/hero-system-visual.png` was loaded by the page, but its manifest/test dimensions were stale. Actual PNG is `1672x941`, SHA-256 `43fe809897ea6c14b1dd1c67b4fdbc4627b2c7893f5e84376dd4213c1ab90188`; stale records said `1512x1040`, SHA-256 `c32b54...`. Fixed in manifest and focused script tests.
2. [P2] Shell HTTP checks were misleading because environment `http_proxy=http://127.0.0.1:7890` caused localhost requests to proxy and return empty 502. Use `curl --noproxy "*"` or set `NO_PROXY=127.0.0.1,localhost` when checking local frontend from shell.
3. [P2] The app index route is `/`; `/home` is not a route and returns 404. If the browser is on `/home`, it is not viewing the modified homepage.
4. [P2] Full `npm --prefix .\frontend test` still fails before reaching the home checks at `frontend/scripts/mini-games-test.mjs` (`9 !== 6`). This appears unrelated to the asset wiring checked here, but it blocks reporting the whole suite as green.

Smallest safe next step:
- In the browser, open `http://127.0.0.1:5173/`, hard refresh, and toggle to dark theme to see the black material set. If you were checking `/home`, switch to `/`.
