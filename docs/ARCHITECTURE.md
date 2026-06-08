# FableMap 系统架构

本文档描述当前空间平台的实现分层。产品主线见 [FABLEMAP_TAVERN_PLATFORM.md](FABLEMAP_TAVERN_PLATFORM.md)，字段约束见 [WORLD_SCHEMA.md](WORLD_SCHEMA.md)。

## 总览

```text
Frontend (React Router / Vite)
  -> API client / product compatibility services
  -> FastAPI routes (/api and /api/v1)
  -> Application services
  -> Core domain modules
  -> SQLAlchemy database or explicit JSON fallback
```

FableMap 同时保留两类 API 面：

- `/api/*`：旧兼容层和本地一体化页面使用。
- `/api/v1/*`：当前原生后端接口面，前端新代码优先使用。

## 代码入口

| 区域 | 主要路径 | 说明 |
|------|----------|------|
| 后端本地一体化入口 | `backend/src/fablemap_api/core/api.py` | `py -3 -m fablemap_api api`，默认端口 `8950`，可托管前端构建。 |
| 后端 ASGI 入口 | `backend/src/fablemap_api/main.py` | Docker / uvicorn 使用。 |
| 旧兼容 Web app | `backend/src/fablemap_api/core/web/app.py` | 组合 `/api/*` 和 `/api/v1/*`。 |
| v1 路由 | `backend/src/fablemap_api/api/v1/` | 当前原生 API 路由。 |
| 应用服务 | `backend/src/fablemap_api/application/services/` | API orchestration，不直接放 UI 逻辑。 |
| 核心领域 | `backend/src/fablemap_api/core/` | Tavern、玩法、记忆、LLM、状态卡等核心规则。 |
| 持久化 | `backend/src/fablemap_api/infrastructure/` | SQLAlchemy models、stores、迁移工具。 |
| 前端入口 | `frontend/app/` | React Router routes、features、lib。 |
| 产品兼容模块 | `frontend/app/product/` | 历史产品模块和兼容服务。 |

## 分层职责

### Reality Kernel

职责：

- 接收坐标、半径、定位等地理输入。
- 拉取或读取 OSM / Overpass 风格数据。
- 为 Tavern 提供真实地图锚点。

原则：AI 不创造坐标，不替代真实地理骨架。

关键路径：

- `backend/src/fablemap_api/core/overpass.py`
- `backend/src/fablemap_api/core/nearby.py`
- `frontend/app/product/WorldMap.jsx`

### Tavern Platform Core

职责：

- Tavern CRUD、访问控制、公开分享 payload。
- NPC / 角色卡管理。
- LLM 配置和敏感 Key 隔离。
- 玩法定义、玩法会话、状态卡、技能包、预设导入预览。

关键路径：

- `backend/src/fablemap_api/core/tavern.py`
- `backend/src/fablemap_api/core/gameplay.py`
- `backend/src/fablemap_api/core/state_cards.py`
- `backend/src/fablemap_api/core/skill_packs.py`
- `backend/src/fablemap_api/core/preset_import.py`
- `backend/src/fablemap_api/application/services/`
- `backend/src/fablemap_api/api/v1/`

原则：

- Owner-only 配置不能暴露给访客。
- AI 候选不能直接改写店主正史。
- 运行时私有桶不进入公开 Tavern payload。

### Experience Layer

职责：

- 空间发现、入场、空间内部、聊天、玩法、店主管理。
- 按移动端和桌面提供可用界面。
- 区分访客视图、店主视图和公开分享视图。

关键路径：

- `frontend/app/routes/`
- `frontend/app/features/`
- `frontend/app/lib/taverns.ts`
- `frontend/app/product/`

前端 API 调用边界：

- 新路由优先使用 `frontend/app/lib/`。
- 产品兼容模块继续使用 `frontend/app/product/services/`。
- 不在组件里散落复杂协议转换。

### AI Dialogue Layer

职责：

