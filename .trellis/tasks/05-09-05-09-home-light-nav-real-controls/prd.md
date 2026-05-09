# Home light nav real controls

## Goal

Continue converting the light homepage navigation from a page-wide image/hotspot overlay into a real frontend component.

Previous step made nav labels real DOM/SVG text. This step moves the navigation click targets out of the full-page overlay and into `LightReferenceNav` itself as real `<Link>` / `<button>` controls.

## Scope

- Keep `LightReferenceNav` as the navigation component boundary.
- Keep the 1:1 nav image as visual backing for now.
- Keep the real DOM/SVG nav text layer.
- Add `data-home-light-nav-controls="real-links"` inside `LightReferenceNav`.
- Render 10 nav controls inside the nav component:
  - logo/home
  - 探索 / 区域 / 角色 / 记忆 / 创建空间
  - search area
  - theme toggle button
  - 管理入口
  - 开始探索
- Remove duplicated navigation controls from the full-page body hotspot overlay.

## Guardrails

- No redraw of the page.
- Do not replace the approved nav backing image yet.
- Do not change body/Hero/section hotspots.
- Keep existing visual alignment by converting the original full-page hotspot coordinates into local nav-section coordinates.
- Playwright visual self-check was not run because the user confirmed they can manually inspect; use static/build validation only unless the user asks for a screenshot/self-check.

## Validation

Passed on 2026-05-09:

```powershell
node .\frontend\scripts\home-visual-density-test.mjs
node .\frontend\scripts\home-pc-polish-test.mjs
node .\frontend\scripts\homepage-dynamic-entry-test.mjs
node .\frontend\scripts\home-links-test.mjs
npm --prefix .\frontend run typecheck
npm --prefix .\frontend run build
```

## Next possible slice

Continue nav conversion in controlled layers:

1. Replace nav image-backed search/button chrome with CSS while keeping logo/icon fragments.
2. Move logo/icon visuals into separate assets or CSS/SVG.
3. Once all visible nav elements are real frontend surfaces, stop using the nav backing image.

