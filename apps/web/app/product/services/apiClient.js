export function getDefaultApiBase() {
  const envBase = import.meta.env.VITE_API_BASE?.trim()
  if (envBase) {
    return envBase.replace(/\/$/, '')
  }
  return ''
}

export function createApiClient(getBaseUrl) {
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
          throw new Error(`API returned HTML instead of JSON. The frontend is likely talking to the Vite shell, not FastAPI. (${response.url})`)
        }
        throw new Error(`API returned invalid JSON (${response.status}): ${snippet}`)
      }
    }

    if (!response.ok) {
      throw new Error(apiErrorMessage(payload, response.status))
    }
    return unwrapApiPayload(payload)
  }

  return {
    async getHealth() {
      const response = await fetch(`${getBaseUrl()}/api/health`, { cache: 'no-store' })
      return readJson(response)
    },
    async getMeta() {
      const response = await fetch(`${getBaseUrl()}/api/meta`, { cache: 'no-store' })
      return readJson(response)
    },
    async createNearbyPreview(form) {
      const response = await fetch(`${getBaseUrl()}/api/nearby`, {
        method: 'POST',
        body: new URLSearchParams(form),
      })
      return readJson(response)
    },
    async submitWorldEvent(event) {
      const response = await fetch(`${getBaseUrl()}/api/world/event`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(event),
      })
      return readJson(response)
    },
    async postGhostTrace(payload) {
      const response = await fetch(`${getBaseUrl()}/api/ghost/trace`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      return readJson(response)
    },
    async getGhostTraces(playerId) {
      const response = await fetch(`${getBaseUrl()}/api/ghost/traces/${encodeURIComponent(playerId)}`, { cache: 'no-store' })
      return readJson(response)
    },
    async injectDisturbance(payload) {
      const response = await fetch(`${getBaseUrl()}/api/world/disturbance`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      return readJson(response)
    },
    async clearDisturbance(sliceId) {
      const response = await fetch(`${getBaseUrl()}/api/world/disturbance/${encodeURIComponent(sliceId)}`, { method: 'DELETE' })
      return readJson(response)
    },
    async chat(payload) {
      const response = await fetch(`${getBaseUrl()}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      return readJson(response)
    },
    async getChatHistory(playerId, poiId, characterId = null) {
      const params = new URLSearchParams({ player_id: playerId, poi_id: poiId })
      if (characterId) params.append('character_id', characterId)
      const response = await fetch(`${getBaseUrl()}/api/chat/history?${params}`, {
        cache: 'no-store',
      })
      return readJson(response)
    },
  }
}
