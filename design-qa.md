# Design QA - Shared Tavern Space Homepage

Final result: passed

## Source Of Truth

- Reference image: `图片参考/空间主页/image.png`
- Implemented route: `/tavern/:tavernId`, shared by `continuity-tavern`, `engagement-demo`, and other tavern IDs.

## Evidence

- Full desktop comparison: `artifacts/assets/2026-06-24-space-homepage-layout/comparison-desktop.png`
- Hero comparison: `artifacts/assets/2026-06-24-space-homepage-layout/comparison-hero.png`
- Continuity desktop screenshot: `artifacts/assets/2026-06-24-space-homepage-layout/continuity-build-desktop.png`
- Engagement desktop screenshot: `artifacts/assets/2026-06-24-space-homepage-layout/engagement-build-desktop.png`
- Engagement mobile screenshot: `artifacts/assets/2026-06-24-space-homepage-layout/engagement-build-mobile.png`

## Checked States

- `continuity-tavern` desktop at 1536 x 2304.
- `engagement-demo` desktop at 1536 x 2304.
- `engagement-demo` mobile at 390 x 844.

## Results

- Shared layout is applied through `frontend/app/routes/tavern.tsx`, not a per-ID special case.
- Core sections are present: hero, recent activity, story entries, resident characters, space memory, right rail, and existing chat workbench anchor.
- Production-build visual checks show CSS applied, no horizontal overflow, and visible viewport images loaded.
- Sparse current backend data changes density: `continuity-tavern` and `engagement-demo` each expose only one NPC in entry view, so the resident-character area cannot match the reference's four populated character cards without inventing public content.

## Known Non-Visual Observation

The local SPA build preview emits React hydration errors #418/#423. The same errors also occur on the root `/` route under the same preview server, so this is recorded as an existing/global SPA preview behavior rather than a tavern-layout-specific regression. The page still mounts, displays CSS, loads data, and passes the visual checks above.