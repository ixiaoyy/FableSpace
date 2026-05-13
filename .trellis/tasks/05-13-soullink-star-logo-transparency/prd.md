# Fix SoulLink Star Logo Transparency

## Goal
修复 `home-light/star.png` 与 `home-black/star.png` 被白底扁平化的问题，让左上角 SoulLink logo 图片以透明背景叠加到现有侧栏上。

## Requirements
- 只处理两张项目内 PNG 的 alpha 通道，不重新生成设计、不改业务逻辑。
- 保持原始尺寸与主体图案，尽量只移除边缘连通的近白背景。
- 不跑 Playwright、不截图。
- 运行图片文件检查与前端 build。

## Acceptance Criteria
- [x] 两张 star PNG 为 RGBA，角落 alpha 为 0。
- [x] 图片尺寸保持 1254×1254。
- [x] `npm --prefix .\frontend run build` 通过。

## Technical Notes
- 目标文件：
  - `frontend/app/assets/soul-link-05-10/home-light/star.png`
  - `frontend/app/assets/soul-link-05-10/home-black/star.png`


## Implementation Notes
- Backed up original RGB white-background files under `.trellis/tasks/05-13-soullink-star-logo-transparency/artifacts/source-rgb-backups/`.
- Reprocessed both star PNGs by flood-filling border-connected near-white pixels and setting those pixels alpha to 0.
- Did not run Playwright and did not capture screenshots per user instruction.

## Validation Evidence
- Alpha check: both images are RGBA, `alpha_extrema=(0, 255)`, all four corners have alpha `0`.
- `node .\frontend\scripts\soul-link-reference-artboards-test.mjs` → PASS
- `node .\frontend\scripts\home-visual-density-test.mjs` → PASS
- `npm --prefix .\frontend run build` → PASS

## Final Asset Hashes
- `frontend/app/assets/soul-link-05-10/home-light/star.png`: `aea9b867fac7694cf11cdd4e80de01fa623d926dbb743dfa18808dcb6991b870`
- `frontend/app/assets/soul-link-05-10/home-black/star.png`: `aa7bf578806897bb7501bdd93895d371fcca842b882050fde4ab6210e6d0969d`
