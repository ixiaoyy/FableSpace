export const FARM_PROMPTS = [
  '我想种点东西，有什么种子推荐？',
  '帮我看看地里的作物需要浇水吗？',
  '可以收获了吗？',
  '查看我的菜园、仓库和交易所行情。',
  '今天邻田有什么成熟作物可以顺手摘吗？'
]

const DEFAULT_PLOTS = [
  { id: 'plot_1', status: 'empty', cropId: null, plantedAt: null, waterLevel: 0 },
  { id: 'plot_2', status: 'empty', cropId: null, plantedAt: null, waterLevel: 0 },
  { id: 'plot_3', status: 'empty', cropId: null, plantedAt: null, waterLevel: 0 },
]

export const AVAILABLE_CROPS = [
  {
    id: 'blueberry',
    name: '蓝莓',
    growthTime: 300,
    value: 10,
    seedCost: 2,
    icon: '🫐',
    marketDelta: 0.06,
    marketNote: '甜浆需求升温，适合小批量卖出。',
  },
  {
    id: 'strawberry',
    name: '草莓',
    growthTime: 600,
    value: 15,
    seedCost: 4,
    icon: '🍓',
    marketDelta: 0.08,
    marketNote: '茶点摊补货，今日收购价偏强。',
  },
  {
    id: 'watermelon',
    name: '西瓜',
    growthTime: 1200,
    value: 100,
    seedCost: 18,
    icon: '🍉',
    marketDelta: 0,
    anchored: true,
    marketNote: '交易所锚定价，作为今日作物行情基准。',
  },
]

export const FARM_DAILY_STEAL_LIMIT = 3

export const FARM_NEIGHBOR_PLOTS = [
  {
    id: 'neighbor_morning_blueberry',
    ownerName: '晨雾旅人',
    cropId: 'blueberry',
    matureCount: 2,
    note: '篱笆边有两簇成熟蓝莓，管家提醒只可轻轻摘一份。',
  },
  {
    id: 'neighbor_postbox_strawberry',
    ownerName: '邮筒小院',
    cropId: 'strawberry',
    matureCount: 1,
    note: '草莓已经变红，摘走后管家会给院主留补偿便签。',
  },
  {
    id: 'neighbor_lantern_watermelon',
    ownerName: '灯下邻田',
    cropId: 'watermelon',
    matureCount: 1,
    note: '西瓜成熟但很显眼，每天最多顺手摘一次。',
  },
  {
    id: 'neighbor_rain_blueberry',
    ownerName: '雨棚菜畦',
    cropId: 'blueberry',
    matureCount: 3,
    note: '雨棚下的蓝莓很甜，适合用来测试今日剩余次数。',
  },
]

function toFiniteNumber(value, fallback = 0) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

function toWholeCount(value) {
  const parsed = Number.parseInt(value, 10)
  if (!Number.isFinite(parsed) || parsed <= 0) return 0
  return parsed
}

function normalizeWaterLevel(value) {
  return Math.max(0, Math.min(10, toWholeCount(value)))
}

function normalizeInventory(inventory = {}) {
  if (typeof inventory !== 'object' || inventory === null) return {}
  return Object.fromEntries(
    Object.entries(inventory)
      .map(([cropId, count]) => [cropId, toWholeCount(count)])
      .filter(([, count]) => count > 0)
  )
}

export function getFarmDailyKey(date = new Date()) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function normalizeStealingState(stealing = {}) {
  const today = getFarmDailyKey()
  if (typeof stealing !== 'object' || stealing === null || stealing.dailyKey !== today) {
    return { dailyKey: today, stealsUsed: 0, records: [] }
  }

  const records = Array.isArray(stealing.records)
    ? stealing.records.filter((record) => record && typeof record.plotId === 'string')
    : []
  const stealsUsed = Math.min(FARM_DAILY_STEAL_LIMIT, Math.max(records.length, toWholeCount(stealing.stealsUsed)))

  return {
    dailyKey: today,
    stealsUsed,
    records,
  }
}

