/**
 * FableMap Tavern Service — 兼容层 (Legacy)
 *
 * 本文件已废弃，仅用于向后兼容。请使用 app/lib/taverns.ts (原生 /api/v1/*)
 * 或 app/features/tavern-chat/ (功能组件)。
 *
 * 迁移指南:
 * - getDefaultTavernService() → 改用 lib/taverns.ts 函数
 * - TavernChatRoom.jsx → app/features/tavern-chat/index.tsx
 * - tavernService.listTaverns() → listTaverns() from lib/taverns.ts
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
    const err = new Error(payload.error || payload.detail || `HTTP ${response.status}`)
    err.errorType = response.status
    throw err
  }
  return payload
}

function buildHeaders(userId = '', extra = {}) {
  const headers = { ...extra }
  const cleanUserId = String(userId || '').trim()
  if (cleanUserId) {
    headers['X-User-Id'] = cleanUserId
  }
  return headers
}

function buildJsonHeaders(userId = '') {
  return buildHeaders(userId, { 'Content-Type': 'application/json' })
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
     * @param {string} options.status - 营业状态过滤：open | closed
     * @param {string} options.query - 搜索词
     * @param {string} options.owner_id - 主人 ID
     * @returns {Promise<object>}
     */
    async listTaverns(options = {}) {
      const params = new URLSearchParams()
      if (options.lat != null) params.set('lat', options.lat)
      if (options.lon != null) params.set('lon', options.lon)
      if (options.radius) params.set('radius', options.radius)
      if (options.access) params.set('access', options.access)
      if (options.status) params.set('status', options.status)
      if (options.query) params.set('q', options.query)
      if (options.owner_id) params.set('owner_id', options.owner_id)

      const response = await fetch(`${getBaseUrl()}/api/v1/taverns?${params}`, {
        cache: 'no-store',
      })
      return readJson(response)
    },

    /**
     * 创建酒馆
     * @param {object} data
     * @param {string} userId - 店主/操作者 ID
     * @param {string} data.name - 酒馆名称
     * @param {string} data.description - 酒馆描述
     * @param {number} data.lat - 纬度
     * @param {number} data.lon - 经度
     * @param {string} data.access - public | password | private
     * @param {string} data.password - 密码（access=password 时）
     * @param {object} data.llm_config - LLM 配置
     * @returns {Promise<object>}
     */
    async createTavern(data, userId = '') {
      const response = await fetch(`${getBaseUrl()}/api/v1/taverns`, {
        method: 'POST',
        headers: buildJsonHeaders(userId),
        body: JSON.stringify(data),
      })
      return readJson(response)
    },

    /**
     * 获取酒馆详情
     * @param {string} tavernId
     * @param {string} userId
     * @returns {Promise<object>}
     */
    async getTavern(tavernId, userId = '') {
      const response = await fetch(`${getBaseUrl()}/api/v1/taverns/${encodeURIComponent(tavernId)}`, {
        cache: 'no-store',
        headers: buildHeaders(userId),
      })
      return readJson(response)
    },

    /**
     * 更新酒馆
     * @param {string} tavernId
     * @param {object} data
     * @param {string} userId
     * @returns {Promise<object>}
     */
    async updateTavern(tavernId, data, userId = '') {
      const response = await fetch(`${getBaseUrl()}/api/v1/taverns/${encodeURIComponent(tavernId)}`, {
        method: 'PUT',
        headers: buildJsonHeaders(userId),
        body: JSON.stringify(data),
      })
      return readJson(response)
    },

    /**
     * 保存酒馆世界书
     * @param {string} tavernId
     * @param {Array<object>} worldInfo
     * @param {string} userId
     * @returns {Promise<object>} 更新后的酒馆
     */
    async saveWorldInfo(tavernId, worldInfo, userId = '') {
      const response = await fetch(`${getBaseUrl()}/api/v1/taverns/${encodeURIComponent(tavernId)}`, {
        method: 'PUT',
        headers: buildJsonHeaders(userId),
        body: JSON.stringify({ world_info: worldInfo }),
      })
      return readJson(response)
    },

    /**
     * 测试一句话会命中哪些世界书条目（不调用 AI，不保存）
     * @param {string} tavernId
     * @param {object} data — { message, world_info?, recent_messages?, include_tavern_context? }
     * @param {string} userId
     * @returns {Promise<object>}
     */
    async testWorldInfo(tavernId, data, userId = '') {
      const response = await fetch(`${getBaseUrl()}/api/v1/taverns/${encodeURIComponent(tavernId)}/world-info/test`, {
        method: 'POST',
        headers: buildJsonHeaders(userId),
        body: JSON.stringify(data),
      })
      return readJson(response)
    },

    /**
     * 获取酒馆输出修正规则
     * @param {string} tavernId
     * @param {string} userId
     * @returns {Promise<object>} { rules, default_rules }
     */
    async getOutputRules(tavernId, userId = '') {
      const response = await fetch(`${getBaseUrl()}/api/v1/taverns/${encodeURIComponent(tavernId)}/output-rules`, {
        cache: 'no-store',
        headers: buildHeaders(userId),
      })
      return readJson(response)
    },

    /**
     * 保存酒馆输出修正规则
     * @param {string} tavernId
     * @param {Array<object>} rules
     * @param {string} userId
     * @returns {Promise<object>} 更新后的规则和酒馆
     */
    async saveOutputRules(tavernId, rules, userId = '') {
      const response = await fetch(`${getBaseUrl()}/api/v1/taverns/${encodeURIComponent(tavernId)}/output-rules`, {
        method: 'PUT',
        headers: buildJsonHeaders(userId),
        body: JSON.stringify({ rules }),
      })
      return readJson(response)
    },

    /**
     * 预览输出修正规则效果（不保存）
     * @param {string} tavernId
     * @param {object} data — { text, rules? }
     * @param {string} userId
     * @returns {Promise<object>} { text, original_text, applied, errors }
     */
    async testOutputRules(tavernId, data, userId = '') {
      const response = await fetch(`${getBaseUrl()}/api/v1/taverns/${encodeURIComponent(tavernId)}/output-rules/test`, {
        method: 'POST',
        headers: buildJsonHeaders(userId),
        body: JSON.stringify(data),
      })
      return readJson(response)
    },

    /**
     * 获取酒馆 Prompt 段落
     * @param {string} tavernId
     * @param {string} userId
     * @returns {Promise<object>} { blocks, default_blocks }
     */
    async getPromptBlocks(tavernId, userId = '') {
      const response = await fetch(`${getBaseUrl()}/api/v1/taverns/${encodeURIComponent(tavernId)}/prompt-blocks`, {
        cache: 'no-store',
        headers: buildHeaders(userId),
      })
      return readJson(response)
    },

    /**
     * 保存酒馆 Prompt 段落
     * @param {string} tavernId
     * @param {Array<object>} blocks
     * @param {string} userId
     * @returns {Promise<object>}
     */
    async savePromptBlocks(tavernId, blocks, userId = '') {
      const response = await fetch(`${getBaseUrl()}/api/v1/taverns/${encodeURIComponent(tavernId)}/prompt-blocks`, {
        method: 'PUT',
        headers: buildJsonHeaders(userId),
        body: JSON.stringify({ blocks }),
      })
      return readJson(response)
    },

    /**
     * 预览 Prompt 段落组装结果（不调用 AI）
     * @param {string} tavernId
     * @param {object} data — { message, blocks?, character_id? }
     * @param {string} userId
     * @returns {Promise<object>}
     */
    async previewPromptBlocks(tavernId, data, userId = '') {
      const response = await fetch(`${getBaseUrl()}/api/v1/taverns/${encodeURIComponent(tavernId)}/prompt-blocks/preview`, {
        method: 'POST',
        headers: buildJsonHeaders(userId),
        body: JSON.stringify(data),
      })
      return readJson(response)
    },

    /**
     * 获取当前用户可见的酒馆玩法定义。
     * @param {string} tavernId
     * @param {string} userId
     * @returns {Promise<object>} { tavern_id, gameplays }
     */
    async getGameplays(tavernId, userId = '') {
      const response = await fetch(`${getBaseUrl()}/api/v1/taverns/${encodeURIComponent(tavernId)}/gameplays`, {
        cache: 'no-store',
        headers: buildHeaders(userId),
      })
      return readJson(response)
    },

    /**
     * 保存店主维护的玩法定义列表。
     * @param {string} tavernId
     * @param {Array<object>} gameplays
     * @param {string} userId
     * @returns {Promise<object>} { ok, tavern_id, gameplays }
     */
    async saveGameplays(tavernId, gameplays, userId = '') {
      const response = await fetch(`${getBaseUrl()}/api/v1/taverns/${encodeURIComponent(tavernId)}/gameplays`, {
        method: 'PUT',
        headers: buildJsonHeaders(userId),
        body: JSON.stringify({ gameplays: Array.isArray(gameplays) ? gameplays : [] }),
      })
      return readJson(response)
    },

    /**
     * 开始或恢复一局玩法。
     * @param {string} tavernId
     * @param {object} data — { gameplayId|gameplay_id, characterId|character_id }
     * @param {string} userId
     * @returns {Promise<object>} { ok, resumed, session, scene }
     */
    async startGameplaySession(tavernId, data = {}, userId = '') {
      const response = await fetch(`${getBaseUrl()}/api/v1/taverns/${encodeURIComponent(tavernId)}/gameplay-sessions`, {
        method: 'POST',
        headers: buildJsonHeaders(userId),
        body: JSON.stringify({
          gameplay_id: data.gameplay_id || data.gameplayId || '',
          character_id: data.character_id || data.characterId || '',
        }),
      })
      return readJson(response)
    },

    /**
     * 推进一局玩法，可传选项或自由文本。
     * @param {string} tavernId
     * @param {string} sessionId
     * @param {object} data — { choiceId|choice_id, message }
     * @param {string} userId
     * @returns {Promise<object>} { ok, source, event, session, scene }
     */
    async advanceGameplaySession(tavernId, sessionId, data = {}, userId = '') {
      const response = await fetch(`${getBaseUrl()}/api/v1/taverns/${encodeURIComponent(tavernId)}/gameplay-sessions/${encodeURIComponent(sessionId)}/advance`, {
        method: 'POST',
        headers: buildJsonHeaders(userId),
        body: JSON.stringify({
          choice_id: data.choice_id || data.choiceId || '',
          message: data.message || '',
        }),
      })
      return readJson(response)
    },

    /**
     * 列出玩法会话，访客默认只看到自己，店主可按 visitorId 过滤。
     * @param {string} tavernId
     * @param {object} options — { state, visitorId|visitor_id }
     * @param {string} userId
     * @returns {Promise<object>} { tavern_id, sessions }
     */
    async listGameplaySessions(tavernId, options = {}, userId = '') {
      const params = new URLSearchParams()
      if (options.state) params.set('state', options.state)
      if (options.visitor_id || options.visitorId) {
        params.set('visitor_id', options.visitor_id || options.visitorId)
      }
      const query = params.toString()
      const response = await fetch(
        `${getBaseUrl()}/api/v1/taverns/${encodeURIComponent(tavernId)}/gameplay-sessions${query ? `?${query}` : ''}`,
        { cache: 'no-store', headers: buildHeaders(userId) },
      )
      return readJson(response)
    },

    /**
     * 放弃一局玩法。
     * @param {string} tavernId
     * @param {string} sessionId
     * @param {string} userId
     * @returns {Promise<object>} { ok, session }
     */
    async abandonGameplaySession(tavernId, sessionId, userId = '') {
      const response = await fetch(`${getBaseUrl()}/api/v1/taverns/${encodeURIComponent(tavernId)}/gameplay-sessions/${encodeURIComponent(sessionId)}/abandon`, {
        method: 'POST',
        headers: buildJsonHeaders(userId),
        body: JSON.stringify({}),
      })
      return readJson(response)
    },

    /**
     * 获取酒馆运行预设（内置 + 店主自定义）
     * @param {string} tavernId
     * @param {string} userId
     * @returns {Promise<object>} { presets, custom_presets, default_presets, active_preset_id }
     */
    async getRuntimePresets(tavernId, userId = '') {
      const response = await fetch(`${getBaseUrl()}/api/v1/taverns/${encodeURIComponent(tavernId)}/runtime-presets`, {
        cache: 'no-store',
        headers: buildHeaders(userId),
      })
      return readJson(response)
    },

    /**
     * 保存店主自定义运行预设
     * @param {string} tavernId
     * @param {Array<object>} presets
     * @param {string} userId
     * @returns {Promise<object>}
     */
    async saveRuntimePresets(tavernId, presets, userId = '') {
      const response = await fetch(`${getBaseUrl()}/api/v1/taverns/${encodeURIComponent(tavernId)}/runtime-presets`, {
        method: 'PUT',
        headers: buildJsonHeaders(userId),
        body: JSON.stringify({ presets }),
      })
      return readJson(response)
    },

    /**
     * 应用运行预设到 AI 参数、Prompt 段落、记忆策略和输出护栏
     * @param {string} tavernId
     * @param {object} data — { preset_id } 或 { preset }
     * @param {string} userId
     * @returns {Promise<object>}
     */
    async applyRuntimePreset(tavernId, data, userId = '') {
      const response = await fetch(`${getBaseUrl()}/api/v1/taverns/${encodeURIComponent(tavernId)}/runtime-presets/apply`, {
        method: 'POST',
        headers: buildJsonHeaders(userId),
        body: JSON.stringify(data),
      })
      return readJson(response)
    },

    /**
     * 导出可分享的酒馆包（不包含 API Key / 访客聊天 / 私密记忆）
     * @param {string} tavernId
     * @param {string} userId
     * @returns {Promise<object>}
     */
    async exportTavernPackage(tavernId, userId = '') {
      const response = await fetch(`${getBaseUrl()}/api/v1/taverns/${encodeURIComponent(tavernId)}/package`, {
        cache: 'no-store',
        headers: buildHeaders(userId),
      })
      return readJson(response)
    },

    /**
     * 导入酒馆包并挂载到指定坐标
     * @param {object} packageData
     * @param {object} options — { lat, lon, name, access, address }
     * @param {string} userId
     * @returns {Promise<object>}
     */
    async importTavernPackage(packageData, options = {}, userId = '') {
      const response = await fetch(`${getBaseUrl()}/api/v1/tavern-packages/import`, {
        method: 'POST',
        headers: buildJsonHeaders(userId),
        body: JSON.stringify({
          package: packageData,
          lat: options.lat,
          lon: options.lon,
          name: options.name,
          access: options.access,
          address: options.address,
        }),
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
      const response = await fetch(`${getBaseUrl()}/api/v1/taverns/${encodeURIComponent(tavernId)}/test-llm`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      })
      return readJson(response)
    },

    /**
     * 测试 LLM 配置是否可用（无需酒馆 ID，直接测试配置）
     * @param {object} config — { backend, model, api_key, base_url }
     * @returns {Promise<object>}
     */
    async testLlmConfigDirect(config) {
      const response = await fetch(`${getBaseUrl()}/api/v1/llm/test-config`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      })
      return readJson(response)
    },

    /**
     * 删除酒馆
     * @param {string} tavernId
     * @param {string} userId
     * @returns {Promise<object>}
     */
    async deleteTavern(tavernId, userId = '') {
      const response = await fetch(`${getBaseUrl()}/api/v1/taverns/${encodeURIComponent(tavernId)}`, {
        method: 'DELETE',
        headers: buildHeaders(userId),
      })
      return readJson(response)
    },

    /**
     * 进入酒馆（密码验证）
     * @param {string} tavernId
     * @param {string} password - 密码
     * @param {string} userId
     * @returns {Promise<object>}
     */
    async enterTavern(tavernId, password = '', userId = '') {
      const params = password ? `?password=${encodeURIComponent(password)}` : ''
      const response = await fetch(
        `${getBaseUrl()}/api/v1/taverns/${encodeURIComponent(tavernId)}/enter${params}`,
        { method: 'POST', headers: buildHeaders(userId) }
      )
      return readJson(response)
    },

    /**
     * 获取酒馆访客状态列表（店主视图）
     * @param {string} tavernId
     * @param {string} userId
     * @returns {Promise<object>}
     */
    async getTavernVisitors(tavernId, userId = '') {
      const response = await fetch(
        `${getBaseUrl()}/api/v1/taverns/${encodeURIComponent(tavernId)}/visitors`,
        { cache: 'no-store', headers: buildHeaders(userId) }
      )
      return readJson(response)
    },

    /**
     * 获取当前用户可见的结构化记忆
     * @param {string} tavernId
     * @param {object} filters — { scope, dimension, horizon, visibility, visitor_id, character_id, place_id, limit }
     * @param {string} userId
     * @returns {Promise<object>}
     */
    async listMemoryAtoms(tavernId, filters = {}, userId = '') {
      const params = new URLSearchParams()
      for (const key of ['scope', 'dimension', 'horizon', 'visibility', 'visitor_id', 'character_id', 'place_id', 'limit']) {
        if (filters[key] != null && filters[key] !== '') params.set(key, filters[key])
      }
      const response = await fetch(
        `${getBaseUrl()}/api/v1/taverns/${encodeURIComponent(tavernId)}/memory-atoms?${params}`,
        { cache: 'no-store', headers: buildHeaders(userId) }
      )
      return readJson(response)
    },

    /**
     * 创建结构化记忆
     * @param {string} tavernId
     * @param {object} data
     * @param {string} userId
     * @returns {Promise<object>}
     */
    async createMemoryAtom(tavernId, data, userId = '') {
      const response = await fetch(`${getBaseUrl()}/api/v1/taverns/${encodeURIComponent(tavernId)}/memory-atoms`, {
        method: 'POST',
        headers: buildJsonHeaders(userId),
        body: JSON.stringify(data),
      })
      return readJson(response)
    },

    /**
     * 更新结构化记忆
     * @param {string} tavernId
     * @param {string} memoryId
     * @param {object} data
     * @param {string} userId
     * @returns {Promise<object>}
     */
    async updateMemoryAtom(tavernId, memoryId, data, userId = '') {
      const response = await fetch(`${getBaseUrl()}/api/v1/taverns/${encodeURIComponent(tavernId)}/memory-atoms/${encodeURIComponent(memoryId)}`, {
        method: 'PUT',
        headers: buildJsonHeaders(userId),
        body: JSON.stringify(data),
      })
      return readJson(response)
    },

    /**
     * 删除结构化记忆
     * @param {string} tavernId
     * @param {string} memoryId
     * @param {string} userId
     * @returns {Promise<object>}
     */
    async deleteMemoryAtom(tavernId, memoryId, userId = '') {
      const response = await fetch(`${getBaseUrl()}/api/v1/taverns/${encodeURIComponent(tavernId)}/memory-atoms/${encodeURIComponent(memoryId)}`, {
        method: 'DELETE',
        headers: buildHeaders(userId),
      })
      return readJson(response)
    },

    /**
     * List memories for a visitor with visibility filtering and keyword search (new /memories endpoint).
     * @param {string} tavernId
     * @param {object} filters — { visitor_id, scope, dimension, horizon, pinned, keyword, limit, offset }
     * @param {string} userId
     * @returns {Promise<object>}
     */
    async listMemories(tavernId, filters = {}, userId = '') {
      const params = new URLSearchParams()
      for (const key of ['visitor_id', 'scope', 'dimension', 'horizon', 'keyword', 'limit', 'offset']) {
        if (filters[key] != null && filters[key] !== '') params.set(key, filters[key])
      }
      if (filters.pinned === true || filters.pinned === false) {
        params.set('pinned', filters.pinned)
      }
      const response = await fetch(
        `${getBaseUrl()}/api/v1/taverns/${encodeURIComponent(tavernId)}/memories?${params}`,
        { cache: 'no-store', headers: buildHeaders(userId) }
      )
      return readJson(response)
    },

    /**
     * Pin or unpin a memory atom.
     * @param {string} tavernId
     * @param {string} memoryId
     * @param {boolean} pinned
     * @param {string} userId
     * @returns {Promise<object>}
     */
    async togglePinMemory(tavernId, memoryId, pinned, userId = '') {
      return this.updateMemoryAtom(tavernId, memoryId, { pinned }, userId)
    },

    /**
     * Mark an auto-created memory as wrong (or restore it).
     * @param {string} tavernId
     * @param {string} memoryId
     * @param {object} metadata
     * @param {boolean} flagged
     * @param {string} userId
     * @returns {Promise<object>}
     */
    async markMemoryWrong(tavernId, memoryId, metadata = {}, flagged = true, userId = '') {
      return this.updateMemoryAtom(
        tavernId,
        memoryId,
        { metadata: { ...(metadata || {}), flagged_wrong: flagged } },
        userId
      )
    },

    // ─── Character Management ──────────────────────────────────────

    /**
     * 获取酒馆角色列表
     * @param {string} tavernId
     * @param {string} userId
     * @returns {Promise<object>}
     */
    async getCharacters(tavernId, userId = '') {
      const response = await fetch(
        `${getBaseUrl()}/api/v1/taverns/${encodeURIComponent(tavernId)}/characters`,
        { cache: 'no-store', headers: buildHeaders(userId) }
      )
      return readJson(response)
    },

    /**
     * 添加角色
     * @param {string} tavernId
     * @param {object} data - 角色数据
     * @param {string} userId
     * @returns {Promise<object>}
     */
    async addCharacter(tavernId, data, userId = '') {
      const response = await fetch(
        `${getBaseUrl()}/api/v1/taverns/${encodeURIComponent(tavernId)}/characters`,
        {
          method: 'POST',
          headers: buildJsonHeaders(userId),
          body: JSON.stringify(data),
        }
      )
      return readJson(response)
    },

    /**
     * 导入 SillyTavern 角色卡
     * @param {string} tavernId
     * @param {object} cardData - SillyTavern Character Card V2 JSON
     * @param {string} userId
     * @returns {Promise<object>}
     */
    async importCharacterCard(tavernId, cardData, userId = '') {
      const response = await fetch(
        `${getBaseUrl()}/api/v1/taverns/${encodeURIComponent(tavernId)}/characters/import`,
        {
          method: 'POST',
          headers: buildJsonHeaders(userId),
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
     * @param {string} userId
     * @returns {Promise<object>}
     */
    async updateCharacter(tavernId, charId, data, userId = '') {
      const response = await fetch(
        `${getBaseUrl()}/api/v1/taverns/${encodeURIComponent(tavernId)}/characters/${encodeURIComponent(charId)}`,
        {
          method: 'PUT',
          headers: buildJsonHeaders(userId),
          body: JSON.stringify(data),
        }
      )
      return readJson(response)
    },

    /**
     * 删除角色
     * @param {string} tavernId
     * @param {string} charId
     * @param {string} userId
     * @returns {Promise<object>}
     */
    async deleteCharacter(tavernId, charId, userId = '') {
      const response = await fetch(
        `${getBaseUrl()}/api/v1/taverns/${encodeURIComponent(tavernId)}/characters/${encodeURIComponent(charId)}`,
        { method: 'DELETE', headers: buildHeaders(userId) }
      )
      return readJson(response)
    },

    // ─── Groups / Group Chat ─────────────────────────────────────

    /**
     * 获取持久化群组列表
     * @param {string} tavernId
     * @param {string} userId
     * @returns {Promise<object>}
     */
    async listGroups(tavernId = '', userId = '') {
      const params = new URLSearchParams()
      if (tavernId) params.set('tavern_id', tavernId)
      const response = await fetch(`${getBaseUrl()}/api/groups?${params}`, {
        cache: 'no-store',
        headers: buildHeaders(userId),
      })
      return readJson(response)
    },

    /**
     * 创建持久化群组
     * @param {object} data
     * @param {string} userId
     * @returns {Promise<object>}
     */
    async createGroup(data, userId = '') {
      const response = await fetch(`${getBaseUrl()}/api/groups`, {
        method: 'POST',
        headers: buildJsonHeaders(userId),
        body: JSON.stringify(data),
      })
      return readJson(response)
    },

    /**
     * 更新持久化群组
     * @param {string} groupId
     * @param {object} data
     * @param {string} userId
     * @returns {Promise<object>}
     */
    async updateGroup(groupId, data, userId = '') {
      const response = await fetch(`${getBaseUrl()}/api/groups/${encodeURIComponent(groupId)}`, {
        method: 'PUT',
        headers: buildJsonHeaders(userId),
        body: JSON.stringify(data),
      })
      return readJson(response)
    },

    /**
     * 删除持久化群组
     * @param {string} groupId
     * @param {string} tavernId
     * @param {string} userId
     * @returns {Promise<object>}
     */
    async deleteGroup(groupId, tavernId, userId = '') {
      const response = await fetch(`${getBaseUrl()}/api/groups/${encodeURIComponent(groupId)}`, {
        method: 'DELETE',
        headers: buildJsonHeaders(userId),
        body: JSON.stringify({ tavern_id: tavernId }),
      })
      return readJson(response)
    },

    /**
     * 创建临时群聊会话
     * @param {object} data - { members, strategy }
     * @param {string} userId
     * @returns {Promise<object>}
     */
    async createGroupChat(data, userId = '') {
      const response = await fetch(`${getBaseUrl()}/api/group/create`, {
        method: 'POST',
        headers: buildJsonHeaders(userId),
        body: JSON.stringify(data),
      })
      return readJson(response)
    },

    /**
     * 读取临时群聊会话
     * @param {string} sessionId
     * @param {string} userId
     * @returns {Promise<object>}
     */
    async getGroupChat(sessionId, userId = '') {
      const response = await fetch(`${getBaseUrl()}/api/group/${encodeURIComponent(sessionId)}`, {
        cache: 'no-store',
        headers: buildHeaders(userId),
      })
      return readJson(response)
    },

    /**
     * 添加临时群聊成员
     * @param {string} sessionId
     * @param {object} member
     * @param {string} userId
     * @returns {Promise<object>}
     */
    async addGroupMember(sessionId, member, userId = '') {
      const response = await fetch(`${getBaseUrl()}/api/group/${encodeURIComponent(sessionId)}/add_member`, {
        method: 'POST',
        headers: buildJsonHeaders(userId),
        body: JSON.stringify(member),
      })
      return readJson(response)
    },

    /**
     * 更新临时群聊成员发言积极度
     * @param {string} sessionId
     * @param {string} characterId
     * @param {number} value
     * @param {string} userId
     * @returns {Promise<object>}
     */
    async updateGroupTalkativeness(sessionId, characterId, value, userId = '') {
      const response = await fetch(`${getBaseUrl()}/api/group/${encodeURIComponent(sessionId)}/talkativeness`, {
        method: 'POST',
        headers: buildJsonHeaders(userId),
        body: JSON.stringify({ character_id: characterId, value }),
      })
      return readJson(response)
    },

    /**
     * 发送临时群聊消息
     * @param {string} sessionId
     * @param {string} message
     * @param {string} userId
     * @returns {Promise<object>}
     */
    async sendGroupMessage(sessionId, message, userId = '', options = {}) {
      const response = await fetch(`${getBaseUrl()}/api/group/${encodeURIComponent(sessionId)}/send`, {
        method: 'POST',
        headers: buildJsonHeaders(userId),
        body: JSON.stringify({ message, ...options }),
      })
      return readJson(response)
    },

    /**
     * 记录临时群聊中已生成的角色回复
     * @param {string} sessionId
     * @param {object} data - { character_id, name, content }
     * @param {string} userId
     * @returns {Promise<object>}
     */
    async recordGroupMessage(sessionId, data, userId = '') {
      const response = await fetch(`${getBaseUrl()}/api/group/${encodeURIComponent(sessionId)}/record`, {
        method: 'POST',
        headers: buildJsonHeaders(userId),
        body: JSON.stringify(data),
      })
      return readJson(response)
    },

    // ─── Tavern Group Chat API ────────────────────────────────────

    /**
     * 获取酒馆持久群聊配置和角色发言积极度
     * @param {string} tavernId
     * @param {string} userId
     * @returns {Promise<object>}
     */
    async getGroupChatConfig(tavernId, userId = '') {
      const response = await fetch(`${getBaseUrl()}/api/v1/taverns/${encodeURIComponent(tavernId)}/group-chat`, {
        cache: 'no-store',
        headers: buildHeaders(userId),
      })
      return readJson(response)
    },

    /**
     * 保存酒馆持久群聊配置（店主）
     * @param {string} tavernId
     * @param {object} data — { group_chat_enabled, group_chat_config, character_talkativeness? }
     * @param {string} userId
     * @returns {Promise<object>}
     */
    async updateGroupChatConfig(tavernId, data, userId = '') {
      const response = await fetch(`${getBaseUrl()}/api/v1/taverns/${encodeURIComponent(tavernId)}/group-chat/config`, {
        method: 'PUT',
        headers: buildJsonHeaders(userId),
        body: JSON.stringify(data),
      })
      return readJson(response)
    },

    /**
     * 向酒馆持久群聊发送消息，由后端选择多个角色并返回回复
     * @param {string} tavernId
     * @param {string} message
     * @param {string} visitorId
     * @param {string} visitorName
     * @param {string} userId
     * @returns {Promise<object>}
     */
    async sendGroupChat(tavernId, message, visitorId, visitorName = '', userId = '', options = {}) {
      const cleanVisitorName = String(visitorName || '').trim().slice(0, 24)
      const cleanVisitorId = String(visitorId || userId || '').trim()
      const body = {
        message,
        visitor_id: cleanVisitorId,
        visitor_name: cleanVisitorName,
      }
      const displayMessage = String(options.displayMessage || '').trim()
      if (displayMessage) {
        body.display_message = displayMessage
      }
      const response = await fetch(`${getBaseUrl()}/api/v1/taverns/${encodeURIComponent(tavernId)}/group-chat`, {
        method: 'POST',
        headers: buildJsonHeaders(userId || cleanVisitorId),
        body: JSON.stringify(body),
      })
      return readJson(response)
    },

    /**
     * 获取酒馆持久群聊历史
     * @param {string} tavernId
     * @param {string} visitorId
     * @param {string} userId
     * @param {number} limit
     * @returns {Promise<object>}
     */
    async getGroupChatHistory(tavernId, visitorId = '', userId = '', limit = 50) {
      const params = new URLSearchParams()
      const cleanVisitorId = String(visitorId || '').trim()
      if (cleanVisitorId) params.set('visitor_id', cleanVisitorId)
      if (limit != null) params.set('limit', limit)
      const response = await fetch(
        `${getBaseUrl()}/api/v1/taverns/${encodeURIComponent(tavernId)}/group-chat/history?${params}`,
        { cache: 'no-store', headers: buildHeaders(userId || cleanVisitorId) },
      )
      return readJson(response)
    },

    /**
     * 更新单个角色的群聊发言积极度（店主）
     * @param {string} tavernId
     * @param {string} characterId
     * @param {number} talkativeness
     * @param {string} userId
     * @returns {Promise<object>}
     */
    async updateTalkativeness(tavernId, characterId, talkativeness, userId = '') {
      const response = await fetch(
        `${getBaseUrl()}/api/v1/taverns/${encodeURIComponent(tavernId)}/characters/${encodeURIComponent(characterId)}/talkativeness`,
        {
          method: 'PUT',
          headers: buildJsonHeaders(userId),
          body: JSON.stringify({ talkativeness }),
        },
      )
      return readJson(response)
    },

    // ─── Voice (TTS/STT) API ───────────────────────────────────────

    /**
     * 获取酒馆语音配置
     * @param {string} tavernId
     * @param {string} userId
     * @returns {Promise<object>}
     */
    async getVoiceConfig(tavernId, userId = '') {
      const response = await fetch(`${getBaseUrl()}/api/v1/taverns/${encodeURIComponent(tavernId)}/voice`, {
        cache: 'no-store',
        headers: buildHeaders(userId),
      })
      return readJson(response)
    },

    /**
     * 保存酒馆语音配置（店主）
     * @param {string} tavernId
     * @param {object} config
     * @param {string} userId
     * @returns {Promise<object>}
     */
    async saveVoiceConfig(tavernId, config, userId = '') {
      const response = await fetch(`${getBaseUrl()}/api/v1/taverns/${encodeURIComponent(tavernId)}/voice`, {
        method: 'PUT',
        headers: buildJsonHeaders(userId),
        body: JSON.stringify(config),
      })
      return readJson(response)
    },

    /**
     * 合成语音，返回可播放的 blob URL
     * @param {string} tavernId
     * @param {string} text
     * @param {string} characterId
     * @param {string} userId
     * @returns {Promise<string>}
     */
    async synthesizeVoice(tavernId, text, characterId = '', userId = '') {
      const response = await fetch(`${getBaseUrl()}/api/v1/taverns/${encodeURIComponent(tavernId)}/tts`, {
        method: 'POST',
        headers: buildJsonHeaders(userId),
        body: JSON.stringify({ text, character_id: characterId }),
      })
      if (!response.ok) {
        const raw = await response.text()
        let payload = {}
        try {
          payload = raw ? JSON.parse(raw) : {}
        } catch {
          payload = { error: raw.slice(0, 120) }
        }
        throw new Error(payload.error || payload.detail || `语音合成失败: ${response.status}`)
      }
      const blob = await response.blob()
      return URL.createObjectURL(blob)
    },

    /**
     * 上传音频给后端 STT 转写
     * @param {string} tavernId
     * @param {Blob|File} audioFile
     * @param {string} userId
     * @returns {Promise<object>}
     */
    async transcribeVoice(tavernId, audioFile, userId = '') {
      const response = await fetch(`${getBaseUrl()}/api/v1/taverns/${encodeURIComponent(tavernId)}/stt`, {
        method: 'POST',
        headers: buildHeaders(userId),
        body: audioFile,
      })
      return readJson(response)
    },

    /**
     * 获取可用的 TTS 提供者列表
     * @returns {Promise<object>}
     */
    async listTtsProviders() {
      const response = await fetch(`${getBaseUrl()}/api/tts/providers`, { cache: 'no-store' })
      return readJson(response)
    },

    /**
     * 获取某个 TTS 提供者可用的声音
     * @param {string} provider
     * @param {string} apiKey
     * @returns {Promise<object>}
     */
    async listTtsVoices(provider, apiKey = '') {
      const response = await fetch(`${getBaseUrl()}/api/tts/voices`, {
        method: 'POST',
        headers: buildJsonHeaders(),
        body: JSON.stringify({ provider, api_key: apiKey }),
      })
      return readJson(response)
    },

    // ─── Chat ─────────────────────────────────────────────────────

    /**
     * 获取聊天会话摘要（店主看自己酒馆时默认返回全部访客会话）
     * @param {object} options
     * @param {string} options.tavernId
     * @param {string} options.characterId
     * @param {string} options.visitorId
     * @param {string} userId
     * @returns {Promise<object>}
     */
    async listChatSessions(options = {}, userId = '') {
      const params = new URLSearchParams()
      if (options.tavernId) params.set('tavern_id', options.tavernId)
      if (options.characterId) params.set('character_id', options.characterId)
      if (options.visitorId) params.set('visitor_id', options.visitorId)

      const response = await fetch(`${getBaseUrl()}/api/chats?${params}`, {
        cache: 'no-store',
        headers: buildHeaders(userId),
      })
      return readJson(response)
    },

    /**
     * 获取酒馆聊天记录
     * @param {string} tavernId
     * @param {string} visitorId
     * @param {string} characterId
     * @param {string} userId
     * @param {number} limit
     * @returns {Promise<object>}
     */
    async getChatHistory(tavernId, visitorId, characterId = null, userId = visitorId, limit = 50) {
      const params = new URLSearchParams({
        visitor_id: visitorId,
      })
      if (characterId) params.set('character_id', characterId)
      if (limit) params.set('limit', String(limit))

      const response = await fetch(
        `${getBaseUrl()}/api/v1/taverns/${encodeURIComponent(tavernId)}/chat?${params}`,
        { cache: 'no-store', headers: buildHeaders(userId) }
      )
      return readJson(response)
    },

    /**
     * 导出聊天记录
     * @param {object} options
     * @param {string} options.tavernId
     * @param {string} options.characterId
     * @param {string} options.visitorId
     * @param {'json'|'text'} options.format
     * @param {string} userId
     * @returns {Promise<object>}
     */
    async exportChatHistory(options = {}, userId = '') {
      const response = await fetch(`${getBaseUrl()}/api/v1/taverns/${encodeURIComponent(options.tavernId || '')}/chat/export`, {
        method: 'POST',
        headers: buildJsonHeaders(userId),
        body: JSON.stringify({
          character_id: options.characterId || '',
          visitor_id: options.visitorId || '',
          format: options.format || 'json',
        }),
      })
      return readJson(response)
    },

    /**
     * 搜索聊天记录
     * @param {object} options
     * @param {string} options.tavernId
     * @param {string} options.characterId
     * @param {string} options.visitorId
     * @param {string} options.query
     * @param {number} options.limit
     * @param {string} userId
     * @returns {Promise<object>}
     */
    async searchChatHistory(options = {}, userId = '') {
      const response = await fetch(`${getBaseUrl()}/api/v1/taverns/${encodeURIComponent(options.tavernId || '')}/chat/search`, {
        method: 'POST',
        headers: buildJsonHeaders(userId),
        body: JSON.stringify({
          character_id: options.characterId || '',
          visitor_id: options.visitorId || '',
          query: options.query || '',
          limit: options.limit || 50,
        }),
      })
      return readJson(response)
    },

    /**
     * 发送聊天消息
     * @param {string} tavernId
     * @param {string} characterId
     * @param {string} message
     * @param {string} visitorId
     * @param {string} visitorName
     * @param {object} options
     * @returns {Promise<object>}
     */
    async sendChat(tavernId, characterId, message, visitorId, visitorName = '', options = {}) {
      const cleanVisitorName = String(visitorName || '').trim().slice(0, 24)
      const body = {
        character_id: characterId,
        message,
        visitor_id: visitorId,
        visitor_name: cleanVisitorName,
      }
      if (Array.isArray(options.extra_context)) {
        body.extra_context = options.extra_context
      }
      const displayMessage = String(options.displayMessage || '').trim()
      if (displayMessage) {
        body.display_message = displayMessage
      }
      const response = await fetch(
        `${getBaseUrl()}/api/v1/taverns/${encodeURIComponent(tavernId)}/chat`,
        {
          method: 'POST',
          headers: buildJsonHeaders(visitorId),
          body: JSON.stringify(body),
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
      const response = await fetch(`${getBaseUrl()}/api/v1/expressions`)
      return readJson(response)
    },

    /**
     * 获取角色的所有立绘
     * @param {string} tavernId
     * @param {string} characterId
     * @param {string} userId
     * @returns {Promise<object>}
     */
    async getCharacterSprites(tavernId, characterId, userId = '') {
      const response = await fetch(
        `${getBaseUrl()}/api/v1/taverns/${encodeURIComponent(tavernId)}/characters/${encodeURIComponent(characterId)}/sprites`,
        { headers: buildHeaders(userId) }
      )
      return readJson(response)
    },

    /**
     * 更新角色的立绘配置
     * @param {string} tavernId
     * @param {string} characterId
     * @param {object} sprites - 键为表情名，值为 URL
     * @param {string} userId
     * @returns {Promise<object>}
     */
    async updateCharacterSprites(tavernId, characterId, sprites, userId = '') {
      const response = await fetch(
        `${getBaseUrl()}/api/v1/taverns/${encodeURIComponent(tavernId)}/characters/${encodeURIComponent(characterId)}/sprites`,
        {
          method: 'PUT',
          headers: buildJsonHeaders(userId),
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
      const response = await fetch(`${getBaseUrl()}/api/v1/expression/infer`, {
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
    avatar: data.avatar || '',
    appearance: data.appearance || {},
    talkativeness: data.talkativeness ?? 0.5,
    sprites: data.sprites || {},
    // WorldInfo (character_book)
    world_info: (() => {
      try {
        const entries = data.character_book?.entries
        if (!Array.isArray(entries)) return []
        return entries.map((entry) => ({
          keys: entry.keys || [],
          content: entry.content || '',
          selective: entry.selective ?? true,
          constant: entry.constant ?? false,
          depth: entry.depth ?? 4,
          order: entry.order ?? 100,
        }))
      } catch {
        return []
      }
    })(),
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

export const TAVERN_ACCESS_META = {
  public: {
    label: '公开',
    icon: '🔓',
    tone: 'public',
    markerLabel: '公开',
    description: '任何访客都可以直接进入',
  },
  password: {
    label: '密码',
    icon: '🔒',
    tone: 'password',
    markerLabel: '密令',
    description: '访客需要输入密码后进入',
  },
  private: {
    label: '私人',
    icon: '👤',
    tone: 'private',
    markerLabel: '私人',
    description: '仅店主或授权视图可见',
  },
}

function getAccessMeta(access) {
  return TAVERN_ACCESS_META[access] || {
    label: access || '未知',
    icon: '❓',
    tone: 'unknown',
    markerLabel: access || '未知',
    description: '入口类型未标记',
  }
}

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

// ─── Voice (TTS/STT) API ───────────────────────────────────────────────────────

/**
 * 获取酒馆的语音配置
 * @param {string} tavernId
 * @returns {Promise<object>}
 */
export async function getVoiceConfig(tavernId) {
  const response = await fetch(`/api/taverns/${tavernId}/voice`, {
    credentials: 'include',
  })
  if (!response.ok) {
    throw new Error(`获取语音配置失败: ${response.status}`)
  }
  return response.json()
}

/**
 * 保存酒馆的语音配置
 * @param {string} tavernId
 * @param {object} config - VoiceConfig object
 * @returns {Promise<object>}
 */
export async function saveVoiceConfig(tavernId, config) {
  const response = await fetch(`/api/taverns/${tavernId}/voice`, {
    method: 'PUT',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(config),
  })
  if (!response.ok) {
    throw new Error(`保存语音配置失败: ${response.status}`)
  }
  return response.json()
}

/**
 * 合成语音
 * @param {string} tavernId
 * @param {string} text - Text to synthesize
 * @param {string} characterId - Optional character ID
 * @returns {Promise<string>} - Audio URL (blob URL that must be consumed immediately)
 */
export async function synthesizeVoice(tavernId, text, characterId = '') {
  const response = await fetch(`/api/taverns/${tavernId}/tts`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text, character_id: characterId }),
  })
  if (!response.ok) {
    const err = await response.json().catch(() => ({ error: 'Unknown error' }))
    throw new Error(err.error || `语音合成失败: ${response.status}`)
  }
  // Return the audio as a blob URL
  const blob = await response.blob()
  return URL.createObjectURL(blob)
}

/**
 * 转写语音为文字
 * @param {string} tavernId
 * @param {Blob|File} audioFile - Audio file to transcribe
 * @returns {Promise<object>} - { text, provider }
 */
export async function transcribeVoice(tavernId, audioFile) {
  const response = await fetch(`/api/taverns/${tavernId}/stt`, {
    method: 'POST',
    credentials: 'include',
    body: audioFile,
  })
  if (!response.ok) {
    const err = await response.json().catch(() => ({ error: 'Unknown error' }))
    throw new Error(err.error || `语音转写失败: ${response.status}`)
  }
  return response.json()
}

/**
 * 获取可用的 TTS 提供者列表
 * @returns {Promise<string[]>}
 */
export async function listTtsProviders() {
  const response = await fetch('/api/tts/providers', {
    credentials: 'include',
  })
  if (!response.ok) {
    throw new Error(`获取 TTS 提供者失败: ${response.status}`)
  }
  const data = await response.json()
  return data.providers || []
}

/**
 * 获取 TTS 提供者的可用语音列表
 * @param {string} provider
 * @param {string} apiKey - Optional API key for the provider
 * @returns {Promise<object[]>}
 */
export async function listTtsVoices(provider, apiKey = '') {
  const response = await fetch('/api/tts/voices', {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ provider, api_key: apiKey }),
  })
  if (!response.ok) {
    throw new Error(`获取语音列表失败: ${response.status}`)
  }
  const data = await response.json()
  return data.voices || []
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
  return getAccessMeta(access).label
}

/**
 * 访问类型图标
 * @param {string} access
 * @returns {string}
 */
export function getTavernAccessIcon(access) {
  return getAccessMeta(access).icon
}

/**
 * 访问类型色调 class 后缀
 * @param {string} access
 * @returns {string}
 */
export function getTavernAccessTone(access) {
  return getAccessMeta(access).tone
}

/**
 * 地图 marker 上的短标签
 * @param {string} access
 * @returns {string}
 */
export function getTavernAccessMarkerLabel(access) {
  return getAccessMeta(access).markerLabel
}

/**
 * 访问类型说明
 * @param {string} access
 * @returns {string}
 */
export function getTavernAccessDescription(access) {
  return getAccessMeta(access).description
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

// NOTE: Routes updated to /api/v1/* for native v1 parity.
// These are kept as compatibility layer. Prefer lib/taverns.ts for new code.

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
