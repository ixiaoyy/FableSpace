function toText(value) {
  return typeof value === 'string' ? value.trim() : ''
}

function toAppearanceSource(value) {
  if (!value || typeof value !== 'object') return {}
  if ('active_preset_id' in value || 'wardrobe_ids' in value || 'wardrobe' in value) {
    return value
  }
  return value.appearance && typeof value.appearance === 'object' ? value.appearance : {}
}

function normalizeIdList(value) {
  const items = Array.isArray(value) ? value : String(value || '').split(/[,，\r\n]+/)
  const seen = new Set()
  const result = []
  for (const item of items) {
    const id = toText(item)
    if (!id || seen.has(id)) continue
    seen.add(id)
    result.push(id)
  }
  return result
}

export const CHARACTER_LOOK_PRESETS = [
  {
    id: 'school-evening',
    category: '校园旧事',
    name: '暮色校服',
    summary: '藏蓝制服、纸页余光和放学后的安静感。',
    outfit: '藏蓝校服外套',
    hairstyle: '利落短发',
    effect: '纸页微光',
    accent: '#60a5fa',
    accentSoft: 'rgba(96, 165, 250, 0.22)',
    surface: 'linear-gradient(135deg, rgba(30, 41, 59, 0.96), rgba(37, 99, 235, 0.62))',
    glow: 'rgba(96, 165, 250, 0.34)',
    badge: '校',
    effectStyle: 'paper',
  },
  {
    id: 'school-ceremony',
    category: '校园旧事',
    name: '典礼披肩',
    summary: '更正式的徽章感与金线边光。',
    outfit: '礼仪披肩',
    hairstyle: '整齐侧分',
    effect: '徽章金辉',
    accent: '#fbbf24',
    accentSoft: 'rgba(251, 191, 36, 0.24)',
    surface: 'linear-gradient(135deg, rgba(51, 65, 85, 0.98), rgba(180, 83, 9, 0.68))',
    glow: 'rgba(251, 191, 36, 0.3)',
    badge: '章',
    effectStyle: 'halo',
  },
  {
    id: 'rain-clerk',
    category: '都市夜谈',
    name: '雨夜店员',
    summary: '风衣、霓虹雨幕和通宵营业的冷暖色。',
    outfit: '防水短风衣',
    hairstyle: '低束发',
    effect: '霓虹雨雾',
    accent: '#22d3ee',
    accentSoft: 'rgba(34, 211, 238, 0.22)',
    surface: 'linear-gradient(135deg, rgba(15, 23, 42, 0.98), rgba(8, 145, 178, 0.58))',
    glow: 'rgba(34, 211, 238, 0.28)',
    badge: '雨',
    effectStyle: 'mist',
  },
  {
    id: 'night-platform',
    category: '都市夜谈',
    name: '末班站台',
    summary: '深色制服与轨道光带的临界时刻感。',
    outfit: '夜班站务制服',
    hairstyle: '微卷短发',
    effect: '轨道流光',
    accent: '#a78bfa',
    accentSoft: 'rgba(167, 139, 250, 0.22)',
    surface: 'linear-gradient(135deg, rgba(30, 27, 75, 0.96), rgba(59, 130, 246, 0.56))',
    glow: 'rgba(167, 139, 250, 0.3)',
    badge: '轨',
    effectStyle: 'scan',
  },
  {
    id: 'archive-curator',
    category: '悬疑档案',
    name: '档案馆藏',
    summary: '正装马甲、冷白灯和纸张纤维质感。',
    outfit: '灰黑马甲正装',
    hairstyle: '整齐中分',
    effect: '冷灯压纹',
    accent: '#cbd5e1',
    accentSoft: 'rgba(203, 213, 225, 0.2)',
    surface: 'linear-gradient(135deg, rgba(15, 23, 42, 0.98), rgba(71, 85, 105, 0.64))',
    glow: 'rgba(203, 213, 225, 0.26)',
    badge: '档',
    effectStyle: 'grain',
  },
  {
    id: 'dusty-bookshop',
    category: '奇谈秘闻',
    name: '旧书尘影',
    summary: '旧呢外套与灯下浮尘的后室氛围。',
    outfit: '旧呢长外套',
    hairstyle: '松散短卷发',
    effect: '浮尘灯斑',
    accent: '#f59e0b',
    accentSoft: 'rgba(245, 158, 11, 0.22)',
    surface: 'linear-gradient(135deg, rgba(68, 64, 60, 0.98), rgba(120, 53, 15, 0.62))',
    glow: 'rgba(245, 158, 11, 0.28)',
    badge: '书',
    effectStyle: 'dust',
  },
  {
    id: 'tea-storyteller',
    category: '江湖人情',
    name: '茶馆长衫',
    summary: '长衫、折扇和茶烟在灯下打旋。',
    outfit: '深色长衫',
    hairstyle: '半束长发',
    effect: '茶烟回旋',
    accent: '#fb7185',
    accentSoft: 'rgba(251, 113, 133, 0.22)',
    surface: 'linear-gradient(135deg, rgba(76, 29, 149, 0.94), rgba(159, 18, 57, 0.56))',
    glow: 'rgba(251, 113, 133, 0.28)',
    badge: '扇',
    effectStyle: 'ember',
  },
  {
    id: 'greenhouse-guide',
    category: '温柔治愈',
    name: '温室园丁',
    summary: '围裙、植物气息和柔和叶影。',
    outfit: '园艺围裙',
    hairstyle: '低扎发',
    effect: '叶影浮光',
    accent: '#4ade80',
    accentSoft: 'rgba(74, 222, 128, 0.22)',
    surface: 'linear-gradient(135deg, rgba(20, 83, 45, 0.96), rgba(34, 197, 94, 0.56))',
    glow: 'rgba(74, 222, 128, 0.28)',
    badge: '叶',
    effectStyle: 'bloom',
  },
  {
    id: 'ferry-keeper',
    category: '水岸旧梦',
    name: '渡口潮声',
    summary: '防风外衣、潮湿夜色和水纹微光。',
    outfit: '旧渡口风衣',
    hairstyle: '被风吹散的短发',
    effect: '水纹夜辉',
    accent: '#38bdf8',
    accentSoft: 'rgba(56, 189, 248, 0.22)',
    surface: 'linear-gradient(135deg, rgba(12, 74, 110, 0.98), rgba(14, 116, 144, 0.58))',
    glow: 'rgba(56, 189, 248, 0.28)',
    badge: '潮',
    effectStyle: 'ripple',
  },
  {
    id: 'city-photographer',
    category: '城市观察',
    name: '街拍巡光',
    summary: '皮质短夹克、相机肩带和闪光残影。',
    outfit: '街头短夹克',
    hairstyle: '随性碎发',
    effect: '闪光残像',
    accent: '#f97316',
    accentSoft: 'rgba(249, 115, 22, 0.22)',
    surface: 'linear-gradient(135deg, rgba(67, 20, 7, 0.96), rgba(245, 158, 11, 0.58))',
    glow: 'rgba(249, 115, 22, 0.28)',
    badge: '片',
    effectStyle: 'flash',
  },
  {
    id: 'fortune-reader',
    category: '奇谈秘闻',
    name: '夜市签影',
    summary: '披肩层搭、占卜签与轻微星尘感。',
    outfit: '层叠披肩',
    hairstyle: '长卷发',
    effect: '薄雾星尘',
    accent: '#c084fc',
    accentSoft: 'rgba(192, 132, 252, 0.22)',
    surface: 'linear-gradient(135deg, rgba(59, 7, 100, 0.96), rgba(109, 40, 217, 0.56))',
    glow: 'rgba(192, 132, 252, 0.28)',
    badge: '签',
    effectStyle: 'stardust',
  },
  {
    id: 'museum-docent',
    category: '历史回响',
    name: '展厅讲解',
    summary: '博物馆正装和展柜顶灯的柔白轮廓。',
    outfit: '讲解员正装',
    hairstyle: '规整短发',
    effect: '展柜顶灯',
    accent: '#e2e8f0',
    accentSoft: 'rgba(226, 232, 240, 0.22)',
    surface: 'linear-gradient(135deg, rgba(30, 41, 59, 0.98), rgba(100, 116, 139, 0.58))',
    glow: 'rgba(226, 232, 240, 0.26)',
    badge: '馆',
    effectStyle: 'beam',
  },
  {
    id: 'neon-maintainer',
    category: '近未来',
    name: '机修霓光',
    summary: '功能工装、短发和轻微故障电弧感。',
    outfit: '机修工装',
    hairstyle: '利落碎短发',
    effect: '电弧噪点',
    accent: '#06b6d4',
    accentSoft: 'rgba(6, 182, 212, 0.22)',
    surface: 'linear-gradient(135deg, rgba(8, 47, 73, 0.98), rgba(14, 165, 233, 0.56))',
    glow: 'rgba(6, 182, 212, 0.28)',
    badge: '修',
    effectStyle: 'glitch',
  },
]

