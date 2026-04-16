"""
Image Generation Clients — Stable Diffusion / ComfyUI integration.

Supports:
- Automatic1111 WebUI API
- ComfyUI (direct API + workflow JSON)
- Stable Diffusion WebUI (txt2img, img2img, upscale)
- ControlNet
- LoRA support
"""

from __future__ import annotations

import base64
import json
import logging
import uuid
from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Optional

logger = logging.getLogger(__name__)

# ─── Config ────────────────────────────────────────────────────────────────────────


@dataclass
class ImageGenConfig:
    """Image generation configuration."""
    provider: str = "automatic1111"  # "automatic1111" | "comfyui" | "pollinations" | "openai"
    base_url: str = "http://127.0.0.1:7860"
    model: str = ""
    negative_prompt: str = ""
    steps: int = 25
    cfg_scale: float = 7.0
    seed: int = -1
    width: int = 512
    height: int = 512
    sampler: str = "Euler a"
    api_key: str = ""
    extra: dict = field(default_factory=dict)


@dataclass
class ImageGenResponse:
    """Image generation result."""
    images: list[bytes]  # list of generated images
    seed: int = -1
    info: dict = field(default_factory=dict)
    provider: str = ""


# ─── Automatic1111 Client ───────────────────────────────────────────────────────


class Automatic1111Client:
    """Automatic1111 WebUI API client."""

    def __init__(self, config: ImageGenConfig):
        self.config = config
        self.base_url = config.base_url.rstrip("/")

    def txt2img(self, prompt: str, **kwargs) -> ImageGenResponse:
        """Text-to-image generation."""
        import urllib.request
        import urllib.error

        payload = {
            "prompt": prompt,
            "negative_prompt": kwargs.get("negative_prompt", self.config.negative_prompt),
            "steps": kwargs.get("steps", self.config.steps),
            "cfg_scale": kwargs.get("cfg_scale", self.config.cfg_scale),
            "seed": kwargs.get("seed", self.config.seed),
            "width": kwargs.get("width", self.config.width),
            "height": kwargs.get("height", self.config.height),
            "sampler_name": kwargs.get("sampler", self.config.sampler),
            "batch_size": kwargs.get("batch_size", 1),
            "n_iter": kwargs.get("n_iter", 1),
        }

        # ControlNet
        if "controlnet" in kwargs:
            payload["alwayson_scripts"] = {
                "controlnet": {
                    "args": [kwargs["controlnet"]]
                }
            }

        url = f"{self.base_url}/sdapi/v1/txt2img"
        req = urllib.request.Request(
            url,
            data=json.dumps(payload).encode("utf-8"),
            headers={"Content-Type": "application/json"},
            method="POST",
        )

        try:
            with urllib.request.urlopen(req, timeout=300) as resp:
                data = json.loads(resp.read().decode("utf-8"))
                images = [base64.b64decode(img) for img in data.get("images", [])]
                return ImageGenResponse(
                    images=images,
                    seed=data.get("parameters", {}).get("seed", -1),
                    info=data.get("info", {}),
                    provider="automatic1111",
                )
        except urllib.error.HTTPError as e:
            body = e.read().decode("utf-8") if e.fp else ""
            raise Exception(f"Automatic1111 error {e.code}: {body[:300]}")
        except Exception as e:
            raise Exception(f"Automatic1111 txt2img failed: {e}")

    def img2img(self, image: bytes, prompt: str, **kwargs) -> ImageGenResponse:
        """Image-to-image generation."""
        import urllib.request

        payload = {
            "init_images": [base64.b64encode(image).decode("utf-8")],
            "prompt": prompt,
            "negative_prompt": kwargs.get("negative_prompt", self.config.negative_prompt),
            "steps": kwargs.get("steps", self.config.steps),
            "cfg_scale": kwargs.get("cfg_scale", self.config.cfg_scale),
            "denoising_strength": kwargs.get("denoising_strength", 0.75),
            "seed": kwargs.get("seed", self.config.seed),
            "width": kwargs.get("width", self.config.width),
            "height": kwargs.get("height", self.config.height),
            "sampler_name": kwargs.get("sampler", self.config.sampler),
        }

        url = f"{self.base_url}/sdapi/v1/img2img"
        req = urllib.request.Request(
            url,
            data=json.dumps(payload).encode("utf-8"),
            headers={"Content-Type": "application/json"},
            method="POST",
        )

        try:
            with urllib.request.urlopen(req, timeout=300) as resp:
                data = json.loads(resp.read().decode("utf-8"))
                images = [base64.b64decode(img) for img in data.get("images", [])]
                return ImageGenResponse(images=images, provider="automatic1111")
        except Exception as e:
            raise Exception(f"Automatic1111 img2img failed: {e}")

    def upscale(self, image: bytes, upscaler: str = "R-ESRGAN 4x+", scale: float = 2.0) -> bytes:
        """Upscale an image."""
        import urllib.request

        payload = {
            "upscaling_resize": scale,
            "upscaler_1": upscaler,
            "image": base64.b64encode(image).decode("utf-8"),
        }

        url = f"{self.base_url}/sdapi/v1/extra-single-image"
        req = urllib.request.Request(
            url,
            data=json.dumps(payload).encode("utf-8"),
            headers={"Content-Type": "application/json"},
            method="POST",
        )

        with urllib.request.urlopen(req, timeout=300) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            return base64.b64decode(data.get("image", ""))

    def get_models(self) -> list[dict]:
        """Get available SD models."""
        import urllib.request

        url = f"{self.base_url}/sdapi/v1/sd-models"
        req = urllib.request.Request(url, headers={"Content-Type": "application/json"})
        with urllib.request.urlopen(req, timeout=30) as resp:
            return json.loads(resp.read().decode("utf-8"))

    def get_samplers(self) -> list[dict]:
        """Get available samplers."""
        import urllib.request

        url = f"{self.base_url}/sdapi/v1/samplers"
        req = urllib.request.Request(url, headers={"Content-Type": "application/json"})
        with urllib.request.urlopen(req, timeout=30) as resp:
            return json.loads(resp.read().decode("utf-8"))

    def get_upscalers(self) -> list[dict]:
        """Get available upscalers."""
        import urllib.request

        url = f"{self.base_url}/sdapi/v1/upscalers"
        req = urllib.request.Request(url, headers={"Content-Type": "application/json"})
        with urllib.request.urlopen(req, timeout=30) as resp:
            return json.loads(resp.read().decode("utf-8"))

    def get_embeddings(self) -> dict:
        """Get Textual Inversion embeddings."""
        import urllib.request

        url = f"{self.base_url}/sdapi/v1/embeddings"
        req = urllib.request.Request(url, headers={"Content-Type": "application/json"})
        with urllib.request.urlopen(req, timeout=30) as resp:
            return json.loads(resp.read().decode("utf-8"))

    def get_controlnet_models(self) -> list[dict]:
        """Get available ControlNet models."""
        import urllib.request

        url = f"{self.base_url}/sdapi/v1/controlnet/model_list"
        req = urllib.request.Request(url, headers={"Content-Type": "application/json"})
        with urllib.request.urlopen(req, timeout=30) as resp:
            return json.loads(resp.read().decode("utf-8"))


