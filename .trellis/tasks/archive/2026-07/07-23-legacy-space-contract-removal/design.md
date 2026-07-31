# 技术设计：删除旧 Space 合同与路由

## 当前与目标数据流

当前首页仍使用过渡链路：

```text
home route
  -> home-story-collection
  -> history-pilot-space / launch-story-spaces
  -> lib/spaces.getSpace
  -> GET /api/v1/spaces/{space_id}?view=entry
  -> SpaceApplicationService
  -> SpaceStore / MySQLSpaceStore
```

目标链路只复用已经存在的公开 Character 详情：

```text
home route
  -> home-story-collection
  -> CHARACTER_ROUTES
  -> lib/story-worlds.getStoryWorldCharacter
  -> GET /api/v1/story-worlds/{story_world_id}/characters/{character_id}
  -> StoryWorldApplicationService.detail
  -> reviewed/managed StoryWorld registry
```

不增加聚合发现端点。`characterSlug` 仍只属于前端稳定路由注册表；后端继续只接收
`story_world_id` 与 `character_id`。

## 前端合同

### 首页集合

`home-story-collection.ts` 改为返回精确的 Character-first 集合：

- 对 `CHARACTER_ROUTES` 中每个已审核映射调用现有详情 client；
- 校验响应的 StoryWorld ID 与 Character ID 必须等于注册表映射；
- 只向首页组件传递详情响应中的公开 StoryWorld/Character 投影；
- 任一映射缺失或错配时进入真实 error 状态，不拼接占位角色。

首页组件从 `Space[]` 改为 Character-first 数据。现有三个角色的视觉 presentation、
轮播、移动端布局和规范 Character 链接保持不变，本任务不做视觉重设计。

### 删除项

以下文件没有新主线消费者，随旧合同删除：

- `lib/spaces.ts`
- `lib/history-pilot-space.ts`
- `lib/launch-story-spaces.ts`
- `lib/homepage-spaces.ts`
- `lib/space-first-minute.ts`
- `lib/anonymous-visitor.ts`
- `lib/visitor-play-identity.ts`

`history-pilot-space.ts` 中无运行消费者的本地史料投影不作为权威来源保留；当前
StoryWorld 内容与 `StoryRun.historical_reference` 才是运行时来源。

## 后端组合与路由

- v1 router 只挂载 system、auth、story-worlds 和 admin。
- `app_factory` 不再创建 Space store/service，不再写
  `app.state.spaces`。
- 私密访问 gate 保留公开 Character 详情匹配，删除只为两个旧 Space entry
  放行的 path、ID 和 public reference code。
- 删除旧 `/spaces` entry/chat/group-chat/gameplay routers、其 contracts、
  `SpaceApplicationService` 与三个旧 service mixin。
- `infrastructure/storage.py` 只保留新数据库和迁移器仍使用的 database URL
  解析/脱敏，不再选择 JSON/Space store。

## 旧领域依赖岛

引用审计显示，下列模块只由旧 Space store/service 链路使用，且不被
StoryWorld 内容、对话、管理后台或认证复用，因此整体删除：

- `core/space.py` 及 `fixture_retirement.py`
- 旧 affinity、continuity、gameplay、group-chat、memory、prompt、
  state-card、visitor identity 等辅助模块
- `domain/group_chat_policy.py`、`memory_atom_policy.py`、
  `public_reference.py`、`space_policy.py`
- `infrastructure/mysql_space_store.py`

必须保留：

- `core/llm_clients.py`：新 StoryWorld bounded dialogue 使用；
- `core/media.py`：审核内容的媒体 URL 使用；
- `core/default_spaces.py`：仅旧物理数据迁移器暂时使用，归后续 Schema/config
  清退任务；
- `infrastructure/models.py`、历史 SQL 与迁移器：本任务不获准修改物理 Schema。

## 迁移器解耦

`migrate.py` 与 `migrate_database.py` 当前只为 `create_mysql_tables()` 导入
整个 `mysql_space_store.py`。实施时把该函数及其兼容列辅助逻辑移动到单独的
legacy Schema 基础设施模块，并显式注册旧 ORM models：

- 迁移器改为从新模块导入；
- 不保留 `MySQLSpaceStore` / `MySQLTavernStore` alias；
- 不改变 SQL、列检测、建表顺序或异常行为；
- 不执行迁移器，不连接数据库。

这个模块是后续物理 Schema 清退的明确所有权边界，不是新的产品兼容层。

## 包执行入口

删除 `core/api.py` 与 `core/web/` 第二套应用组合。顶层 `__main__.py` 直接加载
环境并通过 uvicorn 启动原生 `fablespace_api.main:app`，保留一个可执行入口，
不再维护旧静态路由或旧 `stories/...` alias。

## 文档与规范

- `docs/WORLD_SCHEMA.md` 记录应用 Space 合同已经删除，只有物理 Schema/config
  清退仍待后续任务。
- backend/frontend directory、index、type-safety 规范删除已经失效的
  “legacy runtime still exists” 描述。
- database guideline 将旧坐标 adapter 的执行规范收束为历史记录和待清退
  物理 Schema 边界，不再引用已删除的 `Space`/`MySQLSpaceStore` 方法。

## 兼容性与回滚

- `/api/v1/spaces/...` 将直接变为 404；这是明确清退，不提供 redirect 或 alias。
- 现有 `/api/v1/story-worlds/...` 响应和私有 StoryRun 行为不变。
- 不修改数据库和用户文件。应用回归可精确 revert 本任务代码提交。
- 若发现外部未审计消费者仍调用 `/spaces`，停止删除并报告证据；不得临时恢复
  双轨兼容器。

## 风险

- 托管数据库中的实际 StoryWorld 发布内容未检查，因为用户未授权数据库访问；
  无数据库验证只能确认代码注册表和公开详情合同包含三个 P0 角色。
- 抽离 Schema helper 若遗漏 ORM 注册会破坏后续迁移工具的空库 metadata；
  通过静态导入审计和无数据库 metadata 表名检查验证，不执行数据库连接。
- 大量文件删除可能留下动态导出或 staged snapshot 残留，必须同时检查工作树、
  staged index 和 Python import graph。
