# FableMap 全项目大型设计：赛博酒馆产品化架构 v0.1

> 任务：`.trellis/tasks/04-22-refactor-project/`
> 日期：2026-04-22
> 状态：设计基线 / 下一轮实施输入
> 设计目标：把当前“可运行大 demo + 迁移中 enterprise 外壳”收束成可持续迭代的前后端分离产品架构，并给后续“全量等价迁移 + 删除 current core”提供明确判定标准。

---

## 1. 一句话决策

FableMap 下一阶段应进入 **“产品化架构收束 + native v1 全量接管 + compatibility core 可删除化”**：

- `/api/v1` 成为唯一新增与最终公开 API 面。
- `backend/src/fablemap_api/api/v1 + contracts + application + domain + repositories + infrastructure` 成为目标后端架构。
- `frontend/app/routes + frontend/app/features + frontend/app/lib + frontend/app/ui` 成为目标前端架构。
- `backend/src/fablemap_api/core/` 与 `frontend/app/product/` 只作为“已搬入仓库内的行为矿区 / 回归来源 / 临时 provider”，不得再作为新架构入口扩写。
- 删除 compatibility core 的前提不是“文件搬走了”，而是 **行为、数据、测试、前端调用与运维入口全部被 native 架构接管**。

---

## 2. 不可破坏的产品契约

本设计继承 `README.md`、`docs/FABLEMAP_TAVERN_PLATFORM.md`、`docs/ARCHITECTURE.md`、`docs/WORLD_SCHEMA.md`、`docs/WHAT_NOT_TO_BUILD.md` 与 `AGENTS.md` 的硬边界。

### 2.1 主链路

```text
坐标输入 / 定位 → 真实底图 → 浏览酒馆 → 进入酒馆 → 配置 AI NPC → 对话互动 → 写回记忆 → 回访反馈
```

所有架构变更必须服务这条链路。旧世界 / POI / 扰动 / ghost / 自绘地图玩法只能作为历史兼容或素材来源，不能重新变成产品主轴。

### 2.2 核心实体

目标架构必须保持以下实体语义不漂移：

- `Tavern`：真实坐标锚定的酒馆。
- `TavernCharacter`：酒馆内 AI NPC，保持 SillyTavern 角色卡兼容。
- `WorldInfoEntry`：店主配置的世界知识 / 关键词注入条目。
- `LLMConfig`：店主自己的模型与 API Key 配置，敏感字段仅 owner 可见。
- `VisitorState`：访客与单间酒馆的关系状态。
- `ChatMessage`：可落库、可回放、可测试的对话消息。
- `MemoryAtom`：结构化记忆；私有访客记忆不默认对店主开放。
- `GameplayDefinition / GameplaySession`：轻文本玩法定义与运行态；不引入战斗、等级、装备、排行榜。

### 2.3 明确不做

架构不得顺手引入：

- 平台自动生成酒馆 / NPC / 酒馆故事。
- 平台级 Token 充值、结算、抽成系统。
- 无真实坐标锚点的自由空间。
- 访客间社交网络。
- 传统地图 App 能力，如路线规划、商家评分、实时导航。
- RPG 战斗 / 等级 / 装备 / 竞技排行。

---

## 3. 当前仓库事实基线

### 3.1 后端现状

目标包已存在：

```text
backend/src/fablemap_api/
├── main.py                  # native FastAPI app factory
├── api/v1/                  # native APIRouter，已按 tavern/character/chat/runtime 等 context 拆分
├── contracts/               # Pydantic request/response contracts，已按 native v1 domain 拆分
├── application/             # TavernApplicationService facade + services/* use-case mixins
├── domain/                  # 已抽出的纯策略：tavern/world_info/memory/group/expression/package
├── infrastructure/          # settings + MySQL/SQLAlchemy storage work
├── repositories/            # 目标接口层，目前基本为空
└── core/                    # 迁移进来的 current product core / compatibility behavior source
```

已经完成的 native v1 接管切片：

- tavern 主链路：发现 / 创建 / 详情 / 更新 / 删除 / 入场 / 角色 / chat / memories / gameplays。
- owner config：WorldInfo test、output rules、prompt blocks、runtime presets。
- package / visitor / character import / gameplay abandon。
- memory atoms CRUD。
- runtime features：LLM probe、group chat、talkativeness、voice、TTS/STT。
- character assets：expressions、expression infer、sprites、character card parse/export。
- global WorldInfo CRUD/test。
- tokenizer + memory utilities。

仍然存在的 compatibility 集中点：