- 构建 Prompt。
- 选择 LLM 客户端。
- 处理对话、世界知识注入、输出规则、token 统计。
- 支持 AI Director、fallback 玩法推进和 dry-run 预览。

关键路径：

- `backend/src/fablemap_api/core/llm_clients.py`
- `backend/src/fablemap_api/core/prompt_builder.py`
- `backend/src/fablemap_api/core/world_info_injector.py`
- `backend/src/fablemap_api/core/output_rules.py`
- `backend/src/fablemap_api/core/gameplay.py`

原则：

- 店主 API Key 不经过访客前端。
- Prompt dry-run 默认不写历史、不写记忆、不消耗 token。
- AI 返回必须校验后再进入结构化记录。

### Persistence Layer

默认使用数据库存储。

关键路径：

- `backend/src/fablemap_api/infrastructure/models.py`
- `backend/src/fablemap_api/infrastructure/storage.py`
- `backend/src/fablemap_api/infrastructure/mysql_store.py`
- `backend/src/fablemap_api/infrastructure/migrate_database.py`
- `backend/src/fablemap_api/infrastructure/migrate.py`

存储选择：

- 默认：`FABLEMAP_STORAGE_BACKEND=database`
- 设置 `FABLEMAP_DATABASE_URL` / `FABLEMAP_MYSQL_URL`：使用对应 SQLAlchemy URL
- 未设置数据库 URL：使用 `<output-root>/fablemap.sqlite3`
- 显式 `FABLEMAP_STORAGE_BACKEND=json`：使用旧 JSON 兼容存储

主要表：

- `taverns` / `characters` / `world_info` / `llm_configs`
- `visitors` / `chat_messages` / `memory_atoms`
- `gameplay_sessions` / `state cards` 相关字段
- `owner_configs` / `visitor_notes` / `notifications`
- `homes` / `home_visits`
- `relationship_edges` / `visitor_relationship_projections`
- `npc_public_bonds` / `npc_public_bond_queues`

## API 面分组

### 空间与角色

- Tavern 列表、创建、读取、更新、删除。
- 公开分享 payload。
- 进入空间、密码验证。
- NPC 列表、创建、导入、更新、删除。
- SillyTavern 角色卡解析与导出。

### 对话与记忆

- 单 NPC chat。
- group chat。
- chat session、export、search。
- memory atoms、visitor notes、state cards。
- output rules、prompt blocks、runtime presets。

### 店主管理

- LLM 配置测试。
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

完整路由以 `backend/src/fablemap_api/api/v1/` 和 `backend/src/fablemap_api/core/web/router.py` 为准。

## 安全边界

- `api_key`、owner LLM 配置、token 统计只对 owner 可见。
- 私密 Tavern / Home 不进入公开发现。
- 访客只能读取和修改自己范围内的运行时状态。
- StateCard 的 Tavern-scope 或 `fixed_canon=true` 只能由店主维护。
- 跨 owner 的关系边只代表 source owner 视角，不能强迫 target owner 接受。
- preview / dry-run API 默认不落库，响应必须标明是否 persisted / applied / model_called。

## 前端构建与资源

- 前端构建：`npm --prefix .\frontend run build`
- 类型检查：`npm --prefix .\frontend run typecheck`
- Vite dev server 默认把 `/api` 和 `/generated` 代理到 `127.0.0.1:8950`
- Public URL 资源放 `frontend/public/assets/`
- Vite import 资源放 `frontend/app/assets/`
- 图片落盘规则见 [IMAGE_ASSETS_SPEC.md](IMAGE_ASSETS_SPEC.md)

## 架构判断标准

新实现应满足：

- 强化坐标 -> 空间 -> NPC -> 互动 -> 记忆 -> 回访链路。
- 不绕过店主确认。
- 有清晰 API 权限和存储归属。
- 可落库、可回放、可测试。
- 不把传统地图、通用社交、平台计费、战斗系统带回主线。
