/**
 * Territory Service — 前端领地 API 服务
 */

const TERRITORY_API_BASE = '/api/v1/territories'

function buildJsonHeaders(userId) {
  const headers = {
    'Content-Type': 'application/json',
  }
  const id = String(userId || '').trim()
  if (id) {
    headers['X-User-Id'] = id
  }
  return headers
}

/**
 * @typedef {Object} Territory
 * @property {string} id
 * @property {string} owner_id
 * @property {string} type
 * @property {number} center_lat
 * @property {number} center_lon
 * @property {number} radius
 * @property {string} status
 * @property {string|null} tavern_id
 * @property {string|null} name
 * @property {string} created_at
 * @property {string} updated_at
 * @property {number|null} distance
 */

/**
 * @typedef {Object} TerritoryCheckResult
 * @property {boolean} available
 * @property {string} message
 * @property {Array} conflicting_territories
 */

// Territory type metadata for UI
export const TERRITORY_TYPE_META = {
  tavern: { name: '酒馆', icon: '🍺', color: '#FFD700' },
  pet_shop: { name: '宠物店', icon: '🐱', color: '#FF69B4' },
  garden: { name: '菜园', icon: '🌱', color: '#32CD32' },
  game_workshop: { name: '游戏工坊', icon: '🎮', color: '#4169E1' },
  gacha: { name: '抽卡角', icon: '🎰', color: '#9932CC' },
  cultivation: { name: '修炼场', icon: '🏔️', color: '#8B4513' },
  shop: { name: '商店', icon: '🏪', color: '#FFD700' },
  warehouse: { name: '仓库', icon: '📦', color: '#808080' },
}

// Default radius by type
export const TERRITORY_DEFAULT_RADIUS = {
  tavern: 50,
  pet_shop: 50,
  garden: 100,
  game_workshop: 50,
  gacha: 50,
  cultivation: 80,
  shop: 30,
  warehouse: 20,
}

// Radius limits by type
export const TERRITORY_RADIUS_LIMITS = {
  tavern: { min: 20, max: 200 },
  pet_shop: { min: 20, max: 200 },
  garden: { min: 50, max: 500 },
  game_workshop: { min: 20, max: 200 },
  gacha: { min: 20, max: 200 },
  cultivation: { min: 30, max: 300 },
  shop: { min: 10, max: 100 },
  warehouse: { min: 10, max: 100 },
}

/**
 * Check if a location is available for territory claim
 * @param {number} lat
 * @param {number} lon
 * @param {number} radius
 * @param {string} type
 * @param {string|null} excludeTerritoryId
 * @returns {Promise<TerritoryCheckResult>}
 */
export async function checkTerritoryAvailability(lat, lon, radius, type, excludeTerritoryId = null) {
  const params = new URLSearchParams({
    lat: String(lat),
    lon: String(lon),
    radius: String(radius),
    type,
  })
  if (excludeTerritoryId) {
    params.set('exclude_territory_id', excludeTerritoryId)
  }

  const response = await fetch(`${TERRITORY_API_BASE}/check?${params}`)
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: '检查失败' }))
    throw new Error(error.error || error.message || '检查领地可用性失败')
  }
  return response.json()
}

/**
 * Claim a new territory
 * @param {Object} data
 * @param {string} data.type
 * @param {number} data.center_lat
 * @param {number} data.center_lon
 * @param {number} data.radius
 * @param {string|null} data.tavern_id
 * @param {string|null} data.name
 * @returns {Promise<Territory>}
 */
export async function claimTerritory(data, userId = '') {
  const response = await fetch(TERRITORY_API_BASE, {
    method: 'POST',
    headers: buildJsonHeaders(userId),
    body: JSON.stringify(data),
  })
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: '申领失败' }))
    throw new Error(error.error || error.message || '申领领地失败')
  }
  return response.json()
}

/**
 * Get territory details
 * @param {string} territoryId
 * @returns {Promise<Territory|null>}
 */
export async function getTerritory(territoryId) {
  const response = await fetch(`${TERRITORY_API_BASE}/${territoryId}`)
  if (response.status === 404) {
    return null
  }
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: '获取失败' }))
    throw new Error(error.error || error.message || '获取领地详情失败')
  }
  return response.json()
}

/**
 * Update territory
 * @param {string} territoryId
 * @param {Object} data - { radius?, status?, name? }
 * @returns {Promise<Territory>}
 */
export async function updateTerritory(territoryId, data, userId = '') {
  const response = await fetch(`${TERRITORY_API_BASE}/${territoryId}`, {
    method: 'PUT',
    headers: buildJsonHeaders(userId),
    body: JSON.stringify(data),
  })
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: '更新失败' }))
    throw new Error(error.error || error.message || '更新领地失败')
  }
  return response.json()
}

/**
 * Delete/abandon territory
 * @param {string} territoryId
 * @returns {Promise<{ok: boolean}>}
 */
export async function deleteTerritory(territoryId, userId = '') {
  const response = await fetch(`${TERRITORY_API_BASE}/${territoryId}`, {
    method: 'DELETE',
    headers: buildJsonHeaders(userId),
  })
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: '删除失败' }))
    throw new Error(error.error || error.message || '废弃领地失败')
  }
  return response.json()
}

/**
 * List territories with filters
 * @param {Object} filters
 * @returns {Promise<{territories: Territory[], count: number}>}
 */
export async function listTerritories(filters = {}) {
  const params = new URLSearchParams()
  if (filters.owner_id) params.set('owner_id', filters.owner_id)
  if (filters.tavern_id) params.set('tavern_id', filters.tavern_id)
  if (filters.type) params.set('type', filters.type)
  if (filters.status) params.set('status', filters.status)
  params.set('limit', String(filters.limit ?? 100))
  params.set('offset', String(filters.offset ?? 0))

  const response = await fetch(`${TERRITORY_API_BASE}?${params}`)
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: '查询失败' }))
    throw new Error(error.error || error.message || '列出领地失败')
  }
  return response.json()
}

/**
 * Query nearby territories
 * @param {number} lat
 * @param {number} lon
 * @param {number} radius - query radius in meters
 * @param {string[]|null} types - filter by territory types
 * @param {string[]|null} statuses - filter by statuses
 * @param {number} limit
 * @returns {Promise<{territories: Territory[], count: number}>}
 */
export async function queryNearbyTerritories(lat, lon, radius = 5000, types = null, statuses = null, limit = 100) {
  const params = new URLSearchParams({
    lat: String(lat),
    lon: String(lon),
    radius: String(radius),
    limit: String(limit),
  })
  if (types?.length) params.set('types', types.join(','))
  if (statuses?.length) params.set('statuses', statuses.join(','))

  const response = await fetch(`${TERRITORY_API_BASE}/nearby?${params}`)
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: '查询失败' }))
    throw new Error(error.error || error.message || '查询附近领地失败')
  }
  return response.json()
}

/**
 * Convert territory API response to MapAdapter circle format
 * @param {Territory} territory
 * @returns {Object}
 */
export function territoryToCircle(territory) {
  const meta = TERRITORY_TYPE_META[territory.type] || {}
  return {
    id: territory.id,
    center: [territory.center_lon, territory.center_lat],
    radius: territory.radius,
    type: territory.type,
    status: territory.status,
    name: territory.name || meta.name || '领地',
    color: meta.color || '#94a3b8',
  }
}

/**
 * Convert API responses to MapAdapter circles format
 * @param {Territory[]} territories
 * @returns {Object[]}
 */
export function territoriesToCircles(territories) {
  return territories.map(territoryToCircle)
}
