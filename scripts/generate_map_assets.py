#!/usr/bin/env python3
"""
Generate map assets for FableMap using Replicate or local Stable Diffusion providers.

Supports two asset packs (Pack A: Dream-Glade Night, Pack B: Pastoral Storybook)
with scenes, icons, and tiles based on MAP_ASSETS_PLAN.md specifications.

Output: fablemap/demo_assets/new_map_assets/pack_a/ and pack_b/

Examples:
  python scripts/generate_map_assets.py --provider replicate
  python scripts/generate_map_assets.py --provider a1111 --base-url http://127.0.0.1:7860
  python scripts/generate_map_assets.py --provider comfyui --base-url http://127.0.0.1:8188 --comfyui-workflow-api
"""

from __future__ import annotations

import argparse
import base64
import copy
import io
import json
import os
import sys
import time
import urllib.parse
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Optional

import requests

try:
    import replicate
except ImportError:
    replicate = None

# Asset specifications from MAP_ASSETS_PLAN.md
PACK_A_SPECS = {
    "name": "Pastoral Fantasy Town",
    "scene": {
        "filename": "scene_01.png",
        "size": "1024x1024",
        "prompt": "2D game world map concept sheet, whimsical pastoral fantasy town, top-down and slightly isometric RPG map, cute readable roads and paths, cozy cottages, river, tiny bridges, flower fields, soft parchment background, clean hand-painted mobile game UI style, kawaii fantasy, cozy color blocks, charming map illustration, no realistic lighting, no horror, no monster face, no text, no labels",
    },
    "icons": {
        "quest": "2D RPG world map icon, rolled quest scroll badge, cute fantasy UI sticker, cream and gold palette, clean outline, readable at small size, game asset sheet style, no text, no realism",
        "shop": "2D RPG world map icon, tiny fantasy shop building badge, warm wood and red roof, cute mobile game asset, clean outline, readable at small size, no text, no realism",
        "boss": "2D RPG world map icon, friendly flower crown beast emblem, cute boss marker, whimsical fantasy badge, readable silhouette, game asset sheet style, no horror, no gore, no text",
        "home": "2D RPG world map icon, cozy cottage badge, cute pastoral house with warm roof, clean outline, readable silhouette, mobile game asset style, no text, no realism",
        "echo": "2D RPG world map icon, glowing butterfly crystal emblem, pastel magical badge, cute fantasy UI token, clean outline, readable silhouette, no text, no realism",
        "event": "2D RPG world map icon, magic wand and sparkle badge, cute fantasy event marker, polished game asset style, clean outline, readable silhouette, no text",
    },
    "buildings": {
        "house_01": "2D isometric building sprite, cozy pastoral cottage with warm roof, tiny chimney, flower boxes, readable game asset, clean outline, transparent background, no text",
        "house_02": "2D isometric building sprite, storybook village farmhouse with blue roof, stacked firewood, herb garden and small porch, readable fantasy map asset, transparent background, no text",
        "tower_01": "2D isometric building sprite, whimsical fantasy watch tower with pale stone base, ivy, banner, readable top-down angled game asset, transparent background, no text",
        "tower_02": "2D isometric building sprite, slim bell tower with pastel shingles, ivy-wrapped stone and hanging lantern, readable cozy fantasy structure asset, transparent background, no text",
        "shop_01": "2D isometric building sprite, charming pastoral item shop with striped awning, wood stall details, flower pots, readable RPG map asset, transparent background, no text",
        "shop_02": "2D isometric building sprite, baker shop with warm oven chimney, bread signboard, flower baskets and tidy window shutters, readable storybook town asset, transparent background, no text",
        "sanctum_01": "2D isometric building sprite, gentle healing sanctum with round roof, glowing windows, soft garden details, cozy fantasy structure asset, transparent background, no text",
        "sanctum_02": "2D isometric building sprite, moonwell chapel with pale stone arch, blue-glass windows, vine-wrapped columns and soft glow, readable healing landmark asset, transparent background, no text",
        "guildhall_01": "2D isometric building sprite, bright pastoral guild hall with golden crest, broad steps, timber frame and festival ribbons, readable town center asset, transparent background, no text",
        "inn_01": "2D isometric building sprite, cozy roadside inn with warm lantern windows, hanging sign frame, tiled roof and flower boxes, readable storybook RPG asset, transparent background, no text",
    },
    "decorations": {
        "tree_01": "2D isometric decoration sprite, lush round village tree with layered leaves, soft shadow, readable fantasy map prop, transparent background, no text",
        "tree_02": "2D isometric decoration sprite, flowering orchard tree with pink blossoms and curved trunk, cozy pastoral prop asset, transparent background, no text",
        "lamp_01": "2D isometric decoration sprite, warm iron lantern post with tiny flowers around base, readable storybook village prop, transparent background, no text",
        "fence_01": "2D isometric decoration sprite, short wooden fence segment with ivy and tiny flowers, clean modular fantasy map prop, transparent background, no text",
        "rock_01": "2D isometric decoration sprite, mossy stone cluster with grass tufts, readable pastoral environment prop, transparent background, no text",
        "bridge_01": "2D isometric decoration sprite, small wooden footbridge with flower rails, cozy village crossing prop, transparent background, no text",
        "cart_01": "2D isometric decoration sprite, small market cart with fruit crates and cloth canopy, readable pastoral town prop, transparent background, no text",
        "well_01": "2D isometric decoration sprite, circular village well with roof, bucket and stone rim, readable cozy landmark prop, transparent background, no text",
        "banner_01": "2D isometric decoration sprite, festive village banner arch with ribbons, pennants and flower garlands, readable pastoral celebration prop, transparent background, no text",
        "crate_01": "2D isometric decoration sprite, stacked supply crates with cloth roll and tiny flowers, readable cozy market prop, transparent background, no text",
    },
    "tiles": {
        "road_01": "seamless 2D game map tile, pale stone road with soft grass edge, cute pastoral fantasy world map style, hand-painted texture, readable from top down, no text",
        "road_02": "seamless 2D game map tile, light dirt path with small flowers, cozy fantasy overworld style, cute hand-painted mobile game texture, no text",
        "road_straight_01": "seamless 2D game map road material tile, straight pale cobblestone strip with tidy grass borders, pastoral fantasy overworld sprite texture, top-down readable lane material, no text",
        "road_corner_01": "seamless 2D game map road material tile, soft curved dirt-and-stone road corner with flower edge, cozy hand-painted fantasy route texture, no text",
        "road_cross_01": "seamless 2D game map road material tile, four-way village crossing made of pale stone and packed earth, cute pastoral route texture, readable top-down, no text",
        "ground_01": "seamless 2D game map tile, lush green meadow grass with tiny flowers, whimsical pastoral fantasy style, bright readable top-down texture, no text",
        "ground_02": "seamless 2D game map tile, clover meadow and soft garden soil, cute world map texture, pastel fantasy palette, no text",
        "ground_dirt_01": "seamless 2D game map ground material tile, warm brown village dirt with scattered petals and subtle footprints, cozy pastoral texture, no text",
        "ground_stone_01": "seamless 2D game map ground material tile, sun-worn pale plaza stone with moss seams, storybook fantasy town texture, no text",
        "water_01": "seamless 2D game map tile, bright turquoise river water with simple ripples, cute overworld map style, readable hand-painted texture, no text",
        "water_edge_01": "seamless 2D game map water edge material tile, shallow pond border blending turquoise water into grassy bank, cute pastoral fantasy texture, no text",
        "magic_01": "seamless 2D game map tile, soft glowing enchanted grass with sparkles, whimsical pastel fantasy texture, cute RPG world map style, no text",
        "flowerbed_01": "seamless 2D game map decorative ground tile, dense pastel flowerbed patch with leaves and petals, cozy village embellishment texture, no text",
        "plaza_01": "seamless 2D game map plaza tile, warm cream festival stone with petal confetti and soft chalk motifs, readable pastoral town center texture, no text",
        "path_glow_01": "seamless 2D game map decorative path tile, tiny lantern reflections and soft golden sparkles over packed earth, cozy fantasy travel texture, no text",
    },
}

