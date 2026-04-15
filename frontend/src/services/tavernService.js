/**
 * FableMap Tavern Service — 赛博酒馆平台前端服务
 *
 * 提供酒馆 CRUD、角色管理、聊天等 API 调用的封装。
 * 兼容 SillyTavern Character Card V2 格式导入。
 */

/**
 * 读取 API 响应
 * @param {Response} response
 * @returns {Promise<object>}
 */
async function readJson(response) {
  const raw = await response.text()
  let payload = {}

  if (raw) {
    try {
      payload = JSON.parse(raw)
    } catch {
      const snippet = raw.trim().slice(0, 80)
      if (snippet.startsWith('<')) {
        throw new Error(`API 返回了 HTML 而非 JSON。`)
      }
      throw new Error(`无效的 JSON 响应 (${response.status}): ${snippet}`)
    }
  }

  if (!response.ok) {
    throw new Error(payload.error || payload.detail || `HTTP ${response.status}`)
  }
  return payload
}

/**
 * 创建 Tavern Service 客户端
 * @param {() => string} getBaseUrl - 获取 API 基础 URL 的函数
 * @returns {object} Tavern Service API 对象
 */
export function createTavernService(getBaseUrl) {
  return {
    // ─── Tavern CRUD ───────────────────────────────────────────────

    /**
     * 获取酒馆列表
     * @param {object} options
     * @param {number} options.lat - 中心纬度
     * @param {number} options.lon - 中心经度
     * @param {number} options.radius - 搜索半径（米）
     * @param {string} options.access - 访问类型过滤：public | password | private
     * @param {string} options.owner_id - 主人 ID
     * @returns {Promise<object>}
     */
    async listTaverns(options = {}) {
      const params = new URLSearchParams()
      if (options.lat != null) params.set('lat', options.lat)
      if (options.lon != null) params.set('lon', options.lon)
      if (options.radius) params.set('radius', options.radius)
      if (options.access) params.set('access', options.access)
      if (options.owner_id) params.set('owner_id', options.owner_id)

      const response = await fetch(`${getBaseUrl()}/api/taverns?${params}`, {
        cache: 'no-store',
      })
      return readJson(response)
    },

    /**
     * 创建酒馆
     * @param {object} data
     * @param {string} data.name - 酒馆名称
     * @param {string} data.description - 酒馆描述
     * @param {number} data.lat - 纬度
     * @param {number} data.lon - 经度
     * @param {string} data.access - public | password | private
     * @param {string} data.password - 密码（access=password 时）
     * @param {object} data.llm_config - LLM 配置
     * @returns {Promise<object>}
     */
    async createTavern(data) {
      const response = await fetch(`${getBaseUrl()}/api/taverns`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      return readJson(response)
    },

    /**
     * 获取酒馆详情
     * @param {string} tavernId
     * @returns {Promise<object>}
     */
    async getTavern(tavernId) {
      const response = await fetch(`${getBaseUrl()}/api/taverns/${encodeURIComponent(tavernId)}`, {
        cache: 'no-store',
      })
      return readJson(response)
    },

    /**
     * 更新酒馆
     * @param {string} tavernId
     * @param {object} data
     * @returns {Promise<object>}
     */
    async updateTavern(tavernId, data) {
      const response = await fetch(`${getBaseUrl()}/api/taverns/${encodeURIComponent(tavernId)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      return readJson(response)
    },

    /**
     * 测试 LLM 配置是否可用
     * @param {string} tavernId
     * @param {object} config — { backend, model, api_key, base_url }
     * @returns {Promise<object>}
     */
    async testLlmConfig(tavernId, config) {
      const response = await fetch(`${getBaseUrl()}/api/taverns/${encodeURIComponent(tavernId)}/test-llm`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      })
      return readJson(response)
    },

    /**
     * 删除酒馆
     * @param {string} tavernId
     * @returns {Promise<object>}
     */
    async deleteTavern(tavernId) {
      const response = await fetch(`${getBaseUrl()}/api/taverns/${encodeURIComponent(tavernId)}`, {
        method: 'DELETE',
      })
      return readJson(response)
    },

    /**
     * 进入酒馆（密码验证）
     * @param {string} tavernId
     * @param {string} password - 密码
     * @returns {Promise<object>}
     */
    async enterTavern(tavernId, password = '') {
      const params = password ? `?password=${encodeURIComponent(password)}` : ''
      const response = await fetch(
        `${getBaseUrl()}/api/taverns/${encodeURIComponent(tavernId)}/enter${params}`,
        { method: 'POST' }
      )
      return readJson(response)
    },

    // ─── Character Management ──────────────────────────────────────

    /**
     * 获取酒馆角色列表
     * @param {string} tavernId
     * @returns {Promise<object>}
     */
    async getCharacters(tavernId) {
      const response = await fetch(
        `${getBaseUrl()}/api/taverns/${encodeURIComponent(tavernId)}/characters`,
        { cache: 'no-store' }
      )
      return readJson(response)
    },

    /**
     * 添加角色
     * @param {string} tavernId
     * @param {object} data - 角色数据
     * @returns {Promise<object>}
     */
    async addCharacter(tavernId, data) {
      const response = await fetch(
        `${getBaseUrl()}/api/taverns/${encodeURIComponent(tavernId)}/characters`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        }
      )
      return readJson(response)
    },

    /**
     * 导入 SillyTavern 角色卡
     * @param {string} tavernId
     * @param {object} cardData - SillyTavern Character Card V2 JSON
     * @returns {Promise<object>}
     */
    async importCharacterCard(tavernId, cardData) {
      const response = await fetch(
        `${getBaseUrl()}/api/taverns/${encodeURIComponent(tavernId)}/characters/import`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(cardData),
        }
      )
      return readJson(response)
    },

    /**
     * 更新角色
     * @param {string} tavernId
     * @param {string} charId
     * @param {object} data
     * @returns {Promise<object>}
     */
    async updateCharacter(tavernId, charId, data) {
      const response = await fetch(
        `${getBaseUrl()}/api/taverns/${encodeURIComponent(tavernId)}/characters/${encodeURIComponent(charId)}`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        }
      )
      return readJson(response)
    },

    /**
     * 删除角色
     * @param {string} tavernId
     * @param {string} charId
     * @returns {Promise<object>}
     */
    async deleteCharacter(tavernId, charId) {
      const response = await fetch(
        `${getBaseUrl()}/api/taverns/${encodeURIComponent(tavernId)}/characters/${encodeURIComponent(charId)}`,
        { method: 'DELETE' }
      )
      return readJson(response)
    },

    // ─── Chat ─────────────────────────────────────────────────────

    /**
     * 获取酒馆聊天记录
     * @param {string} tavernId
     * @param {string} visitorId
     * @param {string} characterId
     * @returns {Promise<object>}
     */
    async getChatHistory(tavernId, visitorId, characterId = null) {
      const params = new URLSearchParams({
        visitor_id: visitorId,
      })
      if (characterId) params.set('character_id', characterId)

      const response = await fetch(
        `${getBaseUrl()}/api/taverns/${encodeURIComponent(tavernId)}/chat?${params}`,
        { cache: 'no-store' }
      )
      return readJson(response)
    },

    /**
     * 发送聊天消息
     * @param {string} tavernId
     * @param {string} characterId
     * @param {string} message
     * @param {string} visitorId
     * @returns {Promise<object>}
     */
    async sendChat(tavernId, characterId, message, visitorId) {
      const response = await fetch(
        `${getBaseUrl()}/api/taverns/${encodeURIComponent(tavernId)}/chat`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            character_id: characterId,
            message,
            visitor_id: visitorId,
          }),
        }
      )
      return readJson(response)
    },

    // ─── Expression / Sprites ─────────────────────────────────────

    /**
     * 获取标准表情列表
     * @returns {Promise<object>}
     */
    async getExpressions() {
      const response = await fetch(`${getBaseUrl()}/api/expressions`)
      return readJson(response)
    },

    /**
     * 获取角色的所有立绘
     * @param {string} tavernId
     * @param {string} characterId
     * @returns {Promise<object>}
     */
    async getCharacterSprites(tavernId, characterId) {
      const response = await fetch(
        `${getBaseUrl()}/api/taverns/${encodeURIComponent(tavernId)}/characters/${encodeURIComponent(characterId)}/sprites`
      )
      return readJson(response)
    },

    /**
     * 更新角色的立绘配置
     * @param {string} tavernId
     * @param {string} characterId
     * @param {object} sprites - 键为表情名，值为 URL
     * @returns {Promise<object>}
     */
    async updateCharacterSprites(tavernId, characterId, sprites) {
      const response = await fetch(
        `${getBaseUrl()}/api/taverns/${encodeURIComponent(tavernId)}/characters/${encodeURIComponent(characterId)}/sprites`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sprites }),
        }
      )
      return readJson(response)
    },

    /**
     * 用 LLM 推断文本对应的表情
     * @param {string} text - 待分析文本
     * @param {string} characterName - 角色名
     * @param {string} tavernId - 酒馆 ID
     * @param {string} characterId - 角色 ID
     * @returns {Promise<object>}
     */
    async inferExpression(text, characterName = '', tavernId = '', characterId = '') {
      const response = await fetch(`${getBaseUrl()}/api/expression/infer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, character_name: characterName, tavern_id: tavernId, character_id: characterId }),
      })
      return readJson(response)
    },
  }
}

