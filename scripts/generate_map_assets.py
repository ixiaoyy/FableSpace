#!/usr/bin/env python3
"""
Generate map assets for FableMap using Replicate API (Stable Diffusion).

Generates two asset packs (Pack A: Dream-Glade Night, Pack B: Pastoral Storybook)
with scenes, icons, and tiles based on MAP_ASSETS_PLAN.md specifications.

Output: fablemap/demo_assets/new_map_assets/pack_a/ and pack_b/

Setup:
  1. Get a free Replicate API token: https://replicate.com/account/api-tokens
  2. Install dependencies: pip install replicate requests
  3. Set environment: export REPLICATE_API_TOKEN=your-token
  4. Run: python scripts/generate_map_assets.py
"""

import os
import sys
from pathlib import Path
from typing import Optional

import replicate
import requests

# Asset specifications from MAP_ASSETS_PLAN.md
PACK_A_SPECS = {
    "name": "Dream-Glade Night",
    "scene": {
        "filename": "scene_01.png",
        "size": "1024x1024",
        "prompt": "isometric fantasy night city map, deep violet and indigo atmosphere, glowing river ribbon, grid-like roads, soft star particles, floating luminous POI rings, small cozy buildings and trees, dreamy magical glow, painterly vector hybrid, soft linework, high detail, no text"
    },
    "icons": {
        "quest": "glowing circular UI icon token, scroll or exclamation star, neon cyan-magenta halo, soft bloom, subtle sparkles, dark transparent background, painterly vector hybrid, crisp silhouette, no text",
        "shop": "glowing circular UI icon token, small house/storefront, neon cyan-magenta halo, soft bloom, subtle sparkles, dark transparent background, painterly vector hybrid, crisp silhouette, no text",
        "boss": "glowing circular UI icon token, horned mask, neon cyan-magenta halo, soft bloom, subtle sparkles, dark transparent background, painterly vector hybrid, crisp silhouette, no text",
        "home": "glowing circular UI icon token, cozy house, neon cyan-magenta halo, soft bloom, subtle sparkles, dark transparent background, painterly vector hybrid, crisp silhouette, no text",
        "echo": "glowing circular UI icon token, crystal or droplet, neon cyan-magenta halo, soft bloom, subtle sparkles, dark transparent background, painterly vector hybrid, crisp silhouette, no text",
        "event": "glowing circular UI icon token, lantern or flame, neon cyan-magenta halo, soft bloom, subtle sparkles, dark transparent background, painterly vector hybrid, crisp silhouette, no text"
    },
    "tiles": {
        "road_01": "seamless tile, dark cobblestone with faint cyan seams, nocturne palette, subtle glow edges, painterly vector hybrid, soft texture, no text",
        "road_02": "seamless tile, smooth slate path with violet edge glow, nocturne palette, subtle glow edges, painterly vector hybrid, soft texture, no text",
        "ground_01": "seamless tile, dark grass with small flowers/sparks, nocturne palette, subtle glow edges, painterly vector hybrid, soft texture, no text",
        "ground_02": "seamless tile, forest floor with scattered leaves, nocturne palette, subtle glow edges, painterly vector hybrid, soft texture, no text",
        "water_01": "seamless tile, deep blue river with shimmering particles, nocturne palette, subtle glow edges, painterly vector hybrid, soft texture, no text",
        "magic_01": "seamless tile, circular magic sigil tile with faint runes, nocturne palette, subtle glow edges, painterly vector hybrid, soft texture, no text"
    }
}

PACK_B_SPECS = {
    "name": "Pastoral Storybook",
    "scene": {
        "filename": "scene_01.png",
        "size": "1024x1024",
        "prompt": "isometric pastel storybook village map, sunny meadow with winding paths, bright river, stone bridges, cozy cottages with red roofs, flowers and bushes, warm ambient light, floating POI bubbles, painterly vector hybrid, soft linework, high detail, no text"
    },
    "icons": {
        "quest": "glowing circular UI icon token, book or letter, warm orange-gold rim, soft pastel glow, subtle sparkles, transparent background, painterly vector hybrid, crisp silhouette, no text",
        "shop": "glowing circular UI icon token, market stall, warm orange-gold rim, soft pastel glow, subtle sparkles, transparent background, painterly vector hybrid, crisp silhouette, no text",
        "boss": "glowing circular UI icon token, crown or shield, warm orange-gold rim, soft pastel glow, subtle sparkles, transparent background, painterly vector hybrid, crisp silhouette, no text",
        "home": "glowing circular UI icon token, cottage, warm orange-gold rim, soft pastel glow, subtle sparkles, transparent background, painterly vector hybrid, crisp silhouette, no text",
        "echo": "glowing circular UI icon token, water droplet, warm orange-gold rim, soft pastel glow, subtle sparkles, transparent background, painterly vector hybrid, crisp silhouette, no text",
        "event": "glowing circular UI icon token, speech bubble or bell, warm orange-gold rim, soft pastel glow, subtle sparkles, transparent background, painterly vector hybrid, crisp silhouette, no text"
    },
    "tiles": {
        "road_01": "seamless tile, warm stone path, pastel storybook palette, soft texture, painterly vector hybrid, no text",
        "road_02": "seamless tile, light brick path with flower edges, pastel storybook palette, soft texture, painterly vector hybrid, no text",
        "ground_01": "seamless tile, lush green grass with tiny flowers, pastel storybook palette, soft texture, painterly vector hybrid, no text",
        "ground_02": "seamless tile, meadow soil with pebbles, pastel storybook palette, soft texture, painterly vector hybrid, no text",
        "water_01": "seamless tile, turquoise river with soft highlights, pastel storybook palette, soft texture, painterly vector hybrid, no text",
        "garden_01": "seamless tile, patterned flower bed patch, pastel storybook palette, soft texture, painterly vector hybrid, no text"
    }
}


