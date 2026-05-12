# FableMap

> Turn real places into cyber taverns.

## 项目简介

FableMap 是一个**空间 UGC 平台**。

地图上的每个区域都可以成为一个虚拟空间，用户可以开店、配置 AI NPC、接待访客。

**一句话定位**：每个人都可以在真实地图上开一间自己的空间。

## 核心理念

- **真实地图是空间锚点**：空间必须坐落在真实地图上，访客可以在现实中回访虚拟空间所在的位置
- **主人主权**：空间的内容、角色、氛围、访问规则最终由店主确认和决定
- **AI 即灵魂**：空间内的 NPC 由 AI 驱动，能和访客自然对话；平台可辅助生成未发布的 AI 草稿，但不能绕过店主确认自动上线
- **Token 即燃料**：空间的运营燃料是 LLM token，由店主自行承担
- **开源可移植**：角色卡格式兼容 SillyTavern，数据可导出，不锁定用户

## 当前产品方向

当前唯一主链路：

> **坐标输入 / 定位 → 真实底图 → 浏览空间 → 进入空间 → 配置 AI NPC → 对话互动 → 写回记忆 → 回访反馈**

两种用户角色：

- **探索者 (Explorer)**：打开地图 → 浏览空间 → 进入感兴趣的空间 → 和 AI NPC 聊天 / 调查线索 / 接委托做轻文字任务
- **店主 (Tavernkeeper)**：打开地图 → 选择地点 → 创建空间 → 添加角色或审核 AI 草稿 → 配置 LLM → 开门迎客

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

仓库提供两服务 Docker Compose 配置：`backend` 运行 FastAPI v1 API，`frontend` 用 nginx 托管 React Router 静态构建并代理 `/api` 到后端。

```powershell
# 可选：复制环境变量模板并按需调整端口 / 数据库 URL
Copy-Item .env.example .env

# 构建并启动
docker compose up --build

# 访问
http://127.0.0.1:3000/
http://127.0.0.1:8000/api/v1/health
```

默认情况下后端使用真实数据库存储：未设置数据库 URL 时会在后端输出目录创建 `fablemap.sqlite3`；生产部署优先设置 `FABLEMAP_DATABASE_URL`（`FABLEMAP_MYSQL_URL` 仅作为旧别名）。如需本地兼容旧文件存储，可显式设置 `FABLEMAP_STORAGE_BACKEND=json`。店主 LLM API Key 仍应通过 FableMap 的店主配置写入，不要放入共享 `.env`。

### 旧文件数据迁移到 MySQL

下一阶段正式运行时存储目标是 MySQL。旧 `.fablemap-api` 下的 JSON/file runtime 数据只作为迁移输入，不继续作为生产权威存储：

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

FableMap 是一个**空间 UGC 平台**：每个人都可以在真实地图上开一间自己的空间，配置 AI NPC，接待访客。