PACK_B_SPECS = {
    "name": "Enchanted Forest Town",
    "scene": {
        "filename": "scene_01.png",
        "size": "1024x1024",
        "prompt": "2D game world map concept sheet, enchanted forest region, top-down and slightly isometric RPG map, glowing blue river, mushroom houses, crystal trees, tiny bridges, ruins, magical garden paths, cute readable fantasy world layout, hand-painted mobile game art, decorative parchment sheet feeling, clean map illustration, no horror, no grotesque creature, no text, no labels",
    },
    "icons": {
        "quest": "2D RPG world map icon, ancient embroidered scroll badge, enchanted forest UI icon, pastel gold and teal, clean outline, readable at small size, no text",
        "shop": "2D RPG world map icon, tiny caravan wagon badge, enchanted forest merchant marker, cute fantasy asset, clean outline, readable silhouette, no text",
        "boss": "2D RPG world map icon, friendly forest spirit mask with flowers, cute boss emblem, magical forest badge, readable silhouette, no horror, no gore, no text",
        "home": "2D RPG world map icon, mushroom cottage badge, enchanted forest home marker, cute fantasy asset style, clean outline, readable silhouette, no text",
        "echo": "2D RPG world map icon, glowing butterfly emblem, luminous spirit token, cute magical UI badge, clean outline, readable silhouette, no text",
        "event": "2D RPG world map icon, crystal wand badge, enchanted event marker, polished fantasy UI sticker, readable silhouette, no text",
    },
    "buildings": {
        "house_01": "2D isometric building sprite, enchanted mushroom cottage with glowing windows, moss roof, flower clusters, readable fantasy map asset, transparent background, no text",
        "house_02": "2D isometric building sprite, root-woven forest lodge with teal windows, hanging herbs and glowing mushrooms, readable enchanted town asset, transparent background, no text",
        "tower_01": "2D isometric building sprite, ancient crystal tower with roots and teal glow, enchanted forest landmark structure, readable game asset, transparent background, no text",
        "tower_02": "2D isometric building sprite, moonlit druid tower with spiral roots, crystal lanterns and blue banners, readable magical forest structure, transparent background, no text",
        "shop_01": "2D isometric building sprite, magical forest market hut with lanterns and herb bundles, cozy merchant building asset, transparent background, no text",
        "shop_02": "2D isometric building sprite, potion apothecary with glowing bottles, curved wood roof and herb racks, readable enchanted merchant asset, transparent background, no text",
        "sanctum_01": "2D isometric building sprite, luminous spirit shrine with crystal petals, soft blue windows, enchanted healing structure asset, transparent background, no text",
        "sanctum_02": "2D isometric building sprite, forest moon shrine with rune stones, glowing pool and petal canopy, readable mystical healing landmark, transparent background, no text",
        "archive_01": "2D isometric building sprite, rune archive hall grown from roots and crystal shelves, moonlit windows and teal sigils, readable enchanted civic asset, transparent background, no text",
        "forge_01": "2D isometric building sprite, crystal forge pavilion with blue fire basin, twisted roots and glowing anvils, readable magical industry asset, transparent background, no text",
    },
    "decorations": {
        "tree_01": "2D isometric decoration sprite, luminous crystal tree with teal leaves and glowing roots, readable enchanted forest prop, transparent background, no text",
        "tree_02": "2D isometric decoration sprite, twisted moonwood tree with hanging lantern flowers and moss, readable magical woodland prop, transparent background, no text",
        "lamp_01": "2D isometric decoration sprite, crystal lamp post with blue glow and vine-wrapped base, readable enchanted path prop, transparent background, no text",
        "fence_01": "2D isometric decoration sprite, rune-carved wooden fence segment with moss and blue flowers, modular magical forest prop, transparent background, no text",
        "rock_01": "2D isometric decoration sprite, crystal-touched moss boulder cluster with small glowing shards, readable enchanted environment prop, transparent background, no text",
        "bridge_01": "2D isometric decoration sprite, root-and-crystal bridge with glowing rails, readable fantasy forest crossing prop, transparent background, no text",
        "cart_01": "2D isometric decoration sprite, enchanted herb cart with glowing bottles, mushrooms and cloth canopy, readable forest market prop, transparent background, no text",
        "well_01": "2D isometric decoration sprite, spirit well with crystal basin, rune rim and soft blue water glow, readable mystical village prop, transparent background, no text",
        "crystal_cluster_01": "2D isometric decoration sprite, luminous crystal cluster with teal shards, mossy base and floating sparkle motes, readable enchanted prop, transparent background, no text",
        "portal_gate_01": "2D isometric decoration sprite, moonlit rune gate with hanging lantern flowers and soft cyan portal haze, readable magical landmark prop, transparent background, no text",
    },
    "tiles": {
        "road_01": "seamless 2D game map tile, mossy stone road with glowing grass edge, enchanted forest world map texture, cute hand-painted style, no text",
        "road_02": "seamless 2D game map tile, forest path with pale stepping stones and flower edge, whimsical magical map texture, no text",
        "road_straight_01": "seamless 2D game map road material tile, straight mossy flagstone lane with blue glow seams, enchanted forest route texture, no text",
        "road_corner_01": "seamless 2D game map road material tile, curved magical forest trail corner with roots and soft luminescent flowers, cute readable route texture, no text",
        "road_cross_01": "seamless 2D game map road material tile, four-way enchanted crossing with moss stone and glowing clover edge, magical overworld texture, no text",
        "ground_01": "seamless 2D game map tile, enchanted grass with moss and tiny flowers, cute magical forest top-down texture, no text",
        "ground_02": "seamless 2D game map tile, forest floor with clover, roots and soft blue flowers, readable cute RPG map texture, no text",
        "ground_dirt_01": "seamless 2D game map ground material tile, soft woodland soil with roots, petals and dim teal sparkles, enchanted forest texture, no text",
        "ground_stone_01": "seamless 2D game map ground material tile, moonlit ruin stone with moss cracks and faint crystal dust, magical forest plaza texture, no text",
        "water_01": "seamless 2D game map tile, luminous blue stream water, magical forest overworld texture, hand-painted game style, no text",
        "water_edge_01": "seamless 2D game map water edge material tile, glowing brook shoreline with moss bank and tiny flowers, enchanted forest texture, no text",
        "garden_01": "seamless 2D game map tile, crystal flower garden patch, enchanted forest decorative terrain texture, cute pastel fantasy style, no text",
        "ruins_01": "seamless 2D game map decorative ground tile, broken rune stones and moss circles, enchanted forest ruins texture, no text",
        "river_glow_01": "seamless 2D game map water material tile, moonlit river current with cyan sparkle veins and soft magical foam, enchanted forest texture, no text",
        "sigil_floor_01": "seamless 2D game map magical floor tile, circular rune sigils carved into moss stone with soft blue radiance, readable fantasy ritual texture, no text",
    },
}

