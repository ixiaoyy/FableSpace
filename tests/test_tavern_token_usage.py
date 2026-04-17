from tempfile import TemporaryDirectory
from pathlib import Path

from fablemap.tavern import LLMConfig, Tavern, TavernService, TavernStore


def test_token_usage_is_visible_and_survives_llm_config_update():
    with TemporaryDirectory() as tmpdir:
        store = TavernStore(Path(tmpdir))
        service = TavernService(store)

        tavern = Tavern(
            id="tavern_token_test",
            name="Token Test Tavern",
            description="A tavern for token usage checks.",
            lat=31.23,
            lon=121.47,
            owner_id="owner_token_test",
            llm_config=LLMConfig(backend="openai", model="gpt-4o-mini"),
        )
        store.create_tavern(tavern)
        store.save_llm_config(
            tavern.id,
            LLMConfig(
                backend="openai",
                model="gpt-4o-mini",
                api_key="sk-test",
                token_used=12,
            ),
        )

        store.add_token_usage(tavern.id, 88)

        listed = service.list_taverns(owner_id="owner_token_test")
        assert listed[0]["llm_config"]["token_used"] == 100

        service.update_tavern(
            tavern.id,
            {
                "llm_config": {
                    "backend": "openai",
                    "model": "gpt-4o",
                    "api_key": "sk-updated",
                    "base_url": "",
                }
            },
            user_id="owner_token_test",
        )

        updated = service.get_tavern(tavern.id, user_id="owner_token_test")
        assert updated["llm_config"]["token_used"] == 100
        assert updated["llm_config"]["model"] == "gpt-4o"


def test_llm_config_update_preserves_existing_key_when_key_field_is_blank():
    with TemporaryDirectory() as tmpdir:
        store = TavernStore(Path(tmpdir))
        service = TavernService(store)

        tavern = Tavern(
            id="tavern_key_preserve",
            name="Key Preserve Tavern",
            description="A tavern for key preservation checks.",
            lat=31.23,
            lon=121.47,
            owner_id="owner_key_preserve",
        )
        store.create_tavern(tavern)
        store.save_llm_config(
            tavern.id,
            LLMConfig(
                backend="deepseek",
                model="deepseek-chat",
                api_key="sk-existing",
                base_url="https://api.deepseek.com/v1",
            ),
        )

        service.update_tavern(
            tavern.id,
            {
                "llm_config": {
                    "backend": "deepseek",
                    "model": "deepseek-chat",
                    "api_key": "",
                    "base_url": "https://api.deepseek.com/v1",
                    "temperature": 1.1,
                }
            },
            user_id="owner_key_preserve",
        )

        saved = store.get_llm_config(tavern.id)
        assert saved.api_key == "sk-existing"
        assert saved.temperature == 1.1


def test_ollama_llm_config_can_open_tavern_with_base_url_only():
    with TemporaryDirectory() as tmpdir:
        store = TavernStore(Path(tmpdir))
        service = TavernService(store)

        created = service.create_tavern(
            {
                "id": "tavern_ollama_config",
                "name": "Ollama Tavern",
                "description": "A tavern for local model checks.",
                "lat": 31.23,
                "lon": 121.47,
                "llm_config": {
                    "backend": "ollama",
                    "model": "llama3.2",
                    "api_key": "",
                    "base_url": "http://localhost:11434",
                },
            },
            owner_id="owner_ollama_config",
        )

        assert created["status"] == "open"
        saved = store.get_llm_config("tavern_ollama_config")
        assert saved.backend == "ollama"
        assert saved.api_key == ""
        assert saved.base_url == "http://localhost:11434"
