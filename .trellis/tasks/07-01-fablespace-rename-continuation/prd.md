# FableMap → FableSpace 重命名延续任务

## 背景

FableMap → FableSpace 全面重命名已完成**后端核心阶段**，需要继续完成剩余工作。

### 已完成 ✅

- **Phase 0**: Git commit 备份点
- **Phase 1**: 后端包名 `fablemap_api` → `fablespace_api`
- **Phase 2**: 后端核心类/文件重命名
  - `Tavern` → `Space`
  - `tavern.py` → `space.py`
  - 所有 `*tavern*` 函数/变量 → `*space*`
  - API 路由 `/taverns` → `/spaces`
- **验证**: `py -3 -m compileall -q backend/src` 通过

### 待完成 📋

| Phase | 内容 | 状态 |
|-------|------|------|
| Phase 5 | 环境变量 `FABLEMAP_*` → `FABLESPACE_*` | 完成 |
| Phase 6 | 前端文件重命名 | 完成 |
| Phase 7 | 前端内容更新 (类型/函数) | 完成 |
| Phase 8 | 文档批量更新 | 完成 |
| Phase 9 | 验证 (前端构建) | 完成 |

---

## Phase 5: 环境变量重命名

### 需要更新的文件

1. `backend/src/fablespace_api/infrastructure/settings.py`
2. `backend/src/fablespace_api/core/web/config.py`
3. `backend/src/fablespace_api/infrastructure/storage.py`
4. `backend/src/fablespace_api/core/cache.py`
5. `backend/src/fablespace_api/core/cli.py`
6. `backend/src/fablespace_api/core/llm_clients.py`
7. `.env.example`
8. `docker-compose.yml`

### 环境变量映射

| 当前 | 新 | 备注 |
|------|-----|------|
| `FABLEMAP_DATABASE_URL` | `FABLESPACE_DATABASE_URL` | 新名优先，旧名回退 |
| `FABLEMAP_MYSQL_URL` | `FABLESPACE_MYSQL_URL` | 旧名保留为别名 |
| `FABLEMAP_STORAGE_BACKEND` | `FABLESPACE_STORAGE_BACKEND` | 旧名回退 |
| `FABLEMAP_OUTPUT_ROOT` | `FABLESPACE_OUTPUT_ROOT` | 旧名回退 |
| `FABLEMAP_CORS_ORIGINS` | `FABLESPACE_CORS_ORIGINS` | 旧名回退 |
| `FABLEMAP_SILLYTAVERN_URL` | `FABLESPACE_SILLYTAVERN_URL` | 旧名回退 |
| `FABLEMAP_FIXTURE_FILE` | `FABLESPACE_FIXTURE_FILE` | 旧名回退 |
| `FABLEMAP_FRONTEND_ROOT` | `FABLESPACE_FRONTEND_ROOT` | 旧名回退 |
| `FABLEMAP_SEED_DEFAULT_TAVERNS` | `FABLESPACE_SEED_DEFAULT_SPACES` | 旧名回退 |

### 实现策略

```python
def _default_database_url() -> str:
    # 新名优先
    value = os.environ.get("FABLESPACE_DATABASE_URL", "").strip()
    if value:
        return value
    # 旧名回退兼容
    return os.environ.get("FABLEMAP_DATABASE_URL", "").strip()
```

---

## Phase 6: 前端文件重命名

### 文件重命名列表

```
# lib 目录
taverns.ts → spaces.ts
tavern-first-minute.ts → space-first-minute.ts
tavern-runtime-config.js → space-runtime-config.js
tavern-share.js → space-share.js
tavern-layouts.js → space-layouts.js
tavern-drafts.js → space-drafts.js
tavern-activity-echoes.js → space-activity-echoes.js
tavern-intent-tags.js → space-intent-tags.js
homepage-taverns.ts → homepage-spaces.ts

# routes 目录
tavern.tsx → space.tsx
tavern-manage.tsx → space-manage.tsx

# features 目录 (目录重命名)
tavern-chat-workbench/ → space-chat-workbench/
tavern-chat/ → space-chat/
tavern-npc-stage/ → space-npc-stage/
tavern-layout-showcase/ → space-layout-showcase/
tavern-owner-management/ → space-owner-management/

# components 目录
tavern-preview-modal.tsx → space-preview-modal.tsx
TavernActivityEchoesCard.tsx → SpaceActivityEchoesCard.tsx
TavernEngagementPanel.tsx → SpaceEngagementPanel.tsx
TavernMessageBoard.tsx → SpaceMessageBoard.tsx

# product 目录
services/tavernService.js → services/spaceService.js
services/newcomerTavern.js → services/newcomerSpace.js
tavernTemplates.js → spaceTemplates.js
tavernPlayModes.js → spacePlayModes.js
tavernMiniGames.js → spaceMiniGames.js
tavernFarmModes.js → spaceFarmModes.js
special-tavern-types.js → special-space-types.js
```

