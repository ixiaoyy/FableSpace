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

Generated source directory:

```text
C:\Users\phpxi\.codex\generated_images\019dcf21-f15f-7b90-95f9-5cb414da9381
```

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
npm --prefix .\frontend run build
```

Results:

- Default public-welfare tavern tests: `13 passed`.
- Frontend build: passed.

## Remaining Manual Check

Human visual review is still required before calling the art task fully accepted:

- Character identity should read as the same adult white-haired catgirl across all five images.
- Each expression should be visually distinct.
- The tavern / cyber tavern background cues should remain visible at 256px display size.
- No text, watermark, logo, specific IP, or unsafe framing should be visible.
