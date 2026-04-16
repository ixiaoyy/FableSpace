import json
from pathlib import Path
from tempfile import TemporaryDirectory
import unittest

from fastapi.testclient import TestClient

from fablemap.api import create_app
from fablemap.api_service import build_health_payload, build_meta_payload, build_nearby_payload
from fablemap.application.web_payloads import build_behavior_insights, build_orchestrate_payload, record_memory_graph_event
from fablemap.web.config import ApiSettings
from fablemap.web.service import WebService


FIXTURE_PATH = Path(__file__).parent / "fixtures" / "overpass_sample.json"
FRONTEND_ROOT = Path(__file__).resolve().parent.parent / "frontend"


class ApiTests(unittest.TestCase):
    def test_api_server_serves_built_frontend_health_and_meta(self) -> None:
        with TemporaryDirectory() as tmpdir:
            output_root = Path(tmpdir) / ".fablemap-api"
            app = create_app(
                output_root=output_root,
                fixture_file=FIXTURE_PATH,
                frontend_root=FRONTEND_ROOT,
            )
            with TestClient(app) as client:
                html = client.get("/").text
                health = client.get("/api/health").json()
                meta = client.get("/api/meta").json()

        self.assertIn("FableMap · FastAPI + React", html)
        self.assertIn('id="root"', html)
        self.assertIn('/assets/', html)
        self.assertIn('type="module" crossorigin', html)
        self.assertIn('rel="stylesheet" crossorigin', html)
        self.assertEqual(health["status"], "ok")
        self.assertTrue(health["fixture_available"])
        self.assertTrue(health["frontend_available"])
        self.assertEqual(health["output_root"], str(output_root.resolve()))
        self.assertEqual(meta["project"], "FableMap")
        self.assertEqual(meta["frontend_mode"], "separated-shell")
        self.assertEqual(meta["api_base"], "http://testserver")
        self.assertEqual(meta["default_preview_base"], "http://testserver/generated")
        self.assertEqual(meta["default_coordinates"]["lat"], 31.2304)
        self.assertEqual(meta["default_coordinates"]["lon"], 121.4737)
        self.assertEqual(meta["default_mode"], "live")
        self.assertEqual(meta["endpoints"]["meta"], "/api/meta")
        self.assertIn("fixture", meta["supported_modes"])

    def test_api_server_serves_vite_source_shell_when_dist_is_unavailable(self) -> None:
        with TemporaryDirectory() as tmpdir:
            root = Path(tmpdir)
            output_root = root / ".fablemap-api"
            frontend_root = root / "frontend"
            frontend_root.mkdir()
            (frontend_root / "index.html").write_text(FRONTEND_ROOT.joinpath("index.html").read_text(encoding="utf-8"), encoding="utf-8")
            src_root = frontend_root / "src"
            src_root.mkdir()
            (src_root / "main.jsx").write_text(FRONTEND_ROOT.joinpath("src", "main.jsx").read_text(encoding="utf-8"), encoding="utf-8")
            (src_root / "App.jsx").write_text(FRONTEND_ROOT.joinpath("src", "App.jsx").read_text(encoding="utf-8"), encoding="utf-8")
            (src_root / "styles.css").write_text(FRONTEND_ROOT.joinpath("src", "styles.css").read_text(encoding="utf-8"), encoding="utf-8")

            app = create_app(
                output_root=output_root,
                fixture_file=FIXTURE_PATH,
                frontend_root=frontend_root,
            )
            with TestClient(app) as client:
                html = client.get("/").text
                main_js = client.get("/src/main.jsx").text
                app_js = client.get("/src/App.jsx").text

        self.assertIn('type="module" src="/src/main.jsx"', html)
        self.assertIn("ReactDOM.createRoot", main_js)
        self.assertIn("useWorldSession", app_js)
        self.assertIn("WorldStagePanel", app_js)

    def test_api_server_generates_fixture_preview(self) -> None:
        with TemporaryDirectory() as tmpdir:
            output_root = Path(tmpdir) / ".fablemap-api"
            app = create_app(
                output_root=output_root,
                fixture_file=FIXTURE_PATH,
                frontend_root=FRONTEND_ROOT,
            )
            with TestClient(app) as client:
                response = client.post(
                    "/api/nearby",
                    data={
                        "lat": "35.6580",
                        "lon": "139.7016",
                        "radius": "300",
                        "mode": "fixture",
                    },
                )
                result = response.json()
                preview_html = client.get(result["preview_url"].replace("http://testserver", "")).text

                generated_output_dir = Path(result["output_dir"])

                self.assertEqual(response.status_code, 200)
                self.assertEqual(result["provider"], "fixture")
                self.assertEqual(result["mode"], "fixture")
                self.assertTrue(result["run_id"].startswith("run-"))
                self.assertEqual(result["frontend_url"], "http://testserver/")
                self.assertEqual(result["world_url"], f"http://testserver/generated/{result['run_id']}/world.json")
                self.assertIn(f"/generated/{result['run_id']}/bundle/index.html", result["preview_url"])
                self.assertIn("Language / 语言", preview_html)
                self.assertEqual(result["primary_poi_id"], result["world"]["pois"][0]["id"])
                self.assertEqual(result["primary_zone_id"], result["world"]["map2d"]["encounter_zones"][0]["id"])
                self.assertEqual(generated_output_dir.parent, output_root.resolve())
                self.assertTrue((generated_output_dir / "bundle" / "index.html").exists())

    def test_api_server_persists_writeback_event(self) -> None:
        with TemporaryDirectory() as tmpdir:
            output_root = Path(tmpdir) / ".fablemap-api"
            app = create_app(
                output_root=output_root,
                fixture_file=FIXTURE_PATH,
                frontend_root=FRONTEND_ROOT,
            )
            with TestClient(app) as client:
                response = client.post(
                    "/api/world/event",
                    json={
                        "event_type": "observe",
                        "player_id": "player_local",
                        "visibility": "private",
                        "target": {
                            "target_type": "poi",
                            "target_id": "poi_clocktower_01",
                            "slice_id": "slice_demo_shibuya",
                        },
                        "payload": {
                            "intensity": 2,
                            "note": "check atmosphere",
                        },
                        "source": {
                            "client": "test",
                            "surface": "api_test",
                            "version": "v0.1",
                        },
                        "context": {
                            "current_zone_id": "zone_shibuya_core",
                            "nearest_poi_id": "poi_clocktower_01",
                        },
                    },
                )
                payload = response.json()
                state_file = Path(payload["persistence"]["state_file"])
                stored = json.loads(state_file.read_text(encoding="utf-8"))

        self.assertEqual(response.status_code, 200)
        self.assertTrue(payload["ok"])
        self.assertEqual(payload["event"]["event_type"], "observe")
        self.assertEqual(payload["player_state"]["action_state"], "observing")
        self.assertEqual(payload["player_state"]["attunement"], 2)
        self.assertEqual(payload["player_state"]["poi_familiarity"]["poi_clocktower_01"], 1)
        self.assertEqual(payload["place_state"]["familiarity"], 1)
        self.assertEqual(payload["persistence"]["stored_event_count"], 1)
        self.assertEqual(stored["events"][0]["event_type"], "observe")
        self.assertIn("poi_clocktower_01", stored["slices"]["slice_demo_shibuya"]["familiarity"])

    def test_api_server_rejects_invalid_mark_tag(self) -> None:
        with TemporaryDirectory() as tmpdir:
            output_root = Path(tmpdir) / ".fablemap-api"
            app = create_app(
                output_root=output_root,
                fixture_file=FIXTURE_PATH,
                frontend_root=FRONTEND_ROOT,
            )
            with TestClient(app) as client:
                response = client.post(
                    "/api/world/event",
                    json={
                        "event_type": "mark",
                        "player_id": "player_local",
                        "target": {
                            "target_type": "poi",
                            "target_id": "poi_clocktower_01",
                            "slice_id": "slice_demo_shibuya",
                        },
                        "payload": {
                            "tag": "forbidden_tag",
                        },
                    },
                )
                payload = response.json()

        self.assertEqual(response.status_code, 400)
        self.assertEqual(
            payload["error"],
            "mark payload.tag must be one of safe, uncanny, warm_corner, return_again, rain_friendly",
        )

    def test_api_server_orchestrate_returns_scene_capsule_payload(self) -> None:
        with TemporaryDirectory() as tmpdir:
            output_root = Path(tmpdir) / ".fablemap-api"
            app = create_app(
                output_root=output_root,
                fixture_file=FIXTURE_PATH,
                frontend_root=FRONTEND_ROOT,
            )
            with TestClient(app) as client:
                response = client.post(
                    "/api/world/orchestrate",
                    json={
                        "slice_id": "memory_night_festival",
                        "player_id": "player_local",
                        "lat": 35.6580,
                        "lon": 139.7016,
                    },
                )
                payload = response.json()

        self.assertEqual(response.status_code, 200)
        self.assertIn("observer_effect", payload)
        self.assertIn("events", payload)
        self.assertIn("broadcasts", payload)
        self.assertIn("lens_output", payload)
        self.assertIn("scene_capsule", payload)
        self.assertIsNotNone(payload["scene_capsule"])
        self.assertIn(payload["scene_capsule"]["capsule_type"], {
            "memory_reveal",
            "dwell_aura",
            "anomaly_glimpse",
            "persona_whisper",
            "legend_fragment",
            "broadcast_echo",
            "vision",
            "echo",
            "ritual",
            "whisper",
            "rift",
        })
        self.assertTrue(payload["scene_capsule"]["title"])
        self.assertTrue(payload["scene_capsule"]["narrative"])
        self.assertIn("text_blocks", payload["scene_capsule"])
        self.assertIn("visual_hints", payload["scene_capsule"])
        self.assertIn("interaction_hooks", payload["scene_capsule"])
        self.assertIn("fallback_triggered", payload)


    def test_api_server_writeback_accumulates_memory_graph_state(self) -> None:
        """AIO3: repeated writeback events accumulate real visit_count/dwell in behavior_insights"""
        with TemporaryDirectory() as tmpdir:
            output_root = Path(tmpdir) / ".fablemap-api"
            app = create_app(
                output_root=output_root,
                fixture_file=FIXTURE_PATH,
                frontend_root=FRONTEND_ROOT,
            )
            with TestClient(app) as client:
                # First observe
                r1 = client.post(
                    "/api/world/event",
                    json={
                        "event_type": "observe",
                        "player_id": "player_local",
                        "visibility": "private",
                        "target": {
                            "target_type": "poi",
                            "target_id": "poi_aio3_test",
                            "slice_id": "slice_aio3",
                        },
                        "payload": {},
                        "source": {"client": "test", "surface": "api_test", "version": "v0.1"},
                        "context": {"current_zone_id": "zone_aio3", "nearest_poi_id": "poi_aio3_test"},
                    },
                )
                # Second dwell
                r2 = client.post(
                    "/api/world/event",
                    json={
                        "event_type": "dwell",
                        "player_id": "player_local",
                        "visibility": "private",
                        "player_state": {"clarity": 10.0},
                        "target": {
                            "target_type": "poi",
                            "target_id": "poi_aio3_test",
                            "slice_id": "slice_aio3",
                        },
                        "payload": {},
                        "source": {"client": "test", "surface": "api_test", "version": "v0.1"},
                        "context": {"current_zone_id": "zone_aio3", "nearest_poi_id": "poi_aio3_test"},
                    },
                )

        p1 = r1.json()
        p2 = r2.json()
        self.assertEqual(r1.status_code, 200)
        self.assertEqual(r2.status_code, 200)

        bi1 = p1["behavior_insights"]
        bi2 = p2["behavior_insights"]

        # visit_count accumulates across events
        self.assertGreaterEqual(bi2["visit_count"], bi1["visit_count"])
        # dwell event writes total_dwell_seconds into insights
        self.assertGreater(bi2["total_dwell_seconds"], 0.0)
        # mark_count present
        self.assertIn("mark_count", bi2)
        self.assertIn("echo_count", bi2)



    def test_frontend_static_dir_prefers_dist_when_available(self) -> None:
        with TemporaryDirectory() as tmpdir:
            root = Path(tmpdir)
            frontend_root = root / "frontend"
            dist_root = frontend_root / "dist"
            dist_root.mkdir(parents=True)
            service = WebService(ApiSettings(frontend_root=frontend_root, output_root=root / "output"))

            self.assertEqual(service.frontend_static_dir(), dist_root.resolve())

    def test_frontend_static_dir_falls_back_to_frontend_root(self) -> None:
        with TemporaryDirectory() as tmpdir:
            root = Path(tmpdir)
            frontend_root = root / "frontend"
            frontend_root.mkdir(parents=True)
            service = WebService(ApiSettings(frontend_root=frontend_root, output_root=root / "output"))

            self.assertEqual(service.frontend_static_dir(), frontend_root.resolve())


