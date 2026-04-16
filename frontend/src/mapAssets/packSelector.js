export const VIBE_TO_ASSET_PACK = {
  quiet_rain: 'pack_a',
  neon_nostalgia: 'pack_a',
  iron_blue: 'pack_a',
  ghibli_town: 'pack_b',
  amber_evening: 'pack_b',
  chalk_dawn: 'pack_b',
}

export function getAssetPackKey(vibeProfile) {
  return VIBE_TO_ASSET_PACK[vibeProfile] || 'pack_b'
}
