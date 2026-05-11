# home light page icon reference polish

## Goal

继续打磨 FableMap light 版首页，按用户要求使用 `图标参考/` 中的新切片作为小图标/局部装饰来源，同时把可编辑、可访问、可交互的内容尽量改为真实 DOM/文字，不再依赖大块整页截图偷懒。

## Requirements

- 目标页面：light 版首页（`/`，当前 React Router home route / SoulLink light reference implementation）。
- 使用 `图标参考/` 中用户切出的图片时，作为 light 首页背景、卡片封面、小图标或局部装饰；不要把整页大图作为内容区域替代。
- 能用文字、按钮、卡片、列表、输入框表达的部分，用真实 DOM/文字。
- 保持现有 route/link/search/theme toggle 行为，不新增后端/API。
- 保持移动端/窄屏可用，不做桌面-only 布局。
- 不引入新 UI 框架、状态管理、地图渲染依赖。
- 非 NPC UI 参考/切图无需 prompt sidecar，但需要记录来源和验证。

## Acceptance Criteria

- [x] 首页 light 版本不再主要依赖大块主内容截图来表达可文字化内容。
- [x] 图标参考资产被项目本地引用，且只用于小图标/装饰等合适位置。
- [x] 页面主要标题、导航、搜索、CTA、卡片文本、侧栏文字为真实 DOM。
- [x] `npm --prefix .\frontend run build` 通过。
- [x] Playwright 自验收捕获桌面 + 窄屏截图并记录路径。

## Technical Notes

Relevant files likely:

- `frontend/app/routes/home.tsx`
- `frontend/app/components/soul-link-reference-artboards.tsx`
- `frontend/app/assets/soul-link-05-10/...`
- `frontend/app/styles.css`
- `图标参考/`

Follow specs:

- `.trellis/spec/frontend/component-guidelines.md`
- `.trellis/spec/frontend/quality-guidelines.md`
- `.trellis/spec/frontend/image-asset-guidelines.md`
- `.trellis/spec/guides/code-reuse-thinking-guide.md`

## Implementation Notes

- Source reference: user-provided image slices under `图标参考/`.
- Runtime assets are exact project copies of the user cuts under `frontend/app/assets/soul-link-05-10/user-cuts-light/`; the original `图标参考/` files are left untouched.
- The light home hero background, page wash, right-rail wash, sidebar invite art, navigation icons, guide icons, and coordinate card covers now reference those user-cut assets.
- Removed the earlier derived `icons-light/` and `backgrounds-light/` asset folders in favor of the user-provided cuts.
- Removed light-home dependencies on obsolete locked full-page slices (`home-light/main`, `home-light/sidebar`, `home-light/right-rail`) from the route/test contract; light homepage should use real DOM plus split materials, not full-page screenshots.
- Corrected the sidebar invite card source back to the existing local design asset `frontend/app/assets/soul-link-05-10/home-light/invite-card.png` / `invite-card-2x.png` (`1182x1330` / `1182x1331`) instead of the wrong `user-cuts-light/card-invite-soft.png`.
- Corrected guide/stat background mapping: `user-cuts-light/card-invite-soft.png`, `card-envelope-soft.png`, and `card-shield-soft.png` are used as the three “探索指南” card backgrounds; `user-cuts-light/bg-paper-plane-soft.png` is used as the “今日世界统计” panel background, not as a generic right-rail wash.
- `frontend/app/components/soul-link-reference-artboards.tsx` now uses a real DOM light home layout with text headings, sidebar nav, search, CTA, coordinate cards, right rail panels, bottom panels, and mobile cards.
- Coordinate card cover images are forced to the user-cut scene backgrounds even when backend tavern data supplies names/descriptions.
- Added a reusable user-cut image wrapper so large-canvas icon cuts are visually cropped/scaled inside the intended icon boxes instead of appearing tiny or clipped out of alignment.
- 2026-05-11 追加：根据用户反馈“观看世界介绍”的播放图标圆圈过多，light 首页 CTA 不再套用 `icon-play-glow` 大画布切图，也不再给 light 播放图标外层加圆形边框；改为单个 lucide `Play` 三角图标，保留 dark/black 版原有圆形样式。
- 2026-05-11 追加：根据用户反馈“世界脉搏”只露出 2.5 条，light 首页右侧动态列表启用紧凑行距/字号/头像尺寸，固定完整展示 3 条动态并把“查看全部动态”放在列表下方。
- 2026-05-11 追加：根据用户反馈“在线的灵魂”也只露出 2.5 条，light 首页在线列表启用紧凑行距/字号/头像尺寸，保证 3 个在线成员完整显示在卡片内部。
- 2026-05-11 追加：根据用户反馈“探索指南”三张卡没有填充满，light guide card 背景切片放大裁切铺满卡片，同时让卡片行撑满指南面板剩余高度，避免底部留白和内嵌小卡感。
- 2026-05-11 追加：根据用户反馈“今日世界统计”背景也有没填充满的感觉，将纸飞机背景素材放大裁切铺底，裁掉素材自带外圈留白。
- 2026-05-11 追加：根据用户反馈左侧“邀请朋友”卡片略不自然，邀请卡图片不再仅靠 `h-full w-full` 强制拉伸，改为 `object-cover object-center` 保持原图比例并裁切填充，避免潜在变形。
- 2026-05-11 追加：根据用户反馈 light 侧栏导航图标像被套圆/裁切且大小不一致，侧栏导航图标不再使用大画布用户切图的圆形裁切方案，改为一致尺寸的 lucide 线性 SVG；保留 active 背景胶囊，但图标本体不再圆形裁切、不再缺边。

