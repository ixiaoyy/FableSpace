# Research: 多地点类型发现筛选 MVP

## Relevant Specs

- `AGENTS.md`: 真实坐标、主人主权、禁止擅自新增 Schema 字段；前端改动需 build/test。
- `.trellis/spec/frontend/index.md`: 新 route API/contract helper 放在 `frontend/app/lib/`；UI 需考虑窄屏。
- `.trellis/spec/frontend/directory-structure.md`: route 可复用 helper 放在 `frontend/app/lib/`，脚本测试放在 `frontend/scripts/`。
- `.trellis/spec/frontend/component-guidelines.md`: UI 使用函数组件、现有 class vocabulary、避免桌面限定布局。
- `.trellis/spec/frontend/quality-guidelines.md`: 前端服务/规则脚本变更运行 `npm --prefix .\frontend test`，UI 运行 build。
- `.trellis/spec/frontend/type-safety.md`: 对动态 Tavern payload 做运行时归一化，不能把前端-only 字段写入持久 payload。
- `.trellis/spec/guides/code-reuse-thinking-guide.md`: 先搜索已有 type/category/tag helper；避免重复常量。
- `.trellis/spec/guides/cross-layer-thinking-guide.md`: 本任务避免跨层 Schema 变更；只做前端派生显示。
- `.trellis/tasks/04-27-place-type-home-concept/product-direction-decision.md`: 采用 Place-first, Tavern-compatible；Home 受控且不进入公开发现 MVP。

## Code Patterns Found

- `frontend/app/routes/discover.tsx`: 已有 category chips、filter state、卡片徽章，可在同一模式中加入地点类型筛选。
- `frontend/app/components/tavern-preview-modal.tsx`: 预览弹窗展示公开 Tavern 信息，适合加地点类型徽章。
- `frontend/app/lib/taverns.ts`: route typed API client；本任务不修改 API contract，仅新增相邻 helper。
- `frontend/scripts/*-test.mjs`: 纯 helper 用 Node 脚本测试，并接入 `frontend/package.json` 的 `test` 串联。

## Files to Modify

- `frontend/app/lib/place-types.js`: 新增地点类型枚举、归一化、推断和公开筛选 helper。
- `frontend/scripts/place-types-test.mjs`: TDD 测试地点类型推断与 Home 保留规则。
- `frontend/package.json`: 将新脚本加入 `npm test`。
- `frontend/app/routes/discover.tsx`: 增加地点类型筛选和卡片徽章。
- `frontend/app/components/tavern-preview-modal.tsx`: 展示地点类型徽章。

## Code-Spec Depth Check

本任务不触碰后端 API、数据库或持久 Schema。数据流是：

```text
/api/v1/taverns public payload → frontend helper derives display type → discover route / preview modal display only
```

边界：

- 输入：未知形状 Tavern-like object；helper 必须容错。
- 输出：前端展示 metadata `{ id, label, shortLabel, icon, ... }`。
- 错误处理：未知/空 payload 回退 `tavern`。
- Bad case：Home 相关 payload 不进入公开 discover chips，只能被识别为 reserved display type。
