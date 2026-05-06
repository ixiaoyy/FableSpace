from pathlib import Path
from tempfile import TemporaryDirectory

from fablemap_api.core.memory import GraphMemoryStore, KeywordMemoryStore, MemoryAtom, VectorMemoryStore


def test_keyword_memory_store_wraps_json_tavern_store():
    from fablemap_api.core.web.config import ApiSettings
    from fablemap_api.core.web.service import WebService

    with TemporaryDirectory() as tmpdir:
        service = WebService(
            ApiSettings(output_root=Path(tmpdir), fixture_file=None, frontend_root=None)
        )
        tavern = service.create_tavern_payload(
            {
                "id": "tavern_memory_store",
                "name": "Memory Store Tavern",
                "description": "A tavern for memory store adapter tests.",
                "lat": 31.23,
                "lon": 121.47,
            },
            owner_id="owner_memory_store",
        )
        tavern_id = tavern["id"]
        store = KeywordMemoryStore(service.tavern_store)

        saved = store.save_atom(
            tavern_id,
            MemoryAtom(
                id="mem_jasmine",
                scope="visitor_character",
                dimension="preference",
                horizon="long",
                content="Alpha likes jasmine tea and quiet window seats.",
                importance=0.9,
                visitor_id="visitor_alpha",
                character_id="char_keeper",
            ),
        )

        assert saved.tavern_id == tavern_id
        assert store.get_atom(tavern_id, "mem_jasmine") is not None
        assert store.list_atoms(tavern_id, dimension="preference")[0].id == "mem_jasmine"

        results = store.search_atoms(tavern_id, "jasmine window", limit=3)
        assert results[0].atom.id == "mem_jasmine"
        assert results[0].reason == "keyword"

        assert store.delete_atom(tavern_id, "mem_jasmine") is True
        assert store.get_atom(tavern_id, "mem_jasmine") is None


def test_vector_and_graph_memory_store_productized_fallback_names_and_filters():
    keyword_store = KeywordMemoryStore()
    vector_store = VectorMemoryStore(fallback=keyword_store)
    graph_store = GraphMemoryStore(fallback=keyword_store)
    tavern_id = "tavern_keyword_memory"

    primary = vector_store.save_atom(
        tavern_id,
        MemoryAtom(
            id="mem_bridge",
            scope="visitor_character",
            dimension="event",
            horizon="mid",
            content="Alpha met an old friend near the bridge yesterday.",
            importance=0.8,
            visitor_id="visitor_alpha",
            character_id="char_keeper",
        ),
    )
    vector_store.save_atom(
        tavern_id,
        MemoryAtom(
            id="mem_tea",
            scope="visitor_character",
            dimension="preference",
            horizon="long",
            content="Alpha prefers jasmine tea.",
            importance=0.7,
            visitor_id="visitor_alpha",
            character_id="char_keeper",
        ),
    )
    vector_store.save_atom(
        tavern_id,
        MemoryAtom(
            id="mem_beta_private",
            scope="visitor_character",
            dimension="preference",
            horizon="long",
            content="Beta keeps a private jasmine ledger.",
            importance=1.0,
            visitor_id="visitor_beta",
            character_id="char_keeper",
            visibility="private",
        ),
    )

    assert vector_store.semantic_enabled is False
    vector_hits = vector_store.search_atoms(tavern_id, "bridge friend", limit=2)
    assert vector_hits[0].atom.id == "mem_bridge"
    assert vector_hits[0].reason == "keyword"

    graph_hits = graph_store.search_atoms(tavern_id, "jasmine", limit=2, visitor_id="visitor_alpha")
    assert graph_hits[0].atom.id == "mem_tea"
    assert graph_hits[0].reason == "keyword"
    assert "mem_beta_private" not in {hit.atom.id for hit in graph_hits}

    related = graph_store.related_atoms(tavern_id, primary, limit=2)
    assert related[0].atom.id == "mem_tea"
    assert related[0].reason == "shared_fields"


def test_memory_adapter_source_files_do_not_expose_stub_labels():
    source_root = Path(__file__).resolve().parents[1] / "backend" / "src" / "fablemap_api" / "core"
    memory_graph_source = (source_root / "memory_graph.py").read_text(encoding="utf-8")
    vector_source = (source_root / "vectors.py").read_text(encoding="utf-8")

    old_graph_reason_prefix = "graph" + "_stub"
    old_placeholder_doc = "Graph-aware MemoryStore " + "placeholder"
    old_vector_heading = "Memory Store Adapter " + "Stub"

    assert old_graph_reason_prefix not in memory_graph_source
    assert old_placeholder_doc not in memory_graph_source
    assert old_vector_heading not in vector_source
