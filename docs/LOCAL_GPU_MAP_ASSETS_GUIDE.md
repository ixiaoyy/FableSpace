# Local GPU Map Assets Generation Guide

## Purpose

This document explains how to move FableMap asset generation from hosted APIs to a stronger local GPU machine, so you can generate the full map asset pack without Replicate credit limits or API throttling.

Relevant project files:
- [`scripts/generate_map_assets.py`](scripts/generate_map_assets.py)
- [`docs/MAP_ASSETS_GENERATION_GUIDE.md`](docs/MAP_ASSETS_GENERATION_GUIDE.md)
- [`docs/changes/2026-03-16-map-assets-generation-pack-a-b.md`](docs/changes/2026-03-16-map-assets-generation-pack-a-b.md)

---

## Recommended Approach

For a stronger GPU computer, the most practical free route is:

1. Install a local image-generation UI
2. Run a local Stable Diffusion-compatible workflow
3. Either:
   - generate assets manually from the prompts, or
   - later adapt [`scripts/generate_map_assets.py`](scripts/generate_map_assets.py) to call the local API

### Recommended tools

Pick one:

- **[`ComfyUI`](https://github.com/comfyanonymous/ComfyUI)**
  - Best for reproducible workflows
  - Better for batch generation and later automation
- **[`AUTOMATIC1111`](https://github.com/AUTOMATIC1111/stable-diffusion-webui)**
  - Easier for quick manual use
  - Better for interactive prompt tweaking

If the target machine has a good NVIDIA GPU, [`ComfyUI`](https://github.com/comfyanonymous/ComfyUI) is the recommended choice.

---

## Hardware Recommendation

Minimum usable:
- NVIDIA GPU with **8 GB VRAM**
- 16 GB system RAM
- 30+ GB free disk space

Recommended:
- NVIDIA GPU with **12 GB+ VRAM**
- 32 GB system RAM
- SSD storage

More VRAM helps for:
- larger scenes
- faster batch generation
- SDXL-class models

---

## Model Recommendation

### Fastest / lightest
- **Stable Diffusion 1.5**
- Good for icons, tiles, and rough scene drafts

### Better quality
- **SDXL** or SDXL-based checkpoints
- Better for polished full-scene images
- Heavier on VRAM

### Practical recommendation for this project
- Use **SDXL or a good SDXL-style fantasy model** for scene images
- Use **SD 1.5 or SDXL** for icons and tiles depending on GPU performance

---

## What Needs to Be Generated

The project expects **26 images total** under [`fablemap/demo_assets/new_map_assets/`](fablemap/demo_assets/new_map_assets/):

- **Pack A**
  - 1 scene
  - 6 icons
  - 6 tiles
- **Pack B**
  - 1 scene
  - 6 icons
  - 6 tiles

Target structure:

```text
fablemap/demo_assets/new_map_assets/
├── pack_a/
│   ├── scene_01.png
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
    ├── scene_01.png
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

---

## Migration Plan

### Option A: Manual generation on the stronger GPU machine

This is the fastest path.

1. Copy the repository to the stronger machine
2. Install [`ComfyUI`](https://github.com/comfyanonymous/ComfyUI) or [`AUTOMATIC1111`](https://github.com/AUTOMATIC1111/stable-diffusion-webui)
3. Load a local checkpoint
4. Open [`scripts/generate_map_assets.py`](scripts/generate_map_assets.py)
5. Reuse the prompt texts from:
   - [`PACK_A_SPECS`](scripts/generate_map_assets.py:25)
   - [`PACK_B_SPECS`](scripts/generate_map_assets.py:50)
6. Generate images manually
7. Save them into [`fablemap/demo_assets/new_map_assets/`](fablemap/demo_assets/new_map_assets/)
8. Review results in the app

This avoids any extra code changes.

### Option B: Local API automation on the stronger GPU machine

This is better for repeatable generation.

1. Install and run a local generation server
2. Expose a local HTTP API
3. Modify [`generate_image()`](scripts/generate_map_assets.py:89) to call the local endpoint instead of Replicate
4. Keep the rest of the script structure intact
5. Run [`python scripts/generate_map_assets.py`](scripts/generate_map_assets.py)

This keeps filenames, folder structure, and batch flow consistent.

---

## Suggested Setup on the New Machine

### 1. Install Python and Git
- Python 3.10+ recommended
- Git recommended for cloning the repository

### 2. Copy the project
Put the project on the stronger machine, preserving the same relative paths if possible.

### 3. Install local generation tool

#### If using ComfyUI
Typical steps:
1. Clone [`ComfyUI`](https://github.com/comfyanonymous/ComfyUI)
2. Install Python dependencies
3. Download a checkpoint model
4. Start the UI
5. Test one prompt first

#### If using AUTOMATIC1111
Typical steps:
1. Clone [`AUTOMATIC1111`](https://github.com/AUTOMATIC1111/stable-diffusion-webui)
2. Put a model checkpoint into the models directory
3. Launch the web UI
4. Test one prompt first

---

## Suggested Generation Parameters

These are safe starting points.

### Scenes
- Size: **1024×1024**
- Steps:
  - SD 1.5: 25–40
  - SDXL: 20–35
- CFG / guidance: 6–8
- Sampler: Euler a / DPM++ 2M / similar stable sampler

### Icons
- Size: **256×256** or **512×512** then downscale
- Prefer transparent or clean background if possible
- Keep silhouettes bold and readable

### Tiles
- Size: **256×256** or **512×512** then crop/downscale
- Use seamless / tileable generation if the UI supports it
- If not, generate larger texture patches and refine manually

---

## Prompt Sources

Primary prompts already exist in [`scripts/generate_map_assets.py`](scripts/generate_map_assets.py):

- Pack A scene prompt: [`PACK_A_SPECS`](scripts/generate_map_assets.py:27)
- Pack A icon prompts: [`PACK_A_SPECS`](scripts/generate_map_assets.py:32)
- Pack A tile prompts: [`PACK_A_SPECS`](scripts/generate_map_assets.py:40)
- Pack B scene prompt: [`PACK_B_SPECS`](scripts/generate_map_assets.py:52)
- Pack B icon prompts: [`PACK_B_SPECS`](scripts/generate_map_assets.py:57)
- Pack B tile prompts: [`PACK_B_SPECS`](scripts/generate_map_assets.py:65)

You can also cross-check intended style in [`docs/MAP_ASSETS_GENERATION_GUIDE.md`](docs/MAP_ASSETS_GENERATION_GUIDE.md).

---

## Quality Control Checklist

After generation, verify:

- scene images are full-size and readable
- icons remain legible at small size
- tiles visually loop well enough for map use
- Pack A stays nocturne / violet / glowing
- Pack B stays bright / pastoral / storybook
- filenames exactly match what the frontend expects
- outputs are saved under [`fablemap/demo_assets/new_map_assets/`](fablemap/demo_assets/new_map_assets/)

---

## Recommended Workflow

### First pass
Generate all 26 images quickly to fill the structure.

### Second pass
Replace only weak outputs:
- unclear icons
- muddy scene composition
- non-seamless tiles
- style mismatch between assets

### Third pass
Check integration in the app and keep the best variants.

---

## If You Want Full Local Automation Later

The cleanest future path is to refactor [`generate_image()`](scripts/generate_map_assets.py:89) so it supports a provider switch, for example:

- `replicate`
- `local-comfyui`
- `local-a1111`

That would let the script keep the same prompts and output layout while changing only the backend provider.

---

## Practical Recommendation

When you move to the stronger machine:

1. Start with **manual generation** using [`ComfyUI`](https://github.com/comfyanonymous/ComfyUI)
2. Generate one full pack first
3. Confirm the art direction works
4. Then decide whether to automate [`generate_image()`](scripts/generate_map_assets.py:89)

This reduces setup risk and gets usable assets fastest.

---

## Current Project Status

Current script status on this machine:
- [`scripts/generate_map_assets.py`](scripts/generate_map_assets.py) has already been fixed for Windows-safe console output
- Replicate header formatting issues were fixed
- The remaining blocker is external service limits, not local script logic

So moving to a stronger GPU machine with a local generation stack is a valid next step.
