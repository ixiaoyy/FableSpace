"""
TTS Client Factory — supports 25 TTS providers.

Providers: elevenlabs, openai_tts, google_native, edge_tts, coqui, speecht5,
           silero, vits, xtts, novelai, azure_tts, kokoro, cosyvoice,
           chatterbox, gsvi, chutes, pollinations, minimax, sbvits2,
           gpt_sovits, gpt_sovits_v2, volcengine, electronhub, tts_webui,
           openai_compatible

Each provider implements the same interface: synthesize(text, voice, **options) -> bytes (audio)
"""

from __future__ import annotations

import base64
import asyncio
import json
import logging
import os
import uuid
from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from pathlib import Path
from typing import Optional

logger = logging.getLogger(__name__)

# ─── Config Types ────────────────────────────────────────────────────────────────


@dataclass
class TTSConfig:
    """TTS provider configuration."""
    provider: str = "elevenlabs"
    api_key: str = ""
    base_url: str = ""
    model: str = ""
    voice: str = ""
    # Provider-specific options
    speed: float = 1.0
    pitch: float = 1.0
    emotion: str = ""
    language: str = ""
    # Audio output
    output_format: str = "mp3"  # mp3, wav, opus, pcm
    sample_rate: int = 24000
    extra: dict = field(default_factory=dict)

    def is_configured(self) -> bool:
        return bool(self.api_key or self.base_url)


@dataclass
class TTSVoice:
    """Voice descriptor."""
    id: str
    name: str
    gender: str = ""
    language: str = ""
    preview_url: str = ""


@dataclass
class TTSResponse:
    """TTS synthesis result."""
    audio: bytes
    duration: float = 0.0
    provider: str = ""
    model: str = ""
    voice_id: str = ""
    raw: Optional[dict] = None


# ─── TTS Errors ────────────────────────────────────────────────────────────────


class TTSError(Exception):
    """Base TTS error."""
    pass


class TTSProviderUnavailable(TTSError):
    """Provider not available or not configured."""
    pass


class TTSSynthesisError(TTSError):
    """Synthesis failed."""
    pass


# ─── Abstract Provider ─────────────────────────────────────────────────────────


class TTSProvider(ABC):
    """Abstract base for TTS providers."""

    def __init__(self, config: TTSConfig):
        self.config = config

    @abstractmethod
    def synthesize(self, text: str, **kwargs) -> TTSResponse:
        """
        Synthesize speech from text.

        Args:
            text: text to synthesize
            **kwargs: provider-specific options (voice, speed, pitch, etc.)

        Returns:
            TTSResponse with audio bytes
        """
        ...

    @abstractmethod
    def list_voices(self, **kwargs) -> list[TTSVoice]:
        """List available voices."""
        ...

    def supports_streaming(self) -> bool:
        """Whether this provider supports streaming audio."""
        return False

    def supports_emotion(self) -> bool:
        """Whether this provider supports emotion control."""
        return False

    def _http_post(self, url: str, body: dict, headers: dict = None) -> dict:
        """Make an HTTP POST request."""
        import urllib.request
        import urllib.error

        h = {
            "Content-Type": "application/json",
        }
        if headers:
            h.update(headers)

        req = urllib.request.Request(
            url,
            data=json.dumps(body).encode("utf-8"),
            headers=h,
            method="POST",
        )
        try:
            with urllib.request.urlopen(req, timeout=60) as resp:
                return json.loads(resp.read().decode("utf-8"))
        except urllib.error.HTTPError as e:
            body_str = e.read().decode("utf-8") if e.fp else ""
            raise TTSSynthesisError(f"HTTP {e.code}: {body_str[:200]}")
        except Exception as e:
            raise TTSSynthesisError(f"Request failed: {e}")

    def _http_get(self, url: str, headers: dict = None) -> dict | bytes:
        """Make an HTTP GET request."""
        import urllib.request
        import urllib.error

        h = {"Accept": "application/json"}
        if headers:
            h.update(headers)

        req = urllib.request.Request(url, headers=h, method="GET")
        try:
            with urllib.request.urlopen(req, timeout=30) as resp:
                content_type = resp.headers.get("content-type", "")
                if "application/json" in content_type:
                    return json.loads(resp.read().decode("utf-8"))
                return resp.read()
        except urllib.error.HTTPError as e:
            raise TTSProviderUnavailable(f"HTTP {e.code}")
        except Exception as e:
            raise TTSProviderUnavailable(f"Request failed: {e}")

    def _http_post_bytes(self, url: str, body: bytes, headers: dict = None) -> bytes:
        """Make an HTTP POST request, return raw bytes."""
        import urllib.request
        import urllib.error

        h = {"Content-Type": "application/octet-stream"}
        if headers:
            h.update(headers)

        req = urllib.request.Request(
            url,
            data=body,
            headers=h,
            method="POST",
        )
        try:
            with urllib.request.urlopen(req, timeout=120) as resp:
                return resp.read()
        except urllib.error.HTTPError as e:
            raise TTSSynthesisError(f"HTTP {e.code}")
        except Exception as e:
            raise TTSSynthesisError(f"Request failed: {e}")


# ─── ElevenLabs ────────────────────────────────────────────────────────────────


