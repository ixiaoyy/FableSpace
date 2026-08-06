"""Fail-closed startup gate for the FableSpace database schema revision."""

from __future__ import annotations

import os
import re
import tempfile
from dataclasses import dataclass
from decimal import Decimal, InvalidOperation
from enum import Enum
from pathlib import Path
from typing import Iterable

from sqlalchemy import CheckConstraint, ForeignKeyConstraint, Index, UniqueConstraint, inspect
from sqlalchemy.engine import Engine

from .database import Base

TARGET_SCHEMA_REVISION_PATH = (
    Path(__file__).resolve().parents[5] / "deploy" / "schema-revision.txt"
)


def _read_target_schema_revision() -> tuple[str, bytes]:
    """Load the repository marker as the single target-revision source of truth."""

    try:
        raw = TARGET_SCHEMA_REVISION_PATH.read_bytes()
        decoded = raw.decode("ascii")
    except (OSError, UnicodeDecodeError) as exc:
        raise SchemaRevisionError(
            "target_schema_revision_unavailable",
            "仓库目标版本标记不可读或不是 ASCII。",
        ) from exc
    if not re.fullmatch(r"[0-9]{3}_[a-z0-9_]+\n", decoded):
        raise SchemaRevisionError(
            "target_schema_revision_invalid",
            "仓库目标版本标记格式无效。",
        )
    return decoded.rstrip("\n"), raw


TARGET_TABLE_NAMES = frozenset(
    {
        "character_relationships",
        "managed_media_assets",
        "managed_story_worlds",
        "memory_formation_jobs",
        "player_story_progress",
        "player_story_states",
        "private_memories",
        "private_memory_sources",
        "story_events",
        "story_messages",
        "story_runs",
    }
)


class SchemaStartupMode(str, Enum):
    """Describe whether startup may bootstrap or must use an existing target schema."""

    BOOTSTRAP_LOCAL = "bootstrap_local"
    VALIDATED_EXISTING = "validated_existing"


class SchemaRevisionError(RuntimeError):
    """Raise one stable startup failure without exposing database contents."""

    def __init__(self, code: str, message: str) -> None:
        """Store the stable code and expose only the caller-provided safe message."""

        self.code = code
        super().__init__(f"{code}: {message}")


TARGET_SCHEMA_REVISION, TARGET_SCHEMA_REVISION_BYTES = _read_target_schema_revision()


@dataclass(frozen=True, slots=True)
class SchemaStartupDecision:
    """Return the only two safe startup paths and the marker to verify or create."""

    mode: SchemaStartupMode
    marker_path: Path


def resolve_schema_revision_marker_path(
    *, output_root: Path, configured_path: Path | None
) -> Path:
    """Resolve the verified host marker or the local standalone marker path."""

    if configured_path is not None:
        return configured_path.expanduser().resolve()
    return (output_root / "schema-revision").expanduser().resolve()


def inspect_schema_startup(
    engine: Engine,
    *,
    marker_path: Path,
    allow_local_bootstrap: bool,
) -> SchemaStartupDecision:
    """Classify an untouched local database or validate an existing target database."""

    inspector = inspect(engine)
    table_names = frozenset(inspector.get_table_names())
    if not table_names:
        if not allow_local_bootstrap:
            raise SchemaRevisionError(
                "schema_bootstrap_required",
                "数据库为空；该部署必须通过受控 bootstrap 写入目标 Schema 与版本标记。",
            )
        if marker_path.exists():
            raise SchemaRevisionError(
                "schema_marker_without_schema",
                "数据库为空但版本标记已经存在，拒绝静默重建。",
            )
        return SchemaStartupDecision(SchemaStartupMode.BOOTSTRAP_LOCAL, marker_path)

    _assert_marker(marker_path)
    assert_target_schema(engine)
    return SchemaStartupDecision(SchemaStartupMode.VALIDATED_EXISTING, marker_path)


