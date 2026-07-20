# Verification

## Verdict

PASS — mobile is now the primary path: the pilot presents one historical encounter, deep-links into Annie's private chat, places her opening message and composer in the first phone viewport, preserves the existing discovery collection and does not present the fallback visual as Annie's portrait.

## Runtime evidence

- Desktop viewport: 1536 × 1024.
- Homepage visible real-card count: `1`.
- Homepage card target: `/空间/aNaLCIZ8TVM?character_ref=ZyzWasXSv0g#空间主线`.
- Entered Space selected `安妮` and rendered the automatic first message containing `你那只碗里……还有水吗？`.
- Mobile viewport: 360 × 800.
- Mobile document widths: `clientWidth = 360`, `scrollWidth = 360`.
- Mobile visible real-card count: `1`.
- Mobile homepage primary CTA: top `372`, bottom `416`, height `44`; it is visible in the first viewport.
- The first mobile Space review failed because Annie's message started near `y = 1015`, after the hero, character list and tasks.
- After mobile-first reordering, Annie's message starts at `y = 225`, the composer starts at `y = 383`, and the send button starts at `y = 522`; all are visible in the 800px first viewport.
- Mobile Space document widths after reordering: `clientWidth = 345`, `scrollWidth = 345`; the message ends at `x = 245` and composer / send controls end at `x = 307`, so no content is clipped or horizontally unreachable.
- Typing into `当前角色聊天输入` enables the unique `发送` button; the verification text was cleared without sending.
- The original cyber/fictional fallback art was rejected during adversarial review. Homepage and pilot Space now render a code-native Broad Street rain, pump and stone-road visual. It is labelled as historical atmosphere, not an NPC portrait.

## Checks

- `py -3 -m compileall -q apps/api/src` — PASS.
- Focused seed / rule assertions — PASS; four system Spaces, Annie opening, give/refuse/pump/mother/map/John Snow branches.
- `npm --prefix .\apps\web run typecheck` — PASS.
- `npm --prefix .\apps\web run build` — PASS.
- `npx -y react-doctor@latest . --verbose --scope changed` — PASS, 100/100 after safe findings were addressed.
- `git diff --check` — PASS; line-ending warnings only.
- Image binary audit — PASS; no PNG, JPG, JPEG, WEBP, GIF or AVIF file added.

## Scope notes

- No Schema field or enum changed, so `docs/WORLD_SCHEMA.md` did not require an update.
- The three original launch Space IDs and six Character IDs remain in their existing discovery contract.
- No formal Annie portrait was generated or committed in this task.
