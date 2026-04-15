import { useRef, useEffect, useState } from 'react'
import AdminDebugPanel from './AdminDebugPanel'
import WorldEntryPanel from './WorldEntryPanel'
import WorldSliceResultPanel from './WorldSliceResultPanel'
import WorldStagePanel from './WorldStagePanel'
import {
  DEFAULT_VISIBLE_MAP_LAYERS,
  INITIAL_FORM,
  INITIAL_WRITEBACK_FORM,
  LOCATION_PRESETS,
  MAP_LAYER_OPTIONS,
  MAP_LAYER_PRESETS,
  VISIBILITY_OPTIONS,
  WRITEBACK_ACTIONS,
} from './appShellConfig'
import { useScrollToWorldStage } from './hooks/useScrollToWorldStage'
import { useWorldSession } from './hooks/useWorldSession'
import { buildAppPanelProps } from './services/appPanelProps'
import { buildEntryStatusText, buildHeroMetrics, buildStageStatusViewModel } from './services/appShellViewModel'
import { getDefaultTavernService } from './services/tavernService'

export default function App() {
  const stageRef = useRef(null)
  const [taverns, setTaverns] = useState([])
  const [activeTavernId, setActiveTavernId] = useState(null)
  const [tavernFetchError, setTavernFetchError] = useState(null)
  const {
    activePoiId,
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
    resetMapLayers,
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
  } = useWorldSession({
    initialForm: INITIAL_FORM,
    initialWritebackForm: INITIAL_WRITEBACK_FORM,
    locationPresets: LOCATION_PRESETS,
    defaultVisibleMapLayers: DEFAULT_VISIBLE_MAP_LAYERS,
    mapLayerOptions: MAP_LAYER_OPTIONS,
    mapLayerPresets: MAP_LAYER_PRESETS,
    writebackActions: WRITEBACK_ACTIONS,
    visibilityOptions: VISIBILITY_OPTIONS,
  })

  // Fetch nearby taverns when map center changes
  useEffect(() => {
    if (!form?.lat || !form?.lon) return

    let cancelled = false
    setTavernFetchError(null)

    async function fetchTaverns() {
      try {
        const service = getDefaultTavernService()
        const result = await service.listTaverns({
          lat: form.lat,
          lon: form.lon,
          radius: form.radius || 5000,
        })
        if (!cancelled) {
          setTaverns(Array.isArray(result) ? result : (result.taverns || []))
        }
      } catch (err) {
        if (!cancelled) {
          setTavernFetchError(err.message)
          setTaverns([])
        }
      }
    }

    fetchTaverns()

    return () => {
      cancelled = true
    }
  }, [form?.lat, form?.lon, form?.radius])

  const entryStatusText = buildEntryStatusText({
    autoEntering,
    submitting,
    result,
  })

  const heroMetrics = buildHeroMetrics({
    entryStatusText,
    form,
    mapLayerOptions: MAP_LAYER_OPTIONS,
    result,
    visibleMapLayers,
    originLabel,
  })

  const stageStatus = buildStageStatusViewModel({
    autoEntering,
    submitting,
    result,
    activePoiId,
  })

  const {
    adminPanelProps,
    entryPanelProps,
    mapStageProps,
    resultPanelProps,
  } = buildAppPanelProps({
    advancedOpen,
    adminOpen,
    apiBase,
    autoEntering,
    checking,
    checkBackend,
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
    recentEchoes,
    recentMarks,
    resolvedActivePoi,
    result,
    setAdminOpen,
    setAdvancedOpen,
    setApiBase,
    setAllMapLayers,
    setMapLayerPanelOpen,
    statusDetail,
    statusOk,
    statusText,
    submitNearby,
    submitWriteback,
    submitting,
    updateForm,
    updateWritebackForm,
    useCurrentLocation,
    usePreset,
    visibleMapLayers,
    sliceAtmosphere,
    writebackError,
    writebackForm,
    writebackResidues,
    writebackResult,
    writebackSubmitting,
    writebackTargetSummary,
    writebackTimeline,
    revisitSummary,
    selectedActionMeta,
    selectedVisibilityMeta,
    disturbanceForm,
    setDisturbanceForm,
    disturbanceSubmitting,
    submitDisturbance,
    disturbanceActive,
    clearDisturbance,
    visibilityOptions: VISIBILITY_OPTIONS,
    activePoiId,
    applyMapLayerPreset,
    applyWritebackAction,
    resetMapLayers,
    toggleMapLayer,
    locationPresets: LOCATION_PRESETS,
    mapLayerOptions: MAP_LAYER_OPTIONS,
    mapLayerPresets: MAP_LAYER_PRESETS,
    writebackActions: WRITEBACK_ACTIONS,
    sliceHighlights,
  })

  useScrollToWorldStage({
    result,
    stageRef,
  })

  return (
    <div className="wrap app-shell page-enter map-first-app-shell world-app-shell">
      <header className="world-app-shell__hero panel">
        <div className="world-app-shell__hero-copy">
          <p className="mini-label">Place-first shell</p>
          <h1>{result ? '地点入口已连通，先选地点再进入叙事' : '先选入口，马上进入你附近的地点切片'}</h1>
          <p className="note muted world-app-shell__hero-note">
            首页先只保留入口、结果摘要和地点舞台，优先让你立即进入、立即选点、立即开始后续事件与写回。
          </p>
        </div>
        <div className="world-app-shell__hero-metrics" aria-label="当前动作提示">
          {heroMetrics.cards.map((card) => (
            <article key={card.id} className="world-shell-metric-card">
              <span className="world-shell-metric-card__label">{card.label}</span>
              <strong>{card.value}</strong>
              <p>{card.detail}</p>
            </article>
          ))}
        </div>
      </header>

      <section className="world-app-shell__top-grid" aria-label="地点入口与切片摘要">
        <WorldEntryPanel {...entryPanelProps} />

        <WorldSliceResultPanel {...resultPanelProps} />
      </section>

      <div ref={stageRef} className="world-app-shell__stage">
        <div className={`world-app-shell__stage-status${stageStatus.classNameSuffix}`} aria-live="polite">
          <span className="mini-label">地点舞台</span>
          <strong>{stageStatus.label}</strong>
          <p>{stageStatus.title}</p>
        </div>
        <WorldStagePanel {...mapStageProps} taverns={taverns} activeTavernId={activeTavernId} onTavernClick={(id, marker) => setActiveTavernId(id)} />
      </div>

      {adminOpen ? (
        <div className="world-app-shell__admin">
          <AdminDebugPanel {...adminPanelProps} />
        </div>
      ) : null}
    </div>
  )
}