function normalizePlot(plot = {}, index = 0) {
  const status = plot?.status === 'planted' ? 'planted' : 'empty'
  const crop = status === 'planted' ? getCropDefById(plot?.cropId) : null
  const plantedAt = toFiniteNumber(plot?.plantedAt, 0)

  return {
    id: typeof plot?.id === 'string' && plot.id ? plot.id : `plot_${index + 1}`,
    status,
    cropId: crop?.id || null,
    plantedAt: status === 'planted' && plantedAt > 0 ? plantedAt : null,
    waterLevel: status === 'planted' ? normalizeWaterLevel(plot?.waterLevel) : 0,
  }
}

export function normalizeFarmProgress(progress = {}) {
  const sourcePlots = Array.isArray(progress?.plots) && progress.plots.length > 0
    ? progress.plots
    : DEFAULT_PLOTS

  return {
    plots: sourcePlots.map(normalizePlot),
    inventory: normalizeInventory(progress?.inventory),
    wallet: Math.max(0, Math.round(toFiniteNumber(progress?.wallet, 0))),
    stealing: normalizeStealingState(progress?.stealing),
    visitorStats: normalizeVisitorStats(progress?.visitorStats),
    unlockedItems: Array.isArray(progress?.unlockedItems) ? progress.unlockedItems : [],
    updatedAt: progress?.updatedAt || null,
  }
}

export function getFarmProgressStorageKey(spaceId = 'space', visitorId = 'visitor') {
  return `fablespace_farm_progress:${spaceId || 'space'}:${visitorId || 'visitor'}`
}

export function loadFarmProgress(spaceId, visitorId) {
  if (typeof window === 'undefined' || !window.localStorage) {
    return normalizeFarmProgress()
  }
  try {
    const raw = window.localStorage.getItem(getFarmProgressStorageKey(spaceId, visitorId))
    return normalizeFarmProgress(raw ? JSON.parse(raw) : {})
  } catch (err) {
    return normalizeFarmProgress()
  }
}

export function saveFarmProgress(spaceId, visitorId, progress) {
  const normalized = normalizeFarmProgress(progress)
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      window.localStorage.setItem(
        getFarmProgressStorageKey(spaceId, visitorId),
        JSON.stringify(normalized)
      )
    } catch (err) {}
  }
  return normalized
}

export function getCropDef(cropId) {
  return getCropDefById(cropId) || AVAILABLE_CROPS[0]
}

export function getInventoryCount(inventory = {}) {
  return Object.values(normalizeInventory(inventory)).reduce((sum, count) => sum + count, 0)
}

export function formatFarmCurrency(value = 0) {
  const cents = Math.max(0, Math.round(toFiniteNumber(value, 0)))
  return `${(cents / 100).toFixed(2)} 黑钻`
}

export function getCropMarketQuote(cropId) {
  const crop = getCropDef(cropId)
  const delta = crop.anchored ? 0 : toFiniteNumber(crop.marketDelta, 0)
  const price = crop.anchored
    ? crop.value
    : Math.max(1, Math.round(crop.value * (1 + delta)))
  const trend = crop.anchored ? 'flat' : delta > 0 ? 'up' : delta < 0 ? 'down' : 'flat'
  const deltaLabel = crop.anchored
    ? '锚定'
    : `${delta > 0 ? '+' : ''}${Math.round(delta * 100)}%`
  const trendLabel = trend === 'up' ? '上涨' : trend === 'down' ? '下跌' : '稳定'

  return {
    cropId: crop.id,
    crop,
    price,
    delta,
    deltaLabel,
    trend,
    trendLabel,
    note: crop.marketNote,
  }
}

export function getFarmMarketRows(progress = {}) {
  const normalized = normalizeFarmProgress(progress)
  const unlocked = Array.isArray(normalized.unlockedItems) ? normalized.unlockedItems : []
  return getAllCropDefs()
    .filter((crop) => !crop.locked || unlocked.includes('premium_seed_pack') || (normalized.inventory[crop.id] || 0) > 0)
    .map((crop) => ({
      ...getCropMarketQuote(crop.id),
      inventory: normalized.inventory[crop.id] || 0,
    }))
}

