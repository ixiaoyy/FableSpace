export const LAST_WORLD_STORAGE_KEY = 'fablemap:last-world-session'
export const LAST_WRITEBACK_STORAGE_KEY = 'fablemap:last-writeback-session'

export function isPersistedResultUsable(result) {
  return Boolean(result && typeof result === 'object' && result.preview_url)
}

export function isWritebackResultUsable(result) {
  return Boolean(result && typeof result === 'object' && result.event && result.persistence)
}

export function loadPersistedWorldSession(initialForm, defaultVisibleMapLayers) {
  if (typeof window === 'undefined') {
    return null
  }

  try {
    const raw = window.localStorage.getItem(LAST_WORLD_STORAGE_KEY)
    if (!raw) {
      return null
    }
    const payload = JSON.parse(raw)
    if (!payload || typeof payload !== 'object') {
      return null
    }

    const restoredResult = payload.result && typeof payload.result === 'object' ? payload.result : null

    return {
      form: payload.form && typeof payload.form === 'object' ? { ...initialForm, ...payload.form } : null,
      result: isPersistedResultUsable(restoredResult) ? restoredResult : null,
      originLabel: typeof payload.originLabel === 'string' ? payload.originLabel : '',
      originHint: typeof payload.originHint === 'string' ? payload.originHint : '',
      visibleLayers:
        payload.visibleLayers && typeof payload.visibleLayers === 'object'
          ? { ...defaultVisibleMapLayers, ...payload.visibleLayers }
          : defaultVisibleMapLayers,
      mapLayerPanelOpen: typeof payload.mapLayerPanelOpen === 'boolean' ? payload.mapLayerPanelOpen : true,
      lastUpdatedAt: typeof payload.lastUpdatedAt === 'string' ? payload.lastUpdatedAt : '',
    }
  } catch {
    return null
  }
}

export function loadPersistedWritebackSession(initialWritebackForm) {
  if (typeof window === 'undefined') {
    return null
  }

  try {
    const raw = window.localStorage.getItem(LAST_WRITEBACK_STORAGE_KEY)
    if (!raw) {
      return null
    }
    const payload = JSON.parse(raw)
    if (!payload || typeof payload !== 'object') {
      return null
    }

    return {
      sliceId: typeof payload.sliceId === 'string' ? payload.sliceId : '',
      activePoiId: typeof payload.activePoiId === 'string' ? payload.activePoiId : null,
      activePoi: payload.activePoi && typeof payload.activePoi === 'object' ? payload.activePoi : null,
      familiarityMap: payload.familiarityMap && typeof payload.familiarityMap === 'object' ? payload.familiarityMap : {},
      writebackForm:
        payload.writebackForm && typeof payload.writebackForm === 'object'
          ? { ...initialWritebackForm, ...payload.writebackForm }
          : null,
      writebackResult: isWritebackResultUsable(payload.writebackResult) ? payload.writebackResult : null,
      lastUpdatedAt: typeof payload.lastUpdatedAt === 'string' ? payload.lastUpdatedAt : '',
    }
  } catch {
    return null
  }
}

export function persistWorldSession(session) {
  if (typeof window === 'undefined') {
    return
  }

  try {
    window.localStorage.setItem(
      LAST_WORLD_STORAGE_KEY,
      JSON.stringify({
        ...session,
        result: isPersistedResultUsable(session?.result) ? session.result : null,
        lastUpdatedAt: new Date().toISOString(),
      })
    )
  } catch {
  }
}

export function persistWritebackSession(session, initialWritebackForm) {
  if (typeof window === 'undefined') {
    return
  }

  try {
    window.localStorage.setItem(
      LAST_WRITEBACK_STORAGE_KEY,
      JSON.stringify({
        ...session,
        writebackForm:
          session?.writebackForm && typeof session.writebackForm === 'object'
            ? { ...initialWritebackForm, ...session.writebackForm }
            : null,
        writebackResult: isWritebackResultUsable(session?.writebackResult) ? session.writebackResult : null,
        familiarityMap:
          session?.familiarityMap && typeof session.familiarityMap === 'object' ? session.familiarityMap : {},
        lastUpdatedAt: new Date().toISOString(),
      })
    )
  } catch {
  }
}
