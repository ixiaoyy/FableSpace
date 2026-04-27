"""
NpcPublicBond 后端单元测试

使用 SQLite 内存数据库模拟 MySQL 后端。
"""

from __future__ import annotations

import pytest

pytest.importorskip("sqlalchemy", reason="public bond tests require SQLAlchemy")

from datetime import datetime
from pathlib import Path
from unittest.mock import MagicMock

import sys
sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "src"))

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from fablemap_api.infrastructure.database import Base, Database
from fablemap_api.infrastructure.mysql_store import create_mysql_tables
from fablemap_api.application.services.public_bond import (
    MySQLPublicBondStore,
    NpcPublicBondApplicationMixin,
    PublicBondStore,
    PublicBondType,
    PublicBondStatus,
    QueueStatus,
    AFFINITY_TRIGGER_THRESHOLD,
    _gen_id,
)
from fablemap_api.core.public_bond import NpcPublicBond, NpcPublicBondQueue


# ─── Fixtures ────────────────────────────────────────────────────────────────────

@pytest.fixture
def mock_db():
    engine = create_engine("sqlite:///:memory:", echo=False)
    Base.metadata.create_all(bind=engine)
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    db_instance = Database.__new__(Database)
    db_instance.engine = engine
    db_instance.SessionLocal = SessionLocal
    db_instance.url = "sqlite:///:memory:"
    return db_instance


@pytest.fixture
def store(mock_db):
    create_mysql_tables(mock_db)
    return MySQLPublicBondStore(mock_db)


@pytest.fixture
def service(store):
    class TestService(NpcPublicBondApplicationMixin):
        def _get_public_bond_store(self) -> PublicBondStore:
            return store

    return TestService()


# ─── PublicBondType Enum ────────────────────────────────────────────────────────


class TestPublicBondType:
    def test_all_types_have_value(self):
        for t in PublicBondType:
            assert t.value

    def test_exclusive_types_count(self):
        exclusive = PublicBondType.exclusive_types()
        assert len(exclusive) == 9
        for t in exclusive:
            assert t.is_exclusive()

    def test_multi_types_count(self):
        multi = PublicBondType.multi_types()
        assert len(multi) == 7
        for t in multi:
            assert not t.is_exclusive()

    def test_exclusive_types_disjoint_from_multi_types(self):
        exclusive = set(PublicBondType.exclusive_types())
        multi = set(PublicBondType.multi_types())
        assert exclusive.isdisjoint(multi)
        assert len(exclusive) + len(multi) == len(PublicBondType)

    def test_display_name_zh(self):
        assert PublicBondType.SWEETHEART.display_name("zh") == "情侣"
        assert PublicBondType.MASTER.display_name("zh") == "师徒"
        assert PublicBondType.CONTRACT_BEAST.display_name("zh") == "契约兽"

    def test_display_name_en(self):
        assert PublicBondType.SWEETHEART.display_name("en") == "Sweetheart"
        assert PublicBondType.MASTER.display_name("en") == "Master-Disciple"
        assert PublicBondType.GUARDIAN.display_name("en") == "Guardian"

    def test_display_name_unknown_lang(self):
        assert PublicBondType.SWEETHEART.display_name("fr") == "sweetheart"

    def test_to_definition(self):
        d = PublicBondType.SWEETHEART.to_definition()
        assert d["type"] == "sweetheart"
        assert d["name_zh"] == "情侣"
        assert d["is_exclusive"] is True
        assert d["max_count"] == 1

        d_multi = PublicBondType.MASTER.to_definition()
        assert d_multi["is_exclusive"] is False
        assert d_multi["max_count"] == -1


# ─── NpcPublicBond Serialization ───────────────────────────────────────────────


