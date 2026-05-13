# Page Asset Compression and Cleanup

## Goal

Reduce repository size by compressing image assets used by the homepage/discover page surfaces and deleting assets that are confirmed obsolete or unused.

## Scope

- Primary page surfaces: `frontend/app/routes/home.tsx`, `frontend/app/routes/discover.tsx`, and directly imported/shared asset helpers they use.
- Primary asset locations to inspect: `frontend/app/assets/`, `frontend/public/assets/`, and route-referenced public image folders.
- Trellis tracking files for this task.

## Requirements

- Preserve visual intent and runtime paths for assets still referenced by code, CSS, tests, or docs.
- Compress only raster assets where file size reduction is safe and visually acceptable for page usage.
- Delete only assets that are confirmed unreferenced/obsolete by repo-wide search and not required by prompt sidecars/manifests/tests.
- Do not touch NPC deliverable prompt sidecars unless the corresponding NPC asset is explicitly in scope and safely unused.
- Do not edit generated build output (`frontend/build/`, `frontend/dist/`) as source.
- Record before/after size evidence and deleted asset list in this task.

## Acceptance Criteria

- [x] Asset inventory identifies large homepage/discover referenced assets and candidate unused assets.
- [x] Compressed assets keep same paths or code references are updated consistently.
- [x] Any deleted assets are backed by repo-wide reference checks.
- [x] Size reduction is recorded with before/after byte counts.
- [x] Frontend verification runs successfully (`npm --prefix .\\frontend test`, `typecheck`, `build`).
- [x] If visual quality could be affected, run or document browser/self-review evidence.

Evidence: see `asset-inventory.md` and `asset-optimization-report.json` in this task directory.

## Technical Notes

- Prefer lossless or near-lossless optimization first.
- If converting file formats, update imports/references and ensure Vite/build resolves them.
- If only file bytes change in-place, keep paths stable to minimize code churn.
- User explicitly allowed deleting outdated/unused assets, but deletion must stay limited to confirmed unused assets.

## Out of Scope

- Product redesign or layout changes.
- New generated artwork.
- Backend/API behavior.
- Broad cleanup of unrelated historical task files.