## Asset Fit Audit

用户反馈后重新确认：前一轮用 CSS 缩放/裁切图标属于“乱适配”，不能作为设计稿还原验收标准。当前素材存在以下尺寸/比例风险，需要明确处理方式后再继续：

- 导航 / 功能图标期望显示尺寸约 20–32px，但现有图标切图多为 `1024x1024`、`1536x1024`、`1024x1536` 的大画布，真实图标只占中间一小部分；直接用会显得很小，CSS 放大会裁切/错位。建议提供 tight crop 的透明 PNG/SVG，或确认允许在项目内生成“可追踪的裁切副本”。
- Hero 主背景设计稿区域约 `1000x530`（约 1.89:1），`scene-sky-city-balcony.png` 为 `1341x1173`（约 1.14:1），比例不匹配；直接 cover 必然裁掉大量内容或改变构图。建议提供同一画面的宽版背景裁切。
- 推荐坐标卡封面区域约 2:1，`scene-library-wide.png` / `scene-library-cafe-wide.png` 比例较接近；`scene-library-sunlit.png`、`scene-train-platform-rain.png`、`scene-sea-lane.png` 会有轻到中等裁切。
- 邀请卡设计区域偏竖向，`card-invite-soft.png` 为 `1403x1121`（约 1.25:1），比例不匹配，直接填充会改变构图。
- 搜索框 `/` 键、右侧用户栏边界等是布局还原问题，不是素材尺寸问题，需要按设计稿坐标修正。

## Validation Evidence

- Static reference test: `node .\frontend\scripts\soul-link-reference-artboards-test.mjs` → passed.
- Frontend build: `npm --prefix .\frontend run build` → passed.
- Playwright static preview check:
  - Desktop screenshot: `.trellis/tasks/05-11-05-11-home-light-icon-reference-polish/evidence/home-light-user-cuts-desktop.png`
  - Mobile screenshot: `.trellis/tasks/05-11-05-11-home-light-icon-reference-polish/evidence/home-light-user-cuts-mobile.png`
  - Confirmed 4 visible real coordinate cards, 10 visible user-cut scene/background images across desktop/mobile, no rendered `home-light/main`, `home-light/right-rail`, `sidebar-light`, or `invite-light` old large-slice images, and no mobile horizontal overflow.