export function calculateFarmSale(progress = {}, cropId, quantity = 1) {
  const normalized = normalizeFarmProgress(progress)
  const crop = getCropDef(cropId)
  const available = normalized.inventory[crop.id] || 0
  const requested = quantity === 'all' ? available : Math.max(1, toWholeCount(quantity))
  const sellQuantity = Math.min(available, requested)
  const quote = getCropMarketQuote(crop.id)
  const revenue = sellQuantity * quote.price

  return {
    cropId: crop.id,
    crop,
    quantity: sellQuantity,
    unitPrice: quote.price,
    revenue,
    canSell: sellQuantity > 0,
  }
}

export function calculatePlanting(progress = {}, cropId) {
  const normalized = normalizeFarmProgress(progress)
  const crop = getCropDef(cropId)
  const seedCost = Math.max(0, Math.round(toFiniteNumber(crop.seedCost, 0)))
  const unlocked = Array.isArray(normalized.unlockedItems) ? normalized.unlockedItems : []
  if (crop.locked && !unlocked.includes('premium_seed_pack')) {
    return { canPlant: false, reason: 'locked_crop', crop, seedCost }
  }
  if (normalized.wallet < seedCost) {
    return { canPlant: false, reason: 'insufficient_funds', crop, seedCost }
  }
  return { canPlant: true, reason: 'ok', crop, seedCost }
}

export function getFarmStealRows(progress = {}) {
  const normalized = normalizeFarmProgress(progress)
  const stolenPlotIds = new Set(normalized.stealing.records.map((record) => record.plotId))
  const remaining = Math.max(0, FARM_DAILY_STEAL_LIMIT - normalized.stealing.stealsUsed)

  return FARM_NEIGHBOR_PLOTS.map((plot) => {
    const crop = getCropDef(plot.cropId)
    const alreadyStolen = stolenPlotIds.has(plot.id)
    const canSteal = remaining > 0 && !alreadyStolen
    return {
      ...plot,
      crop,
      alreadyStolen,
      canSteal,
      stealsRemaining: remaining,
      statusLabel: alreadyStolen ? '今日已摘' : canSteal ? '成熟可摘' : '次数已用完',
    }
  })
}

export function calculateFarmSteal(progress = {}, plotId) {
  const normalized = normalizeFarmProgress(progress)
  const row = getFarmStealRows(normalized).find((item) => item.id === plotId)
  const remaining = Math.max(0, FARM_DAILY_STEAL_LIMIT - normalized.stealing.stealsUsed)

  if (!row) {
    return { canSteal: false, reason: 'not_found', stealsRemaining: remaining }
  }
  if (row.alreadyStolen) {
    return { ...row, canSteal: false, reason: 'already_stolen', quantity: 0, stealsRemaining: remaining }
  }
  if (remaining <= 0) {
    return { ...row, canSteal: false, reason: 'daily_limit', quantity: 0, stealsRemaining: 0 }
  }

  return {
    ...row,
    canSteal: true,
    reason: 'ok',
    quantity: 1,
    stealsRemaining: remaining,
    record: {
      plotId: row.id,
      cropId: row.crop.id,
      ownerName: row.ownerName,
      quantity: 1,
      stolenAt: new Date().toISOString(),
    },
  }
}

