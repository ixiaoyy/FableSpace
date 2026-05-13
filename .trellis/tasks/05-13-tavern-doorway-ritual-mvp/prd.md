# Tavern Doorway Ritual MVP

## Parent
`05-12-onsite-visitor-brutal-audit-issues` — Issues #2, #4, #5

## Goal
Deliver one clear immersion beat before exposing chat workbench controls. First visitor screen must feel like "map → tavern → AI NPC chat", not "channels + shift+enter + intent chips".

## Requirements
- First screen: space hook (scene description) + NPC greeting (first message) + one clear call-to-action
- Hide "公共频道", "Channels", "Shift+Enter", intent chips, identity selector, NPC target chips, helper accordions until after first immersion moment
- Show map anchor (mini-map or distance) in tavern entry card
- Rewrite `tavern-first-minute.ts` `whyHere` text to visitor-facing invitation (no internal PRD language)
- Add visible map element to tavern first screen

## Acceptance Criteria
- [ ] Tavern first screen shows space hook + NPC greeting before workbench controls
- [ ] Workbench controls (channels, Shift+Enter, intent chips) hidden until after first immersion beat
- [ ] Map anchor visible on tavern first screen
- [ ] `whyHere` / first-minute copy is visitor-facing invitation, not PRD text
- [ ] `npm --prefix .\frontend run build` passes