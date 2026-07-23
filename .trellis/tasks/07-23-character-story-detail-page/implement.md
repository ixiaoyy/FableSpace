# 安妮故事垂直链路执行计划

## 0. 启动门槛

- [x] 用户确认只做安妮，不横向扩展其他角色。
- [x] 用户确认真实数据垂直切片，不做视觉壳或旧 Space 适配。
- [x] 用户确认最小闭环包含自由回应、人工选择、一个结局、刷新恢复和重新开始。
- [x] PRD 已完成 convergence pass，无未决产品问题。
- [x] `task.py start` 后才修改业务代码、Schema 和权威文档。

## 1. 内容与历史核验

- [x] 构造安妮唯一发布 StoryWorld、固定“乞丐” PlayerRole、章节、选择、关系规则和结局。
- [x] 记录固定史实、剧情设定和来源分层。
- [x] 运行 StoryWorldRegistry 校验。
- [x] 按历史完整性规范完成对抗式自审，记录 Verdict 与证据。

## 2. 后端公开与运行时

- [x] 新增安妮系统内容注册表和玩家可见投影。
- [x] 新增最小运行时领域对象、四张 ORM 表和 Schema 注释。
- [x] 新增唯一 `004_annie_story_runtime.sql`。
- [x] 实现服务端匿名 Cookie 身份解析。
- [x] 实现详情、创建/恢复轮次、自由消息、人工选择、当前轮次和重新开始 API。
- [x] 实现窄系统 LLM responder；无配置时受控失败，验证时可注入 fake responder。
- [x] 在 app factory 注册依赖和路由，不修改旧 Space 行为。

## 3. 前端

- [x] 新增 StoryWorld Character API client 和数据类型。
- [x] 新增 `/story-worlds/:storyWorldId/characters/:characterId` 路由。
- [x] 实现详情、运行、结局、加载、未找到和错误状态。
- [x] 首页只更新安妮的主动作；其他两个角色保持不变。
- [x] 确认不读取或写入 `VisitorPlayIdentity`。
- [x] 完成 360px 和桌面响应式布局、键盘焦点、对比度和 reduced-motion 处理。

## 4. 文档

- [x] 同步 `docs/WORLD_SCHEMA.md` 的事件嵌套、匿名边界和本轮持久化合同。
- [x] 同步相关 API/玩家链路权威文档；不把一次性实现日志写入 docs。

## 5. 定向验证

- [x] `py -3 -m compileall -q apps/api/src`
- [x] 临时 SQLite：创建状态 → 开始 → 自由消息(fake responder) → 选择 → 结局 → 刷新恢复 → 重新开始。
- [x] 验证另一匿名玩家看不到前一玩家状态。
- [x] 验证旧 choice、非法 choice、完成轮次写入、内容版本和零继承。
- [x] 验证公开详情不含 secret、隐藏正史、LLM 配置和玩家私有数据。
- [x] 验证 Schema 注释完整且本需求只有一个新增迁移。
- [x] `npm --prefix .\apps\web run typecheck`
- [x] `npm --prefix .\apps\web run build`
- [x] 对照完整 diff 确认未触碰魏观海、萧明珠和工作区既有无关改动。

## 6. Review Gates

- [x] 首页到结局的真实链路只依赖 StoryWorld 新合同。
- [x] 自由输入不能推进关键状态；只有已发布选择可以改变节点、关系、标记和结局。
- [x] 固定历史事实不可由 API、选择或 LLM 写回改变。
- [x] 客户端不能提交 player ID、PlayerRole、关系数值或任意状态对象。
- [x] 无假对白、假记忆、占位角色或旧 Space 数据兜底。
- [x] 历史审查、后端定向验证、前端 typecheck/build 均有本轮新鲜输出。

## 7. 历史内容对抗式自审

**Verdict: PASS**

- 固定史实仅保留“1854 年 9 月初宽街一带严重暴发并围绕公共水泵调查”和“泵柄干预发生时致命发作数已经开始下降”。依据为 John Snow 1855 年第二版、圣詹姆斯教区霍乱调查委员会 1855 年报告，以及 Henry Whitehead 1862 年回顾；均使用 Wellcome Collection 馆藏页作为可追踪入口。
- 安妮、乞丐玩家、陶罐异味、街坊观察和双方对话全部标为 `story_setting`，不冒充真实儿童、真实证词或史料原话。
- 所有分支只改变安妮对玩家的信任、是否离开水泵和私有结局摘要；没有阻止、促成、提前或替代真实历史事件。
- 系统 prompt 按 `fixed_fact` / `story_setting` 显式携带分类，禁止模型新增正史、节点、关系、标记或结局；模型输出只作为可观察角色回复。
- 页面复用代码生成的氛围插画，没有把泵的具体外观作为史实陈述；发布内容不含 `needs_verification`。

## 8. 新鲜验证记录

- `py -3 .trellis/tasks/07-23-character-story-detail-page/verify_annie_vertical_slice.py` → `PASS: Annie detail -> dialogue -> choices -> ending -> restore -> restart`
- `py -3 -m compileall -q apps/api/src` → 通过。
- `npm --prefix .\apps\web run typecheck` → 通过。
- `npm --prefix .\apps\web run build` → 通过。
- `npx -y react-doctor@latest . --verbose --diff` → 88/100、0 error；仅剩首页既有的 prop 变化后同步选择状态提示，本轮新增页面无告警。
- 浏览器：1280px 与 360px 均走通详情、两次审核选择、结局和刷新恢复；360px `documentScrollWidth=345 < innerWidth=360`，控制台 0 error/warning。
