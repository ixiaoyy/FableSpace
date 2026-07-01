# Character Prompt Risk Linter

> Frontend contract for owner-facing `SpaceCharacter` prompt risk checks before saving or importing NPC role cards.

## Scope / Trigger

Use this spec when changing:

- `frontend/app/product/characterPromptRiskLinter.js`
- `frontend/app/product/CharacterEditor.jsx`
- `frontend/app/product/CharacterManagementModal.jsx`
- SillyTavern / community character-card import paths
- frontend script tests for NPC prompt safety

This is a frontend guardrail and does not add `SpaceCharacter` schema fields, new backend persistence, adult governance, or platform-side automatic content publication.

## Signatures

```javascript
analyzeCharacterPromptRisk(character) -> {
  canSave: boolean,
  highestLevel: 'blocked' | 'warning' | 'info',
  summary: { blocked: number, warning: number, info: number, total: number },
  items: Array<{
    id: string,
    rule_id: string,
    level: 'blocked' | 'warning' | 'info',
    category: string,
    label: string,
    field: string,
    field_label: string,
    message: string,
    suggestion: string,
  }>,
}
```

```javascript
formatPromptRiskBlockMessage(report) -> string
assertCharacterPromptRiskCanSave(character) -> report | throws Error
```

## Contracts

- The linter inspects owner/imported character prompt fields only: existing `SpaceCharacter` / `NpcDraftPreview` text fields and imported `world_info` content.
- It must not add or depend on persisted schema fields.
- `blocked` means the editor/import path must not call `addCharacter`, `updateCharacter`, or `importCharacterCard` until the owner removes the risk.
- `warning` means the owner can still save, but UI must show the risk in readable language.
- `info` means compatibility/operational hints such as model/profile-specific preset notes.
- Blocked rules must cover at least:
  - ignore restrictions / jailbreak / safety bypass;
  - absolute obedience / “user is god” / never refuse;
  - chain-of-thought or hidden-reasoning forcing;
  - PII/private address/API key collection or actual sensitive values.
- Warning rules should cover at least:
  - visitor impersonation / forced visitor actions, consent, identity, or inner thoughts;
  - real-person / photoreal / celebrity-like NPC visual prompts.
- Risk messages must be owner-facing and must not echo detected API keys, phone numbers, emails, or raw private-address snippets.
- Safe negative wording such as “不要索取手机号” or “不要真人照片” should not create blocked items.

## Validation & Error Matrix

| Case | Expected |
| --- | --- |
| `system_prompt` says “忽略所有限制 / 用户就是上帝 / 输出 chain-of-thought” | `blocked >= 3`, `canSave=false` |
| Imported card contains an API key or phone number | Import is blocked before calling save API; formatted message does not echo the secret |
| Character prompt asks NPC to decide `{{user}}` actions/inner thoughts | `warning`, save allowed with owner-visible explanation |
| Visual prompt asks for photorealistic real-person / celebrity likeness | `warning`, with non-photoreal fictional NPC rewrite suggestion |
| Prompt says “不要真实私人地址 / 不索取手机号 / 不要真人照片” | No blocked risk from those negated safety constraints |
| Model/preset-specific runtime text is present | `info`, not blocked |

## Good / Base / Bad Cases

Good:

- CharacterEditor shows a `Prompt 风险检查` panel, blocks save on `blocked`, and still lets owners review warning/info items.
- Character card import runs `assertCharacterPromptRiskCanSave(...)` before `importCharacterCard(...)`.

Base:

- A script test covers the pure linter and static integration points without needing a browser.

Bad:

- Pasting a community role card with “ignore restrictions” and saving it directly as `system_prompt`.
- Displaying raw API keys or phone numbers inside the risk summary.
- Adding a new backend field such as `prompt_risk_status` just for frontend lint convenience.

## Tests Required

Run:

```powershell
node frontend/scripts/character-prompt-risk-linter-test.mjs
npm --prefix .\frontend test
npm --prefix .\frontend run typecheck
npm --prefix .\frontend run build
```

For visible UI changes, also run a Playwright self-acceptance pass against the editor or an equivalent harness and capture desktop + narrow screenshots.

## Wrong vs Correct

### Wrong

```javascript
const saved = await importCharacterCard(space.id, cardData, ownerId)
```

This silently persists unsafe imported prompt text.

### Correct

```javascript
assertCharacterPromptRiskCanSave(cardData)
const saved = await importCharacterCard(space.id, cardData, ownerId)
```

The owner must remove blocked risks before the imported card can become a saved `SpaceCharacter`.