class ElevenLabsProvider(TTSProvider):
    """ElevenLabs API — professional voice synthesis."""

    BASE_URL = "https://api.elevenlabs.io/v1"

    def synthesize(self, text: str, **kwargs) -> TTSResponse:
        voice_id = kwargs.get("voice_id", self.config.voice or "EXAVITQu4vr4xnSDxMaL")
        model_id = kwargs.get("model_id", self.config.model or "eleven_v3")
        speed = kwargs.get("speed", self.config.speed)
        base_url = self.config.base_url or self.BASE_URL

        url = f"{base_url}/text-to-speech/{voice_id}/stream"
        body = {
            "text": text,
            "model_id": model_id,
            "voice_settings": {
                "stability": 0.5,
                "similarity_boost": 0.75,
                "style": 0.0,
                "use_speaker_boost": True,
                "speed": speed,
            },
        }

        headers = {
            "xi-api-key": self.config.api_key,
            "Content-Type": "application/json",
            "Accept": "audio/mpeg",
        }

        import urllib.request
        import urllib.error

        req = urllib.request.Request(
            url,
            data=json.dumps(body).encode("utf-8"),
            headers=headers,
            method="POST",
        )

        try:
            with urllib.request.urlopen(req, timeout=120) as resp:
                audio = resp.read()
                return TTSResponse(
                    audio=audio,
                    provider="elevenlabs",
                    model=model_id,
                    voice_id=voice_id,
                )
        except urllib.error.HTTPError as e:
            body_str = e.read().decode("utf-8") if e.fp else ""
            raise TTSSynthesisError(f"ElevenLabs error {e.code}: {body_str[:200]}")
        except Exception as e:
            raise TTSSynthesisError(f"ElevenLabs synthesis failed: {e}")

    def list_voices(self, **kwargs) -> list[TTSVoice]:
        base_url = self.config.base_url or self.BASE_URL
        data = self._http_get(
            f"{base_url}/voices",
            headers={"xi-api-key": self.config.api_key},
        )
        voices = []
        for v in data.get("voices", []):
            voices.append(TTSVoice(
                id=v.get("voice_id", ""),
                name=v.get("name", ""),
                gender=v.get("labels", {}).get("gender", ""),
                language=v.get("labels", {}).get("language", ""),
            ))
        return voices

    def supports_emotion(self) -> bool:
        return True


# ─── OpenAI TTS ────────────────────────────────────────────────────────────────


class OpenAIProvider(TTSProvider):
    """OpenAI TTS API."""

    BASE_URL = "https://api.openai.com/v1"

    VOICES = [
        TTSVoice("alloy", "Alloy", "neutral", "en"),
        TTSVoice("echo", "Echo", "neutral", "en"),
        TTSVoice("fable", "Fable", "neutral", "en"),
        TTSVoice("nova", "Nova", "neutral", "en"),
        TTSVoice("shimmer", "Shimmer", "neutral", "en"),
        TTSVoice("ash", "Ash", "neutral", "en"),
        TTSVoice("ballad", "Ballad", "neutral", "en"),
        TTSVoice("corAL", "CorAL", "neutral", "en"),
        TTSVoice("crystal", "Crystal", "neutral", "en"),
        TTSVoice("dash", "Dash", "neutral", "en"),
        TTSVoice("embed", "Embed", "neutral", "en"),
        TTSVoice("flute", "Flute", "neutral", "en"),
        TTSVoice("nova_reverb", "Nova Reverb", "neutral", "en"),
        TTSVoice("onyx", "Onyx", "neutral", "en"),
        TTSVoice("poem", "Poem", "neutral", "en"),
        TTSVoice("sage", "Sage", "neutral", "en"),
    ]

    def synthesize(self, text: str, **kwargs) -> TTSResponse:
        voice = kwargs.get("voice", self.config.voice or "nova")
        model = kwargs.get("model", self.config.model or "gpt-4o-mini-tts")
        base_url = self.config.base_url or self.BASE_URL

        url = f"{base_url}/audio/speech"
        body = {
            "model": model,
            "input": text,
            "voice": voice,
            "response_format": "mp3",
        }
        speed = kwargs.get("speed", self.config.speed)
        if speed != 1.0:
            body["speed"] = speed

        headers = {
            "Authorization": f"Bearer {self.config.api_key}",
            "Content-Type": "application/json",
        }

        import urllib.request
        import urllib.error

        req = urllib.request.Request(
            url,
            data=json.dumps(body).encode("utf-8"),
            headers=headers,
            method="POST",
        )

        try:
            with urllib.request.urlopen(req, timeout=60) as resp:
                audio = resp.read()
                return TTSResponse(
                    audio=audio,
                    provider="openai_tts",
                    model=model,
                    voice_id=voice,
                )
        except urllib.error.HTTPError as e:
            body_str = e.read().decode("utf-8") if e.fp else ""
            raise TTSSynthesisError(f"OpenAI TTS error {e.code}: {body_str[:200]}")
        except Exception as e:
            raise TTSSynthesisError(f"OpenAI TTS failed: {e}")

    def list_voices(self, **kwargs) -> list[TTSVoice]:
        return self.VOICES


# ─── Google Native TTS ────────────────────────────────────────────────────────