- `backend/src/fablemap_api/core/web/router.py`：兼容 `/api/*` 大路由文件，仍包含大量端点。
- `backend/src/fablemap_api/core/web/service.py`：兼容 WebService，大量行为仍在其中。
- `backend/src/fablemap_api/core/`：大量可复用 domain/provider 模块，也混有历史世界/地图/叙事方向模块。
- `backend/src/fablemap_api/application/taverns.py`：native application facade 已收束为共享 helper 与 mixin 组合；bounded context 实现在 `application/services/*`，后续应避免重新堆回 facade。
- `backend/src/fablemap_api/api/v1/`：native v1 endpoints 已按 taverns / characters / chat / runtime / memories / owner_config / worldinfo / packages / utilities / gameplay 拆分；后续新增 endpoint 应进入对应 module。
- `backend/src/fablemap_api/infrastructure/*`：MySQL 存储已出现，但依赖与生产化契约需要收束。

### 3.2 前端现状

目标 React Router app 已存在：

```text
frontend/app/
├── routes/                  # native home / discover / create / tavern route modules
├── lib/                     # typed native /api/v1 clients
├── ui/                      # owned Radix/shadcn-style primitives
├── shell/                   # product shell
└── product/                 # 迁移进来的旧产品 UI / services / hooks / map modules
```

已经完成的目标方向：

- React Router Framework Mode + Vite + TypeScript 检查链路。
- Tailwind CSS + Radix/shadcn-style owned UI primitives。
- `frontend/app/lib/taverns.ts` 已承接一批 `/api/v1` typed clients。
- native route modules 已能跑主链路的基础体验。

仍然存在的 compatibility 集中点：

- `frontend/app/product/TavernOwnerPanel.jsx`、`TavernChatRoom.jsx`、`App.jsx`、`styles.css` 等仍是大文件。
- `frontend/app/product/services/tavernService.js` 仍是旧 `/api/*` 产品服务门面。
- `frontend/app/product/worldMap/*` 与 WorldStage 系列仍保留历史地图/世界舞台语义。
- native routes 与 product parity UI 并存，最终需要按 feature 逐步接管，不能长期双轨无边界扩张。

### 3.3 数据 / 存储现状

当前存在两条存储路径：

- JSON 文件存储：仍是开发默认与大量测试基线。
- MySQL / SQLAlchemy 存储：已新增 `Database`、models、migration、`MySQLTavernStore` 与测试。

关键风险：

- MySQL 文档提到 `sqlalchemy`、`pymysql`、`cryptography`，但顶层 `requirements.txt` 当前仍只声明 FastAPI / uvicorn / httpx / multipart / pytest。下一步必须明确这些依赖是正式依赖、optional extra，还是实验性路径。
- `MySQLTavernStore` 当前应被纳入 repository/infrastructure contract，而不是让 application 知道具体存储实现。

---

## 4. 目标架构总览

### 4.1 系统边界

```text
┌─────────────────────────────────────────────────────────────┐
│ Frontend: React Router / Vite / TS                          │
│ ├── routes: 页面路由 + loader/action 入口                    │
│ ├── features: taverns / characters / chat / owner / memory   │
│ ├── lib: typed API client + contracts                        │
│ └── ui: owned primitives                                     │
└───────────────────────┬─────────────────────────────────────┘
                        │ /api/v1 only
┌───────────────────────▼─────────────────────────────────────┐
│ Backend API: FastAPI APIRouter modules                       │
│ ├── system / taverns / characters / chat / memory / runtime  │
│ ├── packages / worldinfo / gameplay / utilities              │
│ └── request parsing + identity extraction only               │
└───────────────────────┬─────────────────────────────────────┘
                        │ Pydantic contracts
┌───────────────────────▼─────────────────────────────────────┐
│ Application: bounded use cases                               │
│ ├── TavernUseCases / CharacterUseCases / ChatUseCases        │
│ ├── OwnerConfigUseCases / MemoryUseCases / GameplayUseCases  │
│ ├── RuntimeUseCases / PackageUseCases / UtilityUseCases      │
│ └── HTTP errors translated here, not in domain               │
└───────────────────────┬─────────────────────────────────────┘
                        │ domain entities + repository ports
┌───────────────────────▼─────────────────────────────────────┐
│ Domain: framework-independent rules                          │
│ ├── access policy / visibility / memory policy               │
│ ├── prompt/output/worldinfo/runtime normalization            │
│ └── SillyTavern compatibility mapping rules                  │
└───────────────────────┬─────────────────────────────────────┘
                        │ repository interfaces
┌───────────────────────▼─────────────────────────────────────┐
│ Infrastructure                                               │
│ ├── JSON repository implementation                           │
│ ├── MySQL repository implementation                          │
│ ├── LLM / TTS / STT / vector / translate adapters            │
│ └── migrations / settings / secret handling                  │
└─────────────────────────────────────────────────────────────┘
```

