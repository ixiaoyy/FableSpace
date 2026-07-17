# 首页真实角色、ASCII 路由与数据状态

## Goal

让首页明确区分“当前账号用户”“玩家的私有游玩身份”和“故事中的 NPC”，恢复既定的三座系统故事 Space / 六个核心角色作为首发发现内容，并把所有对外浏览器 URL 收敛为 ASCII 路由。任何加载、空、失败或筛选状态都不得用测试 Space、“等待真实空间”卡片或伪造数据补位。

## Background

- 用户已明确首发内容不是任意三个空间，而是此前定义并已落入产品文档、Trellis 任务和后端种子的三座故事 Space：
  - `story_palace_snow_edict` / 长明宫·雪夜诏书：魏观海、萧明珠；
  - `story_ghost_foxfire_debt` / 青槐驿·狐火借命：绯月、宁怀书；
  - `story_campus_last_class` / 临川大学·最后一堂课：沈清禾、顾野。
- 该契约已记录在 `.trellis/tasks/07-16-three-world-six-character-seeds/`、`.trellis/tasks/07-16-character-first-story-worlds/`、`docs/PRODUCT_BRIEF.md` 和 `apps/api/src/fablespace_api/core/default_spaces.py`；本任务继承该定义，不重新发明首发角色。
- 当前首页通过 `/api/v1/spaces` 获取持久化公开 Space，再按响应顺序截取少量角色。截图中的“阿珀 / 验收店员 / 茶博士”与历史 API / 验收 fixture 的名称和 Space 标识吻合，但在核对当前数据库的精确 `space_id / owner_id` 前，只能视为疑似残留，不能按名称直接删除。
- “顾野”是六个正式首发角色之一，不是应被清理的测试角色。
- 2026-07-18 使用现有 Chrome 登录态只读核对线上页面，首页实际展示“公开星港 / 阿珀”“主链路验收空间 / 验收店员”“纪念币茶馆 / 茶博士”和正式角色顾野；默认 `/空间` 发现页还展示了 `Continuity Tavern / Logic`、`Episode Export Tavern / Keeper` 等验收内容。这证明错误内容已进入当前公开发现，不只是代码层推测。
- 首页右上角已有布局预留，但实际渲染树没有展示真实账号；草稿用户组件仍包含 `USER_07`、“星野奈奈”等示例数据。
- 首页还存在虚构相对时间、把 Space 描述包装成“记忆”、固定世界统计和固定回访角标，造成数据主体和真实性混乱。
- 本任务修复的是首页数据可信度、首发内容优先级和主体语义，不新增 Schema，也不把首页改成创作者后台。
- 当前 `apps/web/app/routes.ts` 和 `apps/web/app/lib/web-routes.ts` 把 `/空间`、`/我的家`、`/店主` 等中文路径定义为 canonical，已有 `/discover`、`/quests` 等 ASCII 路径反而经 `legacy-web-route.tsx` 重定向到中文路径，迁移方向与本任务目标相反。
- 当前 URL hash 也以 `#空间主线`、`#发现主线` 等中文值作为 canonical；ASCII hash 被映射回中文，必须与 pathname 一并反转。
- `discover.tsx` 通过访客可控的 `?view=expanded` 在三座首发集合与通用 `listSpaces()` 之间切换。截图中的“纪念币茶馆 / Continuity Tavern / Episode Export Tavern”证明该参数会把历史验收内容重新暴露到访客发现页。
- 组件仍保留 `等待真实空间 N`、`待开放`、`等待空间同步` 等可生成假卡片的分支。集合状态虽已有独立面板，但 ready 卡组件仍接受缺失 Space，状态边界没有形成类型与渲染契约。

## Requirements

### 1. 既定三世界六角色是首发发现源

- 三座系统故事 Space 必须保持 `public + open`，所有权保持 `system_public_welfare`，并继续使用既定 Space / Character ID。
- 首页“想见的人”和默认 `/空间` 访客发现必须以三座正式首发 Space 为数据集合；首页完整展示六个正式角色及各自所属 Space，不得只取前四个任意公开角色。
- 创作者 / owner 的显式展开视图继续按既有权限展示其可管理内容；首发集合收敛不得删除或伪装用户内容。
- 六个角色的名称、角色卡、所属 Space 和进入链接必须来自真实 API / 持久化记录；前端不得复制一套角色文案作为假数据兜底。
- 真实的其他公开内容不得被冒充为当前用户创建内容；若当前产品阶段尚未定义其首页排序，不得让历史测试 / 验收 fixture 排在六个首发角色之前。
- 请求失败、加载中和零数据必须使用各自的真实状态，不得用“等待角色入住”或示例角色掩盖。

