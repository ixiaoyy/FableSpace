# Restore SoulLink sidebar to 1:1 reference

## Goal
按用户指定的第一张参考图，将 SoulLink 首页/探索侧边栏视觉恢复为 1:1 参考，不再用近似的 lucide DOM 图标、英文副标题、大号 logo 方框等自由改造样式。

## Scope
- `frontend/app/components/soul-link-reference-artboards.tsx`
- SoulLink reference artboard sidebar visual layer and clickable overlay only。

## Requirements
- 侧边栏视觉必须使用仓库内已锁定的 `frontend/app/assets/soul-link-05-10/*/sidebar*.png` 参考切片，保证图标、文字、间距、邀请卡、底部按钮与参考图一致。
- 保留真实可点击 / 可访问热区：logo、导航、邀请卡、底部动作。
- 不改主内容、右侧栏、后端或 API。
- 不再把 sidebar 视觉用自由 lucide 图标近似还原。

## Acceptance Criteria
- [x] 首页亮色桌面截图左侧 sidebar 与 `home-light/sidebar.png` 视觉一致。
- [x] `npm --prefix .\frontend run typecheck` 通过。
- [x] `npm --prefix .\frontend run build` 通过。
- [x] `node .\frontend\scripts\soul-link-reference-artboards-test.mjs` 通过。
- [x] `npm --prefix .\frontend run test:soul-link-reference-ux` 通过并生成截图报告。

## Not in Scope
- 不进行新的视觉设计。
- 不修改参考图片资源本身。
