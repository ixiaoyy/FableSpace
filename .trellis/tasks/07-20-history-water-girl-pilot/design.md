# Technical Design

## Scope and compatibility

This task adds one new system-owned historical pilot Space while preserving the accepted three-Space / six-character launch collection as a separate compatibility contract.

- Existing discovery loader: `loadLaunchStorySpaces()` remains unchanged and continues to validate the three original Spaces.
- New homepage loader: a dedicated single-Space contract loads only the historical pilot and validates exactly one expected Character.
- Existing IDs, chat history, visitor memory and discovery behavior are not migrated.
- Existing `Space`, `SpaceCharacter`, `WorldInfoEntry` and `GameplayDefinition` fields are reused; no Schema change is required.

## Stable content identities

| Entity | Stable ID | Public meaning |
|---|---|---|
| Space | `history_broad_street_water_1854` | 1854 年伦敦宽街历史故事世界 |
| Character | `char_history_broad_street_annie` | 原创小女孩安妮 |
| Gameplay | `gp_history_broad_street_first_water` | 第一章“一碗水从哪里来” |

The Space is anchored near the historical Broad Street pump site at Broadwick Street / Lexington Street, Soho. Coordinates are an entrance anchor, not a claim that the fictional child lived at that exact modern point.

## Cross-layer data flow

```text
default_spaces.py
  -> JSON / database idempotent system seed
  -> GET Space entry payload
  -> loadHistoryPilotSpace() validates owner/access/status/Character ID
  -> buildHomepageView() projects one real Character card
  -> homepage card builds characterSpacePath(...)
  -> SpaceChatWorkbench resolves character_ref
  -> private chat seeds Character.first_mes
  -> rules backend resolves later player messages
```

Boundary ownership:

- Backend seed owns historical copy, character voice, facts, rules fallback and stable IDs.
- The dedicated frontend loader owns validation of the homepage pilot contract.
- `homepage-spaces.ts` only projects validated API data and does not own role prose.
- The homepage artboard owns layout and CTA copy.
- `SpaceChatWorkbench` continues to own first-message initialization; no pilot-only chat fork is introduced.

## Historical Space content

### Public summary

- Name: `伦敦宽街·一碗水`
- Location context: `英国伦敦 · Soho 宽街水泵历史锚点（今 Broadwick Street）`
- Label: `真实历史背景 · 原创角色`
- Current moment: early September 1854, before the pump handle decision.

### Annie

Annie is a fictional composite character, approximately ten years old. She knows only:

- her family normally collected water at the Broad Street pump;
- nearby households have become ill;
- her mother has warned her not to use that pump but the household has run out of water;
- a serious man has been asking residents where they got their water and marking addresses.

She does not initially know modern germ theory, epidemiology, Vibrio cholerae or John Snow's later reputation. Her role is to make evidence and choice personal, not to lecture.

Opening message:

> 安妮抱着一只缺口陶罐，盯住你手里的破碗：“你那只碗里……还有水吗？妈妈说别再碰宽街那口泵，可家里已经一点水都没有了。”

### First interaction branches

| Player response | Annie's next playable beat |
|---|---|
| Give water | She asks where it came from; source matters more than generosity. |
| Refuse | She accepts the refusal and asks whether the player can help find a safer source or an adult. |
| Ask about the pump | She identifies affected households and her family's usual water source. |
| Ask about the map / doctor | She recalls the man interviewing residents and marking addresses, unlocking the evidence thread. |
| Ask what to do | She offers three actions: inspect the bowl/source, ask neighbors, or find the map-making doctor. |

## Rule fallback

Add a Space ruleset and Annie-specific ruleset to `public_welfare_rules.py`.

- The ruleset must respond in character and keep the player active.
- “Give water” never assumes the water is safe; Annie asks its source before anyone drinks.
- “Refuse” is not punished or moralized.
- The fallback presents a concrete choice and does not collapse into generic emotional support.
- Historical facts are revealed incrementally and remain bounded by Annie's limited perspective.

## Homepage behavior

### Loader contract

Create a small `history-pilot-space.ts` module analogous to `launch-story-spaces.ts`:

- fetch `history_broad_street_water_1854` via `getSpace(..., { view: "entry" })`;
- require `system_public_welfare`, `public`, `open`;
- require `char_history_broad_street_annie`;
- project only the required Character;
- return a one-Space `SpaceListResponse`.

The home route switches to this loader. Ready state requires exactly one projected character.

### Entry target

Change homepage character CTA generation from `characterPath()` to `characterSpacePath()`. This is scoped to homepage cards only; discovery and profile routes retain their existing semantics.

### Layout

- Mobile is the primary composition and acceptance surface: keep the historical hook and “回应她” action in the first viewport, render one full-width character card, and ensure the resulting Space chat exposes Annie's first message and composer without horizontal scrolling.
- Desktop reuses the existing artboard shell and expands the same encounter into one large focused character card; it must not introduce a different information architecture.
- Replace six-character copy and right-rail counts with pilot-specific language.
- Existing discover links remain available as secondary navigation but do not imply that the homepage itself lists all roles.

## Seed and rollout behavior

Appending the historical pilot to `default_public_welfare_spaces()` makes it available to both JSON and database storage using existing idempotent seed maintenance.

- Fresh stores receive four system-owned Spaces.
- Existing stores receive the new Space because its ID is new.
- The three-Space frontend discovery contract continues to select only its original IDs.
- Rollback is code-level: remove the homepage loader usage and the new seed from a later release. Do not delete already persisted records or conversations.

## Documentation

Update:

- `docs/PRODUCT_BRIEF.md`: document the one-character historical homepage pilot and distinguish it from the three existing original worlds.
- `docs/FABLESPACE_SPACE_PLATFORM.md`: allow one reviewed historical pilot Space beyond the original launch collection and record the direct character-to-chat entry.

`WORLD_SCHEMA.md` does not change because no field or enum changes.

## Verification

- Python compileall.
- Focused Python assertions for the new seed, stable IDs, historical location, one Character, opening line and fallback response branches.
- Frontend typecheck and build.
- React Doctor after final React edits.
- Local isolated API/browser inspection if the environment can start.
- Adversarial visual review at desktop 1536 × 1024 and mobile 360 × 800:
  - only Annie appears on homepage;
  - CTA deep-links into Space private chat;
  - no six-character copy remains in homepage surfaces;
  - no overflow or overlap;
  - no image is presented as Annie's portrait unless backed by a real NPC asset.
- Run the mobile review first and include the complete home -> Space chat path, not only a static homepage screenshot.
