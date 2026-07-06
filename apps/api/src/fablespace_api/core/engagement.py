"""
Engagement System — Per-tavern Soft Currency, Gifts, and Bonus Draw Vouchers

Features:
- Per-tavern "纪念币/心意点" soft currency wallet
- Task/gameplay completion → earn coins with idempotency and daily caps
- Gift catalog → spend coins → capped character affinity
- Bonus draw voucher earned from coins, not purchased

Design constraints (from PRD):
- No real-money purchase, transfer, settlement, or platform-wide wallet
- Currency is per visitor × per tavern only
- Bonus draw vouchers are earned-only, capped, non-transferable
"""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import UTC, datetime
from typing import Any
import uuid

# ─────────────────────────────────────────
# Constants
# ─────────────────────────────────────────

DEFAULT_COIN_LABEL = "纪念币"
DEFAULT_DAILY_EARN_LIMIT = 50
DEFAULT_WEEKLY_EARN_LIMIT = 200
DEFAULT_GAMEPLAY_COMPLETION_REWARD = 10

DEFAULT_GIFT_CATALOG = [
    {
        "id": "warm_tea",
        "name": "一杯热茶",
        "icon": "🍵",
        "price": 10,
        "target": "character",
        "affinity_delta": 2,
        "cooldown_hours": 12,
        "status": "published",
    },
    {
        "id": "sweet_pastry",
        "name": "甜点",
        "icon": "🍰",
        "price": 15,
        "target": "character",
        "affinity_delta": 3,
        "cooldown_hours": 12,
        "status": "published",
    },
    {
        "id": "flower_bouquet",
        "name": "花束",
        "icon": "💐",
        "price": 30,
        "target": "character",
        "affinity_delta": 6,
        "cooldown_hours": 24,
        "status": "published",
    },
]

DEFAULT_BONUS_DRAW = {
    "enabled": True,
    "voucher_price": 30,
    "daily_limit": 1,
    "weekly_limit": 3,
    "hidden_unlock_allowed": False,
}


def build_default_reward_rules(gameplay_definitions: list[dict[str, Any]] | None) -> list["RewardRule"]:
    rules: list[RewardRule] = []
    for gameplay in gameplay_definitions or []:
        if not isinstance(gameplay, dict):
            continue
        gameplay_id = str(gameplay.get("id") or "").strip()
        if not gameplay_id:
            continue
        status = str(gameplay.get("status") or "published").strip().lower()
        if status not in {"published", "active"}:
            continue
        rules.append(
            RewardRule(
                source_type="gameplay_completion",
                source_id=gameplay_id,
                amount=DEFAULT_GAMEPLAY_COMPLETION_REWARD,
                daily_claim_limit=1,
            )
        )
    return rules


# ─────────────────────────────────────────
# Engagement Config
# ─────────────────────────────────────────


@dataclass
class EarnLimit:
    daily_per_visitor: int = DEFAULT_DAILY_EARN_LIMIT
    weekly_per_visitor: int = DEFAULT_WEEKLY_EARN_LIMIT


@dataclass
class RewardRule:
    source_type: str  # "gameplay_completion"
    source_id: str
    amount: int
    daily_claim_limit: int = 1

    def to_dict(self) -> dict[str, Any]:
        return {
            "source_type": self.source_type,
            "source_id": self.source_id,
            "amount": self.amount,
            "daily_claim_limit": self.daily_claim_limit,
        }


@dataclass
class GiftItem:
    id: str
    name: str
    icon: str
    price: int
    target: str = "character"
    affinity_delta: float = 2.0
    cooldown_hours: int = 12
    status: str = "published"

    def to_dict(self) -> dict[str, Any]:
        return {
            "id": self.id,
            "name": self.name,
            "icon": self.icon,
            "price": self.price,
            "target": self.target,
            "affinity_delta": self.affinity_delta,
            "cooldown_hours": self.cooldown_hours,
            "status": self.status,
        }


@dataclass
class BonusDrawConfig:
    enabled: bool = True
    voucher_price: int = 30
    daily_limit: int = 1
    weekly_limit: int = 3
    hidden_unlock_allowed: bool = False

    def to_dict(self) -> dict[str, Any]:
        return {
            "enabled": self.enabled,
            "voucher_price": self.voucher_price,
            "daily_limit": self.daily_limit,
            "weekly_limit": self.weekly_limit,
            "hidden_unlock_allowed": self.hidden_unlock_allowed,
        }