- Visual alignment recheck after icon-crop fix:
  - Desktop screenshot: `.trellis/tasks/05-11-05-11-home-light-icon-reference-polish/evidence/home-light-visual-recheck-2-desktop.png`
  - Mobile screenshot: `.trellis/tasks/05-11-05-11-home-light-icon-reference-polish/evidence/home-light-visual-recheck-2-mobile.png`
- Guide/stat/invite mapping check:
  - Desktop screenshot: `.trellis/tasks/05-11-05-11-home-light-icon-reference-polish/evidence/home-light-guide-bg-invite-fix-desktop.png`
  - Confirmed via Playwright that the light invite uses `home-light/invite-card`, guide cards render 3 guide background images, and world stats renders `bg-paper-plane-soft`.
- Play icon cleanup check:
  - Static reference test: `node .\frontend\scripts\soul-link-reference-artboards-test.mjs` → passed.
  - Frontend build: `npm --prefix .\frontend run build` → passed.
  - Playwright desktop screenshot: `.trellis/tasks/05-11-05-11-home-light-icon-reference-polish/evidence/home-light-play-icon-desktop.png`
  - Playwright mobile screenshot: `.trellis/tasks/05-11-05-11-home-light-icon-reference-polish/evidence/home-light-play-icon-mobile.png`
  - Report: `.trellis/tasks/05-11-05-11-home-light-icon-reference-polish/evidence/home-light-play-icon-check.md`
- World pulse 3-item check:
  - Static reference test: `node .\frontend\scripts\soul-link-reference-artboards-test.mjs` → passed.
  - Frontend build: `npm --prefix .\frontend run build` → passed.
  - Playwright desktop screenshot: `.trellis/tasks/05-11-05-11-home-light-icon-reference-polish/evidence/home-light-world-pulse-3-items-desktop.png`
  - Playwright mobile screenshot: `.trellis/tasks/05-11-05-11-home-light-icon-reference-polish/evidence/home-light-world-pulse-3-items-mobile.png`
  - Report: `.trellis/tasks/05-11-05-11-home-light-icon-reference-polish/evidence/home-light-world-pulse-3-items-check.md`
- Online souls 3-item check:
  - Static reference test: `node .\frontend\scripts\soul-link-reference-artboards-test.mjs` → passed.
  - Frontend build: `npm --prefix .\frontend run build` → passed.
  - Playwright desktop screenshot: `.trellis/tasks/05-11-05-11-home-light-icon-reference-polish/evidence/home-light-online-souls-3-items-desktop.png`
  - Playwright mobile screenshot: `.trellis/tasks/05-11-05-11-home-light-icon-reference-polish/evidence/home-light-online-souls-3-items-mobile.png`
  - Report: `.trellis/tasks/05-11-05-11-home-light-icon-reference-polish/evidence/home-light-online-souls-3-items-check.md`
- Guide card fill check:
  - Static reference test: `node .\frontend\scripts\soul-link-reference-artboards-test.mjs` → passed.
  - Frontend build: `npm --prefix .\frontend run build` → passed.
  - Playwright desktop screenshot: `.trellis/tasks/05-11-05-11-home-light-icon-reference-polish/evidence/home-light-guide-card-fill-stretched-desktop.png`
  - Playwright mobile screenshot: `.trellis/tasks/05-11-05-11-home-light-icon-reference-polish/evidence/home-light-guide-card-fill-stretched-mobile.png`
  - Report: `.trellis/tasks/05-11-05-11-home-light-icon-reference-polish/evidence/home-light-guide-card-fill-stretched-check.md`
- World stats background fill check:
  - Static reference test: `node .\frontend\scripts\soul-link-reference-artboards-test.mjs` → passed.
  - Frontend build: `npm --prefix .\frontend run build` → passed.
  - Playwright desktop screenshot: `.trellis/tasks/05-11-05-11-home-light-icon-reference-polish/evidence/home-light-world-stats-bg-fill-desktop.png`
  - Playwright mobile screenshot: `.trellis/tasks/05-11-05-11-home-light-icon-reference-polish/evidence/home-light-world-stats-bg-fill-mobile.png`
  - Report: `.trellis/tasks/05-11-05-11-home-light-icon-reference-polish/evidence/home-light-world-stats-bg-fill-check.md`
