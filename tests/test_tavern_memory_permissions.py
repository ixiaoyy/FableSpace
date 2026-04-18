import json
from pathlib import Path
from tempfile import TemporaryDirectory

import pytest
from fastapi import HTTPException

from fablemap.web.config import ApiSettings
from fablemap.web.service import WebService


def _service(tmpdir: str) -> WebService:
    return WebService(ApiSettings(output_root=Path(tmpdir), fixture_file=None, frontend_root=None))


def _create_tavern(service: WebService) -> dict:
    return service.create_tavern_payload(
        {
            "id": "tavern_memory_permissions",
            "name": "Memory Permissions Tavern",
            "description": "A tavern for memory permission checks.",
            "lat": 31.23,
            "lon": 121.47,
        },
        owner_id="owner_memory_permissions",
    )


def _memory_ids(memories: list[dict]) -> set[str]:
    return {memory["id"] for memory in memories}


def test_memory_permissions_separate_private_owner_and_public_visibility():
    with TemporaryDirectory() as tmpdir:
        service = _service(tmpdir)
        tavern = _create_tavern(service)
        tavern_id = tavern["id"]
        owner_id = "owner_memory_permissions"
        alpha_id = "visitor_alpha_permissions"
        beta_id = "visitor_beta_permissions"

        alpha_private = service.create_memory_atom_payload(
            tavern_id,
            {
                "id": "mem_alpha_private",
                "scope": "visitor_tavern",
                "dimension": "preference",
                "horizon": "long",
                "subject": alpha_id,
                "visitor_id": alpha_id,
                "content": "ALPHA-PRIVATE-TEA-CODE-17",
                "visibility": "private",
                "metadata": {"private_hint": "alpha-only"},
            },
            user_id=alpha_id,
        )["memory_atom"]

        beta_private = service.create_memory_atom_payload(
            tavern_id,
            {
                "id": "mem_beta_private",
                "scope": "visitor_tavern",
                "dimension": "fact",
                "horizon": "mid",
                "subject": beta_id,
                "visitor_id": beta_id,
                "content": "BETA-PRIVATE-LOCKER-CODE-42",
                "visibility": "private",
            },
            user_id=beta_id,
        )["memory_atom"]

        owner_note = service.create_memory_atom_payload(
            tavern_id,
            {
                "id": "mem_owner_alpha",
                "scope": "visitor_tavern",
                "dimension": "event",
                "horizon": "mid",
                "subject": alpha_id,
                "visitor_id": alpha_id,
                "content": "Owner-visible note: Alpha completed the second visit.",
                "visibility": "owner",
            },
            user_id=owner_id,
        )["memory_atom"]

        public_note = service.create_memory_atom_payload(
            tavern_id,
            {
                "id": "mem_public_clock",
                "scope": "tavern_public",
                "dimension": "fact",
                "horizon": "long",
                "subject": tavern_id,
                "content": "The hallway clock runs five minutes slow.",
                "visibility": "public",
            },
            user_id=owner_id,
        )["memory_atom"]

        alpha_list = service.list_memory_atoms_payload(tavern_id, user_id=alpha_id)["memory_atoms"]
        assert _memory_ids(alpha_list) == {
            alpha_private["id"],
            owner_note["id"],
            public_note["id"],
        }
        assert beta_private["id"] not in _memory_ids(alpha_list)

        beta_list = service.list_memory_atoms_payload(tavern_id, user_id=beta_id)["memory_atoms"]
        assert _memory_ids(beta_list) == {
            beta_private["id"],
            public_note["id"],
        }

        owner_list = service.list_memory_atoms_payload(tavern_id, user_id=owner_id)["memory_atoms"]
        owner_ids = _memory_ids(owner_list)
        assert owner_ids == {owner_note["id"], public_note["id"]}
        assert alpha_private["id"] not in owner_ids
        assert beta_private["id"] not in owner_ids
        serialized_owner = json.dumps(owner_list, ensure_ascii=False)
        assert "ALPHA-PRIVATE-TEA-CODE-17" not in serialized_owner
        assert "alpha-only" not in serialized_owner
        assert "BETA-PRIVATE-LOCKER-CODE-42" not in serialized_owner

        anonymous_public = service.list_memory_atoms_payload(tavern_id, visibility="public")
        assert _memory_ids(anonymous_public["memory_atoms"]) == {public_note["id"]}


def test_memory_permissions_block_single_atom_reads_across_boundaries():
    with TemporaryDirectory() as tmpdir:
        service = _service(tmpdir)
        tavern = _create_tavern(service)
        tavern_id = tavern["id"]
        owner_id = "owner_memory_permissions"
        alpha_id = "visitor_alpha_permissions"
        beta_id = "visitor_beta_permissions"

        alpha_private = service.create_memory_atom_payload(
            tavern_id,
            {
                "id": "mem_alpha_private_read",
                "scope": "visitor_tavern",
                "subject": alpha_id,
                "visitor_id": alpha_id,
                "content": "Alpha's private read boundary.",
                "visibility": "private",
            },
            user_id=alpha_id,
        )["memory_atom"]

        public_note = service.create_memory_atom_payload(
            tavern_id,
            {
                "id": "mem_public_read",
                "scope": "tavern_public",
                "subject": tavern_id,
                "content": "Public read boundary.",
                "visibility": "public",
            },
            user_id=owner_id,
        )["memory_atom"]

        own_read = service.get_memory_atom_payload(tavern_id, alpha_private["id"], alpha_id)
        assert own_read["memory_atom"]["content"] == "Alpha's private read boundary."

        public_read = service.get_memory_atom_payload(tavern_id, public_note["id"], beta_id)
        assert public_read["memory_atom"]["content"] == "Public read boundary."

        with pytest.raises(HTTPException) as owner_private_read:
            service.get_memory_atom_payload(tavern_id, alpha_private["id"], owner_id)
        assert owner_private_read.value.status_code == 403

        with pytest.raises(HTTPException) as beta_private_read:
            service.get_memory_atom_payload(tavern_id, alpha_private["id"], beta_id)
        assert beta_private_read.value.status_code == 403


def test_tavern_package_export_does_not_include_private_memory_atoms():
    with TemporaryDirectory() as tmpdir:
        service = _service(tmpdir)
        tavern = _create_tavern(service)
        tavern_id = tavern["id"]
        owner_id = "owner_memory_permissions"
        visitor_id = "visitor_export_memory"

        service.create_memory_atom_payload(
            tavern_id,
            {
                "id": "mem_export_private",
                "scope": "visitor_tavern",
                "subject": visitor_id,
                "visitor_id": visitor_id,
                "content": "EXPORT-PRIVATE-MEMORY-SHOULD-NOT-LEAK",
                "visibility": "private",
                "metadata": {"secret_marker": "EXPORT-PRIVATE-META-SHOULD-NOT-LEAK"},
            },
            user_id=visitor_id,
        )
        service.create_memory_atom_payload(
            tavern_id,
            {
                "id": "mem_export_owner",
                "scope": "visitor_tavern",
                "subject": visitor_id,
                "visitor_id": visitor_id,
                "content": "Owner export note.",
                "visibility": "owner",
            },
            user_id=owner_id,
        )

        package = service.export_tavern_package_payload(tavern_id, owner_id)
        serialized = json.dumps(package, ensure_ascii=False)

        assert "EXPORT-PRIVATE-MEMORY-SHOULD-NOT-LEAK" not in serialized
        assert "EXPORT-PRIVATE-META-SHOULD-NOT-LEAK" not in serialized
        assert "mem_export_private" not in serialized