PROVIDER_CHOICES = ("replicate", "a1111", "comfyui")
SIZE_TO_DIMENSIONS = {
    "1024x1024": (1024, 1024),
    "512x512": (512, 512),
    "256x256": (256, 256),
}


@dataclass
class ProviderConfig:
    provider: str
    api_token: str = ""
    base_url: str = ""
    model: str = ""
    negative_prompt: str = ""
    steps_scene: int = 28
    steps_asset: int = 24
    cfg_scale: float = 7.0
    sampler_name: str = "DPM++ 2M"
    scheduler: str = "normal"
    seed: int = -1
    timeout: int = 300
    poll_interval: float = 2.0
    output_dir: str = ""
    comfyui_workflow_api: str = ""


def ensure_output_dirs(base_path: str) -> tuple[Path, Path]:
    """Create output directories for both packs."""
    pack_a_dir = Path(base_path) / "pack_a"
    pack_b_dir = Path(base_path) / "pack_b"

    for pack_dir in [pack_a_dir, pack_b_dir]:
        (pack_dir / "icons").mkdir(parents=True, exist_ok=True)
        (pack_dir / "tiles").mkdir(parents=True, exist_ok=True)
        (pack_dir / "buildings").mkdir(parents=True, exist_ok=True)
        (pack_dir / "decorations").mkdir(parents=True, exist_ok=True)

    return pack_a_dir, pack_b_dir


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Generate FableMap asset packs with Replicate, AUTOMATIC1111, or ComfyUI.",
    )
    parser.add_argument(
        "--provider",
        choices=PROVIDER_CHOICES,
        default=os.environ.get("FABLEMAP_IMAGE_PROVIDER", "replicate").strip().lower() or "replicate",
        help="Image backend provider.",
    )
    parser.add_argument(
        "--api-token",
        default=os.environ.get("REPLICATE_API_TOKEN", "").strip(),
        help="API token for Replicate provider.",
    )
    parser.add_argument(
        "--base-url",
        default=(
            os.environ.get("LOCAL_SD_BASE_URL", "").strip()
            or os.environ.get("COMFYUI_BASE_URL", "").strip()
            or os.environ.get("A1111_BASE_URL", "").strip()
        ),
        help="Base URL for local provider, e.g. http://127.0.0.1:7860 or http://127.0.0.1:8188.",
    )
    parser.add_argument(
        "--model",
        default=(
            os.environ.get("LOCAL_SD_MODEL", "").strip()
            or os.environ.get("A1111_MODEL", "").strip()
            or os.environ.get("COMFYUI_CHECKPOINT", "").strip()
        ),
        help="Checkpoint/model name for local providers.",
    )
    parser.add_argument(
        "--negative-prompt",
        default=os.environ.get("LOCAL_SD_NEGATIVE_PROMPT", "blurry, low quality, distorted, text, watermark").strip(),
        help="Negative prompt used by local providers.",
    )
    parser.add_argument(
        "--steps-scene",
        type=int,
        default=int(os.environ.get("LOCAL_SD_STEPS_SCENE", "28")),
        help="Sampling steps for scene images.",
    )
    parser.add_argument(
        "--steps-asset",
        type=int,
        default=int(os.environ.get("LOCAL_SD_STEPS_ASSET", "24")),
        help="Sampling steps for icons and tiles.",
    )
    parser.add_argument(
        "--cfg-scale",
        type=float,
        default=float(os.environ.get("LOCAL_SD_CFG_SCALE", "7.0")),
        help="CFG / guidance scale for local providers.",
    )
    parser.add_argument(
        "--sampler-name",
        default=os.environ.get("LOCAL_SD_SAMPLER", "euler").strip(),
        help="Sampler name for local providers.",
    )
    parser.add_argument(
        "--scheduler",
        default=os.environ.get("LOCAL_SD_SCHEDULER", "normal").strip(),
        help="Scheduler for ComfyUI KSampler.",
    )
    parser.add_argument(
        "--seed",
        type=int,
        default=int(os.environ.get("LOCAL_SD_SEED", "-1")),
        help="Seed for local providers. Use -1 for random seed.",
    )
    parser.add_argument(
        "--timeout",
        type=int,
        default=int(os.environ.get("LOCAL_SD_TIMEOUT", "300")),
        help="HTTP / generation timeout in seconds for local providers.",
    )
    parser.add_argument(
        "--poll-interval",
        type=float,
        default=float(os.environ.get("LOCAL_SD_POLL_INTERVAL", "2.0")),
        help="Polling interval in seconds for ComfyUI job status.",
    )
    parser.add_argument(
        "--output-dir",
        default=os.environ.get("FABLEMAP_ASSET_OUTPUT_DIR", "").strip(),
        help="Optional custom asset output directory.",
    )
    parser.add_argument(
        "--comfyui-workflow-api",
        default=os.environ.get("COMFYUI_WORKFLOW_API", "").strip(),
        help="Optional path to a ComfyUI workflow API JSON file. If omitted, a built-in basic workflow is used.",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Print configuration and planned outputs without generating images.",
    )
    return parser.parse_args()