// ─────────────────────────────────────────
// SillyTavern Character Card 解析工具
// ─────────────────────────────────────────

/**
 * 解析 SillyTavern Character Card V2 JSON
 * @param {object} card - SillyTavern Character Card V2 格式
 * @returns {object} FableMap 角色数据
 */
export function parseCharacterCard(card) {
  // 支持两种格式：直接传入 data 对象，或完整的 card 对象
  const data = card.data || card

  return {
    name: data.name || '未命名角色',
    description: data.description || '',
    personality: data.personality || '',
    scenario: data.scenario || '',
    system_prompt: data.system_prompt || '',
    first_mes: data.first_mes || '',
    mes_example: data.mes_example || '',
    alternate_greetings: data.alternate_greetings || [],
    tags: data.tags || [],
    // WorldInfo (character_book)
    world_info: (data.character_book?.entries || []).map((entry) => ({
      keys: entry.keys || [],
      content: entry.content || '',
      selective: entry.selective ?? true,
      constant: entry.constant ?? false,
      depth: entry.depth ?? 4,
      order: entry.order ?? 100,
    })),
  }
}

/**
 * 从 PNG 文件提取 SillyTavern 角色卡
 * 注意：此函数需要 FileReader API，在浏览器中运行
 * @param {File} file - PNG 文件
 * @returns {Promise<object>} 角色数据
 */
