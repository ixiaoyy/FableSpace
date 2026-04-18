"""
Vector Embeddings — semantic search and retrieval.

Supports:
- OpenAI embeddings
- Sentence transformers (local)
- Hugging Face embeddings
- Custom embedding providers
"""

from __future__ import annotations

import json
import logging
import uuid
from dataclasses import dataclass, field
from typing import Any, Optional

logger = logging.getLogger(__name__)

# ─── Config ─────────────────────────────────────────────────────────────────────


@dataclass
class EmbeddingConfig:
    """Embedding configuration."""
    provider: str = "openai"  # "openai" | "sentence_transformers" | "huggingface"
    model: str = "text-embedding-3-small"
    api_key: str = ""
    base_url: str = ""
    dimension: int = 1536


# ─── Vector Entry ──────────────────────────────────────────────────────────────


@dataclass
class VectorEntry:
    """A text entry with its embedding."""
    id: str
    text: str
    embedding: list[float] = field(default_factory=list)
    metadata: dict = field(default_factory=dict)
    created_at: str = ""


# ─── Embedder ──────────────────────────────────────────────────────────────────


class Embedder:
    """Base embedder class."""

    def __init__(self, config: EmbeddingConfig):
        self.config = config

    def embed(self, texts: list[str]) -> list[list[float]]:
        """Embed a list of texts."""
        raise NotImplementedError

    def embed_one(self, text: str) -> list[float]:
        """Embed a single text."""
        results = self.embed([text])
        return results[0]


class OpenAIEmbedder(Embedder):
    """OpenAI embeddings API."""

    BASE_URL = "https://api.openai.com/v1"

    def embed(self, texts: list[str]) -> list[list[float]]:
        base_url = self.config.base_url or self.BASE_URL
        model = self.config.model

        body = {
            "model": model,
            "input": texts,
        }

        headers = {"Authorization": f"Bearer {self.config.api_key}"}
        import urllib.request
        req = urllib.request.Request(
            f"{base_url}/embeddings",
            data=json.dumps(body).encode("utf-8"),
            headers=headers,
            method="POST",
        )
        try:
            with urllib.request.urlopen(req, timeout=60) as resp:
                data = json.loads(resp.read().decode("utf-8"))
                return [item["embedding"] for item in data["data"]]
        except Exception as e:
            raise Exception(f"OpenAI embeddings failed: {e}")


class SentenceTransformerEmbedder(Embedder):
    """Sentence Transformers — local embeddings."""

    _model = None

    def embed(self, texts: list[str]) -> list[list[float]]:
        try:
            from sentence_transformers import SentenceTransformer
        except ImportError:
            raise ImportError("sentence-transformers not installed: pip install sentence-transformers")

        if self._model is None:
            model_name = self.config.model or "all-MiniLM-L6-v2"
            self._model = SentenceTransformer(model_name)

        embeddings = self._model.encode(texts, convert_to_numpy=True)
        return [emb.tolist() for emb in embeddings]


class HuggingFaceEmbedder(Embedder):
    """Hugging Face Inference API embeddings."""

    BASE_URL = "https://api-inference.huggingface.co/models"

    def embed(self, texts: list[str]) -> list[list[float]]:
        model = self.config.model or "sentence-transformers/all-MiniLM-L6-v2"
        base_url = self.config.base_url or self.BASE_URL

        headers = {"Authorization": f"Bearer {self.config.api_key}"}
        body = {"inputs": texts}

        import urllib.request
        req = urllib.request.Request(
            f"{base_url}/{model}",
            data=json.dumps(body).encode("utf-8"),
            headers=headers,
            method="POST",
        )
        try:
            with urllib.request.urlopen(req, timeout=60) as resp:
                data = json.loads(resp.read().decode("utf-8"))
                if isinstance(data, list):
                    return data
                elif isinstance(data, dict) and "error" in data:
                    raise Exception(f"HuggingFace: {data['error']}")
        except Exception as e:
            raise Exception(f"HuggingFace embeddings failed: {e}")
        return []


