"""
Caption Service — Image-to-Text Description

Uses multimodal LLMs to generate descriptions of images.
Used in chat context when users send images.
"""

from __future__ import annotations

import base64
import logging
from dataclasses import dataclass
from typing import Optional

logger = logging.getLogger(__name__)


@dataclass
class CaptionConfig:
    """Caption configuration."""
    model: str = "gpt-4o-mini"  # or gpt-4o, claude-3-5-sonnet, etc.
    provider: str = "openai"  # openai | claude | openai-compatible
    api_key: str = ""
    base_url: str = ""
    prompt: str = "Describe this image in detail, focusing on characters, settings, and any relevant context for an AI roleplay conversation."
    max_tokens: int = 500


def describe_image(
    image_source: str,
    prompt: str = "",
    model: str = "gpt-4o-mini",
    provider: str = "openai",
    api_key: str = "",
    base_url: str = "",
) -> str:
    """
    Generate a description for an image.

    Args:
        image_source: URL, base64 data URI, or file path
        prompt: Custom prompt for description
        model: Model to use
        provider: LLM provider
        api_key: API key
        base_url: Custom base URL

    Returns:
        Image description text
    """
    from fablemap.llm_clients import create_client, LLMConfig

    config = CaptionConfig(
        model=model,
        provider=provider,
        api_key=api_key,
        base_url=base_url,
        prompt=prompt or "Describe this image in detail, focusing on characters, settings, and any relevant context for an AI roleplay conversation.",
    )

    # Build content blocks
    content = [{"type": "text", "text": config.prompt}]

    if image_source.startswith("http"):
        content.append({"type": "image_url", "image_url": {"url": image_source}})
    elif image_source.startswith("data:"):
        content.append({"type": "image_url", "image_url": {"url": image_source}})
    elif image_source.startswith("/") or (len(image_source) < 1000 and "." in image_source):
        # File path or local file
        try:
            img_bytes = open(image_source, "rb").read()
            b64 = base64.b64encode(img_bytes).decode("utf-8")
            content.append({"type": "image_url", "image_url": {"url": f"data:image/jpeg;base64,{b64}"}})
        except Exception as e:
            logger.warning(f"Could not read image file {image_source}: {e}")
            return f"[Image: {image_source}]"
    else:
        # Assume base64
        content.append({"type": "image_url", "image_url": {"url": f"data:image/jpeg;base64,{image_source}"})

    llm_cfg = LLMConfig(
        backend=provider,
        model=config.model,
        api_key=config.api_key,
        base_url=config.base_url,
    )

    client = create_client(llm_cfg)
    messages = [{"role": "user", "content": content}]

    try:
        response = client.chat(messages)
        return response.strip()
    except Exception as e:
        logger.error(f"Caption failed: {e}")
        return f"[Image description unavailable: {e}]"