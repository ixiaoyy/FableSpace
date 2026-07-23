# 删除我的家路由与导航

## Goal

删除旧“我的家”页面、中文入口和英文兼容别名，并从产品导航中移除回访入口。

## Requirements

- 删除 `WEB_PATHS.myHome`、`/我的家` 路由以及 `/home-me`、`/home/me` 兼容重定向。
- 删除只服务于该入口的 `home-me.tsx` 与 `home-me-alias.tsx`。
- 从桌面导航和移动端底栏移除“我的回访”，移动端底栏收敛为首页、发现、游玩三项。
- 保留本批已有的导航短标签和角色优先页脚文案，不恢复旧“镜像面 / 多类型 AI 空间”定位。
- 不删除后端 `home-members`、地点类型、territory、公开关系或其他旧 Space 合同；这些属于后续独立任务。
- 不修改首页角色发现、故事互动或新的私有回访连续性。

## Acceptance Criteria

- [x] 前端路由层不再注册 `/我的家`、`/home-me` 或 `/home/me`。
- [x] `ProductShell` 不再生成“我的回访”或指向 `WEB_PATHS.myHome` 的链接。
- [x] 移动端底栏为三个等宽入口，360px 下可用且无页面级横向溢出。
- [x] 被删除的三个路径不再进入旧个人中心或被旧别名重定向。
- [x] 本批不包含后端 Home 数据、territory 或关系模型删除。
- [x] `npm --prefix .\apps\web run typecheck` 与 `npm --prefix .\apps\web run build` 通过。

## Notes

- Keep `prd.md` focused on requirements, constraints, and acceptance criteria.
- Lightweight tasks can remain PRD-only.
- For complex tasks, add `design.md` for technical design and `implement.md` for execution planning before `task.py start`.