def normalize_base_url(base_url: str) -> str:
    return base_url.rstrip("/")


def build_provider_config(args: argparse.Namespace) -> ProviderConfig:
    return ProviderConfig(
        provider=args.provider,
        api_token=args.api_token,
        base_url=normalize_base_url(args.base_url),
        model=args.model,
        negative_prompt=args.negative_prompt,
        steps_scene=args.steps_scene,
        steps_asset=args.steps_asset,
        cfg_scale=args.cfg_scale,
        sampler_name=args.sampler_name,
        scheduler=args.scheduler,
        seed=args.seed,
        timeout=args.timeout,
        poll_interval=args.poll_interval,
        output_dir=args.output_dir,
        comfyui_workflow_api=args.comfyui_workflow_api,
    )


def validate_config(config: ProviderConfig) -> None:
    if config.provider == "replicate":
        if not config.api_token:
            raise ValueError("REPLICATE_API_TOKEN is required for provider=replicate")
        if replicate is None:
            raise ValueError("replicate package is not installed. Run: pip install replicate requests")
        return

    if not config.base_url:
        raise ValueError("--base-url is required for local providers")

    if config.provider == "comfyui" and not config.model and not config.comfyui_workflow_api:
        raise ValueError(
            "For provider=comfyui, set --model (checkpoint name) or provide --comfyui-workflow-api"
        )


