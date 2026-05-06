from fastapi.testclient import TestClient

from fablemap_api.core.api import create_app as create_core_app
from fablemap_api.infrastructure.settings import ApiSettings
from fablemap_api.main import create_app as create_native_app


def _install_crashing_route(app):
    @app.get("/__test__/boom")
    def boom():
        raise RuntimeError("secret traceback should stay server-side")


def _assert_unexpected_error_is_json(app):
    _install_crashing_route(app)
    client = TestClient(app, raise_server_exceptions=False)
    response = client.get("/__test__/boom")

    assert response.status_code == 500
    assert response.headers["content-type"].startswith("application/json")
    assert response.json() == {"error": "服务暂时不可用"}
    assert "secret traceback" not in response.text
    assert response.text != "Internal Server Error"


def test_core_api_unexpected_errors_keep_json_envelope(tmp_path):
    app = create_core_app(output_root=tmp_path, fixture_file=None, frontend_root=None)
    _assert_unexpected_error_is_json(app)


def test_native_api_unexpected_errors_keep_json_envelope(tmp_path):
    app = create_native_app(ApiSettings(output_root=tmp_path, fixture_file=None, frontend_root=None))
    _assert_unexpected_error_is_json(app)
