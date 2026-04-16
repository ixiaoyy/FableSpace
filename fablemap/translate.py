"""
Translation API — multi-provider translation support.

Supports:
- Google Translate (free via API)
- DeepL
- OpenAI (chat completion based)
- Azure Translator
- LibreTranslate (self-hosted)
- argos translate (offline)
"""

from __future__ import annotations

import json
import logging
import urllib.parse
from dataclasses import dataclass
from typing import Optional

logger = logging.getLogger(__name__)


@dataclass
class TranslationResult:
    translated_text: str
    source_language: str
    target_language: str
    provider: str = ""
    confidence: float = 0.0


class Translator:
    """Base translator class."""

    def __init__(self, api_key: str = "", base_url: str = ""):
        self.api_key = api_key
        self.base_url = base_url

    def translate(
        self, text: str, source_lang: str, target_lang: str, **kwargs
    ) -> TranslationResult:
        raise NotImplementedError

    def detect_language(self, text: str) -> str:
        raise NotImplementedError


class GoogleTranslate(Translator):
    """Google Translate API (v2)."""

    BASE_URL = "https://translation.googleapis.com/language/translate/v2"

    def translate(
        self, text: str, source_lang: str, target_lang: str, **kwargs
    ) -> TranslationResult:
        body = {
            "q": text,
            "source": source_lang,
            "target": target_lang,
            "format": "text",
        }
        if self.api_key:
            body["key"] = self.api_key

        url = f"{self.BASE_URL}?key={self.api_key}"
        import urllib.request
        req = urllib.request.Request(
            url,
            data=json.dumps(body).encode("utf-8"),
            headers={"Content-Type": "application/json"},
            method="POST",
        )
        try:
            with urllib.request.urlopen(req, timeout=30) as resp:
                data = json.loads(resp.read().decode("utf-8"))
                result = data["data"]["translations"][0]
                return TranslationResult(
                    translated_text=result["translatedText"],
                    source_language=result.get("detectedSourceLanguage", source_lang),
                    target_language=target_lang,
                    provider="google",
                )
        except Exception as e:
            raise Exception(f"Google Translate failed: {e}")

    def detect_language(self, text: str) -> str:
        url = f"https://translation.googleapis.com/language/translate/v2/detect?key={self.api_key}"
        body = {"q": text}
        import urllib.request
        req = urllib.request.Request(
            url,
            data=json.dumps(body).encode("utf-8"),
            headers={"Content-Type": "application/json"},
            method="POST",
        )
        with urllib.request.urlopen(req, timeout=30) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            return data["data"]["detections"][0][0]["language"]


class DeepLTranslator(Translator):
    """DeepL API."""

    BASE_URL = "https://api-free.deepl.com/v2/translate"  # free tier
    PRO_URL = "https://api.deepl.com/v2/translate"  # pro tier

    def translate(
        self, text: str, source_lang: str, target_lang: str, **kwargs
    ) -> TranslationResult:
        base = self.base_url or (self.PRO_URL if self.api_key and "-PT" in self.api_key else self.BASE_URL)
        body = {
            "auth_key": self.api_key,
            "text": text,
            "source_lang": source_lang.upper(),
            "target_lang": target_lang.upper(),
        }

        headers = {"Content-Type": "application/x-www-form-urlencoded"}
        data = urllib.parse.urlencode(body).encode("utf-8")
        import urllib.request
        req = urllib.request.Request(base, data=data, headers=headers, method="POST")
        try:
            with urllib.request.urlopen(req, timeout=30) as resp:
                result = json.loads(resp.read().decode("utf-8"))
                translations = result.get("translations", [])
                if translations:
                    t = translations[0]
                    return TranslationResult(
                        translated_text=t["text"],
                        source_language=source_lang,
                        target_language=target_lang,
                        provider="deepl",
                    )
        except Exception as e:
            raise Exception(f"DeepL translate failed: {e}")
        return TranslationResult(translated_text=text, source_language=source_lang, target_language=target_lang, provider="deepl")


