import io
import json
from contextlib import redirect_stderr, redirect_stdout
from pathlib import Path
from tempfile import TemporaryDirectory
import unittest

from fablemap.bundle import main
from fablemap.world_builder import build_world, write_world


FIXTURE_PATH = Path(__file__).parent / "fixtures" / "overpass_sample.json"


class BundleTests(unittest.TestCase):
    def test_bundle_runner_writes_static_bundle(self) -> None:
        stdout = io.StringIO()
        stderr = io.StringIO()
        world = build_world(
            lat=35.6580,
            lon=139.7016,
            radius=300,
            source_data=json.loads(FIXTURE_PATH.read_text(encoding="utf-8")),
            provider="fixture",
        )

        with TemporaryDirectory() as tmpdir:
            input_path = Path(tmpdir) / "world.json"
            output_dir = Path(tmpdir) / "bundle-output"
            write_world(input_path, world)

            with redirect_stdout(stdout), redirect_stderr(stderr):
                exit_code = main(["--input", str(input_path), "--output-dir", str(output_dir)])

            self.assertEqual(exit_code, 0)
            self.assertEqual(stderr.getvalue(), "")

            bundle_world_path = output_dir / "world.json"
            summary_path = output_dir / "summary.json"
            showcase_json_path = output_dir / "showcase.json"
            showcase_md_path = output_dir / "showcase.md"
            preview_html_path = output_dir / "index.html"
            manifest_path = output_dir / "manifest.json"

            self.assertTrue(bundle_world_path.exists())
            self.assertTrue(summary_path.exists())
            self.assertTrue(showcase_json_path.exists())
            self.assertTrue(showcase_md_path.exists())
            self.assertTrue(preview_html_path.exists())
            self.assertTrue(manifest_path.exists())

            manifest_stdout = json.loads(stdout.getvalue())
            bundled_world = json.loads(bundle_world_path.read_text(encoding="utf-8"))
            summary = json.loads(summary_path.read_text(encoding="utf-8"))
            showcase = json.loads(showcase_json_path.read_text(encoding="utf-8"))
            preview_html = preview_html_path.read_text(encoding="utf-8")
            manifest = json.loads(manifest_path.read_text(encoding="utf-8"))

        self.assertEqual(manifest_stdout["world_id"], world["world_id"])
        self.assertEqual(bundled_world["world_id"], world["world_id"])
        self.assertEqual(summary["input"], "world.json")
        self.assertEqual(showcase["summary"]["input"], "world.json")
        self.assertEqual(manifest["world_id"], world["world_id"])
        self.assertEqual(manifest["files"]["world"], "world.json")
        self.assertEqual(manifest["entrypoints"]["primary_showcase"], "showcase.json")
        self.assertEqual(manifest_stdout["preview"], str(preview_html_path))
        self.assertEqual(manifest["bundle_version"], "0.3")
        self.assertEqual(manifest["files"]["preview_html"], "index.html")
        self.assertEqual(manifest["entrypoints"]["primary_preview"], "index.html")
        self.assertEqual(manifest["slots"]["world_data"]["path"], "world.json")
        self.assertEqual(manifest["slots"]["preview_html"]["format"], "html")
        self.assertEqual(manifest["slots"]["showcase_markdown"]["format"], "markdown")
        self.assertEqual(len(manifest["resources"]), 5)
        self.assertEqual(manifest["resources"][0]["slot"], "world_data")
        self.assertEqual(manifest["resources"][2]["role"], "showcase_payload")
        self.assertEqual(manifest["resources"][4]["role"], "interactive_preview")
        self.assertEqual(showcase["reality_skeleton"]["provider"], world["source"]["provider"])
        self.assertEqual(showcase["world_state"]["dominant_faction"], world["region"]["dominant_faction"])
        self.assertEqual(showcase["co_creation_storyline"]["city_myth_stage"], world["co_creation"]["city_myth_stage"])
        self.assertEqual(manifest["signals"]["city_myth_stage"], world["co_creation"]["city_myth_stage"])
        self.assertGreater(len(showcase["playable_hooks"]), 0)
        self.assertIn("<title>", preview_html)
        self.assertIn(world["region"]["name"], preview_html)
        self.assertIn("showcase.json", preview_html)
        self.assertIn('id="language-select"', preview_html)
        self.assertIn('value="zh-CN">中文</option>', preview_html)
        self.assertIn('value="en">English</option>', preview_html)
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
        self.assertIn('id="section-reality"', preview_html)
        self.assertIn('data-i18n="sectionReality"', preview_html)
        self.assertIn('id="section-world-state"', preview_html)
        self.assertIn('data-i18n="sectionWorldState"', preview_html)
        self.assertIn('id="section-continuity"', preview_html)
        self.assertIn('id="section-playable-hooks"', preview_html)
        self.assertIn('id="section-co-creation"', preview_html)
        self.assertIn('data-i18n="sectionCoCreation"', preview_html)
        self.assertIn('data-i18n="coCreationStage"', preview_html)
        self.assertIn('data-i18n="coCreationMode"', preview_html)
        self.assertIn('data-i18n="coCreationThread"', preview_html)
        self.assertIn('data-i18n="sectionPlayableHooks"', preview_html)
        self.assertIn("fablemap-language", preview_html)
        self.assertIn('id="map-zoom-in"', preview_html)
        self.assertIn('id="map-zoom-out"', preview_html)
        self.assertIn('id="map-zoom-reset"', preview_html)
        self.assertIn("class=\"map-zoom-controls\"", preview_html)
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
        self.assertIn("home-anchor", preview_html)
        self.assertIn("home-icon", preview_html)
        self.assertIn("home-panel", preview_html)
        self.assertIn('data-i18n="homePanelTitle"', preview_html)
        self.assertIn('data-i18n="homeStyle"', preview_html)
        self.assertIn('data-i18n="homeInventory"', preview_html)
        self.assertIn('data-i18n="homeReputation"', preview_html)


if __name__ == "__main__":
    unittest.main()
