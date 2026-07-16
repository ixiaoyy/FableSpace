# Technical Design

## Contracts

- Canonical identity: `play_identity_id=beggar`.
- Canonical gender inputs: `male` and `female` for the launch UI.
- Private persisted form: `VisitorState.metadata.play_identity={id, version}` plus `VisitorState.gender`.
- Public Space and character payloads remain unchanged by visitor identity.

## Frontend Flow

1. `visitor-play-identity.ts` validates and reads/writes the local selection.
2. `visitor-play-identity-onboarding.tsx` uses a two-step flow based on the selected visual reference: a full-width, searchable identity catalog with a fixed action footer, followed by a large selected-identity visual beside details, gender, privacy context, and confirmation. The v3 reference catalog contains 乞丐、太监、宫女、萝卜精、小奶狗、捉妖师、学渣、学霸; only 乞丐 has a server-supported identity ID and every other card is visibly locked.
3. Homepage character cards link to character detail or the owning Space.
4. `characterSpacePath` encodes a stable `character_ref`.
5. `SpaceChatWorkbench` resolves the requested character and adds identity fields to all visitor interaction requests.

## Backend Flow

1. API contracts accept the two optional request fields.
2. `visitor_play_identity.py` validates the whitelist and builds versioned identity context.
3. Entry and chat services merge the normalized value into private visitor state.
4. Prompt composition places Space/NPC canon before visitor persona and injects a dedicated identity system message.

## Compatibility

- The new visitor-facing route does not expose an owner/internal bypass for missing identity.
- Invalid client values fail validation instead of silently becoming a custom prompt.
- Existing visitor state without identity remains readable.
- Identity count changes only the directory grid and optional search; it does not change the confirmation-step layout.
- Catalog previews without a server-supported `playIdentityId` are disabled presentation data and never widen the API contract.
