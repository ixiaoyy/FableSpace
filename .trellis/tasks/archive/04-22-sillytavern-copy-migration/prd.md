# SillyTavern copy full framework migration

## Goal

把 `sillytavern_copy/` 中承载的 SillyTavern 相关实现完整纳入 FableMap 新框架：逐项审计、按 FableMap 产品边界重构到 native backend/frontend 架构，验证行为等价或明确不适用原因，最终删除 `sillytavern_copy/`。

最终目标不是保留一个仓库副本，而是让 FableMap 自己拥有需要的 SillyTavern 兼容能力。

## Priority

P1 / blocker-level refactor task.

此任务是当前 `04-22-refactor-project` 框架重构主线的子任务。它优先级高于继续新增产品范围，因为只要 `sillytavern_copy/` 仍作为实现来源或行为参考存在，项目就没有真正完成 native framework convergence。

## Current source baseline

截至 2026-04-22 的本地事实：

- `sillytavern_copy/` 存在于仓库根目录。
- Git tracked files: 约 964 个。
- 排除 `node_modules` 与 `.git` 后的文件数：约 1210 个。
- 主要源码区域：
  - `sillytavern_copy/src/`：server/endpoints/tokenizers/vectors/character card/parser 等后端与工具实现。
  - `sillytavern_copy/public/`：前端脚本、样式、资源、locales。
  - `sillytavern_copy/default/`：默认内容、角色、背景、presets、world/lorebook 等素材与配置。
  - `sillytavern_copy/tests/`：上游测试参考。
  - `sillytavern_copy/package.json` / `config.yaml`：运行与配置参考。

## Product constraints

迁移必须服从 FableMap 权威文档与 AGENTS.md：

- 真实地图坐标锚定的 cyber tavern 是产品主线。
- 店主创作酒馆、NPC、氛围、访问规则；平台不自动生成酒馆内容。
- SillyTavern 兼容性优先保持，但不能把 FableMap 变成完整 SillyTavern clone。
- 店主 API Key / LLM 配置 / token 信息按敏感数据处理。
- 不引入平台 token 充值结算、访客社交、无锚点空间、传统地图 App、RPG 战斗等级装备。

## Scope

### In scope

- 对 `sillytavern_copy/` 下所有 tracked implementation/source/config/content 进行 inventory。
- 每个条目必须归类：
  - `migrate`: 需要重构到 FableMap 新框架。
  - `adapt`: 需要按 FableMap 产品语义改造后迁入。
  - `reference-only`: 只作为行为/格式参考，不保留运行依赖。
  - `not-applicable`: 与 FableMap 产品边界冲突或不需要，记录原因。
  - `delete`: 已被 native 实现覆盖，可随 copy 删除。
- 将需要的能力迁入：
  - backend `api/v1 + contracts + application + domain + repositories + infrastructure`。
  - frontend `app/routes + app/features + app/lib + app/ui`。
- 迁移并测试 SillyTavern 关键兼容能力：角色卡、world/lorebook、prompt/preset、tokenizer、chat runtime、group chat、memory/vector/embedding 相关能力。
- 删除前确保 `git grep sillytavern_copy` 不再显示运行时依赖。
- 最终删除 `sillytavern_copy/` 目录及其 copy-only 配置、脚本、资源。

### Out of scope

- 不直接把 SillyTavern UI 原样搬进 FableMap。
- 不保留双实现或长期 vendor copy。
- 不引入与 FableMap 主链路无关的上游产品方向。
- 不迁移上游 node_modules、临时运行产物或不应入库的缓存。
- 不绕过 FableMap schema/API 审批流程。

## Migration strategy

### Phase 1: Inventory and capability map

产出 `inventory.md`：

- 枚举 `sillytavern_copy/` tracked 文件和主要未跟踪风险区域。
- 按能力域归组：character cards、world/lorebook、prompts/presets、chat runtime、LLM providers、tokenizers、extensions/plugins、assets/locales、tests/config/scripts。
- 每组标记目标 FableMap 模块、迁移状态、阻塞原因。

### Phase 2: Backend native reimplementation

把需要的后端能力重构到：

- `backend/src/fablemap_api/api/v1/*`
- `backend/src/fablemap_api/contracts/*`
- `backend/src/fablemap_api/application/*`
- `backend/src/fablemap_api/domain/*`
- `backend/src/fablemap_api/repositories/*`
- `backend/src/fablemap_api/infrastructure/*`

不得让 native v1 路由调用 `sillytavern_copy/`。

### Phase 3: Frontend native feature extraction

把需要的前端能力重构到：

- `frontend/app/features/*`
- `frontend/app/lib/*`
- `frontend/app/routes/*`
- `frontend/app/ui/*`

不得保留对 `sillytavern_copy/public/*` 的运行时依赖。

### Phase 4: Parity tests and regression gates

为每个迁移域建立最小真实验证：

- parser/serializer golden tests。
- API contract tests。
- frontend client/build tests。
- sensitive config redaction tests。
- import/export compatibility tests。

### Phase 5: Delete copy

删除条件：

- `inventory.md` 中所有条目已归类并完成处理。
- 所有 `migrate/adapt` 条目已有 native 实现和测试。
- `git grep sillytavern_copy` 不存在运行时引用。
- backend/frontend 验证通过。
- 删除 `sillytavern_copy/` 后全量相关验证仍通过。

## Acceptance Criteria

- [ ] `sillytavern_copy/` inventory 完成，所有 tracked 文件/能力域有处理结论。
- [ ] 所有需要保留的 SillyTavern 兼容能力已在 FableMap 新框架中实现。
- [ ] FableMap native backend 不依赖 `sillytavern_copy/`。
- [ ] FableMap native frontend 不依赖 `sillytavern_copy/`。
- [ ] 对角色卡、world/lorebook、prompt/preset、tokenizer、chat runtime、memory/vector 相关能力有回归测试。
- [ ] 删除 `sillytavern_copy/` 后测试仍通过。
- [ ] 删除前所有不迁移项都有明确原因，且不违反产品约束。

## Validation Plan

文档/清单阶段：

```powershell
git diff --check
py -3 - <<'PY'
import json
from pathlib import Path
json.loads(Path('.trellis/tasks/04-22-sillytavern-copy-migration/task.json').read_text(encoding='utf-8'))
PY
```

后端迁移切片：

```powershell
py -3 -m compileall -q backend/src/fablemap_api
py -3 -m pytest -q backend/tests --tb=short
py -3 -m pytest -q --tb=short
```

前端迁移切片：

```powershell
npm --prefix .\frontend run build
npm --prefix .\frontend test
```

删除 copy 前：

```powershell
git grep -n "sillytavern_copy" -- . ':!.trellis/tasks/04-22-sillytavern-copy-migration/*'
py -3 -m pytest -q --tb=short
npm --prefix .\frontend run build
npm --prefix .\frontend test
```

## Notes

此任务允许使用 `sillytavern_copy/` 做行为参考，但目标是删除它。任何新代码不得把 `sillytavern_copy/` 作为运行时依赖、构建依赖或长期 vendor 目录。
