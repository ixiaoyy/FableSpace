# Mimi Nya Anime Art Upgrade Notes

## Scope

Replace the five existing Mimi Nya public NPC expression PNGs in place:

- `frontend/public/assets/npcs/mimi-nya-neutral.png`
- `frontend/public/assets/npcs/mimi-nya-joy.png`
- `frontend/public/assets/npcs/mimi-nya-anger.png`
- `frontend/public/assets/npcs/mimi-nya-embarrassment.png`
- `frontend/public/assets/npcs/mimi-nya-curiosity.png`

No backend payload change is needed because `default_taverns.py` already references these stable URLs.

## Source To Target Mapping

Historical generated source directory recorded during the prior replacement:

```text
C:\Users\phpxi\.codex\generated_images\019dcf21-f15f-7b90-95f9-5cb414da9381
```

Note: `.codex/generated_images` is not a stable project deliverable path and this directory is not present in the current local audit. The accepted deliverables are the repository files listed below.

Adopted project files:

| Expression | Project file | Source image |
| --- | --- | --- |
| neutral | `frontend/public/assets/npcs/mimi-nya-neutral.png` | `ig_0ecbd2405eb1eb340169ef79beb3448198816d09c470055bcd.png` |
| joy | `frontend/public/assets/npcs/mimi-nya-joy.png` | `ig_0ecbd2405eb1eb340169ef7a12bb8c8198b3b296cfc8c4e10b.png` |
| anger | `frontend/public/assets/npcs/mimi-nya-anger.png` | `ig_0ecbd2405eb1eb340169ef7a630a9081989c3a9373e2241ed2.png` |
| embarrassment | `frontend/public/assets/npcs/mimi-nya-embarrassment.png` | `ig_0ecbd2405eb1eb340169ef7b2b11b08198aa51bd655901f200.png` |
| curiosity | `frontend/public/assets/npcs/mimi-nya-curiosity.png` | `ig_0ecbd2405eb1eb340169ef7b7f78908198ac05252b84a9bc17.png` |

Each source image was center-cropped and resized to `512x512` PNG before replacing the project file.

Review artifact:

```text
artifacts/mimi-nya-anime-art-upgrade/contact-sheet.png
```

## Verification

Fresh verification:

```powershell
py -3 -m pytest -q tests/test_default_public_welfare_taverns.py --tb=short
npm --prefix .\frontend run typecheck
npm --prefix .\frontend run build
```

Results:

- 2026-04-28 current project file audit: all five Mimi Nya PNGs exist in `frontend/public/assets/npcs/`, are `512x512`, and have distinct SHA-256 hashes.
- Default public-welfare tavern tests: `16 passed` after the broader default NPC expression-asset contract was added.
- Frontend typecheck: passed.
- Frontend build: passed.

## Visual Check

Contact sheet reviewed at `artifacts/mimi-nya-anime-art-upgrade/contact-sheet.png`:

- Character identity reads as the same adult white-haired catgirl across all five images.
- Each expression is visually distinct.
- Tavern / cyber tavern background cues remain visible.
- No text, watermark, logo, specific IP, or unsafe framing is visible in the contact sheet.
