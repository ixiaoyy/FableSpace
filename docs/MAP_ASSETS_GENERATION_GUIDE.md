# Map Assets Generation Guide

## Overview

This script generates all 26 map assets for FableMap using the Replicate API (Stable Diffusion):
- **Pack A (Dream-Glade Night)**: 1 scene + 6 icons + 6 tiles
- **Pack B (Pastoral Storybook)**: 1 scene + 6 icons + 6 tiles

## Setup

### 1. Get Replicate API Token
- Visit: https://replicate.com/account/api-tokens
- Sign up for free (includes free credits)
- Copy your API token

### 2. Install Dependencies
```bash
pip install replicate requests
```

### 3. Set Environment Variable
```bash
# macOS/Linux
export REPLICATE_API_TOKEN=your-token-here

# Windows (PowerShell)
$env:REPLICATE_API_TOKEN="your-token-here"

# Windows (Command Prompt)
set REPLICATE_API_TOKEN=your-token-here
```

### 4. Run the Script
```bash
python scripts/generate_map_assets.py
```

## Output Structure

Assets will be generated in `fablemap/demo_assets/new_map_assets/`:

```
new_map_assets/
├── pack_a/
│   ├── scene_01.png (1024×1024)
│   ├── icons/
│   │   ├── quest.png
│   │   ├── shop.png
│   │   ├── boss.png
│   │   ├── home.png
│   │   ├── echo.png
│   │   └── event.png
│   └── tiles/
│       ├── road_01.png
│       ├── road_02.png
│       ├── ground_01.png
│       ├── ground_02.png
│       ├── water_01.png
│       └── magic_01.png
└── pack_b/
    ├── scene_01.png (1024×1024)
    ├── icons/
    │   ├── quest.png
    │   ├── shop.png
    │   ├── boss.png
    │   ├── home.png
    │   ├── echo.png
    │   └── event.png
    └── tiles/
        ├── road_01.png
        ├── road_02.png
        ├── ground_01.png
        ├── ground_02.png
        ├── water_01.png
        └── garden_01.png
```

## Generation Details

### Pack A: Dream-Glade Night
- **Palette**: Deep violet/indigo, cyan/magenta glow, warm gold, soft blue
- **Style**: Nocturne synth-fantasy, painterly vector hybrid
- **Scene**: Isometric night city with glowing river, grid roads, POI rings
- **Icons**: Cyan-magenta neon halos on dark background
- **Tiles**: Seamless nocturne textures with glow edges

### Pack B: Pastoral Storybook
- **Palette**: Soft mint/teal, warm terracotta, cream parchment, high-chroma accents
- **Style**: Pastel storybook, painterly vector hybrid
- **Scene**: Isometric sunny village with meadows, bridges, cottages
- **Icons**: Warm orange-gold rims on transparent background
- **Tiles**: Seamless pastel textures with soft appearance

## Timing

- Each image takes ~30-60 seconds to generate
- Total generation time: ~30-45 minutes for all 26 assets
- The script polls Replicate API every 5 seconds for completion

## Troubleshooting

### "REPLICATE_API_TOKEN not set"
Make sure you've set the environment variable correctly and restarted your terminal.

### "Generation timeout"
- Check your internet connection
- Verify your Replicate API token is valid
- Try running again (may be temporary API issue)

### "Generation failed"
- Check the error message from Replicate
- Try adjusting the prompt if specific elements aren't rendering well
- Replicate may have rate limits on free tier
- Failed generations are no longer written as placeholder `.png` files; re-run the script after fixing the issue

### Output directory exists but images seem invalid
- Existing filenames alone do **not** guarantee successful image generation
- Verify file sizes and confirm the files can be opened as real PNG images
- If earlier runs created placeholder text files, delete the invalid files before re-running generation

## Customization

To modify prompts, edit the `PACK_A_SPECS` and `PACK_B_SPECS` dictionaries in the script:

```python
PACK_A_SPECS = {
    "scene": {
        "prompt": "your custom prompt here..."
    },
    "icons": {
        "quest": "custom icon prompt..."
    },
    ...
}
```

## Next Steps

After generation:
1. Review generated assets in `fablemap/demo_assets/new_map_assets/`
2. Verify consistency across both packs
3. Commit assets to repository
4. Integrate into frontend (WorldMap.jsx)
