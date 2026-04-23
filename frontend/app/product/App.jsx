import { useMemo, useRef, useEffect, useState } from 'react'
import { Navigate, NavLink, Route, Routes, matchPath, useLocation, useNavigate } from 'react-router-dom'
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
import { buildEntryStatusText, buildHeroMetrics } from './services/appShellViewModel'
import { buildGuestNickname, resolveNewcomerTavern } from './services/newcomerTavern'
import { getTavernAccessLabel, getTavernStatusLabel } from './services/tavernService'
import { enterTavern, getTavern, listTaverns } from '../lib/taverns'

const MAX_TAVERN_MAP_MARKERS = 80
const FIRST_RUN_MODE_STORAGE_KEY = 'fablemap_first_run_mode'

function viewFromPath(pathname = '/') {
  if (matchPath('/discover', pathname)) return 'map'
  if (matchPath('/templates', pathname)) return 'templates'
  if (matchPath('/owner', pathname)) return 'owner'
  if (matchPath('/tavern/:tavernId', pathname)) return 'tavern'
  return 'home'
}

function buildTavernSearchText(tavern) {
  const characters = Array.isArray(tavern?.characters) ? tavern.characters : []
  const bookmarks = Array.isArray(tavern?.bookmarks) ? tavern.bookmarks : []
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
    ...bookmarks.map((bookmark) => bookmark?.content),
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

function navLinkClass({ isActive }) {
  return isActive ? 'primary hero-nav-link' : 'secondary hero-nav-link'
}

export default function App() {
  const navigate = useNavigate()
  const location = useLocation()
  const view = viewFromPath(location.pathname)
  const tavernRouteMatch = matchPath('/tavern/:tavernId', location.pathname)
  const routeTavernId = tavernRouteMatch?.params?.tavernId || ''
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
  const [quickStartLoading, setQuickStartLoading] = useState(false)
  const [quickStartError, setQuickStartError] = useState('')
  const [routeTavernLoading, setRouteTavernLoading] = useState(false)
  const [routeTavernError, setRouteTavernError] = useState('')

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

  useEffect(() => {
    setHomeSettingsOpen(false)
  }, [location.pathname])
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
        const result = await listTaverns({
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

  useEffect(() => {
    if (view !== 'tavern') {
      setRouteTavernError('')
      setRouteTavernLoading(false)
      if (enteredTavern) setEnteredTavern(null)
      return
    }
    if (!routeTavernId || enteredTavern?.id === routeTavernId) return

    let cancelled = false
    async function loadRouteTavern() {
      setRouteTavernLoading(true)
      setRouteTavernError('')
      try {
        const tavern = taverns.find((item) => item.id === routeTavernId)
          || await getTavern(routeTavernId, visitorId)
        const entryState = await enterTavern(routeTavernId, '', visitorId)
        if (cancelled) return
        const entered = { ...tavern, entry_state: entryState }
        setEnteredTavern(entered)
        setActiveTavernId(routeTavernId)
        setTaverns((prev) => [entered, ...prev.filter((item) => item.id !== routeTavernId)])
      } catch (err) {
        if (!cancelled) {
          setRouteTavernError(err?.message || '无法进入这间酒馆')
        }
      } finally {
        if (!cancelled) setRouteTavernLoading(false)
      }
    }

    loadRouteTavern()
    return () => {
      cancelled = true
    }
  }, [view, routeTavernId, visitorId, enteredTavern?.id])

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

  function navigateTo(nextRoute, options = {}) {
    const nextPath = typeof nextRoute === 'string' ? nextRoute : '/'
    if (location.pathname !== nextPath) {
      navigate(nextPath, { replace: Boolean(options.replace) })
    }
    setHomeSettingsOpen(false)
  }

  function refreshTaverns() {
    setTavernRefreshKey((key) => key + 1)
  }

  function persistFirstRunChoice(nickname, mode = 'play') {
    localStorage.setItem('fablemap_visitor_nickname', nickname)
    localStorage.setItem(FIRST_RUN_MODE_STORAGE_KEY, mode)
    setVisitorNickname(nickname)
    setFirstRunMode(mode)
  }

  function completeFirstRun({ nickname, mode }) {
    persistFirstRunChoice(nickname, mode)
    navigateTo(mode === 'owner' ? '/owner' : '/discover')
    if (mode === 'owner') {
      setOwnerCreateSignal((signal) => signal + 1)
    }
  }

  async function quickStartNewcomerExperience(options = {}) {
    const nickname = String(options.nickname || visitorNickname || '').trim() || buildGuestNickname()
    setQuickStartLoading(true)
    setQuickStartError('')
    try {
      const tavern = await resolveNewcomerTavern(visitorId)
      const entryState = await enterTavern(tavern.id, '', visitorId)

      persistFirstRunChoice(nickname, 'play')
      setEnteredTavern({ ...tavern, entry_state: entryState })
      setActiveTavernId(tavern.id)
      setTaverns((prev) => [tavern, ...prev.filter((item) => item.id !== tavern.id)])
      navigateTo(`/tavern/${encodeURIComponent(tavern.id)}`)
      return { ...tavern, entry_state: entryState }
    } catch (err) {
      let message = err?.message || '新手酒馆暂时无法进入，请稍后重试或先刷新附近酒馆。'
      if (message.includes('酒馆不存在') || message.includes('404')) {
        message = '内置公益新手酒馆未启用；请确认后端已启动，并且没有关闭 FABLEMAP_SEED_DEFAULT_TAVERNS。'
      }
      setQuickStartError(message)
      throw new Error(message)
    } finally {
      setQuickStartLoading(false)
    }
  }

  function handleQuickStartClick() {
    quickStartNewcomerExperience().catch(() => {})
  }

  function resetFirstRunGuide() {
    localStorage.removeItem(FIRST_RUN_MODE_STORAGE_KEY)
    setFirstRunMode('')
  }

  function openDiscoverView() {
    setEnteredTavern(null)
    navigateTo('/discover')
  }

  function openCreateTavern() {
    setEnteredTavern(null)
    navigateTo('/owner')
    setOwnerCreateSignal((signal) => signal + 1)
  }

  function openOwnerView() {
    setEnteredTavern(null)
    navigateTo('/owner')
  }

  function openTemplateView() {
    setEnteredTavern(null)
    navigateTo('/templates')
  }

  function handleTemplateInstalled(tavern) {
    if (tavern?.id) {
      setTaverns((prev) => [tavern, ...prev.filter((item) => item.id !== tavern.id)])
      setActiveTavernId(tavern.id)
    }
    refreshTaverns()
    navigateTo('/owner')
  }

  function handleEnteredTavern(tavern) {
    if (!tavern?.id) return
    setEnteredTavern(tavern)
    setActiveTavernId(tavern.id)
    navigateTo(`/tavern/${encodeURIComponent(tavern.id)}`)
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
        <nav className="hero-actions" aria-label="首页入口导航">
          <NavLink
            className={navLinkClass}
            to="/discover"
            onClick={() => setEnteredTavern(null)}
          >
            🔎 附近门牌
          </NavLink>
          <NavLink
            className={navLinkClass}
            to="/templates"
            onClick={() => setEnteredTavern(null)}
          >
            📦 模板
          </NavLink>
          <button className="secondary" onClick={openCreateTavern}>
            ✨ 开一间
          </button>
          <NavLink
            className={navLinkClass}
            to="/owner"
            onClick={() => setEnteredTavern(null)}
          >
            🏮 后台
          </NavLink>
          {enteredTavern ? (
            <button
              className="secondary"
              onClick={() => {
                setEnteredTavern(null)
                navigateTo('/discover')
              }}
            >
              🚪 离开酒馆
            </button>
          ) : null}
          <button
            className={`secondary subtle${homeSettingsOpen ? ' active' : ''}`}
            onClick={() => setHomeSettingsOpen((open) => !open)}
            title="设置与高级入口"
          >
            ⚙️
          </button>
        </nav>
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
                navigateTo('/discover')
                setAdvancedOpen((open) => !open)
              }}
            >
              {advancedOpen ? '收起坐标与图层面板' : '展开坐标与图层面板'}
            </button>
            <button type="button" className="button-link" onClick={() => setAdminOpen((open) => !open)}>
              {adminOpen ? '关闭调试后台' : '打开调试后台'}
            </button>
          </div>
        ) : null}
        {quickStartError ? (
          <p className="quick-start-error" role="alert">{quickStartError}</p>
        ) : null}
      </header>

      <Routes>
        <Route
          index
          element={(
            <main className="home-route-page" aria-label="首页入口">
              <div className="home-quick-start">
                <button
                  className="primary hero-instant-play"
                  onClick={handleQuickStartClick}
                  disabled={quickStartLoading}
                >
                  {quickStartLoading ? '⚡ 正在开门...' : '⚡ 马上进去'}
                </button>
              </div>
              <section className="home-route-grid">
                <button type="button" className="home-route-card" onClick={openDiscoverView}>
                  <span>01</span>
                  <strong>附近门牌</strong>
                  <p>打开地图，看附近有哪些酒馆亮着灯。</p>
                </button>
                <button type="button" className="home-route-card" onClick={openTemplateView}>
                  <span>02</span>
                  <strong>模板</strong>
                  <p>先选气质，再把它放到真实坐标上。</p>
                </button>
                <button type="button" className="home-route-card" onClick={openOwnerView}>
                  <span>03</span>
                  <strong>后台</strong>
                  <p>管理门牌、角色、开场和访客回访。</p>
                </button>
              </section>
            </main>
          )}
        />
        <Route
          path="discover"
          element={(
            <>
              {advancedOpen ? (
                <section className="world-app-shell__top-grid world-app-shell__top-grid--drawer" aria-label="坐标与图层面板">
                  <WorldEntryPanel {...entryPanelProps} />
                  <WorldSliceResultPanel {...resultPanelProps} />
                </section>
              ) : null}

              <div ref={stageRef} className="world-app-shell__stage">
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
                  onQuickStartTavern={handleQuickStartClick}
                  quickStartLoading={quickStartLoading}
                />
              </div>

              {activeTavernId && (
                <TavernEntryPanel
                  tavernId={activeTavernId}
                  visitorId={visitorId}
                  onEnter={handleEnteredTavern}
                  onClose={() => setActiveTavernId(null)}
                />
              )}
            </>
          )}
        />
        <Route
          path="templates"
          element={(
            <TavernTemplateGallery
              ownerId={visitorId}
              currentLat={form.lat}
              currentLon={form.lon}
              onInstalled={handleTemplateInstalled}
              onOpenOwner={openOwnerView}
            />
          )}
        />
        <Route
          path="owner"
          element={(
            <TavernOwnerPanel
              ownerId={visitorId}
              createSignal={ownerCreateSignal}
              createInitialLat={form.lat}
              createInitialLon={form.lon}
            />
          )}
        />
        <Route
          path="tavern/:tavernId"
          element={(
            <div className="tavern-chat-view slide-up">
              {enteredTavern ? (
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
              ) : (
                <div className="panel route-loading-panel">
                  <span className="mini-label">Tavern Room</span>
                  <h2>{routeTavernLoading ? '正在推门...' : '这扇门暂时打不开'}</h2>
                  {routeTavernError ? <p>{routeTavernError}</p> : <p>正在读取酒馆房间。</p>}
                  {routeTavernError ? <button type="button" className="secondary" onClick={openDiscoverView}>回到附近门牌</button> : null}
                </div>
              )}
            </div>
          )}
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>

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
          onQuickTry={quickStartNewcomerExperience}
        />
      )}
    </div>
  )
}
