export const DEFAULT_MAP_LAYERS = {
  roads: true,
  pois: true,
  landmarks: true,
  factionZones: true,
  labels: true,
  legend: true,
  ghostTraces: true,
}

const ICON_MAP = {
  whispering_grove: '🌿',
  healing_sanctum: '✚',
  supply_outpost: '📦',
  judgement_tower: '🏛',
  ember_parlor: '☕',
  lore_academy: '📚',
  debt_cathedral: '🏦',
  feast_hall: '🍽',
  refuel_station: '⚡',
  memory_archive: '🗄',
  spirit_sanctum: '🕯',
  dormant_lot: '🅿',
  remedy_post: '💊',
  labor_forge: '💪',
  contract_spire: '🏢',
}

const FACTION_COLORS = {
  trade_guild: { fill: '#d97706', glow: '#fbbf24', zone: '#7c2d12' },
  order_bureau: { fill: '#3b82f6', glow: '#93c5fd', zone: '#172554' },
  clinic_circle: { fill: '#14b8a6', glow: '#5eead4', zone: '#134e4a' },
  memory_collective: { fill: '#8b5cf6', glow: '#c4b5fd', zone: '#3b0764' },
  night_bloom: { fill: '#10b981', glow: '#6ee7b7', zone: '#052e16' },
}

export const ROAD_STYLE = {
  iron_lane: { width: 5, alpha: 0.9, dash: [], glow: 12 },
  trade_route: { width: 4, alpha: 0.8, dash: [], glow: 10 },
  market_street: { width: 3, alpha: 0.68, dash: [], glow: 8 },
  lantern_lane: { width: 2.4, alpha: 0.55, dash: [], glow: 5 },
  threshold_path: { width: 1.5, alpha: 0.34, dash: [7, 5], glow: 0 },
  ritual_path: { width: 1.2, alpha: 0.28, dash: [3, 7], glow: 0 },
}

const VIBE_PALETTE = {
  ghibli_town: {
    bg: '#0f1b12',
    panel: 'rgba(12, 25, 18, 0.84)',
    road: '#7dd3a7',
    avenue: '#dcfce7',
    node: '#4ade80',
    glow: '#bbf7d0',
    ink: '#effef4',
    label: '#d1fae5',
    block: 'rgba(53, 84, 60, 0.34)',
    blockAlt: 'rgba(32, 52, 36, 0.3)',
    grid: 'rgba(255,255,255,0.05)',
  },
  quiet_rain: {
    bg: '#09111d',
    panel: 'rgba(9, 17, 29, 0.84)',
    road: '#60a5fa',
    avenue: '#dbeafe',
    node: '#7dd3fc',
    glow: '#bfdbfe',
    ink: '#f8fbff',
    label: '#dbeafe',
    block: 'rgba(30, 41, 59, 0.46)',
    blockAlt: 'rgba(15, 23, 42, 0.38)',
    grid: 'rgba(255,255,255,0.06)',
  },
  neon_nostalgia: {
    bg: '#14091f',
    panel: 'rgba(20, 9, 31, 0.84)',
    road: '#c084fc',
    avenue: '#f5d0fe',
    node: '#e879f9',
    glow: '#f5d0fe',
    ink: '#fdf4ff',
    label: '#f5d0fe',
    block: 'rgba(76, 29, 149, 0.32)',
    blockAlt: 'rgba(45, 11, 67, 0.34)',
    grid: 'rgba(255,255,255,0.06)',
  },
  amber_evening: {
    bg: '#1a1200',
    panel: 'rgba(26, 18, 0, 0.84)',
    road: '#f59e0b',
    avenue: '#fef3c7',
    node: '#fbbf24',
    glow: '#fde68a',
    ink: '#fffaf0',
    label: '#fef3c7',
    block: 'rgba(120, 53, 15, 0.34)',
    blockAlt: 'rgba(69, 26, 3, 0.34)',
    grid: 'rgba(255,255,255,0.05)',
  },
  iron_blue: {
    bg: '#081019',
    panel: 'rgba(8, 16, 25, 0.84)',
    road: '#94a3b8',
    avenue: '#e2e8f0',
    node: '#cbd5e1',
    glow: '#f8fafc',
    ink: '#f8fafc',
    label: '#e2e8f0',
    block: 'rgba(30, 41, 59, 0.4)',
    blockAlt: 'rgba(15, 23, 42, 0.34)',
    grid: 'rgba(255,255,255,0.05)',
  },
  chalk_dawn: {
    bg: '#151610',
    panel: 'rgba(21, 22, 16, 0.84)',
    road: '#d6d3b0',
    avenue: '#faf7d4',
    node: '#f1efc2',
    glow: '#f8f6dc',
    ink: '#fffef2',
    label: '#f8f6dc',
    block: 'rgba(64, 63, 43, 0.38)',
    blockAlt: 'rgba(38, 39, 27, 0.34)',
    grid: 'rgba(255,255,255,0.05)',
  },
}

const DEFAULT_PALETTE = {
  bg: '#0f172a',
  panel: 'rgba(15, 23, 42, 0.84)',
  road: '#64748b',
  avenue: '#e2e8f0',
  node: '#94a3b8',
  glow: '#cbd5e1',
  ink: '#f8fafc',
  label: '#e2e8f0',
  block: 'rgba(30, 41, 59, 0.42)',
  blockAlt: 'rgba(15, 23, 42, 0.36)',
  grid: 'rgba(255,255,255,0.05)',
}

export const TAG_LABELS_ZH = {
  verdant_district: '绿意城区',
  healing_quarter: '疗愈街区',
  market_quarter: '市集街区',
  bureau_district: '秩序街区',
  scholar_quarter: '学识街区',
  threshold_district: '边界地带',
  trade_guild: '贸易行会',
  order_bureau: '秩序局',
  clinic_circle: '诊疗环',
  memory_collective: '记忆共社',
  night_bloom: '夜绽社',
  ghibli_town: '绿野町',
  quiet_rain: '静雨',
  neon_nostalgia: '霓虹怀旧',
  amber_evening: '琥珀夜色',
  iron_blue: '铁蓝',
  chalk_dawn: '粉笔黎明',
  whispering_grove: '低语林苑',
  healing_sanctum: '疗愈圣所',
  supply_outpost: '补给站',
  judgement_tower: '裁定塔',
  ember_parlor: '余烬馆',
  lore_academy: '学识堂',
  debt_cathedral: '债务堂',
  feast_hall: '宴飨厅',
  refuel_station: '补能站',
  memory_archive: '记忆档案馆',
  spirit_sanctum: '灵息圣所',
  dormant_lot: '静置空场',
  remedy_post: '疗护铺',
  labor_forge: '劳作工坊',
  contract_spire: '契约尖塔',
}

export function getPalette(vibe) {
  return VIBE_PALETTE[vibe] || DEFAULT_PALETTE
}

export function getIcon(fantasyType) {
  return ICON_MAP[fantasyType] || '◆'
}

export function getFactionColors(faction) {
  return FACTION_COLORS[faction] || null
}

export function formatTag(value) {
  if (!value) return '未分类'
  return TAG_LABELS_ZH[value] || value.replace(/_/g, ' ')
}

export function formatCount(count, unit) {
  return `${count} ${unit}`
}
