# 清除参考画板的我的家引用

## Goal

补齐参考画板对已删除 myHome 路由常量的依赖清理，恢复独立构建。

## Requirements

- 只处理 `fable-space-reference-artboards.tsx` 对已删除 `WEB_PATHS.myHome` 的依赖。
- 删除参考画板中的“我的回访”、旧侧栏条目、回访按钮和已无目标的查看全部链接。
- 仍需保留的通用入口改为现有 `WEB_PATHS.spaces`，并同步删除只服务于旧入口的图标分支和布局槽位。
- 不修改其他参考画板内容、后端合同、路由表或新首页角色发现组件。

## Acceptance Criteria

- [x] 已提交源码中不存在 `WEB_PATHS.myHome`。
- [x] 删除后的侧栏、移动端按钮和推荐故事入口不再指向旧个人中心。
- [x] 没有遗留只服务于旧回访入口的不可达图标分支。
- [x] `npm --prefix .\apps\web run typecheck` 与 `npm --prefix .\apps\web run build` 在该依赖补齐后通过。

## Notes

- Keep `prd.md` focused on requirements, constraints, and acceptance criteria.
- Lightweight tasks can remain PRD-only.
- For complex tasks, add `design.md` for technical design and `implement.md` for execution planning before `task.py start`.
