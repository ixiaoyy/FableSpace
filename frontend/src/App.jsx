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
import { useWorldSession } from './hooks/useWorldSession'

export default function App() {
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
    worldAtmosphere,
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

  const visibleLayerCount = Object.values(visibleMapLayers).filter(Boolean).length
  const entryStatusText = autoEntering
    ? '正在自动进入附近世界'
    : submitting
      ? '正在刷新当前切片'
      : result
        ? '当前切片已就绪'
        : '等待生成附近切片'

  return (
    <div className="wrap app-shell page-enter map-first-app-shell world-app-shell">
      <header className="world-app-shell__hero panel">
        <div className="world-app-shell__hero-copy">
          <p className="mini-label">World shell</p>
          <h1>{result ? '世界入口已连通，继续向地图推进' : '先选入口，再进入你附近的世界切片'}</h1>
          <p className="note muted world-app-shell__hero-note">
            顶部保留入口与结果摘要，中段直接放地图主舞台，后台工具继续折叠在底部，减少首页来回滚动与信息跳转。
          </p>
        </div>
        <div className="world-app-shell__hero-metrics">
          <div className="world-shell-metric-card">
            <span className="world-shell-metric-card__label">入口状态</span>
            <strong>{entryStatusText}</strong>
            <span>{originLabel}</span>
          </div>
          <div className="world-shell-metric-card">
            <span className="world-shell-metric-card__label">地图图层</span>
            <strong>{visibleLayerCount} / {MAP_LAYER_OPTIONS.length}</strong>
            <span>{form.radius}m 半径 · {form.mode === 'fixture' ? '离线样例' : '实时地图'}</span>
          </div>
          <div className="world-shell-metric-card">
            <span className="world-shell-metric-card__label">世界节点</span>
            <strong>{result?.poi_count ?? 0}</strong>
            <span>{result ? `${result.landmark_count ?? 0} 个地标 · ${result.road_count ?? 0} 条路径` : '生成后可直接点击节点进入观察'}</span>
          </div>
        </div>
      </header>

      <section className="world-app-shell__top-grid" aria-label="世界入口与切片摘要">
        <WorldEntryPanel
          lastSessionAt={lastSessionAt}
          originLabel={originLabel}
          originHint={originHint}
          form={form}
          locationPresets={LOCATION_PRESETS}
          presetMeta={presetMeta}
          usePreset={usePreset}
          locating={locating}
          autoEntering={autoEntering}
          useCurrentLocation={useCurrentLocation}
          submitting={submitting}
          submitNearby={submitNearby}
          advancedOpen={advancedOpen}
          setAdvancedOpen={setAdvancedOpen}
          updateForm={updateForm}
          errorText={errorText}
        />

        <WorldSliceResultPanel
          result={result}
          statusOk={statusOk}
          worldAtmosphere={worldAtmosphere}
          sliceHighlights={sliceHighlights}
        />
      </section>

      <div className="world-app-shell__stage">
        <WorldStagePanel
          result={result}
          originLabel={originLabel}
          form={form}
          mapLayerPanelOpen={mapLayerPanelOpen}
          setMapLayerPanelOpen={setMapLayerPanelOpen}
          visibleMapLayers={visibleMapLayers}
          mapLayerOptions={MAP_LAYER_OPTIONS}
          mapLayerPresets={MAP_LAYER_PRESETS}
          applyMapLayerPreset={applyMapLayerPreset}
          setAllMapLayers={setAllMapLayers}
          resetMapLayers={resetMapLayers}
          activePoiId={activePoiId}
          familiarityMap={familiarityMap}
          ghostTraces={ghostTraces}
          handlePoiClick={handlePoiClick}
          mapOnly
        />
      </div>

      <div className="world-app-shell__admin">
        <AdminDebugPanel
          adminOpen={adminOpen}
          setAdminOpen={setAdminOpen}
          apiBase={apiBase}
          setApiBase={setApiBase}
          checking={checking}
          checkBackend={checkBackend}
          statusOk={statusOk}
          statusText={statusText}
          statusDetail={statusDetail}
          writebackForm={writebackForm}
          updateWritebackForm={updateWritebackForm}
          writebackSubmitting={writebackSubmitting}
          submitWriteback={submitWriteback}
          writebackError={writebackError}
          writebackResult={writebackResult}
          playerState={playerState}
          feedback={feedback}
          recentEchoes={recentEchoes}
          recentMarks={recentMarks}
          placeLegend={placeLegend}
          honorBoard={honorBoard}
        />
      </div>
    </div>
  )
}