class GoogleNativeProvider(TTSProvider):
    """Google Cloud Text-to-Speech API."""

    BASE_URL = "https://texttospeech.googleapis.com/v1"

    def synthesize(self, text: str, **kwargs) -> TTSResponse:
        voice_name = kwargs.get("voice", self.config.voice or "en-US-Neural2-F")
        language = kwargs.get("language", self.config.language or "en-US")
        base_url = self.config.base_url or self.BASE_URL

        # model_name mapping
        model_name = kwargs.get("model_name", f"{language}-Standard-A")

        body = {
            "input": {"text": text},
            "voice": {
                "languageCode": language,
                "name": voice_name,
            },
            "audioConfig": {
                "audioEncoding": "MP3",
                "speakingRate": kwargs.get("speed", self.config.speed),
                "pitch": kwargs.get("pitch", self.config.pitch) - 1.0,  # Google uses -20 to +20
                "sampleRateHertz": self.config.sample_rate,
            },
        }

        data = self._http_post(
            f"{base_url}/text:synthesize?key={self.config.api_key}",
            body,
        )

        audio_data = data.get("audioContent", "")
        audio = base64.b64decode(audio_data)

        return TTSResponse(
            audio=audio,
            provider="google_native",
            model=voice_name,
        )

    def list_voices(self, **kwargs) -> list[TTSVoice]:
        language_code = kwargs.get("language_code", "en-US")
        base_url = self.config.base_url or self.BASE_URL
        data = self._http_get(
            f"{base_url}/voices?key={self.config.api_key}&languageCode={language_code}",
        )
        voices = []
        for v in data.get("voices", []):
            for vname in v.get("names", []):
                voices.append(TTSVoice(
                    id=vname,
                    name=vname,
                    language=v.get("languageCode", ""),
                ))
        return voices


# ─── Edge TTS ──────────────────────────────────────────────────────────────────


class EdgeTTSProvider(TTSProvider):
    """Microsoft Edge TTS — free, no API key required."""

    BASE_URL = "https://edge-tts.shutoyam.repl.co"

    # Common voices
    VOICES = [
        TTSVoice("en-US-AriaNeural", "Aria (US)", "female", "en-US"),
        TTSVoice("zh-CN-XiaoxiaoNeural", "Xiaoxiao (CN)", "female", "zh-CN"),
        TTSVoice("zh-CN-YunxiNeural", "Yunxi (CN)", "male", "zh-CN"),
        TTSVoice("ja-JP-NanamiNeural", "Nanami (JP)", "female", "ja-JP"),
        TTSVoice("ko-KR-SunhiNeural", "Sunhi (KR)", "female", "ko-KR"),
    ]

    def synthesize(self, text: str, **kwargs) -> TTSResponse:
        voice = kwargs.get("voice", self.config.voice or "en-US-AriaNeural")
        rate = kwargs.get("speed", self.config.speed)
        pitch = kwargs.get("pitch", self.config.pitch)

        # Edge TTS uses format: +rate% pitchHz
        # rate: a percentage, e.g., +50% or -50%
        # pitch: Hz offset, e.g., +10Hz or -10Hz
        rate_str = f"+{int((rate - 1) * 100)}%" if rate >= 1 else f"{int((rate - 1) * 100)}%"
        pitch_str = f"+{int(pitch)}Hz" if pitch >= 1 else f"{int(pitch)}Hz"

        # Use edge-tts Python package if available, otherwise use HTTP proxy
        try:
            import edge_tts

            communicate = edge_tts.Communicate(text, voice, rate=rate_str, pitch=pitch_str)
            audio = asyncio.run(self._collect_edge_tts_audio(communicate))
            return TTSResponse(audio=audio, provider="edge_tts", voice_id=voice)
        except ImportError:
            # Fallback: use edge-tts.shutoyam.repl.co proxy
            return self._synthesize_proxy(text, voice, rate_str, pitch_str)

    async def _collect_edge_tts_audio(self, communicate) -> bytes:
        """Collect audio chunks from edge-tts' async stream API."""
        audio = b""
        async for chunk in communicate.stream():
            if chunk.get("type") == "audio":
                audio += chunk.get("data", b"")
        return audio

    def _synthesize_proxy(self, text: str, voice: str, rate: str, pitch: str) -> TTSResponse:
        """Use edge-tts proxy service."""
        url = f"{self.BASE_URL}/synthesize"
        body = {
            "text": text,
            "voice": voice,
            "rate": rate,
            "pitch": pitch,
        }
        import urllib.request
        req = urllib.request.Request(
            url,
            data=json.dumps(body).encode("utf-8"),
            headers={"Content-Type": "application/json"},
            method="POST",
        )
        try:
            with urllib.request.urlopen(req, timeout=60) as resp:
                audio = resp.read()
                return TTSResponse(audio=audio, provider="edge_tts", voice_id=voice)
        except Exception as e:
            raise TTSSynthesisError(f"Edge TTS proxy failed: {e}")

    def list_voices(self, **kwargs) -> list[TTSVoice]:
        return self.VOICES


# ─── Coqui TTS ────────────────────────────────────────────────────────────────


