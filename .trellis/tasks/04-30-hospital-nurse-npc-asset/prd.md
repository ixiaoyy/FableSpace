# Hospital tavern nurse NPC asset

## Goal

Add a differentiated public-welfare hospital Place with a nurse NPC, using the new project default material flow:

- Inspect existing NPC art so the new nurse does not reuse the same repeated look.
- Preserve the accepted generated nurse image in repository paths, not only under `%USERPROFILE%\.codex\generated_images`.
- Add the hospital Place type consistently across backend schema validation, frontend type/display helpers, docs, Trellis specs, and tests.
- Seed a public hospital tavern with one complete nurse NPC and direct expression assets.

## Scope

### In scope

- Add `hospital` to finite `PlaceType` handling.
- Add `pw_hospital_night_care` default public-welfare Place / tavern.
- Add formal NPC `char_pw_mika_nurse` / `弥夏` with medical-safety prompt boundaries.
- Add project-owned PNG assets:
  - `frontend/public/assets/npcs/public-welfare/char_pw_mika_nurse/neutral.png`
  - `frontend/public/assets/npcs/public-welfare/char_pw_mika_nurse/joy.png`
  - `frontend/public/assets/npcs/public-welfare/char_pw_mika_nurse/anger.png`
  - `frontend/public/assets/npcs/public-welfare/char_pw_mika_nurse/embarrassment.png`
  - `frontend/public/assets/npcs/public-welfare/char_pw_mika_nurse/curiosity.png`
- Copy full generated reference image to `artifacts/04-30-hospital-nurse-npc-asset/nurse-full-reference.png`.
- Update tests for seed data, assets, frontend place type helpers, and V1 place type round-trip.

### Out of scope

- No platform-generated user taverns.
- No medical diagnosis, prescription, treatment plan, or emergency-care replacement behavior.
- No new UI framework or map dependency.
- No deletion/renaming of existing docs.

## Asset provenance

Source generated image:

`C:\Users\phpxi\.codex\generated_images\019ddce5-bc68-7942-840d-b0839f944d95\ig_094ffb25bab797ad0169f2f315a9708198ad504cf06858d066.png`

Repository reference copy:

`artifacts/04-30-hospital-nurse-npc-asset/nurse-full-reference.png`

Source/reference SHA-256:

`fd28b34a429a85dcea83285fdc0b44090dd20bc3680a903552e9aaf60e750afc`

NPC sprite assets are 512x512 PNGs:

| Asset | SHA-256 |
|---|---|
| `anger.png` | `305405b99887724abad640cbea447a7a0e0a517c5d00b422a5481538431410f2` |
| `curiosity.png` | `a172a86bca340ac941e1a63b82b59efbccec7f47b11f507a46a4e17ee41a83e8` |
| `embarrassment.png` | `5742694064043ab6aaa1a0e672385e84e46669233498b9c9910e29e88320a339` |
| `joy.png` | `e8108b3fa32981db2c277f22e6523437b9d9cd93f27c562210f549a7a7db4125` |
| `neutral.png` | `fa1ff448952aa4fd2ea25ddfe923049787bdc5dadec200b5d862227d789b3cd3` |

## Implementation notes

- Existing public-welfare NPC assets were checked under `frontend/public/assets/npcs/public-welfare/` before adding the new directory.
- The nurse uses a larger 512px cropped portrait set and a cool blue/white cel-shaded composition to reduce repetition from the prior 256px public-welfare cast.
- `hospital` remains a public discoverable Place type; only `home` remains excluded from public discovery.
- Hospital copy is explicitly bounded as nursing/triage-themed support and reality-safety reminder, not medical advice.

## Verification

- `py -3 -m compileall -q backend/src` — passed.
- `py -3 -m pytest -q tests/test_default_public_welfare_taverns.py tests/test_default_public_welfare_gameplays.py backend/tests/test_v1_place_home_mvp.py --tb=short` — passed, 31 tests.
- `npm --prefix .\frontend test` — passed.
- `npm --prefix .\frontend run typecheck` — passed.
- `npm --prefix .\frontend run build` — passed.
- `py -3 .trellis/scripts/task.py validate .trellis/tasks/04-30-hospital-nurse-npc-asset` — passed.
- PNG audit: all nurse sprites are 512x512, full reference is 1086x1448; generated source hash equals artifact reference hash.

## Correction after role-count review

The hospital was corrected from a one-NPC Place to a three-role shop/station, matching the default seed convention that each public-welfare shop should provide at least three character roles.

Added support NPCs:

- `char_pw_qingyou_records` / 青柚：候诊档案员，负责低隐私候诊卡、时间线和信息整理。
- `char_pw_nanxing_liaison` / 南星：急救联络员，负责现实求助路径、紧急电话 / 线下急诊边界提醒。

Additional generated source:

`C:\Users\phpxi\.codex\generated_images\019ddce5-bc68-7942-840d-b0839f944d95\ig_092944ee03ac958a0169f2f82078f481989c92981a311f90ab.png`

Repository reference copy:

`artifacts/04-30-hospital-nurse-npc-asset/hospital-support-duo-reference.png`

Reference SHA-256:

`2d3848db799b91037da4ad6be6200764319871823d7d71c160c62c15b4b04fd1`

New support NPC sprites are all 512x512 PNGs under:

- `frontend/public/assets/npcs/public-welfare/char_pw_qingyou_records/`
- `frontend/public/assets/npcs/public-welfare/char_pw_nanxing_liaison/`

Correction verification:

- `py -3 -m compileall -q backend/src` — passed.
- `py -3 -m pytest -q tests/test_default_public_welfare_taverns.py tests/test_default_public_welfare_gameplays.py backend/tests/test_v1_place_home_mvp.py --tb=short` — passed, 31 tests.
- `npm --prefix .\frontend run build` — passed.
- PNG audit: hospital trio has 15 expression sprites, all 512x512.

## Core chat contract review

Follow-up requirement: every shop must retain a core character chat path.

Implemented safeguards:

- Added regression coverage that every default public-welfare shop can be entered, has at least three seeded characters, and each seeded character can complete one non-degraded rules-backend chat turn with a persisted two-message chat session.
- Recorded the default public-welfare seed runtime contract in `.trellis/spec/backend/database-guidelines.md` so future seed/shop work must preserve role count, direct sprite assets, role division, and per-character chat.
- Tightened `/create` UI submission so a user-created shop cannot be created from the form without at least one named NPC; this keeps the core character chat loop available immediately for normal UI-created shops while still leaving low-level API/import compatibility unchanged.

Core chat verification:

- `py -3 -m compileall -q backend/src` — passed.
- `py -3 -m pytest -q tests/test_default_public_welfare_taverns.py tests/test_default_public_welfare_gameplays.py backend/tests/test_v1_place_home_mvp.py --tb=short` — passed, 32 tests.
- `npm --prefix .\frontend run typecheck` — passed.
- `npm --prefix .\frontend run build` — passed.
- `py -3 .trellis/scripts/task.py validate .trellis/tasks/04-30-hospital-nurse-npc-asset` — passed.

## Follow-up task captured

The broader request to audit and batch-upgrade old public-welfare NPCs is not completed by this hospital task. It is now tracked separately in:

`.trellis/tasks/04-30-public-welfare-npc-batch-upgrade/`

That follow-up records the remaining scope from this session:

- audit all legacy public-welfare NPC images and seed data;
- score visual repetition / outdated assets;
- assign differentiated styles using `$image-style-prompt-extractor`;
- rebuild old NPC sprites in batches with provenance and hash records;
- keep every shop at 3+ chat-capable roles with clear role division.

