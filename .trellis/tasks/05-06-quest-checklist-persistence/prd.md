# PRD: Quest checklist persistence boundary

## Problem
探索清单/Quest 路由当前明确写着 MVP，仅用前端估算，不持久化。它可以作为引导页，但如果作为“任务/清单”出现在产品里，用户会期待进度可保存，当前实现容易被认为是 demo。

## Evidence
- `frontend/app/routes/quests.tsx:75`：`本 MVP 只根据现有酒馆列表做前端引导与进度估算；不新增持久化清单 Schema...`
- `docs/WHAT_NOT_TO_BUILD.md` 明确禁止传统游戏化战斗/等级/排行榜方向，因此不能用竞技化任务系统解决。

## Goal
明确 Quest 的产品边界：
1. 如果作为“探索引导”，改文案/信息架构，避免承诺持久进度；
2. 如果作为“访客清单”，增加非竞技、非奖励化的持久化进度。

## Non-goals
- 不做排行榜、等级、装备、可交易奖励。
- 不把探索做成传统游戏任务系统。

## Acceptance Criteria
- [ ] 产品命名和文案不再让用户误解为有未实现的任务系统。
- [ ] 若实现持久化：每个 visitor 的清单进度可保存/恢复，并有后端测试。
- [ ] 若保持前端引导：路由中移除“进度估算”式伪状态，明确为“探索指南”。
- [ ] 不新增违反 `WHAT_NOT_TO_BUILD` 的排名、奖励、社交竞争。
- [ ] 前端空状态与导航入口与实际能力一致。

## Suggested files
- `frontend/app/routes/quests.tsx`
- `frontend/app/lib/quest-guide.js`
- `docs/WHAT_NOT_TO_BUILD.md`
