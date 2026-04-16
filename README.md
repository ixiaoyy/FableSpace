# FableMap

> Turn real places into cyber taverns.

## 项目简介

FableMap 是一个**赛博酒馆 UGC 平台**。

地图上的每个区域都可以成为一个虚拟酒馆，用户可以开店、配置 AI NPC、接待访客。

**一句话定位**：每个人都可以在真实地图上开一间自己的赛博酒馆。

## 核心理念

- **真实地图是空间锚点**：酒馆必须坐落在真实地图上，访客可以在现实中回访虚拟酒馆所在的位置
- **主人主权**：酒馆的内容、角色、氛围、访问规则完全由店主决定
- **AI 即灵魂**：酒馆内的 NPC 由 AI 驱动，能和访客自然对话
- **Token 即燃料**：酒馆的运营燃料是 LLM token，由店主自行承担
- **开源可移植**：角色卡格式兼容 SillyTavern，数据可导出，不锁定用户

## 当前产品方向

当前唯一主链路：

> **坐标输入 / 定位 → 真实底图 → 浏览酒馆 → 进入酒馆 → 配置 AI NPC → 对话互动 → 写回记忆 → 回访反馈**

两种用户角色：

- **探索者 (Explorer)**：打开地图 → 浏览酒馆 → 进入感兴趣的酒馆 → 和 AI NPC 聊天
- **店主 (Tavernkeeper)**：打开地图 → 选择地点 → 创建酒馆 → 添加角色 → 配置 LLM → 开门迎客

## 核心概念映射

FableMap 赛博酒馆版使用全新的概念体系：

| 旧概念 | 新概念（赛博酒馆） |
|--------|------------------|
| Place / POI | Tavern（酒馆） |
| Faction | TavernCharacter（酒馆角色） |
| World Info | WorldInfoEntry（世界知识条目） |
| World | TavernScene（酒馆场景） |
| Player State | VisitorState（访客状态） |
| Fantasy Name | Tavern Name（自定义） |

## 当前原型状态

仓库当前已具备赛博酒馆平台的最小可运行闭环：

- 可通过 `python -m fablemap api` 启动后端
- 地图展示酒馆标记（基于现有 WorldMap.jsx）
- 酒馆详情面板 + ChatPanel 对话界面
- `/api/taverns/*` 酒馆管理（已实现基于网格的 CRUD）
- `/api/chat` 基础对话端点
- 写回机制（chat history writeback）
- 角色引擎（characterEngine.js）基础结构

当前已存在但**不再作为主线继续扩写**的部分：

- [`frontend/src/WorldMap.jsx`](frontend/src/WorldMap.jsx) — 地图渲染（待整合酒馆标记）
- [`frontend/src/worldMap/renderers.js`](frontend/src/worldMap/renderers.js)
- [`frontend/src/worldMap/geometry.js`](frontend/src/worldMap/geometry.js)
- [`frontend/src/mapAssets/manifest.js`](frontend/src/mapAssets/manifest.js)
- [`frontend/src/mapAssets/iconMapping.js`](frontend/src/mapAssets/iconMapping.js)

## 快速开始

```
# 安装依赖
pip install -r requirements.txt
cd frontend && npm install && npm run build

# 启动后端
python -m fablemap api

# 访问
http://127.0.0.1:8950/
```

## 核心模块

### 后端 (`fablemap/`)

| 模块 | 用途 |
|------|------|
| `tavern.py` | 酒馆核心: Tavern CRUD, 状态管理 |
| `llm_clients.py` | LLM 客户端工厂: OpenAI / Claude / Ollama |
| `char_card_parser.py` | SillyTavern 角色卡解析 (JSON / PNG tEXt) |
| `world_info_injector.py` | 世界知识注入器 (关键词匹配) |
| `api_service.py` | API 逻辑 |
| `writeback.py` | 状态持久化 |
| `web/router.py` | API 路由: `/api/taverns/*`, `/api/chat` |

### 前端 (`frontend/src/`)

| 模块 | 用途 |
|------|------|
| `services/tavernService.js` | 酒馆 CRUD, LLM 调用 |
| `services/characterEngine.js` | 角色数据结构 |
| `services/placeProtocol.js` | Place 协议 |
| `services/apiClient.js` | API 客户端 |
| `components/TavernMapPanel.jsx` | 酒馆地图面板 |
| `components/TavernEntryPanel.jsx` | 酒馆入场（密码验证等） |
| `components/TavernInterior.jsx` | 酒馆内部（角色列表 + ChatPanel） |
| `components/ChatPanel.jsx` | 对话面板 |
| `components/TavernOwnerPanel.jsx` | 店主管理面板 |
| `hooks/useTavernSession.js` | 酒馆会话管理 |
| `hooks/useTavernChat.js` | 酒馆对话 |

## 核心 API 端点

| 方法 | 端点 | 描述 |
|------|------|------|
| GET | `/api/taverns` | 列出附近/全部酒馆 |
| POST | `/api/taverns` | 创建酒馆 |
| GET | `/api/taverns/{id}` | 获取酒馆详情 |
| PUT | `/api/taverns/{id}` | 更新酒馆 |
| DELETE | `/api/taverns/{id}` | 删除酒馆 |
| GET | `/api/taverns/{id}/characters` | 列出酒馆角色 |
| POST | `/api/taverns/{id}/characters` | 添加角色 |
| PUT | `/api/taverns/{id}/characters/{cid}` | 更新角色 |
| DELETE | `/api/taverns/{id}/characters/{cid}` | 删除角色 |
| POST | `/api/taverns/{id}/chat` | 发送消息并获取 AI 回复 |
| GET | `/api/taverns/{id}/chat` | 获取对话历史 |
| POST | `/api/taverns/{id}/enter` | 进入酒馆（验证密码） |

## 文档导航

- [产品概述](docs/PRODUCT_BRIEF.md) — 一句话定位、用户角色、核心场景
- [赛博酒馆平台设计](docs/FABLEMAP_TAVERN_PLATFORM.md) — 完整产品设计文档（主线）
- [系统架构](docs/ARCHITECTURE.md) — 系统分层、模块边界、API 端点
- [当前任务清单](docs/CURRENT_TASKS.md) — 实施阶段与优先级
- [明确不做清单](docs/WHAT_NOT_TO_BUILD.md) — 边界约束
- [当前任务清单](docs/CURRENT_TASKS.md) — 实施阶段与优先级
- [文档索引](docs/INDEX.md) — 文档总览

## 一句话总结

FableMap 是一个**赛博酒馆 UGC 平台**：每个人都可以在真实地图上开一间自己的赛博酒馆，配置 AI NPC，接待访客。
