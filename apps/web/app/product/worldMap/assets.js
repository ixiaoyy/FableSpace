import { getAssetBuildingSrc, getAssetDecorationSrc, getAssetIconSrc } from '../mapAssets/manifest.js'
import {
  FANTASY_TYPE_TO_BUILDING,
  FANTASY_TYPE_TO_DECORATION,
  FANTASY_TYPE_TO_ICON,
  getBuildingKey,
  getDecorationKey,
} from '../mapAssets/iconMapping.js'
import { loadImage } from '../mapAssets/loadImage.js'

async function loadAssetEntries(keys, resolveSrc) {
  return Promise.all(
    keys.map(async (key) => {
      const src = resolveSrc(key)
      const image = src ? await loadImage(src).catch(() => null) : null
      return [key, image]
    }),
  )
}

export async function preloadWorldMapAssets(vibe) {
  const iconTypes = Object.keys(FANTASY_TYPE_TO_ICON)
  const buildingTypes = Object.keys(FANTASY_TYPE_TO_BUILDING)
  const decorationTypes = Object.keys(FANTASY_TYPE_TO_DECORATION)

  const [iconEntries, buildingEntries, decorationEntries] = await Promise.all([
    loadAssetEntries(iconTypes, (fantasyType) => getAssetIconSrc(vibe, fantasyType)),
    loadAssetEntries(buildingTypes, (fantasyType) => {
      const buildingKey = getBuildingKey(fantasyType)
      return buildingKey ? getAssetBuildingSrc(vibe, buildingKey) : null
    }),
    loadAssetEntries(decorationTypes, (fantasyType) => {
      const decorationKey = getDecorationKey(fantasyType)
      return decorationKey ? getAssetDecorationSrc(vibe, decorationKey) : null
    }),
  ])

  return {
    assetIcons: new Map(iconEntries),
    assetBuildings: new Map(buildingEntries),
    assetDecorations: new Map(decorationEntries),
  }
}
