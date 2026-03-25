import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createApiClient, getDefaultApiBase } from '../services/apiClient'
import {
  buildSliceHighlights,
  buildWorldAtmosphere,
  buildWritebackResidue,
  buildWritebackRevisitSummary,
  buildWritebackTimeline,
  clampObserveIntensity,
  getPoiFactionLabel,
  getPoiTypeLabel,
  getWritebackTargetSummary,
  matchesPoiSearch,
  normalizeSearchText,
  pickPresetMeta,
} from '../services/appDisplay'
import {
  loadPersistedWorldSession,
  loadPersistedWritebackSession,
  persistWorldSession,
  persistWritebackSession,
} from '../services/sessionPersistence'

export function useWorldSession({
  initialForm,
  initialWritebackForm,
  locationPresets,
  defaultVisibleMapLayers,
  mapLayerOptions,
  mapLayerPresets,
  writebackActions,
  visibilityOptions,
}) {
  const restoredSession = useMemo(() => loadPersistedWorldSession(initialForm, defaultVisibleMapLayers), [initialForm, defaultVisibleMapLayers])
  const restoredWritebackSession = useMemo(() => loadPersistedWritebackSession(initialWritebackForm), [initialWritebackForm])

  const [apiBase, setApiBase] = useState(getDefaultApiBase)
  const [checking, setChecking] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [orchestrationEvents, setOrchestrationEvents] = useState([])
  const [statusOk, setStatusOk] = useState(false)
  const [statusText, setStatusText] = useState('等待连接 FastAPI...')
  const [statusDetail, setStatusDetail] = useState('')
  const [result, setResult] = useState(restoredSession?.result || null)
  const [errorText, setErrorText] = useState('')
  const [form, setForm] = useState(restoredSession?.form || initialForm)
  const [originLabel, setOriginLabel] = useState(restoredSession?.originLabel || '上海默认切片')
  const [originHint, setOriginHint] = useState(restoredSession?.originHint || '默认先落在国内城市坐标，离线样例仅用于验证流程。')
  const [lastSessionAt] = useState(restoredSession?.lastUpdatedAt || '')
  const [locating, setLocating] = useState(false)
  const [autoEntering, setAutoEntering] = useState(false)
  const [advancedOpen, setAdvancedOpen] = useState(Boolean(restoredSession?.result))
  const [writebackForm, setWritebackForm] = useState(restoredWritebackSession?.writebackForm || initialWritebackForm)
  const [writebackSubmitting, setWritebackSubmitting] = useState(false)
  const [writebackResult, setWritebackResult] = useState(restoredWritebackSession?.writebackResult || null)
  const [writebackError, setWritebackError] = useState('')
  const [behaviorInsights, setBehaviorInsights] = useState(null)
  const [adminOpen, setAdminOpen] = useState(false)
  const [activePoiId, setActivePoiId] = useState(restoredWritebackSession?.activePoiId || null)
  const [visibleMapLayers, setVisibleMapLayers] = useState(restoredSession?.visibleLayers || defaultVisibleMapLayers)
  const [mapLayerPanelOpen, setMapLayerPanelOpen] = useState(
    typeof restoredSession?.mapLayerPanelOpen === 'boolean' ? restoredSession.mapLayerPanelOpen : true
  )
  const [ghostTraces, setGhostTraces] = useState([])
  const [disturbanceForm, setDisturbanceForm] = useState({ weather: '', traffic_level: '', crowd_density: '', event_tag: '' })
  const [disturbanceActive, setDisturbanceActive] = useState(null)
  const [disturbanceSubmitting, setDisturbanceSubmitting] = useState(false)
  const pendingWaypointsRef = useRef([])
  const autoEntryStartedRef = useRef(false)
  const [activePoi, setActivePoi] = useState(restoredWritebackSession?.activePoi || null)
  const [familiarityMap, setFamiliarityMap] = useState(restoredWritebackSession?.familiarityMap || {})
  const [poiSearch, setPoiSearch] = useState('')
  const [poiTypeFilter, setPoiTypeFilter] = useState('all')
  const [poiFactionFilter, setPoiFactionFilter] = useState('all')
  const [poiOnlyFamiliar, setPoiOnlyFamiliar] = useState(false)

  const api = useMemo(() => createApiClient(() => apiBase.replace(/\/$/, '')), [apiBase])
  const presetMeta = pickPresetMeta(form, locationPresets)
  const previewUrl = result?.preview_url || ''
  const worldPois = result?.world?.pois || []
  const normalizedPoiSearch = normalizeSearchText(poiSearch)
  const poiTypeOptions = useMemo(
    () => Array.from(new Set(worldPois.map((poi) => getPoiTypeLabel(poi)).filter(Boolean))).sort((a, b) => a.localeCompare(b, 'zh-CN')),
    [worldPois]
  )
  const poiFactionOptions = useMemo(
    () => Array.from(new Set(worldPois.map((poi) => getPoiFactionLabel(poi)).filter(Boolean))).sort((a, b) => a.localeCompare(b, 'zh-CN')),
    [worldPois]
  )
  const filteredWorldPois = useMemo(() => {
    return worldPois.filter((poi) => {
      const matchesQuery = matchesPoiSearch(poi, normalizedPoiSearch)
      const matchesType = poiTypeFilter === 'all' || getPoiTypeLabel(poi) === poiTypeFilter
      const matchesFaction = poiFactionFilter === 'all' || getPoiFactionLabel(poi) === poiFactionFilter
      const familiarity = familiarityMap?.[poi.id] ?? 0
      const matchesFamiliarity = !poiOnlyFamiliar || familiarity > 0
      return matchesQuery && matchesType && matchesFaction && matchesFamiliarity
    })
  }, [familiarityMap, normalizedPoiSearch, poiFactionFilter, poiOnlyFamiliar, poiTypeFilter, worldPois])
  const poiSearchSummary = result
    ? `当前匹配 ${filteredWorldPois.length} / ${worldPois.length} 个 POI`
    : '生成切片后可按名称、势力与类型筛选 POI'
  const recentEchoes = writebackResult?.place_state?.recent_echoes || []
  const recentMarks = writebackResult?.place_state?.marks || []
  const placeLegend = writebackResult?.place_state?.place_legend || null
  const honorBoard = writebackResult?.place_state?.honor_board || []
  const playerState = writebackResult?.player_state || null
  const feedback = writebackResult?.world_feedback || null
  const writebackTimeline = buildWritebackTimeline(writebackResult)
  const writebackResidues = buildWritebackResidue(writebackResult?.place_state)
  const selectedActionMeta = writebackActions.find((item) => item.eventType === writebackForm.eventType) || writebackActions[0]
  const selectedVisibilityMeta = visibilityOptions.find((item) => item.value === writebackForm.visibility) || visibilityOptions[0]
  const lastWritebackPoiId =
    writebackResult?.event?.target?.target_type === 'poi'
      ? writebackResult?.event?.target?.target_id || null
      : null
  const resolvedActivePoi = useMemo(() => {
    if (!worldPois.length) {
      return activePoi
    }

    const candidateIds = [activePoiId, activePoi?.id, lastWritebackPoiId, writebackForm.targetId].filter(Boolean)
    for (const candidateId of candidateIds) {
      const matchedPoi = worldPois.find((poi) => poi.id === candidateId)
      if (matchedPoi) {
        return matchedPoi
      }
    }

    return activePoi
  }, [activePoi, activePoiId, lastWritebackPoiId, worldPois, writebackForm.targetId])
  const writebackTargetSummary = getWritebackTargetSummary(resolvedActivePoi, writebackForm)
  const revisitSummary = buildWritebackRevisitSummary(result, writebackResult, familiarityMap, writebackForm)
  const sliceHighlights = buildSliceHighlights(result)
  const worldAtmosphere = buildWorldAtmosphere(result)

  function updateForm(key, value) {
    setForm((current) => ({ ...current, [key]: value }))
  }

  function updateWritebackForm(key, value) {
    setWritebackForm((current) => ({ ...current, [key]: value }))
  }

  function toggleMapLayer(layerKey) {
    setVisibleMapLayers((current) => ({
      ...current,
      [layerKey]: !current[layerKey],
    }))
  }

  function setAllMapLayers(nextValue) {
    setVisibleMapLayers(
      mapLayerOptions.reduce((acc, layer) => {
        acc[layer.key] = nextValue
        return acc
      }, {})
    )
  }

  function resetMapLayers() {
    setVisibleMapLayers({ ...defaultVisibleMapLayers })
  }

  function applyMapLayerPreset(presetKey) {
    const preset = mapLayerPresets.find((item) => item.key === presetKey)
    if (!preset) {
      return
    }
    setVisibleMapLayers({ ...preset.layers })
  }

  function applyOrigin(nextForm, nextLabel, nextHint) {
    setForm((current) => ({ ...current, ...nextForm }))
    setOriginLabel(nextLabel)
    setOriginHint(nextHint)
  }

  function applyMeta(meta) {
    if (!meta) {
      return
    }
    const coords = meta.default_coordinates || {}
    setForm((current) => {
      if (restoredSession?.form) {
        return current
      }
      return {
        ...current,
        lat: typeof coords.lat === 'number' ? String(coords.lat) : current.lat,
        lon: typeof coords.lon === 'number' ? String(coords.lon) : current.lon,
        radius: typeof coords.radius === 'number' ? String(coords.radius) : current.radius,
        mode: meta.default_mode || current.mode,
      }
    })
  }

  async function checkBackend() {
    setChecking(true)
    setStatusOk(false)
    setStatusText('正在检查 FastAPI 服务...')
    setStatusDetail('')
    try {
      const [health, meta] = await Promise.all([api.getHealth(), api.getMeta()])
      applyMeta(meta)
      setStatusOk(true)
      setStatusText(`FastAPI 已连接 · ${meta.project || 'FableMap'}`)
      setStatusDetail(
        `api=${meta.api_base || apiBase} · frontend_mode=${meta.frontend_mode} · fixture_available=${health.fixture_available}`
      )
    } catch (error) {
      setStatusOk(false)
      setStatusText('FastAPI 不可用')
      setStatusDetail(error.message || String(error))
    } finally {
      setChecking(false)
    }
  }

  function usePreset(preset) {
    applyOrigin(
      {
        lat: preset.lat,
        lon: preset.lon,
        radius: preset.radius,
        mode: preset.mode,
      },
      preset.title,
      preset.subtitle
    )
    setErrorText('')
  }

  const submitNearby = useCallback(async (refresh, overrideForm = null, options = {}) => {
    const requestForm = overrideForm || form
    const { keepAdvancedState = false } = options
    setSubmitting(true)
    setErrorText(refresh ? '正在刷新附近世界...' : '正在生成附近世界...')
    try {
      const payload = await api.createNearbyPreview({
        lat: requestForm.lat,
        lon: requestForm.lon,
        radius: requestForm.radius,
        mode: requestForm.mode,
        seed: requestForm.seed,
        refresh: refresh ? 'true' : 'false',
      })
      const nextSliceId = payload.world_id || ''
      const fallbackPrimaryPoiId = payload.world?.pois?.[0]?.id || ''
      const fallbackPrimaryZoneId = payload.world?.map2d?.encounter_zones?.[0]?.id || ''
      const primaryPoiId = payload.primary_poi_id || fallbackPrimaryPoiId
      const primaryZoneId = payload.primary_zone_id || fallbackPrimaryZoneId
      const canReuseWriteback = Boolean(
        restoredWritebackSession?.sliceId &&
          nextSliceId &&
          restoredWritebackSession.sliceId === nextSliceId
      )

      if (overrideForm) {
        setForm((current) => ({ ...current, ...overrideForm }))
      }

      setResult(payload)
      if (!keepAdvancedState) {
        setAdvancedOpen(true)
      }
      setErrorText('')

      if (canReuseWriteback) {
        setActivePoiId(restoredWritebackSession?.activePoiId || primaryPoiId || null)
        setActivePoi(restoredWritebackSession?.activePoi || null)
        setFamiliarityMap(restoredWritebackSession?.familiarityMap || {})
        setWritebackResult(restoredWritebackSession?.writebackResult || null)
        setWritebackForm((current) => ({
          ...current,
          ...(restoredWritebackSession?.writebackForm || {}),
          sliceId: nextSliceId || current.sliceId,
          targetId:
            restoredWritebackSession?.writebackForm?.targetId ||
            primaryPoiId ||
            current.targetId,
          zoneId:
            restoredWritebackSession?.writebackForm?.zoneId ||
            primaryZoneId ||
            current.zoneId,
        }))
      } else {
        setActivePoiId(primaryPoiId || null)
        setActivePoi(null)
        setFamiliarityMap({})
        setWritebackResult(null)
        setWritebackForm((current) => ({
          ...current,
          sliceId: nextSliceId || current.sliceId,
          targetId: primaryPoiId || current.targetId,
          zoneId: primaryZoneId || current.zoneId,
        }))
      }
    } catch (error) {
      setErrorText(`生成失败：${error.message || String(error)}`)
    } finally {
      setSubmitting(false)
    }
  }, [api, form, restoredWritebackSession])

  const useCurrentLocation = useCallback(async ({ autoSubmit = false, refresh = false, openAdvanced = true, suppressError = false } = {}) => {
    if (!navigator.geolocation) {
      if (!suppressError) {
        setErrorText('当前浏览器不支持定位，可先使用预设入口或手动填写高级坐标。')
      }
      if (autoSubmit) {
        await submitNearby(refresh, null, { keepAdvancedState: !openAdvanced })
      }
      return false
    }

    setLocating(true)
    setErrorText('')

    const getCurrentPosition = () => new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(resolve, reject, {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000,
      })
    })

    try {
      const position = await getCurrentPosition()
      const nextForm = {
        lat: position.coords.latitude.toFixed(6),
        lon: position.coords.longitude.toFixed(6),
        radius: form.radius || '300',
        mode: 'live',
        seed: form.seed,
      }
      applyOrigin(
        nextForm,
        '我的当前位置',
        autoSubmit ? '已根据你的浏览器定位自动生成附近世界。' : '已抓取浏览器定位，可直接生成你附近的世界切片。'
      )
      setAdvancedOpen(openAdvanced)
      if (autoSubmit) {
        await submitNearby(refresh, nextForm, { keepAdvancedState: !openAdvanced })
      }
      return true
    } catch (error) {
      if (!suppressError) {
        setErrorText(`定位失败：${error.message || '浏览器拒绝了位置权限。'}`)
      }
      if (autoSubmit) {
        setOriginHint('定位失败，已回退到默认入口并自动生成附近世界。')
        await submitNearby(refresh, null, { keepAdvancedState: !openAdvanced })
      }
      return false
    } finally {
      setLocating(false)
    }
  }, [form, submitNearby])

  function handlePoiClick(poiId, poi) {
    setActivePoiId(poiId)
    setActivePoi(poi)
    setWritebackError('')
    setWritebackForm((current) => ({
      ...current,
      targetId: poi?.id || current.targetId,
      targetType: 'poi',
      eventType: current.eventType || 'observe',
    }))
  }

  function handleOrchestrationEvent(event) {
    if (!event) {
      return
    }
    setOrchestrationEvents((current) => [...current, event].slice(-4))
  }

  function focusWritebackTarget() {
    const targetId = lastWritebackPoiId || writebackForm.targetId
    if (!targetId) {
      setWritebackError('当前没有可回焦的 POI 写回目标。')
      return
    }

    const matchedPoi = worldPois.find((poi) => poi.id === targetId)
    if (!matchedPoi) {
      setWritebackError(`未能在当前切片中找到 ${targetId}，请先重新选择一个据点。`)
      return
    }

    setWritebackError('')
    handlePoiClick(matchedPoi.id, matchedPoi)
  }

  function applyWritebackAction(eventType) {
    setWritebackError('')
    setWritebackForm((current) => ({
      ...current,
      eventType,
      targetType: eventType === 'dwell' ? 'zone' : 'poi',
      targetId:
        eventType === 'dwell'
          ? current.zoneId || result?.primary_zone_id || current.targetId
          : activePoi?.id || current.targetId || result?.primary_poi_id,
      intensity: eventType === 'observe' ? current.intensity : current.intensity,
    }))
  }

  async function submitWriteback() {
    setWritebackSubmitting(true)
    setWritebackError('')
    setWritebackResult(null)

    const targetType = writebackForm.eventType === 'dwell' ? 'zone' : writebackForm.targetType
    const targetId =
      writebackForm.eventType === 'dwell'
        ? writebackForm.zoneId || result?.primary_zone_id || writebackForm.targetId
        : writebackForm.targetId

    const event = {
      event_type: writebackForm.eventType,
      player_id: writebackForm.playerId,
      visibility: writebackForm.visibility,
      target: {
        target_type: targetType,
        target_id: targetId,
        slice_id: writebackForm.sliceId,
      },
      payload:
        writebackForm.eventType === 'mark'
          ? {
              tag: writebackForm.tag,
              note: writebackForm.note,
            }
          : writebackForm.eventType === 'observe'
            ? {
                intensity: clampObserveIntensity(writebackForm.intensity),
                note: writebackForm.note,
              }
            : {
                zone_id: writebackForm.zoneId,
                note: writebackForm.note,
              },
      source: {
        client: 'web',
        surface: 'react_writeback_panel',
        version: 'v0.1',
      },
      context: {
        current_zone_id: writebackForm.zoneId,
        nearest_poi_id: resolvedActivePoi?.id || writebackForm.targetId,
      },
    }

    try {
      const payload = await api.submitWorldEvent(event)
      setWritebackResult(payload)
      setWritebackForm((current) => ({
        ...current,
        targetType,
        targetId,
      }))
      const poiFam = payload?.player_state?.poi_familiarity || {}
      if (Object.keys(poiFam).length > 0) {
        setFamiliarityMap((current) => ({ ...current, ...poiFam }))
      }
      setBehaviorInsights(payload?.behavior_insights || null)
      if (writebackForm.eventType === 'observe' && targetId) {
        const waypoint = { poi_id: targetId, timestamp: new Date().toISOString(), action_state: 'observe' }
        pendingWaypointsRef.current = [...pendingWaypointsRef.current, waypoint]
        if (pendingWaypointsRef.current.length >= 3) {
          const waypoints = pendingWaypointsRef.current
          pendingWaypointsRef.current = []
          api.postGhostTrace({
            player_id: writebackForm.playerId,
            waypoints,
            mood_arc: ['curious'],
            visibility: writebackForm.visibility || 'local_public',
          }).then((data) => {
            if (data?.trace_id) {
              setGhostTraces((current) => [...current, data])
            }
          }).catch(() => {})
        }
      }
    } catch (error) {
      setWritebackError(`写回失败：${error.message || String(error)}`)
    } finally {
      setWritebackSubmitting(false)
    }
  }

  async function submitDisturbance() {
    if (!result?.world_id) return
    setDisturbanceSubmitting(true)
    try {
      const payload = {
        slice_id: result.world_id,
        weather: disturbanceForm.weather || null,
        traffic_level: disturbanceForm.traffic_level ? parseFloat(disturbanceForm.traffic_level) : null,
        crowd_density: disturbanceForm.crowd_density ? parseFloat(disturbanceForm.crowd_density) : null,
        event_tag: disturbanceForm.event_tag || null,
      }
      const data = await api.injectDisturbance(payload)
      setDisturbanceActive(data?.active || null)
    } catch {
      // ignore disturbance injection failures in UI flow
    } finally {
      setDisturbanceSubmitting(false)
    }
  }

  async function clearDisturbance() {
    if (!result?.world_id) return
    await api.clearDisturbance(result.world_id).catch(() => {})
    setDisturbanceActive(null)
  }

  useEffect(() => {
    checkBackend()
  }, [])

  useEffect(() => {
    if (restoredSession?.result || autoEntryStartedRef.current) {
      return
    }

    autoEntryStartedRef.current = true
    setAutoEntering(true)

    Promise.resolve(useCurrentLocation({
      autoSubmit: true,
      openAdvanced: false,
      suppressError: true,
    })).finally(() => {
      setAutoEntering(false)
    })
  }, [restoredSession?.result, useCurrentLocation])

  useEffect(() => {
    setOrchestrationEvents([])
  }, [result?.world_id, writebackForm.playerId])

  useEffect(() => {
    if (!result?.world_id || !writebackForm.playerId) return
    api.getGhostTraces(writebackForm.playerId)
      .then((data) => setGhostTraces(data?.traces || []))
      .catch(() => {})
  }, [api, result?.world_id, writebackForm.playerId])

  useEffect(() => {
    persistWorldSession({
      form,
      result,
      originLabel,
      originHint,
      visibleLayers: visibleMapLayers,
      mapLayerPanelOpen,
    })
  }, [form, result, originLabel, originHint, visibleMapLayers, mapLayerPanelOpen])

  useEffect(() => {
    persistWritebackSession(
      {
        sliceId: result?.world_id || writebackForm.sliceId,
        activePoiId,
        activePoi,
        familiarityMap,
        writebackForm,
        writebackResult,
      },
      initialWritebackForm
    )
  }, [activePoi, activePoiId, familiarityMap, initialWritebackForm, result, writebackForm, writebackResult])

  return {
    adminOpen,
    advancedOpen,
    apiBase,
    applyMapLayerPreset,
    applyWritebackAction,
    behaviorInsights,
    checkBackend,
    checking,
    clearDisturbance,
    disturbanceActive,
    disturbanceForm,
    disturbanceSubmitting,
    errorText,
    familiarityMap,
    feedback,
    filteredWorldPois,
    focusWritebackTarget,
    form,
    ghostTraces,
    handleOrchestrationEvent,
    handlePoiClick,
    honorBoard,
    lastSessionAt,
    lastWritebackPoiId,
    locating,
    autoEntering,
    mapLayerPanelOpen,
    orchestrationEvents,
    originHint,
    originLabel,
    placeLegend,
    playerState,
    poiFactionFilter,
    poiFactionOptions,
    poiOnlyFamiliar,
    poiSearch,
    poiSearchSummary,
    poiTypeFilter,
    poiTypeOptions,
    presetMeta,
    previewUrl,
    recentEchoes,
    recentMarks,
    resolvedActivePoi,
    result,
    revisitSummary,
    selectedActionMeta,
    selectedVisibilityMeta,
    setAdminOpen,
    setAdvancedOpen,
    setApiBase,
    setDisturbanceForm,
    setMapLayerPanelOpen,
    setPoiFactionFilter,
    setPoiOnlyFamiliar,
    setPoiSearch,
    setPoiTypeFilter,
    setAllMapLayers,
    sliceHighlights,
    statusDetail,
    statusOk,
    statusText,
    submitDisturbance,
    submitNearby,
    submitWriteback,
    submitting,
    toggleMapLayer,
    updateForm,
    updateWritebackForm,
    useCurrentLocation,
    usePreset,
    visibleMapLayers,
    worldAtmosphere,
    writebackError,
    writebackForm,
    writebackResult,
    writebackResidues,
    writebackSubmitting,
    writebackTargetSummary,
    writebackTimeline,
    activePoiId,
    resetMapLayers,
  }
}