class ApiServiceTests(unittest.TestCase):
    def test_build_health_payload_reports_file_availability(self) -> None:
        with TemporaryDirectory() as tmpdir:
            root = Path(tmpdir)
            fixture_file = root / "fixture.json"
            fixture_file.write_text("{}", encoding="utf-8")
            frontend_root = root / "frontend"
            frontend_root.mkdir()
            output_root = root / "output"
            output_root.mkdir()

            payload = build_health_payload(
                fixture_file=fixture_file,
                frontend_root=frontend_root,
                output_root=output_root,
            )

        self.assertEqual(
            payload,
            {
                "status": "ok",
                "fixture_available": True,
                "frontend_available": True,
                "output_root": str(output_root),
            },
        )

    def test_build_meta_payload_uses_base_url(self) -> None:
        payload = build_meta_payload(base_url="http://127.0.0.1:8950")

        self.assertEqual(payload["project"], "FableMap")
        self.assertEqual(payload["api_base"], "http://127.0.0.1:8950")
        self.assertEqual(payload["default_preview_base"], "http://127.0.0.1:8950/generated")
        self.assertEqual(payload["default_coordinates"]["radius"], 300)
        self.assertEqual(payload["endpoints"]["nearby"], "/api/nearby")
        self.assertEqual(payload["supported_modes"], ["live", "fixture"])

    def test_build_nearby_payload_adds_generated_urls(self) -> None:
        result = {
            "provider": "fixture",
            "region_name": "Test Region",
        }

        payload = build_nearby_payload(
            result=result,
            base_url="http://127.0.0.1:8950",
            mode="fixture",
            run_id="run-demo123",
        )

        self.assertEqual(payload["provider"], "fixture")
        self.assertEqual(payload["region_name"], "Test Region")
        self.assertEqual(payload["mode"], "fixture")
        self.assertEqual(payload["run_id"], "run-demo123")
        self.assertEqual(payload["preview_url"], "http://127.0.0.1:8950/generated/run-demo123/bundle/index.html")
        self.assertEqual(payload["manifest_url"], "http://127.0.0.1:8950/generated/run-demo123/bundle/manifest.json")
        self.assertEqual(payload["world_url"], "http://127.0.0.1:8950/generated/run-demo123/world.json")
        self.assertEqual(payload["frontend_url"], "http://127.0.0.1:8950/")
        self.assertEqual(result, {"provider": "fixture", "region_name": "Test Region"})


