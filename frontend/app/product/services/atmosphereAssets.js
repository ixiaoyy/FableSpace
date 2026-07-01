import { DEFAULT_ATMOSPHERE_IMAGE, SPACE_ATMOSPHERE_CONFIG } from "../../lib/space-runtime-config.js"

function normalizeKey(value) {
  return String(value || '').trim().toLowerCase().replace(/-/g, '_')
}

export { DEFAULT_ATMOSPHERE_IMAGE }

export function resolveSpaceAtmosphereImage(space = {}) {
  const candidates = [
    space.fantasy_type,
    space.place?.fantasy_type,
    space.poi?.fantasy_type,
    space.place_type,
    space.type,
    space.faction_alignment,
  ]

  for (const candidate of candidates) {
    const resolved = SPACE_ATMOSPHERE_CONFIG.byType[normalizeKey(candidate)]
    if (resolved) return resolved
  }

  const layoutResolved = SPACE_ATMOSPHERE_CONFIG.byLayout[space.layout_style || '']
  return layoutResolved || SPACE_ATMOSPHERE_CONFIG.defaultImage
}

export function getKnownAtmosphereImages() {
  return Array.from(new Set([
    ...Object.values(SPACE_ATMOSPHERE_CONFIG.byType),
    ...Object.values(SPACE_ATMOSPHERE_CONFIG.byLayout),
    SPACE_ATMOSPHERE_CONFIG.defaultImage,
  ])).sort()
}
