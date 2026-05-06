from fastapi.testclient import TestClient

from fablemap_api.main import create_app
from fablemap_api.infrastructure.settings import ApiSettings


def test_create_tavern_requires_explicit_owner_identity(tmp_path):
    client = TestClient(create_app(ApiSettings(output_root=tmp_path, fixture_file=None, frontend_root=None)))

    response = client.post(
        "/api/v1/taverns",
        json={
            "name": "身份边界酒馆",
            "description": "没有店主身份时不能创建。",
            "lat": 31.2304,
            "lon": 121.4737,
            "access": "public",
        },
    )

    assert response.status_code == 401
    assert "店主身份" in response.text or "owner" in response.text.lower()