export function buildFarmActionPrompt(action, payload = null) {
  if (action === 'plant') {
    const crop = getCropDef(payload?.cropId)
    const planting = payload?.planting
    if (planting && !planting.canPlant) {
      const reason = planting.reason === 'locked_crop'
        ? '这个种子还没有解锁'
        : `余额不足，种子需要 ${formatFarmCurrency(planting.seedCost)}`
      return `我想在菜园里种下【${crop.name}】，但${reason}。请以农场管家的身份提醒我先领取每日补给、出售库存或购买种子包。`
    }
    const costText = planting?.seedCost ? `，种子成本 ${formatFarmCurrency(planting.seedCost)}` : ''
    return `我在菜园里种下了【${crop.name}】的种子${costText}，请以农场管家的身份告诉我还需要多久成熟，以及记得浇水。`
  }
  if (action === 'water') {
    return `我给菜园里的作物浇了水。请以农场管家的身份鼓励我。`
  }
  if (action === 'harvest') {
    const crop = getCropDef(payload?.cropId)
    return `我收获了成熟的【${crop.name}】！请以农场管家的身份祝贺我，并提示我可以放进仓库或者去交易所看看行情。`
  }
  if (action === 'sell') {
    const sale = payload?.sale || calculateFarmSale({}, payload?.cropId, payload?.quantity)
    const crop = sale?.crop || getCropDef(payload?.cropId)
    if (!sale?.canSell) {
      return `我想把【${crop.name}】拿去交易所卖掉，但仓库里暂时没有库存。请以农场管家的身份提醒我先种植和收获。`
    }
    return `我把仓库里的【${crop.name}】卖给菜园交易所：数量 ${sale.quantity}，单价 ${formatFarmCurrency(sale.unitPrice)}，收益 ${formatFarmCurrency(sale.revenue)}。请以农场管家的身份播报这笔成交和下一步行情建议。`
  }
  if (action === 'steal') {
    const theft = payload?.theft || calculateFarmSteal({}, payload?.plotId)
    const crop = theft?.crop || getCropDef(theft?.cropId)
    if (!theft?.canSteal) {
      const reason = theft?.reason === 'daily_limit'
        ? '今日偷菜次数已经用完'
        : theft?.reason === 'already_stolen'
          ? '这块邻田今天已经摘过'
          : '这块邻田暂时没有成熟作物'
      return `我想去邻田顺手摘菜，但${reason}。请以农场管家的身份提醒我遵守每日限制，不要把它说成公开社交或排行榜玩法。`
    }
    return `我从【${theft.ownerName}】的邻田顺手摘到 ${theft.quantity} 个【${crop.name}】。请以农场管家的身份播报结果：我的仓库增加了这份作物；被摘的访客会收到管家通知和“明天会重新成熟”的安抚便签；同时提醒我今日还剩 ${Math.max(0, theft.stealsRemaining - 1)} 次偷菜机会。`
  }
  if (action === 'steal-status') {
    const rows = getFarmStealRows(payload?.progress || {})
    const remaining = rows[0]?.stealsRemaining ?? FARM_DAILY_STEAL_LIMIT
    const brief = rows.map((row) => `${row.ownerName}：${row.crop.name}${row.alreadyStolen ? '已摘' : '成熟'}`).join('；')
    return `查看菜园邻田偷菜机会。请以农场管家的身份简短说明：今日剩余 ${remaining} 次；${brief}。强调这是酒馆内轻量互动，不是公开社交墙。`
  }
  if (action === 'market' || action === 'status') {
    const marketBrief = getFarmMarketRows()
      .map((row) => `${row.crop.name}${row.deltaLabel}，现价${formatFarmCurrency(row.price)}`)
      .join('；')
    return `查看我的菜园、仓库和交易所行情。请以农场管家的身份简短播报：${marketBrief}。`
  }
  return `查看我的菜园、仓库和交易所行情。`
}

function isPlotMature(plot, now = Date.now()) {
  if (!plot || plot.status !== 'planted' || !plot.plantedAt) return false
  const crop = getCropDef(plot.cropId)
  return (now - plot.plantedAt) / 1000 >= crop.growthTime
}

