# 代码与文档调研：多地点类型与 Home 概念

> 日期：2026-04-27
> 任务：`04-27-place-type-home-concept`
> 范围：产品方向收敛；本轮不修改业务代码、不修改持久 Schema。

## Relevant Specs / Docs

- `AGENTS.md`：仓库硬约束；中高风险任务需明确目标、范围、不可改范围、依据文档和验证方式；不得擅自新增 Schema 字段或全局术语。
- `README.md`：当前一句话定位仍是“赛博酒馆 UGC 平台”，主链路是坐标/定位 → 真实底图 → 浏览酒馆 → 进入酒馆 → 配置 AI NPC → 对话 → 写回记忆 → 回访。
- `docs/PRODUCT_BRIEF.md`：核心价值是“真实锚点 / 主人主权 / 最小平台 / SillyTavern 兼容”；AI 草稿只能作为店主确认前的辅助。
- `docs/FABLEMAP_TAVERN_PLATFORM.md`：当前主线设计以 Tavern 为实现实体，但理念上已经承认学校、小区、公园、商场、咖啡馆等真实区域都可成为“酒馆”隐喻。
- `docs/WHAT_NOT_TO_BUILD.md`：禁止无锚点自由空间、无边界访客社交、平台绕过主人确认发布内容、传统地图 App 功能、战斗/等级装备/传统 RPG 任务。
- `docs/WORLD_SCHEMA.md`：当前核心 Schema 是 `Tavern` / `TavernCharacter` / `VisitorState` / `GameplayDefinition`；`Place / POI` 目前只是旧概念映射到 `Tavern`，不能在本任务直接恢复成新持久模型。
- `.trellis/spec/guides/cross-layer-thinking-guide.md`：若后续进入 Place/Home Schema 或 API 改造，必须先定义跨层数据流、边界、格式、验证和错误矩阵。

## Code Patterns Found

- `backend/src/fablemap_api/core/tavern.py`：`Tavern` 是当前唯一可进入地点实体，包含 `lat/lon/address/access/status/characters/world_info/gameplay_definitions/layout_style/timezone/operating_hours` 等字段。
- `backend/src/fablemap_api/contracts/taverns.py`：创建/更新请求仍以 Tavern 为契约；任何新增 `place_type`、`home`、`member` 字段都属于 API/Schema 变更，需另开实现任务。
- `frontend/app/lib/taverns.ts`：前端 typed client 也围绕 `Tavern`；部分历史字段仍出现 `place_id`，但不是新的 Place 模型依据。
- `docs/CURRENT_TASKS.md` / `docs/AI_SHARED_TASKLIST.md`：当前实现进度集中在酒馆体验壳、记忆、世界书、Prompt、分享/导入导出等能力；没有已批准的 Home 或关系图实现任务。

## Files Likely Needed in Future Implementation

> 本轮仅产出产品决策，不修改下列文件。

- 产品文档改版：`README.md`、`docs/PRODUCT_BRIEF.md`、`docs/FABLEMAP_TAVERN_PLATFORM.md`、`docs/WHAT_NOT_TO_BUILD.md`。
- Schema/API 设计：`docs/WORLD_SCHEMA.md`、`backend/src/fablemap_api/core/tavern.py`、`backend/src/fablemap_api/contracts/taverns.py`、`frontend/app/lib/taverns.ts`。
- 前端发现/创建/详情 UI：`frontend/app/routes/discover.tsx`、`frontend/app/routes/create.tsx`、`frontend/app/routes/tavern.tsx`。
- 默认内容与测试：`backend/src/fablemap_api/core/default_taverns.py`、相关 `tests/` 与 `frontend/scripts/` 回归测试。

## Code-Spec Depth Check

当前任务不进入代码和 Schema 实现，因此不定义新字段契约。

若后续任务进入 `Place/Home/Member/Relationship` 实现，启动前必须先完成：

- 目标 code-spec / docs 更新文件清单。
- 精确字段与 API 契约：字段名、类型、默认值、兼容读取、公开/私有 payload 差异。
- 验证与错误矩阵：无坐标、私密 Home、非主人访问、跨 Place 写入权限、非生物成员对话等。
- Good/Base/Bad case：公开 Place、私密 Home、无权限关系同步、无表达能力成员返回 `...`。