- Invite card no-distortion check:
  - Static reference test: `node .\frontend\scripts\soul-link-reference-artboards-test.mjs` → passed.
  - Frontend build: `npm --prefix .\frontend run build` → passed.
  - Playwright desktop screenshot: `.trellis/tasks/05-11-05-11-home-light-icon-reference-polish/evidence/home-light-invite-object-cover-desktop.png`
  - Playwright mobile screenshot: `.trellis/tasks/05-11-05-11-home-light-icon-reference-polish/evidence/home-light-invite-object-cover-mobile.png`
  - Report: `.trellis/tasks/05-11-05-11-home-light-icon-reference-polish/evidence/home-light-invite-object-cover-check.md`
- Sidebar icon cleanup check:
  - Static reference test: `node .\frontend\scripts\soul-link-reference-artboards-test.mjs` → passed.
  - Frontend build: `npm --prefix .\frontend run build` → passed.
  - Playwright desktop screenshot: `.trellis/tasks/05-11-05-11-home-light-icon-reference-polish/evidence/home-light-sidebar-icons-clean-desktop.png`
  - Playwright mobile screenshot: `.trellis/tasks/05-11-05-11-home-light-icon-reference-polish/evidence/home-light-sidebar-icons-clean-mobile.png`
  - Report: `.trellis/tasks/05-11-05-11-home-light-icon-reference-polish/evidence/home-light-sidebar-icons-clean-check.md`


- 2026-05-12 追加：根据用户反馈首页 light 搜索框位置需要“稍微左边一点”，将 `HOME_LAYOUT.search.x` 从 `878` 调整为 `846`；同时确认搜索框左侧奇怪图标来自 `user-cuts-light/icon-search-glow.png` 大画布切图被 `UserCutImage` 缩放裁切，已改为真实 lucide `Search` SVG，避免显示不全/像加号的问题。
- 2026-05-12 追加：用户明确说“不需要 Playwright 验收”，本次仅做 build 验证，不跑 Playwright 截图验收。

## Additional Validation Notes


- Home search position/icon tweak check (2026-05-12):
  - `npm --prefix .\frontend run build` → passed.
  - `node .\frontend\scripts\soul-link-reference-artboards-test.mjs` → failed before build on unrelated modified runtime asset dimensions: `frontend/app/assets/soul-link-05-10/home-black/invite-card.png` actual `1182x1331`, expected `151x170`; this file was already modified in the worktree and is not part of this search-box tweak.
  - Playwright was intentionally skipped because the user explicitly said no Playwright acceptance needed.

- 2026-05-12 追加：用户反馈搜索框左移“太多了”，将 `HOME_LAYOUT.search.x` 从 `846` 回调到 `864`，相对原始 `878` 仅轻微左移 14px；继续使用真实 lucide `Search` 图标。

- 2026-05-12 追加：按用户要求统一 light / black 首页素材目录规则，将原 `frontend/app/assets/soul-link-05-10/user-cuts-light/` 下的 light 首页运行时素材迁入 `frontend/app/assets/soul-link-05-10/home-light/`，与 `home-black/` 同级同规则；同步更新运行时代码 import、`manifest.json` 与资产 README。未运行 Playwright（用户已明确不需要）。
  - Validation: `npm --prefix .\frontend run build` → passed.
  - Asset manifest check: `home-light` png files = 27, manifest assets = 27, matched.

- 2026-05-12 追加：用户反馈黑色首页 hero 按钮遮挡副标题，按“稍微移动一点点”要求将 `HOME_LAYOUT.heroActions` 两个按钮 y 从 `312` 下移到 `330`（+18px），不改其它布局。未运行 Playwright（用户已明确不需要）。
  - Validation: `npm --prefix .\frontend run build` → passed.