### 路由注册更新

需要更新 `frontend/app/routes.ts` 中的路由导入路径。

---

## Phase 7: 前端内容更新

### TypeScript 类型重命名

| 当前 | 新 |
|------|-----|
| `TavernCharacter` | `SpaceCharacter` |
| `Tavern` | `Space` |
| `TavernListResponse` | `SpaceListResponse` |
| `TavernSharePayload` | `SpaceSharePayload` |
| `TavernVisitor` | `SpaceVisitor` |
| `RoleplayState.tavern_id` | `RoleplayState.space_id` |

### 函数重命名

| 当前 | 新 |
|------|-----|
| `listTaverns()` | `listSpaces()` |
| `getTavern()` | `getSpace()` |
| `createTavern()` | `createSpace()` |
| `enterTavern()` | `enterSpace()` |
| `sendTavernChat()` | `sendSpaceChat()` |
| `exportTavernPackage()` | `exportSpacePackage()` |

### 组件文本更新

更新所有组件中的显示文本：
- "进入酒馆" → "进入空间"
- "创建酒馆" → "创建空间"
- 等等...

---

## Phase 8: 文档批量更新

### 关键文档

1. `CLAUDE.md` - 项目指导文件
2. `README.md` - 项目说明
3. `docs/PRODUCT_BRIEF.md` - 产品概述
4. `docs/FABLEMAP_TAVERN_PLATFORM.md` → `docs/FABLESPACE_SPACE_PLATFORM.md`
5. `docs/ARCHITECTURE.md` - 架构文档
6. `AGENTS.md` - AI 协作协议

### 批量替换策略

```bash
# 使用 grep + sed 批量替换
# 注意：SillyTavern 相关不要改
grep -rl "tavern" --include="*.md" docs/ | xargs sed -i 's/tavern/space/g'
grep -rl "Tavern" --include="*.md" docs/ | xargs sed -i 's/Tavern/Space/g'
grep -rl "FableMap" --include="*.md" docs/ | xargs sed -i 's/FableMap/FableSpace/g'
```

---

## Phase 9: 验证

### 验证命令

```powershell
# 1. 后端语法检查
py -3 -m compileall -q backend/src

# 2. 前端构建
npm --prefix .\frontend run build

# 3. 功能测试（可选）
# 启动后端
$env:PYTHONPATH = "$PWD\backend\src"
py -3 -m fablespace_api api --no-open
```

---

## 执行顺序建议

1. Phase 5: 环境变量 (backend/infrastructure/settings.py)
2. Phase 6: 前端文件重命名 (批量 rename)
3. Phase 7: 前端内容更新 (类型/函数)
4. Phase 8: 文档更新 (批量替换)
5. Phase 9: 验证

---

## 风险提示

1. **前端文件重命名**需要同步更新所有 import 路径
2. **文档批量替换**需要排除 SillyTavern 相关内容
3. **环境变量**需要保持向后兼容（旧名回退）

---

## 2026-07-01 完成记录

### 完成范围

- Phase 5: `FABLESPACE_*` 新环境变量优先，`FABLEMAP_*` 作为旧部署回退兼容。
- Phase 6/7: 前端 `tavern*` 文件、路由、类型、服务、资源目录与用户可见文案切换到 `space*` / FableSpace；SillyTavern 兼容术语保持不变。
- Phase 8: `README.md`、`AGENTS.md`、`CLAUDE.md`、`docs/` 与 `.trellis/spec/` 文档更新到 FableSpace / Space 命名。
- Phase 9: 后端导入、前端构建与 API meta smoke 已验证。

### 验证证据

```powershell
py -3 -m compileall -q backend\src
npm --prefix .\frontend run build
docker compose config --quiet
```

结果：三条命令均通过。

```powershell
# 使用 JSON storage 与 FastAPI TestClient 构造同一 web app，并请求 /api/meta
# 输出：200 / FableSpace / data-meta.v1
```

补充：直接按本机 `.env` 启动真实 API 进程时，第一次命中外部 MySQL 并暴露出该库仍是 legacy schema（`characters.space_id` 缺列）；改用 JSON storage 后进程能打印 ready，但本轮 Windows localhost curl/Invoke-RestMethod 未收到响应。为避免把外部数据库状态或本机 loopback 行为误判为代码通过，最终 smoke 采用同一 FastAPI app 的 TestClient 结果。

### 有意保留的兼容点

- 旧 `FABLEMAP_*` 环境变量仍作为后端回退别名。
- 旧 package type `fablemap_tavern_package` / `fablemap_space_package` 仍可导入。
- 数据库物理表名 `taverns` 仍保留，避免无迁移的破坏性 Schema 改动。
- `clue_hunt` answer salt 中的旧字符串保留，避免历史答案哈希失效。
