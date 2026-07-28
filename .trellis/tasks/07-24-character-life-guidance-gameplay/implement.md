# 角色人生抉择与成长玩法：实施计划

## Task Shape

当前任务作为规划与集成父任务，不直接承载全部实现。用户批准规划后，建议创建以下子任务：

1. **多故事内容与状态合同**
   - 更新权威文档。
   - 增加 ReviewedStory、参与 Character、Character-scoped node 与确定性 CharacterDecision。
   - 将安妮内容无兼容适配地迁入新合同。
2. **多故事运行时与长期关系**
   - 单一数据库迁移。
   - per-story progress、story-scoped run、长期 CharacterRelationship。
   - Character 可见性、幂等关系写回和新 API。
3. **Character 故事入口与跨角色对话**
   - Character 详情“命途 / 世事”。
   - story 路由、跨 Character 头像入口、按 Character 过滤时间线。
4. **林晚照第一章内部预览**
   - 长明宫 draft 内容。
   - 《封口之信》确定性节点与三个未完成结果。
   - draft allowlist、本地体验和集成验收。

依赖顺序为 1 → 2 → 3 → 4；父任务负责最终合同一致性和全链路验收。

## Before Implementation

- [ ] 用户审阅并批准 `prd.md`、`design.md` 和本计划。
- [ ] 重新运行 Trellis session context，确认“雪夜封宫”、StoryWorld runtime API 和 Character UI 任务的最新状态。
- [ ] 读取 `trellis-before-dev` 及 backend / frontend 相关 spec。
- [ ] 检查完整工作区 diff，保留当前已有改动，不覆盖 `story-world-character.tsx` 等重叠文件。
- [ ] 确认实现基线已经包含新的长明宫 StoryWorld；若仍未落地，本任务保持 planning，不从旧 `core/default_spaces.py` 补建。
- [ ] 确认下一数据库迁移编号，保证本需求版本只有一个迁移文件。
- [ ] 在获得用户明确数据库授权前，不执行数据库查询、连通性测试或迁移预检。

## 1. Authoritative Contracts

- [ ] 更新 `docs/PRODUCT_BRIEF.md`：同 StoryWorld 多故事、命途 / 世事、长期关系共享和故事进度隔离。
- [ ] 更新 `docs/FABLESPACE_SPACE_PLATFORM.md`：Character-first 多故事闭环、跨 Character 主动拜访、draft 预览边界。
- [ ] 更新 `docs/WORLD_SCHEMA.md`：ReviewedStory 子结构、StoryRun `story_id`、per-story progress、长期 CharacterRelationship、消息可见性和新 API。
- [ ] 核对 `docs/WHAT_NOT_TO_BUILD.md`：明确这不是旧通用 GameplayDefinition、故事大厅或 AI 永久状态。
- [ ] 文档先解决任何合同冲突，再开始代码。

## 2. Content Domain

- [ ] 在 `domain/story_world.py` 增加 ReviewedStory、StoryKind、StoryCharacterParticipation、CharacterDecision / DecisionRule。
- [ ] 将 StoryWorld 的唯一 entry / chapters / endings 改为 reviewed stories 集合。
- [ ] 把 Character 的 story-specific situation / opening 移入参与子结构。
- [ ] 校验 story ID、参与 Character、焦点 Character、入口、节点 Character、跨节点目标、结局和 draft / published 边界。
- [ ] published StoryWorld 可以包含 draft story，但公开 registry 投影必须过滤 draft；draft 不能使 published 内容读取到未审核正史。
- [ ] 将安妮宽街迁为一个 published story，删除依赖旧单入口字段的代码，不保留内部双轨。
- [ ] 运行内容注册表构造验证。

## 3. Persistence and Migration

- [ ] 在当时下一个迁移版本中一次完成 story ID、per-story progress 和长期关系重键。
- [ ] 更新 `story_state_models.py`、`domain/story_state.py`、`schema_comments.py`。
- [ ] 更新 Store：按 player + world + story 锁定活动轮次；按 player + world + Character 锁定长期关系。
- [ ] 关系变化、来源事件与 story 状态在同一事务提交。
- [ ] 重复 Choice 返回原投影，不重复关系变化。
- [ ] 完成摘要写入对应 story progress，不写入世界级状态。
- [ ] 未授权时只做 SQL 静态审查，不连接数据库。

## 4. Runtime and API

