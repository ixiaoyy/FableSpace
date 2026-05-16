# SoulLink 设计差异与替换资产清单

## 1. 对比基准与当前结论

- Source of truth：`D:/work/ai-/设计问题/index.png`
- 设计稿尺寸：`1536 × 1024 px`
- 当前 Playwright 桌面截图：`D:/work/ai-/.trellis/tasks/05-16-soullink-1to1-visual/evidence/current-home-1536x1024.png`
- 当前 Playwright 移动截图：`D:/work/ai-/.trellis/tasks/05-16-soullink-1to1-visual/evidence/current-home-mobile-390x844.png`
- 当前 diff：`D:/work/ai-/.trellis/tasks/05-16-soullink-1to1-visual/evidence/diff-home-1536x1024.png`
- 验收门槛：`similarityPercent >= 95%`
- 最新结果：`similarityPercent = 3.1629%`，`mismatchPixels = 1,523,116`，`similarityPass = false`

结论：当前版本已经从“整张首页图 + 热区”退回为**之前拆过的 DOM 布局基础**，并把 ACTIVE NODES 等动态内容拆成“图片资源槽 + DOM 文本/DOM 图标”。但它没有达到 95% 像素相似度，不能标记为完成。

## 2. 当前实现边界

### 已拆分

- 首页不再引用整张 `soullink-index-1536x1024.png` 作为桌面可见层。
- ACTIVE NODES 卡片拆为：封面图、状态 badge、标题、NODE id、描述、星标、头像组、entities 数字。
- Sidebar 文案、顶部搜索框、Hero 主标题/副标题/CTA、右栏标题、底部面板标题均为 DOM 文本。
- 卡片、背景、头像、logo、hero 图、波形/折线/guide icon 仍可使用图片资源。

### 不允许再做

- 不允许把动态内容区域裁成一张带文字的截图。
- 不允许用整张首页 artboard 当最终首页可见层。
- 文本、数字、状态、用户/节点名称、计数必须保留为 DOM。

## 3. 现在和设计稿不一样的地方

1. **像素相似度未达标**：当前 DOM/CSS 版本与 `index.png` 的严格像素相似度只有 `3.1629%`。这是因为设计稿是一张完整成品图，而当前是重新搭出来的 DOM/CSS 层。
2. **Hero 区域不完全一致**：当前 `hero-system-visual.png` 是可替换背景图，但网络地图叠层、节点标签、城市亮度和设计稿仍不一致。
3. **Sidebar icon 不是设计稿原 icon**：当前先用 `lucide-react` 图标占位；如果要 1:1，需要替换为设计稿 SVG。
4. **ACTIVE NODES 小头像是占位资源**：现在头像组用现有头像/卡图资源拼出，和设计稿的小圆头像不完全一致。
5. **右侧 Signal Activity / Online Entities 头像和图标不一致**：当前依赖现有封面/头像占位；需要单独的小 icon/头像资源。
6. **底部 guide/world stats 的装饰图不一致**：当前使用已有 guide icon、sparkline、waveform，尺寸和构图不是设计稿级精确。
7. **字体抗锯齿/字重/间距不一致**：即使 DOM 文案正确，浏览器字体渲染也会和原图有差异；后续需要指定更接近设计稿的字体或提供文字设计规范。

## 4. ACTIVE NODES 卡片替换清单（图文分离）