def size_to_dimensions(size: str) -> tuple[int, int]:
    return SIZE_TO_DIMENSIONS.get(size, (1024, 1024))


def is_scene_size(size: str) -> bool:
    width, height = size_to_dimensions(size)
    return width >= 1024 or height >= 1024


def generate_image(config: ProviderConfig, prompt: str, size: str = "1024x1024") -> Optional[bytes]:
    """Generate an image using the configured provider."""
    print(f"  Provider={config.provider} Size={size} Prompt={prompt[:60]}...")

    try:
        if config.provider == "replicate":
            return generate_image_replicate(config.api_token, prompt, size)
        if config.provider == "a1111":
            return generate_image_a1111(config, prompt, size)
        if config.provider == "comfyui":
            return generate_image_comfyui(config, prompt, size)
        raise ValueError(f"Unsupported provider: {config.provider}")
    except Exception as exc:
        print(f"  Error generating image: {exc}")
        return None


def generate_image_replicate(api_token: str, prompt: str, size: str = "1024x1024") -> Optional[bytes]:
    """Generate an image using Replicate API."""
    api_token = api_token.strip()

    size_to_aspect_ratio = {
        "1024x1024": "1:1",
        "256x256": "1:1",
        "512x512": "1:1",
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


def generate_image_a1111(config: ProviderConfig, prompt: str, size: str) -> Optional[bytes]:
    """Generate an image using AUTOMATIC1111 txt2img API."""
    width, height = size_to_dimensions(size)
    steps = config.steps_scene if is_scene_size(size) else config.steps_asset

    payload: dict[str, Any] = {
        "prompt": prompt,
        "negative_prompt": config.negative_prompt,
        "steps": steps,
        "cfg_scale": config.cfg_scale,
        "sampler_name": config.sampler_name,
        "width": width,
        "height": height,
        "seed": config.seed,
        "batch_size": 1,
        "n_iter": 1,
        "restore_faces": False,
        "tiling": not is_scene_size(size),
        "send_images": True,
        "save_images": False,
    }

    if config.model:
        payload["override_settings"] = {"sd_model_checkpoint": config.model}

    response = requests.post(
        f"{config.base_url}/sdapi/v1/txt2img",
        json=payload,
        timeout=config.timeout,
    )
    response.raise_for_status()

    result = response.json()
    images = result.get("images") or []
    if not images:
        print("    [ERROR] A1111 returned no images")
        return None

    image_base64 = images[0].split(",", 1)[-1]
    return base64.b64decode(image_base64)


def load_comfyui_workflow_template(config: ProviderConfig) -> dict[str, Any]:
    if config.comfyui_workflow_api:
        workflow_path = Path(config.comfyui_workflow_api)
        if not workflow_path.is_file():
            raise FileNotFoundError(f"ComfyUI workflow API JSON not found: {workflow_path}")
        return json.loads(workflow_path.read_text(encoding="utf-8"))

    checkpoint = config.model.strip()
    if not checkpoint:
        raise ValueError("ComfyUI built-in workflow requires --model / COMFYUI_CHECKPOINT")

    return {
        "1": {
            "class_type": "CheckpointLoaderSimple",
            "inputs": {
                "ckpt_name": checkpoint,
            },
        },
        "2": {
            "class_type": "CLIPTextEncode",
            "inputs": {
                "text": "",
                "clip": ["1", 1],
            },
        },
        "3": {
            "class_type": "CLIPTextEncode",
            "inputs": {
                "text": "",
                "clip": ["1", 1],
            },
        },
        "4": {
            "class_type": "EmptyLatentImage",
            "inputs": {
                "width": 1024,
                "height": 1024,
                "batch_size": 1,
            },
        },
        "5": {
            "class_type": "KSampler",
            "inputs": {
                "seed": 1,
                "steps": config.steps_scene,
                "cfg": config.cfg_scale,
                "sampler_name": config.sampler_name,
                "scheduler": config.scheduler,
                "denoise": 1,
                "model": ["1", 0],
                "positive": ["2", 0],
                "negative": ["3", 0],
                "latent_image": ["4", 0],
            },
        },
        "6": {
            "class_type": "VAEDecode",
            "inputs": {
                "samples": ["5", 0],
                "vae": ["1", 2],
            },
        },
        "7": {
            "class_type": "SaveImage",
            "inputs": {
                "filename_prefix": "fablemap",
                "images": ["6", 0],
            },
        },
    }


def find_comfyui_node_id(workflow: dict[str, Any], class_type: str) -> str:
    for node_id, node in workflow.items():
        if node.get("class_type") == class_type:
            return node_id
    raise ValueError(f"ComfyUI workflow is missing required node class: {class_type}")


def prepare_comfyui_workflow(config: ProviderConfig, prompt: str, size: str) -> dict[str, Any]:
    workflow = copy.deepcopy(load_comfyui_workflow_template(config))
    width, height = size_to_dimensions(size)
    steps = config.steps_scene if is_scene_size(size) else config.steps_asset
    seed = config.seed if config.seed >= 0 else int(time.time() * 1000) % (2**31)

    checkpoint_node = find_comfyui_node_id(workflow, "CheckpointLoaderSimple")
    positive_node = find_comfyui_node_id(workflow, "CLIPTextEncode")
    save_node = find_comfyui_node_id(workflow, "SaveImage")
    latent_node = find_comfyui_node_id(workflow, "EmptyLatentImage")
    sampler_node = find_comfyui_node_id(workflow, "KSampler")

    text_nodes = [node_id for node_id, node in workflow.items() if node.get("class_type") == "CLIPTextEncode"]
    if len(text_nodes) < 2:
        raise ValueError("ComfyUI workflow must have at least two CLIPTextEncode nodes for positive/negative prompts")

    positive_node = text_nodes[0]
    negative_node = text_nodes[1]

    workflow[checkpoint_node]["inputs"]["ckpt_name"] = config.model or workflow[checkpoint_node]["inputs"].get("ckpt_name", "")
    workflow[positive_node]["inputs"]["text"] = prompt
    workflow[negative_node]["inputs"]["text"] = config.negative_prompt
    workflow[latent_node]["inputs"]["width"] = width
    workflow[latent_node]["inputs"]["height"] = height
    workflow[sampler_node]["inputs"]["steps"] = steps
    workflow[sampler_node]["inputs"]["cfg"] = config.cfg_scale
    workflow[sampler_node]["inputs"]["sampler_name"] = config.sampler_name
    workflow[sampler_node]["inputs"]["scheduler"] = config.scheduler
    workflow[sampler_node]["inputs"]["seed"] = seed
    workflow[save_node]["inputs"]["filename_prefix"] = f"fablemap_{'scene' if is_scene_size(size) else 'asset'}"

    return workflow


def fetch_comfyui_history(config: ProviderConfig, prompt_id: str) -> dict[str, Any]:
    response = requests.get(
        f"{config.base_url}/history/{prompt_id}",
        timeout=config.timeout,
    )
    response.raise_for_status()
    return response.json()


def extract_comfyui_image_spec(history: dict[str, Any], prompt_id: str) -> Optional[dict[str, str]]:
    prompt_history = history.get(prompt_id, {})
    outputs = prompt_history.get("outputs", {})
    for node_output in outputs.values():
        images = node_output.get("images") or []
        if images:
            return images[0]
    return None


def download_comfyui_image(config: ProviderConfig, image_spec: dict[str, str]) -> bytes:
    query = urllib.parse.urlencode(
        {
            "filename": image_spec.get("filename", ""),
            "subfolder": image_spec.get("subfolder", ""),
            "type": image_spec.get("type", "output"),
        }
    )
    response = requests.get(f"{config.base_url}/view?{query}", timeout=config.timeout)
    response.raise_for_status()
    return response.content


def generate_image_comfyui(config: ProviderConfig, prompt: str, size: str) -> Optional[bytes]:
    """Generate an image using ComfyUI prompt API."""
    workflow = prepare_comfyui_workflow(config, prompt, size)
    queue_response = requests.post(
        f"{config.base_url}/prompt",
        json={"prompt": workflow},
        timeout=config.timeout,
    )
    if not queue_response.ok:
        details = queue_response.text.strip()
        raise requests.HTTPError(
            f"ComfyUI prompt rejected ({queue_response.status_code}): {details}",
            response=queue_response,
        )
    queue_data = queue_response.json()
    prompt_id = queue_data.get("prompt_id")
    if not prompt_id:
        raise ValueError("ComfyUI did not return prompt_id")

    deadline = time.time() + config.timeout
    while time.time() < deadline:
        history = fetch_comfyui_history(config, prompt_id)
        image_spec = extract_comfyui_image_spec(history, prompt_id)
        if image_spec:
            return download_comfyui_image(config, image_spec)
        time.sleep(config.poll_interval)

    raise TimeoutError(f"ComfyUI generation timed out after {config.timeout} seconds")


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
    config: ProviderConfig,
    pack_name: str,
    pack_specs: dict[str, Any],
    output_dir: Path,
) -> int:
    """Generate all assets for a pack."""
    print(f"\n{'=' * 60}")
    print(f"Generating {pack_name} ({pack_specs['name']})")
    print(f"{'=' * 60}")

    success_count = 0

    print(f"\n[Scene] {pack_specs['scene']['filename']}")
    scene_data = generate_image(config, pack_specs['scene']['prompt'], pack_specs['scene']['size'])
    if save_image(scene_data, output_dir / pack_specs['scene']['filename']):
        success_count += 1

    print(f"\n[Icons] {len(pack_specs['icons'])} assets")
    for icon_name, icon_prompt in pack_specs['icons'].items():
        icon_path = output_dir / "icons" / f"{icon_name}.png"
        icon_data = generate_image(config, icon_prompt, "256x256")
        if save_image(icon_data, icon_path):
            success_count += 1

    print(f"\n[Tiles] {len(pack_specs['tiles'])} assets")
    for tile_name, tile_prompt in pack_specs['tiles'].items():
        tile_path = output_dir / "tiles" / f"{tile_name}.png"
        tile_data = generate_image(config, tile_prompt, "256x256")
        if save_image(tile_data, tile_path):
            success_count += 1

    buildings = pack_specs.get("buildings", {})
    if buildings:
        print(f"\n[Buildings] {len(buildings)} assets")
        for building_name, building_prompt in buildings.items():
            building_path = output_dir / "buildings" / f"{building_name}.png"
            building_data = generate_image(config, building_prompt, "512x512")
            if save_image(building_data, building_path):
                success_count += 1

    decorations = pack_specs.get("decorations", {})
    if decorations:
        print(f"\n[Decorations] {len(decorations)} assets")
        for decoration_name, decoration_prompt in decorations.items():
            decoration_path = output_dir / "decorations" / f"{decoration_name}.png"
            decoration_data = generate_image(config, decoration_prompt, "512x512")
            if save_image(decoration_data, decoration_path):
                success_count += 1

    return success_count