def assert_target_schema(engine: Engine) -> None:
    """Compare live tables, columns, indexes, foreign keys and checks with target metadata."""

    # Import model modules for their metadata side effects without creating an engine.
    from . import managed_content_models as _managed_content_models  # noqa: F401
    from . import story_state_models as _story_state_models  # noqa: F401

    inspector = inspect(engine)
    live_tables = frozenset(inspector.get_table_names())
    metadata_tables = frozenset(Base.metadata.tables)
    if metadata_tables != TARGET_TABLE_NAMES:
        raise SchemaRevisionError(
            "schema_metadata_mismatch",
            "应用 metadata 不是获批的 11 表目标。",
        )
    if live_tables != TARGET_TABLE_NAMES:
        raise SchemaRevisionError(
            "schema_table_mismatch",
            "数据库表集合与获批的 11 表目标不一致。",
        )

    for table_name in sorted(TARGET_TABLE_NAMES):
        table = Base.metadata.tables[table_name]
        _assert_columns(engine, inspector, table_name, table.columns)
        _assert_primary_key(inspector, table_name, tuple(column.name for column in table.primary_key))
        _assert_indexes(inspector, table_name, table.indexes, table.constraints)
        _assert_foreign_keys(inspector, table_name, table.constraints)
        _assert_checks(inspector, table_name, table.constraints)


def write_local_schema_revision(marker_path: Path) -> None:
    """Atomically create the local marker after seed and target-Schema postflight succeed."""

    if marker_path.exists():
        raise SchemaRevisionError(
            "schema_marker_already_exists",
            "本地版本标记已存在，拒绝覆盖其先前状态。",
        )
    marker_path.parent.mkdir(parents=True, exist_ok=True)
    descriptor, temporary_name = tempfile.mkstemp(
        dir=marker_path.parent,
        prefix=f".{marker_path.name}.",
        suffix=".tmp",
    )
    temporary_path = Path(temporary_name)
    try:
        with os.fdopen(descriptor, "wb") as handle:
            handle.write(TARGET_SCHEMA_REVISION_BYTES)
            handle.flush()
            os.fsync(handle.fileno())
        os.replace(temporary_path, marker_path)
    finally:
        if temporary_path.exists():
            temporary_path.unlink()


def _assert_marker(marker_path: Path) -> None:
    """Require the exact ASCII marker bytes; a file marker never repairs Schema drift."""

    try:
        actual = marker_path.read_bytes()
    except OSError as exc:
        raise SchemaRevisionError(
            "schema_revision_unavailable",
            "无法读取数据库版本标记。",
        ) from exc
    if actual != TARGET_SCHEMA_REVISION_BYTES:
        raise SchemaRevisionError(
            "schema_revision_mismatch",
            "数据库版本标记与应用目标版本不一致。",
        )


def _assert_columns(engine: Engine, inspector, table_name: str, expected_columns) -> None:
    """Require exact column names, nullability, SQL types and generated expressions."""

    live_columns = {column["name"]: column for column in inspector.get_columns(table_name)}
    expected_names = {column.name for column in expected_columns}
    if set(live_columns) != expected_names:
        raise SchemaRevisionError("schema_column_mismatch", f"{table_name} 列集合不匹配。")
    for expected in expected_columns:
        live = live_columns[expected.name]
        if bool(live.get("nullable")) != bool(expected.nullable):
            raise SchemaRevisionError(
                "schema_column_mismatch",
                f"{table_name}.{expected.name} 可空性不匹配。",
            )
        expected_type = _normalize_sql(expected.type.compile(dialect=engine.dialect))
        live_type = _normalize_sql(live["type"].compile(dialect=engine.dialect))
        if expected_type != live_type:
            raise SchemaRevisionError(
                "schema_column_mismatch",
                f"{table_name}.{expected.name} 类型不匹配。",
            )
        expected_default = _canonical_column_default(
            expected.server_default.arg
            if expected.computed is None and expected.server_default is not None
            else None
        )
        live_default = _canonical_column_default(live.get("default"))
        if expected_default != live_default:
            raise SchemaRevisionError(
                "schema_column_mismatch",
                f"{table_name}.{expected.name} 默认值不匹配。",
            )
        expected_computed = expected.computed.sqltext.text if expected.computed is not None else None
        live_computed = live.get("computed")
        live_expression = live_computed.get("sqltext") if live_computed else None
        if not _same_sql_expression(expected_computed or "", live_expression or ""):
            raise SchemaRevisionError(
                "schema_column_mismatch",
                f"{table_name}.{expected.name} 生成表达式不匹配。",
            )
        expected_persisted = (
            bool(expected.computed.persisted)
            if expected.computed is not None
            else None
        )
        live_persisted = (
            bool(live_computed.get("persisted"))
            if live_computed is not None and "persisted" in live_computed
            else None
        )
        if expected_persisted != live_persisted:
            raise SchemaRevisionError(
                "schema_column_mismatch",
                f"{table_name}.{expected.name} 生成列持久化类型不匹配。",
            )