class CoquiProvider(TTSProvider):
    """Coqui TTS — open source neural TTS."""

    def synthesize(self, text: str, **kwargs) -> TTSResponse:
        base_url = kwargs.get("base_url", self.config.base_url or "http://localhost:5002")
        model = kwargs.get("model", self.config.model or "tts_models/multilingual/multi-dataset/your_tts")
        speaker = kwargs.get("speaker", self.config.voice or "")

        body = {
            "text": text,
            "model_name": model,
        }
        if speaker:
            body["speaker_wav"] = speaker

        audio_base64 = self._http_post(f"{base_url}/tts", body).get("audio", "")
        audio = base64.b64decode(audio_base64)

        return TTSResponse(audio=audio, provider="coqui", model=model)

    def list_voices(self, **kwargs) -> list[TTSVoice]:
        base_url = kwargs.get("base_url", self.config.base_url or "http://localhost:5002")
        data = self._http_get(f"{base_url}/tts_models/speakers")
        return [TTSVoice(id=str(s), name=str(s)) for s in data.get("speakers", [])]

    def supports_streaming(self) -> bool:
        return False


# ─── SpeechT5 ─────────────────────────────────────────────────────────────────


class SpeechT5Provider(TTSProvider):
    """Microsoft SpeechT5 — free, via Hugging Face."""

    BASE_URL = "https://api-inference.huggingface.co/models/microsoft/speecht5_tts"

    def synthesize(self, text: str, **kwargs) -> TTSResponse:
        base_url = kwargs.get("base_url", self.config.base_url or "https://api-inference.huggingface.co")
        hf_token = self.config.api_key or os.environ.get("HF_TOKEN", "")
        speaker = kwargs.get("speaker", self.config.voice or "")
        model = kwargs.get("model", self.config.model or "microsoft/speecht5_tts")

        # Speaker embedding (use provided or default)
        if not speaker:
            # Use default speaker embedding
            speaker_emb_url = f"{base_url}/microsoft/speecht5_tts/speaker_embeddings"
            import urllib.request
            req = urllib.request.Request(
                speaker_emb_url,
                headers={"Authorization": f"Bearer {hf_token}"},
            )
            try:
                with urllib.request.urlopen(req, timeout=30) as resp:
                    speaker_emb = resp.read()
            except Exception:
                raise TTSSynthesisError("Could not fetch speaker embedding")
        else:
            speaker_emb = base64.b64decode(speaker)

        payload = {
            "inputs": text,
        }

        headers = {
            "Authorization": f"Bearer {hf_token}",
            "Content-Type": "application/json",
        }

        import urllib.request
        import urllib.error

        req = urllib.request.Request(
            f"{base_url}/{model}",
            data=json.dumps(payload).encode("utf-8"),
            headers=headers,
            method="POST",
        )

        try:
            with urllib.request.urlopen(req, timeout=60) as resp:
                audio = resp.read()
                return TTSResponse(audio=audio, provider="speecht5", model=model)
        except urllib.error.HTTPError as e:
            raise TTSSynthesisError(f"HuggingFace API {e.code}")
        except Exception as e:
            raise TTSSynthesisError(f"SpeechT5 synthesis failed: {e}")


# ─── Silero TTS ───────────────────────────────────────────────────────────────


class SileroProvider(TTSProvider):
    """Silero TTS — free, open source neural TTS."""

    API_URL = "https://api.silero.ai/v1"

    # Well-known Silero voices
    VOICES = [
        TTSVoice("v3_ru", "Russian (v3)", "neutral", "ru"),
        TTSVoice("v3_en", "English (v3)", "neutral", "en"),
        TTSVoice("v3_de", "German (v3)", "neutral", "de"),
        TTSVoice("v3_es", "Spanish (v3)", "neutral", "es"),
        TTSVoice("v3_fr", "French (v3)", "neutral", "fr"),
        TTSVoice("v3_zh", "Chinese (v3)", "neutral", "zh"),
        TTSVoice("v3_ja", "Japanese (v3)", "neutral", "ja"),
        TTSVoice("v3_ko", "Korean (v3)", "neutral", "ko"),
    ]

    def synthesize(self, text: str, **kwargs) -> TTSResponse:
        voice = kwargs.get("voice", self.config.voice or "v3_ru")
        language = kwargs.get("language", self.config.language or "en")

        url = f"{self.API_URL}/synthesize"
        body = {
            "text": text,
            "language": language,
            "voice": voice,
            "format": "ogg",
        }
        speed = kwargs.get("speed", self.config.speed)
        if speed != 1.0:
            body["speed"] = speed

        headers = {
            "Content-Type": "application/json",
            "Accept": "audio/ogg",
        }

        import urllib.request
        req = urllib.request.Request(
            url,
            data=json.dumps(body).encode("utf-8"),
            headers=headers,
            method="POST",
        )

        try:
            with urllib.request.urlopen(req, timeout=60) as resp:
                audio = resp.read()
                return TTSResponse(audio=audio, provider="silero", voice_id=voice)
        except Exception as e:
            raise TTSSynthesisError(f"Silero synthesis failed: {e}")

    def list_voices(self, **kwargs) -> list[TTSVoice]:
        return self.VOICES


# ─── VITS ─────────────────────────────────────────────────────────────────────


