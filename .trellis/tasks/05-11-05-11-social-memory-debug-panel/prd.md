# Add Social Memory Debug Panel for NPC Chat UX

## Goal
Add an owner-only frontend debug panel in the tavern chat workbench that explains which NPC social memories are likely relevant to the current chat input, mirroring the backend keyword/source/recency/top-k retrieval contract.

## Requirements
- Keep social memory details owner-only; do not expose NPC social memory debug data to ordinary visitors.
- Use the existing `TavernCharacter.social_memories` payload already returned with tavern characters; do not add backend/API/schema fields in this slice.
- Show source name, content, total score, keyword/source/recency components, timestamp recency label, and Top-K status.
- Keep this as a debug/inspection aid; do not claim it is an exact server prompt transcript if the backend changes later.
- Preserve the visitor-first chat layout and fold the panel under existing sidecar details.

## Acceptance Criteria
- [ ] `TavernChatWorkbench` renders an owner-only social memory debug panel for the selected NPC.
- [ ] The panel scores source-name match, n-gram/keyword overlap, recency bonus, and limits visible injected candidates to top 3.
- [ ] A frontend script test protects the UI marker and owner-only gate.
- [ ] Backend social memory retrieval test still passes.
- [ ] Full frontend test/build pass.

## Non-goals
- No backend response shape changes.
- No visitor-visible social memory feed.
- No prompt transcript logging or exposure of secrets/private prompts.