def _assert_primary_key(inspector, table_name: str, expected_columns: tuple[str, ...]) -> None:
    """Require the exact ordered primary-key columns."""

    live = tuple(inspector.get_pk_constraint(table_name).get("constrained_columns") or ())
    if live != expected_columns:
        raise SchemaRevisionError("schema_primary_key_mismatch", f"{table_name} 主键不匹配。")


def _assert_indexes(inspector, table_name: str, indexes: Iterable[Index], constraints) -> None:
    """Require target keys, normalizing only dialect-created FK support indexes."""

    expected: dict[str, tuple[tuple[str, ...], bool]] = {
        index.name: (tuple(column.name for column in index.columns), bool(index.unique))
        for index in indexes
        if index.name
    }
    for constraint in constraints:
        if isinstance(constraint, UniqueConstraint) and constraint.name:
            expected[constraint.name] = (
                tuple(column.name for column in constraint.columns),
                True,
            )

    live: dict[str, tuple[tuple[str, ...], bool]] = {}
    for index in inspector.get_indexes(table_name):
        name = index.get("name")
        if name and name != "PRIMARY":
            live[name] = (tuple(index.get("column_names") or ()), bool(index.get("unique")))
    for constraint in inspector.get_unique_constraints(table_name):
        name = constraint.get("name")
        if name:
            live[name] = (tuple(constraint.get("column_names") or ()), True)
    foreign_key_prefixes = {
        tuple(element.parent.name for element in constraint.elements)
        for constraint in constraints
        if isinstance(constraint, ForeignKeyConstraint)
    }
    normalized_live = {
        name: definition
        for name, definition in live.items()
        if name in expected
        or definition[1]
        or not any(
            definition[0][: len(prefix)] == prefix
            for prefix in foreign_key_prefixes
        )
    }
    if normalized_live != expected:
        raise SchemaRevisionError("schema_index_mismatch", f"{table_name} 索引集合不匹配。")


def _assert_foreign_keys(inspector, table_name: str, constraints) -> None:
    """Require exact named foreign-key ownership and delete behavior."""

    expected: dict[str, tuple[tuple[str, ...], str, tuple[str, ...], str]] = {}
    for constraint in constraints:
        if not isinstance(constraint, ForeignKeyConstraint) or not constraint.name:
            continue
        expected[constraint.name] = (
            tuple(element.parent.name for element in constraint.elements),
            constraint.referred_table.name,
            tuple(element.column.name for element in constraint.elements),
            str(constraint.ondelete or "").upper(),
        )
    live: dict[str, tuple[tuple[str, ...], str, tuple[str, ...], str]] = {}
    for foreign_key in inspector.get_foreign_keys(table_name):
        name = foreign_key.get("name")
        if not name:
            continue
        live[name] = (
            tuple(foreign_key.get("constrained_columns") or ()),
            str(foreign_key.get("referred_table") or ""),
            tuple(foreign_key.get("referred_columns") or ()),
            str((foreign_key.get("options") or {}).get("ondelete") or "").upper(),
        )
    if live != expected:
        raise SchemaRevisionError("schema_foreign_key_mismatch", f"{table_name} 外键集合不匹配。")


