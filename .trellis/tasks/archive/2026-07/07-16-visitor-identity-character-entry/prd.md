# 访客身份与角色优先入口

## Goal

Deliver a private visitor play-identity flow and make characters the primary discovery entry without detaching them from their owning Spaces.

## Requirements

- The visitor must explicitly select the only launch identity, `beggar` (displayed only as `乞丐`; its ancient-era background remains an internal identity attribute), and `male` or `female`.
- Identity onboarding separates the scalable identity directory from the selected identity details, gender setting, and final confirmation.
- Adding identities may expand or scroll the directory but must not move the gender setting or confirmation action farther down the page.
- Search, status filters, and sorting operate over the visible catalog when supported and preview-only identities make the directory large enough to benefit from them.
- Preview-only identities must remain visibly unavailable and must never produce runtime identity values or requests.
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
- [x] The launch identity is selected explicitly in step 1, then reviewed with gender and privacy context in step 2.
- [x] Desktop and mobile keep the final confirmation independent from identity-list length; a single identity does not expose empty search or filter controls.
- [x] Frontend typecheck and build pass; responsive behavior remains covered by the implementation and final visual QA child rather than a mandatory Playwright self-check.

## Notes

- Existing uncommitted files are candidate work and must be reviewed under this child before acceptance.
- Product decision on 2026-07-16: prioritize the new character-first visitor experience over preserving old owner-facing entry behavior. This child does not globally remove Space ownership or management APIs.
