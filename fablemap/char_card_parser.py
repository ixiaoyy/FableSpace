"""
Character Card Parser — full SillyTavern Character Card V2/V3 support.

Supports:
- SillyTavern V2 JSON format
- SillyTavern V3 JSON format (ccv3)
- SillyTavern Character Card PNG (tEXt chunk with 'chara' + 'ccv3' keywords)
- CharX format (extended)
- Risu format
- TavernAI format (legacy)
- FableMap native format

PNG embedding: writes metadata back into PNG tEXt chunks.
"""

from __future__ import annotations

import base64
import json
import logging
import re
import struct
import zlib
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Optional

logger = logging.getLogger(__name__)

# ─── PNG Constants ────────────────────────────────────────────────────────────────

PNG_SIGNATURE = b"\x89PNG\r\n\x1a\n"


# ─── Data Models ────────────────────────────────────────────────────────────────


@dataclass
class ParsedCharacter:
    """Parsed character from any supported format."""
    # Core fields (SillyTavern V2/V3)
    name: str = ""
    description: str = ""
    personality: str = ""
    scenario: str = ""
    system_prompt: str = ""
    first_mes: str = ""
    mes_example: str = ""

    # V2 extensions
    alternate_greetings: list[str] = field(default_factory=list)
    tags: list[str] = field(default_factory=list)
    sprites: dict[str, str] = field(default_factory=dict)
    avatar_url: str = ""

    # Metadata
    creator: str = ""
    creator_notes: str = ""
    character_version: str = ""

    # V3 / SillyTavern extensions
    spec: str = ""  # "chara_card_v3" for V3
    spec_version: str = "2.0"
    post_history_instructions: str = ""
    depth_prompt: str = ""
    depth_prompt_effective: str = ""
    chat_ranking: bool = True
   扫一扫: bool = False
    extensions: dict[str, Any] = field(default_factory=dict)

    # WorldInfo / character_book
    world_info: list[dict] = field(default_factory=list)

    # Import metadata
    source_format: str = "unknown"
    source_file: Optional[str] = None

    def to_sillytavern_v2(self) -> dict:
        """Serialize to SillyTavern V2 JSON format."""
        return {
            "spec_version": "2.0",
            "name": self.name,
            "description": self.description,
            "personality": self.personality,
            "scenario": self.scenario,
            "first_mes": self.first_mes,
            "mes_example": self.mes_example,
            "creator_notes": self.creator_notes,
            "creator": self.creator,
            "character_version": self.character_version,
            "tags": self.tags,
            "alternate_greetings": self.alternate_greetings,
            "character_book": {
                "entries": [self._wi_entry_to_v2(e) for e in self.world_info],
            },
            "system_prompt": self.system_prompt,
            "post_history_instructions": self.post_history_instructions,
            "sprite": self.sprites,
            "avatar": self.avatar_url,
        }

    def to_sillytavern_v3(self) -> dict:
        """Serialize to SillyTavern V3 JSON format."""
        result = self.to_sillytavern_v2()
        result["spec"] = "chara_card_v3"
        result["spec_version"] = "3.0"
        return result

    def _wi_entry_to_v2(self, entry: dict) -> dict:
        """Convert a WorldInfo entry dict to V2 format."""
        return {
            "id": entry.get("id", ""),
            "keys": entry.get("keys", []),
            "keys_secondary": entry.get("keys_secondary", entry.get("secondary_keys", [])),
            "content": entry.get("content", ""),
            "constant": entry.get("constant", False),
            "selective": entry.get("selective", True),
            "insertion_order": entry.get("insertion_order", 50),
            "depth": entry.get("depth", 4),
            "probability": entry.get("probability", 100),
            "disable": entry.get("disable", False),
            # V3 extensions
            "position": entry.get("position", "before_char"),
            "enabled": entry.get("enabled", True),
            "extensions": entry.get("extensions", {}),
        }


# ─── PNG Utilities ─────────────────────────────────────────────────────────────


def _crc32(data: bytes, initial: int = 0) -> int:
    """Compute CRC32 checksum."""
    import zlib
    return zlib.crc32(data, initial) & 0xFFFFFFFF


def _read_png_chunks(data: bytes) -> list[tuple[str, bytes]]:
    """Read all chunks from PNG data. Returns list of (chunk_type, chunk_data)."""
    chunks = []
    i = 8  # Skip PNG signature
    while i < len(data):
        if i + 4 > len(data):
            break
        length = struct.unpack(">I", data[i:i + 4])[0]
        chunk_type = data[i + 4:i + 8].decode("latin-1")
        chunk_data = data[i + 8:i + 8 + length]
        chunks.append((chunk_type, chunk_data))
        i += 12 + length
        if chunk_type == "IEND":
            break
    return chunks


