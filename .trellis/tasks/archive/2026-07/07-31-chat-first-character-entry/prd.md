# 聊天优先角色入口

## Goal

玩家从公开角色页选定审核身份后，进入 `/characters/:characterSlug/story`
立即看到可恢复、可输入的角色聊天界面，不再先阅读重复的 StoryWorld 介绍或再次
选择身份与 Character。

StoryWorld、人工审核选择、关系、记忆和历史边界继续由服务端约束；“聊天优先”只
改变玩家界面与入场步骤，不把产品改成无边界的通用聊天。

## Background

- 当前故事页在没有活动 StoryRun 时重复展示世界标题、处境、PlayerRole 和
  Character 选择，玩家在公开角色页已经完成过这些决定。
- 页面从 `character_visible_information` 特判“安妮称你……”并渲染身份徽章，
  与“称呼只在对话中自然使用”的既有合同冲突。
- 线上健康检查和公开 Character 详情可用，但登录后的私有运行加载出现通用 500；
  当前部署只检查 `/api/v1/health`，不能证明实际聊天链路可玩。
- 用户明确要求故事互动页直接呈现聊天框，不需要入场剧情介绍。

## Requirements

### R1 — 直接进入聊天

- `/characters/:characterSlug` 继续负责公开角色信息和新一轮 PlayerRole 选择。
- `/characters/:characterSlug/story` 不再渲染 StoryWorld 大标题、处境介绍、
  “壹 / 贰”步骤、重复身份卡或 Character 选择列表。
- 已有活动 StoryRun 继续从服务端恢复并直接显示时间线与输入框。
- 没有活动轮次且 URL 携带经公开详情白名单校验的 `playerRoleId` 时，登录后只自动
  发起一次 `start`；不得因 React 重渲染、失败或重试自动重复 POST。
- 没有有效 `playerRoleId` 时，不猜测多身份默认值；聊天壳提供返回角色页的简短动作。

### R2 — 聊天界面

- 首屏主体是 Character 对话时间线和固定在可达位置的输入区。
- 人工审核选择保留为聊天输入区上方的快捷回复，不另建“剧情推进”面板。
- Character 名称和关系阶段可作为紧凑聊天状态；不重复展示 StoryWorld 标题与说明。
- 历史参考继续由玩家主动展开，不占据移动端聊天首屏。
- 结局与重新开始仍可用；重新开始沿用本轮锁定 PlayerRole 并直接回到聊天，不返回
  入场向导。

### R3 — 登录、加载与失败

- 检查登录、恢复轮次、自动建档、未登录、会话过期和读取失败都在聊天壳内显示紧凑
  状态，不再替换成整屏故事介绍或大型错误卡。
- 不伪造消息、进度或可写状态。未确认 StoryRun 前输入框必须不可写。
- 写请求结果不确定时冻结写入；用户重试只读取 `runs/current`，不得自动重放 POST。
- 通用错误仍提供 `重试` 或 `登录` 等真实恢复动作。

### R4 — 清理错误称呼徽章

- `PlayerRoleOption` 不从 `character_visible_information` 提取
  “安妮称你为……”。
- 删除对应专用 CSS；称呼只保留在服务端角色演绎上下文与实际对话中。

### R5 — 边界

- 不修改 API、数据库 Schema、StoryWorld 内容、历史事实或 PlayerRole 合同。
- 不连接或查询任何数据库。
- 不把尚未取得服务器日志证据的生产 500 猜测成某个数据库或代码根因。
- 不夹带暂停中的旧 Schema 清退规划、用户 `AGENTS.md` 或 `UI稿/`。

## Acceptance Criteria

- [x] 有效 PlayerRole 链接在登录后恢复现有轮次，或只自动创建一次新轮次。
- [x] 故事页不再显示 StoryWorld 大段介绍、二次身份选择或 Character 选择步骤。
- [x] 活动轮次首屏是消息时间线、快捷回复和输入框。
- [x] 加载、登录和读取失败在聊天壳内可恢复，未确认轮次时输入不可写。
- [x] 写失败后的重试只执行访问状态与 `runs/current` 读取。
- [x] 结局后可沿用锁定身份直接重新开始。
- [x] 身份卡不再显示“安妮称你为哥哥 / 姐姐”徽章，相关死 CSS 已删除。
- [x] 前端 typecheck、生产 build、React Doctor 和 Impeccable detector 通过且无回退。
- [x] 定向移动端验收确认聊天输入可达、无横向溢出、错误状态不占满故事介绍页。