export async function extractCharacterCardFromPng(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const buffer = e.target.result
        const cardData = _extractFromPngBuffer(buffer)
        if (cardData) {
          resolve(parseCharacterCard(cardData))
        } else {
          reject(new Error('PNG 中未找到角色卡数据'))
        }
      } catch (err) {
        reject(err)
      }
    }
    reader.onerror = () => reject(new Error('读取文件失败'))
    reader.readAsArrayBuffer(file)
  })
}

/**
 * 从 ArrayBuffer 提取 PNG tEXt chunk
 * @param {ArrayBuffer} buffer
 * @returns {object|null}
 */
function _extractFromPngBuffer(buffer) {
  const view = new DataView(buffer)

  // PNG 签名
  if (view.getUint32(0) !== 0x89504e47) {
    return null
  }

  let pos = 8
  while (pos < buffer.byteLength - 12) {
    const length = view.getUint32(pos)
    const typeBytes = new Uint8Array(buffer, pos + 4, 4)
    const type = String.fromCharCode(...typeBytes)

    if (type === 'tEXt') {
      const chunkData = new Uint8Array(buffer, pos + 8, length)
      const nullIndex = chunkData.indexOf(0)
      const keyword = String.fromCharCode(...chunkData.slice(0, nullIndex))

      if (keyword === 'chara' || keyword === 'ccv3') {
        const textBytes = chunkData.slice(nullIndex + 1)
        const base64 = String.fromCharCode(...textBytes)
        const jsonStr = atob(base64)
        return JSON.parse(jsonStr)
      }
    }

    if (type === 'IEND') break
    pos += 12 + length
  }

  return null
}

// ─────────────────────────────────────────
// 状态映射工具
// ─────────────────────────────────────────

/**
 * 酒馆状态颜色
 * @param {string} status
 * @returns {string}
 */
export function getTavernStatusColor(status) {
  if (status === 'open') return '#22c55e'
  if (status === 'closed') return '#ef4444'
  return '#94a3b8'
}

/**
 * 酒馆状态标签
 * @param {string} status
 * @returns {string}
 */
export function getTavernStatusLabel(status) {
  if (status === 'open') return '营业中'
  if (status === 'closed') return '歇业中'
  return '未知'
}

/**
 * 访问类型标签
 * @param {string} access
 * @returns {string}
 */
export function getTavernAccessLabel(access) {
  if (access === 'public') return '公开'
  if (access === 'password') return '密码'
  if (access === 'private') return '私人'
  return access
}

/**
 * 访问类型图标
 * @param {string} access
 * @returns {string}
 */
export function getTavernAccessIcon(access) {
  if (access === 'public') return '🔓'
  if (access === 'password') return '🔒'
  if (access === 'private') return '👤'
  return '❓'
}

/**
 * 格式化距离
 * @param {number} meters
 * @returns {string}
 */
export function formatTavernDistance(meters) {
  if (meters == null) return ''
  if (meters < 1000) return `${Math.round(meters)}m`
  return `${(meters / 1000).toFixed(1)}km`
}

// ─────────────────────────────────────────
// 默认导出工厂
// ─────────────────────────────────────────

let _defaultService = null

/**
 * 获取默认的 Tavern Service（使用环境变量中的 API 地址）
 * @returns {object}
 */
export function getDefaultTavernService() {
  if (!_defaultService) {
    _defaultService = createTavernService(() => {
      const base = import.meta.env.VITE_API_BASE?.trim()
      return base ? base.replace(/\/$/, '') : ''
    })
  }
  return _defaultService
}
