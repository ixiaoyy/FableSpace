# P1.4 Product Prototype Pack

这些 SVG 是 `.trellis/tasks/04-22-refactor-project/full-project-design.md` 的产品/界面原型补充，不是最终视觉稿。目标是在进入 P1.4 frontend feature extraction 前，明确 native routes/features 应接管的页面信息架构。

## 视觉方向

采用 **FableMap 自有的“暖木质赛博酒馆”**：木桌、铜边、羊皮纸、烛火和手工招牌带来温暖酒馆情绪；真实地图坐标、记忆状态、运行时诊断用少量青色/紫色赛博光表达。

可借鉴的是“亲切、厚重、手工酒馆”的氛围；不能复制任何具体游戏 UI、卡背、图标、字体、英雄、法力水晶、牌桌或卡牌对战语义。FableMap 的核心仍是：真实坐标 → 店主酒馆 → AI NPC → 记忆回访。


## 多风格方向板

FableMap 不绑定单一视觉。页面信息架构原型之外，另有 [`style-directions/`](./style-directions/) 记录可选主题方向：

- 暖木质赛博酒馆
- 霓虹夜城赛博朋克
- 小清新日式恋爱漫画
- 手绘幻想小镇动画感

这些是 theme skin 输入，不改变主链路、API、权限或数据模型。

## 原型清单

1. [发现酒馆 / Discovery](./01-discover-map.svg) — 真实地图锚点、附近酒馆列表、开店入口。
2. [酒馆入口 / Tavern Entry](./02-tavern-entry.svg) — 店主设定、访问规则、NPC 选择、入场承诺。
3. [访客对话 / Chat Runtime](./03-chat-runtime.svg) — NPC 对话、上下文/记忆/Token 状态、降级反馈。
4. [店主管理台 / Owner Console](./04-owner-console.svg) — 角色、WorldInfo、Prompt/Output/Runtime、导入导出。
5. [开店向导 / Create Tavern](./05-create-tavern.svg) — 坐标、门面、首个 NPC、运行时、发布检查。
6. [移动端主链路 / Mobile Visitor Flow](./06-mobile-visitor-flow.svg) — 发现、入口、聊天、回访的窄屏一屏一任务。
7. [NPC 形象风格投放 / NPC Style Cast](./07-npc-style-cast.svg) — 不同主题下的 NPC 形象占位、酒馆室内舞台和点击切换对话对象。

## 使用方式

- P1.4 拆 `frontend/app/features/*` 时，先按这些原型决定 feature 边界和 route composition。
- 原型中的文字是信息架构约束，不代表最终 copy。
- 所有页面都必须保留项目硬边界：真实坐标、店主主权、AI 作为 NPC 引擎、店主承担 token、不泄露 owner secrets。
