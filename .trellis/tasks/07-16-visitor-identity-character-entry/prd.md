# 访客身份与角色优先入口

## Goal

Deliver a private visitor play-identity flow and make characters the primary discovery entry without detaching them from their owning Spaces.

## Requirements

- The visitor must explicitly select the only launch identity, `beggar` (displayed as ancient beggar), and `male` or `female`.
- The new visitor-facing Space flow has no owner or legacy bypass around identity onboarding; management compatibility is not an acceptance target for this child.
- The client persists only the versioned identity ID and declared gender, never editable prompt text.
- Entry, single-character chat, and group chat send the same `play_identity_id` and `visitor_gender` fields.
- The backend validates identity values and persists normalized private state before the first model call.
- The homepage lists characters in round-robin order across public Spaces and shows each character's owning Space and location context.
- Character detail navigates to the owning Space with that character preselected.
- Identity and gender never enter public Space payloads, public profiles, matching, or access decisions.

## Acceptance Criteria

- [x] A new visitor cannot enter the visitor flow before making both explicit selections.
- [x] Reloading restores a valid private selection; malformed or unknown stored values are rejected.
- [x] Every route into the new visitor-facing Space flow redirects missing or malformed identity state to explicit onboarding.
- [x] Deep-linking a character selects the correct character in the correct Space.
- [x] The first entry/chat request already contains normalized identity and gender.
- [x] Male and female selection change only appropriate forms of address, not capability or moral assumptions.
- [x] Frontend typecheck and build pass; responsive behavior remains covered by the implementation and final visual QA child rather than a mandatory Playwright self-check.

## Notes

- Existing uncommitted files are candidate work and must be reviewed under this child before acceptance.
- Product decision on 2026-07-16: prioritize the new character-first visitor experience over preserving old owner-facing entry behavior. This child does not globally remove Space ownership or management APIs.