@dataclass
class EngagementConfig:
    version: int = 1
    coin_label: str = DEFAULT_COIN_LABEL
    earn_limits: EarnLimit = field(default_factory=EarnLimit)
    reward_rules: list[RewardRule] = field(default_factory=list)
    gift_catalog: list[GiftItem] = field(default_factory=list)
    bonus_draw: BonusDrawConfig = field(default_factory=BonusDrawConfig)

    def to_dict(self) -> dict[str, Any]:
        return {
            "version": self.version,
            "coin_label": self.coin_label,
            "earn_limits": {
                "daily_per_visitor": self.earn_limits.daily_per_visitor,
                "weekly_per_visitor": self.earn_limits.weekly_per_visitor,
            },
            "reward_rules": [r.to_dict() for r in self.reward_rules],
            "gift_catalog": [g.to_dict() for g in self.gift_catalog],
            "bonus_draw": self.bonus_draw.to_dict(),
        }

    @classmethod
    def from_dict(cls, data: dict[str, Any]) -> "EngagementConfig":
        if not data:
            return cls()
        earn_limits_data = data.get("earn_limits", {})
        bonus_draw_data = data.get("bonus_draw", {})
        return cls(
            version=int(data.get("version", 1)),
            coin_label=data.get("coin_label", DEFAULT_COIN_LABEL),
            earn_limits=EarnLimit(
                daily_per_visitor=earn_limits_data.get("daily_per_visitor", DEFAULT_DAILY_EARN_LIMIT),
                weekly_per_visitor=earn_limits_data.get("weekly_per_visitor", DEFAULT_WEEKLY_EARN_LIMIT),
            ),
            reward_rules=[
                RewardRule(**r) for r in data.get("reward_rules", [])
            ],
            gift_catalog=[
                GiftItem(**g) for g in data.get("gift_catalog", DEFAULT_GIFT_CATALOG)
            ],
            bonus_draw=BonusDrawConfig(
                enabled=bonus_draw_data.get("enabled", True),
                voucher_price=bonus_draw_data.get("voucher_price", 30),
                daily_limit=bonus_draw_data.get("daily_limit", 1),
                weekly_limit=bonus_draw_data.get("weekly_limit", 3),
                hidden_unlock_allowed=bonus_draw_data.get("hidden_unlock_allowed", False),
            ),
        )

    @classmethod
    def default_template(cls) -> "EngagementConfig":
        return cls(
            coin_label=DEFAULT_COIN_LABEL,
            earn_limits=EarnLimit(),
            reward_rules=[],
            gift_catalog=[GiftItem(**g) for g in DEFAULT_GIFT_CATALOG],
            bonus_draw=BonusDrawConfig(),
        )


# ─────────────────────────────────────────
# Engagement Progress (Private Bucket)
# ─────────────────────────────────────────


def _today_key() -> str:
    return datetime.now(UTC).strftime("%Y-%m-%d")


def _week_key() -> str:
    return datetime.now(UTC).strftime("%Y-W%W")


@dataclass
class Wallet:
    balance: int = 0
    lifetime_earned: int = 0
    lifetime_spent: int = 0

    def to_dict(self) -> dict[str, Any]:
        return {
            "balance": max(0, self.balance),
            "lifetime_earned": max(0, self.lifetime_earned),
            "lifetime_spent": max(0, self.lifetime_spent),
        }


@dataclass
class LedgerEntry:
    id: str
    type: str  # "earn" | "spend"
    source_type: str
    source_id: str
    amount: int
    created_at: str

    def to_dict(self) -> dict[str, Any]:
        return {
            "id": self.id,
            "type": self.type,
            "source_type": self.source_type,
            "source_id": self.source_id,
            "amount": self.amount,
            "created_at": self.created_at,
        }


@dataclass
class DailyCounters:
    earned: int = 0
    gift_affinity_by_character: dict[str, float] = field(default_factory=dict)
    bonus_draws_used: int = 0

    def to_dict(self) -> dict[str, Any]:
        return {
            "earned": max(0, self.earned),
            "gift_affinity_by_character": self.gift_affinity_by_character,
            "bonus_draws_used": max(0, self.bonus_draws_used),
        }


@dataclass
class GiftHistoryEntry:
    id: str
    gift_id: str
    character_id: str
    amount: int
    affinity_delta: float
    cap_applied: bool
    narration: str
    created_at: str

    def to_dict(self) -> dict[str, Any]:
        return {
            "id": self.id,
            "gift_id": self.gift_id,
            "character_id": self.character_id,
            "amount": self.amount,
            "affinity_delta": self.affinity_delta,
            "cap_applied": self.cap_applied,
            "narration": self.narration,
            "created_at": self.created_at,
        }


