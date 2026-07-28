# Execution Plan

## Phase A/B — Current Candidate

- [x] Review JSON and database retirement paths for the ownership guard.
- [x] Verify idempotence with one system-owned old record and one user-owned old-ID record.
- [x] Verify the three new public IDs remain visible.
- [x] Confirm obsolete builder/rule/asset-map symbols have no runtime references.
- [x] Run backend compile.

## Phase C — Deferred Asset Cleanup

- [x] Build a Markdown reference manifest for all 266 files under the two legacy NPC roots.
- [x] Verify generic fallbacks for all six launch characters.
- [x] Remove old explicit character mappings that are no longer reachable.
- [x] Defer deletion: public URLs remain compatible with preserved records; 48 bundled files are separately classified for paired cleanup.
- [x] Run frontend typecheck and build; all imported fallback assets resolve.
- [x] Record that browser screenshots are not required and no browser visual result is claimed.

## Validation

```powershell
rg -n "pw_lantern_helpdesk|pw_midnight_treehole|pw_community_repair|pw_lost_found_archive|pw_third_shelf_observatory|pw_midnight_commission_board|pw_after_school_hero_supply|pw_jingan_catbell_refuge|pw_hospital_night_care" apps docs .trellis
py -3 -m compileall -q apps/api/src
npm --prefix .\apps\web run build
```

The `rg` result is expected to retain migration allow-list and Trellis history references. Every other hit requires classification; zero matches is not the goal while compatibility support remains active.

## Result

- `verify_cleanup.py`: PASS (`legacy-cleanup-contract-ok`).
- Backend compile: PASS.
- Frontend typecheck: PASS.
- Frontend build: PASS.
- Runtime old-space ID scan: only `RETIRED_PUBLIC_WELFARE_TAVERN_IDS` remains.
