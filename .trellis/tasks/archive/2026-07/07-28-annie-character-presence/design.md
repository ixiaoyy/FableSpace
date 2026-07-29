# 安妮角色表现与身份差异优化：技术设计

## 1. 目标结构

公开角色页 `/characters/annie` 从“巨幅角色介绍 + 单一身份摘要”改为轻量故事入口：

1. 紧凑页头；
2. 故事时间、地点与当前处境；
3. 安妮的小型角色在场卡，使用完整可辨认头像和开场请求，不重复首页的大幅展开；
4. 两个审核玩家身份卡：“汤姆·里德 / 莉齐·贝尔”，姓名为主信息、处境为副信息；
5. 选中身份后进入 `/characters/annie/story`，故事页预选同一身份；
6. 故事页继续负责登录、恢复活动轮次、选择首个对话 Character 和启动 StoryRun。

页面必须同时适配一个到多个 Character 和两个 PlayerRole；安妮世界当前只有一个
Character，因此不添加占位人物。

## 2. 内容合同

- 为宽街 StoryWorld 定义两个稳定 PlayerRole ID。
- 两个身份年龄均为比安妮年长的年轻人，职业处境为苏活区街巷跑腿零工，能力边界一致。
- `character_visible_information` 明确安妮分别称玩家为“哥哥 / 姐姐”，运行时模型只能根据
  锁定身份使用称呼。
- 两个身份共享当前故事图、选择、关系阶段和结局。
- 更新 `content_version`，并同步历史内容注册表中的玩家设定条目与引用 ID。
- 不新增客户端自定义身份、称呼、性别或能力输入。

## 3. 前端状态传递

- 公开角色页使用本地状态选择公开 API 返回的 `player_role.id`。
- 进入故事页时只把审核 ID 写入查询参数，例如
  `/characters/annie/story?playerRoleId=<published-id>`。
- 故事页从查询参数读取候选 ID，并以 `detail.player_roles` 白名单校验；未知 ID 被忽略。
- 活动 StoryRun 恢复后始终使用服务端返回的锁定身份，查询参数不得覆盖。
- 匿名登录跳转保留当前故事 URL 与查询参数；后端安全白名单只额外接受一个格式受限的
  `playerRoleId`，其他查询参数、编码路径和外部 URL 仍回退到首页。

## 4. 视觉方向

- 保留现有纸张、墨色、雨夜橙色强调色，不照搬 Figma 中已变形的大图。
- 安妮使用小型竖向角色卡或圆角肖像，`object-fit: cover` 并指定稳定焦点，保证脸部完整。
- 身份卡以头像、身份名、简短角色钩子和安妮称呼构成；移动端两列并排，窄屏仍可读。
- 主 CTA 必须反映当前选择；未选择时给出明确提示，不用禁用得像故障。
- 尊重 `prefers-reduced-motion`，键盘焦点与 `aria-pressed` 状态可辨认。

## 5. 图片资产

- 生成“汤姆·里德 / 莉齐·贝尔”两个同系列半身头像。
- 风格与现有安妮、长明宫角色资产的历史绘本质感协调，但不复制具体人物。
- 采用项上传到 `fablespace/media/v1/` 不可变 key，登记
  `deploy/cdn/media-manifest.json`，并为每张 Character 相关头像提供 prompt sidecar。
- Git 不保存图片二进制；代码只引用登记后的 HTTPS URL。

## 6. 兼容与风险

- 当前运行时注册表只保留一个 StoryWorld 内容版本，既有旧版本活动轮次在任何版本升级后
  都可能返回 `content_version_unavailable`；本任务不伪造旧身份映射，也不在未获数据库授权
  时探测生产记录。
- 前端对查询参数做白名单校验，避免绕过服务端 PlayerRole 校验。
- 若对象存储凭据不可用，则不得把本地生成图直接提交或引用；任务应报告资源发布阻塞。

## 7. 验证

- 内容注册表加载与安妮故事节点、选择、结局计数校验。
- `py -3 -m compileall -q apps/api/src`。
- `npm --prefix .\apps\web run typecheck`。
- `npm --prefix .\apps\web run build`。
- 移动端与桌面定向截图验收：无巨幅裁切、身份可选择、安妮头像完整、CTA 状态正确。
- manifest key、URL、尺寸、格式、SHA-256、sidecar 和 Git 图片二进制为零。
