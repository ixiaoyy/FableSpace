# Visitor-First Discovery Page Reduction

## Parent
`05-12-onsite-visitor-brutal-audit-issues` — Issue #3

## Goal
Reduce discovery page to help first-time visitors pick one tavern in under 10 seconds without reading internal jargon.

## Requirements
- Audit `discover.tsx` for all visible panels and filters
- Keep for visitor view: map + top taverns + clear CTA per tavern
- Remove from visitor view (can keep for owner dashboard): world stats, online entities, echoes, footprints, signal activity
- Reduce competing filters to: location/radius + tavern type/place type only
- Per tavern card: show name + one-line description + NPC count + distance
- Clear entry point: "进入这个空间 →" or equivalent visitor-facing CTA
- Owner view (店主): can show all panels including world stats, gameplay status, etc.

## Acceptance Criteria
- [ ] Visitor view of `/discover` shows: map + top taverns + clear CTA
- [ ] No world stats, online entities, echoes, footprints visible to visitors
- [ ] Visitor can understand and pick a tavern in under 10 seconds
- [ ] Owner dashboard still has access to expanded panels (if applicable)
- [ ] `npm --prefix .\frontend run build` passes