# FableMap

> Turn real places into cyber taverns.

## 项目简介

FableMap 是一个**基于地理位置的多类型 AI 空间游玩平台**。

它不是纯地图 App，也不是单一聊天产品。FableMap 把现实世界折射成一层“镜像面”：每个空间都绑定一个真实地理位置背景，店主可以配置不同类型的 AI 空间，探索者进入其中游玩、对话、探索、创作、回访，并逐渐找到属于自己的私密角落。

**一句话定位**：FableMap 是世界的镜像面；基于真实地理位置，进入不同类型的 AI 空间，找到属于你的私密空间。

## 核心理念

- **地理位置是空间锚点**：空间基于真实地理位置组织，但不要求做成复杂纯地图产品；地图/坐标是入口与氛围来源，不是主玩法本身。
- **探索者来游玩**：探索者不是来创建控件的，而是来发现空间、进入空间、被 NPC 引导，并完成陪伴、探索、任务、创作或回访体验。
- **空间类型多样**：不同人有不同想法和喜好；空间不只等于聊天房间，可以是陪伴空间、线索调查、小委托、创作工坊、仪式空间或展示空间。
- **店主主权**：空间内容、NPC、氛围、玩法形式和访问规则由店主决定；AI 草稿只能作为未发布、可编辑、需确认的辅助。
- **NPC 是空间主持者**：NPC 不只是聊天机器人，也可以是接待者、引导者、解谜主持人、委托发布者、记录者或空间记忆承载者。
- **私密回访**：平台不追求无边界社交；核心是探索者与空间 / NPC 的长期关系、记忆沉淀和回访归属。

## 当前产品方向

当前 P0 主链路：

> **当前位置 / 城市 / 地点 → 发现附近镜像空间 → 选择感兴趣类型 → 进入空间 → NPC 引导游玩 → 对话 / 选择 / 任务推进 → 记忆沉淀 → 回访私密空间**

三种产品角色：

- **探索者 (Explorer)**：发现基于地理位置的不同空间 → 进入感兴趣的空间 → 跟随 NPC 引导游玩 / 对话 / 探索 / 回访。
- **店主 (Tavernkeeper)**：创建并维护空间体验 → 配置 NPC、玩法形式、访问规则和 LLM → 决定空间是否公开给探索者。
- **NPC**：空间内的 AI 角色与体验主持者，承担接待、引导、陪伴、解谜、委托、记录和记忆承载等职责。

## 核心概念映射

FableMap 空间版使用全新的概念体系：

| 旧概念 | 新概念（空间） |
|--------|------------------|
| Place / POI | Tavern（空间） |
| Faction | TavernCharacter（空间角色） |
| World Info | WorldInfoEntry（世界知识条目） |
| World | TavernScene（空间场景） |
| Player State | VisitorState（访客状态） |
| Fantasy Name | Tavern Name（自定义） |

## 当前原型状态

仓库当前已具备空间平台的最小可运行闭环：

- 可通过设置 `PYTHONPATH=backend/src` 后执行 `py -3 -m fablemap_api api` 启动后端
- 地图展示空间标记（基于现有 WorldMap.jsx）
- 空间详情面板 + ChatPanel 对话界面
- `/api/taverns/*` 空间管理（已实现基于网格的 CRUD）
- `/api/chat` 基础对话端点
- 写回机制（chat history writeback）
- 角色引擎（characterEngine.js）基础结构
- 创建向导支持一键套用空间模板、系统预设 NPC、开门检查清单；角色编辑器内提供可补空/覆盖的 NPC 性格模板、推荐筛选与访客第一印象预览
- 访客侧提供“不会说什么就点一下”的快捷句、玩法提示和轻文字游戏模板（线索调查 / 社区小任务 / 冒险工会），让聊天空间也能扩展为选择式文字互动
- 冒险工会玩法支持本地任务板、发委托、接委托、提交完成、声望身份奖励和空间差异化待遇
- 店主可用轻配置表单添加结构化空间玩法；访客可开始 / 继续 / 选择 / 自由输入 / 完成 / 放弃一局玩法，AI 可用时由 AI Director 主持，无 AI 时使用可回放随机事件 fallback
- 4 个默认公益空间已内置贴合各自主题的 published 玩法，无需外部 API Key 也可体验

当前已存在但**不再作为主线继续扩写**的部分：

- [`frontend/app/product/WorldMap.jsx`](frontend/app/product/WorldMap.jsx) — 地图渲染（待整合空间标记）
- [`frontend/app/product/worldMap/renderers.js`](frontend/app/product/worldMap/renderers.js)
- [`frontend/app/product/worldMap/geometry.js`](frontend/app/product/worldMap/geometry.js)
- [`frontend/app/product/mapAssets/manifest.js`](frontend/app/product/mapAssets/manifest.js)
- [`frontend/app/product/mapAssets/iconMapping.js`](frontend/app/product/mapAssets/iconMapping.js)

## 快速开始