### 2. 疑似测试数据必须先核实后可逆退役

- 数据操作前必须读取当前持久化记录，确认精确 `space_id`、`owner_id`、`access`、`status`、角色 ID / 名称和可用时间字段。
- 只有与已知历史 fixture 的完整签名同时匹配时才可退役：固定 Space ID、测试 owner、Space 名称、`public + open` 状态，以及至少一个固定 Character ID / 名称。退役仅设置 `access=private`、`status=closed`，不得删除历史记录。
- 不得按“阿珀 / 验收店员 / 茶博士”等名称过滤、删除或隐藏记录。
- 同 ID 但 owner 不匹配、以及任何用户所有的内容必须保持不变。
- 清理路径必须幂等，且不能改变三座正式系统故事 Space。

### 3. 右上角展示真实账号用户

- 右上角代表账号用户，数据只能来自既有会话状态；显示 `display_name || username`、真实头像，缺少头像时使用真实名称首字。
- 联动登录返回真实用户时显示账号信息；独立 legacy 模式没有可信账号时显示“访客模式 / 独立模式”。
- 加载失败不得伪装成访客；应显示账号状态暂不可用。
- 不得使用 URL owner、浏览器 visitor ID、私有游玩身份或硬编码 ID / 头像冒充账号。
- “男 · 乞丐”等只保留为私有游玩身份，必须与账号用户和 NPC 在文案、位置上明确区分。

### 4. 首页附属模块只能展示真实信息

- 移除硬编码示例账号、伪造相对时间、伪造“最近记忆”、固定世界统计、固定回访角标和无数据来源的通知红点。
- “空间回声”如继续存在，必须改成不含伪时间的真实 Space / 角色入口语义。
- 公共首页不得接入跨访客的最近对话来伪装私有记忆。
- 统计如保留，只能使用真实平台统计，并采用与接口实际口径一致的标签；无真实数据时显示诚实空状态或不渲染。

### 5. 布局与兼容

- 桌面端右侧栏顶部容纳账号区；窄屏提供紧凑账号入口。
- 六角色布局在桌面和 360px 宽度下不得横向溢出、重叠或产生不可达操作。
- 角色卡继续链接到该角色真实所属 Space，并保持角色优先发现主链路。
- 保留用户当前工作区中的配色、身份引导及其他未提交改动，不夹带无关重构。

### 6. 对外 URL 必须使用 ASCII canonical routes

- 浏览器地址栏中的 pathname、动态层级关键词和 hash fragment 必须全部使用 ASCII；中文只允许出现在页面文案，不得继续作为 canonical URL 的一部分。
- canonical 路由采用复数资源名和稳定层级：`/spaces`、`/spaces/:spaceRef/characters/:characterRef`、`/quests`、`/clue-hunts/:routeRef`、`/owner`、`/owners/:ownerRef`、`/territory`、`/notifications`、`/me`。
- 所有 `<Link>`、`Navigate`、loader redirect、深链、分享链接、导航配置和路径比较必须通过 `WEB_PATHS` 与路径 helper 生成；业务组件不得拼接中文 path segment。
- `spaceRef`、`characterRef`、`ownerRef`、`routeRef` 继续使用现有 11 字符 ASCII public reference，不改回原始数据库 ID。
- canonical hash 改为 `#space-main`、`#discover-main`、`#guide-main`、`#create-main`、`#owner-main`；中文 hash 只能作为兼容输入，不能再由新链接生成。
- 普通访客不能通过 query 参数扩大数据范围。`?view=expanded` 不再是公开发现入口；通用 Space 列表只能置于 creator capability 保护的 `/owner/spaces`。
- 旧 URL 的兼容策略必须集中在单一 legacy adapter 中，进入后立即 `replace` 到 ASCII canonical URL，不得形成双 canonical 或重定向环。

### 7. 空间集合必须使用真实状态机

