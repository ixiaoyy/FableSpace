# Fix Discover Page Layout Overflow

## Goal
修复 `/discover` 页面在截图视口中出现的布局错乱：结果卡片文字互相覆盖、卡片内容被裁切、右侧栏/主内容间距不稳定，以及窄屏可用性风险。

## Requirements
- 只做 `/discover` 页面布局/样式层面的最小修复，不改 API、Schema、数据语义或产品主线。
- 保持当前轻盈明亮视觉方向，不自由重设计页面。
- 结果卡片内图片、标题、摘要、标签和元信息不能相互重叠或溢出。
- 桌面主布局应在常见宽屏下稳定，右侧栏不挤压主内容。
- 窄屏/移动视口至少不横向溢出，卡片内容可读。

## Acceptance Criteria
- [x] `/discover` 桌面视口没有明显文字覆盖、图片覆盖或卡片内容裁切。
- [x] `/discover` 窄屏/移动视口没有横向溢出，主要信息保持可读。
- [x] `npm --prefix .\frontend run build` 通过。
- [x] Playwright 或浏览器自验收覆盖桌面与窄屏截图，并记录证据路径。

## Technical Notes
- 优先修改 `frontend/app/routes/discover.tsx` 及其局部样式/类名。
- 避免触碰已有未提交的后端和任务文档改动。


## Implementation Notes
- Modified `frontend/app/components/soul-link-reference-artboards.tsx` only for the desktop `SoulLinkDiscoverCard` density/overflow issue.
- Kept SoulLink reference DOM markers, first-minute guide markers, card image assets, API/schema/data semantics unchanged.

## Validation Evidence
- `node .\frontend\scripts\discover-pc-polish-test.mjs` → PASS
- `node .\frontend\scripts\first-minute-guide-test.mjs` → PASS
- `node .\frontend\scripts\soul-link-reference-artboards-test.mjs` → PASS
- `npm --prefix .\frontend run build` → PASS
- `node .trellis/tasks/05-12-discover-layout-overflow-fix/artifacts/playwright/discover-layout-check.mjs` → PASS
- Screenshots:
  - Desktop: `.trellis/tasks/05-12-discover-layout-overflow-fix/artifacts/playwright/discover-light-desktop-fixed.png`
  - Narrow: `.trellis/tasks/05-12-discover-layout-overflow-fix/artifacts/playwright/discover-light-narrow-fixed.png`

## Grill-Me Verdict
Verdict: PASS

Source of truth:
- User-provided `/discover` screenshot showing result-card text/copy overlap and clipping.
- `.trellis/spec/frontend/component-guidelines.md` and `.trellis/spec/frontend/quality-guidelines.md`.

Evidence:
- Diff is scoped to `SoulLinkDiscoverCard` density/overflow classes.
- Playwright desktop check asserts 8 visible desktop cards, no horizontal overflow, titles/guides present, and no copy-layer vertical overflow.
- Playwright narrow check asserts page loads without horizontal overflow and captures evidence.

Problems / limits:
- In-app Browser connection timed out twice, so browser plugin visual check is blocked; standalone Playwright evidence was used instead.
- This is not a full free redesign; it only repairs the visible card-density overflow.

Smallest safe next step:
- Human visual review of the saved desktop screenshot or live `/discover` page.