class WebPayloadTests(unittest.TestCase):
    def test_record_memory_graph_event_tracks_observe_dwell_and_mark(self) -> None:
        from fablemap.memory_graph import WorldMemoryGraph

        memory_graph = WorldMemoryGraph()
        record_memory_graph_event(
            memory_graph,
            {
                "event_type": "observe",
                "player_id": "player_test",
                "target": {"target_id": "poi_test"},
            },
        )
        record_memory_graph_event(
            memory_graph,
            {
                "event_type": "dwell",
                "player_id": "player_test",
                "player_state": {"clarity": 12.5},
                "target": {"target_id": "poi_test"},
            },
        )
        record_memory_graph_event(
            memory_graph,
            {
                "event_type": "mark",
                "player_id": "player_test",
                "emotion": "warm",
                "target": {
                    "target_id": "poi_test",
                    "content": "leave a note",
                },
            },
        )

        history = memory_graph.get_player_history("player_test", "poi_test")
        self.assertIsNotNone(history)
        self.assertEqual(history.visit_count, 3)
        self.assertEqual(history.total_dwell_time, 12.5)
        self.assertEqual(len(history.marks), 1)
        self.assertEqual(history.marks[0], "leave a note")
        self.assertEqual(history.emotions[0], "warm")

    def test_build_behavior_insights_uses_memory_graph_history(self) -> None:
        from fablemap.memory_graph import WorldMemoryGraph

        memory_graph = WorldMemoryGraph()
        event = {
            "event_type": "dwell",
            "player_id": "player_test",
            "visibility": "local_public",
            "target": {"target_id": "poi_test"},
            "player_state": {"clarity": 7.0},
        }
        record_memory_graph_event(memory_graph, event)
        payload = {
            "event": event,
            "world_feedback": {"summary": "memory deepens"},
            "place_state": {"familiarity": 2, "stored_events": 1},
            "player_state": {"clarity": 7.0},
        }

        insights = build_behavior_insights(payload=payload, memory_graph=memory_graph)

        self.assertEqual(insights["feedback_summary"], "memory deepens")
        self.assertEqual(insights["familiarity"], 2)
        self.assertGreaterEqual(insights["visit_count"], 1)
        self.assertGreater(insights["total_dwell_seconds"], 0.0)
        self.assertIn("city_persona", insights)
        self.assertIn("scene_capsule", insights)

    def test_build_orchestrate_payload_projects_contract_fields(self) -> None:
        with TemporaryDirectory() as tmpdir:
            output_root = Path(tmpdir) / ".fablemap-api"
            app = create_app(
                output_root=output_root,
                fixture_file=FIXTURE_PATH,
                frontend_root=FRONTEND_ROOT,
            )
            with TestClient(app) as client:
                response = client.post(
                    "/api/world/orchestrate",
                    json={
                        "slice_id": "memory_projection_test",
                        "player_id": "player_test",
                        "lat": 35.6580,
                        "lon": 139.7016,
                    },
                )

        self.assertEqual(response.status_code, 200)
        original_payload = response.json()

        service = WebService(ApiSettings(output_root=Path(tmpdir) / "shadow-output"))
        world_state = {
            "slice_id": "memory_projection_test",
            "observer_count": original_payload["observer_effect"]["observer_count"],
            "center_poi": "memory_projection_test",
            "pois": [{"id": "memory_projection_test", "name": "memory_projection_test"}],
        }
        player_state = {
            "player_id": "player_test",
            "lat": 35.6580,
            "lon": 139.7016,
            "visit_count": 1,
            "writeback_count": 0,
            "echo_count": 0,
            "mark_count": 0,
            "dwell_seconds": 0.0,
        }
        orchestration_result = service.orchestrator.orchestrate(world_state, player_state)

        payload = build_orchestrate_payload(
            result=orchestration_result,
            relationship_strength=0.25,
        )

        self.assertIn("observer_effect", payload)
        self.assertIn("broadcasts", payload)
        self.assertIn("events", payload)
        self.assertIn("lens_output", payload)
        self.assertIn("scene_capsule", payload)
        self.assertIn("fallback_triggered", payload)
        self.assertEqual(payload["relationship_strength"], 0.25)


