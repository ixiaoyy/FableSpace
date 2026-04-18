from pathlib import Path
from tempfile import TemporaryDirectory

from fablemap.memory import GraphMemoryStore, KeywordMemoryStore, MemoryAtom, VectorMemoryStore


def test_keyword_memory_store_wraps_json_tavern_store():
    from fablemap.web.config import ApiSettings
    from fablemap.web.service import WebService

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


def test_vector_and_graph_memory_store_stubs_delegate_without_optional_backends():
    keyword_store = KeywordMemoryStore()
    vector_store = VectorMemoryStore(fallback=keyword_store)
    graph_store = GraphMemoryStore(fallback=keyword_store)
    tavern_id = "tavern_stub_memory"

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

    assert vector_store.semantic_enabled is False
    vector_hits = vector_store.search_atoms(tavern_id, "bridge friend", limit=2)
    assert vector_hits[0].atom.id == "mem_bridge"

    graph_hits = graph_store.search_atoms(tavern_id, "jasmine", limit=2)
    assert graph_hits[0].atom.id == "mem_tea"
    assert graph_hits[0].reason == "graph_stub:keyword_fallback"

    related = graph_store.related_atoms(tavern_id, primary, limit=2)
    assert related[0].atom.id == "mem_tea"
    assert related[0].reason == "graph_stub:shared_fields"