### 4.2 后端目录目标

```text
backend/src/fablemap_api/
├── main.py
├── api/v1/
│   ├── router.py
│   ├── system.py
│   ├── taverns.py
│   ├── characters.py
│   ├── chat.py
│   ├── memories.py
│   ├── owner_config.py
│   ├── runtime.py
│   ├── packages.py
│   ├── gameplay.py
│   ├── worldinfo.py
│   └── utilities.py
├── contracts/
│   ├── common.py
│   ├── taverns.py
│   ├── characters.py
│   ├── chat.py
│   ├── runtime.py
│   ├── owner_config.py
│   ├── memories.py
│   ├── worldinfo.py
│   ├── packages.py
│   ├── gameplay.py
│   └── utilities.py
├── application/
│   ├── taverns.py              # compatibility facade + shared helpers
│   └── services/
│       ├── management.py
│       ├── characters.py
│       ├── runtime.py
│       ├── owner_config.py
│       ├── memories.py
│       ├── worldinfo.py
│       ├── packages.py
│       ├── gameplay.py
│       └── utilities.py
├── domain/
│   ├── tavern_policy.py
│   ├── memory_atom_policy.py
│   ├── world_info_policy.py
│   ├── group_chat_policy.py
│   ├── expression_policy.py
│   ├── tavern_package_policy.py
│   └── prompt_runtime_policy.py
├── repositories/
│   ├── taverns.py              # Protocol / ABC ports
│   ├── chat.py
│   ├── memories.py
│   └── runtime.py
├── infrastructure/
│   ├── settings.py
│   ├── json_store.py           # wrap current TavernStore or successor
│   ├── mysql_store.py
│   ├── database.py
│   ├── migrations/
│   ├── llm_adapters.py
│   └── secret_store.py
└── core/                       # temporary; deletion target
```

原则：

- `api/v1/*` 不直接 import `core.web.*`。
- `application/*` 不直接 import `core.web.*`。
- `domain/*` 不 import FastAPI，不读写文件，不调用外部网络。
- `infrastructure/*` 可以依赖 SQLAlchemy、文件系统、LLM SDK / HTTP。
- `repositories/*` 放接口，不放具体数据库细节。
- `core/` 内可复用 provider 允许短期被 application 调用，但必须有迁移登记；最终能被 domain/infrastructure/application 中的正式模块替换。

### 4.3 前端目录目标

```text
frontend/app/
├── routes/
│   ├── home.tsx
│   ├── discover.tsx
│   ├── create.tsx
│   ├── tavern.tsx
│   ├── owner.tsx
│   └── settings.tsx
├── features/
│   ├── tavern-discovery/
│   ├── tavern-create/
│   ├── tavern-entry/
│   ├── tavern-chat/
│   ├── tavern-owner/
│   ├── characters/
│   ├── world-info/
│   ├── memory/
│   ├── gameplay/
│   └── runtime-config/
├── lib/
│   ├── api-client.ts
│   ├── taverns.ts
│   ├── characters.ts
│   ├── chat.ts
│   ├── memory.ts
│   ├── runtime.ts
│   └── contracts.ts
├── shell/
├── ui/
└── product/                    # temporary; deletion target
```

原则：

- 新页面只调 `frontend/app/lib/*` typed clients。
- 新 UI 优先放 `features/<domain>/`，通用 primitive 放 `ui/`。
- `product/` 仅作为迁移来源，不继续扩写大组件。
- 删除 `product/` 前必须完成 route + feature + service + test 接管。

---

## 5. Bounded Context 设计

### 5.1 Tavern Discovery / Create

职责：

- 坐标锚定、附近/全部/owner 过滤、创建、基本资料更新、访问权限。

核心规则：

- `lat/lon` 必须有效。
- `access` 只允许 `public/password/private`。
- private tavern 只 owner 可见。
- password hash 不返回给 visitor。

目标文件：

- Backend：`api/v1/taverns.py`、`application/taverns.py` facade、`application/services/management.py`、`contracts/taverns.py`。
- Frontend：`features/tavern-discovery/`、`features/tavern-create/`、`lib/taverns.ts`。

### 5.2 Characters / SillyTavern Compatibility

职责：

- NPC CRUD、角色卡 JSON/PNG parse/export、sprites、expression inference。

