# Search light text and image decomposition

## Goal

拆解 `/discover` light 搜索页样式：可文字化、可交互内容改为真实 DOM/文字；只把真正的视觉内容保留为局部图片/封面/装饰，不再依赖 light 主内容和右侧大截图切片。

## Requirements

- 目标页面：`/discover` light 版本（`SoulLinkDiscoverReference variant="light"`）。
- 保留 dark/black 版本现有切片和交互，不改后端/API/schema。
- light 版本 main / right rail 不再使用整块 `discover-light/main*.png` 或 `right-rail*.png` 作为页面主体。
- 搜索框、筛选、探索时间流、结果卡、右侧统计/回响/足迹/创建 CTA 等改为真实 DOM 文字与按钮/链接。
- 卡片封面、头像、背景氛围图可继续使用项目内局部图片。
- 保持现有搜索、筛选、清空、创建、进入 tavern、主题切换行为。
- 保持移动/窄屏可用，不引入新 UI 框架、状态库或地图依赖。

## Acceptance Criteria

- [x] `frontend/app/components/soul-link-reference-artboards.tsx` light discover 不再导入/渲染大块 `discover-light/main` / `right-rail` 主体切片。
- [x] light discover 主体文本、筛选、结果卡和右侧面板是可访问 DOM。
- [x] 项目引用的图片仅用于卡片封面、头像、氛围/装饰。
- [x] `node .\frontend\scripts\soul-link-reference-artboards-test.mjs` 通过。
- [x] `npm --prefix .\frontend run build` 通过。
- [x] Playwright 自验收桌面 + 窄屏截图写入本任务 evidence。

## Technical Notes

Relevant files:

- `frontend/app/components/soul-link-reference-artboards.tsx`
- `frontend/scripts/soul-link-reference-artboards-test.mjs`
- `frontend/app/routes/discover.tsx`（如需移除 light 大图引用）

Specs:

- `.trellis/spec/frontend/component-guidelines.md`
- `.trellis/spec/frontend/quality-guidelines.md`
- `.trellis/spec/frontend/image-asset-guidelines.md`
- `.trellis/spec/guides/code-reuse-thinking-guide.md`


## Implementation Notes

- Light `/discover` no longer imports or renders `frontend/app/assets/soul-link-05-10/discover-light/main*.png` or `right-rail*.png` as full-page/body slices.
- Added a real-DOM light search surface: title, controlled search input, quick filters, grouped filter panel, time-flow cards, result header, card grid, right-rail world status/recommendations/footprints/create CTA, and mobile/narrow stacked layout.
- Result cards use real text and project-local scene images from `user-cuts-light/`; images are cover/thumbnail/decorative content rather than page-body screenshots.
- `frontend/app/routes/discover.tsx` no longer imports the full light search screenshot for preview tile fallback; it uses an existing public atmosphere asset instead.
- Contract test now asserts the light search route/component do not import the full light main/right-rail screenshot slices and checks new real-DOM markers.

## Validation Evidence

Passed:

```powershell
node .rontend\scripts\soul-link-reference-artboards-test.mjs
node .rontend\scripts\discover-view-mode-test.mjs
npm --prefix .rontend run build
node .trellis	asks-11-search-light-text-image-decomposition\playwright-discover-light-text-image-check.mjs
```

Playwright evidence:

- Report: `.trellis/tasks/05-11-search-light-text-image-decomposition/evidence/discover-light-text-image-check.md`
- Desktop screenshot: `.trellis/tasks/05-11-search-light-text-image-decomposition/evidence/discover-light-text-image-desktop.png`
- Mobile screenshot: `.trellis/tasks/05-11-search-light-text-image-decomposition/evidence/discover-light-text-image-mobile.png`

Known unrelated validation failures in current worktree:

```powershell
npm --prefix .rontend run typecheck
# fails in app/product/CharacterEditor.jsx:373,805,1070,1082,1083 (JSX syntax errors; file not touched in this task)

npm --prefix .rontend test
# stops at frontend/scripts/mini-games-test.mjs:12 with AssertionError: 9 !== 6 after earlier scripts pass; unrelated to touched files
```
