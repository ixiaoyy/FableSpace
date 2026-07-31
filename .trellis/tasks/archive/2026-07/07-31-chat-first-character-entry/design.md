# 聊天优先角色入口设计

## 页面边界

公开角色页继续拥有“认识角色与选择本轮身份”；故事页只拥有“登录、恢复或建立轮次，
然后对话”。故事页不再承担世界介绍、身份目录或 Character 目录。

```text
/characters/:slug
  -> 选择审核 PlayerRole
  -> /characters/:slug/story?playerRoleId=...
  -> auth/status
  -> runs/current
       -> 有轮次：直接聊天
       -> 无轮次 + 有效 role：一次性 start -> 聊天
       -> 无轮次 + 无 role：聊天壳内返回角色页
```

## 状态与写入安全

`loadPrivateStory()` 保持纯读取恢复合同，只访问访问状态和 `runs/current`。新增的自动
入场 effect 仅在以下条件同时满足时执行：

- 登录已确认；
- 当前读取结束且没有活动轮次；
- URL 中 PlayerRole 已由公开详情白名单验证；
- 没有 pending / failed 写；
- 当前 `storyWorldId + characterId + playerRoleId` 尚未尝试。

尝试键在 POST 前写入 ref。失败后不会自动重发；`重试`仍只调用
`loadPrivateStory(true)`，若第一次 POST 已在服务端成功，GET 会恢复它。

结局后的“重新开始”直接使用 `run.player_role.id` 调用现有 `restartStoryRun()`，不再
清空页面并返回入场步骤。

## 组件结构

- `CharacterStoryHeader`：保留返回、品牌和 Character 名称。
- `StoryConversationGate`：在同一个聊天表面承载检查、加载、登录、过期、失败和缺少
  PlayerRole 状态；未确认轮次时不渲染可写输入。
- `StoryRunWorkspace`：保留时间线、快捷选择、输入框、结局和折叠参考。
- `StoryEntry`：删除。
- `PlayerRoleOption`：删除 Character 称呼提取与徽章。

活动聊天头只显示 Character 与关系状态，不重复 StoryWorld 标题。现有审核 narration
仍按事件顺序显示在时间线中，不能因界面“纯聊天”而丢失选择结果。

## CSS

复用 `story-world-character.css` 的纸张与主题 token，删除入场向导和称呼徽章的死样式。
故事页采用 header + flex chat body；移动端时间线占剩余高度，快捷回复横向或换行，
composer 保持可达。失败状态使用对话区内的小型状态，不新建卡片套卡片。

## 兼容与回滚

- 路由、API payload 和后端状态合同不变。
- 直接访问无 PlayerRole 的新轮次不会自动选错身份。
- 回滚只需恢复本任务的前端组件与 CSS；不涉及数据迁移。
- 生产 500 若仍存在，必须用 `fablelog backend` 获取异常栈后另行修复；本任务不以
  UI fallback 掩盖服务故障。
