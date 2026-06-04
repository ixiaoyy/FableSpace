# Owner-side first message scene guidance

## Goal

Help tavern owners write better `TavernCharacter.first_mes` / opening messages so visitors understand where they are, who is speaking, what is happening, and how to continue in-character.

## Scope

Frontend-only UI guidance in `CharacterEditor`.

## Non-goals

- No new Schema/API/database field.
- No AI-generated owner content.
- No blocking validation that prevents saving.
- No change to SillyTavern import/export fields.

## Acceptance criteria

- The character editor shows a compact first-message quality checklist near the `first_mes` field.
- The checklist is derived locally from existing draft text.
- Owners see a copyable starter example but must edit/confirm it themselves.
- Empty/short openers receive gentle suggestions; long openers are not rewritten.
- Build/typecheck pass.

## Implementation notes (2026-06-04)

Implemented in `frontend/app/product/CharacterEditor.jsx` and `frontend/app/product/styles.css`.

What changed:

- Added `analyzeOpeningSceneQuality(draft)` as an owner-only local helper.
- Added a compact checklist beside the `first_mes` field:
  - 地点 / 处境
  - 动作 + 台词
  - 氛围 / 情绪
  - 下一步钩子
  - 信息量
- Added gentle suggestions for missing cues.
- Added a selectable example sentence that is not auto-written and not saved unless the owner copies/edits/saves it.

Boundary:

- No AI call.
- No backend/API/Schema/database change.
- No blocking validation.
- No change to SillyTavern-compatible fields.

## Validation

Passed:

```powershell
npm --prefix .\frontend run typecheck
npm --prefix .\frontend run build
git -c safe.directory=D:/work/ai- diff --check
```

Visual acceptance note:

A local API verification server was started on `http://127.0.0.1:8951`. Normal no-query routes such as `/`, `/discover`, `/owner`, `/tavern/mainline-golden-path-tavern`, and `/create` hydrate correctly. However, owner routes with query strings such as `/owner?owner_id=owner-mainline-smoke` and `/tavern/mainline-golden-path-tavern/manage?owner_id=owner-mainline-smoke` stayed on the SPA loading fallback in this local verification server. Because the current `CharacterEditor` is reached through owner management surfaces that require owner identity, I did not claim browser visual PASS for this task. This route/query hydration issue is separate and should be handled as a focused follow-up if needed.