```
# 安装依赖
pip install -r requirements.txt
cd frontend && npm install && npm run build

# 启动后端（PowerShell）
$env:PYTHONPATH = "$PWD\backend\src"
py -3 -m fablemap_api api

# 访问
http://127.0.0.1:8950/
```

## Docker 部署 / 本地容器运行

仓库提供两服务 Docker Compose 配置：`backend` 运行 FastAPI v1 API，`frontend` 用 nginx 托管 React Router 静态构建并代理 `/api` 到后端；数据库连接从 `.env` 的 `FABLEMAP_DATABASE_URL` 读取。

```powershell
# 可选：复制环境变量模板并按需调整端口 / 数据库 URL
Copy-Item .env.example .env

# 构建并启动
docker compose up --build

# 访问
http://127.0.0.1:3000/
http://127.0.0.1:8000/api/v1/health
```

Docker Compose 不再硬编码数据库，也不内置启动 MySQL；它会把 `.env` 中的 `FABLEMAP_DATABASE_URL` 原样传给后端。生产 / 联调环境请在 `.env` 中设置完整 SQLAlchemy URL，例如 `mysql+pymysql://user:password@host:3306/fablemap?charset=utf8mb4`。后端生成文件仍保存在 Docker volume `fablemap_data`。

直接在宿主机运行 Python API 入口（如 `py -3 -m fablemap_api api` 或 `uvicorn fablemap_api.main:app`）时，后端会自动读取项目根目录 `.env`；只有环境变量和 `.env` 都没有数据库 URL 时，才会在后端输出目录创建 `fablemap.sqlite3`。

生产部署优先设置 `FABLEMAP_DATABASE_URL`（`FABLEMAP_MYSQL_URL` 仅作为旧别名）。如需本地兼容旧文件存储，可显式设置 `FABLEMAP_STORAGE_BACKEND=json`。店主 LLM API Key 仍应通过 FableMap 的店主配置写入，不要放入共享 `.env`。

### 旧文件数据迁移到 MySQL

下一阶段正式运行时存储目标是 MySQL。旧 `.fablemap-api` 下的 JSON/file runtime 数据只作为迁移输入，不继续作为生产权威存储：

如果当前已有本地 SQLite 数据库（默认路径 `.fablemap-api/fablemap.sqlite3`），优先用 `.env` 中的 `FABLEMAP_DATABASE_URL` 做非破坏性迁移：

```powershell
$env:PYTHONPATH = "$PWD\backend\src"
py -3 -m fablemap_api.infrastructure.migrate_database
```

该命令按主键 upsert 到目标数据库，不删除目标库已有的额外记录，也不会删除本地 SQLite 文件。

如需迁移更旧的 JSON/file runtime 数据，可使用：

```powershell
$env:PYTHONPATH = "$PWD\backend\src"
$env:FABLEMAP_DATABASE_URL = "mysql+pymysql://user:pass@localhost:3306/fablemap"
py -3 -m fablemap_api.infrastructure.migrate --output-root .fablemap-api
```

迁移范围：`taverns/`、`taverns_keyvault.json`、`chat_history/`、visitor state、memory atoms、gameplay sessions、state cards、`owner_configs.json`、`visitor_notes.json`、`homes/`、`writeback/writeback-state.json`。不会迁移 Overpass/cache、导出包、生成图片、前端静态资源或测试 fixtures。

## 核心模块

### 后端 (`backend/src/fablemap_api/core/`)

| 模块 | 用途 |
|------|------|
| `tavern.py` | 空间核心: Tavern CRUD, 状态管理 |
| `gameplay.py` | 空间玩法模型、AI Director 与 fallback 推进 |
| `skill_packs.py` | 店主显式启用的 NPC 能力包（MVP: 环境传闻） |
| `llm_clients.py` | LLM 客户端工厂: OpenAI / Claude / Ollama |
| `char_card_parser.py` | SillyTavern 角色卡解析 (JSON / PNG tEXt) |
| `world_info_injector.py` | 世界知识注入器 (关键词匹配) |
| `api_service.py` | API 逻辑 |
| `writeback.py` | 状态持久化 |
| `web/router.py` | API 路由: `/api/taverns/*`, `/api/chat` |

### 前端 (`frontend/app/product/`)

| 模块 | 用途 |
|------|------|
| `services/tavernService.js` | 空间 CRUD, LLM 调用 |
| `GameplayManager.jsx` | 店主玩法管理 |
| `TavernGameplayLauncher.jsx` | 访客玩法入口 |
| `GameplaySessionPanel.jsx` | 访客玩法会话面板 |
| `services/characterEngine.js` | 角色数据结构 |
| `services/placeProtocol.js` | Place 协议 |
| `services/apiClient.js` | API 客户端 |
| `WorldMap.jsx` | 空间地图面板 |
| `TavernEntryPanel.jsx` | 空间入场（密码验证等） |
| `TavernInterior.jsx` | 空间内部（角色列表 + ChatPanel） |
| `ChatPanel.jsx` | 对话面板 |
| `TavernOwnerPanel.jsx` | 店主管理面板 |
| `SkillPackManager.jsx` | 店主技能包管理面板 |
| `hooks/useTavernSession.js` | 空间会话管理 |
| `hooks/useTavernChat.js` | 空间对话 |