@dataclass
class BonusDrawVoucher:
    id: str
    earned_at: str
    redeemed: bool = False
    redeemed_at: str | None = None

    def to_dict(self) -> dict[str, Any]:
        return {
            "id": self.id,
            "earned_at": self.earned_at,
            "redeemed": self.redeemed,
            "redeemed_at": self.redeemed_at,
        }


@dataclass
class VisitorEngagementProgress:
    wallet: Wallet = field(default_factory=Wallet)
    ledger: list[LedgerEntry] = field(default_factory=list)
    daily_counters: dict[str, DailyCounters] = field(default_factory=dict)
    gift_history: list[GiftHistoryEntry] = field(default_factory=list)
    bonus_draw_vouchers: list[BonusDrawVoucher] = field(default_factory=list)
    claimed_session_ids: set[str] = field(default_factory=set)

    def to_dict(self) -> dict[str, Any]:
        return {
            "wallet": self.wallet.to_dict(),
            "ledger": [e.to_dict() for e in self.ledger],
            "daily_counters": {k: v.to_dict() for k, v in self.daily_counters.items()},
            "gift_history": [h.to_dict() for h in self.gift_history],
            "bonus_draw_vouchers": [v.to_dict() for v in self.bonus_draw_vouchers],
            "claimed_session_ids": list(self.claimed_session_ids),
        }

    @classmethod
    def from_dict(cls, data: dict[str, Any]) -> "VisitorEngagementProgress":
        if not data:
            return cls()

        wallet_data = data.get("wallet", {})
        ledger_data = data.get("ledger", [])
        daily_data = data.get("daily_counters", {})
        gift_data = data.get("gift_history", [])
        voucher_data = data.get("bonus_draw_vouchers", [])
        claimed = data.get("claimed_session_ids", [])

        return cls(
            wallet=Wallet(
                balance=max(0, int(wallet_data.get("balance", 0))),
                lifetime_earned=max(0, int(wallet_data.get("lifetime_earned", 0))),
                lifetime_spent=max(0, int(wallet_data.get("lifetime_spent", 0))),
            ),
            ledger=[LedgerEntry(**e) for e in ledger_data if e.get("id")],
            daily_counters={
                k: DailyCounters(
                    earned=max(0, int(v.get("earned", 0))),
                    gift_affinity_by_character=v.get("gift_affinity_by_character", {}),
                    bonus_draws_used=max(0, int(v.get("bonus_draws_used", 0))),
                )
                for k, v in daily_data.items()
            },
            gift_history=[GiftHistoryEntry(**h) for h in gift_data if h.get("id")],
            bonus_draw_vouchers=[
                BonusDrawVoucher(
                    id=v["id"],
                    earned_at=v.get("earned_at", ""),
                    redeemed=v.get("redeemed", False),
                    redeemed_at=v.get("redeemed_at"),
                )
                for v in voucher_data
                if v.get("id")
            ],
            claimed_session_ids=set(claimed),
        )

    def get_daily_counters(self, date_key: str) -> DailyCounters:
        if date_key not in self.daily_counters:
            self.daily_counters[date_key] = DailyCounters()
        return self.daily_counters[date_key]

    def active_vouchers(self) -> list[BonusDrawVoucher]:
        return [v for v in self.bonus_draw_vouchers if not v.redeemed]


# ─────────────────────────────────────────
# Engagement Actions
# ─────────────────────────────────────────


@dataclass
class EarnResult:
    success: bool
    amount: int = 0
    reason: str = ""
    new_balance: int = 0


@dataclass
class SpendResult:
    success: bool
    amount: int = 0
    reason: str = ""
    new_balance: int = 0


@dataclass
class GiftResult:
    success: bool
    gift_id: str = ""
    character_id: str = ""
    amount: int = 0
    affinity_delta: float = 0.0
    cap_applied: bool = False
    reason: str = ""
    narration: str = ""
    new_balance: int = 0


@dataclass
class VoucherRedeemResult:
    success: bool
    voucher_id: str = ""
    reason: str = ""
    vouchers_remaining: int = 0


def check_earn_eligibility(
    progress: VisitorEngagementProgress,
    config: EngagementConfig,
    source_id: str,
) -> EarnResult:
    """Check if visitor can earn coins from a source."""
    today = _today_key()
    week = _week_key()
    daily = progress.get_daily_counters(today)
    weekly = progress.get_daily_counters(week)

    # Check daily cap
    if daily.earned >= config.earn_limits.daily_per_visitor:
        return EarnResult(
            success=False,
            reason=f"今日获取已达上限（{config.earn_limits.daily_per_visitor} {config.coin_label}）",
            new_balance=progress.wallet.balance,
        )

    # Check weekly cap
    if weekly.earned >= config.earn_limits.weekly_per_visitor:
        return EarnResult(
            success=False,
            reason=f"本周获取已达上限（{config.earn_limits.weekly_per_visitor} {config.coin_label}）",
            new_balance=progress.wallet.balance,
        )

    return EarnResult(success=True, new_balance=progress.wallet.balance)


