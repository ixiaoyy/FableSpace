# 实现角色发现与新路由

## Goal

只实现首页角色卡、角色公开短路由和旧入口切换。

## Requirements

- 本任务是角色发现阶段协调父任务，首页卡片、身份门禁清理与长明宫详情短路由由独立子任务实施。
- 首页展示安妮、魏观海、萧明珠三张真实 API 角色卡。
- 公开详情使用 `/characters/:characterSlug`，故事互动使用 `/characters/:characterSlug/story`。
- `characterSlug` 由前端角色路由注册表显式映射到既有 `storyWorldId` 与 `characterId`，不是新增 Character Schema 字段，也不替代 API 身份。
- 首页和站内链接只生成短路由，不生成或兼容 `/story-worlds/...` 前端深链。
- 故事世界作为角色背景展示，不建立世界目录或身份选择页。
- 不实现完整聊天、关系回访或旧路由批量删除。

## Acceptance Criteria

- [ ] 首页成功、加载、空和错误状态只使用真实数据。
- [ ] 三个角色的公开短路由均映射到正确 StoryWorld 与 Character。
- [ ] 首页不输出 `/story-worlds/...` 前端深链，详情页进入故事时使用对应 `/characters/:characterSlug/story`。
- [ ] 不存在占位角色、虚构统计或全局身份选择入口。
- [ ] 360px 无横向溢出，关键点击目标可用。
- [ ] typecheck 和 build 通过。

## Notes

- Keep `prd.md` focused on requirements, constraints, and acceptance criteria.
- Lightweight tasks can remain PRD-only.
- For complex tasks, add `design.md` for technical design and `implement.md` for execution planning before `task.py start`.
