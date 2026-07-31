# 多故事后端原子切换：实施计划

> 当前状态：规划。未获得最终规划批准前不执行以下生产代码、Schema 或迁移改动。

## Phase A — 补齐只读生产证据

- [x] 经用户批准后新增手动只读审计工作流；不进入普通 Deploy paths。
- [x] 审计脚本强制 MySQL `READ ONLY` 事务，只输出计数、ID、hash 和违规类别。
- [ ] 运行审计并保存 GitHub Actions run URL、commit、时间和脱敏报告。
- [ ] 将实际 MySQL 版本、006 / 008 状态、行数、关系冲突和消息可见性结果写回 PRD /
  design；若发现冲突，只提出一个最高价值的迁移决策问题。
- [ ] 删除已解决的 Open Question，完成 PRD convergence pass，再请用户评审精确 Schema /
  数据影响。

## Phase B — 用户批准后的内容合同切换

- [ ] 使用 `trellis-before-dev` 载入实现上下文。
- [ ] 在 `domain/story_world.py` 增加 ReviewedStory、participation、node presentation、
  CharacterDecision 和封闭 predicate；Character / StoryWorld 删除旧故事专属字段。
- [ ] 重写 Registry 的 story-scoped ID、图、发布、参与、node 与决定校验。
- [ ] 将 `story_world_codec.py` 一次切到新文档形状，不保留旧字段 fallback。
- [ ] 显式转换安妮与长明宫 Python 内容；结构外的故事文本、效果、正史、来源和版本不变。
- [ ] 更新 `ManagedStoryWorldStore` / 管理 API 摘要与完整 registry 校验。

风险文件：

- `apps/api/src/fablespace_api/domain/story_world.py`
- `apps/api/src/fablespace_api/content/story_world_codec.py`
- `apps/api/src/fablespace_api/content/annie_broad_street.py`
- `apps/api/src/fablespace_api/content/palace_snow_edict.py`
- `apps/api/src/fablespace_api/infrastructure/managed_story_content_store.py`
- `apps/api/src/fablespace_api/api/v1/admin.py`

检查点：先执行纯内容 round-trip / Registry / 历史逐字段比对；失败时不进入持久化改动。

## Phase C — 用户批准后的运行时与 ORM 切换

- [ ] 更新 `domain/story_state.py`：PlayerStoryProgress、StoryRun.story_id、世界内长期关系。
- [ ] 按 design 中精确表 / 列 / FK / check / unique 更新 `story_state_models.py` 与
  `schema_comments.py`。
- [ ] 以 `PlayerStoryStateStore` 为唯一 ORM / 事务边界，加入显式 story scope、消息可见性、
  长期关系来源和 CharacterDecision 写入；移除与应用层重复的旧持久化逻辑。
- [ ] `StoryWorldApplicationService` 只保留用例、两阶段对话快照 / 复核、策略和响应投影。
- [ ] start / current / restart / message / choice 全部核对玩家 + 世界 + story + run +
  Character；处理并发 active 唯一冲突。
- [ ] 删除静默 content_version 改写与自动换轮，加入明确 stale-run recovery。
- [ ] 让 StoryMessage 成为 Character 上下文可见性来源，StoryEvent 继续作为统一回放 / 规则
  来源。

风险文件：

- `apps/api/src/fablespace_api/domain/story_state.py`
- `apps/api/src/fablespace_api/infrastructure/story_state_models.py`
- `apps/api/src/fablespace_api/infrastructure/player_story_state_store.py`
- `apps/api/src/fablespace_api/application/story_worlds.py`
- `apps/api/src/fablespace_api/application/story_dialogue.py`
- `apps/api/src/fablespace_api/app_factory.py`

检查点：临时 SQLite FK 验证必须覆盖两个 story 并行 active、同 story 竞态、长期关系复用、
来源事件和可见性；验证脚本不得留下虚构生产数据。

## Phase D — API、Character-first 前端与后台

- [ ] 将私有 API 一次改为显式 `/stories/{story_id}/runs...`；删除旧路由。
- [ ] 同步稳定错误码：unknown/unpublished story、story mismatch、participant mismatch、
  stale content、relationship source conflict。
