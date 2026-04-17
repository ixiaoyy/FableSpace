import { useMemo, useRef, useEffect, useState } from 'react'
import AdminDebugPanel from './AdminDebugPanel'
import TavernOwnerPanel from './TavernOwnerPanel'
import WorldEntryPanel from './WorldEntryPanel'
import WorldSliceResultPanel from './WorldSliceResultPanel'
import WorldStagePanel from './WorldStagePanel'
import TavernEntryPanel from './TavernEntryPanel'
import TavernChatRoom from './TavernChatRoom'
import FirstRunModeModal from './FirstRunModeModal'
import TavernTemplateGallery from './TavernTemplateGallery'
import ThemeToggle from './ThemeToggle'
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
import { getDefaultTavernService, getTavernAccessLabel, getTavernStatusLabel } from './services/tavernService'

const MAX_TAVERN_MAP_MARKERS = 80
const FIRST_RUN_MODE_STORAGE_KEY = 'fablemap_first_run_mode'

function buildTavernSearchText(tavern) {
  const characters = Array.isArray(tavern?.characters) ? tavern.characters : []
  return [
    tavern?.id,
    tavern?.name,
    tavern?.description,
    tavern?.address,
    tavern?.scene_prompt,
    tavern?.access,
    getTavernAccessLabel(tavern?.access),
    tavern?.status,
    getTavernStatusLabel(tavern?.status),
    ...characters.flatMap((character) => [
      character?.name,
      character?.description,
      character?.personality,
      character?.scenario,
      ...(Array.isArray(character?.tags) ? character.tags : []),
    ]),
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()
}

function getTavernDistance(tavern) {
  const distance = Number(tavern?._distance)
  return Number.isFinite(distance) ? distance : Number.POSITIVE_INFINITY
}

function getTavernCharacterCount(tavern) {
  return Array.isArray(tavern?.characters) ? tavern.characters.length : 0
}

function sortTavernsForDiscovery(taverns, sortMode) {
  const rows = [...taverns]
  rows.sort((a, b) => {
    if (sortMode === 'name') {
      return String(a?.name || '').localeCompare(String(b?.name || ''), 'zh-CN')
    }
    if (sortMode === 'visits') {
      return Number(b?.visit_count || 0) - Number(a?.visit_count || 0)
    }
    if (sortMode === 'characters') {
      return getTavernCharacterCount(b) - getTavernCharacterCount(a)
    }
    return getTavernDistance(a) - getTavernDistance(b)
  })
  return rows
}

function pickTavernsForMap(taverns, activeTavernId, limit = MAX_TAVERN_MAP_MARKERS) {
  if (!Array.isArray(taverns) || taverns.length <= limit) return taverns

  const visible = taverns.slice(0, limit)
  if (!activeTavernId || visible.some((tavern) => tavern.id === activeTavernId)) {
    return visible
  }

  const activeTavern = taverns.find((tavern) => tavern.id === activeTavernId)
  if (!activeTavern) return visible

  return [...visible.slice(0, Math.max(0, limit - 1)), activeTavern]
}

export default function App() {
  const [view, setView] = useState('map') // 'map' | 'owner' | 'templates'
  const stageRef = useRef(null)
  const [taverns, setTaverns] = useState([])
  const [activeTavernId, setActiveTavernId] = useState(null)
  const [enteredTavern, setEnteredTavern] = useState(null)
  const [tavernFetchError, setTavernFetchError] = useState(null)
  const [tavernFetchLoading, setTavernFetchLoading] = useState(false)
  const [tavernRefreshKey, setTavernRefreshKey] = useState(0)
  const [tavernSearch, setTavernSearch] = useState('')
  const [tavernAccessFilter, setTavernAccessFilter] = useState('all')
  const [tavernStatusFilter, setTavernStatusFilter] = useState('all')
  const [tavernSortMode, setTavernSortMode] = useState('distance')
  const [ownerCreateSignal, setOwnerCreateSignal] = useState(0)
  const [homeSettingsOpen, setHomeSettingsOpen] = useState(false)

  // Visitor ID — persisted across sessions
  const [visitorId] = useState(() => {
    const stored = localStorage.getItem('fablemap_visitor_id')
    if (stored) return stored
    const newId = `visitor_${Date.now()}_${Math.random().toString(36).slice(2)}`
    localStorage.setItem('fablemap_visitor_id', newId)
    return newId
  })

  // Visitor nickname — persisted across sessions, prompts on first use
  const [visitorNickname, setVisitorNickname] = useState(() =>
    localStorage.getItem('fablemap_visitor_nickname') || ''
  )
  const [firstRunMode, setFirstRunMode] = useState(() =>
    localStorage.getItem(FIRST_RUN_MODE_STORAGE_KEY) || ''
  )

  useEffect(() => {
    // Sync visitor ID to localStorage on mount
    if (!localStorage.getItem('fablemap_visitor_id')) {
      const newId = `visitor_${Date.now()}_${Math.random().toString(36).slice(2)}`
      localStorage.setItem('fablemap_visitor_id', newId)
    }
    // Apply saved theme on mount
    const savedTheme = localStorage.getItem('fablemap_theme') || 'dark'
    document.documentElement.setAttribute('data-theme', savedTheme)
  }, [])
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
    setTavernFetchLoading(true)

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
      } finally {
        if (!cancelled) {
          setTavernFetchLoading(false)
        }
      }
    }

    fetchTaverns()

    return () => {
      cancelled = true
    }
  }, [form?.lat, form?.lon, form?.radius, tavernRefreshKey])

  const indexedTaverns = useMemo(() => {
    return taverns.map((tavern) => ({
      tavern,
      searchText: buildTavernSearchText(tavern),
    }))
  }, [taverns])

  const filteredTaverns = useMemo(() => {
    const query = tavernSearch.trim().toLowerCase()
    const filtered = indexedTaverns.filter(({ tavern, searchText }) => {
      if (tavernAccessFilter !== 'all' && tavern.access !== tavernAccessFilter) {
        return false
      }
      if (tavernStatusFilter !== 'all' && tavern.status !== tavernStatusFilter) {
        return false
      }
      if (query && !searchText.includes(query)) {
        return false
      }
      return true
    }).map(({ tavern }) => tavern)

    return sortTavernsForDiscovery(filtered, tavernSortMode)
  }, [indexedTaverns, tavernAccessFilter, tavernSearch, tavernSortMode, tavernStatusFilter])

  const mapTaverns = useMemo(
    () => pickTavernsForMap(filteredTaverns, activeTavernId),
    [filteredTaverns, activeTavernId],
  )

  function refreshTaverns() {
    setTavernRefreshKey((key) => key + 1)
  }

  function completeFirstRun({ nickname, mode }) {
    localStorage.setItem('fablemap_visitor_nickname', nickname)
    localStorage.setItem(FIRST_RUN_MODE_STORAGE_KEY, mode)
    setVisitorNickname(nickname)
    setFirstRunMode(mode)
    setView(mode === 'owner' ? 'owner' : 'map')
    if (mode === 'owner') {
      setOwnerCreateSignal((signal) => signal + 1)
    }
  }

  function resetFirstRunGuide() {
    localStorage.removeItem(FIRST_RUN_MODE_STORAGE_KEY)
    setFirstRunMode('')
  }

  function openDiscoverView() {
    setEnteredTavern(null)
    setView('map')
  }

  function openCreateTavern() {
    setEnteredTavern(null)
    setView('owner')
    setOwnerCreateSignal((signal) => signal + 1)
  }

  function openOwnerView() {
    setEnteredTavern(null)
    setView('owner')
  }

  function openTemplateView() {
    setEnteredTavern(null)
    setView('templates')
  }

  function handleTemplateInstalled(tavern) {
    if (tavern?.id) {
      setTaverns((prev) => [tavern, ...prev.filter((item) => item.id !== tavern.id)])
      setActiveTavernId(tavern.id)
    }
    refreshTaverns()
    setView('owner')
  }

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
    view,
    totalTaverns: taverns.length,
    matchingTaverns: filteredTaverns.length,
    openTaverns: filteredTaverns.filter((tavern) => tavern.status === 'open').length,
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
          <p className="mini-label">FableMap Tavern</p>
          <h1>
            {view === 'map'
              ? '发现附近酒馆，进入会记住你的故事'
              : view === 'templates'
                ? '从模板安装一间酒馆，再放到真实地图上'
                : '管理我的酒馆，或用向导开一间新店'}
          </h1>
          <p className="note muted world-app-shell__hero-note">
            {view === 'map'
              ? '先看附近有什么酒馆，再选择是否进入对话；角色、地点和回访记忆都会围绕真实地图展开。'
              : view === 'templates'
                ? '模板不是脱离地图的文游市场，而是一组可安装的酒馆包：角色、世界书和预设会随坐标落地。'
                : '店主只需要关注酒馆、角色、AI 和访客回访；世界书、数据和调试能力都放在后续高级入口里。'}
          </p>
          <div className="hero-actions">
            <button 
              className={view === 'map' ? 'primary' : 'secondary'} 
              onClick={openDiscoverView}
            >
              🔎 发现酒馆
            </button>
            <button 
              className="secondary"
              onClick={openCreateTavern}
            >
              ✨ 创建酒馆
            </button>
            <button
              className={view === 'owner' ? 'primary' : 'secondary'}
              onClick={openOwnerView}
            >
              🏮 我的酒馆
            </button>
            <button
              className={view === 'templates' ? 'primary' : 'secondary'}
              onClick={openTemplateView}
            >
              📦 模板
            </button>
            <button
              className={`secondary subtle${homeSettingsOpen ? ' active' : ''}`}
              onClick={() => setHomeSettingsOpen((open) => !open)}
              title="打开设置与高级入口"
            >
              ⚙️ 设置
            </button>
          </div>
          {homeSettingsOpen ? (
            <div className="home-settings-panel" aria-label="设置与高级入口">
              <div className="home-settings-row">
                <span className="home-settings-label">主题</span>
                <ThemeToggle compact />
              </div>
              <button type="button" className="button-link" onClick={resetFirstRunGuide}>
                重新选择新手引导
              </button>
              <button
                type="button"
                className="button-link"
                onClick={() => {
                  setView('map')
                  setAdvancedOpen((open) => !open)
                }}
              >
                {advancedOpen ? '收起地图高级设置' : '打开地图高级设置'}
              </button>
              <button type="button" className="button-link" onClick={() => setAdminOpen((open) => !open)}>
                {adminOpen ? '关闭调试后台' : '打开调试后台'}
              </button>
            </div>
          ) : null}
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
        {enteredTavern && (
          <div className="world-app-shell__hero-actions">
            <button className="secondary" onClick={() => setEnteredTavern(null)}>
              🚪 离开酒馆
            </button>
          </div>
        )}
      </header>

      {enteredTavern ? (
        <div className="tavern-chat-view slide-up">
          <TavernChatRoom
            roomId={enteredTavern.id}
            roomName={enteredTavern.name}
            roomDescription={enteredTavern.description}
            characters={enteredTavern.characters}
            tavern={enteredTavern}
            visitorId={visitorId}
            visitorNickname={visitorNickname}
            entryState={enteredTavern.entry_state}
          />
        </div>
      ) : view === 'map' ? (
        <>
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
            <WorldStagePanel
              {...mapStageProps}
              taverns={mapTaverns}
              discoveryTaverns={filteredTaverns}
              totalTaverns={taverns.length}
              totalMatchingTaverns={filteredTaverns.length}
              tavernMarkerLimit={MAX_TAVERN_MAP_MARKERS}
              tavernFetchLoading={tavernFetchLoading}
              tavernFetchError={tavernFetchError}
              tavernSearch={tavernSearch}
              setTavernSearch={setTavernSearch}
              tavernAccessFilter={tavernAccessFilter}
              setTavernAccessFilter={setTavernAccessFilter}
              tavernStatusFilter={tavernStatusFilter}
              setTavernStatusFilter={setTavernStatusFilter}
              tavernSortMode={tavernSortMode}
              setTavernSortMode={setTavernSortMode}
              onRefreshTaverns={refreshTaverns}
              activeTavernId={activeTavernId}
              onTavernClick={(id) => setActiveTavernId(id)}
            />
          </div>

          {activeTavernId && (
            <TavernEntryPanel 
              tavernId={activeTavernId}
              visitorId={visitorId}
              onEnter={(tavern) => setEnteredTavern(tavern)}
              onClose={() => setActiveTavernId(null)}
            />
          )}
        </>
      ) : view === 'templates' ? (
        <>
          <TavernTemplateGallery
            ownerId={visitorId}
            currentLat={form.lat}
            currentLon={form.lon}
            onInstalled={handleTemplateInstalled}
            onOpenOwner={openOwnerView}
          />
        </>
      ) : (
        <TavernOwnerPanel
          ownerId={visitorId}
          createSignal={ownerCreateSignal}
          createInitialLat={form.lat}
          createInitialLon={form.lon}
        />
      )}

      {adminOpen ? (
        <div className="world-app-shell__admin">
          <AdminDebugPanel {...adminPanelProps} />
        </div>
      ) : null}

      {(!visitorNickname || !firstRunMode) && (
        <FirstRunModeModal
          initialNickname={visitorNickname}
          initialMode={firstRunMode}
          onComplete={completeFirstRun}
        />
      )}
    </div>
  )
}
