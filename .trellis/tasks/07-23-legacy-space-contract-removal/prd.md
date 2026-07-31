# 删除旧 Space 合同与路由

## Goal

在已可用的 Character-first StoryWorld 主链路上删除旧 Space 领域合同、公开 API、前端客户端和兼容入口，不保留新旧双轨。

## Background

- 公开 Character 详情和故事运行时已经使用
  `/api/v1/story-worlds/{story_world_id}/...`，前端规范路径已经是
  `/characters/:characterSlug` 与 `/characters/:characterSlug/story`。
- 首页仍通过 `lib/spaces.ts` 请求两个旧 Space entry，并把
  `Space.characters` 转为安妮、魏观海和萧明珠的角色卡。
- 生产 `app_factory.py` 仍创建 `SpaceApplicationService`，v1 router 仍挂载
  `/spaces` 下的 entry、chat、group-chat 和 gameplay 路由。
- `python -m fablespace_api` 仍进入 `core/api.py` 与 `core/web/` 的第二套旧
  FastAPI 组合入口；生产 Docker 已使用 `fablespace_api.main:app`。
- 旧数据库迁移器只为建表/兼容列处理而导入 `mysql_space_store.py`。这段
  Schema 辅助逻辑需要先与运行时 store 解耦，物理表、列和迁移本身仍归后续
  `07-23-legacy-schema-config-removal`。
- 本任务不连接数据库，不创建或修改迁移，也不删除任何现有数据。

## Requirements

- 首页改为由 `character-routes.ts` 中已审核的稳定映射读取现有公开
  StoryWorld Character 详情；不得新增 Character Schema 字段、前端
  `/story-worlds/...` 深链或第二套发现 API。
- 删除 `/api/v1/spaces` 下的 entry、chat、group-chat、gameplay 路由及其
  Pydantic contracts、应用服务和 `app.state.spaces` 组合。
- 删除 `Space`、`SpaceCharacter`、`VisitorState`、`SpaceStore` 及
  `Tavern*` 兼容别名；删除只服务于该旧运行时的 prompt、memory、gameplay、
  group-chat、visitor identity 和 policy 模块。
- 删除前端 `lib/spaces.ts`、匿名 visitor、`play_identity`、旧首页 Space
  loader 及无消费者的 Space 工具；首页继续呈现真实加载、空、失败和重试状态。
- `python -m fablespace_api` 必须改为启动原生 `app_factory` 主线，不能继续
  进入 `core/web` 兼容应用。
- 将旧迁移器仍需的建表与兼容列辅助逻辑原样隔离到基础设施 Schema 模块；
  不允许借机改变表、列、数据或迁移行为。
- 同步 `docs/WORLD_SCHEMA.md` 和 Trellis 前后端规范，使文档不再把已删除的
  Space 运行时、`lib/spaces.ts` 或旧 adapter 当作当前代码。

## Out of Scope

- 删除或修改旧数据库表、列、索引、SQL 迁移、ORM model 或历史数据。
- 清退 `FABLEMAP_*`、旧 database URL alias、storage backend、Compose 或
  部署配置；这些属于后续 Schema/config 子任务。
- 改变 StoryWorld、Character、PlayerRole、PlayerStoryState、StoryRun
  Schema、内容或私有运行时行为。
- 首页视觉重设计、首页内容配置、世界目录、占位角色或新的 UI/状态依赖。
- 恢复 pytest、增加第三方依赖或连接任何数据库做验证。

## Acceptance Criteria

- [x] 首页只通过现有公开 StoryWorld Character 详情读取三个 P0 角色，并继续使用规范 Character 短路由。
- [x] 生产 router、应用组合和包执行入口均无可达 `/spaces`、中文 Space 路由或旧 Space 服务。
- [x] 运行时代码不再定义或导入 `Space`、`SpaceCharacter`、`VisitorState`、`SpaceStore` 或 `Tavern*` 兼容别名。
- [x] 前端不再包含 `lib/spaces.ts`、匿名 visitor、`play_identity` 或旧 Space loader 消费者。
- [x] 旧物理 Schema、迁移和配置命中已逐项归属后续任务；普通地名、历史内容和产品禁止性文档不被误删。
- [x] Python compile、无数据库路由/内容验证、前端 typecheck/build、React 检查和 staged snapshot 残留审计通过。