| 槽位 | 当前/目标路径 | 当前/建议尺寸 | 页面显示槽位 | 替换要求 |
| --- | --- | ---: | ---: | --- |
| 数据港湾封面 | `D:/work/ai-/frontend/app/assets/fable-map-05-10/home-black/node-data-harbor.png` | 当前 `1736×906`；建议 `896×464` | `224×116 CSS px` | 只放封面图，不要文字、badge、头像、星标。 |
| 霓虹废墟封面 | `D:/work/ai-/frontend/app/assets/fable-map-05-10/home-black/node-neon-ruins.png` | 当前 `1733×907`；建议 `896×464` | `224×116 CSS px` | 同上。 |
| 旧地铁站封面 | `D:/work/ai-/frontend/app/assets/fable-map-05-10/home-black/node-old-platform.png` | 当前 `1734×907`；建议 `896×464` | `224×116 CSS px` | 同上。 |
| 白塔图书馆封面 | `D:/work/ai-/frontend/app/assets/fable-map-05-10/home-black/node-white-tower.png` | 当前 `1733×908`；建议 `896×464` | `224×116 CSS px` | 同上。 |
| 收藏星标 | `D:/work/ai-/frontend/app/assets/fable-map-05-10/icons/star-outline.svg` | 需要新增 | `20×20 CSS px` | SVG 透明背景；只包含 star outline。当前是 DOM 文本 `☆` 占位。 |
| 实体头像 01 | `D:/work/ai-/frontend/app/assets/fable-map-05-10/home-black/entity-avatar-01.png` | 需要新增；建议 `128×128` | `20×20 CSS px` | 正方形 PNG/WebP；不要 UI 外框。 |
| 实体头像 02 | `D:/work/ai-/frontend/app/assets/fable-map-05-10/home-black/entity-avatar-02.png` | 需要新增；建议 `128×128` | `20×20 CSS px` | 同上。 |
| 实体头像 03 | `D:/work/ai-/frontend/app/assets/fable-map-05-10/home-black/entity-avatar-03.png` | 需要新增；建议 `128×128` | `20×20 CSS px` | 同上。 |
| 实体头像 04 | `D:/work/ai-/frontend/app/assets/fable-map-05-10/home-black/entity-avatar-04.png` | 需要新增；建议 `128×128` | `20×20 CSS px` | 同上。 |

卡片内以下内容必须继续是 DOM：`ACTIVE / UNSTABLE / LOW SIGNAL`、`数据港湾`、`NODE_07`、描述、`128 ENTITIES` 等。

## 5. 首页其它替换资产

### 5.1 品牌与顶部用户区

| 资产 | 目标路径 | 当前尺寸 | 显示槽位 | 建议替换尺寸 | 要求 |
| --- | --- | ---: | ---: | ---: | --- |
| SoulLink logo lockup | `D:/work/ai-/frontend/app/assets/fable-map-05-10/brand/soullink-logo-low.png` | `328×124` | 约 `194×88 CSS px` | `656×248` 或 SVG | 可作为品牌图；不要内嵌动态用户/节点文案。 |
| 顶部用户头像 | `D:/work/ai-/frontend/app/assets/fable-map-05-10/home-black/user-avatar-node07.png` | `1024×1024` | 约 `44–50 CSS px` | `512×512` | 只要头像，不要边框/文字。 |
| Bell icon | `D:/work/ai-/frontend/app/assets/fable-map-05-10/icons/bell.svg` | 需要新增 | `24×24 CSS px` | SVG | 当前为 lucide 占位。 |
| Chevron down | `D:/work/ai-/frontend/app/assets/fable-map-05-10/icons/chevron-down.svg` | 需要新增 | `18×18 CSS px` | SVG | 当前为 lucide 占位。 |

### 5.2 Hero 区域

| 资产 | 目标路径 | 当前尺寸 | 显示槽位 | 建议替换尺寸 | 要求 |
| --- | --- | ---: | ---: | ---: | --- |
| Hero 城市/人物背景 | `D:/work/ai-/frontend/app/assets/fable-map-05-10/home-black/hero-system-visual.png` | `1672×941` | 约 `936×418 CSS px` | `1872×836` | 只要背景/人物/城市；不要主标题、CTA、搜索框。 |
| 网络地图叠层 | `D:/work/ai-/frontend/app/assets/fable-map-05-10/home-black/network-map-overlay.png` | 需要新增 | 约 `395×300 CSS px` | `790×600` | 透明 PNG/SVG；只包含网络线、节点、NETWORK MAP 小字和节点装饰。 |
| Hero 节点 icon | `D:/work/ai-/frontend/app/assets/fable-map-05-10/icons/hero-node-icons.svg` | 需要新增 | 单个 `28–36 CSS px` | SVG | 用于 NODE_07/NODE_19/NODE_03/NODE_11 标记。 |
| CTA arrow | `D:/work/ai-/frontend/app/assets/fable-map-05-10/icons/arrow-up-right.svg` | 需要新增 | `18–20 CSS px` | SVG | 当前为 lucide 占位。 |