核心规则：

- 字段映射保持 `docs/WORLD_SCHEMA.md` 与 SillyTavern 兼容。
- parse/export 不产生平台自动创作内容，只转换 owner 提供的数据。

### 5.3 Chat / Runtime Conversation

职责：

- 单 NPC chat、chat history、group chat、TTS/STT、LLM config probe、token/memory side effects。

核心规则：

- API key 不返回 visitor，不写日志。
- LLM 不可用时允许 degraded response，但不能导致状态半写。
- history 按 tavern + visitor + character 隔离。

### 5.4 Owner Config

职责：

- LLM config、output rules、prompt blocks、runtime presets、voice config、world info 管理。

核心规则：

- 写操作 owner-only。
- diagnostics / preview 默认 deterministic，不隐式调用外部 LLM，除非该端点设计明确要求。

### 5.5 Memory / Writeback

职责：

- memory atoms CRUD、visibility、importance、truncate/summarize utilities、chat writeback。

核心规则：

- private visitor memory 只 visitor 本人可读写。
- owner memory 不对 anonymous visitor 开放。
- summary 当前无注入 LLM client 时保留 501 guardrail。

### 5.6 Gameplay

职责：

- owner 管理 GameplayDefinition，visitor 运行 GameplaySession，AI Director / fallback 推进。

核心规则：

- 玩法是轻文本互动，不是战斗系统。
- session 是运行态私有数据，不随 package 导出。
- AI Director 输出必须结构化校验，非法则 fallback。

### 5.7 Package / Import / Export

职责：

- Tavern package export/import、character card import/export、owner-authored content portability。

核心规则：

- package 不导出 `api_key`、`password_hash`、chat history、visitor state、runtime private buckets。
- import 创建新 owner 下的新 tavern，不复用原 owner secret。

### 5.8 Utilities / Power-user Compatibility

职责：

- tokenizers、vectors、translate、image、quick replies、commands、extensions、templates、bookmarks、backups 等兼容能力。

分类策略：

- **Promote**：与赛博酒馆主链路直接相关、前端仍需要、可测试、无禁区风险。
- **Quarantine**：SillyTavern power-user 兼容但非主链路，先放 `api/v1/utilities.py` 或独立 module，避免污染 Tavern core。
- **Retire**：旧地图/世界/ghost/POI 方向，如果不服务 tavern mainline，应明确退役而不是继续迁移。

---

## 6. API 策略

### 6.1 Canonical API

最终只承诺：

```text
/api/v1/*
```

兼容 `/api/*` 的处理策略：

1. 先生成 compatibility route inventory。
2. 每个 endpoint 标注：promote / quarantine / retire。
3. promote 的 endpoint 必须有：native route、contract、application method、frontend client、tests。
4. quarantine 的 endpoint 必须有：明确模块边界、用途、测试或退役条件。
5. retire 的 endpoint 必须有：理由、替代路径、无前端调用证据。
6. 删除 `core/web/router.py` 前，必须有 route parity / retirement checklist。

### 6.2 Response contract

- FastAPI HTTP errors 继续统一为 `{ "error": detail }`。
- `contracts/` 负责 request/response shape；合同定义按 native v1 domain 放在 `common/taverns/characters/chat/runtime/owner_config/memories/worldinfo/packages/gameplay/utilities.py`，临时 `FlexibleBody` 可保留，但新 endpoint 应逐步收敛到明确字段。
- 前端 `readApiJson` 继续兼容 `error/detail`，但新 backend 默认只返回 `error`。

### 6.3 Identity boundary

当前 `X-User-Id` 是 demo identity。目标架构短期保留，但必须显式命名为 development/demo identity，不得包装成生产 auth。

后续 auth 设计应独立开任务，不夹在 migration commit 里。

---

## 7. Persistence / Repository 策略

### 7.1 目标

Application 不应关心 JSON 还是 MySQL。

目标接口层：

```python
class TavernRepository(Protocol):
    def list_taverns(...) -> list[Tavern]: ...
    def get_tavern(tavern_id: str) -> Tavern | None: ...
    def create_tavern(tavern: Tavern) -> Tavern: ...
    def update_tavern(tavern: Tavern) -> Tavern: ...
    def delete_tavern(tavern_id: str) -> bool: ...
```

可逐步拆出：

- `ChatRepository`
- `VisitorStateRepository`
- `MemoryRepository`
- `GameplayRepository`
- `SecretRepository`

### 7.2 JSON vs MySQL

- JSON store：开发默认、fixture 测试、离线 demo。
- MySQL store：生产候选、并发与部署路径。
- 二者必须通过同一 test suite 的行为契约，而不是各写各的测试。