class TestNpcPublicBondSerialization:
    def test_to_dict(self):
        now = datetime.utcnow()
        bond = NpcPublicBond(
            id="bond_001",
            tavern_id="tavern_001",
            character_id="char_001",
            visitor_id="visitor_001",
            bond_type=PublicBondType.SWEETHEART,
            status=PublicBondStatus.ACTIVE,
            created_at=now,
            approved_at=now,
            visitor_note="很高兴认识你",
            owner_note="已通过",
        )
        d = bond.to_dict()
        assert d["id"] == "bond_001"
        assert d["bond_type"] == "sweetheart"
        assert d["status"] == "active"
        assert d["visitor_note"] == "很高兴认识你"
        assert d["owner_note"] == "已通过"
        assert d["created_at"] is not None

    def test_to_public_dict_excludes_visitor_id(self):
        bond = NpcPublicBond(
            id="bond_001",
            tavern_id="tavern_001",
            character_id="char_001",
            visitor_id="visitor_001",
            bond_type=PublicBondType.BROTHER,
            status=PublicBondStatus.ACTIVE,
        )
        d = bond.to_public_dict()
        assert "visitor_id" not in d
        assert d["character_id"] == "char_001"
        assert d["bond_type"] == "brother"
        assert d["status"] == "active"

    def test_from_dict_round_trip(self):
        now = datetime.utcnow()
        original = NpcPublicBond(
            id="bond_round",
            tavern_id="tavern_001",
            character_id="char_001",
            visitor_id="visitor_001",
            bond_type=PublicBondType.BEST_FRIEND,
            status=PublicBondStatus.PENDING,
            created_at=now,
            visitor_note="请多关照",
        )
        restored = NpcPublicBond.from_dict(original.to_dict())
        assert restored.id == original.id
        assert restored.bond_type == original.bond_type
        assert restored.status == original.status
        assert restored.visitor_note == original.visitor_note

    def test_from_dict_with_string_bond_type(self):
        data = {
            "id": "bond_str",
            "tavern_id": "t1",
            "character_id": "c1",
            "visitor_id": "v1",
            "bond_type": "sister",
            "status": "active",
        }
        bond = NpcPublicBond.from_dict(data)
        assert bond.bond_type == PublicBondType.SISTER
        assert bond.status == PublicBondStatus.ACTIVE

    def test_from_dict_unknown_bond_type_defaults_to_sweetheart(self):
        data = {
            "id": "bond_unknown",
            "tavern_id": "t1",
            "character_id": "c1",
            "visitor_id": "v1",
            "bond_type": "not_a_real_type",
            "status": "active",
        }
        bond = NpcPublicBond.from_dict(data)
        assert bond.bond_type == PublicBondType.SWEETHEART

    def test_from_dict_unknown_status_defaults_to_pending(self):
        data = {
            "id": "bond_unknown_status",
            "tavern_id": "t1",
            "character_id": "c1",
            "visitor_id": "v1",
            "bond_type": "sweetheart",
            "status": "unknown_status",
        }
        bond = NpcPublicBond.from_dict(data)
        assert bond.status == PublicBondStatus.PENDING

    def test_from_dict_parses_iso_datetime(self):
        data = {
            "id": "bond_dt",
            "tavern_id": "t1",
            "character_id": "c1",
            "visitor_id": "v1",
            "bond_type": "sweetheart",
            "status": "pending",
            "created_at": "2026-04-28T10:00:00",
        }
        bond = NpcPublicBond.from_dict(data)
        assert bond.created_at.year == 2026
        assert bond.created_at.month == 4
        assert bond.created_at.day == 28


# ─── NpcPublicBondQueue Serialization ───────────────────────────────────────────


