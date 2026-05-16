# 2026-05-14 Fix Build Corruption

## Summary
Repaired extensive string corruption and syntax errors in the frontend codebase caused by a previous automated refactoring script. Restored brand identity by replacing legacy "signal" terminology with "tavern" and "coordinate" metaphors.

## Changes
- **`frontend/app/routes/discover.tsx`**: 
    - Fixed multiple unterminated template strings and JSX syntax errors.
    - Restored corrupted UI labels in the radar and card discovery views.
    - Replaced "Live radar" and signal/radar copy with "发现视角" and space/coordinate wording.
- **`frontend/app/components/fable-map-reference-artboards.tsx`**:
    - Performed 30+ manual patches to restore mangled character sequences (e.g., `?` fragments).
    - Fixed corrupted conditional logic in UI components.
    - Standardized icons and markers in the filter panels.
- **`frontend/app/lib/tavern-activity-echoes.js` / `frontend/app/components/TavernActivityEchoesCard.tsx`**:
    - Reworked visible activity copy to "空间活跃摘要" / "初现活性" and removed visitor-facing signal wording.
- **`frontend/app/components/fable-map-reference-artboards.tsx`**:
    - Removed remaining visitor-facing soul/online-entity/footprint labels in favor of active roles, visit records, story/activity summaries, and tavern/coordinate metaphors.

## Verification
- Successfully executed `npm --prefix .\frontend run build` with exit code 0.
- Successfully executed `npm --prefix .\frontend run typecheck` with exit code 0.
- Successfully executed `npm --prefix .\frontend test` with exit code 0.
- Successfully executed `py -3 -m compileall -q backend/src` with exit code 0.
- Successfully executed `py -3 -m pytest tests/test_scene_capsule.py tests/test_orchestrator.py -q --tb=short` with exit code 0.
- Manually audited key routes for visible corruption.