def _write_png_chunk(chunk_type: str, data: bytes) -> bytes:
    """Write a single PNG chunk with proper CRC."""
    type_bytes = chunk_type.encode("latin-1")
    crc = _crc32(type_bytes + data)
    length = struct.pack(">I", len(data))
    return length + type_bytes + data + struct.pack(">I", crc)


def write_character_card_to_png(
    image_data: bytes,
    character_json: dict,
    embed_v2: bool = True,
    embed_v3: bool = True,
) -> bytes:
    """
    Embed character card JSON into PNG as tEXt chunks.

    - image_data: raw PNG bytes
    - character_json: character data dict
    - embed_v2: embed as 'chara' chunk (base64)
    - embed_v3: embed as 'ccv3' chunk (base64, V3 format)
    """
    if not image_data.startswith(PNG_SIGNATURE):
        raise ValueError("Not a valid PNG file")

    chunks = _read_png_chunks(image_data)

    # Remove existing chara/ccv3 chunks
    chunks = [(t, d) for t, d in chunks if t not in ("tEXt", "IEND") or
              _get_tEXt_keyword(d) not in ("chara", "ccv3", "ch!", "SillyTavern")]

    # Rebuild excluding existing tEXt with our keywords
    rebuilt_chunks = []
    i = 0
    raw_chunks = _read_png_chunks(image_data)
    while i < len(raw_chunks):
        chunk_type, chunk_data = raw_chunks[i]
        if chunk_type == "tEXt":
            keyword = _get_tEXt_keyword(chunk_data)
            if keyword in ("chara", "ccv3", "ch!", "SillyTavern"):
                # Skip this chunk
                i += 1
                continue
        rebuilt_chunks.append((chunk_type, chunk_data))
        i += 1

    # Add tEXt chunks before IEND
    new_chunks = []
    for ct, cd in rebuilt_chunks:
        new_chunks.append((ct, cd))
        if ct == "IEND":
            # Insert our tEXt chunks before IEND
            # V2: 'chara' keyword, base64 encoded
            if embed_v2:
                v2_json = json.dumps(character_json, ensure_ascii=False)
                v2_b64 = base64.b64encode(v2_json.encode("utf-8")).decode("ascii")
                # Write as keyword + null + text
                tEXt_data = b"chara\x00" + v2_b64.encode("latin-1")
                new_chunks.append(("tEXt", tEXt_data))

            # V3: 'ccv3' keyword, base64 encoded, with spec
            if embed_v3:
                v3_data = dict(character_json)
                v3_data["spec"] = "chara_card_v3"
                v3_data["spec_version"] = "3.0"
                v3_json = json.dumps(v3_data, ensure_ascii=False)
                v3_b64 = base64.b64encode(v3_json.encode("utf-8")).decode("ascii")
                tEXt_data = b"ccv3\x00" + v3_b64.encode("latin-1")
                new_chunks.append(("tEXt", tEXt_data))

    # Reconstruct PNG
    result = bytearray(PNG_SIGNATURE)
    for chunk_type, chunk_data in new_chunks:
        result.extend(_write_png_chunk(chunk_type, chunk_data))

    return bytes(result)


def _get_tEXt_keyword(chunk_data: bytes) -> str:
    """Extract keyword from tEXt chunk data."""
    try:
        null_idx = chunk_data.index(b"\x00")
        return chunk_data[:null_idx].decode("latin-1")
    except (ValueError, UnicodeDecodeError):
        return ""


def read_character_card_from_png(image_data: bytes) -> Optional[dict]:
    """
    Read character card JSON from PNG tEXt chunks.
    Tries 'ccv3' first (V3), then 'chara' (V2), then 'ch!' (legacy).
    Returns the JSON dict or None.
    """
    raw_chunks = _read_png_chunks(image_data)
    for chunk_type, chunk_data in raw_chunks:
        if chunk_type not in ("tEXt", "iTXt", "zTXt"):
            continue

        keyword = _get_tEXt_keyword(chunk_data)
        if keyword.lower() in ("ccv3", "chara", "ch!"):
            text = _extract_tEXt_text(chunk_data, chunk_type)
            if text:
                try:
                    # Try base64 decode first
                    try:
                        decoded = base64.b64decode(text)
                        # Try zlib decompress
                        try:
                            decoded = zlib.decompress(decoded)
                        except Exception:
                            pass
                        json_str = decoded.decode("utf-8")
                    except Exception:
                        json_str = text

                    data = json.loads(json_str)
                    return data
                except json.JSONDecodeError:
                    continue

    return None