## 核心 API 端点

| 方法 | 端点 | 描述 |
|------|------|------|
| GET | `/api/taverns` | 列出附近/全部空间 |
| POST | `/api/taverns` | 创建空间 |
| GET | `/api/taverns/{id}` | 获取空间详情 |
| PUT | `/api/taverns/{id}` | 更新空间 |
| DELETE | `/api/taverns/{id}` | 删除空间 |
| GET | `/api/taverns/{id}/characters` | 列出空间角色 |
| POST | `/api/taverns/{id}/characters` | 添加角色 |
| PUT | `/api/taverns/{id}/characters/{cid}` | 更新角色 |
| DELETE | `/api/taverns/{id}/characters/{cid}` | 删除角色 |
| POST | `/api/v1/taverns/{id}/home-members` | Home 添加家庭成员（默认沉默边界） |
| POST | `/api/v1/taverns/{id}/relationships` | 发起 Home 成员到目标地点的受控关系（学生-学校只是 relation_type 之一） |
| POST | `/api/v1/taverns/{id}/relationships/school-enrollments` | 发起 Home 成员入学关系（兼容快捷入口） |
| PUT | `/api/v1/taverns/{id}/relationships/{relationship_id}` | 目标地点 owner 审批关系 |
| GET | `/api/v1/taverns/{id}/school-members` | 学校成员摘要 |
| POST | `/api/taverns/{id}/chat` | 发送消息并获取 AI 回复 |
| GET | `/api/taverns/{id}/chat` | 获取对话历史 |
| POST | `/api/taverns/{id}/enter` | 进入空间（验证密码） |
| GET | `/api/taverns/{id}/gameplays` | 获取当前用户可见玩法 |
| PUT | `/api/taverns/{id}/gameplays` | 店主保存玩法定义 |
| GET | `/api/taverns/{id}/gameplay-sessions` | 列出玩法会话 |
| POST | `/api/taverns/{id}/gameplay-sessions` | 开始或恢复玩法 |
| POST | `/api/taverns/{id}/gameplay-sessions/{sid}/advance` | 推进玩法 |
| POST | `/api/taverns/{id}/gameplay-sessions/{sid}/abandon` | 放弃玩法 |
| GET | `/api/v1/taverns/{id}/skill-packs` | 获取空间技能包元数据与启用状态 |
| PUT | `/api/v1/taverns/{id}/skill-packs` | 店主保存技能包启用状态 |
| POST | `/api/v1/taverns/{id}/preset-import/preview` | 店主预览社区预设导入风险；不应用、不保存 |
| POST | `/api/v1/taverns/{id}/gm-layer/preview` | 预览 GM Layer 结构化任务/资源/冲突/事件候选；不应用、不保存 |
| POST | `/api/v1/taverns/{id}/episodes/export` | 导出指定访客会话的 Markdown/JSON 剧集草稿；不调用 LLM、不保存 |
| POST | `/api/v1/taverns/{id}/voice-greeting/preview` | 预览 NPC 开场白和 TTS 请求参数；不合成音频、不保存 |
| POST | `/api/v1/taverns/{id}/visual-souvenir/preview` | 预览共享瞬间纪念图提示词；不生成图片、不保存 |
| GET | `/api/v1/taverns/{id}/state-cards` | 列出当前用户可见的连续性状态卡 |
| POST | `/api/v1/taverns/{id}/state-cards` | 创建手动状态卡或候选卡 |
| PUT | `/api/v1/taverns/{id}/state-cards/{card_id}/decision` | 确认、忽略或替换状态卡 |

## 文档导航

- [产品概述](docs/PRODUCT_BRIEF.md) — 一句话定位、用户角色、核心场景
- [空间平台设计](docs/FABLEMAP_TAVERN_PLATFORM.md) — 完整产品设计文档（主线）
- [系统架构](docs/ARCHITECTURE.md) — 系统分层、模块边界、API 端点
- [世界数据结构](docs/WORLD_SCHEMA.md) — Tavern / TavernCharacter / WorldInfoEntry / VisitorState 等约束
- [图像资源规范](docs/IMAGE_ASSETS_SPEC.md) — 图片资产落盘、prompt sidecar 与验证规则
- [AI 协作协议](docs/AI参与开发协议.md) — Trellis 任务、认领、验证和变更说明规则
- [明确不做清单](docs/WHAT_NOT_TO_BUILD.md) — 边界约束
- [文档索引](docs/INDEX.md) — 文档总览

当前任务、认领和验收记录统一进入 `.trellis/tasks/`；旧共享任务清单、claim/change 目录和一次性规划文档已从主线文档中移除。

## 一句话总结

FableMap 是一个**基于地理位置的多类型 AI 空间游玩平台**：在世界的镜像面，探索者进入不同类型的 AI 空间，与 NPC 游玩、留下记忆，并找到属于自己的私密角落。