class TestNpcPublicBondQueueSerialization:
    def test_to_dict(self):
        now = datetime.utcnow()
        queue = NpcPublicBondQueue(
            id="queue_001",
            tavern_id="tavern_001",
            character_id="char_001",
            visitor_id="visitor_001",
            bond_type=PublicBondType.SWEETHEART,
            position=2,
            status=QueueStatus.WAITING,
            created_at=now,
        )
        d = queue.to_dict()
        assert d["id"] == "queue_001"
        assert d["bond_type"] == "sweetheart"
        assert d["position"] == 2
        assert d["status"] == "waiting"
        assert d["visitor_id"] == "visitor_001"

    def test_from_dict_round_trip(self):
        now = datetime.utcnow()
        original = NpcPublicBondQueue(
            id="queue_round",
            tavern_id="tavern_001",
            character_id="char_001",
            visitor_id="visitor_001",
            bond_type=PublicBondType.CONFIDANT,
            position=1,
            status=QueueStatus.WAITING,
            created_at=now,
        )
        restored = NpcPublicBondQueue.from_dict(original.to_dict())
        assert restored.id == original.id
        assert restored.bond_type == original.bond_type
        assert restored.position == original.position
        assert restored.status == original.status


# ─── MySQLPublicBondStore ───────────────────────────────────────────────────────


