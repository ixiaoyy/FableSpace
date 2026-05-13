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
- [ ] No "SoulLink" text visible to visitors in home/discover/tavern routes
- [ ] No "信号活动", "数字坐标网络", "ONLINE COORDINATE NETWORK", "ONLINE ENTITIES" visible to visitors
- [ ] Map/tavern/space metaphors visible in place of node/network metaphors
- [ ] `npm --prefix .\frontend run build` passes
- [ ] No functional changes — only naming/copy alignment