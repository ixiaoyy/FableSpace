export const HOBBY_CATEGORIES = {
  ARTS: { label: '文艺', color: 'purple', id: 'arts', icon: '🎨' },
  TECH: { label: '科技', color: 'cyan', id: 'tech', icon: '💻' },
  NATURE: { label: '自然', color: 'green', id: 'nature', icon: '🌿' },
  ADVENTURE: { label: '探索', color: 'orange', id: 'adventure', icon: '🧭' },
  SOCIAL: { label: '社交', color: 'pink', id: 'social', icon: '💬' },
}

export const CURATED_HOBBIES_BY_CATEGORY = {
  [HOBBY_CATEGORIES.ARTS.id]: [
    '黑胶收藏 (Vinyl)',
    '地方志 (Folklore)',
    '古语言研究',
    '城市考古',
    '合成器流行乐',
    '微缩模型制作',
    '诗歌创作',
  ],
  [HOBBY_CATEGORIES.TECH.id]: [
    '复古游戏 (Retro)',
    '义体改装',
    '机械键盘',
    '老式相机修复',
    '信号拾取/监听',
    '模拟电路',
  ],
  [HOBBY_CATEGORIES.NATURE.id]: [
    '园艺/盆栽',
    '观星 (Stargazing)',
    '咖啡烘焙',
    '茶道 (Tea)',
    '城市草药学',
    '天气监测',
  ],
  [HOBBY_CATEGORIES.ADVENTURE.id]: [
    '废墟探险 (Urbex)',
    '未确认生物研究',
    '街头摄影',
    '锁匠/开锁',
    '废土美学',
    '隐秘坐标追踪',
  ],
  [HOBBY_CATEGORIES.SOCIAL.id]: [
    '调酒 (Mixology)',
    '厨艺 (Gourmet)',
    '桌游 (Board Games)',
    '占星 (Astrology)',
    '塔罗 (Tarot)',
    '传闻收集',
  ],
}

export const CURATED_HOBBIES = Object.values(CURATED_HOBBIES_BY_CATEGORY).flat()

export function getHobbyCategory(hobby = '') {
  for (const [catId, hobbies] of Object.entries(CURATED_HOBBIES_BY_CATEGORY)) {
    if (hobbies.includes(hobby)) return HOBBY_CATEGORIES[catId.toUpperCase()]
  }
  return HOBBY_CATEGORIES.SOCIAL // Default
}

export function getHobbyIcon(hobby = '') {
  const map = {
    '黑胶收藏 (Vinyl)': '📻',
    '地方志 (Folklore)': '📜',
    '古语言研究': '🔤',
    '城市考古': '🏛️',
    '合成器流行乐': '🎹',
    '微缩模型制作': '🏰',
    '诗歌创作': '🖋️',
    '复古游戏 (Retro)': '🎮',
    '义体改装': '🤖',
    '机械键盘': '⌨️',
    '老式相机修复': '📸',
    '信号拾取/监听': '📡',
    '模拟电路': '🔌',
    '园艺/盆栽': '🌿',
    '观星 (Stargazing)': '🔭',
    '咖啡烘焙': '☕',
    '茶道 (Tea)': '🍵',
    '城市草药学': '🌱',
    '天气监测': '☁️',
    '废墟探险 (Urbex)': '🧭',
    '未确认生物研究': '🐉',
    '街头摄影': '📷',
    '锁匠/开锁': '🔐',
    '废土美学': '🧥',
    '隐秘坐标追踪': '📍',
    '调酒 (Mixology)': '🍸',
    '厨艺 (Gourmet)': '🍳',
    '桌游 (Board Games)': '🎲',
    '占星 (Astrology)': '✨',
    '塔罗 (Tarot)': '🔮',
    '传闻收集': '👂',
  }
  return map[hobby] || '✨'
}

export function detectHobbiesInText(text = '', characterHobbies = []) {
  if (!text || !characterHobbies.length) return []
  return characterHobbies.filter(hobby => {
    // 简单包含匹配，后续可增强为分词匹配
    const stem = hobby.split(' ')[0].split('(')[0].trim()
    return text.includes(hobby) || (stem.length > 1 && text.includes(stem))
  })
}