export const CHARACTER_LOOK_PRESET_MAP = Object.fromEntries(
  CHARACTER_LOOK_PRESETS.map((preset) => [preset.id, preset]),
)

export const CHARACTER_LOOK_PRESET_CATEGORIES = Array.from(
  new Set(CHARACTER_LOOK_PRESETS.map((preset) => preset.category).filter(Boolean)),
)

export function getCharacterLookPreset(presetId) {
  return CHARACTER_LOOK_PRESET_MAP[toText(presetId)] || null
}

export function normalizeCharacterAppearance(value, fallbackPresetId = '') {
  const source = toAppearanceSource(value)
  const fallback = getCharacterLookPreset(fallbackPresetId)?.id || ''
  let wardrobeIds = normalizeIdList(source.wardrobe_ids || source.wardrobe || [])
  let activePresetId = toText(source.active_preset_id || source.active || '')

  if (!activePresetId) {
    activePresetId = wardrobeIds[0] || fallback
  }

  if (activePresetId && !wardrobeIds.includes(activePresetId)) {
    wardrobeIds = [activePresetId, ...wardrobeIds]
  }

  if (!wardrobeIds.length && fallback) {
    wardrobeIds = [fallback]
  }

  const note = toText(source.note)
  return {
    active_preset_id: activePresetId,
    wardrobe_ids: wardrobeIds.slice(0, 6),
    note: note.slice(0, 200),
  }
}