class TestMySQLPublicBondStore:
    def test_save_and_get_bond(self, store):
        bond = NpcPublicBond(
            id="bond_save_001",
            tavern_id="tavern_001",
            character_id="char_001",
            visitor_id="visitor_001",
            bond_type=PublicBondType.SWEETHEART,
            status=PublicBondStatus.PENDING,
            visitor_note="请多关照",
        )
        saved = store.save_bond(bond)
        assert saved.id == bond.id
        assert saved.status == PublicBondStatus.PENDING

        retrieved = store.get_bond(bond.id)
        assert retrieved is not None
        assert retrieved.id == bond.id
        assert retrieved.bond_type == PublicBondType.SWEETHEART
        assert retrieved.visitor_note == "请多关照"

    def test_get_bond_not_found(self, store):
        result = store.get_bond("nonexistent_id")
        assert result is None

    def test_get_bond_by_visitor(self, store):
        bond = NpcPublicBond(
            id="bond_visitor_001",
            tavern_id="tavern_001",
            character_id="char_001",
            visitor_id="visitor_001",
            bond_type=PublicBondType.BROTHER,
            status=PublicBondStatus.PENDING,
        )
        store.save_bond(bond)
        bonds = store.get_bond_by_visitor("tavern_001", "char_001", "visitor_001")
        assert len(bonds) == 1
        assert bonds[0].id == bond.id

    def test_get_bond_by_visitor_empty(self, store):
        bonds = store.get_bond_by_visitor("tavern_001", "char_001", "nonexistent_visitor")
        assert len(bonds) == 0

    def test_get_active_bond(self, store):
        bond = NpcPublicBond(
            id="bond_active_001",
            tavern_id="tavern_001",
            character_id="char_001",
            visitor_id="visitor_001",
            bond_type=PublicBondType.SISTER,
            status=PublicBondStatus.ACTIVE,
        )
        store.save_bond(bond)
        active = store.get_active_bond(
            "tavern_001", "char_001", "visitor_001", PublicBondType.SISTER
        )
        assert active is not None
        assert active.id == bond.id

    def test_get_active_bond_wrong_type(self, store):
        bond = NpcPublicBond(
            id="bond_active_002",
            tavern_id="tavern_001",
            character_id="char_001",
            visitor_id="visitor_001",
            bond_type=PublicBondType.SISTER,
            status=PublicBondStatus.ACTIVE,
        )
        store.save_bond(bond)
        active = store.get_active_bond(
            "tavern_001", "char_001", "visitor_001", PublicBondType.SWEETHEART
        )
        assert active is None

    def test_get_pending_bond(self, store):
        bond = NpcPublicBond(
            id="bond_pending_001",
            tavern_id="tavern_001",
            character_id="char_001",
            visitor_id="visitor_001",
            bond_type=PublicBondType.BEST_FRIEND,
            status=PublicBondStatus.PENDING,
        )
        store.save_bond(bond)
        pending = store.get_pending_bond("tavern_001", "char_001", "visitor_001")
        assert pending is not None
        assert pending.id == bond.id

    def test_get_pending_bond_returns_none_when_active(self, store):
        bond = NpcPublicBond(
            id="bond_pending_002",
            tavern_id="tavern_001",
            character_id="char_001",
            visitor_id="visitor_001",
            bond_type=PublicBondType.BEST_FRIEND,
            status=PublicBondStatus.ACTIVE,
        )
        store.save_bond(bond)
        pending = store.get_pending_bond("tavern_001", "char_001", "visitor_001")
        assert pending is None

    def test_get_active_bonds_for_character(self, store):
        for i, visitor_id in enumerate(["v1", "v2"]):
            bond = NpcPublicBond(
                id=f"bond_char_{i}",
                tavern_id="tavern_001",
                character_id="char_001",
                visitor_id=visitor_id,
                bond_type=PublicBondType.MASTER,
                status=PublicBondStatus.ACTIVE,
            )
            store.save_bond(bond)

        bonds = store.get_active_bonds_for_character("tavern_001", "char_001")
        assert len(bonds) == 2
        for b in bonds:
            assert b.status == PublicBondStatus.ACTIVE

    def test_save_and_get_queue_entry(self, store):
        entry = NpcPublicBondQueue(
            id="queue_save_001",
            tavern_id="tavern_001",
            character_id="char_001",
            visitor_id="visitor_001",
            bond_type=PublicBondType.SWEETHEART,
            position=1,
            status=QueueStatus.WAITING,
        )
        saved = store.save_queue_entry(entry)
        assert saved.id == entry.id
        assert saved.position == 1

        retrieved = store.get_queue_entry("tavern_001", "char_001", "visitor_001")
        assert retrieved is not None
        assert retrieved.id == entry.id
        assert retrieved.position == 1

    def test_get_queue_entry_not_found(self, store):
        result = store.get_queue_entry("tavern_001", "char_001", "nonexistent_visitor")
        assert result is None

    def test_get_queue_for_character(self, store):
        for i, visitor_id in enumerate(["v1", "v2", "v3"]):
            entry = NpcPublicBondQueue(
                id=f"queue_char_{i}",
                tavern_id="tavern_001",
                character_id="char_001",
                visitor_id=visitor_id,
                bond_type=PublicBondType.SWEETHEART,
                position=i + 1,
                status=QueueStatus.WAITING,
            )
            store.save_queue_entry(entry)

        queue = store.get_queue_for_character("tavern_001", "char_001")
        assert len(queue) == 3
        assert [q.position for q in queue] == [1, 2, 3]

    def test_delete_queue_entry(self, store):
        entry = NpcPublicBondQueue(
            id="queue_del_001",
            tavern_id="tavern_001",
            character_id="char_001",
            visitor_id="visitor_001",
            bond_type=PublicBondType.SWEETHEART,
            position=1,
            status=QueueStatus.WAITING,
        )
        store.save_queue_entry(entry)
        store.delete_queue_entry(entry.id)

        retrieved = store.get_queue_entry("tavern_001", "char_001", "visitor_001")
        assert retrieved is None

    def test_get_exclusive_active_bond_count(self, store):
        # Active exclusive
        store.save_bond(NpcPublicBond(
            id="bond_excl_1",
            tavern_id="tavern_001",
            character_id="char_001",
            visitor_id="v1",
            bond_type=PublicBondType.SWEETHEART,
            status=PublicBondStatus.ACTIVE,
        ))
        # Active non-exclusive (should not count)
        store.save_bond(NpcPublicBond(
            id="bond_multi_1",
            tavern_id="tavern_001",
            character_id="char_001",
            visitor_id="v2",
            bond_type=PublicBondType.MASTER,
            status=PublicBondStatus.ACTIVE,
        ))
        # Pending exclusive (should not count)
        store.save_bond(NpcPublicBond(
            id="bond_excl_pending",
            tavern_id="tavern_001",
            character_id="char_001",
            visitor_id="v3",
            bond_type=PublicBondType.BROTHER,
            status=PublicBondStatus.PENDING,
        ))

        count = store.get_exclusive_active_bond_count("tavern_001", "char_001")
        assert count == 1

    def test_update_existing_bond(self, store):
        bond = NpcPublicBond(
            id="bond_update_001",
            tavern_id="tavern_001",
            character_id="char_001",
            visitor_id="visitor_001",
            bond_type=PublicBondType.SWEETHEART,
            status=PublicBondStatus.PENDING,
        )
        store.save_bond(bond)

        bond.status = PublicBondStatus.ACTIVE
        bond.approved_at = datetime.utcnow()
        bond.approved_by = "owner_001"
        updated = store.save_bond(bond)

        assert updated.status == PublicBondStatus.ACTIVE
        assert updated.approved_by == "owner_001"


