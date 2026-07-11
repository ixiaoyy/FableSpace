# FableSpace 系统架构

本文档描述当前空间平台的实现分层。产品主线见 [FABLESPACE_SPACE_PLATFORM.md](FABLESPACE_SPACE_PLATFORM.md)，字段约束见 [WORLD_SCHEMA.md](WORLD_SCHEMA.md)。

## 总览

```text
Frontend (React Router / Vite)
  -> API client / product compatibility services
  -> FastAPI routes (/api and /api/v1)
  -> Application services
  -> Core domain modules
  -> SQLAlchemy database or explicit JSON fallback
```

FableSpace 同时保留两类 API 面：

- `/api/*`：旧兼容层和本地一体化页面使用。
- `/api/v1/*`：当前原生后端接口面，前端新代码优先使用。

## 代码入口

| 区域 | 主要路径 | 说明 |
|------|----------|------|
| 后端本地一体化入口 | `apps/api/src/fablespace_api/core/api.py` | `py -3 -m fablespace_api api`，默认端口 `8950`，可托管前端构建。 |
| 后端 ASGI 入口 | `apps/api/src/fablespace_api/main.py` | Docker / uvicorn 使用。 |
| 旧兼容 Web app | `apps/api/src/fablespace_api/core/web/app.py` | 组合 `/api/*` 和 `/api/v1/*`。 |
| v1 路由 | `apps/api/src/fablespace_api/api/v1/` | 当前原生 API 路由。 |
| 应用服务 | `apps/api/src/fablespace_api/application/services/` | API orchestration，不直接放 UI 逻辑。 |
| 核心领域 | `apps/api/src/fablespace_api/core/` | Space、玩法、记忆、LLM、状态卡等核心规则。 |
| 持久化 | `apps/api/src/fablespace_api/infrastructure/` | SQLAlchemy models、stores、迁移工具。 |
| 前端入口 | `apps/web/app/` | React Router routes、features、lib。 |
| 产品兼容模块 | `apps/web/app/product/` | 历史产品模块和兼容服务。 |

## 分层职责

### Reality Kernel

职责：

- 接收坐标、半径、定位等地理输入。
- 拉取或读取 OSM / Overpass 风格数据。
- 为 Space 提供真实地图锚点。

原则：AI 不创造坐标，不替代真实地理骨架。

关键路径：

- `apps/api/src/fablespace_api/core/overpass.py`
- `apps/api/src/fablespace_api/core/nearby.py`
- `apps/web/app/product/WorldMap.jsx`

### Space Platform Core

职责：

- Space CRUD、访问控制、公开分享 payload。
- NPC / 角色卡管理。
- LLM 配置和敏感 Key 隔离。
- 玩法定义、玩法会话、状态卡、技能包、预设导入预览。

关键路径：

- `apps/api/src/fablespace_api/core/space.py`
- `apps/api/src/fablespace_api/core/gameplay.py`
- `apps/api/src/fablespace_api/core/state_cards.py`
- `apps/api/src/fablespace_api/core/skill_packs.py`
- `apps/api/src/fablespace_api/core/preset_import.py`
- `apps/api/src/fablespace_api/application/services/`
- `apps/api/src/fablespace_api/api/v1/`

原则：

- Owner-only 配置不能暴露给访客。
- AI 候选不能直接改写店主正史。
- 运行时私有桶不进入公开 Space payload。

### Experience Layer

职责：

- 空间发现、入场、空间内部、聊天、玩法、店主管理。
- 按移动端和桌面提供可用界面。
- 区分访客视图、店主视图和公开分享视图。

关键路径：

- `apps/web/app/routes/`
- `apps/web/app/features/`
- `apps/web/app/lib/spaces.ts`
- `apps/web/app/product/`

前端 API 调用边界：

- 新路由优先使用 `apps/web/app/lib/`。
- 产品兼容模块继续使用 `apps/web/app/product/services/`。
- 不在组件里散落复杂协议转换。

网页路由契约：

- 用户可见页面使用中文资源路径：空间集合 `/空间`、空间详情 `/空间/{spacePublicId}`，例如 `/空间/sbprKxgBpl4`；角色作为空间的子资源，例如 `/空间/{spacePublicId}/角色/{characterPublicId}`；寻宝和店主公开页分别使用 `/寻宝/{routePublicId}`、`/店主/{ownerPublicId}`。
- public ID 是无前缀的 11 位 base64url 字符串。它由命名空间化的稳定内部身份经 UTF-8 FNV-1a 64-bit 得到 unsigned 值，再按 8-byte big-endian 做 base64url 编码并去掉 padding；展示名称不进入规范 URL。
- 内部 `space_id` / `character_id` 仍是存储、API 写操作和关联关系的唯一身份，不把中文名称改成主键。
- 旧 `~{11 位 public ID}`、`{展示名}~{20 位十进制公开码}` 与 `/space/*`、`/tavern/*`、`/npc/*` 等英文网页地址只作为只读兼容入口，通过 308 或 SPA replace redirect 规范化到无前缀 public ID 地址，不维护第二套页面。
- `/api/v1/*` 保持英文复数资源名；当前只有 Space 主读取、Space share，以及 ClueHunt 公开读取与访客会话流程兼容内部 ID、旧公开引用和 public ID。其它 Space 子资源读取及所有管理写操作继续使用内部 ID。
- 前端路径生成集中在 `apps/web/app/lib/web-routes.ts`，后端分享/寻宝链接使用同一公开引用算法，禁止在组件和服务里重新拼接页面路径。