class GhostTraceApiTests(unittest.TestCase):
    def setUp(self):
        with TemporaryDirectory() as tmpdir:
            self._tmpdir = tmpdir
        self._tmpdir_ctx = TemporaryDirectory()
        tmpdir = self._tmpdir_ctx.__enter__()
        output_root = Path(tmpdir) / ".fablemap-api"
        app = create_app(
            output_root=output_root,
            fixture_file=FIXTURE_PATH,
            frontend_root=FRONTEND_ROOT,
        )
        self.client = TestClient(app)
        self.client.__enter__()

    def tearDown(self):
        self.client.__exit__(None, None, None)
        self._tmpdir_ctx.__exit__(None, None, None)

    def test_post_ghost_trace_returns_trace_id(self):
        payload = {
            "player_id": "player_001",
            "waypoints": [
                {"poi_id": "poi_a", "timestamp": "2024-01-01T10:00:00", "action_state": "explore"},
                {"poi_id": "poi_b", "timestamp": "2024-01-01T10:30:00", "action_state": "mark"},
            ],
            "mood_arc": ["curious", "calm"],
            "visibility": "local_public",
        }
        resp = self.client.post("/api/ghost/trace", json=payload)
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertIn("trace_id", data)
        self.assertEqual(data["player_id"], "player_001")
        self.assertEqual(data["mood_arc"], ["curious", "calm"])
        self.assertEqual(len(data["waypoints"]), 2)

    def test_get_ghost_traces_returns_recorded_traces(self):
        # Record a trace first
        payload = {
            "player_id": "player_002",
            "waypoints": [
                {"poi_id": "poi_x", "timestamp": "2024-01-02T09:00:00", "action_state": "visit"},
            ],
            "mood_arc": ["melancholic"],
            "visibility": "local_public",
        }
        self.client.post("/api/ghost/trace", json=payload)

        resp = self.client.get("/api/ghost/traces/player_002")
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertEqual(data["player_id"], "player_002")
        self.assertEqual(len(data["traces"]), 1)
        self.assertEqual(data["traces"][0]["mood_arc"], ["melancholic"])


if __name__ == "__main__":
    unittest.main()