def _extract_tEXt_text(chunk_data: bytes, chunk_type: str = "tEXt") -> str:
    """Extract text content from a tEXt/iTXt/zTXt chunk."""
    try:
        if chunk_type == "tEXt":
            parts = chunk_data.split(b"\x00", 1)
            return parts[1].decode("latin-1")
        elif chunk_type == "zTXt":
            parts = chunk_data.split(b"\x00", 2)
            if len(parts) >= 3 and parts[1] == b"\x00":
                decompressed = zlib.decompress(parts[2])
                return decompressed.decode("latin-1")
        elif chunk_type == "iTXt":
            parts = chunk_data.split(b"\x00", 5)
            if len(parts) >= 5:
                return parts[4].decode("utf-8")
    except Exception:
        pass
    return ""


# ─── Parser ─────────────────────────────────────────────────────────────────────


class CharacterCardParser:
    """Parse character cards from SillyTavern V2/V3 and related formats."""

    # SillyTavern V2 field mappings
    V2_FIELDS = {
        "name": "name",
        "description": "description",
        "personality": "personality",
        "scenario": "scenario",
        "first_mes": "first_mes",
        "mes_example": "mes_example",
        "creator_notes": "creator_notes",
        "creator": "creator",
        "character_version": "character_version",
        "tags": "tags",
        "alternate_greetings": "alternate_greetings",
        "character_book": "character_book",
        "system_prompt": "system_prompt",
        "post_history_instructions": "post_history_instructions",
        "depth_prompt": "depth_prompt",
        "sprite": "sprite",
        "avatar": "avatar",
        "chat_ranking": "chat_ranking",
        "扫一扫": "扫一扫",
    }

    def parse_json(self, data: dict) -> ParsedCharacter:
        """Parse SillyTavern V2 or V3 JSON format."""
        char = ParsedCharacter()

        # Detect V3
        spec = data.get("spec", "")
        if spec == "chara_card_v3":
            char.spec = "chara_card_v3"
            char.spec_version = str(data.get("spec_version", "3.0"))
        else:
            char.spec_version = str(data.get("spec_version", "2.0"))

        char.source_format = f"sillytavern_{char.spec_version}"

        # Map all standard fields
        for src_key, dst_key in self.V2_FIELDS.items():
            if src_key in data:
                setattr(char, dst_key, data[src_key])

        # Handle name variations
        char.name = data.get("name", data.get("char_name", ""))

        # Handle first_mes variations
        char.first_mes = data.get("first_mes", data.get("first_message", ""))

        # Handle mes_example variations
        char.mes_example = data.get("mes_example", data.get("example_messages", ""))

        # Handle tags
        tags = data.get("tags", [])
        if isinstance(tags, list):
            char.tags = [str(t) for t in tags]

        # Handle alternate_greetings
        ag = data.get("alternate_greetings", [])
        if isinstance(ag, list):
            char.alternate_greetings = [str(x) for x in ag]

        # Handle sprites
        sprites_data = data.get("sprite", data.get("sprites", {}))
        if isinstance(sprites_data, str) and sprites_data:
            char.sprites = {"neutral": sprites_data}
        elif isinstance(sprites_data, dict):
            char.sprites = {k: str(v) for k, v in sprites_data.items()}

        # Handle avatar
        avatar = data.get("avatar", "")
        if avatar:
            char.avatar_url = avatar

        # Handle world_info / character_book
        char.world_info = self._parse_world_info(data.get("character_book", {}))

        # Handle extensions
        char.extensions = data.get("extensions", {})
        if not char.extensions:
            # SillyTavern may store extensions at top level
            for key in data:
                if key not in self.V2_FIELDS and key not in (
                    "spec", "spec_version", "name", "description", "avatar", "sprite",
                    "character_book", "tags", "alternate_greetings", "post_history_instructions",
                    "depth_prompt", "chat_ranking", "扫一扫",
                ):
                    char.extensions[key] = data[key]

        # chat_ranking default
        if "chat_ranking" not in data:
            char.chat_ranking = True

        return char

    def parse_png(self, png_data: bytes) -> Optional[ParsedCharacter]:
        """Parse SillyTavern Character Card from PNG tEXt chunk."""
        char_data = read_character_card_from_png(png_data)
        if not char_data:
            return None

        char = self.parse_json(char_data)
        char.source_format = "tavern_png"
        return char

    def parse_png_file(self, file_path: Path | str) -> Optional[ParsedCharacter]:
        """Parse a PNG file as a character card."""
        path = Path(file_path)
        if not path.exists():
            return None
        return self.parse_png(path.read_bytes())

    def write_png(self, image_data: bytes, char: ParsedCharacter) -> bytes:
        """Embed character data into PNG and return new PNG bytes."""
        json_data = char.to_sillytavern_v2()
        return write_character_card_to_png(image_data, json_data, embed_v2=True, embed_v3=True)

    def parse_auto(self, data: dict | bytes | Path | str) -> ParsedCharacter:
        """Auto-detect format and parse."""
        # Bytes = PNG
        if isinstance(data, (bytes, bytearray)):
            result = self.parse_png(data)
            if result:
                return result
            raise ValueError("Could not parse PNG as character card")

        # Path = file
        if isinstance(data, (str, Path)):
            path = Path(data)
            if path.suffix.lower() == ".png":
                result = self.parse_png_file(path)
                if result:
                    return result
                raise ValueError(f"Could not parse {path} as character card")
            else:
                return self.parse_auto(json.loads(Path(data).read_text("utf-8")))

        # Must be dict
        if not isinstance(data, dict):
            raise ValueError(f"Expected dict, bytes, or file path, got {type(data)}")

        # Detect format
        spec = data.get("spec", data.get("spec_version", ""))
        if "charx" in str(spec).lower():
            return self._parse_charx(data)
        if "risu" in str(data.get("format", "")).lower() or "risu_format" in data:
            return self._parse_risu(data)
        if spec == "chara_card_v3":
            return self.parse_json(data)
        # V2 or legacy
        return self.parse_json(data)

    def _parse_charx(self, data: dict) -> ParsedCharacter:
        """Parse CharX extended format."""
        char_data = data.get("character", data)
        char = self.parse_json(char_data)
        char.source_format = "charx"
        return char

    def _parse_risu(self, data: dict) -> ParsedCharacter:
        """Parse Risu format."""
        char = self.parse_json(data)
        char.source_format = "risu"
        return char

    def _parse_world_info(self, character_book: Any) -> list[dict]:
        """Parse character_book / world_info into FableMap format."""
        entries = []
        if not character_book:
            return entries

        cb_entries = character_book.get("entries", [])
        if isinstance(cb_entries, list):
            for idx, entry in enumerate(cb_entries):
                entries.append({
                    "id": entry.get("id", f"wi_{idx}"),
                    "keys": entry.get("keys", []),
                    "keys_secondary": entry.get("keys_secondary", []),
                    "content": entry.get("content", ""),
                    "constant": entry.get("constant", False),
                    "selective": entry.get("selective", True),
                    "insertion_order": entry.get("insertion_order", 50),
                    "depth": entry.get("depth", 4),
                    "probability": entry.get("probability", 100),
                    "disable": entry.get("disable", not entry.get("enabled", True)),
                    # V3 / SillyTavern extensions
                    "position": entry.get("position", "before_char"),
                    "enabled": entry.get("enabled", True),
                    "extensions": entry.get("extensions", {}),
                    "group": entry.get("group", ""),
                    "comment": entry.get("comment", ""),
                    "scan_depth": entry.get("scan_depth", 4),
                    "token_budget": entry.get("token_budget", 25),
                    "strategy": entry.get("strategy", ""),
                    "case_sensitive": entry.get("case_sensitive", False),
                    "whole_word": entry.get("match_whole_words", False),
                    "probability_percent": entry.get("probability_percent", True),
                })

        return entries


# ─── Convenience functions ──────────────────────────────────────────────────────


def parse_character_card(source: dict | bytes | Path | str) -> ParsedCharacter:
    """Parse a character card from any supported source."""
    parser = CharacterCardParser()
    return parser.parse_auto(source)


def embed_character_in_png(image_path: Path | str, char: ParsedCharacter) -> bytes:
    """Read a PNG, embed character card, return new PNG bytes."""
    path = Path(image_path)
    image_data = path.read_bytes()
    parser = CharacterCardParser()
    return parser.write_png(image_data, char)


def export_character_card(char: ParsedCharacter, format: str = "v2") -> dict:
    """Export a character to the specified format."""
    if format == "v3":
        return char.to_sillytavern_v3()
    return char.to_sillytavern_v2()
