# P1 Framework Refactor Plan

> 任务：`.trellis/tasks/04-22-refactor-project/`
> 优先级：P1
> 日期：2026-04-22
> 状态：已提升为当前重构任务的最高优先级主线

## Decision

框架重构从“项目重构的一部分”提升为当前 Trellis 任务的 **P1 主线**：在继续新增产品能力前，优先让目标 native 架构成为主要实现路径，并让 current compatibility core 进入可审计、可替换、可删除状态。

## Why this is higher priority now

当前 native `/api/v1` 已经迁移了大量等价能力，但架构风险开始集中在几个框架层面：

1. `backend/src/fablemap_api/api/v1/taverns.py` 已承载过多 bounded contexts。
2. `backend/src/fablemap_api/application/taverns.py` 已从 tavern facade 膨胀成多领域 use-case facade。
3. `backend/src/fablemap_api/core/web/router.py` 与 `core/web/service.py` 仍是删除 current core 的最大阻塞点。
4. `frontend/app/product/` 仍保留大量旧 UI、hooks、services、map 组件，尚未沉淀为目标 `routes + features + lib + ui` 结构。
5. MySQL / repository / startup dependency 契约需要先稳定，否则后续迁移会继续堆在不清晰的基础设施边界上。

因此下一步不应优先做新产品范围，而应优先做框架收束。

## Scope

### In scope

- Backend native v1 route modules 按 bounded context 拆分。
- Backend contracts 按 API 领域拆分，避免继续集中在 `contracts/taverns.py`。
- Application service 拆成清晰 use-case services，同时保持外部行为等价。
- Repository / infrastructure / startup dependency 契约收束。
- Frontend 从 `app/product/` 提取稳定 feature modules。
- 建立 compatibility route inventory，逐个标记迁移、保留或删除。
- 形成删除 `core/web/router.py`、`core/web/service.py`、`frontend/app/product/` 的可执行 gate。

### Out of scope

- 不改变 `docs/WORLD_SCHEMA.md` 核心实体语义。
- 不引入平台生成酒馆 / NPC / 故事。
- 不做平台级 token 充值、结算或抽成。
- 不做无真实坐标锚点空间、访客社交、传统地图 App、RPG 战斗等级装备。
- 不以“框架重构”为名顺手做视觉大改、依赖大升级或产品方向改写。

## Priority order

### P1.0 Startup and dependency stability

目标：先保证目标 native app 的启动、依赖、存储配置边界稳定。

- 明确 MySQL/SQLAlchemy 依赖是否正式进入 requirements。
- 明确 JSON store 与 MySQL store 的选择策略。
- 明确 env keys、默认值、失败模式。
- 验证 backend native app 可以在默认开发环境稳定启动。

### P1.1 Backend v1 route split

目标：把 `api/v1/taverns.py` 拆成领域路由模块，保持 URL 与 payload 等价。

建议模块：

- `api/v1/taverns.py`
- `api/v1/characters.py`
- `api/v1/chat.py`
- `api/v1/owner_config.py`
- `api/v1/memories.py`
- `api/v1/worldinfo.py`
- `api/v1/packages.py`
- `api/v1/utilities.py`

### P1.2 Application service split

目标：把 `TavernApplicationService` 从单一巨型 facade 收束成 use-case 层。

建议拆分：

- `TavernDiscoveryService`
- `TavernManagementService`
- `CharacterService`
- `ChatRuntimeService`
- `OwnerConfigService`
- `MemoryService`
- `WorldInfoService`
- `PackageService`
- `UtilityService`

### P1.3 Contracts split

目标：把 `contracts/taverns.py` 拆成和 route/use-case 一致的 contracts，降低后续 API 漂移风险。

### P1.4 Frontend feature extraction

目标：从 `frontend/app/product/` 提取稳定 feature modules，native routes 只组装 features，不直接依赖旧大组件。

建议目录：

```text
frontend/app/features/
├── tavern-discovery/
├── tavern-create/
├── tavern-detail/
├── tavern-owner/
├── chat-runtime/
├── character-assets/
├── world-info/
├── memories/
└── packages/
```

### P1.5 Compatibility inventory and deletion gates

目标：给 `core/web/router.py`、`core/web/service.py`、`frontend/app/product/` 建立逐项清单。

每个旧入口必须被标记为：

- `migrated`: 已有 native 等价实现和测试。
- `promote`: 需要迁移到 native 架构。
- `compat`: 明确保留兼容，且有保留原因。
- `delete`: 可删除，且有验证覆盖。

## Acceptance criteria

- [ ] Framework refactor priority is visible in `task.json` as P1.
- [ ] Backend native route modules are split without URL/payload behavior drift.
- [ ] Application services no longer require one giant `TavernApplicationService` for all bounded contexts.
- [ ] Contracts are grouped by API domain.
- [ ] Frontend has `app/features/*` modules for migrated product slices.
- [ ] Compatibility route inventory exists and maps old `/api/*` endpoints to native status.
- [ ] Deletion gates are explicit before removing current core.
- [ ] Relevant backend tests, frontend build/test, and diff checks are run for each implementation slice.

## Validation plan

For documentation-only priority updates:

```powershell
git diff --check
```

For backend framework slices:

```powershell
py -3 -m compileall -q backend/src/fablemap_api
py -3 -m pytest -q backend/tests --tb=short
py -3 -m pytest -q --tb=short
```

For frontend framework slices:

```powershell
npm --prefix .rontend run build
npm --prefix .rontend test
```