# ─── Vector Store ──────────────────────────────────────────────────────────────


class VectorStore:
    """
    Simple in-memory vector store with cosine similarity search.

    For production, replace with FAISS, ChromaDB, or Qdrant.
    """

    def __init__(self, collection: str = "default"):
        self.collection = collection or "default"
        self.entries: dict[str, VectorEntry] = {}

    def add(self, entry: VectorEntry) -> str:
        """Add an entry to the store."""
        if not entry.id:
            entry.id = str(uuid.uuid4())
        self.entries[entry.id] = entry
        return entry.id

    def add_texts(
        self,
        texts: list[str],
        embedder: Embedder,
        metadata: Optional[list[dict]] = None,
    ) -> list[str]:
        """Add multiple texts with embeddings."""
        embeddings = embedder.embed(texts)
        ids = []
        for i, text in enumerate(texts):
            entry = VectorEntry(
                id=str(uuid.uuid4()),
                text=text,
                embedding=embeddings[i],
                metadata=metadata[i] if metadata and i < len(metadata) else {},
            )
            self.add(entry)
            ids.append(entry.id)
        return ids

    def search(
        self,
        query: str,
        embedder: Embedder,
        top_k: int = 5,
        filter_fn=None,
    ) -> list[tuple[VectorEntry, float]]:
        """
        Semantic search.

        Returns:
            List of (entry, similarity_score) tuples, sorted by score descending.
        """
        query_emb = embedder.embed_one(query)
        candidates = list(self.entries.values())

        if filter_fn:
            candidates = [c for c in candidates if filter_fn(c)]

        scored = []
        for entry in candidates:
            sim = _cosine_similarity(query_emb, entry.embedding)
            scored.append((entry, sim))

        scored.sort(key=lambda x: x[1], reverse=True)
        return scored[:top_k]

    def get(self, id: str) -> Optional[VectorEntry]:
        """Get an entry by ID."""
        return self.entries.get(id)

    def delete(self, id: str) -> bool:
        """Delete an entry."""
        if id in self.entries:
            del self.entries[id]
            return True
        return False

    def clear(self) -> None:
        """Clear all entries."""
        self.entries.clear()

    def count(self) -> int:
        """Number of entries."""
        return len(self.entries)


def _cosine_similarity(a: list[float], b: list[float]) -> float:
    """Compute cosine similarity between two vectors."""
    if not a or not b or len(a) != len(b):
        return 0.0

    dot = sum(x * y for x, y in zip(a, b))
    norm_a = sum(x * x for x in a) ** 0.5
    norm_b = sum(x * x for x in b) ** 0.5

    if norm_a == 0 or norm_b == 0:
        return 0.0

    return dot / (norm_a * norm_b)


# ─── Memory Store Adapter Stub ────────────────────────────────────────────────


from fablemap.memory.core import KeywordMemoryStore, MemoryAtom, MemorySearchResult, MemoryStore


