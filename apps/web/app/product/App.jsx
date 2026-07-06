import { useMemo, useRef, useEffect, useState } from 'react'
import { Navigate, NavLink, Route, Routes, matchPath, useLocation, useNavigate } from 'react-router-dom'
import AdminDebugPanel from './AdminDebugPanel'
import SpaceOwnerPanel from './SpaceOwnerPanel'
import WorldEntryPanel from './WorldEntryPanel'
import WorldSliceResultPanel from './WorldSliceResultPanel'
import WorldStagePanel from './WorldStagePanel'
import SpaceEntryPanel from './SpaceEntryPanel'
import SpaceChatRoom from './SpaceChatRoom'
import FirstRunModeModal from './FirstRunModeModal'
import SpaceTemplateGallery from './SpaceTemplateGallery'
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
import { buildGuestNickname, resolveNewcomerSpace } from './services/newcomerSpace'
import { getSpaceAccessLabel, getSpaceStatusLabel } from './services/spaceService'
import { enterSpace, getSpace, listSpaces } from '../lib/spaces'

const MAX_SPACE_MAP_MARKERS = 80
const FIRST_RUN_MODE_STORAGE_KEY = 'fablespace_first_run_mode'

function viewFromPath(pathname = '/') {
  if (matchPath('/discover', pathname)) return 'map'
  if (matchPath('/templates', pathname)) return 'templates'
  if (matchPath('/owner', pathname)) return 'owner'
  if (matchPath('/space/:spaceId', pathname)) return 'space'
  return 'home'
}

