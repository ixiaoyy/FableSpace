# 实施计划：删除旧 Space 合同与路由

## 修改顺序

1. 迁移首页读取链路
   - 把 `home-story-collection.ts` 改为基于 `CHARACTER_ROUTES` 和
     `getStoryWorldCharacter()` 读取公开角色详情。
   - 增加 StoryWorld/Character ID 错配校验和精确集合类型。
   - 将 `home.tsx` 与 `home-character-discovery.tsx` 改为消费
     Character-first 数据，保持现有视觉、交互、空/错/加载状态。
   - 删除旧 Space client、loader、匿名 visitor、`play_identity` 和孤立工具。

2. 关闭旧后端运行入口
   - 从 v1 router 删除 spaces/chat/gameplay。
   - 从 `app_factory.py` 删除 Space store/service、public entry gate 和
     `app.state.spaces`。
   - 将 `infrastructure/storage.py` 收窄为 database URL
     解析/脱敏模块。

3. 保留迁移工具后删除旧依赖岛
   - 把 `mysql_space_store.py` 末尾的旧 Schema 建表/兼容列逻辑原样抽到独立
     基础设施模块。
   - 更新 `migrate.py`、`migrate_database.py` 和 infrastructure exports，
     但不执行迁移或数据库检查。
   - 删除旧 API contracts、Space application/services、Space store、
     legacy alias 及只被它们引用的 core/domain 辅助模块。

4. 统一包入口
   - 让顶层 `__main__.py` 启动原生 ASGI app。
   - 删除 `core/api.py`、`core/web/app.py`、`core/web/config.py` 和旧包导出。

5. 同步权威文档与开发规范
   - 更新 `docs/WORLD_SCHEMA.md` 的迁移状态。
   - 更新 backend/frontend index、directory、type-safety 与 database
     guideline 中已失效的旧运行时描述。

## 验证

1. Python 语法：

   ```powershell
   py -3 -m compileall -q apps/api/src
   ```

2. 无数据库 API/内容验证：
   - 导入 `api_router` 并断言 route paths 不含 `/spaces`，且现有
     StoryWorld Character/detail/run 路由仍在；
   - 读取审核内容注册表并断言发布世界包含注册表映射的安妮、魏观海和萧明珠；
   - 导入 legacy Schema helper，确认旧 ORM metadata 注册完整，但不创建 engine、
     session、表或数据库文件。

3. 前端类型与构建：

   ```powershell
   npm --prefix .\apps\web run typecheck
   npm --prefix .\apps\web run build
   ```

4. React changed-scope 检查：
   - 对首页 route/component 运行 React Doctor；
   - 不接受分数回退或新增可访问性/状态流问题。

5. 残留与依赖审计：
   - 搜索 `/spaces`、`SpaceCharacter`、`VisitorState`、`SpaceStore`、
     `Tavern*` alias、`play_identity`、anonymous visitor 和旧中文路由；
   - 对保留的 `space_id`/Space 命中逐项归类为历史内容、禁止性文档或后续
     Schema/config 任务拥有的 ORM/SQL/迁移/部署残留；
   - 重新计算 `fablespace_api.main` 可达 import graph，确认旧运行时模块不可达。

6. staged snapshot：

   ```powershell
   git diff --cached --check
   git diff --check
   git grep --cached -n "/api/v1/spaces\|SpaceCharacter\|VisitorState\|SpaceStore" -- apps
   npm --prefix .\apps\web run typecheck
   npm --prefix .\apps\web run build
   ```

   若 `apps/web/` 存在能掩盖 staged snapshot 的未暂存依赖，先停止提交并修正范围。

## 评审门

- 实施前由用户确认本 PRD、设计和实施计划。
- 若要求同时删除旧表、列、ORM models、SQL、环境别名或部署配置，停止本任务，
  转入 `07-23-legacy-schema-config-removal`，先提交精确 Schema 影响、备份与回滚
  方案并取得人工批准。
- 若必须访问托管数据库确认发布内容，先说明缺口并取得用户明确授权。

## 暂存与提交

- 生产代码确认属于本任务后立即暂存；规划文档不在实施前自动暂存。
- 验证通过后再暂存权威文档与 Trellis 规范，核对完整 staged diff 后创建本任务
  单一代码提交。
- 不暂存或修改用户现有的 `AGENTS.md` 与 `UI稿/`。

## 回滚点

- 本任务不接触数据库、媒体对象或用户文件；失败时只精确 revert 本任务提交。
- 不使用整文件 restore/reset 覆盖工作区已有改动。

## 历史内容完整性复核

**Verdict: PASS**

- 删除的是无运行消费者的 `history-pilot-space.ts` 前端重复投影；权威
  StoryWorld 内容、`StoryRun.historical_reference`、史实分层与来源均未修改。
- 无数据库验证确认审核内容注册表仍发布 1854 年宽街，并包含安妮的稳定
  StoryWorld / Character ID。
- 本任务没有新增或改写史实、剧情设定、待核验内容、真实人物言行或历史结果。
