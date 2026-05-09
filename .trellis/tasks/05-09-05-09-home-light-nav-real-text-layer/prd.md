# Home light nav real text layer

## Goal

Answer and address the navigation-text question: before this task, the light homepage navigation was extracted as a component boundary, but its visible text was still baked into the navigation image.

This step keeps the approved 1:1 image-backed visual, but adds a real DOM/SVG text layer over the nav so the navigation labels are no longer only pixels in the bitmap.

## Scope

- Keep `LightReferenceNav` as the navigation component boundary.
- Keep `home-light-slice-01a-nav-bar.png` as the 1:1 backing image for logo/icon/background fidelity.
- Add `data-home-light-nav-text-layer="real-dom-text"` SVG text overlay.
- Add real text for:
  - `FableMap`
  - `Cyber life on real coordinates`
  - `探索` / `区域` / `角色` / `记忆` / `创建空间`
  - `搜索附近坐标、角色、记忆线索`
  - `管理入口`
  - `开始探索`
- Keep existing transparent hotspot overlay alignment; this step does not yet replace the whole nav with pure HTML/CSS.

## Guardrails

- No redraw of the page.
- Do not replace the approved nav backing image yet.
- Do not split logo/icon/search/button visuals into arbitrary pieces.
- Keep 1:1 visual alignment as much as possible with scalable SVG viewBox coordinates.
- This is an intermediate decomposition step: visible labels become real text, while decorative/icon/background detail still comes from the source slice.
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

If accepted, continue nav conversion in controlled layers:

1. Move transparent nav hotspots into real `<Link>`/`button` elements inside `LightReferenceNav`.
2. Replace search pill/button shapes with CSS while keeping the backing image only for logo/icon/decor.
3. Finally remove nav text from the backing image or replace the backing with non-text fragments.