export function updateFarmProgress(progress = {}, action, payload = {}) {
  const normalized = normalizeFarmProgress(progress)
  let plots = [...normalized.plots]
  let inventory = { ...normalized.inventory }
  let wallet = normalized.wallet
  let stealing = { ...normalized.stealing, records: [...normalized.stealing.records] }
  let visitorStats = normalizeVisitorStats(normalized.visitorStats)

  if (action === 'plant') {
    const { plotId, cropId } = payload
    const planting = calculatePlanting(normalized, cropId)
    const crop = planting.crop
    const targetPlot = plots.find(p => p.id === plotId)
    if (!planting.canPlant) {
      return {
        plots,
        inventory,
        wallet,
        stealing,
        visitorStats,
        unlockedItems: normalized.unlockedItems,
        updatedAt: new Date().toISOString()
      }
    }
    plots = plots.map(p => (
      p.id === plotId && p.status === 'empty'
        ? { ...p, status: 'planted', cropId: crop.id, plantedAt: Date.now(), waterLevel: 0 }
        : p
    ))
    if (targetPlot?.status === 'empty' && plots.some(p => p.id === plotId && p.cropId === crop.id && p.status === 'planted')) {
      wallet = Math.max(0, wallet - planting.seedCost)
    }
  } else if (action === 'water') {
    const { plotId } = payload
    plots = plots.map(p => (
      p.id === plotId && p.status === 'planted'
        ? { ...p, waterLevel: Math.min(10, p.waterLevel + 1) }
        : p
    ))
  } else if (action === 'harvest') {
    const { plotId } = payload
    const plot = plots.find(p => p.id === plotId)
    if (isPlotMature(plot)) {
      const cropId = plot.cropId
      plots = plots.map(p => p.id === plotId ? { ...p, status: 'empty', cropId: null, plantedAt: null, waterLevel: 0 } : p)
      inventory[cropId] = (inventory[cropId] || 0) + 1
      visitorStats.totalHarvests += 1
    }
  } else if (action === 'sell') {
    const sale = calculateFarmSale(normalized, payload?.cropId, payload?.quantity)
    if (sale.canSell) {
      const nextCount = (inventory[sale.cropId] || 0) - sale.quantity
      if (nextCount > 0) {
        inventory[sale.cropId] = nextCount
      } else {
        delete inventory[sale.cropId]
      }
      wallet += sale.revenue
      visitorStats.totalEarnings += sale.revenue
    }
  } else if (action === 'steal') {
    const theft = calculateFarmSteal(normalized, payload?.plotId)
    if (theft.canSteal) {
      inventory[theft.crop.id] = (inventory[theft.crop.id] || 0) + theft.quantity
      stealing = {
        dailyKey: normalized.stealing.dailyKey,
        stealsUsed: Math.min(FARM_DAILY_STEAL_LIMIT, normalized.stealing.stealsUsed + 1),
        records: [...normalized.stealing.records, theft.record],
      }
    }
  }

  return {
    plots,
    inventory,
    wallet,
    stealing,
    visitorStats,
    unlockedItems: normalized.unlockedItems,
    updatedAt: new Date().toISOString()
  }
}

// ============================================================
// Garden Space Currency Economy
// ============================================================

// --- Purchase Items ---

export const PURCHASE_ITEMS = [
  {
    id: 'speed_fertilizer',
    name: '速效肥料',
    icon: '⚡',
    price: 50,
    effect: 'growth_time_boost',
    description: '使用后目标地块作物加速 30%',
    cooldownSecs: 300,
  },
  {
    id: 'premium_seed_pack',
    name: '高级种子包',
    icon: '🌟',
    price: 200,
    effect: 'unlock_premium_seeds',
    description: '解锁南瓜和西红柿种子',
    oneTime: true,
  },
]

export const PREMIUM_CROPS = [
  {
    id: 'pumpkin',
    name: '南瓜',
    growthTime: 900,
    value: 25,
    seedCost: 8,
    icon: '🎃',
    marketDelta: 0.05,
    marketNote: '秋季作物，价格稳定。',
    locked: true,
  },
  {
    id: 'tomato',
    name: '西红柿',
    growthTime: 450,
    value: 8,
    seedCost: 3,
    icon: '🍅',
    marketDelta: 0.03,
    marketNote: '高产作物，适合批量出售。',
    locked: true,
  },
]

export const INITIAL_CURRENCY = 100
export const DAILY_LOGIN_BONUS = 10

/**
 * Returns all crop definitions merged: standard + premium.
 */
export function getAllCropDefs() {
  return [...AVAILABLE_CROPS, ...PREMIUM_CROPS]
}

/**
 * Find crop by id across standard + premium.
 */
export function getCropDefById(cropId) {
  return getAllCropDefs().find(c => c.id === cropId) || null
}

/**
 * Resolve plot crop using extended crop lookup.
 */
function resolvePlotCrop(plot = {}) {
  if (plot?.status !== 'planted' || !plot?.cropId) return null
  return getCropDefById(plot.cropId)
}

