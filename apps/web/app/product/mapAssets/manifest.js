import { mediaAssetUrl } from '../../lib/media-assets'
import { getAssetIconKey } from './iconMapping.js'
import { getAssetPackKey } from './packSelector.js'

const mapAssetUrl = (pack, path) => mediaAssetUrl(`app/product/assets/map-packs/${pack}/${path}.png`)
const packAScene = mapAssetUrl('pack_a', 'scene/scene_01')
const packAQuestIcon = mapAssetUrl('pack_a', 'icons/quest')
const packAShopIcon = mapAssetUrl('pack_a', 'icons/shop')
const packABossIcon = mapAssetUrl('pack_a', 'icons/boss')
const packAHomeIcon = mapAssetUrl('pack_a', 'icons/home')
const packAEchoIcon = mapAssetUrl('pack_a', 'icons/echo')
const packAEventIcon = mapAssetUrl('pack_a', 'icons/event')
const packATileRoad01 = mapAssetUrl('pack_a', 'tiles/road_01')
const packATileRoad02 = mapAssetUrl('pack_a', 'tiles/road_02')
const packATileGround01 = mapAssetUrl('pack_a', 'tiles/ground_01')
const packATileGround02 = mapAssetUrl('pack_a', 'tiles/ground_02')
const packATileWater01 = mapAssetUrl('pack_a', 'tiles/water_01')
const packATileMagic01 = mapAssetUrl('pack_a', 'tiles/magic_01')
const packABuildingHouse01 = mapAssetUrl('pack_a', 'buildings/house_01')
const packABuildingSanctum01 = mapAssetUrl('pack_a', 'buildings/sanctum_01')
const packABuildingShop01 = mapAssetUrl('pack_a', 'buildings/shop_01')
const packABuildingTower01 = mapAssetUrl('pack_a', 'buildings/tower_01')
const packADecoTree01 = mapAssetUrl('pack_a', 'decorations/tree_01')
const packADecoLamp01 = mapAssetUrl('pack_a', 'decorations/lamp_01')

const packBScene = mapAssetUrl('pack_b', 'scene/scene_01')
const packBQuestIcon = mapAssetUrl('pack_b', 'icons/quest')
const packBShopIcon = mapAssetUrl('pack_b', 'icons/shop')
const packBBossIcon = mapAssetUrl('pack_b', 'icons/boss')
const packBHomeIcon = mapAssetUrl('pack_b', 'icons/home')
const packBEchoIcon = mapAssetUrl('pack_b', 'icons/echo')
const packBEventIcon = mapAssetUrl('pack_b', 'icons/event')
const packBTileRoad01 = mapAssetUrl('pack_b', 'tiles/road_01')
const packBTileRoad02 = mapAssetUrl('pack_b', 'tiles/road_02')
const packBTileGround01 = mapAssetUrl('pack_b', 'tiles/ground_01')
const packBTileGround02 = mapAssetUrl('pack_b', 'tiles/ground_02')
const packBTileWater01 = mapAssetUrl('pack_b', 'tiles/water_01')
const packBTileGarden01 = mapAssetUrl('pack_b', 'tiles/garden_01')
const packBBuildingHouse01 = mapAssetUrl('pack_b', 'buildings/house_01')
const packBBuildingSanctum01 = mapAssetUrl('pack_b', 'buildings/sanctum_01')
const packBBuildingShop01 = mapAssetUrl('pack_b', 'buildings/shop_01')
const packBBuildingTower01 = mapAssetUrl('pack_b', 'buildings/tower_01')
const packBDecoTree01 = mapAssetUrl('pack_b', 'decorations/tree_01')
const packBDecoLamp01 = mapAssetUrl('pack_b', 'decorations/lamp_01')

export const MAP_ASSET_PACKS = {
  pack_a: {
    scene: packAScene,
    icons: {
      quest: packAQuestIcon,
      shop: packAShopIcon,
      boss: packABossIcon,
      home: packAHomeIcon,
      echo: packAEchoIcon,
      event: packAEventIcon,
    },
    tiles: {
      road_01: packATileRoad01,
      road_02: packATileRoad02,
      ground_01: packATileGround01,
      ground_02: packATileGround02,
      water_01: packATileWater01,
      magic_01: packATileMagic01,
      garden_01: packATileGround02,
    },
    buildings: {
      house: packABuildingHouse01,
      sanctum: packABuildingSanctum01,
      shop: packABuildingShop01,
      tower: packABuildingTower01,
    },
    decorations: {
      tree: packADecoTree01,
      lamp: packADecoLamp01,
    },
  },
  pack_b: {
    scene: packBScene,
    icons: {
      quest: packBQuestIcon,
      shop: packBShopIcon,
      boss: packBBossIcon,
      home: packBHomeIcon,
      echo: packBEchoIcon,
      event: packBEventIcon,
    },
    tiles: {
      road_01: packBTileRoad01,
      road_02: packBTileRoad02,
      ground_01: packBTileGround01,
      ground_02: packBTileGround02,
      water_01: packBTileWater01,
      garden_01: packBTileGarden01,
      magic_01: packBTileGarden01,
    },
    buildings: {
      house: packBBuildingHouse01,
      sanctum: packBBuildingSanctum01,
      shop: packBBuildingShop01,
      tower: packBBuildingTower01,
    },
    decorations: {
      tree: packBDecoTree01,
      lamp: packBDecoLamp01,
    },
  },
}

export function getAssetPack(vibeProfile) {
  const packKey = getAssetPackKey(vibeProfile)
  return MAP_ASSET_PACKS[packKey] || MAP_ASSET_PACKS.pack_b
}

export function getAssetIconSrc(vibeProfile, fantasyType) {
  const pack = getAssetPack(vibeProfile)
  const iconKey = getAssetIconKey(fantasyType)
  return iconKey ? pack.icons[iconKey] || null : null
}

export function getAssetBuildingSrc(vibeProfile, buildingKey) {
  if (!buildingKey) return null
  const pack = getAssetPack(vibeProfile)
  return pack.buildings[buildingKey] || null
}

export function getAssetDecorationSrc(vibeProfile, decoKey) {
  if (!decoKey) return null
  const pack = getAssetPack(vibeProfile)
  return pack.decorations[decoKey] || null
}
