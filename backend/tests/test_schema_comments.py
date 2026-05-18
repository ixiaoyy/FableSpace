from __future__ import annotations

from fablemap_api.infrastructure.models import Base
from fablemap_api.infrastructure.schema_comments import schema_comment_errors


def test_all_sqlalchemy_tables_and_columns_have_comments() -> None:
    assert schema_comment_errors(Base.metadata) == []