Hero 主标题、副标题、按钮文字必须继续是 DOM。

### 5.3 Sidebar icon

| 图标 | 建议目标路径 | 显示尺寸 | 格式要求 |
| --- | --- | ---: | --- |
| NETWORK | `D:/work/ai-/frontend/app/assets/fable-map-05-10/icons/nav-network.svg` | `28×28 CSS px` | SVG，透明背景。 |
| SIGNALS | `D:/work/ai-/frontend/app/assets/fable-map-05-10/icons/nav-signals.svg` | `28×28 CSS px` | SVG，透明背景。 |
| ECHOES | `D:/work/ai-/frontend/app/assets/fable-map-05-10/icons/nav-echoes.svg` | `28×28 CSS px` | SVG，透明背景。 |
| MEMORY LOG | `D:/work/ai-/frontend/app/assets/fable-map-05-10/icons/nav-memory-log.svg` | `28×28 CSS px` | SVG，透明背景。 |
| SAVED NODES | `D:/work/ai-/frontend/app/assets/fable-map-05-10/icons/nav-saved-nodes.svg` | `28×28 CSS px` | SVG，透明背景。 |
| ANCHORS | `D:/work/ai-/frontend/app/assets/fable-map-05-10/icons/nav-anchors.svg` | `28×28 CSS px` | SVG，透明背景。 |
| CREATE NODE | `D:/work/ai-/frontend/app/assets/fable-map-05-10/icons/nav-create-node.svg` | `28×28 CSS px` | SVG，透明背景。 |

### 5.4 右栏与底部面板

| 资产 | 目标路径 | 当前尺寸 | 显示槽位 | 建议替换尺寸 | 要求 |
| --- | --- | ---: | ---: | ---: | --- |
| Recent Echo 波形 | `D:/work/ai-/frontend/app/assets/fable-map-05-10/home-black/recent-echo-waveform.png` | `1676×939` | 约 `126×75 CSS px` | `252×150` 或 SVG | 只要波形，不要背景/文字。 |
| World Stats 折线 | `D:/work/ai-/frontend/app/assets/fable-map-05-10/home-black/world-stats-sparkline.png` | `2037×772` | 约 `222×80 CSS px` | `444×160` 或 SVG | 只要折线与发光。 |
| Guide Protocol icon | `D:/work/ai-/frontend/app/assets/fable-map-05-10/home-black/guide-protocol-icon.png` | `1024×1024` | 约 `64×64 CSS px` | `256×256` | 只要图标，不要卡片文字。 |
| Guide Database icon | `D:/work/ai-/frontend/app/assets/fable-map-05-10/home-black/guide-database-icon.png` | `1024×1024` | 约 `64×64 CSS px` | `256×256` | 同上。 |
| Guide Security icon | `D:/work/ai-/frontend/app/assets/fable-map-05-10/home-black/guide-security-icon.png` | `1024×1024` | 约 `64×64 CSS px` | `256×256` | 同上。 |
| Signal Activity icon 01 | `D:/work/ai-/frontend/app/assets/fable-map-05-10/icons/signal-node-07.svg` | 需要新增 | `40×40 CSS px` | SVG/PNG | 右侧活动列表圆形 icon。 |
| Signal Activity icon 02 | `D:/work/ai-/frontend/app/assets/fable-map-05-10/icons/signal-node-21.svg` | 需要新增 | `40×40 CSS px` | SVG/PNG | 同上。 |
| Signal Activity icon 03 | `D:/work/ai-/frontend/app/assets/fable-map-05-10/icons/signal-node-19.svg` | 需要新增 | `40×40 CSS px` | SVG/PNG | 同上。 |
| Signal Activity icon 04 | `D:/work/ai-/frontend/app/assets/fable-map-05-10/icons/signal-node-03.svg` | 需要新增 | `40×40 CSS px` | SVG/PNG | 同上。 |

## 6. 下一步验收规则

```powershell
npm --prefix .\frontend run typecheck
npm --prefix .\frontend run build
node frontend/scripts/playwright-soullink-visual-compare.mjs
```

- `similarityPercent < 95`：只汇报差异和下一步，不能说完成。
- `similarityPercent >= 95`：再进入人工验收，并继续列剩余差异。