def print_dry_run(config: ProviderConfig, output_base: Path) -> None:
    print("Dry run configuration")
    print("-" * 60)
    print(f"Provider: {config.provider}")
    print(f"Base URL: {config.base_url or '(not used)'}")
    print(f"Model: {config.model or '(provider default)'}")
    print(f"Output directory: {output_base}")
    print(f"Scene steps: {config.steps_scene}")
    print(f"Asset steps: {config.steps_asset}")
    print(f"CFG scale: {config.cfg_scale}")
    print(f"Sampler: {config.sampler_name}")
    print(f"Scheduler: {config.scheduler}")
    print(f"Seed: {config.seed}")
    print("Planned files:")

    for pack_key, pack_specs in (("pack_a", PACK_A_SPECS), ("pack_b", PACK_B_SPECS)):
        print(f"  {pack_key}/{pack_specs['scene']['filename']}")
        for icon_name in pack_specs["icons"]:
            print(f"  {pack_key}/icons/{icon_name}.png")
        for tile_name in pack_specs["tiles"]:
            print(f"  {pack_key}/tiles/{tile_name}.png")
        for building_name in pack_specs.get("buildings", {}):
            print(f"  {pack_key}/buildings/{building_name}.png")
        for decoration_name in pack_specs.get("decorations", {}):
            print(f"  {pack_key}/decorations/{decoration_name}.png")