# ─── ComfyUI Client ─────────────────────────────────────────────────────────────


class ComfyUIClient:
    """ComfyUI API client."""

    def __init__(self, config: ImageGenConfig):
        self.config = config
        self.base_url = config.base_url.rstrip("/") or "http://127.0.0.1:8188"

    def generate(self, workflow: dict, **kwargs) -> list[bytes]:
        """
        Generate images using a ComfyUI workflow dict.

        Workflow should be a dict mapping node IDs to their inputs/outputs.
        """
        import urllib.request
        import urllib.error

        # Upload any images referenced in the workflow
        workflow = self._upload_images(workflow)

        url = f"{self.base_url}/prompt"
        body = {
            "prompt": workflow,
            "prompt_id": str(uuid.uuid4()),
        }

        req = urllib.request.Request(
            url,
            data=json.dumps(body).encode("utf-8"),
            headers={"Content-Type": "application/json"},
            method="POST",
        )

        try:
            with urllib.request.urlopen(req, timeout=30) as resp:
                resp_data = json.loads(resp.read().decode("utf-8"))
                prompt_id = resp_data.get("prompt_id", "")

                # Poll for completion
                images = self._wait_for_images(prompt_id)
                return images
        except urllib.error.HTTPError as e:
            body_str = e.read().decode("utf-8") if e.fp else ""
            raise Exception(f"ComfyUI error {e.code}: {body_str[:300]}")
        except Exception as e:
            raise Exception(f"ComfyUI generation failed: {e}")

    def _upload_images(self, workflow: dict) -> dict:
        """Upload any image inputs in the workflow and replace with file paths."""
        import urllib.request

        for node_id, node_data in list(workflow.items()):
            inputs = node_data.get("inputs", {})
            for key, value in list(inputs.items()):
                if isinstance(value, str) and (value.startswith("data:") or Path(value).exists()):
                    # This is an image input
                    if value.startswith("data:"):
                        # Data URL
                        header, data = value.split(",", 1)
                        img_bytes = base64.b64decode(data)
                        filename = f"upload_{uuid.uuid4().hex[:8]}.png"
                    else:
                        img_bytes = Path(value).read_bytes()
                        filename = Path(value).name

                    # Upload
                    try:
                        upload_url = f"{self.base_url}/upload/image"
                        import mimetypes
                        content_type = mimetypes.guess_type(filename)[0] or "image/png"
                        req = urllib.request.Request(
                            upload_url,
                            data=img_bytes,
                            headers={
                                "Content-Type": content_type,
                                "Filename": filename,
                            },
                            method="POST",
                        )
                        with urllib.request.urlopen(req, timeout=60) as resp:
                            upload_result = json.loads(resp.read().decode("utf-8"))
                            inputs[key] = upload_result.get("name", filename)
                    except Exception as e:
                        logger.warning(f"Image upload failed: {e}, using original path")
        return workflow

    def _wait_for_images(self, prompt_id: str, timeout: int = 300) -> list[bytes]:
        """Poll for completion and return generated images."""
        import urllib.request
        import time

        history_url = f"{self.base_url}/history/{prompt_id}"
        for _ in range(timeout // 5):
            time.sleep(5)
            try:
                req = urllib.request.Request(history_url, headers={"Content-Type": "application/json"})
                with urllib.request.urlopen(req, timeout=30) as resp:
                    history = json.loads(resp.read().decode("utf-8"))
                    if prompt_id in history:
                        outputs = history[prompt_id].get("outputs", {})
                        images = []
                        for node_id, node_data in outputs.items():
                            for img in node_data.get("images", []):
                                # Fetch image
                                img_url = f"{self.base_url}/view?filename={img['filename']}&subfolder={img.get('subfolder', '')}"
                                req2 = urllib.request.Request(img_url)
                                with urllib.request.urlopen(req2, timeout=60) as r:
                                    images.append(r.read())
                        if images:
                            return images
            except Exception:
                pass
        raise Exception("ComfyUI timeout waiting for images")

    def generate_simple(self, prompt: str, **kwargs) -> list[bytes]:
        """
        Simple text-to-image using a basic ComfyUI workflow.
        Builds a minimal KSampler workflow automatically.
        """
        workflow = self._build_simple_workflow(prompt, **kwargs)
        return self.generate(workflow)

    def _build_simple_workflow(self, prompt: str, **kwargs) -> dict:
        """Build a simple txt2img workflow."""
        checkpoint = kwargs.get("model", "sd_xl_base_1.0.safetensors")
        seed = kwargs.get("seed", -1)
        steps = kwargs.get("steps", 25)
        cfg = kwargs.get("cfg_scale", 7.0)
        sampler = kwargs.get("sampler", "euler_ancestral")
        scheduler = kwargs.get("scheduler", "normal")
        width = kwargs.get("width", 512)
        height = kwargs.get("height", 512)

        return {
            "3": {
                "inputs": {"text": prompt, "clip": ["4", 1]},
                "class_type": "CLIPTextEncode",
            },
            "4": {
                "inputs": {"ckpt_name": checkpoint},
                "class_type": "CheckpointLoaderSimple",
            },
            "5": {
                "inputs": {"text": kwargs.get("negative_prompt", ""), "clip": ["4", 1]},
                "class_type": "CLIPTextEncode",
            },
            "6": {
                "inputs": {
                    "model": ["4", 0],
                    "positive": ["3", 0],
                    "negative": ["5", 0],
                    "seed": seed if seed > 0 else 0,
                    "steps": steps,
                    "cfg": cfg,
                    "sampler_name": sampler,
                    "scheduler": scheduler,
                    "denoise": 1.0,
                },
                "class_type": "KSampler",
            },
            "8": {
                "inputs": {"samples": ["6", 0], "width": width, "height": height},
                "class_type": "EmptyLatentImage",
            },
            "9": {
                "inputs": {"samples": ["6", 0]},
                "class_type": "VAEDecode",
            },
            "10": {
                "inputs": {"images": ["9", 0], "filename_prefix": "fablemap", "format": "png"},
                "class_type": "SaveImage",
            },
        }


# ─── Pollinations (free, no API key) ─────────────────────────────────────────────


class PollinationsImageClient:
    """Pollinations.ai — free AI image generation, no API key."""

    BASE_URL = "https://image.pollinations.ai"

    def txt2img(self, prompt: str, **kwargs) -> ImageGenResponse:
        """Generate image via Pollinations."""
        import urllib.parse

        width = kwargs.get("width", self.config.width)
        height = kwargs.get("height", self.config.height)
        seed = kwargs.get("seed", -1)
        model = kwargs.get("model", "")
        steps = kwargs.get("steps", 25)
        n = kwargs.get("n", 1)

        encoded_prompt = urllib.parse.quote(prompt)
        model_str = f"/model/{urllib.parse.quote(model)}" if model else ""
        seed_str = f"?seed={seed}" if seed > 0 else ""
        n_str = f"&n={n}" if n > 1 else ""

        url = f"{self.BASE_URL}{model_str}/prompt/{encoded_prompt}?width={width}&height={height}&steps={steps}{seed_str}{n_str}"

        import urllib.request
        try:
            with urllib.request.urlopen(url, timeout=60) as resp:
                images = [resp.read()]
                return ImageGenResponse(images=images, provider="pollinations")
        except Exception as e:
            raise Exception(f"Pollinations image gen failed: {e}")


# ─── OpenAI DALL-E ───────────────────────────────────────────────────────────────


class DalleClient:
    """OpenAI DALL-E image generation."""

    BASE_URL = "https://api.openai.com/v1"

    def __init__(self, config: ImageGenConfig):
        self.config = config

    def generate(self, prompt: str, **kwargs) -> ImageGenResponse:
        """Generate image using DALL-E."""
        import urllib.request
        import urllib.error

        model = kwargs.get("model", "dall-e-3")
        size = kwargs.get("size", "1024x1024")
        quality = kwargs.get("quality", "standard")

        body = {
            "model": model,
            "prompt": prompt,
            "n": 1,
            "size": size,
            "quality": quality,
        }

        headers = {
            "Authorization": f"Bearer {self.config.api_key}",
            "Content-Type": "application/json",
        }

        url = f"{self.BASE_URL}/images/generations"
        req = urllib.request.Request(
            url,
            data=json.dumps(body).encode("utf-8"),
            headers=headers,
            method="POST",
        )

        try:
            with urllib.request.urlopen(req, timeout=60) as resp:
                data = json.loads(resp.read().decode("utf-8"))
                images = []
                for item in data.get("data", []):
                    url_str = item.get("url", item.get("b64_json", ""))
                    if url_str.startswith("data:"):
                        # Base64 data URL
                        _, b64_data = url_str.split(",", 1)
                        images.append(base64.b64decode(b64_data))
                    elif url_str.startswith("http"):
                        # Fetch URL
                        req2 = urllib.request.Request(url_str)
                        with urllib.request.urlopen(req2, timeout=60) as r:
                            images.append(r.read())
                return ImageGenResponse(images=images, provider="openai_dalle", model=model)
        except urllib.error.HTTPError as e:
            body_str = e.read().decode("utf-8") if e.fp else ""
            raise Exception(f"DALL-E error {e.code}: {body_str[:200]}")


# ─── Factory ──────────────────────────────────────────────────────────────────────


def create_image_client(config: ImageGenConfig):
    """Create an image generation client."""
    provider = config.provider.lower()
    if provider in ("automatic1111", "a1111", "sd_webui"):
        return Automatic1111Client(config)
    elif provider == "comfyui":
        return ComfyUIClient(config)
    elif provider == "pollinations":
        return PollinationsImageClient(config)
    elif provider in ("openai", "dalle", "dall-e"):
        return DalleClient(config)
    else:
        raise ValueError(f"Unknown image gen provider: {provider}")


def generate_image(
    prompt: str,
    provider: str = "automatic1111",
    base_url: str = "http://127.0.0.1:7860",
    **kwargs,
) -> ImageGenResponse:
    """Convenience function to generate an image."""
    config = ImageGenConfig(provider=provider, base_url=base_url, **kwargs)
    client = create_image_client(config)
    if hasattr(client, "txt2img"):
        return client.txt2img(prompt, **kwargs)
    else:
        return client.generate(prompt, **kwargs)