export function canAffordPurchase(wallet, itemPrice) {
  return wallet >= itemPrice
}

export function calculatePurchase(progress = {}, itemId) {
  const normalized = normalizeFarmProgress(progress)
  const wallet = normalized.wallet
  const item = PURCHASE_ITEMS.find(i => i.id === itemId)
  if (!item) return { canBuy: false, reason: 'not_found' }
  const unlocked = normalized.unlockedItems || []
  if (item.oneTime && unlocked.includes(item.id)) {
    return { canBuy: false, reason: 'already_owned' }
  }
  return {
    canBuy: canAffordPurchase(wallet, item.price),
    reason: canAffordPurchase(wallet, item.price) ? 'ok' : 'insufficient_funds',
    item,
  }
}

export function getUnlockedCrops(allCrops = getAllCropDefs()) {
  return allCrops.map(c => {
    if (!c.locked) return c
    return c
  })
}

// --- Daily Login & Visitor Stats ---

export function getDailyBonusKey(date = new Date()) {
  return getFarmDailyKey(date)
}

export function normalizeVisitorStats(stats = {}) {
  return {
    totalHarvests: Math.max(0, toWholeCount(stats.totalHarvests)),
    totalEarnings: Math.max(0, Math.round(toFiniteNumber(stats.totalEarnings, 0))),
    totalVisits: Math.max(0, toWholeCount(stats.totalVisits)),
    lastLoginBonus: typeof stats.lastLoginBonus === 'string' ? stats.lastLoginBonus : null,
  }
}

export function checkDailyLoginBonus(progress = {}) {
  const today = getDailyBonusKey()
  const stats = normalizeVisitorStats(progress.visitorStats)
  if (stats.lastLoginBonus === today) {
    return { eligible: false, reason: 'already_claimed', bonus: 0 }
  }
  return { eligible: true, reason: 'ok', bonus: DAILY_LOGIN_BONUS, date: today }
}

export function claimDailyBonus(progress = {}) {
  const check = checkDailyLoginBonus(progress)
  if (!check.eligible) return { progress, bonus: 0, claimed: false }
  const normalized = normalizeFarmProgress(progress)
  const newWallet = normalized.wallet + check.bonus
  const newStats = normalizeVisitorStats(normalized.visitorStats)
  newStats.lastLoginBonus = check.date
  newStats.totalVisits = newStats.totalVisits + 1
  return {
    progress: {
      ...normalized,
      wallet: newWallet,
      visitorStats: newStats,
      updatedAt: new Date().toISOString(),
    },
    bonus: check.bonus,
    claimed: true,
  }
}

export function getVisitorStatsFromProgress(progress = {}) {
  return normalizeVisitorStats(progress.visitorStats)
}

// --- In-space Ranking (local data only, no backend) ---

export const RANK_METRICS = [
  { key: 'totalHarvests', label: '收获王', icon: '🏆' },
  { key: 'totalEarnings', label: '收益王', icon: '💰' },
  { key: 'totalVisits', label: '常客王', icon: '⭐' },
]

/**
 * Get the current visitor's rank for a metric using only local data.
 * Returns { rank: 1, total: 1, value: 42 }.
 * Since we only have local data, this is a self-rank only.
 */
export function getVisitorRankForMetric(metric, value = 0) {
  // With only local visitor data, we can only show self-rank
  // For a richer ranking experience, a future backend would be needed
  return {
    rank: 1,
    total: 1,
    value: Math.max(0, Math.round(toFiniteNumber(value, 0))),
  }
}

/**
 * Build a prompt for NPC to announce visitor stats / rank.
 */
export function buildRankPrompt(metricKey, value, rank) {
  const metric = RANK_METRICS.find(m => m.key === metricKey)
  const label = metric?.label || metricKey
  const icon = metric?.icon || '📊'
  return `请以农场管家的身份播报：你在本酒馆的${label}中获得 ${value}。${icon} 继续鼓励访客种植和交易。`
}

// --- Extended Farm Progress ---

