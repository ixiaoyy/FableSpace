/**
 * Emotional Location Label Utilities
 *
 * Converts real coordinates into evocative product copy
 * that makes map markers feel like discoverable places, not raw data.
 *
 * Maps lat/lon to human-readable location expressions:
 * - Street-corner doors, alley lanterns, nearby spaces
 * - District names when available from space address
 * - Neighborhood context from address parsing
 *
 * No new schema. Uses existing space.lat/lon/address fields only.
 */

const DISTRICT_KEYWORDS = [
  "宽窄巷子", "九街", "永庆坊", "春熙路", "太古里", "观音桥", "解放碑",
  "外滩", "新天地", "田子坊", "五道口", "三里屯", "南锣鼓巷", "后海",
  "中关村", "国贸", "三里屯", "望京", "CBD", "前门", "什刹海", "东四",
  "西单", "王府井", "南锣", "东交民巷", "西交民巷", "隆福寺",
  "静安寺", "徐家汇", "陆家嘴", "人民广场", "淮海路",
  "珠江新城", "天河路", "北京路", "上下九",
]

/** Street-corner / lane lantern / district patterns */
const PLACE_EXPRESSIONS = [
  // Street corner
  "街角", "路口", "拐角", "转角",
  // Alley / lane
  "巷口", "胡同深处", "弄堂里", "小巷",
  // Building features
  "灯牌下", "门廊边", "台阶旁", "窗边", "檐下",
  // Directional
  "转角处", "尽头", "深处", "入口",
]

/** Direction + time phrases for variety */
const TIME_OF_DAY_MAP = [
  { hourRange: [6, 9], phrases: ["清晨", "晨光中", "早市旁"] },
  { hourRange: [9, 12], phrases: ["正午", "阳光下", "路边"] },
  { hourRange: [12, 14], phrases: ["午后", "午间", "阳光下"] },
  { hourRange: [14, 17], phrases: ["下午", "斜阳下", "街角"] },
  { hourRange: [17, 20], phrases: ["傍晚", "夕阳", "黄昏"] },
  { hourRange: [20, 23], phrases: ["夜幕", "灯光下", "夜归"] },
  { hourRange: [23, 24], phrases: ["深夜", "午夜", "灯火"] },
  { hourRange: [0, 5], phrases: ["凌晨", "深夜", "静夜"] },
]

/** Neighborhood / district hints from address text */
export function extractNeighborhood(address = "") {
  const text = String(address || "").trim()
  if (!text) return null

  for (const keyword of DISTRICT_KEYWORDS) {
    if (text.includes(keyword)) {
      return keyword
    }
  }
  return null
}

/** Convert numeric coordinates to emotional location expression */
export function coordinateToEmotionalLabel(
  lat,
  lon,
  address = "",
  placeTypeLabel = "空间",
) {
  const latNum = Number(lat)
  const lonNum = Number(lon)

  if (!Number.isFinite(latNum) || !Number.isFinite(lonNum)) {
    return null
  }

  // Check for neighborhood/district in address
  const neighborhood = extractNeighborhood(address)

  // Pick a random place expression for variety
  const placePhrase = PLACE_EXPRESSIONS[Math.floor(Math.random() * PLACE_EXPRESSIONS.length)]

  if (neighborhood) {
    // Use district name for familiar feel
    return `${neighborhood}附近`
  }

  // Fallback: use place type + expression for emotional anchoring
  return `附近有一家${placeTypeLabel}`
}

/** Get time-of-day phrase based on current hour */
export function getTimeOfDayPhrase(hour) {
  if (hour === undefined || hour === null) return null
  const h = Number(hour)
  if (!Number.isFinite(h)) return null

  for (const { hourRange, phrases } of TIME_OF_DAY_MAP) {
    if (h >= hourRange[0] && h < hourRange[1]) {
      return phrases[Math.floor(Math.random() * phrases.length)]
    }
  }
  return null
}

/** Build full emotional location label combining district + time-of-day */
export function buildEmotionalLocationLabel(
  lat,
  lon,
  address = "",
  placeTypeLabel = "空间",
  localHour,
) {
  const neighborhood = extractNeighborhood(address)
  const timePhrase = getTimeOfDayPhrase(localHour)

  const parts = []
  if (neighborhood) {
    parts.push(neighborhood)
  }
  if (timePhrase) {
    parts.push(timePhrase)
  }

  if (parts.length === 0) {
    return `附近有一家${placeTypeLabel}`
  }

  return parts.join(" · ")
}

/**
 * Compact location label for card/marker use.
 * Shows district or falls back to place type expression.
 */
export function compactLocationLabel(
  lat,
  lon,
  address = "",
  placeTypeLabel = "空间",
) {
  const neighborhood = extractNeighborhood(address)
  return neighborhood || `附近${placeTypeLabel}`
}

/**
 * Check if a space has address that can yield emotional labels
 */
export function hasEmotionalLocationData(space) {
  return Boolean(
    extractNeighborhood(space?.address)
    || (Number.isFinite(Number(space?.lat)) && Number.isFinite(Number(space?.lon))),
  )
}