class VITSProvider(TTSProvider):
    """VITS — open source conditional督Transformer TTS."""

    def synthesize(self, text: str, **kwargs) -> TTSResponse:
        base_url = kwargs.get("base_url", self.config.base_url or "http://localhost:5000")
        speaker_id = kwargs.get("speaker_id", kwargs.get("voice", "0"))
        speed = kwargs.get("speed", self.config.speed)

        # Try FastAPI-style endpoint first
        url = f"{base_url}/tts"
        body = {
            "text": text,
            "speaker_id": int(speaker_id) if str(speaker_id).isdigit() else speaker_id,
            "speed": speed,
        }

        import urllib.request
        import urllib.error

        req = urllib.request.Request(
            url,
            data=json.dumps(body).encode("utf-8"),
            headers={"Content-Type": "application/json"},
            method="POST",
        )

        try:
            with urllib.request.urlopen(req, timeout=60) as resp:
                audio = resp.read()
                return TTSResponse(audio=audio, provider="vits", voice_id=str(speaker_id))
        except urllib.error.HTTPError as e:
            raise TTSSynthesisError(f"VITS error {e.code}")
        except Exception as e:
            raise TTSSynthesisError(f"VITS synthesis failed: {e}")


# ─── XTTS ─────────────────────────────────────────────────────────────────────


class XTTSProvider(TTSProvider):
    """Coqui XTTS — voice cloning TTS."""

    def synthesize(self, text: str, **kwargs) -> TTSResponse:
        base_url = kwargs.get("base_url", self.config.base_url or "http://localhost:8020")
        speaker_wav = kwargs.get("speaker_wav", self.config.voice or "")
        language = kwargs.get("language", self.config.language or "en")

        if not speaker_wav:
            raise TTSSynthesisError("XTTS requires a speaker_wav URL or base64 audio")

        body = {
            "text": text,
            "speaker_wav": speaker_wav,
            "language": language,
        }

        audio_base64 = self._http_post(f"{base_url}/tts", body).get("audio", "")
        audio = base64.b64decode(audio_base64)

        return TTSResponse(audio=audio, provider="xtts")

    def supports_emotion(self) -> bool:
        return True


# ─── NovelAI TTS ──────────────────────────────────────────────────────────────


class NovelAIProvider(TTSProvider):
    """NovelAI TTS API."""

    BASE_URL = "https://api.novelai.net"

    def synthesize(self, text: str, **kwargs) -> TTSResponse:
        voice = kwargs.get("voice", self.config.voice or "gal")
        base_url = self.config.base_url or self.BASE_URL

        body = {
            "text": text,
            "voice": voice,
        }

        headers = {
            "Authorization": f"Bearer {self.config.api_key}",
            "Content-Type": "application/json",
        }

        audio_b64 = self._http_post(f"{base_url}/ai/generate-voice", body, headers).get("audio", "")
        audio = base64.b64decode(audio_b64)

        return TTSResponse(audio=audio, provider="novelai", voice_id=voice)


# ─── Azure TTS ───────────────────────────────────────────────────────────────


class AzureTTSProvider(TTSProvider):
    """Azure Cognitive Services TTS."""

    BASE_URL = "https://{region}.tts.speech.microsoft.com/cognitiveservices/v1"

    def synthesize(self, text: str, **kwargs) -> TTSResponse:
        region = kwargs.get("region", "eastus")
        voice = kwargs.get("voice", self.config.voice or "en-US-AriaNeural")
        base_url = self.config.base_url or self.BASE_URL.replace("{region}", region)

        ssml = f"""<speak version='1.0' xmlns='http://www.w3.org/2001/10/synthesis' xml:lang='en-US'>
            <voice name='{voice}'>
                <prosody rate='{(self.config.speed - 1) * 100:.0f}%' pitch='{(self.config.pitch - 1) * 100:.0f}%'>
                    {text}
                </prosody>
            </voice>
        </speak>"""

        headers = {
            "Ocp-Apim-Subscription-Key": self.config.api_key,
            "Content-Type": "application/ssml+xml",
            "X-Microsoft-OutputFormat": "audio-24khz-48kbitrate-mono-mp3",
        }

        import urllib.request
        req = urllib.request.Request(
            base_url,
            data=ssml.encode("utf-8"),
            headers=headers,
            method="POST",
        )

        try:
            with urllib.request.urlopen(req, timeout=60) as resp:
                audio = resp.read()
                return TTSResponse(audio=audio, provider="azure_tts", voice_id=voice)
        except Exception as e:
            raise TTSSynthesisError(f"Azure TTS failed: {e}")

    def list_voices(self, **kwargs) -> list[TTSVoice]:
        return []  # Would need Azure voice list API


# ─── Kokoro TTS ───────────────────────────────────────────────────────────────


class KokoroProvider(TTSProvider):
    """Kokoro TTS — local/open weight TTS."""

    def synthesize(self, text: str, **kwargs) -> TTSResponse:
        base_url = kwargs.get("base_url", self.config.base_url or "http://localhost:5003")
        voice = kwargs.get("voice", self.config.voice or "af_heart")
        speed = kwargs.get("speed", self.config.speed)

        body = {
            "text": text,
            "voice": voice,
            "speed": speed,
        }

        import urllib.request
        req = urllib.request.Request(
            f"{base_url}/tts",
            data=json.dumps(body).encode("utf-8"),
            headers={"Content-Type": "application/json"},
            method="POST",
        )

        try:
            with urllib.request.urlopen(req, timeout=60) as resp:
                audio = resp.read()
                return TTSResponse(audio=audio, provider="kokoro", voice_id=voice)
        except Exception as e:
            raise TTSSynthesisError(f"Kokoro TTS failed: {e}")


