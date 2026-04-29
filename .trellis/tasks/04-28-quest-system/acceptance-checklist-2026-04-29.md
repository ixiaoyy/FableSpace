# Acceptance Checklist: Quest System MVP

Date: 2026-04-29
Status: ready_for_review

## Product boundary

- [x] Does not add backend Quest/Reward schema.
- [x] Does not add billing, Token settlement, ranking, level/equipment, combat, or visitor social scope.
- [x] Uses existing tavern list data for guide progress.
- [x] Quest copy frames tasks as safe tavern exploration guidance.

## UI / routes

- [x] `/quests` route exists and is registered.
- [x] ProductShell nav includes a Tasks entry.
- [x] Mobile bottom dock remains touch-safe after adding the fifth entry.
- [x] Quest cards show status, progress, CTA, and completion feedback text.
- [x] Empty/no-data state remains useful and does not white-screen.

## Tests / validation

- [x] `quest-guide-test.mjs` covers quest definitions, product-boundary regex, metrics, completion/in-progress/empty states.
- [x] `mobile-shell-layout-test.mjs` still passes after nav update.
- [x] `npm --prefix .\frontend run typecheck` passed.
- [x] `npm --prefix .\frontend test` passed.
- [x] `npm --prefix .\frontend run build` passed.
- [x] Trellis context validation passed.

## Remaining review item

- [ ] Optional browser/manual visual review of `/quests` at desktop and narrow width.
