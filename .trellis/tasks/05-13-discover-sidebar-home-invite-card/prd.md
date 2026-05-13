# Use Homepage Invite Card on Discover Sidebar

## Goal
把 `/discover` 左侧栏邀请朋友区域替换为和首页同款的邀请图，不再使用探索页单独的 DOM 卡片样式。

## Requirements
- 只改 SoulLink 参考页侧栏邀请卡表现，不改 API、Schema、路由或业务数据。
- 首页与探索页共用 `SIDEBAR_MATERIALS[variant].inviteCard` 图片资源。
- 保留可点击入口、可访问标签和现有布局位置。
- 同步脚本测试中对侧栏邀请卡的契约断言。

## Acceptance Criteria
- [x] `/discover` 桌面侧栏邀请卡使用与首页相同的 fixed-image invite card。
- [x] 不再依赖 discover-only real-dom invite/copy marker。
- [x] 相关 SoulLink / discover 契约测试通过。
- [x] `npm --prefix .\frontend run build` 通过。

## Technical Notes
- 目标文件：`frontend/app/components/soul-link-reference-artboards.tsx`。
- 可能需要同步：`frontend/scripts/soul-link-reference-artboards-test.mjs`。


## Implementation Notes
- `SoulLinkSidebar` now always renders the shared fixed-image invite card from `SIDEBAR_MATERIALS[variant].inviteCard`, so `/discover` matches the homepage invite card.
- Removed the discover-only DOM invite branch and updated `soul-link-reference-artboards-test.mjs` to forbid that branch from returning.

## Validation Evidence
- `node .\frontend\scripts\soul-link-reference-artboards-test.mjs` → PASS
- `node .\frontend\scripts\discover-view-mode-test.mjs` → PASS
- `node .\frontend\scripts\home-visual-density-test.mjs` → PASS
- `npm --prefix .\frontend run build` → PASS
- `node .trellis/tasks/05-13-discover-sidebar-home-invite-card/artifacts/playwright/discover-sidebar-home-invite-check.mjs` → PASS
- Playwright screenshots:
  - `.trellis/tasks/05-13-discover-sidebar-home-invite-card/artifacts/playwright/discover-black-sidebar-home-invite.png`
  - `.trellis/tasks/05-13-discover-sidebar-home-invite-card/artifacts/playwright/discover-black-mobile-no-overflow.png`
