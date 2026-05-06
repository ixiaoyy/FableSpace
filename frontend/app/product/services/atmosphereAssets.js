import { DEFAULT_ATMOSPHERE_IMAGE, TAVERN_ATMOSPHERE_CONFIG } from "../../lib/tavern-runtime-config.js"

function normalizeKey(value) {
  return String(value || '').trim().toLowerCase().replace(/-/g, '_')
}

export { DEFAULT_ATMOSPHERE_IMAGE }

export function resolveTavernAtmosphereImage(tavern = {}) {
  const candidates = [
    tavern.fantasy_type,
    tavern.place?.fantasy_type,
    tavern.poi?.fantasy_type,
    tavern.place_type,
    tavern.type,
    tavern.faction_alignment,
  ]

  for (const candidate of candidates) {
    const resolved = TAVERN_ATMOSPHERE_CONFIG.byType[normalizeKey(candidate)]
    if (resolved) return resolved
  }

  const layoutResolved = TAVERN_ATMOSPHERE_CONFIG.byLayout[tavern.layout_style || '']
  return layoutResolved || TAVERN_ATMOSPHERE_CONFIG.defaultImage
}

export function getKnownAtmosphereImages() {
  return Array.from(new Set([
    ...Object.values(TAVERN_ATMOSPHERE_CONFIG.byType),
    ...Object.values(TAVERN_ATMOSPHERE_CONFIG.byLayout),
    TAVERN_ATMOSPHERE_CONFIG.defaultImage,
  ])).sort()
}
