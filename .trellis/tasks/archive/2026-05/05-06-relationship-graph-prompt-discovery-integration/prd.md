# Relationship graph prompt and discovery integration

## Goal

After core graph and propagation are stable, use confirmed relationship graph context safely in NPC prompts and optional discovery/detail hints.

## Requirements

- Inject concise, perspective-labeled relationship context into prompts.
- Use only confirmed/enabled edges and scope-appropriate visitor projections.
- Do not expose private visitor graph history or another owner’s unaccepted stance as objective truth.
- Optional discovery/detail hints must be phrased as owner/source perspective, not global social graph.
- Keep relation context bounded to avoid prompt bloat.

## Acceptance Criteria

- [x] Prompt tests prove relation context appears only when scope-appropriate.
- [x] Prompt tests prove private/API-key/message transcript data is not leaked.
- [x] UI hints, if added, are clearly source-attributed. *(No UI added in this task — prompt-only scope)*
- [x] Backend focused tests pass.
- [x] Frontend tests/build pass if UI surfaces change. *(No frontend changes — no build needed)*

## Out of Scope

- Public relationship network browsing, visitor-to-visitor social, factions/rankings, battle systems.