### 7.3 立即要解决的依赖决策

MySQL 代码已进入仓库，因此下一步必须二选一：

**A. 正式纳入依赖**

- 更新 `requirements.txt`：`sqlalchemy`、`pymysql`、`cryptography`。
- CI / 本地测试明确能 import MySQL infrastructure。
- 保持 SQLite in-memory unit tests 验证 store behavior。

**B. 标为 optional infrastructure**

- 延迟 import SQLAlchemy 相关模块。
- 无依赖时 JSON store 正常启动。
- MySQL 测试有 marker 或 import guard。
- 文档明确安装 optional extra 的方式。

Status 2026-04-23: 当前实现选择 **B（optional infrastructure）**。原因是 AGENTS 约束要求新增依赖先获得用户确认，而本轮目标是让默认 JSON store 在 fresh install 中稳定启动。MySQL/SQLAlchemy 仍是生产候选路径，但作为可选基础设施：默认 app import/start 不依赖 SQLAlchemy；MySQL-specific tests 在无 SQLAlchemy 时 skip；后续若要把 SQLAlchemy/MySQL 正式纳入依赖，需要单独确认并更新 `requirements.txt` / 安装文档。

---

## 8. Frontend 产品化策略

### 8.1 页面目标

目标页面不应长期停留在“demo shell”。建议页面边界：

- `/`：产品介绍 + CTA。
- `/discover`：真实地图 / 坐标 / 酒馆发现。
- `/create`：开店向导。
- `/tavern/:id`：visitor entry + NPC chat + gameplay。
- `/owner`：我的酒馆 / owner console。
- `/owner/:id`：单间酒馆配置：角色、世界书、LLM、runtime、voice、package。
- `/settings`：本地身份 / provider / dev tools（仅开发态）。

### 8.2 Feature extraction 顺序

1. `lib/*` typed clients 按 backend bounded context 拆分。
2. `/tavern/:id` 迁出 `product/TavernChatRoom.jsx` 的 visitor chat 主链路。
3. `/owner/:id` 迁出角色、world info、LLM config、prompt/output/runtime presets。
4. `discover/create` 完成对 `product` 旧服务的脱钩。
5. `product/styles.css` 按 feature 拆分，只保留真正全局 token。
6. 删除 `frontend/app/product/` 前扫描：无 active import、无 `/api/*` service 依赖、脚本测试迁移完成。

### 8.3 UI 原则

- 地图是入口，不是产品价值本体。
- visitor 体验优先：看到酒馆、进门、选 NPC、聊天、记忆反馈。
- owner 体验其次但必须完整：创建、配置角色、配置 LLM、测试、导出/导入。
- 移动窄屏必须可用；新组件不得假设宽屏控制台。
- 视觉风格应支持主题化：同一信息架构可以落在暖木质赛博酒馆、霓虹夜城赛博朋克、小清新日式漫画、手绘幻想小镇等不同 theme skin 上。
- 主题只能改变表现层 design tokens（色彩、材质、卡片、地图 marker、对话气泡、动效氛围），不得改变 API、Schema、权限、店主主权或主链路语义。
- 可参考外部作品的宽泛情绪，例如“温暖手工酒馆”“硬核赛博都市”“清新恋爱漫画”“手绘幻想小镇”，但不得复刻具体 IP 的 UI、Logo、字体、角色、专有符号、地图或在世艺术家的个人笔触。

### 8.4 产品原型图产出

P1.4 前端 feature extraction 不能只看目录结构，必须先以可视化原型校准信息架构。当前原型图产出位于 `.trellis/tasks/04-22-refactor-project/prototypes/`。

多风格方向板位于 [`prototypes/style-directions/`](./prototypes/style-directions/)，用于说明 FableMap 支持多种酒馆皮肤而不是单一视觉：

| 方向板 | 适用氛围 | 实现约束 |
|--------|----------|----------|
| [`01-warm-cyber-tavern.svg`](./prototypes/style-directions/01-warm-cyber-tavern.svg) | 默认暖酒馆、新手友好、手工铜边 | 不复制具体卡牌/对战语义 |
| [`02-neon-megacity-cyberpunk.svg`](./prototypes/style-directions/02-neon-megacity-cyberpunk.svg) | 雨夜街区、硬核赛博、霓虹招牌 | 不复刻 Cyberpunk 2077 具体 UI/IP |
| [`03-fresh-japanese-romance.svg`](./prototypes/style-directions/03-fresh-japanese-romance.svg) | 小清新、恋爱漫画、治愈酒馆 | 不复刻具体日漫角色/分镜/IP |
| [`04-handpainted-fantasy-town.svg`](./prototypes/style-directions/04-handpainted-fantasy-town.svg) | 手绘幻想小镇、童话回访记忆 | 不模仿在世艺术家个人笔触 |