- 首页和访客发现页统一使用显式 `loading / ready / empty / error` 集合状态；筛选无结果使用独立 `filtered-empty`，不得与后端零数据或契约不完整混为一谈。
- 首次 loading 只显示一个有 `aria-busy` 语义的集合骨架或状态面板，不渲染 3 张无 ID 卡片，不出现名称、封面、人数、访问量、收藏数或 CTA。
- ready 只接受完成 canonical 校验的真实 `Space[]`；卡片组件在类型和运行时都不得接收 `undefined` Space 生成“等待真实空间”。
- 三座首发 Space 缺失、关闭、非公开或少任一固定角色时，整个首发集合进入错误/不可用状态，不得从通用公开列表补齐。
- empty 只表达服务端明确返回的空集合；显示一个整体空状态，不重复渲染“待开放”卡片。
- error 显示简洁说明与单一重试动作，不展示原始后端错误，不保留历史 fixture，也不把失败降级为访客示例数据。
- filtered-empty 显示“没有匹配的首发故事”与“清除筛选”，不得显示“等待真实空间”。
- 已有真实 ready 数据进行后台刷新时可保留最后一次已校验内容，并只显示非阻塞“刷新中”提示；禁止闪回假卡片或通用 fixture。
- 页面禁止出现 `等待真实空间`、`等待角色入住`、`待配置 NPC`、`暂无到访记录` 等被误解为真实 Space 的卡片级占位文案。

## Acceptance Criteria

- [ ] 首页首发区域展示且仅以真实数据渲染魏观海、萧明珠、绯月、宁怀书、沈清禾、顾野，并准确标出三座所属 Space。
- [ ] 默认 `/空间` 访客发现只展示三座正式首发 Space；显式 owner / 展开视图仍遵守既有权限和数据范围。
- [ ] 三座正式系统故事保持 `public + open`；角色链接进入正确 Space 并预选正确角色。
- [ ] 当前持久化层中疑似 fixture 记录已形成只读审计清单；完整历史 fixture 签名匹配的记录被幂等退役为 `private + closed`，不删除数据。
- [ ] 同 ID 但 owner 不匹配的记录、用户所有内容和三座正式故事均不被清理逻辑修改。
- [ ] 右上角可识别当前账号用户，且所有展示值可追溯到会话数据；独立模式和错误状态不伪造账号。
- [ ] 页面中不再出现硬编码示例账号、伪造相对时间、伪造记忆、固定世界统计、固定回访角标或无来源通知红点。
- [ ] 加载、失败、零角色和成功四种状态可区分；任何状态都不注入示例角色。
- [ ] 账号用户、私有游玩身份和 NPC 三种主体在文案与视觉位置上可明确区分。
- [ ] 桌面和 360px 宽度下六角色区域无横向溢出、重叠或不可达操作。
- [ ] 后端语法检查、前端类型检查和前端构建通过。
- [ ] 对原始截图关注区域、三世界六角色契约和持久化审计结果完成对抗式自审，并记录 Verdict 与证据。
- [ ] 地址栏、站内链接、重定向目标和分享深链的 canonical pathname / hash 均为 ASCII；新页面不生成任何中文 URL。
- [ ] `/spaces`、`/spaces/:spaceRef`、`/spaces/:spaceRef/characters/:characterRef`、`/me`、`/owner` 等 ASCII 路由可直接刷新和深链进入。
- [ ] 旧中文路径若保留兼容，只发生一次 `replace` 到 ASCII 路径；无循环、无双 canonical、无中文地址停留。
- [ ] 普通访客修改 `view=expanded`、`owner_id` 或类似 query 不能扩大到通用 Space 列表；creator catalog 仅在 `/owner/spaces` 且通过 capability gate。
- [ ] 首次 loading、服务端 empty、请求 error、filtered-empty、ready 和 ready 后后台刷新均有唯一且可辨认的展示。
- [ ] 非 ready 状态不渲染 Space 卡片、角色卡片、封面、虚构指标或可点击“进入” CTA。
- [ ] 代码与运行页面均不再生成“等待真实空间 N”“待开放”“等待空间同步”等假 Space 卡片。
- [ ] 截图中的纪念币茶馆、Continuity Tavern、Episode Export Tavern 不会因公开 query 或状态兜底重新进入访客发现页。

## Out of Scope

- 不新增用户资料编辑、头像上传或账号体系。
- 不把首页改造成“我的创作后台”；店主 / 创作者能力仍是兼容面。
- 不新增第四座首发 Space 或第七个首发角色。
- 不重写三座故事的正史、角色设定或既有 ID。
- 不改变 Space / SpaceCharacter / VisitorState Schema。
- 不删除任何历史 Space、角色、聊天、记忆或状态记录。
- 不修改后端 API 路径或 Space / Character public reference 算法。
- 不在本轮 Trellis 修改中实现路由迁移或状态 UI；需用户后续明确批准开发。

## Open Question

- 旧中文 URL 的兼容期：推荐保留一个发布周期的单向 `replace` redirect，再删除中文 alias；如果要求立即硬切，则旧书签和外部分享链接会直接 404。该选择在开发开始前确认。