def earn_coins(
    progress: VisitorEngagementProgress,
    config: EngagementConfig,
    amount: int,
    source_type: str,
    source_id: str,
) -> EarnResult:
    """Add coins to visitor's wallet with idempotency check."""
    # Idempotency: don't award twice for the same source_id
    if source_id in progress.claimed_session_ids:
        return EarnResult(
            success=False,
            reason="该奖励已领取",
            new_balance=progress.wallet.balance,
        )

    eligibility = check_earn_eligibility(progress, config, source_id)
    if not eligibility.success:
        return eligibility

    today = _today_key()
    week = _week_key()

    # Award coins
    progress.wallet.balance += amount
    progress.wallet.lifetime_earned += amount
    progress.claimed_session_ids.add(source_id)

    # Update daily counter
    daily = progress.get_daily_counters(today)
    daily.earned = min(daily.earned + amount, config.earn_limits.daily_per_visitor)
    weekly = progress.get_daily_counters(week)
    weekly.earned = min(weekly.earned + amount, config.earn_limits.weekly_per_visitor)

    # Record ledger
    ledger_entry = LedgerEntry(
        id=str(uuid.uuid4()),
        type="earn",
        source_type=source_type,
        source_id=source_id,
        amount=amount,
        created_at=datetime.now(UTC).isoformat(),
    )
    progress.ledger.append(ledger_entry)

    return EarnResult(
        success=True,
        amount=amount,
        new_balance=progress.wallet.balance,
        reason=f"获得 {amount} {config.coin_label}",
    )


def check_spend_eligibility(
    progress: VisitorEngagementProgress,
    config: EngagementConfig,
    price: int,
) -> SpendResult:
    """Check if visitor can spend coins."""
    if progress.wallet.balance < price:
        return SpendResult(
            success=False,
            reason=f"余额不足（需要 {price} {config.coin_label}，当前 {progress.wallet.balance}）",
            new_balance=progress.wallet.balance,
        )
    return SpendResult(success=True, new_balance=progress.wallet.balance)


def spend_coins(
    progress: VisitorEngagementProgress,
    config: EngagementConfig,
    amount: int,
    source_type: str,
    source_id: str,
) -> SpendResult:
    """Deduct coins from visitor's wallet."""
    eligibility = check_spend_eligibility(progress, config, amount)
    if not eligibility.success:
        return eligibility

    progress.wallet.balance -= amount
    progress.wallet.lifetime_spent += amount

    ledger_entry = LedgerEntry(
        id=str(uuid.uuid4()),
        type="spend",
        source_type=source_type,
        source_id=source_id,
        amount=-amount,
        created_at=datetime.now(UTC).isoformat(),
    )
    progress.ledger.append(ledger_entry)

    return SpendResult(
        success=True,
        amount=amount,
        new_balance=progress.wallet.balance,
        reason=f"花费 {amount} {config.coin_label}",
    )


def calculate_gift_affinity_delta(
    progress: VisitorEngagementProgress,
    config: EngagementConfig,
    gift: GiftItem,
    character_id: str,
) -> tuple[float, bool]:
    """
    Calculate how much affinity a gift should grant.
    Returns (delta, cap_applied).

    Uses diminishing returns: if character already received affinity today,
    the delta is reduced by 50%.
    """
    today = _today_key()
    daily = progress.get_daily_counters(today)
    current_char_affinity = daily.gift_affinity_by_character.get(character_id, 0.0)

    base_delta = gift.affinity_delta
    if current_char_affinity > 0:
        # Diminishing returns: halve delta if already gifted today
        effective_delta = base_delta * 0.5
        cap_applied = True
    else:
        effective_delta = base_delta
        cap_applied = False

    return (round(effective_delta, 4), cap_applied)