页面信息架构原型如下：

| 原型 | 覆盖主链路 | 后续实现入口 |
|------|------------|--------------|
| [`01-discover-map.svg`](./prototypes/01-discover-map.svg) | 真实地图锚点、附近酒馆列表、开店入口 | `routes/discover.tsx` + `features/tavern-discovery/` |
| [`02-tavern-entry.svg`](./prototypes/02-tavern-entry.svg) | 店主设定、访问规则、NPC 选择、入场承诺 | `routes/tavern.tsx` + `features/tavern-detail/` |
| [`03-chat-runtime.svg`](./prototypes/03-chat-runtime.svg) | NPC 对话、上下文/记忆/Token 状态、降级反馈 | `features/tavern-chat/` + `features/memories/` |
| [`04-owner-console.svg`](./prototypes/04-owner-console.svg) | 角色、WorldInfo、Prompt/Output/Runtime、导入导出 | `routes/owner.tsx` + `features/tavern-owner/` |
| [`05-create-tavern.svg`](./prototypes/05-create-tavern.svg) | 坐标、门面、首个 NPC、运行时、发布检查 | `routes/create.tsx` + `features/tavern-create/` |
| [`06-mobile-visitor-flow.svg`](./prototypes/06-mobile-visitor-flow.svg) | 移动端发现、入口、聊天、回访一屏一任务 | 所有 visitor-facing features 的窄屏验收 |
| [`07-npc-style-cast.svg`](./prototypes/07-npc-style-cast.svg) | 多风格 NPC 形象、酒馆室内舞台、点击切换对话对象 | `features/tavern-npc-stage/` + `routes/tavern.tsx` |

原型验收约束：

- 原型是 P1.4 拆 feature 的输入，不是最终视觉稿。
- 新 UI 允许调整 copy 和布局细节，但不能丢失原型中标注的主链路信息：真实坐标、owner-authored 内容、NPC 对话、记忆反馈、owner secrets 不外泄。
- 每个 frontend feature 完成时，需要至少对照对应 SVG 做一次人工视觉/窄屏检查。
- NPC 视觉资产必须遵守 `.trellis/spec/frontend/npc-art-guidelines.md`：作图必须是符合酒馆主题的真实卡通/二次元/游戏动漫人像，不允许用圆圈、方块、抽象小人或无酒馆场景的泛头像替代。
- `features/tavern-npc-stage/` 的无头像 fallback 使用 `frontend/app/assets/npc-style-cast/tavern-npc-style-cast.png`，只作为展示层资产，不写回 TavernCharacter，也不替代店主上传/导入的角色头像或精灵图。

---

## 9. Compatibility Core 删除条件

### 9.1 Backend `core/web/*` 删除条件

删除前必须全部满足：

- [ ] `backend/src/fablemap_api/main.py` 不 import `core.web.*`。
- [ ] `backend/src/fablemap_api/api/v1/*` 不 import `core.web.*`。
- [ ] `backend/src/fablemap_api/application/*` 不 import `core.web.*`。
- [ ] compatibility route inventory 中所有 `/api/*` endpoint 已 promote / quarantine / retire。
- [ ] promoted endpoints 均有 native tests。
- [ ] retired endpoints 均有理由与无前端 active caller 证据。
- [ ] `py -3 -m pytest -q --tb=short` 通过。
- [ ] frontend build/test 通过。

### 9.2 Backend `core/*` 删除条件

`core/` 不能整体一次删，必须按模块删除：

- Provider 类模块（LLM/TTS/STT/translate/vector/tokenizer/char_card_parser）应迁入 `infrastructure/` 或 `domain/` 后删除旧模块。
- Domain 类模块（tavern/gameplay/memory/prompt/world_info/output_rules/presets）应迁入 `domain/`、`application/`、`repositories/` 后删除旧模块。
- Historical world/map modules 如果无主链路用途，应 retire 并删除。

每删一个模块必须有：

- import scan。
- behavior tests。
- docs/task note。

### 9.3 Frontend `app/product/*` 删除条件

删除前必须全部满足：

