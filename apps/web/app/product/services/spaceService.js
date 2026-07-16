import { normalizeGender } from '../../lib/gender.js'
import { normalizeMediaPayload } from '../../lib/media-assets'

/**
 * FableSpace Space Service — 兼容层 (Legacy)
 *
 * 本文件已废弃，仅用于向后兼容。请使用 app/lib/spaces.ts (原生 /api/v1/*)
 * 或 app/features/space-chat/ (功能组件)。
 *
 * 迁移指南:
 * - getDefaultSpaceService() → 改用 lib/spaces.ts 函数
 * - SpaceChatRoom.jsx → app/features/space-chat/index.tsx
 * - spaceService.listSpaces() → listSpaces() from lib/spaces.ts
 */

/**
 * 读取 API 响应
 * @param {Response} response
 * @returns {Promise<object>}
 */
function isApiEnvelope(payload) {
  return !!payload && typeof payload === 'object' && 'data' in payload && !!payload.meta && typeof payload.meta === 'object'
}

function unwrapApiPayload(payload) {
  return isApiEnvelope(payload) ? payload.data : payload
}

function apiErrorMessage(payload, status) {
  if (payload && typeof payload === 'object') {
    if (payload.error || payload.detail) {
      return payload.error || payload.detail
    }
    const metaError = payload.meta?.error
    if (typeof metaError === 'string' && metaError.trim()) {
      return metaError
    }
    if (metaError && typeof metaError === 'object' && metaError.message) {
      return metaError.message
    }
  }
  return `HTTP ${status}`
}

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
    const err = new Error(apiErrorMessage(payload, response.status))
    err.errorType = response.status
    throw err
  }
  return normalizeMediaPayload(unwrapApiPayload(payload))
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
 * 创建 Space Service 客户端
 * @param {() => string} getBaseUrl - 获取 API 基础 URL 的函数
 * @returns {object} Space Service API 对象
 */