export function normalizeFarmProgressExtended(progress = {}) {
  const base = normalizeFarmProgress(progress)
  return {
    ...base,
    visitorStats: normalizeVisitorStats(progress.visitorStats),
    unlockedItems: Array.isArray(progress.unlockedItems) ? progress.unlockedItems : [],
  }
}

// --- Update Farm Progress Extended (handles new actions) ---

export function updateFarmProgressExtended(progress = {}, action, payload = {}) {
  let normalized = normalizeFarmProgressExtended(progress)
  let wallet = normalized.wallet
  let plots = [...normalized.plots]
  let inventory = { ...normalized.inventory }

  if (action === 'plant' || action === 'water' || action === 'harvest' || action === 'sell' || action === 'steal') {
    // Delegate to base update, then re-extract
    const baseResult = updateFarmProgress(progress, action, payload)
    normalized = normalizeFarmProgressExtended(baseResult)
    wallet = normalized.wallet
    plots = normalized.plots
    inventory = normalized.inventory
  } else if (action === 'buy') {
    const { itemId } = payload
    const purchase = calculatePurchase(normalized, itemId)
    if (purchase.canBuy) {
      wallet -= purchase.item.price
      const unlocked = [...normalized.unlockedItems]
      if (purchase.item.oneTime) {
        unlocked.push(purchase.item.id)
      }
      normalized = {
        ...normalized,
        wallet,
        unlockedItems: unlocked,
      }
    }
  } else if (action === 'claim-bonus') {
    const result = claimDailyBonus(normalized)
    normalized = normalizeFarmProgressExtended(result.progress)
    wallet = normalized.wallet
  }

  return {
    ...normalized,
    updatedAt: new Date().toISOString(),
  }
}

// --- Build Farm Action Prompt Extended ---

export function buildFarmActionPromptExtended(action, payload = null, progress = {}) {
  const normalized = normalizeFarmProgressExtended(progress)

  if (action === 'shop') {
    const shopRows = PURCHASE_ITEMS.map(item => {
      const purchase = calculatePurchase(normalized, item.id)
      return {
        ...item,
        canBuy: purchase.canBuy,
        reason: purchase.reason,
      }
    })
    const itemsBrief = shopRows.map(item =>
      `${item.icon} ${item.name} ${formatFarmCurrency(item.price)}${item.canBuy ? '' : ' (余额不足)'}`
    ).join('；')
    return `打开农场商店查看道具。请以农场管家的身份简短介绍：${itemsBrief}。`
  }

  if (action === 'buy') {
    const purchase = calculatePurchase(normalized, payload?.itemId)
    if (!purchase.canBuy) {
      const reasonText = purchase.reason === 'insufficient_funds'
        ? `你的余额 ${formatFarmCurrency(normalized.wallet)} 不够，需要 ${formatFarmCurrency(purchase.item.price)}`
        : purchase.reason === 'already_owned'
          ? `你已经拥有这个道具`
          : `找不到这个道具`
      return `我想购买道具，但${reasonText}。请以农场管家的身份提醒。`
    }
    const item = purchase.item
    const hint = item.effect === 'unlock_premium_seeds'
      ? `你现在可以在空地上种植南瓜和西红柿了！`
      : `记得在合适的时机对地块使用这个道具。`
    return `我用 ${formatFarmCurrency(item.price)} 购买了 ${item.icon} ${item.name}。请以农场管家的身份确认：${item.description}。${hint}`
  }

  if (action === 'rank') {
    const metric = payload?.metric || 'totalEarnings'
    const stats = normalized.visitorStats
    const value = stats[metric] || 0
    const rank = getVisitorRankForMetric(metric, value)
    return buildRankPrompt(metric, value, rank)
  }

  if (action === 'daily-bonus') {
    const check = checkDailyLoginBonus(normalized)
    if (!check.eligible) {
      return `我今天已经领过每日登录奖励了，明天再来吧。请以农场管家的身份温馨提醒。`
    }
    return `领取每日登录奖励！请以农场管家的身份祝贺：获得 ${formatFarmCurrency(check.bonus)} 黑钻，今日首次进入奖励。`
  }

  // Fallback to base prompt
  return buildFarmActionPrompt(action, payload)
}
