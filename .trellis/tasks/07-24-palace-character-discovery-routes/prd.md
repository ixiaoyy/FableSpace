# 完成长明宫双角色公开详情入口

## Goal

补齐魏观海、萧明珠的角色公开短路由与真实不可用状态，不扩大旧 Space 兼容。

## Requirements

- 只补齐魏观海、萧明珠的角色公开短路由，不修改安妮链路。
- 公开详情必须来自已发布长明宫 StoryWorld API；内容未发布时显示真实不可用状态，不回退旧 Space 或静态伪详情。
- 两个角色共享同一 StoryWorld 和固定“小太监” PlayerRole，但分别展示自己的处境、开场与角色入口。
- 首页主动作分别进入 `/characters/wei` 与 `/characters/mingzhu`，故事互动分别进入 `/characters/wei/story` 与 `/characters/mingzhu/story`。
- 短路由通过前端角色路由注册表映射到长明宫 `storyWorldId` 及各自 `characterId`；不新增 Schema 字段，不恢复 `/story-worlds/...` 前端深链。
- 未登录可浏览公开详情，进入故事才触发登录。
- 360px 与桌面端均可用，不新增图片二进制或未登记资产。

## Acceptance Criteria

- [ ] 魏观海、萧明珠首页主动作进入各自公开短路由，并映射到正确 StoryWorld 与 Character。
- [ ] 两个详情页进入故事时使用对应 `/characters/:characterSlug/story`，不输出 `/story-worlds/...` 前端深链。
- [ ] 两个详情页只消费 StoryWorld 公开合同，不读取旧 Space 数据。
- [ ] 未发布、加载、空和失败状态不渲染伪角色内容。
- [ ] 未登录公开浏览与登录动作边界正确。
- [ ] 360px 无横向溢出，typecheck 与 build 通过。

## Notes

- Keep `prd.md` focused on requirements, constraints, and acceptance criteria.
- Lightweight tasks can remain PRD-only.
- For complex tasks, add `design.md` for technical design and `implement.md` for execution planning before `task.py start`.
