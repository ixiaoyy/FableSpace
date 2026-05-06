# PRD: Home route productization or retirement

## Problem
`home-me` 路由看起来是独立“我的空间”产品，但当前存在 owner 判断写死、成员回复 placeholder、与 `place_type=home` 酒馆主线重复等问题。若继续暴露，会让用户感觉是半成品 demo。

## Evidence
- `frontend/app/routes/home-me.tsx:473`：`const isOwner = true // TODO: 实际根据 userId 判断`。
- `backend/src/fablemap_api/infrastructure/home_store.py:382`：可对话成员当前 TODO，回复是 placeholder。
- `frontend/app/lib/taverns.ts` 同时已经支持 `place_type: "home"` 与 home API，存在路线重复风险。

## Goal
二选一并落地：
1. **产品化**：把 Home 作为真实坐标空间的一种 place_type，身份、成员、留言、可对话角色都走主链路；
2. **下线/合并**：如果暂不做 Home，则从用户入口隐藏独立路由，只保留酒馆主线的 home 类型数据结构。

## Non-goals
- 不做无锚点自由空间。
- 不新增访客间社交。
- 不让平台自动生成主人家庭/私人关系内容。

## Acceptance Criteria
- [x] `home-me` 不再写死 `isOwner=true`；owner/visitor 视图来自真实身份和权限。
- [x] 可对话成员要么接入现有 Tavern/NPC prompt + LLM 路径，要么 UI 明确隐藏“可对话”能力。
- [x] 留言、成员、关系申请与 `place_type=home` 数据边界统一，不出现两套互相不一致入口。
- [x] 若选择下线，则导航/入口/空状态不再引导用户进入半成品 Home route。
- [x] 增加前端构建与关键交互测试，至少覆盖 owner/visitor 两种视图。

## Suggested files
- `frontend/app/routes/home-me.tsx`
- `backend/src/fablemap_api/infrastructure/home_store.py`
- `frontend/app/lib/taverns.ts`
- `backend/src/fablemap_api/core/tavern.py`
- `docs/WHAT_NOT_TO_BUILD.md`


## Implementation Notes

- 选择低风险“下线/合并”路径：保留 `/home/me` 作为兼容提示页，但不再调用 legacy Home MVP store，也不再创建独立 Home、留言或占位成员聊天。
- `/home/me` 去掉 `isOwner=true`，仅根据显式 `owner_id` / `user_id` 相等显示 owner/visitor 不同说明；页面不授予真实管理权限，写操作全部引导回 `/create?place_type=home` 与 `/owner` 主线。
- 访客侧不再展示“与成员互动”“访客留言”“可对话成员”等半成品能力；可对话成员必须在主 Tavern/Home 里绑定正式 `TavernCharacter`。
- `/create` 支持 `?place_type=home` 预选，并通过共享 `normalizePlaceTypeId(...)` 归一化，继续走 `normalizeCreatePlacePayload(...)` 的 Home 默认私密边界。
- `.trellis/spec/frontend/type-safety.md` 补充 legacy `/home/me` 兼容页与 `place_type=home` query 约束。

## Validation

- RED: `node .\scripts\home-route-productization-test.mjs`（cwd: `frontend`）先因 `const isOwner = true` 失败。
- GREEN: `node .\scripts\home-route-productization-test.mjs`（cwd: `frontend`）→ passed.
- `npm --prefix .\frontend run typecheck` → passed.
- `npm --prefix .\frontend test` → passed.
- `npm --prefix .\frontend run build` → passed.
- `py -3 -m compileall -q backend/src` → passed.
- `git diff --check -- <changed files>` → passed with CRLF normalization warnings only.
