# 旧默认内容分阶段清理

## Goal

Remove obsolete default-content maintenance surface without deleting historical data or creating broken character art.

## Requirements

- New installations seed only the three current story Spaces.
- Existing former defaults owned by `system_public_welfare` become `private + closed` through an idempotent migration.
- A record with a former default ID but non-system ownership remains unchanged.
- Obsolete seed builders, extra-character tables, offline rule sets, and backend asset-ID maps with no active references are removed in the first cleanup phase.
- `RETIRED_PUBLIC_WELFARE_TAVERN_IDS` remains until the compatibility window is explicitly closed.
- Old frontend portraits, public NPC sprite directories, and explicit mappings are removed only after an evidence-based reference inventory and replacement/fallback check.
- Image files and prompt sidecars are retained or deleted together.
- User content, chat history, visitor state, memories, gameplay sessions, and state cards are never deleted by this task.

## Acceptance Criteria

- [x] JSON seed migration is idempotent and proves system-owned retirement plus user-owned non-mutation.
- [x] Database seed path implements the same ownership guard.
- [x] Active backend seed/rule code references only the three current Spaces and six characters, apart from the explicit retirement allow-list.
- [x] A reference manifest classifies every old frontend/public NPC asset as retain, replace, or delete.
- [x] Asset deletion is deferred; all six launch characters have verified generic fallback mappings and the frontend build resolves those assets.
- [x] The public JSON-store listing omits a migrated old system Space while retaining all three current Spaces.

## Notes

- Cleanup is intentionally multi-phase. A smaller clean backend now is preferable to an unsafe one-shot asset purge.
- Verification record: `verify_cleanup.py` passed for JSON and database paths on 2026-07-16; Python compile, frontend typecheck, and frontend build also passed.
- Browser/Playwright screenshots are not a delivery prerequisite. No browser visual PASS is claimed in this phase.
