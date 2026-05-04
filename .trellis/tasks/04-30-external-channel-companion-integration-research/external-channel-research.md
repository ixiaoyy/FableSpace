# External Channel Companion Integration Research

## Completion decision

Complete as product-boundary research. FableMap should not make external channels part of the MVP core loop. External channels can be evaluated later only as opt-in return links or owner-controlled companion surfaces that send users back to the anchored tavern.

## Existing evidence inspected

- `docs/WHAT_NOT_TO_BUILD.md`: forbids unbounded visitor social, platform-controlled publishing, and platform token/payment systems.
- `docs/PRODUCT_BRIEF.md`: FableMap's core loop is real-coordinate tavern discovery → enter tavern → NPC interaction → memory/revisit.
- `docs/ARCHITECTURE.md`: State Cards, GM Layer, voice/visual previews, and skill packs are bounded proposal/owner-enabled layers.
- `.trellis/spec/backend/skill-pack-api-contract.md`: skill packs must be owner-enabled and cannot mutate core tavern content automatically.
- `.trellis/spec/backend/state-card-api-contract.md`: candidate changes remain pending until confirmed.

## Recommended boundary

Allowed future shapes:

- Deep links back to `tavern_id` / share URLs.
- Owner-configured notification or webhook previews that never expose hidden prompts, API keys, private chat, or private tavern data.
- Read-only export of confirmed, owner-approved summaries.

Not allowed in this roadmap slice:

- Off-platform full chat mirror that bypasses FableMap access rules.
- Cross-tavern friend graph, DM graph, group chat, or public social feed.
- External-channel auto-publication of AI-generated tavern/NPC/story content.
- Channel-specific secrets stored in visitor-visible payloads.

## Future research gates

Before any implementation, open a separate provider-specific task and read the current official platform documentation/terms for the chosen channel. That task must define identity mapping, consent, unsubscribe, rate limits, quiet hours, error handling, secret storage, and deletion/retention behavior.

## Verification

Docs-only completion. No runtime code changed. The research decision is stored here so the task is not left as an ambiguous in-progress placeholder.