function buildSpaceSearchText(space) {
  const characters = Array.isArray(space?.characters) ? space.characters : []
  const bookmarks = Array.isArray(space?.bookmarks) ? space.bookmarks : []
  return [
    space?.id,
    space?.name,
    space?.description,
    space?.address,
    space?.scene_prompt,
    space?.access,
    getSpaceAccessLabel(space?.access),
    space?.status,
    getSpaceStatusLabel(space?.status),
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

function getSpaceDistance(space) {
  const distance = Number(space?._distance)
  return Number.isFinite(distance) ? distance : Number.POSITIVE_INFINITY
}

function getSpaceCharacterCount(space) {
  return Array.isArray(space?.characters) ? space.characters.length : 0
}

function sortSpacesForDiscovery(spaces, sortMode) {
  const rows = [...spaces]
  rows.sort((a, b) => {
    if (sortMode === 'name') {
      return String(a?.name || '').localeCompare(String(b?.name || ''), 'zh-CN')
    }
    if (sortMode === 'visits') {
      return Number(b?.visit_count || 0) - Number(a?.visit_count || 0)
    }
    if (sortMode === 'characters') {
      return getSpaceCharacterCount(b) - getSpaceCharacterCount(a)
    }
    return getSpaceDistance(a) - getSpaceDistance(b)
  })
  return rows
}

function pickSpacesForMap(spaces, activeSpaceId, limit = MAX_SPACE_MAP_MARKERS) {
  if (!Array.isArray(spaces) || spaces.length <= limit) return spaces

  const visible = spaces.slice(0, limit)
  if (!activeSpaceId || visible.some((space) => space.id === activeSpaceId)) {
    return visible
  }

  const activeSpace = spaces.find((space) => space.id === activeSpaceId)
  if (!activeSpace) return visible

  return [...visible.slice(0, Math.max(0, limit - 1)), activeSpace]
}

function navLinkClass({ isActive }) {
  return isActive ? 'primary hero-nav-link' : 'secondary hero-nav-link'
}

export default function App() {
  const navigate = useNavigate()
  const location = useLocation()
  const view = viewFromPath(location.pathname)
  const spaceRouteMatch = matchPath('/space/:spaceId', location.pathname)
  const routeSpaceId = spaceRouteMatch?.params?.spaceId || ''
  const stageRef = useRef(null)
  const [spaces, setSpaces] = useState([])
  const [activeSpaceId, setActiveSpaceId] = useState(null)
  const [enteredSpace, setEnteredSpace] = useState(null)
  const [spaceFetchError, setSpaceFetchError] = useState(null)
  const [spaceFetchLoading, setSpaceFetchLoading] = useState(false)
  const [spaceRefreshKey, setSpaceRefreshKey] = useState(0)
  const [spaceSearch, setSpaceSearch] = useState('')
  const [spaceAccessFilter, setSpaceAccessFilter] = useState('all')
  const [spaceStatusFilter, setSpaceStatusFilter] = useState('all')
  const [spaceSortMode, setSpaceSortMode] = useState('distance')
  const [ownerCreateTrigger, setOwnerCreateTrigger] = useState(0)
  const [homeSettingsOpen, setHomeSettingsOpen] = useState(false)
  const [quickStartLoading, setQuickStartLoading] = useState(false)
  const [quickStartError, setQuickStartError] = useState('')
  const [routeSpaceLoading, setRouteSpaceLoading] = useState(false)
  const [routeSpaceError, setRouteSpaceError] = useState('')

  // Visitor ID — persisted across sessions
  const [visitorId, setVisitorId] = useState('')

  // Visitor nickname — persisted across sessions, prompts on first use
  const [visitorNickname, setVisitorNickname] = useState('')
  const [firstRunMode, setFirstRunMode] = useState('')

  useEffect(() => {
    // Read from localStorage on mount (client-only)
    let vid = localStorage.getItem('fablespace_visitor_id')
    if (!vid) {
      vid = `visitor_${Date.now()}_${Math.random().toString(36).slice(2)}`
      localStorage.setItem('fablespace_visitor_id', vid)
    }
    setVisitorId(vid)

    const nickname = localStorage.getItem('fablespace_visitor_nickname') || ''
    setVisitorNickname(nickname)

    const mode = localStorage.getItem(FIRST_RUN_MODE_STORAGE_KEY) || ''
    setFirstRunMode(mode)

    // Apply saved theme on mount
    const savedTheme = localStorage.getItem('fablespace_theme') || 'dark'
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

  // Fetch nearby spaces when map center changes
  useEffect(() => {
    if (!form?.lat || !form?.lon) return

    let cancelled = false
    setSpaceFetchError(null)
    setSpaceFetchLoading(true)

    async function fetchSpaces() {
      try {
        const result = await listSpaces({
          lat: form.lat,
          lon: form.lon,
          radius: form.radius || 5000,
        })
        if (!cancelled) {
          setSpaces(Array.isArray(result) ? result : (result.spaces || []))
        }
      } catch (err) {
        if (!cancelled) {
          setSpaceFetchError(err.message)
          setSpaces([])
        }
      } finally {
        if (!cancelled) {
          setSpaceFetchLoading(false)
        }
      }
    }

    fetchSpaces()

    return () => {
      cancelled = true
    }
  }, [form?.lat, form?.lon, form?.radius, spaceRefreshKey])

  useEffect(() => {
    if (view !== 'space') {
      setRouteSpaceError('')
      setRouteSpaceLoading(false)
      if (enteredSpace) setEnteredSpace(null)
      return
    }
    if (!routeSpaceId || enteredSpace?.id === routeSpaceId) return

    let cancelled = false
    async function loadRouteSpace() {
      setRouteSpaceLoading(true)
      setRouteSpaceError('')
      try {
        const space = spaces.find((item) => item.id === routeSpaceId)
          || await getSpace(routeSpaceId, visitorId)
        const entryState = await enterSpace(routeSpaceId, '', visitorId)
        if (cancelled) return
        const entered = { ...space, entry_state: entryState }
        setEnteredSpace(entered)
        setActiveSpaceId(routeSpaceId)
        setSpaces((prev) => [entered, ...prev.filter((item) => item.id !== routeSpaceId)])
      } catch (err) {
        if (!cancelled) {
          setRouteSpaceError(err?.message || '无法进入这间空间')
        }
      } finally {
        if (!cancelled) setRouteSpaceLoading(false)
      }
    }

    loadRouteSpace()
    return () => {
      cancelled = true
    }
  }, [view, routeSpaceId, visitorId, enteredSpace?.id])

  const indexedSpaces = useMemo(() => {
    return spaces.map((space) => ({
      space,
      searchText: buildSpaceSearchText(space),
    }))
  }, [spaces])

  const filteredSpaces = useMemo(() => {
    const query = spaceSearch.trim().toLowerCase()
    const filtered = indexedSpaces.filter(({ space, searchText }) => {
      if (spaceAccessFilter !== 'all' && space.access !== spaceAccessFilter) {
        return false
      }
      if (spaceStatusFilter !== 'all' && space.status !== spaceStatusFilter) {
        return false
      }
      if (query && !searchText.includes(query)) {
        return false
      }
      return true
    }).map(({ space }) => space)

    return sortSpacesForDiscovery(filtered, spaceSortMode)
  }, [indexedSpaces, spaceAccessFilter, spaceSearch, spaceSortMode, spaceStatusFilter])

  const mapSpaces = useMemo(
    () => pickSpacesForMap(filteredSpaces, activeSpaceId),
    [filteredSpaces, activeSpaceId],
  )

  function navigateTo(nextRoute, options = {}) {
    const nextPath = typeof nextRoute === 'string' ? nextRoute : '/'
    if (location.pathname !== nextPath) {
      navigate(nextPath, { replace: Boolean(options.replace) })
    }
    setHomeSettingsOpen(false)
  }

  function refreshSpaces() {
    setSpaceRefreshKey((key) => key + 1)
  }

  function persistFirstRunChoice(nickname, mode = 'play') {
    localStorage.setItem('fablespace_visitor_nickname', nickname)
    localStorage.setItem(FIRST_RUN_MODE_STORAGE_KEY, mode)
    setVisitorNickname(nickname)
    setFirstRunMode(mode)
  }

  function completeFirstRun({ nickname, mode }) {
    persistFirstRunChoice(nickname, mode)
    navigateTo(mode === 'owner' ? '/owner' : '/discover')
    if (mode === 'owner') {
      setOwnerCreateTrigger((trigger) => trigger + 1)
    }
  }

  async function quickStartNewcomerExperience(options = {}) {
    const nickname = String(options.nickname || visitorNickname || '').trim() || buildGuestNickname()
    setQuickStartLoading(true)
    setQuickStartError('')
    try {
      const space = await resolveNewcomerSpace(visitorId)
      const entryState = await enterSpace(space.id, '', visitorId)

      persistFirstRunChoice(nickname, 'play')
      setEnteredSpace({ ...space, entry_state: entryState })
      setActiveSpaceId(space.id)
      setSpaces((prev) => [space, ...prev.filter((item) => item.id !== space.id)])
      navigateTo(`/space/${encodeURIComponent(space.id)}`)
      return { ...space, entry_state: entryState }
    } catch (err) {
      let message = err?.message || '新手空间暂时无法进入，请稍后重试或先刷新附近空间。'
      if (message.includes('空间不存在') || message.includes('404')) {
        message = '内置新手体验空间未启用；请确认后端已启动，并且没有关闭 FABLESPACE_SEED_DEFAULT_SPACES。'
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
    setEnteredSpace(null)
    navigateTo('/discover')
  }

  function openCreateSpace() {
    setEnteredSpace(null)
    navigateTo('/owner')
    setOwnerCreateTrigger((trigger) => trigger + 1)
  }

  function openOwnerView() {
    setEnteredSpace(null)
    navigateTo('/owner')
  }

  function openTemplateView() {
    setEnteredSpace(null)
    navigateTo('/templates')
  }

  function handleTemplateInstalled(space) {
    if (space?.id) {
      setSpaces((prev) => [space, ...prev.filter((item) => item.id !== space.id)])
      setActiveSpaceId(space.id)
    }
    refreshSpaces()
    navigateTo('/owner')
  }

  function handleEnteredSpace(space) {
    if (!space?.id) return
    setEnteredSpace(space)
    setActiveSpaceId(space.id)
    navigateTo(`/space/${encodeURIComponent(space.id)}`)
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
    totalSpaces: spaces.length,
    matchingSpaces: filteredSpaces.length,
    openSpaces: filteredSpaces.filter((space) => space.status === 'open').length,
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
            onClick={() => setEnteredSpace(null)}
          >
            🔎 附近门牌
          </NavLink>
          <NavLink
            className={navLinkClass}
            to="/templates"
            onClick={() => setEnteredSpace(null)}
          >
            📦 模板
          </NavLink>
          <button className="secondary" onClick={openCreateSpace}>
            ✨ 开一间
          </button>
          <NavLink
            className={navLinkClass}
            to="/owner"
            onClick={() => setEnteredSpace(null)}
          >
            🏮 后台
          </NavLink>
          {enteredSpace ? (
            <button
              className="secondary"
              onClick={() => {
                setEnteredSpace(null)
                navigateTo('/discover')
              }}
            >
              🚪 离开空间
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
                  <p>打开地图，看附近有哪些空间亮着灯。</p>
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
                  spaces={mapSpaces}
                  discoverySpaces={filteredSpaces}
                  totalSpaces={spaces.length}
                  totalMatchingSpaces={filteredSpaces.length}
                  spaceMarkerLimit={MAX_SPACE_MAP_MARKERS}
                  spaceFetchLoading={spaceFetchLoading}
                  spaceFetchError={spaceFetchError}
                  spaceSearch={spaceSearch}
                  setSpaceSearch={setSpaceSearch}
                  spaceAccessFilter={spaceAccessFilter}
                  setSpaceAccessFilter={setSpaceAccessFilter}
                  spaceStatusFilter={spaceStatusFilter}
                  setSpaceStatusFilter={setSpaceStatusFilter}
                  spaceSortMode={spaceSortMode}
                  setSpaceSortMode={setSpaceSortMode}
                  onRefreshSpaces={refreshSpaces}
                  activeSpaceId={activeSpaceId}
                  onSpaceClick={(id) => setActiveSpaceId(id)}
                  onQuickStartSpace={handleQuickStartClick}
                  quickStartLoading={quickStartLoading}
                />
              </div>

              {activeSpaceId && (
                <SpaceEntryPanel
                  spaceId={activeSpaceId}
                  visitorId={visitorId}
                  onEnter={handleEnteredSpace}
                  onClose={() => setActiveSpaceId(null)}
                />
              )}
            </>
          )}
        />
        <Route
          path="templates"
          element={(
            <SpaceTemplateGallery
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
            <SpaceOwnerPanel
              ownerId={visitorId}
              createTrigger={ownerCreateTrigger}
              createInitialLat={form.lat}
              createInitialLon={form.lon}
            />
          )}
        />
        <Route
          path="space/:spaceId"
          element={(
            <div className="space-chat-view slide-up">
              {enteredSpace ? (
                <SpaceChatRoom
                  roomId={enteredSpace.id}
                  roomName={enteredSpace.name}
                  roomDescription={enteredSpace.description}
                  characters={enteredSpace.characters}
                  space={enteredSpace}
                  visitorId={visitorId}
                  visitorNickname={visitorNickname}
                  entryState={enteredSpace.entry_state}
                />
              ) : (
                <div className="panel route-loading-panel">
                  <span className="mini-label">Space Room</span>
                  <h2>{routeSpaceLoading ? '正在推门...' : '这扇门暂时打不开'}</h2>
                  {routeSpaceError ? <p>{routeSpaceError}</p> : <p>正在读取空间房间。</p>}
                  {routeSpaceError ? <button type="button" className="secondary" onClick={openDiscoverView}>回到附近门牌</button> : null}
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
