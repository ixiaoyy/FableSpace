# brainstorm: NPC Interest and Hobby Tags

## Goal

Add a curated set of "Interest and Hobby" tags to NPCs (Characters) in FableMap. These tags should not only be visible in the UI but also dynamically influence the NPC's conversational preferences, knowledge, and personality expression.

## What I already know

* NPCs already have a `tags: list[str]` field in the `TavernCharacter` model.
* Existing tags include things like `safe`, `uncanny`, `warm_corner`, etc. (though these seem more like system/meta tags).
* The user specifically wants to brainstorm "interest and hobby" tags.
* The system supports Skill Packs (like `neighborhood-knowledge`) which can inject context based on tags.

## Assumptions (temporary)

* We should provide a curated list of hobbies to ensure consistency and facilitate AI prompt engineering.
* Hobby tags should be distinct from "personality" or "system" tags.
* The frontend will need a way to display these tags (e.g., as badges or icons).

## Open Questions

* **Curated vs Free-form**: Should we restrict interest tags to a predefined list, or keep them as free-form strings like the current tags?
* **AI Influence**: How exactly should these tags change the NPC's behavior? Should it be a simple system prompt addition, or something more complex like biasing WorldInfo retrieval?
* **Quantity**: Is there a recommended limit for hobby tags per NPC?

## Requirements (evolving)

* A defined list of common hobbies and interests (e.g., Gardening, Retro Gaming, Mixology, Local History).
* UI components to select and display these tags in the Tavern Owner Panel and Chat View.
* Backend logic to include these interests in the AI prompt building process.

## Acceptance Criteria (evolving)

* [ ] Curated list of interest/hobby tags defined.
* [ ] TavernCharacter model supports (or explicitly categorizes) these hobby tags.
* [ ] AI NPCs mention or express interest in their tagged hobbies when appropriate.
* [ ] Frontend displays hobby tags with professional aesthetics.

## Definition of Done (team quality bar)

* Tests added/updated (unit/integration where appropriate)
* Lint / typecheck / CI green
* Docs/notes updated if behavior changes
* Rollout/rollback considered if risky

## Out of Scope (explicit)

* Full-blown social network features between NPCs based on hobbies.
* Automatic generation of hobby content (must be configured by owner or derived from tags).

## Technical Notes

* `backend/src/fablemap_api/core/tavern.py`: `TavernCharacter` model.
* `backend/src/fablemap_api/core/prompt_builder.py`: For prompt injection.
* `frontend/app/lib/tavern-intent-tags.js`: Example of tag logic.