def _assert_checks(inspector, table_name: str, constraints) -> None:
    """Require exact named CHECK expressions when the dialect reports them."""

    try:
        expected = {
            constraint.name: _canonical_sql_expression(str(constraint.sqltext))
            for constraint in constraints
            if isinstance(constraint, CheckConstraint) and constraint.name
        }
        live_rows = inspector.get_check_constraints(table_name)
        live = {
            row["name"]: _canonical_sql_expression(str(row.get("sqltext") or ""))
            for row in live_rows
            if row.get("name")
        }
    except ValueError as exc:
        raise SchemaRevisionError(
            "schema_check_mismatch",
            f"{table_name} CHECK 表达式不受目标解析器支持。",
        ) from exc
    if live != expected:
        raise SchemaRevisionError("schema_check_mismatch", f"{table_name} CHECK 集合不匹配。")


def _normalize_sql(value: str) -> str:
    """Normalize harmless dialect quoting and whitespace for definition comparison."""

    return re.sub(r"\s+", " ", str(value).replace("`", "").strip()).lower()


def _canonical_column_default(value: object) -> tuple[str, str] | None:
    """Normalize the closed numeric-default set while preserving all other literals."""

    if value is None:
        return None
    normalized = str(value).strip()
    if normalized.lower() == "null":
        return None
    numeric = normalized
    while numeric.startswith("(") and numeric.endswith(")"):
        numeric = numeric[1:-1].strip()
    if len(numeric) >= 2 and numeric[0] == numeric[-1] == "'":
        numeric = numeric[1:-1].replace("''", "'")
    try:
        decimal_value = Decimal(numeric)
    except InvalidOperation:
        return "literal", _normalize_sql(normalized)
    canonical = format(decimal_value, "f")
    if "." in canonical:
        canonical = canonical.rstrip("0").rstrip(".")
    return "number", canonical or "0"


_SQL_EXPRESSION_TOKEN = re.compile(
    r"(?P<space>\s+)"
    r"|(?P<charset>_[A-Za-z0-9]+(?='))"
    r"|(?P<string>'(?:''|[^'])*')"
    r"|(?P<operator><>|!=|>=|<=|=|>|<)"
    r"|(?P<number>\d+(?:\.\d+)?)"
    r"|(?P<punctuation>[(),])"
    r"|(?P<identifier>`[^`]+`|[A-Za-z_][A-Za-z0-9_]*)"
)


def _tokenize_sql_expression(value: str) -> tuple[tuple[str, str], ...]:
    """Tokenize the closed target-expression grammar without erasing grouping."""

    source = str(value).strip()
    tokens: list[tuple[str, str]] = []
    position = 0
    while position < len(source):
        match = _SQL_EXPRESSION_TOKEN.match(source, position)
        if match is None:
            raise ValueError("unsupported SQL expression token")
        position = match.end()
        kind = str(match.lastgroup)
        raw = match.group()
        if kind in {"space", "charset"}:
            continue
        if kind == "identifier":
            tokens.append((kind, raw.strip("`").lower()))
        elif kind == "string":
            tokens.append((kind, raw[1:-1].replace("''", "'")))
        elif kind == "number":
            try:
                number = Decimal(raw)
            except InvalidOperation as exc:
                raise ValueError("invalid SQL numeric literal") from exc
            normalized_number = format(number, "f")
            if "." in normalized_number:
                normalized_number = normalized_number.rstrip("0").rstrip(".")
            tokens.append((kind, normalized_number or "0"))
        elif kind == "operator" and raw == "!=":
            tokens.append((kind, "<>"))
        else:
            tokens.append((kind, raw.lower()))
    return tuple(tokens)


