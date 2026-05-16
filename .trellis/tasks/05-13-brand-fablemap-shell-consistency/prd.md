# Brand: FableMap Shell Consistency

## Parent
`05-12-onsite-visitor-brutal-audit-issues` — Issue #1: brand/metaphor drift

## Goal
Replace all visible SoulLink/node-network/signal-themed UI references with FableMap/map-anchored tavern metaphors. This is a naming alignment, not a full rebrand.

## Requirements
- Audit all visible text and components in home, discover, and tavern routes for SoulLink references
- Replace "SoulLink" brand name → "FableMap"
- Replace "node", "signal", "network", "coordinate network", "online entities", "echoes", "footprints" → map/tavern/space metaphors
- Rename component files and internal type names as needed
- Keep all functionality unchanged
- `npm --prefix .\frontend run build` passes after changes

## Acceptance Criteria
- [x] No "SoulLink" text visible to visitors in home/discover/tavern routes
- [x] No "信号活动", "数字坐标网络", "ONLINE COORDINATE NETWORK", "ONLINE ENTITIES" visible to visitors
- [x] Map/tavern/space metaphors visible in place of node/network metaphors
- [x] `npm --prefix .\frontend run build` passes
- [x] No functional changes — only naming/copy alignment

## Completion note — 2026-05-16

- Continued the shell consistency pass by removing remaining visible `SoulLink` / signal / online-entity / soul/footprint copy from the home, discover, and tavern-adjacent surfaces.
- Fixed two corrupted template-string/UI labels left by the earlier rename pass (`仅亮?`, `?${...}`) and the `FableMapUserAvatar` asset/component name conflict caught by `typecheck`.
- Kept stable internal mini-game IDs such as `signal-decoder` because existing script tests assert them as data contracts; user-facing titles/copy now use coordinate/tavern/space wording.
- Validation:
  - `npm --prefix .\frontend run typecheck`
  - `npm --prefix .\frontend test`
  - `npm --prefix .\frontend run build`
  - `py -3 -m compileall -q backend/src`
  - `py -3 -m pytest tests/test_scene_capsule.py tests/test_orchestrator.py -q --tb=short`
