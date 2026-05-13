# Memory Feedback UI

## Goal
Expose the backend MemoryAtom feedback loop in the existing tavern memory UI so visitors can quickly mark a remembered fact as correct, correct it in-place, or flag it as wrong without leaving the tavern context.

## Requirements
- Add a frontend service method for `POST /api/v1/taverns/{tavern_id}/memory-atoms/{memory_id}/feedback`.
- Add compact feedback controls to the existing memory panel/card UI instead of creating a separate product surface.
- Support three user actions:
  - "记对了" / reinforce: `correct=true`.
  - "修正" / correction: `correct=false` with replacement `content`.
  - "记错了" / flag wrong: `correct=false` without content.
- Update local UI state after successful feedback so the user sees `reinforcement_count`, corrected content, or `flagged_wrong` immediately.
- Keep private-memory permission boundaries implicit: send the current visitor/user id through the existing service header pattern; do not expose owner API keys or internal prompt text.
- Maintain mobile/narrow-screen usability: controls must wrap and not consume the whole chat first screen.

## Acceptance Criteria
- [ ] Frontend service exposes a reusable `feedbackMemoryAtom(...)` method.
- [ ] Existing memory panel/cards show clear buttons for correct/correct/wrong feedback.
- [ ] Correction action has an inline textarea and save/cancel path.
- [ ] Successful responses replace the local atom with the backend `memory_atom` response.
- [ ] Wrong/flagged memories show an explicit visual status and are not presented as trustworthy.
- [ ] `npm --prefix .\frontend run build` passes.

## Non-goals
- No new backend API work in this task.
- No new social features, rankings, or visitor-to-visitor communication.
- No redesign of the entire tavern chat workbench.

## Technical Notes
- Prefer `frontend/app/product/services/tavernService.js` because current product parity memory panels use it.
- Likely targets: `frontend/app/product/TavernMemoryPanel.jsx`, `frontend/app/product/TavernContextPanel.jsx`, and `frontend/app/product/services/tavernService.js`.