def send_gift(
    progress: VisitorEngagementProgress,
    config: EngagementConfig,
    gift_id: str,
    character_id: str,
) -> GiftResult:
    """Send a gift to an NPC character."""
    # Find gift in catalog
    gift = next((g for g in config.gift_catalog if g.id == gift_id and g.status == "published"), None)
    if not gift:
        return GiftResult(success=False, reason="找不到该礼物")

    # Check balance
    balance_check = check_spend_eligibility(progress, config, gift.price)
    if not balance_check.success:
        return GiftResult(success=False, reason=balance_check.reason, new_balance=progress.wallet.balance)

    # Check cooldown
    today = _today_key()
    daily = progress.get_daily_counters(today)
    cooldown_key = f"gift_cooldown_{gift_id}_{character_id}"
    last_sent = progress.gift_history
    recent_same_gift = [
        h for h in last_sent
        if h.gift_id == gift_id
        and h.character_id == character_id
        and h.created_at.startswith(today)
    ]
    if recent_same_gift:
        remaining = max(0, gift.cooldown_hours - 1)
        if remaining > 0:
            return GiftResult(
                success=False,
                reason=f"同一礼物今日已送给该角色，请 {remaining} 小时后再试",
                new_balance=progress.wallet.balance,
            )

    # Spend coins
    spend_result = spend_coins(progress, config, gift.price, "gift", gift_id)
    if not spend_result.success:
        return GiftResult(success=False, reason=spend_result.reason, new_balance=progress.wallet.balance)

    # Calculate affinity
    affinity_delta, cap_applied = calculate_gift_affinity_delta(progress, config, gift, character_id)

    # Update daily counter
    daily.gift_affinity_by_character[character_id] = (
        daily.gift_affinity_by_character.get(character_id, 0.0) + affinity_delta
    )

    # Record gift history
    narration = f"赠送了 {gift.icon} {gift.name}，获得好感度 +{affinity_delta:.1f}"
    if cap_applied:
        narration += "（今日重复赠送，好感度减半）"

    history_entry = GiftHistoryEntry(
        id=str(uuid.uuid4()),
        gift_id=gift_id,
        character_id=character_id,
        amount=gift.price,
        affinity_delta=affinity_delta,
        cap_applied=cap_applied,
        narration=narration,
        created_at=datetime.now(UTC).isoformat(),
    )
    progress.gift_history.append(history_entry)

    return GiftResult(
        success=True,
        gift_id=gift_id,
        character_id=character_id,
        amount=gift.price,
        affinity_delta=affinity_delta,
        cap_applied=cap_applied,
        narration=narration,
        new_balance=progress.wallet.balance,
    )


def check_voucher_eligibility(
    progress: VisitorEngagementProgress,
    config: EngagementConfig,
) -> tuple[bool, str]:
    """Check if visitor can redeem a bonus draw voucher."""
    if not config.bonus_draw.enabled:
        return False, "额外抽卡功能已关闭"

    today = _today_key()
    week = _week_key()
    daily = progress.get_daily_counters(today)
    weekly = progress.get_daily_counters(week)

    if daily.bonus_draws_used >= config.bonus_draw.daily_limit:
        return False, "今日额外抽卡次数已用完"

    if weekly.bonus_draws_used >= config.bonus_draw.weekly_limit:
        return False, "本周额外抽卡次数已用完"

    if progress.wallet.balance < config.bonus_draw.voucher_price:
        return False, f"余额不足（需要 {config.bonus_draw.voucher_price} {config.coin_label}）"

    return True, ""


def redeem_voucher(
    progress: VisitorEngagementProgress,
    config: EngagementConfig,
) -> VoucherRedeemResult:
    """Redeem coins to get a bonus draw voucher."""
    eligible, reason = check_voucher_eligibility(progress, config)
    if not eligible:
        return VoucherRedeemResult(success=False, reason=reason)

    # Spend coins
    spend_result = spend_coins(
        progress, config, config.bonus_draw.voucher_price, "voucher_redeem", "bonus_draw"
    )
    if not spend_result.success:
        return VoucherRedeemResult(success=False, reason=spend_result.reason)

    # Issue voucher
    voucher = BonusDrawVoucher(
        id=str(uuid.uuid4()),
        earned_at=datetime.now(UTC).isoformat(),
        redeemed=False,
    )
    progress.bonus_draw_vouchers.append(voucher)

    # Update counters
    today = _today_key()
    week = _week_key()
    daily = progress.get_daily_counters(today)
    daily.bonus_draws_used += 1
    weekly = progress.get_daily_counters(week)
    weekly.bonus_draws_used += 1

    # Count remaining vouchers
    vouchers_remaining = len(progress.active_vouchers())

    return VoucherRedeemResult(
        success=True,
        voucher_id=voucher.id,
        vouchers_remaining=vouchers_remaining,
        reason=f"获得额外邂逅券！今日剩余 {daily.bonus_draws_used}/{config.bonus_draw.daily_limit} 次",
    )
