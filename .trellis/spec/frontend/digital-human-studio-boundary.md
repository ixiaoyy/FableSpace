# Digital Human Studio Boundary

> Frontend contract for the `digital-human-studio` special space type and portable digital-human identity pack.

## Scope / Trigger

Use this when changing:

- `frontend/app/lib/digital-human-studio.js`
- `frontend/app/lib/special-space-types.js` entries for `digital-human-studio`
- `/create` special space type template behavior
- `CharacterEditor.jsx` portable identity / video prompt preview
- character AI-draft defaults for digital-human spaces

This is a thin frontend/product layer. It must not add backend persistence fields, platform-generated public content, video generation, voice cloning, or unauthorized real-person likeness workflows.

## Signatures

```javascript
DIGITAL_HUMAN_STUDIO_TYPE_ID = "digital-human-studio"

DIGITAL_HUMAN_DRAFT_STYLE_TAGS: string[]
DIGITAL_HUMAN_DRAFT_FORBIDDEN: string[]

isDigitalHumanStudioType(value) -> boolean
normalizeDigitalHumanTags(character) -> string[]
buildDigitalHumanIdentityPack(character) -> {
  name,
  tags,
  oneLine,
  role,
  visualStyle,
  voiceStyle,
  sceneHook,
  boundary,
  opening,
  fableMapAdapter,
  videoPrompt,
}
buildDigitalHumanVideoPrompt(character) -> string
```

Special space type contract:

```javascript
SPECIAL_SPACE_TYPES[] includes {
  id: "digital-human-studio",
  layoutStyle: "npc-chat",
  place_type: "space",
  draftSeed: {
    place_type,
    layout_style,
    summary,
    scene_prompt,
    tone,
    forbidden,
    style_tags,
    character_name,
    character_description,
    first_mes,
  }
}
```

## Contracts

- Digital-human spaces remain real-coordinate `space` places; no free-floating, unanchored digital-human workspace.
- The special type is display/template metadata only. It may prefill existing create-form fields, but it must not persist new schema fields.
- `draftSeed.character_name`, `character_description`, and `first_mes` initialize an assistant NPC only after the owner clicks the template/apply action or submits the create form.
- AI output remains a draft. It must be editable and must not become a public character, space payload, video asset, or exported prompt until the owner/user explicitly confirms.
- `CharacterEditor` may show a read-only portable identity pack and video/short-drama prompt derived from the current draft. Copying text is allowed; calling external video/audio/image generators is out of scope.
- Video / short-drama adaptation must include at least: one-line positioning, visual style, voice rhythm, scene suggestion, sample speech/dialogue, and authorization/safety boundary.
- Safety wording must avoid enabling unauthorized real-person imitation: no celebrity/deepfake workflow, no voice cloning, no private ID/phone/address/API-key collection.
- The saved FableSpace character payload must continue to use existing `SpaceCharacter` / SillyTavern-compatible fields.

## Validation & Error Matrix

| Case | Expected |
| --- | --- |
| `/create?special_space_type=digital-human-studio` loads | Digital-human special type card and preview are visible |
| Owner clicks “填入模板文案” | Existing form fields receive owner-confirmable digital-human studio copy and assistant NPC greeting |
| Character draft is edited | Portable identity pack updates from current draft fields without saving |
| User copies video prompt | Clipboard receives text only; no external generation call is made |
| Ordinary space or cultivation space | Existing special type inference and draft seeds remain unchanged |
| Prompt contains unsafe real-person / PII instructions | Existing character prompt risk linter must still warn/block before save |

## Good / Base / Bad Cases

Good:

- A digital-human workshop pre-fills a `数字人档案师` NPC and uses `CharacterEditor` to expose a portable text identity pack plus video/short-drama prompt.
- Tests assert the special type, helper output, UI source markers, and Playwright create/space rendering.

Base:

- The video adapter is a text prompt only, suitable for copying to an external script or generation tool.

Bad:

- Adding `digital_human_profile` as a persisted backend field without schema/docs/tests.
- Auto-creating a public digital human from an AI chat transcript.
- Calling a video, voice-clone, or face-swap service from the editor.
- Storing owner secrets or private visitor identity data in the exported prompt.

## Tests Required

```powershell
node frontend/scripts/special-space-types-test.mjs
node frontend/scripts/digital-human-studio-test.mjs
node frontend/scripts/ai-character-drafts-test.mjs
npm --prefix .\frontend test
npm --prefix .\frontend run build
```

For visible create/space UI changes, also run:

```powershell
node frontend/scripts/playwright-digital-human-studio-check.mjs
```

The Playwright pass must capture at least one desktop create screenshot and one narrow/mobile space screenshot under the active task artifacts directory.

## Wrong vs Correct

### Wrong

```javascript
await createVideoFromFaceClone(digitalHumanDraft)
await addCharacter(space.id, aiOutput, ownerId)
```

This bypasses owner confirmation and crosses into unauthorized video/likeness generation.

### Correct

```javascript
const pack = buildDigitalHumanIdentityPack(editorDraft)
// Show pack.videoPrompt in a read-only textarea.
// Owner/user may copy it; saving still goes through CharacterEditor validation.
```

The correct flow keeps the feature as a portable text adapter and preserves existing character-card save boundaries.
