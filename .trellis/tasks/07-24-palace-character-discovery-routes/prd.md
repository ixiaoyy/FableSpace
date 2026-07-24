# 完成长明宫双角色公开详情入口

## Goal

补齐魏观海、萧明珠的 StoryWorld 公开详情深链与真实不可用状态，不扩大旧 Space 兼容。

## Requirements

- 只补齐魏观海、萧明珠的 StoryWorld Character 公开详情深链，不修改安妮链路。
- 公开详情必须来自已发布长明宫 StoryWorld API；内容未发布时显示真实不可用状态，不回退旧 Space 或静态伪详情。
- 两个角色共享同一 StoryWorld 和固定“小太监” PlayerRole，但分别展示自己的处境、开场与角色入口。
- 首页主动作切换到 `/story-worlds/:storyWorldId/characters/:characterId` 后，旧角色路由不再作为新链路依赖。
- 未登录可浏览公开详情，进入故事才触发登录。
- 360px 与桌面端均可用，不新增图片二进制或未登记资产。

## Acceptance Criteria

- [ ] 魏观海、萧明珠首页主动作进入各自正确 StoryWorld Character 深链。
- [ ] 两个详情页只消费 StoryWorld 公开合同，不读取旧 Space 数据。
- [ ] 未发布、加载、空和失败状态不渲染伪角色内容。
- [ ] 未登录公开浏览与登录动作边界正确。
- [ ] 360px 无横向溢出，typecheck 与 build 通过。

## Notes

- Keep `prd.md` focused on requirements, constraints, and acceptance criteria.
- Lightweight tasks can remain PRD-only.
- For complex tasks, add `design.md` for technical design and `implement.md` for execution planning before `task.py start`.
