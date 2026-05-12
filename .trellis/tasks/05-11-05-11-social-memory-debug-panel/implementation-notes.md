# Implementation Notes

## 2026-05-12

### Done
- Added an owner-only Social KB debug panel (SocialMemoryCreationPanel) under the tavern chat workbench conversation sidecar.
- The panel estimates social memory retrieval from the selected NPC existing social_memories using source-name match, n-gram overlap, recency bonus, fallback, and Top-K limits.
- Added createdMemories state tracking from sendTavernChat API responses; panel shows memories auto-created during the chat session.
- Added draftMessage state mirroring textarea value so the panel shows real-time scoring as owner types.
- Added frontend regression script and wired it into npm test.
- Kept copy explicit that backend prompt injection remains authoritative and this is not a visitor-visible public rumor wall.

### Files changed
- frontend/app/features/social-memory-debug/SocialMemoryCreationPanel.tsx
- frontend/app/features/tavern-chat-workbench/index.tsx
- frontend/scripts/social-memory-debug-panel-test.mjs
- frontend/package.json

### Validation
- node scripts/social-memory-debug-panel-test.mjs PASS
- node scripts/tavern-chat-workbench-test.mjs PASS
- backend pytest test_social_memory_retrieval.py PASS (19 passed)
- frontend npm test PASS
- frontend npm run build PASS

### Risks / Not done
- No backend debug payloads or exact prompt transcripts; owner-only frontend estimate over existing character social memories.
