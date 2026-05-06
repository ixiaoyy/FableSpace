# Design Audit Visual Polish Playwright Self Acceptance

Date: 2026-05-06

Base URL: http://127.0.0.1:5173

## Viewports

- Desktop: 1440 x 1100
- Mobile/narrow: 390 x 920

## Assertions

- Discover renders with fixture tavern data.
- Desktop Discover keeps advanced filters visible.
- Mobile Discover starts with a lifted/brighter filter shell, search + filter summary, and exposes advanced filters after tapping `展开调谐`.
- Create page shows the current-step status band and updates it after selecting Step 02.
- Tavern view keeps secondary public tools folded under the chat mainline instead of a permanent right rail.
- Tavern owner view renders the owner-only folded management entry.
- Opening the owner entry reveals a floating bounded drawer with `店主角色控制台`, `扮演模式信号`, and compact `NPC 认领队列`, without stretching the whole page/grid.

## Screenshots

- `D:\work\ai-\.trellis\tasks\05-06-05-06-design-audit-visual-polish\artifacts\playwright\desktop-discover-filters.png`
- `D:\work\ai-\.trellis\tasks\05-06-05-06-design-audit-visual-polish\artifacts\playwright\desktop-create-step-01.png`
- `D:\work\ai-\.trellis\tasks\05-06-05-06-design-audit-visual-polish\artifacts\playwright\desktop-create-step-02.png`
- `D:\work\ai-\.trellis\tasks\05-06-05-06-design-audit-visual-polish\artifacts\playwright\desktop-tavern-owner-console.png`
- `D:\work\ai-\.trellis\tasks\05-06-05-06-design-audit-visual-polish\artifacts\playwright\mobile-discover-collapsed-filters.png`
- `D:\work\ai-\.trellis\tasks\05-06-05-06-design-audit-visual-polish\artifacts\playwright\mobile-discover-expanded-filters.png`
- `D:\work\ai-\.trellis\tasks\05-06-05-06-design-audit-visual-polish\artifacts\playwright\mobile-create-step-01.png`
- `D:\work\ai-\.trellis\tasks\05-06-05-06-design-audit-visual-polish\artifacts\playwright\mobile-create-step-02.png`
- `D:\work\ai-\.trellis\tasks\05-06-05-06-design-audit-visual-polish\artifacts\playwright\mobile-tavern-owner-console.png`

## Console errors

- None captured during checked pages.

## Limits

- Chromium only.
- API calls are fulfilled with Playwright route fixtures; this is a frontend visual self-acceptance pass and does not exercise the backend.
- Screenshots are saved as task artifacts, not product image assets.
