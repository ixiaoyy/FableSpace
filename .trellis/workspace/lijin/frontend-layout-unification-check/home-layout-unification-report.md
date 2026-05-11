# Home layout unification check

Date: 2026-05-12

## Contract

- Black and light home pages must reference the same layout source, not two parallel layout constants.
- Variant branches may select material assets, copy, and colors only.
- Navigation/sidebar must be real DOM/CSS; black home must not import a full sidebar bitmap.
- If a material asset does not match the shared slot ratio/size, report the path and target dimensions instead of silently creating a new crop.

## Source evidence

- `D:\work\ai-\frontend\app\components\soul-link-reference-artboards.tsx` uses one `HOME_LAYOUT` object for home sidebar, user cluster, hero, hero decorations, current-coordinate badge, search, hero actions, card grid, right rail, and bottom rail.
- Removed home-only geometry constants from the component source: `HOME_RIGHT_RAIL`, `HOME_BOTTOM_RAIL`, `SHARED_USER_CLUSTER`, `SIDEBAR_REFERENCE_PANELS`, `SIDEBAR_INVITE_CARDS`.
- Removed black sidebar full-bitmap imports; `D:\work\ai-\frontend\app\assets\soul-link-05-10\home-black\sidebar.png` and `sidebar-2x.png` are intentionally deleted.
- `SIDEBAR_MATERIALS` contains only invite-card material assets; nav/sidebar layout and logo are DOM/CSS.
- Added source-level tests that forbid black-specific home geometry drift and forbid black full-sidebar bitmap usage.

## Asset fit notes

| Asset | Current dimensions | Shared slot | Note |
| --- | ---: | ---: | --- |
| `D:\work\ai-\frontend\app\assets\soul-link-05-10\home-black\hero-system-visual.png` | 1672x941 | 1000x530 | Aspect ratio 1.777 vs slot 1.887; `object-cover` may crop. If you want zero crop, provide/crop to 1000x530 or any 1.887:1 size such as 2000x1060. |
| `D:\work\ai-\frontend\app\assets\soul-link-05-10\home-black\sidebar.png` | deleted | n/a | Correct: sidebar/nav is DOM/CSS, not a full navigation bitmap. |
| `D:\work\ai-\frontend\app\assets\soul-link-05-10\home-black\invite-card.png` | 151x170 | 151x170 | Exact slot fit. |

## Verification

- `node .\frontend\scripts\home-visual-density-test.mjs` => PASS
- `node .\frontend\scripts\soul-link-reference-artboards-test.mjs` => PASS
- `npm --prefix .\frontend run build` => PASS
- Ad-hoc Playwright screenshots after light repair:
  - `D:\work\ai-\.trellis\workspace\lijin\light-layout-fix\home-light-after-fix.png`
  - `D:\work\ai-\.trellis\workspace\lijin\light-layout-fix\home-black-after-fix.png`
- `npm --prefix .\frontend run test:soul-link-reference-ux` could not write the tracked screenshot artifact because Windows reported an `UNKNOWN` file-open error on `home-light-desktop.png`; the ad-hoc Playwright pass above used a fresh workspace path and passed.
- Previous `npm --prefix .\frontend run typecheck` failed, blocked by existing JSX parse errors in `D:\work\ai-\frontend\app\product\CharacterEditor.jsx` at lines 373, 805, 1070, 1082, 1083.

## Grill-Me verdict

Verdict: PASS with one remaining asset-fit risk; typecheck is BLOCKED by unrelated existing JSX parse errors.

Problems found:
1. Black hero material aspect ratio does not match the shared light layout slot; exact path and target ratio are listed above.
2. Repository-wide frontend typecheck cannot currently complete because `CharacterEditor.jsx` has JSX parse errors unrelated to this home layout change.

Smallest safe next step:
- If the black hero crop is visually unacceptable, replace only `hero-system-visual.png` with a target-ratio asset. Do not add another layout and do not reintroduce a sidebar bitmap.