# ─── NpcPublicBondApplicationMixin ─────────────────────────────────────────────


class TestPublicBondApplicationMixin:
    def test_public_bond_types_returns_all(self, service):
        types = service.public_bond_types()
        assert len(types) == len(PublicBondType)
        for t in types:
            assert "type" in t
            assert "name_zh" in t
            assert "is_exclusive" in t

    def test_check_eligibility_insufficient_strength(self, service):
        result = service.check_bond_eligibility(
            tavern_id="t1",
            character_id="c1",
            visitor_id="v1",
            visitor_strength=0.5,
        )
        assert result["can_apply"] is False
        assert "reason" in result
        assert result["required_strength"] == AFFINITY_TRIGGER_THRESHOLD

    def test_check_eligibility_sufficient_strength(self, service):
        result = service.check_bond_eligibility(
            tavern_id="t1",
            character_id="c1",
            visitor_id="v1",
            visitor_strength=0.75,
        )
        assert result["can_apply"] is True
        assert "reason" not in result

    def test_apply_non_exclusive_success(self, service, store):
        result = service.apply_public_bond(
            tavern_id="tavern_001",
            character_id="char_001",
            visitor_id="visitor_001",
            bond_type_str="master",
            visitor_strength=0.8,
            visitor_note="想拜您为师",
        )
        assert result["status"] == "pending"
        assert result["bond"] is not None
        assert result["bond"]["status"] == "pending"
        assert result["bond"]["bond_type"] == "master"
        assert result["queue_position"] is None

    def test_apply_unknown_bond_type_raises(self, service):
        with pytest.raises(Exception) as exc_info:
            service.apply_public_bond(
                tavern_id="tavern_001",
                character_id="char_001",
                visitor_id="visitor_001",
                bond_type_str="not_a_real_type",
                visitor_strength=0.8,
            )
        assert "未知的关系类型" in str(exc_info.value.detail)

    def test_apply_insufficient_strength_raises(self, service):
        with pytest.raises(Exception) as exc_info:
            service.apply_public_bond(
                tavern_id="tavern_001",
                character_id="char_001",
                visitor_id="visitor_001",
                bond_type_str="sweetheart",
                visitor_strength=0.3,
            )
        assert "好感度不足" in str(exc_info.value.detail)

    def test_apply_duplicate_pending_raises(self, service, store):
        service.apply_public_bond(
            tavern_id="tavern_001",
            character_id="char_001",
            visitor_id="visitor_001",
            bond_type_str="master",
            visitor_strength=0.8,
        )
        with pytest.raises(Exception) as exc_info:
            service.apply_public_bond(
                tavern_id="tavern_001",
                character_id="char_001",
                visitor_id="visitor_001",
                bond_type_str="junior_sister",
                visitor_strength=0.8,
            )
        assert "已有待审批" in str(exc_info.value.detail)

    def test_apply_exclusive_with_existing_active_queues(self, service, store):
        # 先有一个 active exclusive bond
        store.save_bond(NpcPublicBond(
            id="bond_existing_active",
            tavern_id="tavern_001",
            character_id="char_001",
            visitor_id="other_visitor",
            bond_type=PublicBondType.SWEETHEART,
            status=PublicBondStatus.ACTIVE,
        ))
        result = service.apply_public_bond(
            tavern_id="tavern_001",
            character_id="char_001",
            visitor_id="visitor_001",
            bond_type_str="sweetheart",
            visitor_strength=0.8,
        )
        assert result["status"] == "queued"
        assert result["queue_position"] == 1
        assert result["bond"] is not None
        assert result["bond"]["status"] == "pending"

    def test_approve_public_bond(self, service, store):
        bond = NpcPublicBond(
            id="bond_approve_001",
            tavern_id="tavern_001",
            character_id="char_001",
            visitor_id="visitor_001",
            bond_type=PublicBondType.SISTER,
            status=PublicBondStatus.PENDING,
        )
        store.save_bond(bond)

        result = service.approve_public_bond(
            tavern_id="tavern_001",
            character_id="char_001",
            bond_id="bond_approve_001",
            approver_id="owner_001",
            owner_note="审批通过",
        )
        assert result["bond"]["status"] == "active"
        assert result["bond"]["approved_by"] == "owner_001"
        assert result["bond"]["approved_at"] is not None

    def test_approve_nonexistent_bond_raises(self, service):
        with pytest.raises(Exception) as exc_info:
            service.approve_public_bond(
                tavern_id="tavern_001",
                character_id="char_001",
                bond_id="nonexistent_bond",
                approver_id="owner_001",
            )
        assert "不存在" in str(exc_info.value.detail)

    def test_approve_non_pending_raises(self, service, store):
        bond = NpcPublicBond(
            id="bond_approve_active",
            tavern_id="tavern_001",
            character_id="char_001",
            visitor_id="visitor_001",
            bond_type=PublicBondType.BROTHER,
            status=PublicBondStatus.ACTIVE,
        )
        store.save_bond(bond)
        with pytest.raises(Exception) as exc_info:
            service.approve_public_bond(
                tavern_id="tavern_001",
                character_id="char_001",
                bond_id="bond_approve_active",
                approver_id="owner_001",
            )
        assert "无法审批" in str(exc_info.value.detail)

    def test_reject_public_bond(self, service, store):
        bond = NpcPublicBond(
            id="bond_reject_001",
            tavern_id="tavern_001",
            character_id="char_001",
            visitor_id="visitor_001",
            bond_type=PublicBondType.CONFIDANT,
            status=PublicBondStatus.PENDING,
        )
        store.save_bond(bond)

        result = service.reject_public_bond(
            tavern_id="tavern_001",
            character_id="char_001",
            bond_id="bond_reject_001",
            approver_id="owner_001",
            owner_note="不合适",
        )
        assert result["bond"]["status"] == "revoked"
        assert result["bond"]["owner_note"] == "不合适"

    def test_revoke_public_bond(self, service, store):
        bond = NpcPublicBond(
            id="bond_revoke_001",
            tavern_id="tavern_001",
            character_id="char_001",
            visitor_id="visitor_001",
            bond_type=PublicBondType.BROTHER,
            status=PublicBondStatus.ACTIVE,
        )
        store.save_bond(bond)

        result = service.revoke_public_bond(
            tavern_id="tavern_001",
            character_id="char_001",
            bond_id="bond_revoke_001",
            revoker_id="owner_001",
            revoke_reason="关系破裂",
        )
        assert result["bond"]["status"] == "revoked"
        assert result["bond"]["revoke_reason"] == "关系破裂"

    def test_get_visitor_bond(self, service, store):
        bond = NpcPublicBond(
            id="bond_visitor_get_001",
            tavern_id="tavern_001",
            character_id="char_001",
            visitor_id="visitor_001",
            bond_type=PublicBondType.SWEETHEART,
            status=PublicBondStatus.PENDING,
        )
        store.save_bond(bond)

        result = service.get_visitor_bond(
            tavern_id="tavern_001",
            character_id="char_001",
            visitor_id="visitor_001",
            visitor_strength=0.75,
        )
        assert result["pending_bond"] is not None
        assert result["pending_bond"]["id"] == bond.id
        assert result["can_apply"] is True

    def test_get_public_bonds_for_character(self, service, store):
        for i, visitor_id in enumerate(["v1", "v2"]):
            store.save_bond(NpcPublicBond(
                id=f"bond_public_{i}",
                tavern_id="tavern_001",
                character_id="char_001",
                visitor_id=visitor_id,
                bond_type=PublicBondType.MASTER,
                status=PublicBondStatus.ACTIVE,
            ))
        # Add a pending one (should not show in public bonds)
        store.save_bond(NpcPublicBond(
            id="bond_public_pending",
            tavern_id="tavern_001",
            character_id="char_001",
            visitor_id="v3",
            bond_type=PublicBondType.MASTER,
            status=PublicBondStatus.PENDING,
        ))

        result = service.get_public_bonds_for_character("tavern_001", "char_001")
        assert result["count"] == 2
        assert result["has_bond"] is True
        for b in result["bonds"]:
            assert "visitor_id" not in b

    def test_get_bond_queue(self, service, store):
        for i, visitor_id in enumerate(["v1", "v2"]):
            store.save_queue_entry(NpcPublicBondQueue(
                id=f"queue_test_{i}",
                tavern_id="tavern_001",
                character_id="char_001",
                visitor_id=visitor_id,
                bond_type=PublicBondType.SWEETHEART,
                position=i + 1,
                status=QueueStatus.WAITING,
            ))

        result = service.get_bond_queue("tavern_001", "char_001")
        assert result["count"] == 2

    def test_cancel_queue_entry(self, service, store):
        entry = NpcPublicBondQueue(
            id="queue_cancel_001",
            tavern_id="tavern_001",
            character_id="char_001",
            visitor_id="visitor_001",
            bond_type=PublicBondType.SWEETHEART,
            position=1,
            status=QueueStatus.WAITING,
        )
        store.save_queue_entry(entry)
        # Also a pending bond
        store.save_bond(NpcPublicBond(
            id="bond_cancel_001",
            tavern_id="tavern_001",
            character_id="char_001",
            visitor_id="visitor_001",
            bond_type=PublicBondType.SWEETHEART,
            status=PublicBondStatus.PENDING,
        ))

        result = service.cancel_queue_entry("tavern_001", "char_001", "visitor_001")
        assert result["cancelled"] is True

        # Queue entry should be gone
        queue = store.get_queue_entry("tavern_001", "char_001", "visitor_001")
        assert queue is None

    def test_cancel_nonexistent_queue_raises(self, service, store):
        with pytest.raises(Exception) as exc_info:
            service.cancel_queue_entry("tavern_001", "char_001", "nonexistent_visitor")
        assert "未找到等待记录" in str(exc_info.value.detail)

    def test_revoked_bond_promotes_next_in_queue(self, service, store):
        # Existing active bond
        store.save_bond(NpcPublicBond(
            id="bond_active_original",
            tavern_id="tavern_001",
            character_id="char_001",
            visitor_id="active_visitor",
            bond_type=PublicBondType.SWEETHEART,
            status=PublicBondStatus.ACTIVE,
        ))
        # Queue entry
        store.save_queue_entry(NpcPublicBondQueue(
            id="queue_promote_001",
            tavern_id="tavern_001",
            character_id="char_001",
            visitor_id="queued_visitor",
            bond_type=PublicBondType.SWEETHEART,
            position=1,
            status=QueueStatus.WAITING,
        ))
        # Pending bond for queued visitor
        pending_bond = NpcPublicBond(
            id="bond_queued_pending",
            tavern_id="tavern_001",
            character_id="char_001",
            visitor_id="queued_visitor",
            bond_type=PublicBondType.SWEETHEART,
            status=PublicBondStatus.PENDING,
        )
        store.save_bond(pending_bond)

        # Revoke the active bond
        service.revoke_public_bond(
            tavern_id="tavern_001",
            character_id="char_001",
            bond_id="bond_active_original",
            revoker_id="owner_001",
            revoke_reason="测试撤销",
        )

        # Verify the queued bond was promoted to active
        promoted = store.get_bond("bond_queued_pending")
        assert promoted is not None
        assert promoted.status == PublicBondStatus.ACTIVE
        assert promoted.approved_by == "system_queue_promote"


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