def main() -> int:
    args = parse_args()
    config = build_provider_config(args)

    try:
        validate_config(config)
    except ValueError as exc:
        print(f"Error: {exc}")
        print("\nExamples:")
        print("  python scripts/generate_map_assets.py --provider replicate")
        print("  python scripts/generate_map_assets.py --provider a1111 --base-url http://127.0.0.1:7860")
        print("  python scripts/generate_map_assets.py --provider comfyui --base-url http://127.0.0.1:8188 --model v1-5-pruned-emaonly.safetensors")
        return 1

    script_dir = Path(__file__).parent
    project_root = script_dir.parent
    output_base = (
        Path(config.output_dir)
        if config.output_dir
        else project_root / "fablemap" / "demo_assets" / "new_map_assets"
    )

    print(f"Output directory: {output_base}")

    if args.dry_run:
        print_dry_run(config, output_base)
        return 0

    pack_a_dir, pack_b_dir = ensure_output_dirs(str(output_base))

    total_success = 0
    total_success += generate_pack(config, "Pack A", PACK_A_SPECS, pack_a_dir)
    total_success += generate_pack(config, "Pack B", PACK_B_SPECS, pack_b_dir)

    total_assets = (
        1
        + len(PACK_A_SPECS["icons"])
        + len(PACK_A_SPECS["tiles"])
        + len(PACK_A_SPECS.get("buildings", {}))
        + len(PACK_A_SPECS.get("decorations", {}))
        + 1
        + len(PACK_B_SPECS["icons"])
        + len(PACK_B_SPECS["tiles"])
        + len(PACK_B_SPECS.get("buildings", {}))
        + len(PACK_B_SPECS.get("decorations", {}))
    )
    print(f"\n{'=' * 60}")
    print("Generation Complete")
    print(f"{'=' * 60}")
    print(f"Successfully generated: {total_success}/{total_assets} assets")
    print(f"Output: {output_base}")

    if total_success == total_assets:
        print("[OK] All assets generated successfully!")
        return 0

    print(f"[WARN] {total_assets - total_success} assets failed or used placeholders")
    return 1


if __name__ == "__main__":
    sys.exit(main())