# ─── CosyVoice ───────────────────────────────────────────────────────────────


class CosyVoiceProvider(TTSProvider):
    """Alibaba CosyVoice TTS."""

    def synthesize(self, text: str, **kwargs) -> TTSResponse:
        base_url = kwargs.get("base_url", self.config.base_url or "http://localhost:50000")
        voice = kwargs.get("voice", self.config.voice or "male-qn-qingse")
        sample_rate = kwargs.get("sample_rate", self.config.sample_rate)

        # Step 1: Submit synthesis request
        submit_data = self._http_post(
            f"{base_url}/tts/_submit",
            {"text": text, "voice": voice, "samplerate": sample_rate},
        )
        task_id = submit_data.get("task_id", "")

        # Step 2: Query result
        import time
        for _ in range(30):
            time.sleep(1)
            result = self._http_get(f"{base_url}/tts/query?task_id={task_id}")
            if result.get("status") == "success":
                audio_b64 = result.get("audio", "")
                audio = base64.b64decode(audio_b64)
                return TTSResponse(audio=audio, provider="cosyvoice", voice_id=voice)
            elif result.get("status") == "failed":
                raise TTSSynthesisError("CosyVoice synthesis failed")

        raise TTSSynthesisError("CosyVoice timeout")


# ─── ChatterBox TTS ───────────────────────────────────────────────────────────


class ChatterBoxProvider(TTSProvider):
    """ChatterBox TTS — voice cloning."""

    def synthesize(self, text: str, **kwargs) -> TTSResponse:
        base_url = kwargs.get("base_url", self.config.base_url or "http://localhost:8000")
        speaker_wav = kwargs.get("speaker_wav", self.config.voice or "")
        pitch = kwargs.get("pitch", self.config.pitch)

        body = {
            "text": text,
            "speaker_wav_url": speaker_wav,
            "pitch_adjustment": pitch - 1.0,
        }

        audio_b64 = self._http_post(f"{base_url}/tts", body).get("audio_base64", "")
        audio = base64.b64decode(audio_b64)

        return TTSResponse(audio=audio, provider="chatterbox")


# ─── GSVI TTS ────────────────────────────────────────────────────────────────


class GSVIProvider(TTSProvider):
    """GSVI TTS — open source."""

    def synthesize(self, text: str, **kwargs) -> TTSResponse:
        base_url = kwargs.get("base_url", self.config.base_url or "http://localhost:5004")
        speaker = kwargs.get("speaker", self.config.voice or "default")

        body = {"text": text, "speaker": speaker}

        audio_b64 = self._http_post(f"{base_url}/tts", body).get("audio", "")
        audio = base64.b64decode(audio_b64)

        return TTSResponse(audio=audio, provider="gsvi", voice_id=speaker)


# ─── Chutes TTS ──────────────────────────────────────────────────────────────


class ChutesProvider(TTSProvider):
    """Chutes AI TTS."""

    BASE_URL = "https://api.chutes.ai/v1"

    def synthesize(self, text: str, **kwargs) -> TTSResponse:
        model = kwargs.get("model", self.config.model or "chutes/tts")
        voice = kwargs.get("voice", self.config.voice or "default")

        body = {
            "model": model,
            "input": text,
            "voice": voice,
        }

        data = self._http_post(
            f"{self.BASE_URL}/audio/speech",
            body,
            headers={"Authorization": f"Bearer {self.config.api_key}"},
        )
        audio_b64 = data.get("audio", data.get("b64_audio", ""))
        if isinstance(audio_b64, str):
            audio = base64.b64decode(audio_b64)
        else:
            audio = audio_b64

        return TTSResponse(audio=audio, provider="chutes", model=model)


# ─── Pollinations TTS ────────────────────────────────────────────────────────


class PollinationsProvider(TTSProvider):
    """Pollinations AI TTS — free, no API key."""

    BASE_URL = "https://api.polls.ai/v1"

    def synthesize(self, text: str, **kwargs) -> TTSResponse:
        voice = kwargs.get("voice", self.config.voice or "2oulou")
        speed = kwargs.get("speed", self.config.speed)
        model = kwargs.get("model", self.config.model or "musicos/melotts")

        # Pollinations uses a simple URL-based API
        encoded_text = __import__("urllib.parse").quote(text)
        url = f"https://api.polls.ai/v1/tts?text={encoded_text}&voice={voice}&speed={speed}"

        import urllib.request
        try:
            with urllib.request.urlopen(url, timeout=60) as resp:
                audio = resp.read()
                return TTSResponse(audio=audio, provider="pollinations", voice_id=voice, model=model)
        except Exception as e:
            raise TTSSynthesisError(f"Pollinations TTS failed: {e}")


# ─── MiniMax TTS ─────────────────────────────────────────────────────────────


class MiniMaxProvider(TTSProvider):
    """MiniMax TTS — supports voice cloning."""

    BASE_URL = "https://api.minimax.chat/v1"

    def synthesize(self, text: str, **kwargs) -> TTSResponse:
        voice_id = kwargs.get("voice_id", self.config.voice or "")
        model = kwargs.get("model", self.config.model or "speech-02-hd")
        base_url = self.config.base_url or self.BASE_URL

        body = {
            "model": model,
            "text": text,
            "stream": False,
        }
        if voice_id:
            body["voice_setting"] = {"voice_id": voice_id}

        headers = {"Authorization": f"Bearer {self.config.api_key}"}
        data = self._http_post(f"{base_url}/t2a_v2", body, headers)

        audio_b64 = data.get("data", {}).get("audio_file", "")
        audio = base64.b64decode(audio_b64)

        return TTSResponse(audio=audio, provider="minimax", model=model)