export function createSpaceService(getBaseUrl) {
  return {
    // ─── Space CRUD ───────────────────────────────────────────────

    /**
     * 获取空间列表
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
    async listSpaces(options = {}) {
      const params = new URLSearchParams()
      if (options.lat != null) params.set('lat', options.lat)
      if (options.lon != null) params.set('lon', options.lon)
      if (options.radius) params.set('radius', options.radius)
      if (options.access) params.set('access', options.access)
      if (options.status) params.set('status', options.status)
      if (options.query) params.set('q', options.query)
      if (options.owner_id) params.set('owner_id', options.owner_id)

      const response = await fetch(`${getBaseUrl()}/api/v1/spaces?${params}`, {
        cache: 'no-store',
      })
      return readJson(response)
    },

    /**
     * 创建空间
     * @param {object} data
     * @param {string} userId - 店主/操作者 ID
     * @param {string} data.name - 空间名称
     * @param {string} data.description - 空间描述
     * @param {number} data.lat - 纬度
     * @param {number} data.lon - 经度
     * @param {string} data.access - public | password | private
     * @param {string} data.password - 密码（access=password 时）
     * @param {object} data.llm_config - LLM 配置
     * @returns {Promise<object>}
     */
    async createSpace(data, userId = '') {
      const response = await fetch(`${getBaseUrl()}/api/v1/spaces`, {
        method: 'POST',
        headers: buildJsonHeaders(userId),
        body: JSON.stringify(data),
      })
      return readJson(response)
    },

    /**
     * 获取空间详情
     * @param {string} spaceId
     * @param {string} userId
     * @returns {Promise<object>}
     */
    async getSpace(spaceId, userId = '') {
      const response = await fetch(`${getBaseUrl()}/api/v1/spaces/${encodeURIComponent(spaceId)}`, {
        cache: 'no-store',
        headers: buildHeaders(userId),
      })
      return readJson(response)
    },

    /**
     * 获取空间统计数据
     * @param {string} spaceId
     * @param {string} userId
     * @returns {Promise<object>} 统计数据，包含 total_visits, total_messages, total_tokens
     */
    async getSpaceMetrics(spaceId, userId = '') {
      const response = await fetch(`${getBaseUrl()}/api/v1/spaces/${encodeURIComponent(spaceId)}/metrics`, {
        cache: 'no-store',
        headers: buildHeaders(userId),
      })
      return readJson(response)
    },

    /**
     * 获取空间分享信息
     * @param {string} spaceId
     * @returns {Promise<object>} 分享信息，包含 title, description, share_url 等
     */
    async getSpaceShare(spaceId) {
      const response = await fetch(`${getBaseUrl()}/api/v1/spaces/${encodeURIComponent(spaceId)}/share`, {
        cache: 'no-store',
      })
      return readJson(response)
    },

    /**
     * 更新空间
     * @param {string} spaceId
     * @param {object} data
     * @param {string} userId
     * @returns {Promise<object>}
     */
    async updateSpace(spaceId, data, userId = '') {
      const response = await fetch(`${getBaseUrl()}/api/v1/spaces/${encodeURIComponent(spaceId)}`, {
        method: 'PUT',
        headers: buildJsonHeaders(userId),
        body: JSON.stringify(data),
      })
      return readJson(response)
    },

    /**
     * 保存空间世界书
     * @param {string} spaceId
     * @param {Array<object>} worldInfo
     * @param {string} userId
     * @returns {Promise<object>} 更新后的空间
     */
    async saveWorldInfo(spaceId, worldInfo, userId = '') {
      const response = await fetch(`${getBaseUrl()}/api/v1/spaces/${encodeURIComponent(spaceId)}`, {
        method: 'PUT',
        headers: buildJsonHeaders(userId),
        body: JSON.stringify({ world_info: worldInfo }),
      })
      return readJson(response)
    },

    /**
     * 测试一句话会命中哪些世界书条目（不调用 AI，不保存）
     * @param {string} spaceId
     * @param {object} data — { message, world_info?, recent_messages?, include_space_context? }
     * @param {string} userId
     * @returns {Promise<object>}
     */
    async testWorldInfo(spaceId, data, userId = '') {
      const response = await fetch(`${getBaseUrl()}/api/v1/spaces/${encodeURIComponent(spaceId)}/world-info/test`, {
        method: 'POST',
        headers: buildJsonHeaders(userId),
        body: JSON.stringify(data),
      })
      return readJson(response)
    },

    /**
     * 获取空间输出修正规则
     * @param {string} spaceId
     * @param {string} userId
     * @returns {Promise<object>} { rules, default_rules }
     */
    async getOutputRules(spaceId, userId = '') {
      const response = await fetch(`${getBaseUrl()}/api/v1/spaces/${encodeURIComponent(spaceId)}/output-rules`, {
        cache: 'no-store',
        headers: buildHeaders(userId),
      })
      return readJson(response)
    },

    /**
     * 保存空间输出修正规则
     * @param {string} spaceId
     * @param {Array<object>} rules
     * @param {string} userId
     * @returns {Promise<object>} 更新后的规则和空间
     */
    async saveOutputRules(spaceId, rules, userId = '') {
      const response = await fetch(`${getBaseUrl()}/api/v1/spaces/${encodeURIComponent(spaceId)}/output-rules`, {
        method: 'PUT',
        headers: buildJsonHeaders(userId),
        body: JSON.stringify({ rules }),
      })
      return readJson(response)
    },

    /**
     * 预览输出修正规则效果（不保存）
     * @param {string} spaceId
     * @param {object} data — { text, rules? }
     * @param {string} userId
     * @returns {Promise<object>} { text, original_text, applied, errors }
     */
    async testOutputRules(spaceId, data, userId = '') {
      const response = await fetch(`${getBaseUrl()}/api/v1/spaces/${encodeURIComponent(spaceId)}/output-rules/test`, {
        method: 'POST',
        headers: buildJsonHeaders(userId),
        body: JSON.stringify(data),
      })
      return readJson(response)
    },

    /**
     * 获取空间 Prompt 段落
     * @param {string} spaceId
     * @param {string} userId
     * @returns {Promise<object>} { blocks, default_blocks }
     */
    async getPromptBlocks(spaceId, userId = '') {
      const response = await fetch(`${getBaseUrl()}/api/v1/spaces/${encodeURIComponent(spaceId)}/prompt-blocks`, {
        cache: 'no-store',
        headers: buildHeaders(userId),
      })
      return readJson(response)
    },

    /**
     * 保存空间 Prompt 段落
     * @param {string} spaceId
     * @param {Array<object>} blocks
     * @param {string} userId
     * @returns {Promise<object>}
     */
    async savePromptBlocks(spaceId, blocks, userId = '') {
      const response = await fetch(`${getBaseUrl()}/api/v1/spaces/${encodeURIComponent(spaceId)}/prompt-blocks`, {
        method: 'PUT',
        headers: buildJsonHeaders(userId),
        body: JSON.stringify({ blocks }),
      })
      return readJson(response)
    },

    /**
     * 预览 Prompt 段落组装结果（不调用 AI）
     * @param {string} spaceId
     * @param {object} data — { message, blocks?, character_id? }
     * @param {string} userId
     * @returns {Promise<object>}
     */
    async previewPromptBlocks(spaceId, data, userId = '') {
      const response = await fetch(`${getBaseUrl()}/api/v1/spaces/${encodeURIComponent(spaceId)}/prompt-blocks/preview`, {
        method: 'POST',
        headers: buildJsonHeaders(userId),
        body: JSON.stringify(data),
      })
      return readJson(response)
    },

    /**
     * 获取当前用户可见的空间玩法定义。
     * @param {string} spaceId
     * @param {string} userId
     * @returns {Promise<object>} { space_id, gameplays }
     */
    async getGameplays(spaceId, userId = '') {
      const response = await fetch(`${getBaseUrl()}/api/v1/spaces/${encodeURIComponent(spaceId)}/gameplays`, {
        cache: 'no-store',
        headers: buildHeaders(userId),
      })
      return readJson(response)
    },

    /**
     * 保存店主维护的玩法定义列表。
     * @param {string} spaceId
     * @param {Array<object>} gameplays
     * @param {string} userId
     * @returns {Promise<object>} { ok, space_id, gameplays }
     */
    async saveGameplays(spaceId, gameplays, userId = '') {
      const response = await fetch(`${getBaseUrl()}/api/v1/spaces/${encodeURIComponent(spaceId)}/gameplays`, {
        method: 'PUT',
        headers: buildJsonHeaders(userId),
        body: JSON.stringify({ gameplays: Array.isArray(gameplays) ? gameplays : [] }),
      })
      return readJson(response)
    },

    /**
     * 开始或恢复一局玩法。
     * @param {string} spaceId
     * @param {object} data — { gameplayId|gameplay_id, characterId|character_id }
     * @param {string} userId
     * @returns {Promise<object>} { ok, resumed, session, scene }
     */
    async startGameplaySession(spaceId, data = {}, userId = '') {
      const response = await fetch(`${getBaseUrl()}/api/v1/spaces/${encodeURIComponent(spaceId)}/gameplay-sessions`, {
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
     * @param {string} spaceId
     * @param {string} sessionId
     * @param {object} data — { choiceId|choice_id, message }
     * @param {string} userId
     * @returns {Promise<object>} { ok, source, event, session, scene }
     */
    async advanceGameplaySession(spaceId, sessionId, data = {}, userId = '') {
      const response = await fetch(`${getBaseUrl()}/api/v1/spaces/${encodeURIComponent(spaceId)}/gameplay-sessions/${encodeURIComponent(sessionId)}/advance`, {
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
     * @param {string} spaceId
     * @param {object} options — { state, visitorId|visitor_id }
     * @param {string} userId
     * @returns {Promise<object>} { space_id, sessions }
     */
    async listGameplaySessions(spaceId, options = {}, userId = '') {
      const params = new URLSearchParams()
      if (options.state) params.set('state', options.state)
      if (options.visitor_id || options.visitorId) {
        params.set('visitor_id', options.visitor_id || options.visitorId)
      }
      const query = params.toString()
      const response = await fetch(
        `${getBaseUrl()}/api/v1/spaces/${encodeURIComponent(spaceId)}/gameplay-sessions${query ? `?${query}` : ''}`,
        { cache: 'no-store', headers: buildHeaders(userId) },
      )
      return readJson(response)
    },

    /**
     * 放弃一局玩法。
     * @param {string} spaceId
     * @param {string} sessionId
     * @param {string} userId
     * @returns {Promise<object>} { ok, session }
     */
    async abandonGameplaySession(spaceId, sessionId, userId = '') {
      const response = await fetch(`${getBaseUrl()}/api/v1/spaces/${encodeURIComponent(spaceId)}/gameplay-sessions/${encodeURIComponent(sessionId)}/abandon`, {
        method: 'POST',
        headers: buildJsonHeaders(userId),
        body: JSON.stringify({}),
      })
      return readJson(response)
    },

    /**
     * 列出当前用户可见的连续性状态卡。
     * @param {string} spaceId
     * @param {object} options — { status, category, canonScope|canon_scope, visitorId|visitor_id, characterId|character_id }
     * @param {string} userId
     * @returns {Promise<object>} { space_id, state_cards, count }
     */
    async listStateCards(spaceId, options = {}, userId = '') {
      const params = new URLSearchParams()
      if (options.status) params.set('status', options.status)
      if (options.category) params.set('category', options.category)
      if (options.canon_scope || options.canonScope) params.set('canon_scope', options.canon_scope || options.canonScope)
      if (options.visitor_id || options.visitorId) params.set('visitor_id', options.visitor_id || options.visitorId)
      if (options.character_id || options.characterId) params.set('character_id', options.character_id || options.characterId)
      const query = params.toString()
      const response = await fetch(
        `${getBaseUrl()}/api/v1/spaces/${encodeURIComponent(spaceId)}/state-cards${query ? `?${query}` : ''}`,
        { cache: 'no-store', headers: buildHeaders(userId) },
      )
      return readJson(response)
    },

    /**
     * 决定一张待确认状态卡。
     * @param {string} spaceId
     * @param {string} cardId
     * @param {object} data — { status: confirmed|rejected|superseded, note }
     * @param {string} userId
     * @returns {Promise<object>} { ok, state_card }
     */
    async decideStateCard(spaceId, cardId, data = {}, userId = '') {
      const response = await fetch(`${getBaseUrl()}/api/v1/spaces/${encodeURIComponent(spaceId)}/state-cards/${encodeURIComponent(cardId)}/decision`, {
        method: 'PUT',
        headers: buildJsonHeaders(userId),
        body: JSON.stringify({
          status: data.status || '',
          note: data.note || '',
        }),
      })
      return readJson(response)
    },

    /**
     * 预览 GM Layer 结构化候选（只预览，不写入状态卡）。
     * @param {string} spaceId
     * @param {object} data — { visitor_id, character_id, user_message, assistant_message, source_message_ids }
     * @param {string} userId
     * @returns {Promise<object>} { ok, preview_only, applied, candidates, summary }
     */
    async previewGmLayer(spaceId, data = {}, userId = '') {
      const response = await fetch(`${getBaseUrl()}/api/v1/spaces/${encodeURIComponent(spaceId)}/gm-layer/preview`, {
        method: 'POST',
        headers: buildJsonHeaders(userId),
        body: JSON.stringify(data || {}),
      })
      return readJson(response)
    },

    /**
     * 获取店主可配置的空间技能包。
     * @param {string} spaceId
     * @param {string} userId
     * @returns {Promise<object>} { available_packs, skill_packs, enabled_pack_ids }
     */
    async listSkillPacks(spaceId, userId = '') {
      const response = await fetch(
        `${getBaseUrl()}/api/v1/spaces/${encodeURIComponent(spaceId)}/skill-packs`,
        { cache: 'no-store', headers: buildHeaders(userId) },
      )
      return readJson(response)
    },

    /**
     * 保存空间技能包启用状态。
     * @param {string} spaceId
     * @param {Array<object>} skillPacks
     * @param {string} userId
     * @returns {Promise<object>}
     */
    async saveSkillPacks(spaceId, skillPacks = [], userId = '') {
      const response = await fetch(`${getBaseUrl()}/api/v1/spaces/${encodeURIComponent(spaceId)}/skill-packs`, {
        method: 'PUT',
        headers: buildJsonHeaders(userId),
        body: JSON.stringify({ skill_packs: Array.isArray(skillPacks) ? skillPacks : [] }),
      })
      return readJson(response)
    },

    /**
     * 获取空间运行预设（内置 + 店主自定义）
     * @param {string} spaceId
     * @param {string} userId
     * @returns {Promise<object>} { presets, custom_presets, default_presets, active_preset_id }
     */
    async getRuntimePresets(spaceId, userId = '') {
      const response = await fetch(`${getBaseUrl()}/api/v1/spaces/${encodeURIComponent(spaceId)}/runtime-presets`, {
        cache: 'no-store',
        headers: buildHeaders(userId),
      })
      return readJson(response)
    },

    /**
     * 保存店主自定义运行预设
     * @param {string} spaceId
     * @param {Array<object>} presets
     * @param {string} userId
     * @returns {Promise<object>}
     */
    async saveRuntimePresets(spaceId, presets, userId = '') {
      const response = await fetch(`${getBaseUrl()}/api/v1/spaces/${encodeURIComponent(spaceId)}/runtime-presets`, {
        method: 'PUT',
        headers: buildJsonHeaders(userId),
        body: JSON.stringify({ presets }),
      })
      return readJson(response)
    },

    /**
     * 应用运行预设到 AI 参数、Prompt 段落、记忆策略和输出护栏
     * @param {string} spaceId
     * @param {object} data — { preset_id } 或 { preset }
     * @param {string} userId
     * @returns {Promise<object>}
     */
    async applyRuntimePreset(spaceId, data, userId = '') {
      const response = await fetch(`${getBaseUrl()}/api/v1/spaces/${encodeURIComponent(spaceId)}/runtime-presets/apply`, {
        method: 'POST',
        headers: buildJsonHeaders(userId),
        body: JSON.stringify(data),
      })
      return readJson(response)
    },

    /**
     * 预览社区/SillyTavern 风格预设导入风险（只预览，不保存）。
     * @param {string} spaceId
     * @param {object} data — { preset?, preset_json? }
     * @param {string} userId
     * @returns {Promise<object>}
     */
    async previewPresetImport(spaceId, data, userId = '') {
      const response = await fetch(`${getBaseUrl()}/api/v1/spaces/${encodeURIComponent(spaceId)}/preset-import/preview`, {
        method: 'POST',
        headers: buildJsonHeaders(userId),
        body: JSON.stringify(data || {}),
      })
      return readJson(response)
    },

    /**
     * 预览或确认应用社区/SillyTavern 风格预设的 supported 子集。
     * @param {string} spaceId
     * @param {object} data — { preset?, selected_ids?, target_map?, include_runtime_parameters?, confirm? }
     * @param {string} userId
     * @returns {Promise<object>}
     */
    async applyPresetImport(spaceId, data, userId = '') {
      const response = await fetch(`${getBaseUrl()}/api/v1/spaces/${encodeURIComponent(spaceId)}/preset-import/apply`, {
        method: 'POST',
        headers: buildJsonHeaders(userId),
        body: JSON.stringify(data || {}),
      })
      return readJson(response)
    },

    /**
     * 导出可分享的空间包（不包含 API Key / 访客聊天 / 私密记忆）
     * @param {string} spaceId
     * @param {string} userId
     * @returns {Promise<object>}
     */
    async exportSpacePackage(spaceId, userId = '') {
      const response = await fetch(`${getBaseUrl()}/api/v1/spaces/${encodeURIComponent(spaceId)}/package`, {
        cache: 'no-store',
        headers: buildHeaders(userId),
      })
      return readJson(response)
    },

    /**
     * 导入空间包并挂载到指定坐标
     * @param {object} packageData
     * @param {object} options — { lat, lon, name, access, address }
     * @param {string} userId
     * @returns {Promise<object>}
     */
    async importSpacePackage(packageData, options = {}, userId = '') {
      const response = await fetch(`${getBaseUrl()}/api/v1/space-packages/import`, {
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
     * @param {string} spaceId
     * @param {object} config — { backend, model, api_key, base_url }
     * @returns {Promise<object>}
     */
    async testLlmConfig(spaceId, config) {
      const response = await fetch(`${getBaseUrl()}/api/v1/spaces/${encodeURIComponent(spaceId)}/test-llm`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      })
      return readJson(response)
    },

    /**
     * 测试 LLM 配置是否可用（无需空间 ID，直接测试配置）
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
     * 删除空间
     * @param {string} spaceId
     * @param {string} userId
     * @returns {Promise<object>}
     */
    async deleteSpace(spaceId, userId = '') {
      const response = await fetch(`${getBaseUrl()}/api/v1/spaces/${encodeURIComponent(spaceId)}`, {
        method: 'DELETE',
        headers: buildHeaders(userId),
      })
      return readJson(response)
    },

    /**
     * 进入空间（密码验证）
     * @param {string} spaceId
     * @param {string} password - 密码
     * @param {string} userId
     * @returns {Promise<object>}
     */
    async enterSpace(spaceId, password = '', userId = '', visitorGender = '') {
      const response = await fetch(
        `${getBaseUrl()}/api/v1/spaces/${encodeURIComponent(spaceId)}/enter`,
        {
          method: 'POST',
          headers: buildJsonHeaders(userId),
          body: JSON.stringify({ password, visitor_gender: normalizeGender(visitorGender) }),
        }
      )
      return readJson(response)
    },

    /**
     * 获取空间访客状态列表（店主视图）
     * @param {string} spaceId
     * @param {string} userId
     * @returns {Promise<object>}
     */
    async getSpaceVisitors(spaceId, userId = '') {
      const response = await fetch(
        `${getBaseUrl()}/api/v1/spaces/${encodeURIComponent(spaceId)}/visitors`,
        { cache: 'no-store', headers: buildHeaders(userId) }
      )
      return readJson(response)
    },

    /**
     * 获取当前用户可见的结构化记忆
     * @param {string} spaceId
     * @param {object} filters — { scope, dimension, horizon, visibility, visitor_id, character_id, place_id, limit }
     * @param {string} userId
     * @returns {Promise<object>}
     */
    async listMemoryAtoms(spaceId, filters = {}, userId = '') {
      const params = new URLSearchParams()
      for (const key of ['scope', 'dimension', 'horizon', 'visibility', 'visitor_id', 'character_id', 'place_id', 'limit']) {
        if (filters[key] != null && filters[key] !== '') params.set(key, filters[key])
      }
      const response = await fetch(
        `${getBaseUrl()}/api/v1/spaces/${encodeURIComponent(spaceId)}/memory-atoms?${params}`,
        { cache: 'no-store', headers: buildHeaders(userId) }
      )
      return readJson(response)
    },

    /**
     * 创建结构化记忆
     * @param {string} spaceId
     * @param {object} data
     * @param {string} userId
     * @returns {Promise<object>}
     */
    async createMemoryAtom(spaceId, data, userId = '') {
      const response = await fetch(`${getBaseUrl()}/api/v1/spaces/${encodeURIComponent(spaceId)}/memory-atoms`, {
        method: 'POST',
        headers: buildJsonHeaders(userId),
        body: JSON.stringify(data),
      })
      return readJson(response)
    },

    /**
     * 更新结构化记忆
     * @param {string} spaceId
     * @param {string} memoryId
     * @param {object} data
     * @param {string} userId
     * @returns {Promise<object>}
     */
    async updateMemoryAtom(spaceId, memoryId, data, userId = '') {
      const response = await fetch(`${getBaseUrl()}/api/v1/spaces/${encodeURIComponent(spaceId)}/memory-atoms/${encodeURIComponent(memoryId)}`, {
        method: 'PUT',
        headers: buildJsonHeaders(userId),
        body: JSON.stringify(data),
      })
      return readJson(response)
    },

    /**
     * 删除结构化记忆
     * @param {string} spaceId
     * @param {string} memoryId
     * @param {string} userId
     * @returns {Promise<object>}
     */
    async deleteMemoryAtom(spaceId, memoryId, userId = '') {
      const response = await fetch(`${getBaseUrl()}/api/v1/spaces/${encodeURIComponent(spaceId)}/memory-atoms/${encodeURIComponent(memoryId)}`, {
        method: 'DELETE',
        headers: buildHeaders(userId),
      })
      return readJson(response)
    },

    /**
     * List memories for a visitor with visibility filtering and keyword search (new /memories endpoint).
     * @param {string} spaceId
     * @param {object} filters — { visitor_id, scope, dimension, horizon, pinned, keyword, limit, offset }
     * @param {string} userId
     * @returns {Promise<object>}
     */
    async listMemories(spaceId, filters = {}, userId = '') {
      const params = new URLSearchParams()
      for (const key of ['visitor_id', 'scope', 'dimension', 'horizon', 'keyword', 'limit', 'offset']) {
        if (filters[key] != null && filters[key] !== '') params.set(key, filters[key])
      }
      if (filters.pinned === true || filters.pinned === false) {
        params.set('pinned', filters.pinned)
      }
      const response = await fetch(
        `${getBaseUrl()}/api/v1/spaces/${encodeURIComponent(spaceId)}/memories?${params}`,
        { cache: 'no-store', headers: buildHeaders(userId) }
      )
      return readJson(response)
    },

    /**
     * Pin or unpin a memory atom.
     * @param {string} spaceId
     * @param {string} memoryId
     * @param {boolean} pinned
     * @param {string} userId
     * @returns {Promise<object>}
     */
    async togglePinMemory(spaceId, memoryId, pinned, userId = '') {
      return this.updateMemoryAtom(spaceId, memoryId, { pinned }, userId)
    },

    /**
     * Mark an auto-created memory as wrong (or restore it).
     * @param {string} spaceId
     * @param {string} memoryId
     * @param {object} metadata
     * @param {boolean} flagged
     * @param {string} userId
     * @returns {Promise<object>}
     */
    async markMemoryWrong(spaceId, memoryId, metadata = {}, flagged = true, userId = '') {
      return this.updateMemoryAtom(
        spaceId,
        memoryId,
        { metadata: { ...(metadata || {}), flagged_wrong: flagged } },
        userId
      )
    },

    /**
     * Send feedback on a memory atom (reinforce / correct / flag wrong).
     * @param {string} spaceId
     * @param {string} memoryId
     * @param {object} feedback — { correct: boolean, content?: string }
     *   - reinforce:   { correct: true }
     *   - correction: { correct: false, content: "new content" }
     *   - flag wrong:  { correct: false }
     * @param {string} userId
     * @returns {Promise<object>}
     */
    async feedbackMemoryAtom(spaceId, memoryId, feedback, userId = '') {
      const response = await fetch(
        `${getBaseUrl()}/api/v1/spaces/${encodeURIComponent(spaceId)}/memory-atoms/${encodeURIComponent(memoryId)}/feedback`,
        {
          method: 'POST',
          headers: buildJsonHeaders(userId),
          body: JSON.stringify({
            correct: feedback.correct ?? null,
            content: feedback.content ?? null,
          }),
        }
      )
      return readJson(response)
    },

    // ─── Character Management ──────────────────────────────────────

    /**
     * 获取空间角色列表
     * @param {string} spaceId
     * @param {string} userId
     * @returns {Promise<object>}
     */
    async getCharacters(spaceId, userId = '') {
      const response = await fetch(
        `${getBaseUrl()}/api/v1/spaces/${encodeURIComponent(spaceId)}/characters`,
        { cache: 'no-store', headers: buildHeaders(userId) }
      )
      return readJson(response)
    },

    /**
     * 添加角色
     * @param {string} spaceId
     * @param {object} data - 角色数据
     * @param {string} userId
     * @returns {Promise<object>}
     */
    async addCharacter(spaceId, data, userId = '') {
      const response = await fetch(
        `${getBaseUrl()}/api/v1/spaces/${encodeURIComponent(spaceId)}/characters`,
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
     * @param {string} spaceId
     * @param {object} cardData - SillyTavern Character Card V2 JSON
     * @param {string} userId
     * @returns {Promise<object>}
     */
    async importCharacterCard(spaceId, cardData, userId = '') {
      const response = await fetch(
        `${getBaseUrl()}/api/v1/spaces/${encodeURIComponent(spaceId)}/characters/import`,
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
     * @param {string} spaceId
     * @param {string} charId
     * @param {object} data
     * @param {string} userId
     * @returns {Promise<object>}
     */
    async updateCharacter(spaceId, charId, data, userId = '') {
      const response = await fetch(
        `${getBaseUrl()}/api/v1/spaces/${encodeURIComponent(spaceId)}/characters/${encodeURIComponent(charId)}`,
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
     * @param {string} spaceId
     * @param {string} charId
     * @param {string} userId
     * @returns {Promise<object>}
     */
    async deleteCharacter(spaceId, charId, userId = '') {
      const response = await fetch(
        `${getBaseUrl()}/api/v1/spaces/${encodeURIComponent(spaceId)}/characters/${encodeURIComponent(charId)}`,
        { method: 'DELETE', headers: buildHeaders(userId) }
      )
      return readJson(response)
    },

    // ─── Groups / Group Chat ─────────────────────────────────────

    /**
     * 获取持久化群组列表
     * @param {string} spaceId
     * @param {string} userId
     * @returns {Promise<object>}
     */
    async listGroups(spaceId = '', userId = '') {
      const params = new URLSearchParams()
      if (spaceId) params.set('space_id', spaceId)
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
     * @param {string} spaceId
     * @param {string} userId
     * @returns {Promise<object>}
     */
    async deleteGroup(groupId, spaceId, userId = '') {
      const response = await fetch(`${getBaseUrl()}/api/groups/${encodeURIComponent(groupId)}`, {
        method: 'DELETE',
        headers: buildJsonHeaders(userId),
        body: JSON.stringify({ space_id: spaceId }),
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

    // ─── Space Group Chat API ────────────────────────────────────

    /**
     * 获取空间持久群聊配置和角色发言积极度
     * @param {string} spaceId
     * @param {string} userId
     * @returns {Promise<object>}
     */
    async getGroupChatConfig(spaceId, userId = '') {
      const response = await fetch(`${getBaseUrl()}/api/v1/spaces/${encodeURIComponent(spaceId)}/group-chat`, {
        cache: 'no-store',
        headers: buildHeaders(userId),
      })
      return readJson(response)
    },

    /**
     * 保存空间持久群聊配置（店主）
     * @param {string} spaceId
     * @param {object} data — { group_chat_enabled, group_chat_config, character_talkativeness? }
     * @param {string} userId
     * @returns {Promise<object>}
     */
    async updateGroupChatConfig(spaceId, data, userId = '') {
      const response = await fetch(`${getBaseUrl()}/api/v1/spaces/${encodeURIComponent(spaceId)}/group-chat/config`, {
        method: 'PUT',
        headers: buildJsonHeaders(userId),
        body: JSON.stringify(data),
      })
      return readJson(response)
    },

    /**
     * 向空间持久群聊发送消息，由后端选择多个角色并返回回复
     * @param {string} spaceId
     * @param {string} message
     * @param {string} visitorId
     * @param {string} visitorName
     * @param {string} userId
     * @returns {Promise<object>}
     */
    async sendGroupChat(spaceId, message, visitorId, visitorName = '', userId = '', options = {}) {
      const cleanVisitorName = String(visitorName || '').trim().slice(0, 24)
      const cleanVisitorId = String(visitorId || userId || '').trim()
      const body = {
        message,
        visitor_id: cleanVisitorId,
        visitor_name: cleanVisitorName,
        visitor_gender: normalizeGender(options.visitorGender || options.visitor_gender),
      }
      const displayMessage = String(options.displayMessage || '').trim()
      if (displayMessage) {
        body.display_message = displayMessage
      }
      const response = await fetch(`${getBaseUrl()}/api/v1/spaces/${encodeURIComponent(spaceId)}/group-chat`, {
        method: 'POST',
        headers: buildJsonHeaders(userId || cleanVisitorId),
        body: JSON.stringify(body),
      })
      return readJson(response)
    },

    /**
     * 获取空间持久群聊历史
     * @param {string} spaceId
     * @param {string} visitorId
     * @param {string} userId
     * @param {number} limit
     * @returns {Promise<object>}
     */
    async getGroupChatHistory(spaceId, visitorId = '', userId = '', limit = 50) {
      const params = new URLSearchParams()
      const cleanVisitorId = String(visitorId || '').trim()
      if (cleanVisitorId) params.set('visitor_id', cleanVisitorId)
      if (limit != null) params.set('limit', limit)
      const response = await fetch(
        `${getBaseUrl()}/api/v1/spaces/${encodeURIComponent(spaceId)}/group-chat/history?${params}`,
        { cache: 'no-store', headers: buildHeaders(userId || cleanVisitorId) },
      )
      return readJson(response)
    },

    /**
     * 更新单个角色的群聊发言积极度（店主）
     * @param {string} spaceId
     * @param {string} characterId
     * @param {number} talkativeness
     * @param {string} userId
     * @returns {Promise<object>}
     */
    async updateTalkativeness(spaceId, characterId, talkativeness, userId = '') {
      const response = await fetch(
        `${getBaseUrl()}/api/v1/spaces/${encodeURIComponent(spaceId)}/characters/${encodeURIComponent(characterId)}/talkativeness`,
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
     * 获取空间语音配置
     * @param {string} spaceId
     * @param {string} userId
     * @returns {Promise<object>}
     */
    async getVoiceConfig(spaceId, userId = '') {
      const response = await fetch(`${getBaseUrl()}/api/v1/spaces/${encodeURIComponent(spaceId)}/voice`, {
        cache: 'no-store',
        headers: buildHeaders(userId),
      })
      return readJson(response)
    },

    /**
     * 保存空间语音配置（店主）
     * @param {string} spaceId
     * @param {object} config
     * @param {string} userId
     * @returns {Promise<object>}
     */
    async saveVoiceConfig(spaceId, config, userId = '') {
      const response = await fetch(`${getBaseUrl()}/api/v1/spaces/${encodeURIComponent(spaceId)}/voice`, {
        method: 'PUT',
        headers: buildJsonHeaders(userId),
        body: JSON.stringify(config),
      })
      return readJson(response)
    },

    /**
     * 预览 NPC 开场白的语音播放参数（不直接合成音频）。
     * @param {string} spaceId
     * @param {object} data
     * @param {string} data.characterId
     * @param {number} data.greetingIndex
     * @param {string} userId
     * @returns {Promise<object>}
     */
    async previewVoiceGreeting(spaceId, data = {}, userId = '') {
      const response = await fetch(`${getBaseUrl()}/api/v1/spaces/${encodeURIComponent(spaceId)}/voice-greeting/preview`, {
        method: 'POST',
        headers: buildJsonHeaders(userId),
        body: JSON.stringify({
          character_id: data.character_id || data.characterId || '',
          greeting_index: data.greeting_index ?? data.greetingIndex ?? 0,
        }),
      })
      return readJson(response)
    },

    /**
     * 预览共享瞬间纪念图提示词（不生成图片、不保存资产）。
     * @param {string} spaceId
     * @param {object} data
     * @param {string} userId
     * @returns {Promise<object>}
     */
    async previewVisualSouvenir(spaceId, data = {}, userId = '') {
      const response = await fetch(`${getBaseUrl()}/api/v1/spaces/${encodeURIComponent(spaceId)}/visual-souvenir/preview`, {
        method: 'POST',
        headers: buildJsonHeaders(userId),
        body: JSON.stringify({
          visitor_id: data.visitor_id || data.visitorId || '',
          character_id: data.character_id || data.characterId || '',
          user_message: data.user_message || data.userMessage || '',
          assistant_message: data.assistant_message || data.assistantMessage || '',
          style: data.style || '',
        }),
      })
      return readJson(response)
    },

    /**
     * 合成语音，返回可播放的 blob URL
     * @param {string} spaceId
     * @param {string} text
     * @param {string} characterId
     * @param {string} userId
     * @returns {Promise<string>}
     */
    async synthesizeVoice(spaceId, text, characterId = '', userId = '') {
      const response = await fetch(`${getBaseUrl()}/api/v1/spaces/${encodeURIComponent(spaceId)}/tts`, {
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
     * @param {string} spaceId
     * @param {Blob|File} audioFile
     * @param {string} userId
     * @returns {Promise<object>}
     */
    async transcribeVoice(spaceId, audioFile, userId = '') {
      const response = await fetch(`${getBaseUrl()}/api/v1/spaces/${encodeURIComponent(spaceId)}/stt`, {
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
     * 获取聊天会话摘要（店主看自己空间时默认返回全部访客会话）
     * @param {object} options
     * @param {string} options.spaceId
     * @param {string} options.characterId
     * @param {string} options.visitorId
     * @param {string} userId
     * @returns {Promise<object>}
     */
    async listChatSessions(options = {}, userId = '') {
      const params = new URLSearchParams()
      if (options.spaceId) params.set('space_id', options.spaceId)
      if (options.characterId) params.set('character_id', options.characterId)
      if (options.visitorId) params.set('visitor_id', options.visitorId)

      const response = await fetch(`${getBaseUrl()}/api/chats?${params}`, {
        cache: 'no-store',
        headers: buildHeaders(userId),
      })
      return readJson(response)
    },

    /**
     * 获取空间聊天记录
     * @param {string} spaceId
     * @param {string} visitorId
     * @param {string} characterId
     * @param {string} userId
     * @param {number} limit
     * @returns {Promise<object>}
     */
    async getChatHistory(spaceId, visitorId, characterId = null, userId = visitorId, limit = 50) {
      const params = new URLSearchParams({
        visitor_id: visitorId,
      })
      if (characterId) params.set('character_id', characterId)
      if (limit) params.set('limit', String(limit))

      const response = await fetch(
        `${getBaseUrl()}/api/v1/spaces/${encodeURIComponent(spaceId)}/chat?${params}`,
        { cache: 'no-store', headers: buildHeaders(userId) }
      )
      return readJson(response)
    },

    /**
     * 导出聊天记录
     * @param {object} options
     * @param {string} options.spaceId
     * @param {string} options.characterId
     * @param {string} options.visitorId
     * @param {'json'|'text'} options.format
     * @param {string} userId
     * @returns {Promise<object>}
     */
    async exportChatHistory(options = {}, userId = '') {
      const response = await fetch(`${getBaseUrl()}/api/v1/spaces/${encodeURIComponent(options.spaceId || '')}/chat/export`, {
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
     * 导出指定访客会话的剧集草稿（不调用 LLM，不保存导出结果）。
     * @param {object} options
     * @param {string} options.spaceId
     * @param {string} options.characterId
     * @param {string} options.visitorId
     * @param {string} options.title
     * @param {boolean} options.includePending
     * @param {string} userId
     * @returns {Promise<object>}
     */
    async exportEpisode(options = {}, userId = '') {
      const response = await fetch(`${getBaseUrl()}/api/v1/spaces/${encodeURIComponent(options.spaceId || '')}/episodes/export`, {
        method: 'POST',
        headers: buildJsonHeaders(userId),
        body: JSON.stringify({
          visitor_id: options.visitorId || '',
          character_id: options.characterId || '',
          title: options.title || '',
          include_pending: Boolean(options.includePending),
          format: options.format || 'markdown',
          limit: options.limit || 200,
        }),
      })
      return readJson(response)
    },

    /**
     * 搜索聊天记录
     * @param {object} options
     * @param {string} options.spaceId
     * @param {string} options.characterId
     * @param {string} options.visitorId
     * @param {string} options.query
     * @param {number} options.limit
     * @param {string} userId
     * @returns {Promise<object>}
     */
    async searchChatHistory(options = {}, userId = '') {
      const response = await fetch(`${getBaseUrl()}/api/v1/spaces/${encodeURIComponent(options.spaceId || '')}/chat/search`, {
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
     * @param {string} spaceId
     * @param {string} characterId
     * @param {string} message
     * @param {string} visitorId
     * @param {string} visitorName
     * @param {object} options
     * @returns {Promise<object>}
     */
    async sendChat(spaceId, characterId, message, visitorId, visitorName = '', options = {}) {
      const cleanVisitorName = String(visitorName || '').trim().slice(0, 24)
      const body = {
        character_id: characterId,
        message,
        visitor_id: visitorId,
        visitor_name: cleanVisitorName,
        visitor_gender: normalizeGender(options.visitorGender || options.visitor_gender),
      }
      if (Array.isArray(options.extra_context)) {
        body.extra_context = options.extra_context
      }
      const displayMessage = String(options.displayMessage || '').trim()
      if (displayMessage) {
        body.display_message = displayMessage
      }
      const response = await fetch(
        `${getBaseUrl()}/api/v1/spaces/${encodeURIComponent(spaceId)}/chat`,
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
     * @param {string} spaceId
     * @param {string} characterId
     * @param {string} userId
     * @returns {Promise<object>}
     */
    async getCharacterSprites(spaceId, characterId, userId = '') {
      const response = await fetch(
        `${getBaseUrl()}/api/v1/spaces/${encodeURIComponent(spaceId)}/characters/${encodeURIComponent(characterId)}/sprites`,
        { headers: buildHeaders(userId) }
      )
      return readJson(response)
    },

    /**
     * 更新角色的立绘配置
     * @param {string} spaceId
     * @param {string} characterId
     * @param {object} sprites - 键为表情名，值为 URL
     * @param {string} userId
     * @returns {Promise<object>}
     */
    async updateCharacterSprites(spaceId, characterId, sprites, userId = '') {
      const response = await fetch(
        `${getBaseUrl()}/api/v1/spaces/${encodeURIComponent(spaceId)}/characters/${encodeURIComponent(characterId)}/sprites`,
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
     * @param {string} spaceId - 空间 ID
     * @param {string} characterId - 角色 ID
     * @returns {Promise<object>}
     */
    async inferExpression(text, characterName = '', spaceId = '', characterId = '') {
      const response = await fetch(`${getBaseUrl()}/api/v1/expression/infer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, character_name: characterName, space_id: spaceId, character_id: characterId }),
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
 * @returns {object} FableSpace 角色数据
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
 * 从 PNG 文件提取原始 SillyTavern 角色卡 JSON
 * 注意：此函数需要 FileReader API，在浏览器中运行
 * @param {File} file - PNG 文件
 * @returns {Promise<object>} 原始角色卡 JSON payload
 */
export async function extractCharacterCardPayloadFromPng(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const buffer = e.target.result
        const cardData = _extractFromPngBuffer(buffer)
        if (cardData) {
          resolve(cardData)
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
 * 从 PNG 文件提取并归一化 SillyTavern 角色卡
 * 注意：此函数需要 FileReader API，在浏览器中运行
 * @param {File} file - PNG 文件
 * @returns {Promise<object>} FableSpace 角色数据
 */
export async function extractCharacterCardFromPng(file) {
  const cardData = await extractCharacterCardPayloadFromPng(file)
  return parseCharacterCard(cardData)
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

export const SPACE_ACCESS_META = {
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
  return SPACE_ACCESS_META[access] || {
    label: access || '未知',
    icon: '❓',
    tone: 'unknown',
    markerLabel: access || '未知',
    description: '入口类型未标记',
  }
}

/**
 * 空间状态颜色
 * @param {string} status
 * @returns {string}
 */
export function getSpaceStatusColor(status) {
  if (status === 'open') return '#22c55e'
  if (status === 'closed') return '#ef4444'
  return '#94a3b8'
}

// ─── Voice (TTS/STT) API ───────────────────────────────────────────────────────

/**
 * 获取空间的语音配置
 * @param {string} spaceId
 * @returns {Promise<object>}
 */
export async function getVoiceConfig(spaceId) {
  const response = await fetch(`/api/spaces/${spaceId}/voice`, {
    credentials: 'include',
  })
  if (!response.ok) {
    throw new Error(`获取语音配置失败: ${response.status}`)
  }
  return response.json()
}

/**
 * 保存空间的语音配置
 * @param {string} spaceId
 * @param {object} config - VoiceConfig object
 * @returns {Promise<object>}
 */
export async function saveVoiceConfig(spaceId, config) {
  const response = await fetch(`/api/spaces/${spaceId}/voice`, {
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
 * @param {string} spaceId
 * @param {string} text - Text to synthesize
 * @param {string} characterId - Optional character ID
 * @returns {Promise<string>} - Audio URL (blob URL that must be consumed immediately)
 */
export async function synthesizeVoice(spaceId, text, characterId = '') {
  const response = await fetch(`/api/spaces/${spaceId}/tts`, {
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
 * @param {string} spaceId
 * @param {Blob|File} audioFile - Audio file to transcribe
 * @returns {Promise<object>} - { text, provider }
 */
export async function transcribeVoice(spaceId, audioFile) {
  const response = await fetch(`/api/spaces/${spaceId}/stt`, {
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
 * 空间状态标签
 * @param {string} status
 * @returns {string}
 */
export function getSpaceStatusLabel(status) {
  if (status === 'open') return '营业中'
  if (status === 'closed') return '歇业中'
  return '未知'
}

/**
 * 访问类型标签
 * @param {string} access
 * @returns {string}
 */
export function getSpaceAccessLabel(access) {
  return getAccessMeta(access).label
}

/**
 * 访问类型图标
 * @param {string} access
 * @returns {string}
 */
export function getSpaceAccessIcon(access) {
  return getAccessMeta(access).icon
}

/**
 * 访问类型色调 class 后缀
 * @param {string} access
 * @returns {string}
 */
export function getSpaceAccessTone(access) {
  return getAccessMeta(access).tone
}

/**
 * 地图 marker 上的短标签
 * @param {string} access
 * @returns {string}
 */
export function getSpaceAccessMarkerLabel(access) {
  return getAccessMeta(access).markerLabel
}

/**
 * 访问类型说明
 * @param {string} access
 * @returns {string}
 */
export function getSpaceAccessDescription(access) {
  return getAccessMeta(access).description
}

/**
 * 格式化距离
 * @param {number} meters
 * @returns {string}
 */
export function formatSpaceDistance(meters) {
  if (meters == null) return ''
  if (meters < 1000) return `${Math.round(meters)}m`
  return `${(meters / 1000).toFixed(1)}km`
}

// NOTE: Routes updated to /api/v1/* for native v1 parity.
// These are kept as compatibility layer. Prefer lib/spaces.ts for new code.

let _defaultService = null

/**
 * 获取默认的 Space Service（使用环境变量中的 API 地址）
 * @returns {object}
 */
export function getDefaultSpaceService() {
  if (!_defaultService) {
    _defaultService = createSpaceService(() => {
      const base = import.meta.env.VITE_API_BASE?.trim()
      return base ? base.replace(/\/$/, '') : ''
    })
  }
  return _defaultService
}