- [ ] `frontend/app/routes/*` 不 import `app/product/*`。
- [ ] `frontend/app/features/*` 覆盖 visitor + owner 主链路。
- [ ] `frontend/app/lib/*` 覆盖所需 `/api/v1` clients。
- [ ] `frontend/scripts/*` 不依赖 product services，或已迁移到 new lib/features。
- [ ] `npm --prefix frontend run typecheck` 通过。
- [ ] `npm --prefix frontend run build` 通过。
- [ ] `npm --prefix frontend test` 通过。

---

## 10. Roadmap：下一阶段实施计划

### Phase 0：设计基线与盘点（当前文档）

产物：

- 本设计文档。
- task.json / PRD 引用。
- route inventory / deletion checklist 后续待补。

验收：

- 文档进入当前 Trellis task。
- git 提交并推送。

### Phase 1：依赖与启动稳定性

目标：让 fresh install 环境可稳定 import / test。

Status 2026-04-23: 默认启动依赖 gate 已完成。无 `FABLEMAP_MYSQL_URL` 时 native app 使用 JSON store；SQLAlchemy/MySQL 相关 import 保持 lazy/optional；新增 startup smoke test 会阻断 `sqlalchemy` import 并验证 `/api/v1/health`。

任务：

1. MySQL 依赖决策：正式加入 requirements 或 optional guard。
2. `create_store(settings)` 对 MySQL 缺依赖 / 连接失败有明确降级或错误策略。
3. backend README 与 requirements 一致。
4. MySQL tests 与 default backend tests 在干净环境有明确运行方式。

验证：

```powershell
py -3 -m compileall -q backend/src
py -3 -m pytest -q backend/tests --tb=short
py -3 -m pytest -q --tb=short
```

### Phase 2：Backend native 模块拆分

目标：拆掉 `api/v1/taverns.py` 与 `application/taverns.py` 的大文件趋势。

Status 2026-04-23: P1.1 route split, P1.2 application service split, and P1.3 contracts split are complete. `api/v1/taverns.py` now owns core tavern CRUD/entry only; all other native v1 endpoint groups live in focused route modules. `application/taverns.py` remains the route-facing facade, bounded use cases live in `application/services/*`, and Pydantic contracts live in focused `contracts/*` domain modules.

任务：

1. 按 bounded context 拆 route modules。
2. 按 bounded context 拆 application use cases。
3. 保持 public `/api/v1` path 不变。
4. 每次拆分只移动一个 context，先 tests 再删除旧方法。

推荐顺序：

1. `utilities`：tokenizers/memory utility/expressions/characters parse/export。
2. `world_info + owner_config`。
3. `runtime`：LLM/group/voice/TTS/STT。
4. `memory`。
5. `gameplay`。
6. `characters`。
7. `taverns/chat` core mainline。

### Phase 3：Compatibility endpoint inventory

目标：决定 `/api/*` 中每个 endpoint 的命运。

产物建议：

```text
.trellis/tasks/04-22-refactor-project/compatibility-route-inventory.md
```

表字段：

- old path
- current caller
- product relevance
- decision：promote / quarantine / retire
- target native path
- tests needed
- deletion blocker

优先处理：

- chats / groups / bookmarks / templates / backups。
- translate / embed / vectors / image。
- quickreplies / commands / extensions / presets。
- old world / ghost / disturbance / nearby。

### Phase 4：Frontend feature extraction

目标：native route + feature 按原型图接管 product UI。

顺序：

1. `lib` clients split。
2. `tavern-chat` visitor 主链路。
3. `tavern-owner` 配置主链路。
4. `characters` editor/import/export。
5. `world-info` editor/tester。
6. `gameplay` manager/session panel。
7. `runtime-config` group/voice/LLM/presets。
8. `discover/create` 完整 native data flow。

### Phase 5：Repository / persistence 收束

目标：让 JSON 与 MySQL 实现共享行为契约。

任务：

1. 定义 repository ports。
2. 包装 JSON store 成 infrastructure implementation。
3. 让 MySQL store 实现同一 ports。
4. 把 application 从具体 `TavernStore` 改为 ports。
5. 增加 repository behavior test matrix。

### Phase 6：删除 compatibility core

目标：真正删除 current core，而不是只是移动目录。

顺序：

1. 删除 `core/web/router.py` 与 `core/web/service.py`。
2. 删除无用途 historical world/map modules。
3. 迁移/删除 provider modules。
4. 删除 `frontend/app/product/`。
5. 更新 README / docs / Trellis spec。
6. 全量验证 + route/import scan。

---

## 11. 验证矩阵

