# Fix homepage missing lucide icon imports

## Goal
修复首页运行时报错 `ReferenceError: Play is not defined`，恢复首页可打开。

## Scope
- `frontend/app/components/soul-link-reference-artboards.tsx` 的 lucide-react 图标导入。

## Requirements
- 补齐组件中实际使用但未导入的图标。
- 不做无关 UI 样式调整。
- 通过前端 typecheck 和 build。

## Acceptance Criteria
- [x] `Play` 不再是未定义变量。
- [x] 同文件 `Search` 未导入问题一并补齐。
- [x] `npm --prefix .\frontend run typecheck` 通过。
- [x] `npm --prefix .\frontend run build` 通过。

## Not in Scope
- 不修改首页视觉设计。
- 不改 API / 后端。
