import json
import threading
from contextlib import contextmanager
from pathlib import Path
from tempfile import TemporaryDirectory
import unittest
from urllib.parse import urlencode
from urllib.request import Request, urlopen

from fablemap.page import create_server


FIXTURE_PATH = Path(__file__).parent / "fixtures" / "overpass_sample.json"


@contextmanager
def running_page_server(output_root: Path):
    server = create_server("127.0.0.1", 0, output_root=output_root, fixture_file=FIXTURE_PATH)
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    try:
        yield f"http://127.0.0.1:{server.server_address[1]}"
    finally:
        server.shutdown()
        thread.join(timeout=5)
        server.server_close()


class PageTests(unittest.TestCase):
    def test_page_server_serves_root_page_and_health(self) -> None:
        with TemporaryDirectory() as tmpdir:
            output_root = Path(tmpdir) / ".fablemap-page"
            with running_page_server(output_root) as base_url:
                with urlopen(f"{base_url}/") as response:
                    html = response.read().decode("utf-8")
                with urlopen(f"{base_url}/api/health") as response:
                    health = json.loads(response.read().decode("utf-8"))

            self.assertIn("附近地图变异世界", html)
            self.assertIn('id="language-select"', html)
            self.assertIn("Language / 语言", html)
            self.assertIn('id="use-location"', html)
            self.assertIn('data-preset="fixture-demo"', html)
            self.assertEqual(health["status"], "ok")
            self.assertTrue(health["fixture_available"])
            self.assertEqual(health["output_root"], str(output_root.resolve()))

    def test_page_server_generates_preview_bundle_from_fixture_mode(self) -> None:
        with TemporaryDirectory() as tmpdir:
            output_root = Path(tmpdir) / ".fablemap-page"
            with running_page_server(output_root) as base_url:
                request = Request(
                    f"{base_url}/api/nearby",
                    data=urlencode(
                        {
                            "lat": "35.6580",
                            "lon": "139.7016",
                            "radius": "300",
                            "mode": "fixture",
                        }
                    ).encode("utf-8"),
                    method="POST",
                )
                with urlopen(request) as response:
                    result = json.loads(response.read().decode("utf-8"))
                with urlopen(result["preview_url"]) as response:
                    preview_html = response.read().decode("utf-8")

                self.assertEqual(result["provider"], "fixture")
                self.assertEqual(result["mode"], "fixture")
                self.assertIn("region_name", result)
                self.assertIn("region_theme", result)
                self.assertIn("dominant_faction", result)
                self.assertIn("source_radius_m", result)
                self.assertIn("source_element_count", result)
                self.assertIn("generated_at", result)
                self.assertEqual(result["source_radius_m"], 300)
                self.assertTrue(result["region_name"])
                self.assertTrue(result["region_theme"])
                self.assertTrue(result["dominant_faction"])
                self.assertTrue(result["osm_url"].startswith("https://www.openstreetmap.org/"))
                self.assertTrue(result["generated_at"].endswith("Z"))
                self.assertIn("/generated/run-", result["preview_url"])
                self.assertIn("Around Late Lantern Cafe", preview_html)
                self.assertIn('id="language-select"', preview_html)
                self.assertIn("Language / 语言", preview_html)
                self.assertIn('id="section-map-observer"', preview_html)
                self.assertIn('class="world-map-stage"', preview_html)
                self.assertIn('id="world-map-viewport"', preview_html)
                self.assertIn('id="world-map-sidebar"', preview_html)
                self.assertIn('id="observer-map"', preview_html)
                self.assertIn('id="map-detail-panel"', preview_html)
                self.assertIn('id="world-secondary-panels"', preview_html)
                self.assertIn('data-feature-id="', preview_html)
                self.assertIn('data-feature-card="', preview_html)
                self.assertIn("const defaultFeatureId = ", preview_html)
                self.assertIn("function setActiveFeature(featureId)", preview_html)
                self.assertIn('id="map-zoom-in"', preview_html)
                self.assertIn('id="map-zoom-out"', preview_html)
                self.assertIn('id="map-zoom-reset"', preview_html)
                self.assertIn('class="map-zoom-controls"', preview_html)
                self.assertIn('id="semantic-zoom-indicator"', preview_html)
                self.assertIn('id="semantic-zoom-value"', preview_html)
                self.assertIn('data-zoom-tier="survey"', preview_html)
                self.assertIn("map-tooltip", preview_html)
                self.assertIn("function zoomAroundPoint(", preview_html)
                self.assertIn("function focusToFeature(", preview_html)
                self.assertIn("function applyViewBox(", preview_html)
                self.assertIn("function updateSemanticZoomTier(", preview_html)
                self.assertIn('data-i18n="semanticZoomTitle"', preview_html)
                self.assertIn("panActive", preview_html)
                self.assertIn("is-panning", preview_html)
                self.assertIn("cursor: grab", preview_html)
                self.assertIn("map-road-arterial", preview_html)
                self.assertIn("map-road-street", preview_html)
                self.assertIn("map-road-path", preview_html)
                self.assertIn("poi-base", preview_html)
                self.assertIn("poi-icon", preview_html)
                self.assertIn("landmark-base", preview_html)
                self.assertIn("landmark-icon", preview_html)
                self.assertIn("map-ft-", preview_html)
                self.assertIn('data-i18n="mapLegendArterial"', preview_html)
                self.assertIn('data-i18n="mapLegendStreet"', preview_html)
                self.assertIn('data-i18n="mapLegendPath"', preview_html)
                self.assertIn("legend-swatch road-arterial", preview_html)
                self.assertIn("legend-swatch road-street", preview_html)
                self.assertIn("poi-status-badge", preview_html)
                self.assertIn("poi-status-idle", preview_html)
                self.assertIn("poi-status-active", preview_html)
                self.assertIn("poi-status-anomaly", preview_html)
                self.assertIn("disturbance-aura", preview_html)
                self.assertIn("npc-agent-dot", preview_html)
                self.assertIn("disturbance-panel", preview_html)
                self.assertIn("disturbance-metrics", preview_html)
                self.assertIn("metric-bar-wrap", preview_html)
                self.assertIn('data-i18n="detailDisturbanceMetrics"', preview_html)
                self.assertIn('data-i18n="detailSocialTension"', preview_html)
                self.assertIn('data-i18n="detailCommerceFlux"', preview_html)
                self.assertIn('data-i18n="detailAnomalyPressure"', preview_html)
                self.assertIn('data-i18n="detailSpawnWindow"', preview_html)
                self.assertIn("comfort-aura", preview_html)
                self.assertIn("sprite-node", preview_html)
                self.assertIn("sprite-gem", preview_html)
                self.assertIn("anchor-node", preview_html)
                self.assertIn("anchor-heart", preview_html)
                self.assertIn('data-i18n="detailComfortLevel"', preview_html)
                self.assertIn('data-i18n="detailSpriteCount"', preview_html)
                self.assertIn('data-i18n="detailAnchorCount"', preview_html)
                self.assertIn("world-broadcast-bar", preview_html)
                self.assertIn("broadcast-track", preview_html)
                self.assertIn("broadcast-item", preview_html)
                self.assertIn("broadcast-scroll", preview_html)
                self.assertIn('data-i18n="broadcastBarTitle"', preview_html)
                self.assertIn("echo-node", preview_html)
                self.assertIn("echo-text", preview_html)
                self.assertIn("capsule-mark", preview_html)
                self.assertIn("capsule-bubble", preview_html)
                self.assertIn("echo-panel", preview_html)
                self.assertIn('data-i18n="detailEchoTitle"', preview_html)
                self.assertTrue((output_root / result["run_id"] / "world.json").exists())
                self.assertTrue((output_root / result["run_id"] / "bundle" / "index.html").exists())


if __name__ == "__main__":
    unittest.main()