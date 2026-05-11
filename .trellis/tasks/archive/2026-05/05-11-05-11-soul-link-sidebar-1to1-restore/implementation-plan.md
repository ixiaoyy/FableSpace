# Implementation Notes

## Root Cause
上一轮为了修 `Play` 未导入，把 sidebar 的部分参考视觉改成 lucide DOM 图标与新的文字层级，导致和 owner reference 图明显偏离：图标变大、线宽不同、英文 eyebrow 暴露、logo 出现大方框、选中态左侧紫条过重。

## Change
- Import the locked sidebar reference slices for home/discover light/black variants.
- Render each sidebar as the exact locked sidebar PNG visual layer.
- Overlay transparent accessible/clickable hot zones for logo, nav items, invite card, and bottom actions.
- Keep the actual interactive behavior while making the rendered visual come directly from the approved reference asset.

## Verification
- `npm --prefix .\frontend run typecheck` → passed.
- `npm --prefix .\frontend run build` → passed.
- `node .\frontend\scripts\soul-link-reference-artboards-test.mjs` → passed.
- `npm --prefix .\frontend run test:soul-link-reference-ux` → passed.
- Playwright report: `.trellis/tasks/05-10-05-10-ui-ux-design-audit-and-polish/artifacts/playwright/soul-link-reference-check.md`.
- Home light desktop screenshot: `.trellis/tasks/05-10-05-10-ui-ux-design-audit-and-polish/artifacts/playwright/home-light-desktop.png`.

## Follow-up: shared navigation correction

User pointed out that search/discover should not use a second navigation. The previous image-slice-only fix still selected page-specific sidebar skins. Updated implementation so home and discover share the same sidebar base and the same DOM-rendered navigation item model; only `aria-current` / active visual state changes by page.

Additional validation after shared-nav correction:
- `npm --prefix .\frontend run typecheck` → passed.
- `npm --prefix .\frontend run build` → passed.
- `node .\frontend\scripts\soul-link-reference-artboards-test.mjs` → passed.
- `npm --prefix .\frontend run test:soul-link-reference-ux` → passed.
- Shared-nav screenshots copied to this task artifact folder.

## Follow-up: split sidebar image into header + DOM navigation

User clarified that the navigation should not be a whole image. Updated sidebar structure:
- Header/logo area keeps a clipped reference image, because that can remain grouped.
- Navigation items are independent DOM links with inline SVG icons, Chinese labels, badge, and active pill styling.
- Invite card and bottom controls are DOM, not part of a whole-sidebar image.
- Home and discover still share the same nav item source and component.

Validation after split:
- `npm --prefix .\frontend run typecheck` → passed.
- `npm --prefix .\frontend run build` → passed.
- `node .\frontend\scripts\soul-link-reference-artboards-test.mjs` → passed.
- `npm --prefix .\frontend run test:soul-link-reference-ux` → passed.

## Follow-up: replace sidebar nav icons from owner icon references

User provided the sidebar icon references under `图标参考/` and asked to swap only the left navigation icons. Updated implementation so the shared sidebar nav uses project-local PNG assets derived from those references instead of inline SVG/lucide-style icons:

- Runtime icon assets are stored in `frontend/app/assets/soul-link-05-10/icons/`.
- Source mapping:
  - `834b6313-486b-463b-bbc5-4307f69079b6.png` → `nav-home.png`
  - `2d357dd9-18d9-40f6-bb95-8c35f972eae3.png` → `nav-discover.png`
  - `dc9ae9ad-9d12-49c2-b4ee-8db5fe039cb8.png` → `nav-echoes.png`
  - `dd6818d6-a486-4433-879b-6d02b35cc8bb.png` → `nav-memory.png`
  - `ef54191b-f0cc-425f-9e85-c7e9dad3bf0b.png` → `nav-saved.png`
  - `fca6e55f-3bc1-4eb4-be09-bdd687146056.png` → `nav-anchors.png`
  - `d6900b89-fe4f-4ecb-b9c1-3cac01db5433.png` → `nav-create.png`
- Cropping/resizing only removed transparent canvas haze and normalized to 128x128; source reference artwork was not regenerated.

Validation after icon replacement:
- `node .\frontend\scripts\soul-link-reference-artboards-test.mjs` → passed.
- `npm --prefix .\frontend run build` → passed.
- `npm --prefix .\frontend run test:soul-link-reference-ux` → passed.
- Icon contact sheet: `.trellis/tasks/05-11-05-11-soul-link-sidebar-1to1-restore/artifacts/playwright/nav-icons-contact-sheet.png`.
- Sidebar screenshot: `.trellis/tasks/05-11-05-11-soul-link-sidebar-1to1-restore/artifacts/playwright/sidebar-icons-after-reference-assets.png`.
