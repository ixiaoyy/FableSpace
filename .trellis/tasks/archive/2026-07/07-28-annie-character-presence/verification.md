# 安妮角色表现与身份差异优化：验收记录

## Verdict

PASS。发布内容、身份边界、故事图、图片溯源、前端构建及移动端交互均通过本轮新鲜验证。
按仓库约束未连接数据库；StoryRun 新建、重开与恢复通过现有服务端代码路径和共享故事图做静态核对。

## 历史内容对抗式自审

- `史实`：本轮未修改日期、地点、真实人物行动、来源或固定公共结果。
  `FIXED_HISTORY_RESULT` 与全部 `fixed_fact` 条目保持不变。
- `剧情设定`：新增内容仅为原创儿童安妮的短句、停顿、陶罐动作、目光与纸页决定；
  没有把安妮写成真实人物，也没有新增真实人物原话、私密动机、确定性接触或历史因果。
- `待核验`：发布世界仍不包含 `needs_verification`；本轮没有把来源不足内容升级为事实。
- 玩家后果仍只改变安妮的关系、同行方式和是否让玩家协助表达；泵柄移除时间、
  Snow 的既有调查和暴发已经开始减退的公共结果不受分支影响。

Verdict：PASS。

## 结构与身份

- Registry 与 codec 往返通过。
- 安妮世界保持 1 章、15 节点、30 选择、5 结局；15 个节点和 5 个结局全部可达。
- 两个 PlayerRole 共用同一故事图，所有选择均无性别专属前置或阻断标记。
- 客户端只传 `playerRoleId` / `player_role_id`；称呼、性别、背景和能力继续来自服务端审核内容。
- 活动轮次仍以 `StoryRun.player_role_id` 为准，查询参数不能覆盖已锁定身份。

## 图片资产

- Tom Reed：CDN 读取 34,636 bytes，SHA-256
  `fd87de98e556fc94f2324e0cf2f0e880332e787f0f76701e19736c3f03ad31c1`，与 manifest 和 sidecar 一致。
- Lizzie Bell：CDN 读取 33,328 bytes，SHA-256
  `e7a83aef024a5e9bb856e76a2ea3ff69aeaf779bb5d18f7b5f3062ae778da0ac`，与 manifest 和 sidecar 一致。
- Git 未新增图片二进制；本轮未生成新图片。`.codex/generated_images/07-28-annie-player-roles/`
  中既有采用稿均已对应 CDN 不可变对象。

## 交互验收

- 390 × 844：无横向溢出；开场、安妮首句和可执行选择按顺序出现。
- 提交审核选择后，时间线按“你的选择 → 安妮动作 / 短句”显示，并自动滚动到最新回应。
- 关系状态由“安妮 · 试探”更新为“安妮 · 同行”，只展示态度和变化原因，不展示 affinity。
- 桌面端双栏布局、参考资料侧栏和故事时间线正常；浏览器控制台无错误。

## 命令

- `py -3 -m compileall -q apps/api/src`：PASS
- StoryWorld Registry、codec、节点 / 选择 / 结局计数与可达性脚本：PASS
- `npm --prefix .\apps\web run typecheck`：PASS
- `npm --prefix .\apps\web run build`：PASS
- `npx -y react-doctor@latest . --verbose --diff`：PASS，100 / 100