| 改动类型 | 最小验证 | 推荐验证 |
|----------|----------|----------|
| 只改任务设计文档 | `git diff --check` + 内容检查 | 无需跑全量测试 |
| 后端 route/application 拆分 | `py -3 -m compileall -q backend/src` + focused backend tests | `py -3 -m pytest -q backend/tests --tb=short` + full pytest |
| persistence / MySQL | compileall + MySQL focused tests | backend tests + full pytest + dependency fresh install smoke |
| frontend lib/service | `npm --prefix frontend run typecheck` | build + frontend scripts |
| frontend route/UI | typecheck + build | scripts + manual narrow-screen smoke |
| 删除 core/product | import scan + full pytest + frontend typecheck/build/test | route inventory checklist + manual smoke |

---

## 12. 风险登记

| 风险 | 影响 | 缓解 |
|------|------|------|
| MySQL 依赖已提交但 requirements 未对齐 | fresh env import/test 失败 | Phase 1 立即决策并修正 |
| 新 endpoint / use case 重新堆回 `api/v1/taverns.py` 或 `application/taverns.py` facade | 新架构重复形成 monolith | 继续按 route module + `application/services/*` bounded context 放置 |
| `/api/*` 端点遗漏 | 删除 core 后前端/兼容行为断裂 | 先做 route inventory，再 promote/quarantine/retire |
| `frontend/app/product` 长期保留 | 前端双轨、维护成本上升 | Phase 4 feature extraction + deletion checklist |
| owner API key 泄露 | 高安全风险 | contract tests + payload redaction + logging scan |
| 老地图/世界方向回流 | 产品主线漂移 | 每个迁移项标注 product relevance |
| CSS/global UI 耦合 | 可视回归 | 先 feature boundaries，后 CSS split |
| Header-only demo identity 被误认为生产 auth | 权限安全误判 | 明确 demo identity，auth 单独开任务 |

---

## 13. ADR-lite 决策记录

### ADR-001：继续前后端分离，不改成全栈单体

**Context**：用户已确认目标是前后端分离 enterprise project。仓库已具备 FastAPI native backend 与 React Router frontend。

**Decision**：保留 FastAPI + React Router/Vite/TypeScript 两端分离。

**Consequences**：

- 需要维护 API contract discipline。
- 后续可以引入 OpenAPI/typegen，但不作为当前设计的先决条件。

### ADR-002：`/api/v1` 是 canonical API

**Context**：compatibility `/api/*` 路由巨大，且混合历史世界方向与 tavern 主链路。

**Decision**：所有新增与最终产品 API 均落在 `/api/v1`。

**Consequences**：

- 删除 compatibility core 前必须有 endpoint 命运清单。
- 前端新代码禁止直接调用 `/api/*`。

### ADR-003：core 是临时行为矿区，不是新架构层

**Context**：大量可复用行为已迁移入 `backend/src/fablemap_api/core/`，但里面也有历史与 compatibility web 代码。

**Decision**：允许 native application 短期调用纯 provider/domain core modules，但不得调用 `core.web`；每个 core 依赖最终要迁移或删除。

**Consequences**：

- 需要维护 core dependency ledger。
- 删除 core 不是一次性动作，而是模块化退役。

### ADR-004：JSON + MySQL 通过 repository ports 并存

**Context**：JSON 是当前测试/开发稳定基线，MySQL 是生产候选且代码已进入仓库。

**Decision**：将二者收束到 repository ports；application 不知道具体存储后端。

**Consequences**：

- 需要补 repository behavior tests。
- 需要修正依赖安装与启动策略。

---

## 14. 下一步最优先任务

按风险和收益排序：

1. **Phase 1：依赖与启动稳定性**
   - 解决 MySQL 依赖 / optional guard。
   - 保证 fresh checkout 可验证。
2. **Phase 3：compatibility route inventory**
   - 这是删除 `core/web/router.py` 的前置地图。
3. **Phase 2：Backend native 模块拆分**
   - 防止新 v1 层继续变成大文件。
4. **Phase 4：Frontend feature extraction**
   - 逐步让 native routes 接管 `product/`。
5. **Phase 5/6：repository 收束 + 删除 core/product**
   - 在行为覆盖足够后再做破坏性删除。

---

## 15. 本设计的验收标准

- [x] 明确产品不可破坏契约。
- [x] 明确当前 backend/frontend/data 事实基线。
- [x] 明确目标目录、层级和 import 规则。
- [x] 明确 bounded context。
- [x] 明确 compatibility endpoint 策略。
- [x] 明确 repository / MySQL 策略。
- [x] 明确 frontend feature extraction 策略。
- [x] 明确 core/product 删除条件。
- [x] 明确后续 phase roadmap 与验证矩阵。
