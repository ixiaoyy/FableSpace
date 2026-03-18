import json
from pathlib import Path
import unittest

from fablemap.world_builder import build_world


FIXTURE_PATH = Path(__file__).parent / "fixtures" / "overpass_sample.json"


class WorldBuilderTests(unittest.TestCase):
    def _fixture(self) -> dict:
        return json.loads(FIXTURE_PATH.read_text(encoding="utf-8"))

    def test_build_world_produces_schema_skeleton(self) -> None:
        world = build_world(
            lat=35.6580,
            lon=139.7016,
            radius=300,
            source_data=self._fixture(),
            provider="fixture",
        )
        self.assertIn("world_id", world)
        self.assertEqual(world["source"]["provider"], "fixture")
        self.assertIn("region", world)
        self.assertIn("state", world)
        self.assertGreaterEqual(len(world["pois"]), 4)
        self.assertTrue(any(poi["fantasy_type"] == "whispering_grove" for poi in world["pois"]))
        self.assertTrue(any(poi["fantasy_type"] == "healing_sanctum" for poi in world["pois"]))
        self.assertEqual(world["roads"][0]["kind"], "residential")

    def test_new_fantasy_types_are_generated(self) -> None:
        """扩展的 OSM 规则应正确映射到新 fantasy_type。"""
        world = build_world(
            lat=35.6580,
            lon=139.7016,
            radius=300,
            source_data=self._fixture(),
            provider="fixture",
        )
        poi_types = {poi["fantasy_type"] for poi in world["pois"]}
        # 银行 → debt_cathedral
        self.assertIn("debt_cathedral", poi_types)
        # 餐厅 → feast_hall
        self.assertIn("feast_hall", poi_types)
        # 图书馆 → memory_archive
        self.assertIn("memory_archive", poi_types)
        # 药店 → remedy_post
        self.assertIn("remedy_post", poi_types)
        # 写字楼（office 通配）→ contract_spire
        self.assertIn("contract_spire", poi_types)
        # 健身房 → labor_forge
        self.assertIn("labor_forge", poi_types)

    def test_new_types_have_required_fields(self) -> None:
        """每种新 fantasy_type 的 POI 都应包含完整必填字段。"""
        world = build_world(
            lat=35.6580,
            lon=139.7016,
            radius=300,
            source_data=self._fixture(),
            provider="fixture",
        )
        required_fields = {"id", "fantasy_name", "fantasy_type", "faction_alignment", "satire_hook", "emotion_hook"}
        new_types = {"debt_cathedral", "feast_hall", "memory_archive", "remedy_post", "contract_spire", "labor_forge"}
        for poi in world["pois"]:
            if poi.get("fantasy_type") in new_types:
                for field in required_fields:
                    self.assertIn(field, poi, f"POI {poi.get('id')} 缺少字段 {field}")

    def test_world_id_is_stable_for_same_input(self) -> None:
        fixture = self._fixture()
        first = build_world(35.6580, 139.7016, 300, source_data=fixture, provider="fixture")
        second = build_world(35.6580, 139.7016, 300, source_data=fixture, provider="fixture")
        self.assertEqual(first["world_id"], second["world_id"])
        self.assertEqual(first["seed"], second["seed"])

    def test_build_world_prefers_chinese_names_when_available(self) -> None:
        world = build_world(
            31.2304,
            121.4737,
            300,
            source_data={
                "elements": [
                    {
                        "type": "node",
                        "id": 201,
                        "lat": 31.2305,
                        "lon": 121.4738,
                        "tags": {
                            "amenity": "cafe",
                            "name": "Wander Compass",
                            "name:zh": "漫游罗盘",
                        },
                    },
                    {
                        "type": "node",
                        "id": 202,
                        "lat": 31.2306,
                        "lon": 121.4739,
                        "tags": {
                            "tourism": "attraction",
                            "name": "Clock Gate",
                            "name:zh-Hans": "钟门",
                        },
                    },
                ]
            },
            provider="fixture",
        )
        cafe = next(poi for poi in world["pois"] if poi["id"] == "node-201")
        self.assertEqual(cafe["real_name"], "漫游罗盘")
        self.assertEqual(cafe["fantasy_name"], "漫游罗盘 Parlor")
        self.assertEqual(world["region"]["name"], "Around 漫游罗盘")
        self.assertEqual(world["landmarks"][0]["name"], "钟门")

    def test_build_world_translates_plain_english_names_in_china_to_simplified_chinese(self) -> None:
        world = build_world(
            31.2304,
            121.4737,
            300,
            source_data={
                "elements": [
                    {
                        "type": "node",
                        "id": 301,
                        "lat": 31.2305,
                        "lon": 121.4738,
                        "tags": {
                            "amenity": "hospital",
                            "name": "East Hospital",
                        },
                    },
                    {
                        "type": "node",
                        "id": 302,
                        "lat": 31.2306,
                        "lon": 121.4739,
                        "tags": {
                            "tourism": "attraction",
                            "name": "South Gate",
                        },
                    },
                ]
            },
            provider="fixture",
        )
        hospital = next(poi for poi in world["pois"] if poi["id"] == "node-301")
        self.assertEqual(hospital["real_name"], "东医院")
        self.assertEqual(hospital["fantasy_name"], "东医院 Sanctum")
        self.assertEqual(world["region"]["name"], "Around 东医院")
        self.assertEqual(world["landmarks"][0]["name"], "南门")

    def test_build_world_keeps_non_china_english_names_without_translation(self) -> None:
        world = build_world(
            35.6580,
            139.7016,
            300,
            source_data={
                "elements": [
                    {
                        "type": "node",
                        "id": 401,
                        "lat": 35.6581,
                        "lon": 139.7017,
                        "tags": {
                            "amenity": "hospital",
                            "name": "East Hospital",
                        },
                    }
                ]
            },
            provider="fixture",
        )
        hospital = next(poi for poi in world["pois"] if poi["id"] == "node-401")
        self.assertEqual(hospital["real_name"], "East Hospital")
        self.assertEqual(hospital["fantasy_name"], "East Hospital Sanctum")


if __name__ == "__main__":
    unittest.main()