- [ ] 更新 `lib/story-worlds.ts` 的公开 stories 与锁定 story run 类型 / client。
- [ ] 更新 `character-routes.ts` 生成 `storyId` + `playerRoleId`，不改变稳定 slug。
- [ ] Character 详情按 story 独立 continuity，单 story 显式自动选中，多 story 明确选择。
- [ ] story route 校验两个 query ID，并保持当前 401、迟到响应、写失败冻结和只读恢复行为。
- [ ] 按 node presentation 渲染 Character / 系统 / 行动结果；实现显式 next Character 链接。
- [ ] 登录回跳白名单允许且只允许两个已校验 query key。
- [ ] 后台用 `StoriesPanel` 替代旧 `ChaptersPanel`，移动 participation 字段并支持决定结构；
  不增加说明文或通用 JSON 编辑器。
- [ ] 检查窄屏的 story 选择、双身份、聊天输入、错误恢复和跨 Character 动作。

风险文件：

- `apps/api/src/fablespace_api/api/v1/story_worlds.py`
- `apps/api/src/fablespace_api/api/v1/auth.py`
- `apps/web/app/lib/story-worlds.ts`
- `apps/web/app/lib/admin-content.ts`
- `apps/web/app/lib/character-routes.ts`
- `apps/web/app/routes/story-world-character.tsx`
- `apps/web/app/routes/character-story.tsx`
- `apps/web/app/components/admin/*`

检查点：前端 typecheck + build + React Doctor 后，再做移动端浏览器验收；不得用解释文案填补
空 / 错误状态。

## Phase E — 迁移与发布能力（只有 Schema 评审通过后）

- [ ] 创建唯一 `009_multi_story_atomic_switch` SQL 和同版本严格转换 / audit / postflight 工具。
- [ ] 009 完成 design 中全部列、表、重键、FK、check、索引和回填，不拆分第二迁移。
- [ ] 迁移转换器只接受两个固定 world 映射；实现关系三分支合并和全部阻断条件。
- [ ] 更新 `deploy.yml`，在服务器 checkout、后端和前端变更前共同检查 schema revision。
- [ ] 新增手动原子迁移 workflow：固定目标、确认短语、commit / hash、共享并发、旧镜像标签、
  全库备份、停写复检、009、postflight 和失败停机边界。
- [ ] 更新 `docs/WORLD_SCHEMA.md`、`docs/DEPLOYMENT.md` 与相关 Trellis backend/frontend
  specs；物理基线从 8 表更新为 9 表。
- [ ] 静态验证 workflow 不接受任意数据库名、SQL、主机命令或迁移路径输入。

风险 / 回滚点：

- 迁移文件创建前必须再次确认用户已批准精确 Schema 与数据回填。
- 普通 `main` Deploy 在 marker 就绪前必须同时阻止新后端与新前端。
- DDL 后失败不运行反向 SQL；保留完整 backup、hash、旧 image 和 pre-migration commit。
- 生产 apply / restore 不属于代码实现授权，分别请求明确确认。

## Phase F — 收尾验证与评审

- [ ] `py -3 -m compileall -q apps/api/src deploy/server`
- [ ] 临时 SQLite `PRAGMA foreign_keys=ON` 的完整新聚合验证
- [ ] 内建内容 codec round-trip + Registry + CharacterDecision 样例
- [ ] 安妮结构迁移历史完整性 Verdict 与逐字段 / hash 证据
- [ ] `npm --prefix .\apps\web run typecheck`
- [ ] `npm --prefix .\apps\web run build`
- [ ] changed-scope React Doctor，无分数回退
- [ ] `docker compose config --quiet`
- [ ] 迁移 / Deploy workflow 静态断言
- [ ] residual grep：旧 world 入口字段、Character 处境字段、无 story API、默认 story 推导、
  双写、启动迁移
- [ ] `git diff --check`，核对 staged / unstaged，确保不夹带父任务、`AGENTS.md` 或 `UI稿/`
- [ ] 使用 `trellis-check` 完整检查；需要时用 `trellis-update-spec` 固化新合同。

只有生产只读审计、Schema 人工批准和上述本地验证都完成后，才可把实现提交 / 推送到
`main`。生产 009 仍需单独的 apply 确认。