- [ ] 把 `application/story_worlds.py` 中 `world.characters[0]` 的隐式单角色行为清除。
- [ ] 运行时每个调用显式校验 story ID 和当前 Character。
- [ ] 消息响应上下文只读取当前 Character 可见的 StoryMessage。
- [ ] Choice 跨 Character 时投影目标 Character 卡片，不在当前页面生成目标 Character 对白。
- [ ] 实现确定性 CharacterDecision，记录规则 ID、输入 flags、结果与可观察原因，不记录模型思维链。
- [ ] 切换到 Character-first story 路由，并同步 HTTP 错误合同。
- [ ] 当前新前端迁移完成后删除世界级 run 路由引用，不增加长期别名。

## 5. Frontend

- [ ] 扩展 `app/lib/story-worlds.ts` 的 story card、story-scoped run、target Character 和长期关系类型。
- [ ] Character 详情只展示“命途 / 世事”与真实 story cards，不添加解释性副标题。
- [ ] 新增 Character story 路由并迁移对话工作区。
- [ ] 跨 Character Choice 渲染真实头像 / 名称；成功提交后才导航。
- [ ] 时间线根据事件真实 Character 显示发言者，并隐藏当前 Character 不可见事件。
- [ ] 活动 StoryRun 停在“三日后复核”时呈现当前处境，不显示“结局”“完成”或占位后续章节。
- [ ] 移动端验证 Character、当前情境、对话和跨角色入口的首屏可用性。

## 6. Draft Content and Preview

- [ ] 以新的长明宫内容为基线增加 draft Character 林晚照和 draft story《封口之信》。
- [ ] 编写林晚照稳定人格、关系规则、故事参与信息和对白边界。
- [ ] 编写林晚照 → 魏观海 → 林晚照的第一章节点。
- [ ] 编写审核建议、玩家行动、魏观海线索深度和三个 CharacterDecision 结果。
- [ ] 三个结果都指向活动节点 `review_in_three_days`，不定义临时 ending。
- [ ] 增加精确 draft story allowlist，默认关闭；公开首页始终过滤 draft。
- [ ] 不新增或提交图片二进制。若内部预览必须采用新图，另按图片资产合同生成、上传、登记 manifest 和 prompt sidecar 后再引用。

## 7. Verification

### Static and Contract Checks

- [ ] 内容注册表能够加载安妮 published story、长明宫 published 群像故事和 allowlisted draft 成长故事。
- [ ] draft 未允许时，林晚照 Character / story 的公开与私有入口均不可发现。
- [ ] story / Character / node / ending 跨世界或跨 story 引用被拒绝。
- [ ] 当前节点 Character 与消息 / Choice 路由 Character 不一致时被拒绝。
- [ ] 不可见消息不会进入另一 Character 投影或 LLM 上下文。
- [ ] 同一 Choice 重放不重复改变长期关系。
- [ ] 切换故事后各自活动节点与结局摘要保持独立。

### Required Commands

```powershell
py -3 -m compileall -q apps/api/src
npm --prefix .\apps\web run typecheck
npm --prefix .\apps\web run build
```

另运行项目实际存在的 StoryWorld 内容构造 / 引用校验入口；不得为本任务恢复 pytest 体系。

### Manual Local Preview

- [ ] 仅在本地设置精确《封口之信》story ID allowlist。
- [ ] 从林晚照进入第一章，自由对话不推进关键状态。
- [ ] 主动点击魏观海入口，确认没有在林晚照页面渲染魏观海对白。
- [ ] 魏观海只读取对其可见信息，并按关系 / 泄密行为返回对应线索。
- [ ] 返回林晚照后触发三个审核结果之一。
- [ ] 刷新后仍停在“三日后复核”，StoryRun 为 active。
- [ ] 首页和未启用预览的会话看不到林晚照。
- [ ] 在窄屏完成同一流程。

## Rollback Points

- 内容合同切换失败：在未迁移数据库前撤销本任务的新内容模型改动，不触碰已有数据。
- 迁移预检失败：停止部署，保留原表和备份，不启动新代码。
- API / 前端集成失败：不启用 draft allowlist；published 安妮与长明宫群像故事必须继续通过最小验证。
- draft 内容验收失败：保留为 draft 且不配置 allowlist，不影响公开发现。

## Final Review

- [ ] 对比版本基线到工作区完整 diff，确认本需求只有一个数据库迁移。
- [ ] 搜索并清除新增的 `/spaces`、GameplayDefinition、NPC 持久化实体或解释性 UI 文案。
- [ ] 核对没有图片二进制进入 Git。
- [ ] 记录 PASS / FAIL / BLOCKED 与新鲜命令输出。
- [ ] 用户再次审阅首个体验后，才决定是否继续第二章或完整结局。