class _SqlExpressionParser:
    """Parse the exact Boolean/CHECK/CASE subset used by the 11-table target."""

    def __init__(self, tokens: tuple[tuple[str, str], ...]) -> None:
        """Keep an immutable token stream and initialize its read cursor."""

        self.tokens = tokens
        self.position = 0

    def parse(self) -> tuple:
        """Parse one complete expression and reject unsupported trailing syntax."""

        expression = self._parse_or()
        if self.position != len(self.tokens):
            raise ValueError("trailing SQL expression tokens")
        return expression

    def _peek(self, value: str | None = None) -> bool:
        """Return whether one token remains and optionally matches a normalized value."""

        if self.position >= len(self.tokens):
            return False
        return value is None or self.tokens[self.position][1] == value

    def _consume(self, value: str | None = None) -> tuple[str, str]:
        """Consume one token, requiring its normalized value when supplied."""

        if not self._peek(value):
            raise ValueError("unexpected SQL expression token")
        token = self.tokens[self.position]
        self.position += 1
        return token

    def _parse_or(self) -> tuple:
        """Parse OR expressions while preserving their Boolean precedence."""

        expression = self._parse_and()
        while self._peek("or"):
            self._consume("or")
            expression = ("or", expression, self._parse_and())
        return expression

    def _parse_and(self) -> tuple:
        """Parse AND expressions below OR and above predicate boundaries."""

        expression = self._parse_predicate()
        while self._peek("and"):
            self._consume("and")
            expression = ("and", expression, self._parse_predicate())
        return expression

    def _parse_predicate(self) -> tuple:
        """Parse comparison, IN, BETWEEN, and IS NULL predicates."""

        left = self._parse_primary()
        if self._peek() and self.tokens[self.position][0] == "operator":
            operator = self._consume()[1]
            return ("compare", operator, left, self._parse_primary())
        if self._peek("in"):
            self._consume("in")
            self._consume("(")
            values = [self._parse_primary()]
            while self._peek(","):
                self._consume(",")
                values.append(self._parse_primary())
            self._consume(")")
            return ("in", left, tuple(values))
        if self._peek("between"):
            self._consume("between")
            lower = self._parse_primary()
            self._consume("and")
            return ("between", left, lower, self._parse_primary())
        if self._peek("is"):
            self._consume("is")
            negated = False
            if self._peek("not"):
                self._consume("not")
                negated = True
            self._consume("null")
            return ("is_null", left, negated)
        return left

    def _parse_primary(self) -> tuple:
        """Parse grouped expressions, CASE values, identifiers, and literals."""

        if self._peek("("):
            self._consume("(")
            expression = self._parse_or()
            self._consume(")")
            return expression
        if self._peek("case"):
            return self._parse_case()
        kind, value = self._consume()
        if kind == "identifier" and value == "null":
            return ("null",)
        if kind == "identifier":
            return ("identifier", value)
        if kind == "string":
            return ("string", value)
        if kind == "number":
            return ("number", value)
        raise ValueError("unsupported SQL primary expression")

    def _parse_case(self) -> tuple:
        """Parse searched CASE expressions used by generated target columns."""

        self._consume("case")
        branches: list[tuple[tuple, tuple]] = []
        while self._peek("when"):
            self._consume("when")
            condition = self._parse_or()
            self._consume("then")
            branches.append((condition, self._parse_or()))
        fallback: tuple | None = None
        if self._peek("else"):
            self._consume("else")
            fallback = self._parse_or()
        self._consume("end")
        if not branches:
            raise ValueError("CASE expression has no WHEN branch")
        return ("case", tuple(branches), fallback)


def _canonical_sql_expression(value: str) -> tuple:
    """Return a structural target-expression form tolerant of MySQL reflection noise."""

    return _SqlExpressionParser(_tokenize_sql_expression(value)).parse()


def _same_sql_expression(expected: str, actual: str) -> bool:
    """Compare two expressions structurally and fail closed on unsupported syntax."""

    if not expected and not actual:
        return True
    if not expected or not actual:
        return False
    try:
        return _canonical_sql_expression(expected) == _canonical_sql_expression(actual)
    except ValueError:
        return False


__all__ = [
    "SchemaRevisionError",
    "SchemaStartupDecision",
    "SchemaStartupMode",
    "TARGET_SCHEMA_REVISION",
    "TARGET_SCHEMA_REVISION_BYTES",
    "TARGET_SCHEMA_REVISION_PATH",
    "TARGET_TABLE_NAMES",
    "assert_target_schema",
    "inspect_schema_startup",
    "resolve_schema_revision_marker_path",
    "write_local_schema_revision",
]
