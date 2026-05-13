# NPC Fallback + Memory Truthfulness

## Parent
`05-12-onsite-visitor-brutal-audit-issues` — Issues #6, #7

## Goal
Stop claiming "progress" and "memory" when the AI NPC gave a fallback non-answer. Visitors should only see progress/memory/relationship badges when the NPC gave a real response.

## Requirements
- Backend: detect non-answer fallback in `runtime.py` chat response
  - Add `is_fallback: bool` flag to chat response payload when fallback fires
  - Example fallback patterns: "似乎在听你说话", "暂时没有更多回复", generic "I understand" templates
- Frontend: gate progress/memory/relationship badges behind non-fallback response
  - `TavernMemoryPanel`: only show "记住了 N 件事" when `is_fallback !== true`
  - `TavernContextPanel`: only show "本轮有推进" / relationship update when `is_fallback !== true`
  - Show loading or "NPC 正在思考..." state when waiting for non-fallback response
- When fallback fires, show explicit retry or "NPC 暂时无法回复" UI instead of fake progress

## Acceptance Criteria
- [ ] Backend flags fallback response with `is_fallback: true` in chat payload
- [ ] Frontend does not show "记住了 N 件事" / "关系进入陌生人" after fallback non-answer
- [ ] Fallback response shows explicit loading/retry state, not fake progress
- [ ] `npm --prefix .\frontend run build` passes
- [ ] Backend tests cover fallback detection logic