export function withActiveCharacterLook(value, presetId) {
  const nextPreset = getCharacterLookPreset(presetId)?.id || ''
  const appearance = normalizeCharacterAppearance(value, nextPreset)
  if (!nextPreset) return appearance
  const nextWardrobe = [nextPreset, ...appearance.wardrobe_ids.filter((id) => id !== nextPreset)].slice(0, 6)
  return {
    ...appearance,
    active_preset_id: nextPreset,
    wardrobe_ids: nextWardrobe,
  }
}

export function removeCharacterLookFromWardrobe(value, presetId) {
  const appearance = normalizeCharacterAppearance(value)
  const nextWardrobe = appearance.wardrobe_ids.filter((id) => id !== presetId)
  const nextActive = appearance.active_preset_id === presetId ? (nextWardrobe[0] || '') : appearance.active_preset_id
  return {
    ...appearance,
    active_preset_id: nextActive,
    wardrobe_ids: nextWardrobe,
  }
}

export function getCharacterWardrobeLooks(value, fallbackPresetId = '') {
  const appearance = normalizeCharacterAppearance(value, fallbackPresetId)
  return appearance.wardrobe_ids
    .map((presetId) => getCharacterLookPreset(presetId))
    .filter(Boolean)
}

export function getActiveCharacterLook(value, overridePresetId = '') {
  const appearance = normalizeCharacterAppearance(value)
  return (
    getCharacterLookPreset(overridePresetId)
    || getCharacterLookPreset(appearance.active_preset_id)
    || getCharacterLookPreset(appearance.wardrobe_ids[0])
    || null
  )
}

export function summarizeCharacterLook(value, overridePresetId = '') {
  const look = getActiveCharacterLook(value, overridePresetId)
  if (!look) {
    return {
      title: '默认形象',
      summary: '尚未配置换装外观',
      chips: [],
      badge: '',
    }
  }
  return {
    title: look.name,
    summary: look.summary,
    chips: [look.outfit, look.hairstyle, look.effect].filter(Boolean),
    badge: look.badge || '',
  }
}
