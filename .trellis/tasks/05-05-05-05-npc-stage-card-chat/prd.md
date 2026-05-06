# NPC Stage Card in Tavern Chat

## Context

当前 `/tavern/:id` 的 SillyTavern-style 酒馆详情页左侧 NPC 列表和中间聊天头部都只使用 48px 小头像。用户确认这会让已制作的 NPC 素材展示价值过低，选择方案 A：在不破坏“进来就聊天”的主链路前提下，把当前选中 NPC 在聊天区顶部舞台化展示。

## Goals

- 保持现有三栏聊天工作台：左侧快速选择 NPC，中间聊天，右侧折叠酒馆信息。
- 将中间聊天区顶部从 48px 小头像升级为当前 NPC 舞台卡，使用约 96–128px 的头像/立绘展示。
- 舞台卡展示当前 NPC 名称、AI/玩家扮演模式、性别、可对话状态和简介/第一句话摘要。
- 补上右侧“当前 NPC 资料”区域，展示更大的角色图、简介、第一句话和可用表情缩略图。
- 补上左侧“NPC 吧台席位 / 画廊”紧凑区域，让访客在列表之外也能看到多名角色素材并快速切换。
- 移动端/窄屏保持聊天主线优先：舞台卡横向压缩，不引入额外首屏阻塞。
- 不新增 backend schema/API，不改持久化角色字段，不新增依赖。

## Non-goals

- 不制作或替换新的 NPC 图片资产。
- 不实现独立路由级 NPC 画廊页面；本次只在当前酒馆工作台内补紧凑展示。
- 不改变 owner/visitor 权限、聊天发送逻辑或历史加载逻辑。
- 不把 fallback 展示图写回 `TavernCharacter`。

## Acceptance

- `frontend/app/features/tavern-chat-workbench/index.tsx` 中当前 NPC 头部呈现大图舞台卡，而左侧列表仍保留快速选择。
- 左侧存在可点击的 `NPC 吧台席位` 紧凑画廊，切换目标与普通 NPC 列表一致。
- 右侧存在默认展开的 `当前 NPC 资料`，包含角色大图、简介/第一句话和表情缩略。
- 已有 `data-chat-workbench="sillytavern-style"`、`NPC 角色列表`、`聊天记录` 可访问区域保留。
- 窄屏布局不出现明显横向溢出，输入框仍可达。
- 前端至少通过 `npm --prefix .\frontend run build`。
- 如可运行本地浏览器，自验收桌面和窄屏截图并记录路径；否则如实说明阻塞。
