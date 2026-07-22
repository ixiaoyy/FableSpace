# Technical Design

## Existing evidence

- `apps/api/src/fablespace_api/core/default_spaces.py` 已定义安妮角色、世界资料和 `gp_history_broad_street_first_water`，但当前由通用 `_chapter_gameplay` 生成，只有开始、推进、完成三段。
- `apps/api/src/fablespace_api/core/public_welfare_rules.py` 为无模型或规则命中场景提供安妮确定性回复，当前仍出现“画图先生”的误导表达。
- `apps/web/app/features/space-chat-workbench/index.tsx` 已能加载 Gameplay definition/session、推进节点和持久化私聊；通用 `GameplaySessionPanel` 带有任务目标、进度等解释性界面。
- 现有聊天服务会保存消息并沿既有链路更新关系和记忆，因此不需要为剧情选择扩展数据协议。

## Data design

不修改 Gameplay Schema。为安妮单独构造现有字段组成的有向图：

```text
讨水
├─ 先核对水源 ── 安妮家的禁令 ─┐
├─ 给她别处的水 ─ 门阶上的迟疑 ├─ 证词取舍 ─┬─ 被相信（完成）
└─ 不给水但陪她 ─ 绕开宽街泵 ─┘            ├─ 一起走（完成）
                                                └─ 各自离开（完成）
```

每个节点只承载当前场景、安妮可感知的线索和下一步动作。固定历史结点在各完成节点中以同一结果收束，私人关系文案按玩家路径变化。

## Backend/content changes

1. 在 `default_spaces.py` 增加安妮专用 Gameplay 构造函数，返回当前 schema 可接受的 definition。
2. 用该 definition 替换通用 `_chapter_gameplay` 调用。
3. 收紧安妮 system prompt、World Info 与 deterministic rules：Snow 是逐户核对饮水来源的医生；地图只作为后续呈现证据的材料，不是发现神话。
4. 保留现有 Space、Character、Gameplay ID，确保旧链接和既有 session 兼容；旧 session 若节点不存在，由现有会话恢复行为降级到新 definition 起点，或在前端无法解析时重新开始。

## Frontend changes

1. 在 `history-pilot-space.ts` 集中声明安妮 Gameplay ID 与识别函数。
2. 新增安妮专用剧情组件：只展示场景正文、角色动作、可点击选择和一个轻量史料入口；不展示玩法术语。
3. `SpaceChatWorkbench` 识别安妮后自动恢复最近未完成 session；没有 session 时自动开始。
4. 安妮存在 active session 时渲染专用组件，其他 Space 仍使用通用 `GameplaySessionPanel`。
5. 点击专用选择时先把选择文字作为玩家私聊发送，再推进 session；任一步失败都显示既有错误状态，不伪造已推进结果。
6. 安妮场景隐藏桌面侧栏中的通用任务列表、开口模板及与本故事无关的公共聊天/礼物干扰；保留自由私聊输入。
7. 史料面板使用移动端全屏抽屉/覆盖层，桌面为受限宽度弹层；内容按当前节点逐步展示，不新增持久化字段。

## Historical reference model

史料条目是前端静态、经人工审阅的数据，不由运行时模型生成。每条包含：

- `kind`: `史实` / `剧情设定` / `待核验`
- 简短正文
- 来源名称与 URL（仅史实必填）
- 解锁阶段（由当前 Gameplay 节点映射）

## Failure handling

- Gameplay 自动启动失败：保留正常安妮私聊和错误提示，不能让页面空白。
- 私聊发送失败：不推进结构化 choice，避免故事状态与对话记录分叉。
- Gameplay 推进失败：已发出的玩家话保留，展示重试能力；不手工伪造 session。
- 历史来源无法打开：不影响主故事，条目仍显示来源名称。

## Compatibility

- 不改 API 路由、请求体、响应体或数据库结构。
- 不改其他角色、其他 Gameplay 的渲染和启动方式。
- 保留 SillyTavern 角色卡字段与安妮角色 ID。

## Verification

- Python 定向脚本校验 definition 正规化、所有 choice 指向存在节点、完成节点数量与误导词清理。
- `py -3 -m compileall -q apps/api/src`
- `npm --prefix .\apps\web run typecheck`
- `npm --prefix .\apps\web run build`
- 移动端 390×844 人工验收：开场、三入口、推进、自由聊天、史料开关、返回后续玩。
- 对照 PRD 与史实底稿进行对抗式自审并记录 Verdict。