# ─── SBVITS2 ────────────────────────────────────────────────────────────────


class SBVITS2Provider(TTSProvider):
    """SBVITS2 — open source Japanese TTS."""

    def synthesize(self, text: str, **kwargs) -> TTSResponse:
        base_url = kwargs.get("base_url", self.config.base_url or "http://localhost:5005")
        speaker_id = kwargs.get("speaker_id", kwargs.get("voice", "0"))
        speed = kwargs.get("speed", self.config.speed)

        body = {
            "text": text,
            "speaker_id": int(speaker_id) if str(speaker_id).isdigit() else speaker_id,
            "speed": speed,
        }

        audio_b64 = self._http_post(f"{base_url}/tts", body).get("audio", "")
        audio = base64.b64decode(audio_b64)

        return TTSResponse(audio=audio, provider="sbvits2", voice_id=str(speaker_id))


# ─── GPT-SoVITS ───────────────────────────────────────────────────────────────


class GPTSovitsProvider(TTSProvider):
    """GPT-SoVITS — voice cloning TTS."""

    def synthesize(self, text: str, **kwargs) -> TTSResponse:
        base_url = kwargs.get("base_url", self.config.base_url or "http://localhost:5004")
        ref_audio = kwargs.get("ref_audio", kwargs.get("speaker", ""))
        language = kwargs.get("language", self.config.language or "auto")

        if not ref_audio:
            raise TTSSynthesisError("GPT-SoVITS requires a reference audio URL")

        body = {
            "text": text,
            "ref_audio_path": ref_audio,
            "prompt_language": language,
            "text_language": language,
        }

        audio_b64 = self._http_post(f"{base_url}/tts", body).get("audio", "")
        audio = base64.b64decode(audio_b64)

        return TTSResponse(audio=audio, provider="gpt_sovits")


# ─── GPT-SoVITS V2 ───────────────────────────────────────────────────────────


class GPTSovitsV2Provider(TTSProvider):
    """GPT-SoVITS V2 — improved voice cloning."""

    def synthesize(self, text: str, **kwargs) -> TTSResponse:
        base_url = kwargs.get("base_url", self.config.base_url or "http://localhost:5005")
        ref_audio = kwargs.get("ref_audio", kwargs.get("speaker", ""))
        language = kwargs.get("language", self.config.language or "auto")

        body = {
            "text": text,
            "prompt_audio": ref_audio,
            "language": language,
            "batch_size": 1,
        }

        audio_b64 = self._http_post(f"{base_url}/tts", body).get("audios", [""])[0]
        if isinstance(audio_b64, dict):
            audio_b64 = audio_b64.get("audio", "")
        audio = base64.b64decode(audio_b64)

        return TTSResponse(audio=audio, provider="gpt_sovits_v2")


# ─── VolcEngine TTS ──────────────────────────────────────────────────────────


class VolcEngineProvider(TTSProvider):
    """VolcEngine (ByteDance) TTS."""

    BASE_URL = "https://openspeech.bytedance.com/api/v1/tts"

    def synthesize(self, text: str, **kwargs) -> TTSResponse:
        voice = kwargs.get("voice", self.config.voice or "BV700_Sonicsde12kHz")
        base_url = self.config.base_url or self.BASE_URL

        # VolcEngine requires a token, simplified here
        headers = {
            "Content-Type": "application/json",
            "Authorization": self.config.api_key,
        }

        body = {
            "app": {"appid": self.config.extra.get("appid", ""), "token": self.config.extra.get("token", ""), "cluster": "volcengine_tts"},
            "user": {"uid": str(uuid.uuid4())},
            "audio": {
                "voice": voice,
                "encoding": "mp3",
                "sample_rate": self.config.sample_rate,
                "speed_ratio": self.config.speed,
                "pitch_ratio": self.config.pitch,
            },
            "request": {"reqid": str(uuid.uuid4()), "text": text, "text_type": "plain"},
        }

        data = self._http_post(base_url, body, headers)
        audio_b64 = data.get("data", "")
        audio = base64.b64decode(audio_b64)

        return TTSResponse(audio=audio, provider="volcengine", voice_id=voice)


# ─── ElectronHub TTS ─────────────────────────────────────────────────────────


class ElectronHubProvider(TTSProvider):
    """ElectronHub TTS service."""

    BASE_URL = "https://api.electronhub.xyz/v1"

    def synthesize(self, text: str, **kwargs) -> TTSResponse:
        voice = kwargs.get("voice", self.config.voice or "default")
        model = kwargs.get("model", self.config.model or "tts-1")

        body = {
            "text": text,
            "voice": voice,
            "model": model,
        }

        headers = {"Authorization": f"Bearer {self.config.api_key}"}
        audio_b64 = self._http_post(f"{self.BASE_URL}/tts", body, headers).get("audio", "")
        audio = base64.b64decode(audio_b64)

        return TTSResponse(audio=audio, provider="electronhub")