### AI Dialogue Layer

职责：

- 构建 Prompt。
- 选择 LLM 客户端。
- 处理对话、世界知识注入、输出规则、token 统计。
- 支持 AI Director、fallback 玩法推进和 dry-run 预览。

关键路径：

- `apps/api/src/fablespace_api/core/llm_clients.py`
- `apps/api/src/fablespace_api/core/prompt_builder.py`
- `apps/api/src/fablespace_api/core/world_info_injector.py`
- `apps/api/src/fablespace_api/core/output_rules.py`
- `apps/api/src/fablespace_api/core/gameplay.py`

原则：

- 店主 API Key 不经过访客前端。
- Prompt dry-run 默认不写历史、不写记忆、不消耗 token。
- AI 返回必须校验后再进入结构化记录。

### Persistence Layer

默认使用数据库存储。

关键路径：

- `apps/api/src/fablespace_api/infrastructure/models.py`
- `apps/api/src/fablespace_api/infrastructure/storage.py`
- `apps/api/src/fablespace_api/infrastructure/mysql_space_store.py`
- `apps/api/src/fablespace_api/infrastructure/migrate_database.py`
- `apps/api/src/fablespace_api/infrastructure/migrate.py`

存储选择：

- 默认：`FABLESPACE_STORAGE_BACKEND=database`
- 设置 `FABLESPACE_DATABASE_URL` / `FABLESPACE_MYSQL_URL`：使用对应 SQLAlchemy URL
- 未设置数据库 URL：使用 `<output-root>/fablespace.sqlite3`
- 显式 `FABLESPACE_STORAGE_BACKEND=json`：使用旧 JSON 兼容存储

主要表：

- `taverns` / `characters` / `world_info` / `llm_configs`
- `visitors` / `chat_messages` / `memory_atoms`
- `gameplay_sessions` / `state cards` 相关字段
- `owner_configs` / `visitor_notes` / `notifications`
- `homes` / `home_visits`
- `relationship_edges` / `visitor_relationship_projections`
- `npc_public_bonds` / `npc_public_bond_queues`

说明：对外 API、领域类和前端均使用 Space 命名；当前数据库物理表仍保留 legacy `taverns` 表名以避免无迁移的破坏性 Schema 改动。

## API 面分组

### 空间与角色

- Space 列表、创建、读取、更新、删除。
- 公开分享 payload。
- 进入空间、密码验证。
- NPC 列表、创建、导入、更新、删除。
- SillyTavern 角色卡解析与导出。
- Space entry view 可返回计算型 `ambient_activity` 摘要，用于展示 NPC 仿真 / 社交记忆带来的空间活性；该字段不是持久 Schema，也不代表店主确认正史。

### 对话与记忆

- 单 NPC chat。
- group chat。
- chat session、export、search。
- memory atoms、visitor notes、state cards。
- output rules、prompt blocks、runtime presets。

### 店主管理

- LLM 配置校验。
- owner default LLM。
- AI draft。
- preset import preview/apply。
- dialogue preview dry-run。
- skill packs。

### 玩法和扩展

- gameplay definitions。
- gameplay sessions。
- GM Layer preview。
- episode export。
- voice greeting preview。
- visual souvenir preview。
- clue hunts、territories、engagement、notifications。

完整路由以 `apps/api/src/fablespace_api/api/v1/` 和 `apps/api/src/fablespace_api/core/web/router.py` 为准。

## 安全边界

- `api_key`、owner LLM 配置、token 统计只对 owner 可见。
- 私密 Space / Home 不进入公开发现。
- 访客只能读取和修改自己范围内的运行时状态。
- StateCard 的 Space-scope 或 `fixed_canon=true` 只能由店主维护。
- 跨 owner 的关系边只代表 source owner 视角，不能强迫 target owner 接受。
- preview / dry-run API 默认不落库，响应必须标明是否 persisted / applied / model_called。

## 前端运行与资源边界

- Docker Compose 部署时，`apps/web/Dockerfile` 构建静态前端，nginx 托管页面并把 `/api`、`/generated` 反向代理到后端服务。
- 非 Docker 一体化运行时，先构建前端，再由 `py -3 -m fablespace_api api` 在默认 `8950` 端口托管页面和兼容 API。
- Vite 本地开发服务器默认把 `/api` 和 `/generated` 代理到 `127.0.0.1:8950`。
- Public URL 资源放 `apps/web/public/assets/`
- Vite import 资源放 `apps/web/app/assets/`
- 图片落盘规则见 [IMAGE_ASSETS_SPEC.md](IMAGE_ASSETS_SPEC.md)

## 架构判断标准

新实现应满足：

- 强化坐标 -> 空间 -> NPC -> 互动 -> 记忆 -> 回访链路。
- 不绕过店主确认。
- 有清晰 API 权限和存储归属。
- 可落库、可回放、可测试。
- 不把传统地图、通用社交、平台计费、战斗系统带回主线。
