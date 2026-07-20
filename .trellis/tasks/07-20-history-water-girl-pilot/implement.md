# Execution Plan

## 1. Plan and contracts

- [x] Separate the historical pilot from the existing six-character task.
- [x] Record the player / NPC distinction, opening request, historical facts and child-safety boundaries.
- [x] Map backend seed -> API -> homepage -> Space private-chat data flow.
- [x] Activate the task after reviewing all three planning artifacts.

## 2. Add the historical Space

- [x] Add `history_broad_street_water_1854` and `char_history_broad_street_annie` to the system seed source.
- [x] Encode the historical premise, limited character knowledge, first message, gameplay chapter and minor-safety rules using existing fields.
- [x] Add deterministic Space / Character rule responses for water, refusal, pump, family, map and John Snow discovery.
- [x] Preserve the existing three Space and six Character IDs unchanged.

## 3. Add the dedicated homepage contract

- [x] Add a frontend loader that validates only the historical pilot Space and Annie.
- [x] Switch the home route to the pilot loader and make ready state require one real Character.
- [x] Keep default discovery on `loadLaunchStorySpaces()`.
- [x] Ensure homepage data remains projected from API data with no duplicated role prose.

## 4. Recompose the homepage around one encounter

- [x] Change homepage role links to direct `characterSpacePath()` entry.
- [x] Render one focused desktop card and one mobile card.
- [x] Replace three-Space / six-character homepage copy and state messages with historical-pilot language.
- [x] Clearly label Annie as a fictional character in a real historical setting.
- [x] Use a truthful non-portrait visual fallback; do not add image binaries.

## 5. Update authority docs

- [x] Update `docs/PRODUCT_BRIEF.md`.
- [x] Update `docs/FABLESPACE_SPACE_PLATFORM.md`.
- [x] Confirm no Schema documentation change is required.

## 6. Verification

- [x] `py -3 -m compileall -q apps/api/src`
- [x] Focused Python seed and rule-response assertions.
- [x] `npm --prefix .\apps\web run typecheck`
- [x] `npm --prefix .\apps\web run build`
- [x] `npx -y react-doctor@latest . --verbose --scope changed` from `apps/web`
- [x] If local runtime is available, inspect homepage and Annie's first private message.
- [x] Adversarial desktop and 360px visual review with PASS / FAIL / BLOCKED evidence.
- [x] Confirm `git diff --check` and confirm no image binary was added.
- [x] Re-run the full 360px mobile path from homepage CTA through Annie's first message and usable chat composer.

## Rollback points

- If the new seed cannot be served without weakening existing contracts, stop before frontend rollout and keep the three-Space loader unchanged.
- If the single-card artboard produces unreachable or misleading UI, preserve the one-character data contract and simplify decoration before changing the product decision.
- Never delete a persisted pilot Space or chat history during rollback; stop exposing the entry and leave data intact.