# ─── TTS WebUI ────────────────────────────────────────────────────────────────


class TTSWebUIProvider(TTSProvider):
    """Generic TTS WebUI (ComfyUI-style TTS extension)."""

    def synthesize(self, text: str, **kwargs) -> TTSResponse:
        base_url = kwargs.get("base_url", self.config.base_url or "http://localhost:5000")
        voice = kwargs.get("voice", self.config.voice or "default")

        # Try OpenAI-compatible endpoint
        body = {
            "input": text,
            "model": self.config.model or "tts",
            "voice": voice,
        }

        try:
            data = self._http_post(f"{base_url}/v1/audio/speech", body)
            audio_b64 = data.get("audio", "")
            audio = base64.b64decode(audio_b64)
        except Exception:
            # Try direct TTS endpoint
            body2 = {"text": text, "voice": voice}
            audio_b64 = self._http_post(f"{base_url}/tts", body2).get("audio", "")
            audio = base64.b64decode(audio_b64)

        return TTSResponse(audio=audio, provider="tts_webui", voice_id=voice)


# ─── OpenAI-Compatible TTS ───────────────────────────────────────────────────


class OpenAICompatibleProvider(TTSProvider):
    """Generic OpenAI-compatible TTS API."""

    BASE_URL = "https://api.openai.com/v1"

    def synthesize(self, text: str, **kwargs) -> TTSResponse:
        base_url = kwargs.get("base_url", self.config.base_url or self.BASE_URL)
        voice = kwargs.get("voice", self.config.voice or "nova")
        model = kwargs.get("model", self.config.model or "tts-1")
        speed = kwargs.get("speed", self.config.speed)

        body = {
            "model": model,
            "input": text,
            "voice": voice,
        }
        if speed != 1.0:
            body["speed"] = speed

        headers = {"Authorization": f"Bearer {self.config.api_key}"}
        response = self._http_post(f"{base_url}/audio/speech", body, headers)

        # Handle both JSON (error) and binary audio response
        if isinstance(response, dict):
            raise TTSSynthesisError(f"TTS error: {response}")

        return TTSResponse(audio=response, provider="openai_compatible", model=model, voice_id=voice)


# ─── Factory ─────────────────────────────────────────────────────────────────


_PROVIDER_CLASSES: dict[str, type[TTSProvider]] = {
    "elevenlabs": ElevenLabsProvider,
    "openai_tts": OpenAIProvider,
    "openai": OpenAIProvider,  # alias
    "google_native": GoogleNativeProvider,
    "google": GoogleNativeProvider,
    "edge_tts": EdgeTTSProvider,
    "edge": EdgeTTSProvider,
    "coqui": CoquiProvider,
    "speecht5": SpeechT5Provider,
    "speech_t5": SpeechT5Provider,
    "silero": SileroProvider,
    "vits": VITSProvider,
    "xtts": XTTSProvider,
    "novelai": NovelAIProvider,
    "azure_tts": AzureTTSProvider,
    "azure": AzureTTSProvider,
    "kokoro": KokoroProvider,
    "cosyvoice": CosyVoiceProvider,
    "chatterbox": ChatterBoxProvider,
    "gsvi": GSVIProvider,
    "chutes": ChutesProvider,
    "pollinations": PollinationsProvider,
    "minimax": MiniMaxProvider,
    "sbvits2": SBVITS2Provider,
    "gpt_sovits": GPTSovitsProvider,
    "gpt-sovits": GPTSovitsProvider,
    "gpt_sovits_v2": GPTSovitsV2Provider,
    "gpt-sovits-v2": GPTSovitsV2Provider,
    "volcengine": VolcEngineProvider,
    "electronhub": ElectronHubProvider,
    "tts_webui": TTSWebUIProvider,
    "openai_compatible": OpenAICompatibleProvider,
}


def create_tts_provider(config: TTSConfig) -> TTSProvider:
    """Create a TTS provider from config."""
    provider_cls = _PROVIDER_CLASSES.get(config.provider.lower())
    if not provider_cls:
        available = list(_PROVIDER_CLASSES.keys())
        raise TTSError(f"Unknown TTS provider: {config.provider}. Available: {available}")
    return provider_cls(config)


def synthesize_speech(
    text: str,
    provider: str = "elevenlabs",
    api_key: str = "",
    base_url: str = "",
    voice: str = "",
    model: str = "",
    **kwargs,
) -> TTSResponse:
    """Convenience function to synthesize speech with a single call."""
    config = TTSConfig(
        provider=provider,
        api_key=api_key,
        base_url=base_url,
        voice=voice,
        model=model,
        extra=kwargs,
    )
    p = create_tts_provider(config)
    return p.synthesize(text, **kwargs)


def list_available_providers() -> list[str]:
    """List all available TTS provider names."""
    return sorted(set(_PROVIDER_CLASSES.keys()))


def list_provider_voices(provider: str, api_key: str = "", base_url: str = "") -> list[TTSVoice]:
    """List voices for a given provider."""
    config = TTSConfig(provider=provider, api_key=api_key, base_url=base_url)
    try:
        p = create_tts_provider(config)
        return p.list_voices()
    except Exception as e:
        logger.warning(f"Could not list voices for {provider}: {e}")
        return []
