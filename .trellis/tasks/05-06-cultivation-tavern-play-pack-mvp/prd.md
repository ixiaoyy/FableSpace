# Cultivation Tavern Play Pack MVP

## Goal

Create a cultivation-themed tavern play pack that owners can apply and confirm: NPC/world-info suggestions, lightweight GameplayDefinition templates, and safe “online cultivation” actions.

## Todo

* Define the owner-facing template contents: tavern description snippets, NPC role suggestions, world info, and gameplay nodes.
* Keep all generated/suggested content as drafts until the owner saves or confirms it.
* Reuse `GameplayDefinition` / `GameplaySession` for online “问道 / 打坐 / 观星 / 读札记” flows.
* Add non-RPG safety copy: no combat, levels, equipment, rankings, tradable rewards, or paid acceleration.

## Acceptance Criteria

* [ ] Play pack can be described as owner-confirmed tavern content, not platform auto-publication.
* [ ] Online loop is testable and reuses existing gameplay boundaries.
* [ ] MVP works for taverns with 1+ NPC and degrades safely when no NPC exists.

## Out of Scope

* Real-money or tokenized cultivation resources.
* Combat/gear/leaderboard progression.
* Auto-creating NPCs at visitor runtime.