class VectorMemoryStore(MemoryStore):
    """Optional semantic MemoryStore adapter.

    Without an embedder, this deliberately falls back to KeywordMemoryStore so
    local development has no new vector dependency or network requirement.
    """

    def __init__(
        self,
        fallback: Optional[MemoryStore] = None,
        vector_store: Optional[VectorStore] = None,
        embedder: Optional[Embedder] = None,
    ):
        self.fallback = fallback or KeywordMemoryStore()
        self.vector_store = vector_store or VectorStore(collection="memory_atoms")
        self.embedder = embedder
        self._memory_to_vector_ids: dict[str, list[str]] = {}

    @property
    def semantic_enabled(self) -> bool:
        return self.embedder is not None

    def list_atoms(self, tavern_id: str, **filters: Any) -> list[MemoryAtom]:
        return self.fallback.list_atoms(tavern_id, **filters)

    def get_atom(self, tavern_id: str, memory_id: str) -> MemoryAtom | None:
        return self.fallback.get_atom(tavern_id, memory_id)

    def save_atom(self, tavern_id: str, atom: MemoryAtom) -> MemoryAtom:
        saved = self.fallback.save_atom(tavern_id, atom)
        if self.semantic_enabled and saved.content.strip():
            self._index_atom(saved)
        return saved

    def delete_atom(self, tavern_id: str, memory_id: str) -> bool:
        deleted = self.fallback.delete_atom(tavern_id, memory_id)
        if deleted:
            for vector_id in self._memory_to_vector_ids.pop(memory_id, []):
                self.vector_store.delete(vector_id)
        return deleted

    def search_atoms(
        self,
        tavern_id: str,
        query: str,
        *,
        limit: int = 10,
        **filters: Any,
    ) -> list[MemorySearchResult]:
        if not self.semantic_enabled or not str(query or "").strip():
            return self.fallback.search_atoms(tavern_id, query, limit=limit, **filters)

        try:
            vector_hits = self.vector_store.search(
                str(query),
                self.embedder,
                top_k=max(1, int(limit or 1)) * 3,
                filter_fn=lambda entry: entry.metadata.get("tavern_id") == tavern_id,
            )
        except Exception:
            return self.fallback.search_atoms(tavern_id, query, limit=limit, **filters)

        results: list[MemorySearchResult] = []
        seen: set[str] = set()
        for entry, score in vector_hits:
            memory_id = str(entry.metadata.get("memory_id") or "")
            if not memory_id or memory_id in seen:
                continue
            atom = self.fallback.get_atom(tavern_id, memory_id)
            if not atom:
                continue
            if not KeywordMemoryStore._matches_filters(atom, filters):
                continue
            seen.add(memory_id)
            results.append(MemorySearchResult(atom=atom, score=float(score), reason="vector"))
            if len(results) >= max(1, int(limit or 1)):
                break

        if results:
            return results
        return self.fallback.search_atoms(tavern_id, query, limit=limit, **filters)

    def _index_atom(self, atom: MemoryAtom) -> None:
        try:
            vector_ids = self.vector_store.add_texts(
                [atom.content],
                self.embedder,
                metadata=[{
                    "memory_id": atom.id,
                    "tavern_id": atom.tavern_id,
                    "scope": atom.scope,
                    "dimension": atom.dimension,
                    "horizon": atom.horizon,
                }],
            )
        except Exception:
            return
        self._memory_to_vector_ids.setdefault(atom.id, []).extend(vector_ids)


# ─── Factory ──────────────────────────────────────────────────────────────────


def create_embedder(config: EmbeddingConfig) -> Embedder:
    """Create an embedder from config."""
    if config.provider in ("openai", "openai_embeddings"):
        return OpenAIEmbedder(config)
    elif config.provider in ("sentence_transformers", "sentence-transformers", "local"):
        return SentenceTransformerEmbedder(config)
    elif config.provider in ("huggingface", "hf"):
        return HuggingFaceEmbedder(config)
    else:
        raise ValueError(f"Unknown embedding provider: {config.provider}")


# ─── Convenience ──────────────────────────────────────────────────────────────


def embed_texts(
    texts: list[str],
    provider: str = "openai",
    api_key: str = "",
    model: str = "text-embedding-3-small",
) -> list[list[float]]:
    """Convenience function to embed texts."""
    config = EmbeddingConfig(provider=provider, api_key=api_key, model=model)
    embedder = create_embedder(config)
    return embedder.embed(texts)


def semantic_search(
    query: str,
    entries: list[str],
    embedder: Embedder,
    top_k: int = 5,
) -> list[tuple[str, float]]:
    """Simple semantic search over a list of strings."""
    store = VectorStore()
    for i, text in enumerate(entries):
        store.add(VectorEntry(id=str(i), text=text))
    store.add_texts(entries, embedder)
    results = store.search(query, embedder, top_k)
    return [(r.text, score) for r, score in results]
