import { useEffect, useMemo, useRef, useState } from 'react'
import { useBackendStatus } from './useBackendStatus'
import { useMapLayerControls } from './useMapLayerControls'
import { useNearbySession } from './useNearbySession'
import { usePoiFilters } from './usePoiFilters'
import { useWritebackSession } from './useWritebackSession'
import { createApiClient, getDefaultApiBase } from '../services/apiClient'
import { buildWorldSessionViewState } from '../services/worldSessionViewState'
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
  const [orchestrationEvents, setOrchestrationEvents] = useState([])
  const [result, setResult] = useState(restoredSession?.result || null)
  const [errorText, setErrorText] = useState('')
  const [form, setForm] = useState(restoredSession?.form || initialForm)
  const [originLabel, setOriginLabel] = useState(restoredSession?.originLabel || '上海默认切片')
  const [originHint, setOriginHint] = useState(restoredSession?.originHint || '默认先落在国内城市坐标，离线样例仅用于验证流程。')
  const [lastSessionAt] = useState(restoredSession?.lastUpdatedAt || '')
  const [autoEntering, setAutoEntering] = useState(false)
  const [advancedOpen, setAdvancedOpen] = useState(Boolean(restoredSession?.result))
  const [writebackForm, setWritebackForm] = useState(restoredWritebackSession?.writebackForm || initialWritebackForm)
  const [writebackSubmitting, setWritebackSubmitting] = useState(false)
  const [writebackResult, setWritebackResult] = useState(restoredWritebackSession?.writebackResult || null)
  const [writebackError, setWritebackError] = useState('')
  const [behaviorInsights, setBehaviorInsights] = useState(null)
  const [adminOpen, setAdminOpen] = useState(false)
  const [activePoiId, setActivePoiId] = useState(restoredWritebackSession?.activePoiId || null)
  const [ghostTraces, setGhostTraces] = useState([])
  const [disturbanceForm, setDisturbanceForm] = useState({ weather: '', traffic_level: '', crowd_density: '', event_tag: '' })
  const [disturbanceActive, setDisturbanceActive] = useState(null)
  const [disturbanceSubmitting, setDisturbanceSubmitting] = useState(false)
  const pendingWaypointsRef = useRef([])
  const autoEntryStartedRef = useRef(false)
  const [activePoi, setActivePoi] = useState(restoredWritebackSession?.activePoi || null)
  const [familiarityMap, setFamiliarityMap] = useState(restoredWritebackSession?.familiarityMap || {})

  const api = useMemo(() => createApiClient(() => apiBase.replace(/\/$/, '')), [apiBase])
  const {
    applyMapLayerPreset,
    mapLayerPanelOpen,
    resetMapLayers,
    setAllMapLayers,
    setMapLayerPanelOpen,
    toggleMapLayer,
    visibleMapLayers,
  } = useMapLayerControls({
    defaultVisibleMapLayers,
    mapLayerOptions,
    mapLayerPresets,
    restoredSession,
  })
  const {
    feedback,
    honorBoard,
    lastWritebackPoiId,
    placeLegend,
    playerState,
    presetMeta,
    previewUrl,
    recentEchoes,
    recentMarks,
    resolvedActivePoi,
    revisitSummary,
    selectedActionMeta,
    selectedVisibilityMeta,
    sliceHighlights,
    sliceAtmosphere,
    worldPois,
    writebackResidues,
    writebackTargetSummary,
    writebackTimeline,
  } = buildWorldSessionViewState({
    activePoi,
    activePoiId,
    familiarityMap,
    form,
    locationPresets,
    result,
    visibilityOptions,
    writebackActions,
    writebackForm,
    writebackResult,
  })
  const {
    filteredWorldPois,
    poiFactionFilter,
    poiFactionOptions,
    poiOnlyFamiliar,
    poiSearch,
    poiSearchSummary,
    poiTypeFilter,
    poiTypeOptions,
    setPoiFactionFilter,
    setPoiOnlyFamiliar,
    setPoiSearch,
    setPoiTypeFilter,
  } = usePoiFilters({
    worldPois,
    familiarityMap,
  })

  function updateForm(key, value) {
    setForm((current) => ({ ...current, [key]: value }))
  }

  function updateWritebackForm(key, value) {
    setWritebackForm((current) => ({ ...current, [key]: value }))
  }

  function applyOrigin(nextForm, nextLabel, nextHint) {
    setForm((current) => ({ ...current, ...nextForm }))
    setOriginLabel(nextLabel)
    setOriginHint(nextHint)
  }

  const {
    checkBackend,
    checking,
    statusDetail,
    statusOk,
    statusText,
  } = useBackendStatus({
    api,
    apiBase,
    restoredSession,
    setForm,
  })

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

  const {
    locating,
    submitNearby,
    submitting,
    useCurrentLocation,
  } = useNearbySession({
    api,
    form,
    restoredWritebackSession,
    applyOrigin,
    setForm,
    setResult,
    setAdvancedOpen,
    setErrorText,
    setActivePoiId,
    setActivePoi,
    setFamiliarityMap,
    setWritebackResult,
    setWritebackForm,
  })

  const {
    applyWritebackAction,
    handlePoiClick: syncWritebackTarget,
    loadGhostTraces,
    submitWriteback,
  } = useWritebackSession({
    api,
    result,
    activePoi,
    resolvedActivePoi,
    writebackForm,
    pendingWaypointsRef,
    setWritebackForm,
    setWritebackError,
    setWritebackResult,
    setWritebackSubmitting,
    setFamiliarityMap,
    setBehaviorInsights,
    setGhostTraces,
  })

  function handlePoiClick(poiId, poi) {
    setActivePoiId(poiId)
    setActivePoi(poi)
    syncWritebackTarget(poiId, poi)
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
      setWritebackError('当前没有可回焦的地点写回目标。')
      return
    }

    const matchedPoi = worldPois.find((poi) => poi.id === targetId)
    if (!matchedPoi) {
      setWritebackError(`未能在当前切片中找到 ${targetId}，请先重新选择一个地点。`)
      return
    }

    setWritebackError('')
    handlePoiClick(matchedPoi.id, matchedPoi)
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
    loadGhostTraces(writebackForm.playerId)
  }, [loadGhostTraces, writebackForm.playerId])

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
    sliceAtmosphere,
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