class OpenAITranslator(Translator):
    """OpenAI chat completion based translation."""

    BASE_URL = "https://api.openai.com/v1"

    def translate(
        self, text: str, source_lang: str, target_lang: str, **kwargs
    ) -> TranslationResult:
        model = kwargs.get("model", "gpt-4o-mini")
        base_url = self.base_url or self.BASE_URL

        prompt = f"""Translate the following text from {source_lang} to {target_lang}.
Only output the translated text, nothing else.

Text: {text}

Translation:"""

        body = {
            "model": model,
            "messages": [{"role": "user", "content": prompt}],
            "temperature": 0.0,
            "max_tokens": 4096,
        }

        headers = {"Authorization": f"Bearer {self.api_key}"}
        import urllib.request
        req = urllib.request.Request(
            f"{base_url}/chat/completions",
            data=json.dumps(body).encode("utf-8"),
            headers=headers,
            method="POST",
        )
        try:
            with urllib.request.urlopen(req, timeout=60) as resp:
                data = json.loads(resp.read().decode("utf-8"))
                translated = data["choices"][0]["message"]["content"].strip()
                return TranslationResult(
                    translated_text=translated,
                    source_language=source_lang,
                    target_language=target_lang,
                    provider="openai",
                )
        except Exception as e:
            raise Exception(f"OpenAI translation failed: {e}")

    def detect_language(self, text: str) -> str:
        prompt = f"""Detect the language of the following text. Output only the language code (e.g., en, zh, ja, ko, fr, de).

Text: {text}

Language:"""
        body = {
            "model": "gpt-4o-mini",
            "messages": [{"role": "user", "content": prompt}],
            "temperature": 0.0,
            "max_tokens": 10,
        }
        headers = {"Authorization": f"Bearer {self.api_key}"}
        import urllib.request
        req = urllib.request.Request(
            f"{self.base_url}/chat/completions",
            data=json.dumps(body).encode("utf-8"),
            headers=headers,
            method="POST",
        )
        with urllib.request.urlopen(req, timeout=30) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            lang = data["choices"][0]["message"]["content"].strip().lower()
            return lang[:2]


class AzureTranslator(Translator):
    """Azure Cognitive Services Translator."""

    BASE_URL = "https://api.cognitive.microsofttranslator.com/translate"

    def translate(
        self, text: str, source_lang: str, target_lang: str, **kwargs
    ) -> TranslationResult:
        region = kwargs.get("region", "eastus")
        body = [{"text": text}]
        headers = {
            "Ocp-Apim-Subscription-Key": self.api_key,
            "Ocp-Apim-Subscription-Region": region,
            "Content-Type": "application/json",
        }
        params = f"?from={source_lang}&to={target_lang}"
        import urllib.request
        req = urllib.request.Request(
            f"{self.BASE_URL}{params}",
            data=json.dumps(body).encode("utf-8"),
            headers=headers,
            method="POST",
        )
        try:
            with urllib.request.urlopen(req, timeout=30) as resp:
                data = json.loads(resp.read().decode("utf-8"))
                translations = data[0].get("translations", [])
                if translations:
                    t = translations[0]
                    return TranslationResult(
                        translated_text=t["text"],
                        source_language=source_lang,
                        target_language=t["to"],
                        provider="azure",
                    )
        except Exception as e:
            raise Exception(f"Azure translate failed: {e}")
        return TranslationResult(translated_text=text, source_language=source_lang, target_language=target_lang, provider="azure")


class LibreTranslate(Translator):
    """LibreTranslate — self-hosted translation API."""

    BASE_URL = "http://localhost:5000"

    def translate(
        self, text: str, source_lang: str, target_lang: str, **kwargs
    ) -> TranslationResult:
        base = self.base_url or self.BASE_URL
        body = {
            "q": text,
            "source": source_lang,
            "target": target_lang,
            "format": "text",
        }
        if self.api_key:
            body["api_key"] = self.api_key

        headers = {"Content-Type": "application/json"}
        import urllib.request
        req = urllib.request.Request(
            f"{base}/translate",
            data=json.dumps(body).encode("utf-8"),
            headers=headers,
            method="POST",
        )
        try:
            with urllib.request.urlopen(req, timeout=30) as resp:
                data = json.loads(resp.read().decode("utf-8"))
                return TranslationResult(
                    translated_text=data["translatedText"],
                    source_language=data.get("detectedLanguage", {}).get("language", source_lang),
                    target_language=target_lang,
                    provider="libretranslate",
                )
        except Exception as e:
            raise Exception(f"LibreTranslate failed: {e}")

    def detect_language(self, text: str) -> str:
        base = self.base_url or self.BASE_URL
        import urllib.request
        req = urllib.request.Request(
            f"{base}/detect",
            data=json.dumps({"q": text}).encode("utf-8"),
            headers={"Content-Type": "application/json"},
            method="POST",
        )
        with urllib.request.urlopen(req, timeout=30) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            return data[0]["language"]


# ─── Factory ────────────────────────────────────────────────────────────────────


def create_translator(
    provider: str = "google",
    api_key: str = "",
    base_url: str = "",
) -> Translator:
    """Create a translator instance."""
    if provider in ("google", "google_translate"):
        return GoogleTranslate(api_key, base_url)
    elif provider in ("deepl", "deepL"):
        return DeepLTranslator(api_key, base_url)
    elif provider in ("openai", "openai_translate"):
        return OpenAITranslator(api_key, base_url)
    elif provider in ("azure", "azure_translator"):
        return AzureTranslator(api_key, base_url)
    elif provider in ("libretranslate", "libre_translate"):
        return LibreTranslate(api_key, base_url)
    else:
        raise ValueError(f"Unknown translation provider: {provider}")


def translate(
    text: str,
    source_lang: str,
    target_lang: str,
    provider: str = "google",
    api_key: str = "",
    **kwargs,
) -> TranslationResult:
    """Convenience function to translate text."""
    translator = create_translator(provider, api_key)
    return translator.translate(text, source_lang, target_lang, **kwargs)