def ensure_output_dirs(base_path: str) -> tuple[Path, Path]:
    """Create output directories for both packs."""
    pack_a_dir = Path(base_path) / "pack_a"
    pack_b_dir = Path(base_path) / "pack_b"

    for pack_dir in [pack_a_dir, pack_b_dir]:
        (pack_dir / "icons").mkdir(parents=True, exist_ok=True)
        (pack_dir / "tiles").mkdir(parents=True, exist_ok=True)

    return pack_a_dir, pack_b_dir


def generate_image(api_token: str, prompt: str, size: str = "1024x1024") -> Optional[bytes]:
    """
    Generate an image using Replicate API.

    Args:
        api_token: Replicate API token
        prompt: Image generation prompt
        size: Image size (e.g., "1024x1024", "256x256")

    Returns:
        Image bytes or None if generation fails
    """
    try:
        api_token = api_token.strip()
        print(f"  Generating: {prompt[:60]}...")

        size_to_aspect_ratio = {
            "1024x1024": "1:1",
            "256x256": "1:1",
        }
        aspect_ratio = size_to_aspect_ratio.get(size, "1:1")

        client = replicate.Client(api_token=api_token)
        output = client.run(
            "black-forest-labs/flux-schnell",
            input={
                "prompt": prompt,
                "aspect_ratio": aspect_ratio,
                "num_outputs": 1,
                "output_format": "png",
                "output_quality": 100,
            },
        )

        if isinstance(output, list):
            if not output:
                print("    [ERROR] Replicate returned no output")
                return None
            output = output[0]

        if hasattr(output, "read"):
            return output.read()

        if isinstance(output, str):
            img_response = requests.get(output, timeout=60)
            img_response.raise_for_status()
            return img_response.content

        print(f"    [ERROR] Unsupported Replicate output type: {type(output).__name__}")
        return None

    except Exception as e:
        print(f"  Error generating image: {e}")
        return None


def save_image(image_data: Optional[bytes], output_path: Path) -> bool:
    """Save image data to file."""
    if image_data is None:
        print(f"    [failed] No image data returned for {output_path.name}")
        return False

    try:
        output_path.parent.mkdir(parents=True, exist_ok=True)
        output_path.write_bytes(image_data)
        print(f"    [saved] {output_path.name}")
        return True
    except Exception as e:
        print(f"    [ERROR] Failed to save {output_path.name}: {e}")
        return False


def generate_pack(
    api_token: str,
    pack_name: str,
    pack_specs: dict,
    output_dir: Path
) -> int:
    """
    Generate all assets for a pack.

    Returns: Number of successfully generated assets
    """
    print(f"\n{'='*60}")
    print(f"Generating {pack_name} ({pack_specs['name']})")
    print(f"{'='*60}")

    success_count = 0

    # Generate scene
    print(f"\n[Scene] {pack_specs['scene']['filename']}")
    scene_data = generate_image(api_token, pack_specs['scene']['prompt'], pack_specs['scene']['size'])
    if save_image(scene_data, output_dir / pack_specs['scene']['filename']):
        success_count += 1

    # Generate icons
    print(f"\n[Icons] 6 assets")
    for icon_name, icon_prompt in pack_specs['icons'].items():
        icon_path = output_dir / "icons" / f"{icon_name}.png"
        icon_data = generate_image(api_token, icon_prompt, "256x256")
        if save_image(icon_data, icon_path):
            success_count += 1

    # Generate tiles
    print(f"\n[Tiles] {len(pack_specs['tiles'])} assets")
    for tile_name, tile_prompt in pack_specs['tiles'].items():
        tile_path = output_dir / "tiles" / f"{tile_name}.png"
        tile_data = generate_image(api_token, tile_prompt, "256x256")
        if save_image(tile_data, tile_path):
            success_count += 1

    return success_count


def main():
    """Main entry point."""
    # Setup
    api_token = os.environ.get("REPLICATE_API_TOKEN", "").strip()
    if not api_token:
        print("Error: REPLICATE_API_TOKEN environment variable not set")
        print("\nSetup instructions:")
        print("1. Get a free API token: https://replicate.com/account/api-tokens")
        print("2. Install dependencies: pip install replicate requests")
        print("3. Set environment: export REPLICATE_API_TOKEN=your-token")
        print("4. Run this script again")
        sys.exit(1)

    # Determine output path
    script_dir = Path(__file__).parent
    project_root = script_dir.parent
    output_base = project_root / "fablemap" / "demo_assets" / "new_map_assets"

    print(f"Output directory: {output_base}")

    # Create directories
    pack_a_dir, pack_b_dir = ensure_output_dirs(output_base)

    # Generate packs
    total_success = 0
    total_success += generate_pack(api_token, "Pack A", PACK_A_SPECS, pack_a_dir)
    total_success += generate_pack(api_token, "Pack B", PACK_B_SPECS, pack_b_dir)

    # Summary
    total_assets = 2 + 6 + 6 + 2 + 6 + 6  # 2 scenes + 12 icons + 12 tiles
    print(f"\n{'='*60}")
    print(f"Generation Complete")
    print(f"{'='*60}")
    print(f"Successfully generated: {total_success}/{total_assets} assets")
    print(f"Output: {output_base}")

    if total_success == total_assets:
        print("[OK] All assets generated successfully!")
        return 0
    else:
        print(f"[WARN] {total_assets - total_success} assets failed or skipped")
        return 1


if __name__ == "__main__":
    sys.exit(main())
