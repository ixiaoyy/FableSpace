# Frontend Fluidity Optimization

## Goal

Apply the confirmed parts of the fluidity audit with minimal behavior change: mobile map height, map connection warm-up, and conservative animation/scroll performance hints.

## Scope

- Current React Router frontend paths under `frontend/app/`.
- Shared map container used by `frontend/app/product/WorldMap.jsx`.
- Global CSS that affects active route surfaces.

## Non-goals

- No product behavior, API, schema, dependency, or visual redesign.
- Do not edit the already-dirty `frontend/app/product/App.jsx` unless a blocker appears.

## Validation

- `npm --prefix .\frontend run build` passed on 2026-06-10 outside sandbox. The sandbox run failed first with the known Tailwind/Vite native dependency `spawn EPERM`.
- Playwright sanity passed on `http://127.0.0.1:4173/discover`:
  - `artifacts/frontend-fluidity-20260610/discover-desktop-1440.png`
  - `artifacts/frontend-fluidity-20260610/discover-mobile-390.png`
  - `artifacts/frontend-fluidity-20260610/playwright-fluidity-report.json`
- Desktop 1440px and mobile 390px had no page errors and no horizontal overflow.
- Injected `.amap-container` at 390x844 computed to `height: 420px`, `min-height: 420px`, `contain: layout paint`.

## Remaining Risk

- Real smoothness ratings still require browser runtime metrics or device testing; this task only applies code-level, low-risk optimizations.
- `react-doctor` could not be run because it was not cached locally and non-sandbox npm execution was rejected as untrusted third-party code download.
