import { useEffect, useMemo, useRef, useState } from 'react'
import WorldEntryPanel from './WorldEntryPanel'
import WorldSliceResultPanel from './WorldSliceResultPanel'
import WorldStagePanel from './WorldStagePanel'
import { createApiClient, getDefaultApiBase } from './services/apiClient'
import {
  buildSliceHighlights,
  buildWorldAtmosphere,
  buildWritebackResidue,
  buildWritebackRevisitSummary,
  buildWritebackTimeline,
  clampObserveIntensity,
  formatCoordinates,
  formatTagLabel,
  getActionButtonText,
  getPoiFactionLabel,
  getPoiTypeLabel,
  getWritebackTargetSummary,
  matchesPoiSearch,
  normalizeSearchText,
  pickPresetMeta,
} from './services/appDisplay'
import {
  loadPersistedWorldSession,
  loadPersistedWritebackSession,
  persistWorldSession,
  persistWritebackSession,
} from './services/sessionPersistence'

const LOCATION_PRESETS = [
  {
    id: 'shanghai-bund',
    title: '上海外滩',
    subtitle: '高密度都市切片 / 近代地标 / 江岸夜景',
    lat: '31.2400',
    lon: '121.4900',
    radius: '320',
    mode: 'live',
  },
  {
    id: 'beijing-tiananmen',
    title: '北京天安门周边',
    subtitle: '纪念性空间 / 中轴线 / 大尺度城市界面',
    lat: '39.9087',
    lon: '116.3975',
    radius: '360',
    mode: 'live',
  },
  {
    id: 'fixture-demo',
    title: '离线演示样例',
    subtitle: '离线可用，仅用于确认生成链路，不代表国内风格',
    lat: '35.6580',
    lon: '139.7016',
    radius: '300',
    mode: 'fixture',
  },
]

const initialForm = {
  lat: '31.2304',
  lon: '121.4737',
  radius: '300',
  mode: 'live',
  seed: '',
}

const initialWritebackForm = {
  playerId: 'player_local',
  eventType: 'observe',
  visibility: 'private',
  targetType: 'poi',
  targetId: 'poi_clocktower_01',
  sliceId: 'slice_demo_shibuya',
  zoneId: 'zone_shibuya_core',
  intensity: '1',
  tag: 'safe',
  note: '',
}

const WRITEBACK_ACTIONS = [
  {
    eventType: 'observe',
    label: '观察',
    hint: '留下第一层观察痕迹，提升地点熟悉度与玩家 attunement。',
  },
  {
    eventType: 'dwell',
    label: '驻足',
    hint: '让区域开始记住你的步频，提升 clarity 并降低 tension。',
  },
  {
    eventType: 'mark',
    label: '标记',
    hint: '给地点留下可回访的语义标签，为后续世界编排提供稳定输入。',
  },
  {
    eventType: 'repair',
    label: '修复',
    hint: '为地标贡献一次修复，积累城市荣誉榜排名。仅对 landmark 目标有效。',
  },
]

const VISIBILITY_OPTIONS = [
  {
    value: 'private',
    label: 'private',
    title: '留给你自己',
    hint: '默认私有。适合观察记录、个人驻足痕迹、私密地点标记，不进入公共空间。',
    access: '仅你自己可见，可随时删除，不会进入广播或公共回声池。',
    semantics: '把一次进入先留成你自己的隐秘回声，适合试探、记忆和未成熟的判断。',
    participationLabel: '私人记忆胶囊',
    participationAction: '适合用 observe 或 mark 留下一次仅自己可回访的地点感受。',
    participationReward: '会先沉淀为可回访的个人痕迹，不直接进入他人可见层。',
  },
  {
    value: 'local_public',
    label: 'local_public',
    title: '分享到当前区域',
    hint: '适合区域传闻、公共情绪标签与轻量共创句子，会留在目标 zone 的局部公共层。',
    access: '需要满足区域熟悉度与内容门槛，通过后只在该区域内对其他玩家可见。',
    semantics: '把你对这片街区的理解交给同一地区的后来者，形成可继承的街头传说。',
    participationLabel: '街区传说条目',
    participationAction: '适合把 note 写成一句传闻、提示或地方气质描述。',
    participationReward: '若通过门槛，会进入当前区域的局部公共层，推进本地 myth thread。',
  },
  {
    value: 'global',
    label: 'global',
    title: '尝试进入城市神话层',
    hint: '高门槛公共表达，适合修复痕迹、长期命名与可能影响全城叙事的内容。',
    access: '普通玩家不能直接稳定写入，需要精选、冷却或更高权限才能晋升。',
    semantics: '这不是普通广播，而是尝试把一次行动抬升成整座城市会记得的神话材料。',
    participationLabel: '城市神话提案',
    participationAction: '适合修复行为、长期命名候选或希望影响全城语义的记录。',
    participationReward: '通常只会作为候选提案进入更高层筛选，不保证立即成为全局叙事。',
  },
]

const DEFAULT_VISIBLE_MAP_LAYERS = {
  roads: true,
  pois: true,
  landmarks: true,
  factionZones: true,
  labels: true,
  legend: true,
  ghostTraces: true,
}

const MAP_LAYER_OPTIONS = [
  { key: 'roads', label: '道路', hint: '显示路径骨架与道路发光' },
  { key: 'pois', label: 'POI', hint: '显示可点击节点与据点交互' },
  { key: 'landmarks', label: '地标', hint: '显示大型地标与装饰图标' },
  { key: 'factionZones', label: '阵营影响区', hint: '显示势力扩散光晕' },
  { key: 'labels', label: '标签', hint: '显示地点名与地图说明' },
  { key: 'legend', label: '图例', hint: '显示右下角图例与阵营色板' },
  { key: 'ghostTraces', label: 'Ghost traces', hint: '显示玩家残影与回访痕迹' },
]

const MAP_LAYER_PRESETS = [
  {
    key: 'explore',
    label: '探索',
    hint: '保留完整世界信息，适合第一次进入切片',
    layers: {
      roads: true,
      pois: true,
      landmarks: true,
      factionZones: true,
      labels: true,
      legend: true,
      ghostTraces: true,
    },
  },
  {
    key: 'navigation',
    label: '导航',
    hint: '突出路径、地标与路标，减少干扰信息',
    layers: {
      roads: true,
      pois: true,
      landmarks: true,
      factionZones: false,
      labels: true,
      legend: false,
      ghostTraces: false,
    },
  },
  {
    key: 'narrative',
    label: '叙事',
    hint: '保留阵营、标签与残影，强调世界气氛',
    layers: {
      roads: false,
      pois: true,
      landmarks: true,
      factionZones: true,
      labels: true,
      legend: true,
      ghostTraces: true,
    },
  },
]


export default function App() {
  const restoredSession = useMemo(() => loadPersistedWorldSession(initialForm, DEFAULT_VISIBLE_MAP_LAYERS), [])
  const restoredWritebackSession = useMemo(() => loadPersistedWritebackSession(initialWritebackForm), [])
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
  const [advancedOpen, setAdvancedOpen] = useState(Boolean(restoredSession?.result))
  const [writebackForm, setWritebackForm] = useState(restoredWritebackSession?.writebackForm || initialWritebackForm)
  const [writebackSubmitting, setWritebackSubmitting] = useState(false)
  const [writebackResult, setWritebackResult] = useState(restoredWritebackSession?.writebackResult || null)
  const [writebackError, setWritebackError] = useState('')
  const [behaviorInsights, setBehaviorInsights] = useState(null)
  const [adminOpen, setAdminOpen] = useState(false)
  const [activePoiId, setActivePoiId] = useState(restoredWritebackSession?.activePoiId || null)
  const [visibleMapLayers, setVisibleMapLayers] = useState(restoredSession?.visibleLayers || DEFAULT_VISIBLE_MAP_LAYERS)
  const [mapLayerPanelOpen, setMapLayerPanelOpen] = useState(
    typeof restoredSession?.mapLayerPanelOpen === 'boolean' ? restoredSession.mapLayerPanelOpen : true
  )
  const [ghostTraces, setGhostTraces] = useState([])
  const [disturbanceForm, setDisturbanceForm] = useState({ weather: '', traffic_level: '', crowd_density: '', event_tag: '' })
  const [disturbanceActive, setDisturbanceActive] = useState(null)
  const [disturbanceSubmitting, setDisturbanceSubmitting] = useState(false)
  const pendingWaypointsRef = useRef([])
  const [activePoi, setActivePoi] = useState(restoredWritebackSession?.activePoi || null)
  const [familiarityMap, setFamiliarityMap] = useState(restoredWritebackSession?.familiarityMap || {})
  const [poiSearch, setPoiSearch] = useState('')
  const [poiTypeFilter, setPoiTypeFilter] = useState('all')
  const [poiFactionFilter, setPoiFactionFilter] = useState('all')
  const [poiOnlyFamiliar, setPoiOnlyFamiliar] = useState(false)

  const api = useMemo(() => createApiClient(() => apiBase.replace(/\/$/, '')), [apiBase])
  const presetMeta = pickPresetMeta(form, LOCATION_PRESETS)
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
  const selectedActionMeta = WRITEBACK_ACTIONS.find((item) => item.eventType === writebackForm.eventType) || WRITEBACK_ACTIONS[0]
  const selectedVisibilityMeta = VISIBILITY_OPTIONS.find((item) => item.value === writebackForm.visibility) || VISIBILITY_OPTIONS[0]
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
      MAP_LAYER_OPTIONS.reduce((acc, layer) => {
        acc[layer.key] = nextValue
        return acc
      }, {})
    )
  }

  function resetMapLayers() {
    setVisibleMapLayers({ ...DEFAULT_VISIBLE_MAP_LAYERS })
  }

  function applyMapLayerPreset(presetKey) {
    const preset = MAP_LAYER_PRESETS.find((item) => item.key === presetKey)
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

  function useCurrentLocation() {
    if (!navigator.geolocation) {
      setErrorText('当前浏览器不支持定位，可先使用预设入口或手动填写高级坐标。')
      return
    }

    setLocating(true)
    setErrorText('')

    navigator.geolocation.getCurrentPosition(
      (position) => {
        applyOrigin(
          {
            lat: position.coords.latitude.toFixed(6),
            lon: position.coords.longitude.toFixed(6),
            radius: form.radius || '300',
            mode: 'live',
          },
          '我的当前位置',
          '已抓取浏览器定位，可直接生成你附近的世界切片。'
        )
        setAdvancedOpen(true)
        setLocating(false)
      },
      (error) => {
        setLocating(false)
        setErrorText(`定位失败：${error.message || '浏览器拒绝了位置权限。'}`)
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000,
      }
    )
  }

  async function submitNearby(refresh) {
    setSubmitting(true)
    setErrorText(refresh ? '正在刷新附近世界...' : '正在生成附近世界...')
    try {
      const payload = await api.createNearbyPreview({
        lat: form.lat,
        lon: form.lon,
        radius: form.radius,
        mode: form.mode,
        seed: form.seed,
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

      setResult(payload)
      setAdvancedOpen(true)
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
  }

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
    } catch {}
    finally { setDisturbanceSubmitting(false) }
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
    setOrchestrationEvents([])
  }, [result?.world_id, writebackForm.playerId])

  useEffect(() => {
    if (!result?.world_id || !writebackForm.playerId) return
    api.getGhostTraces(writebackForm.playerId)
      .then((data) => setGhostTraces(data?.traces || []))
      .catch(() => {})
  }, [result?.world_id, writebackForm.playerId])

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
  }, [activePoi, activePoiId, familiarityMap, result, writebackForm, writebackResult])

  return (
    <div className="wrap app-shell">
      <section className="hero panel">
        <div className="hero-copy">
          <p className="eyebrow">面向玩家的世界探索器</p>
          <h1>FableMap 世界入口</h1>
          <p>
            不再把玩家扔进经纬度表单里。先选一个入口，再生成附近世界，随后直接进入可点击的地图切片。
          </p>
          <div className="hero-metrics">
            <div className="hero-metric-card">
              <span className="hero-metric-label">当前入口</span>
              <strong>{originLabel}</strong>
              <span>{originHint}</span>
            </div>
            <div className="hero-metric-card">
              <span className="hero-metric-label">坐标骨架</span>
              <strong>{formatCoordinates(form.lat, form.lon)}</strong>
              <span>{form.radius}m · {form.mode === 'fixture' ? '离线样例' : '实时地图'}</span>
            </div>
          </div>
        </div>
        <div className="hero-status-card">
          <p className="mini-label">服务状态</p>
          <p className="status compact-status">
            <span className={`dot${statusOk ? ' ok' : ''}`}></span>
            <span>{statusText}</span>
          </p>
          <p className="note muted">
            {statusDetail || '将自动检查当前 FastAPI 服务状态。开发模式下默认尝试连接 8950 端口。'}
          </p>
          <div className="hero-actions">
            <button type="button" className="secondary" disabled={checking} onClick={checkBackend}>
              {checking ? '检查中...' : '重新检查服务'}
            </button>
            {previewUrl ? (
              <a className="button-link" href={previewUrl} target="_blank" rel="noreferrer">
                打开当前预览
              </a>
            ) : null}
          </div>
        </div>
      </section>

      <div className="grid main-grid">
        <WorldEntryPanel
          lastSessionAt={lastSessionAt}
          originLabel={originLabel}
          originHint={originHint}
          form={form}
          locationPresets={LOCATION_PRESETS}
          presetMeta={presetMeta}
          usePreset={usePreset}
          locating={locating}
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
      </div>

      <WorldStagePanel
        result={result}
        originLabel={originLabel}
        form={form}
        statusOk={statusOk}
        mapLayerPanelOpen={mapLayerPanelOpen}
        setMapLayerPanelOpen={setMapLayerPanelOpen}
        visibleMapLayers={visibleMapLayers}
        mapLayerOptions={MAP_LAYER_OPTIONS}
        mapLayerPresets={MAP_LAYER_PRESETS}
        applyMapLayerPreset={applyMapLayerPreset}
        setAllMapLayers={setAllMapLayers}
        resetMapLayers={resetMapLayers}
        toggleMapLayer={toggleMapLayer}
        activePoiId={activePoiId}
        familiarityMap={familiarityMap}
        ghostTraces={ghostTraces}
        handlePoiClick={handlePoiClick}
        writebackForm={writebackForm}
        handleOrchestrationEvent={handleOrchestrationEvent}
        submitting={submitting}
        submitNearby={submitNearby}
        resolvedActivePoi={resolvedActivePoi}
        writebackResult={writebackResult}
        selectedVisibilityMeta={selectedVisibilityMeta}
        poiSearch={poiSearch}
        setPoiSearch={setPoiSearch}
        poiTypeFilter={poiTypeFilter}
        setPoiTypeFilter={setPoiTypeFilter}
        poiTypeOptions={poiTypeOptions}
        poiFactionFilter={poiFactionFilter}
        setPoiFactionFilter={setPoiFactionFilter}
        poiFactionOptions={poiFactionOptions}
        poiOnlyFamiliar={poiOnlyFamiliar}
        setPoiOnlyFamiliar={setPoiOnlyFamiliar}
        poiSearchSummary={poiSearchSummary}
        filteredWorldPois={filteredWorldPois}
        orchestrationEvents={orchestrationEvents}
        disturbanceForm={disturbanceForm}
        setDisturbanceForm={setDisturbanceForm}
        disturbanceSubmitting={disturbanceSubmitting}
        submitDisturbance={submitDisturbance}
        disturbanceActive={disturbanceActive}
        clearDisturbance={clearDisturbance}
        selectedActionMeta={selectedActionMeta}
        visibilityOptions={VISIBILITY_OPTIONS}
        writebackTargetSummary={writebackTargetSummary}
        writebackActions={WRITEBACK_ACTIONS}
        applyWritebackAction={applyWritebackAction}
        updateWritebackForm={updateWritebackForm}
        writebackSubmitting={writebackSubmitting}
        submitWriteback={submitWriteback}
        writebackError={writebackError}
        writebackTimeline={writebackTimeline}
        revisitSummary={revisitSummary}
        writebackResidues={writebackResidues}
        behaviorInsights={behaviorInsights}
        focusWritebackTarget={focusWritebackTarget}
        lastWritebackPoiId={lastWritebackPoiId}
      />

      <section className="panel admin-panel">
        <div className="admin-header">
          <div>
            <p className="mini-label">后台 / 调试</p>
            <h2>后台与调试工具</h2>
            <p className="note muted">开发调试、接口验证和写回实验都留在折叠区，不再占据首页主叙事。</p>
          </div>
          <button type="button" className="secondary admin-toggle" onClick={() => setAdminOpen((current) => !current)}>
            {adminOpen ? '收起后台工具' : '展开后台工具'}
          </button>
        </div>

        {adminOpen ? (
          <div className="admin-content">
            <div className="grid admin-grid">
              <section className="panel inner-panel">
                <h3>后端连接</h3>
                <label htmlFor="server-base">API 基础地址</label>
                <div className="row-2">
                  <input id="server-base" type="text" value={apiBase} onChange={(event) => setApiBase(event.target.value)} />
                  <button type="button" className="secondary" disabled={checking} onClick={checkBackend}>
                    {checking ? '检查中...' : '重新检查'}
                  </button>
                </div>
                <p className="status">
                  <span className={`dot${statusOk ? ' ok' : ''}`}></span>
                  <span>{statusText}</span>
                </p>
                <p className="note muted">{statusDetail}</p>
              </section>

              <section className="panel inner-panel">
                <h3>写回事件</h3>
                <p className="note">使用同一切片提交最小事件，验证玩家状态、地点痕迹与世界反馈是否会被后端持久化。</p>
                <div className="row-3">
                  <div>
                    <label htmlFor="player-id">玩家 ID</label>
                    <input id="player-id" type="text" value={writebackForm.playerId} onChange={(event) => updateWritebackForm('playerId', event.target.value)} />
                  </div>
                  <div>
                    <label htmlFor="event-type">事件类型</label>
                    <select id="event-type" value={writebackForm.eventType} onChange={(event) => updateWritebackForm('eventType', event.target.value)}>
                      <option value="observe">观察</option>
                      <option value="dwell">驻足</option>
                      <option value="mark">标记</option>
                    </select>
                  </div>
                  <div>
                    <label htmlFor="visibility">可见性</label>
                    <select id="visibility" value={writebackForm.visibility} onChange={(event) => updateWritebackForm('visibility', event.target.value)}>
                      <option value="private">仅自己可见</option>
                      <option value="local_public">区域公开</option>
                      <option value="global">城市神话层候选</option>
                    </select>
                  </div>
                </div>
                <div className="row-3">
                  <div>
                    <label htmlFor="target-type">目标类型</label>
                    <select id="target-type" value={writebackForm.targetType} onChange={(event) => updateWritebackForm('targetType', event.target.value)}>
                      <option value="poi">地点</option>
                      <option value="zone">区域</option>
                      <option value="route">路径</option>
                      <option value="home">家园</option>
                      <option value="world">世界</option>
                    </select>
                  </div>
                  <div>
                    <label htmlFor="target-id">目标 ID</label>
                    <input id="target-id" type="text" value={writebackForm.targetId} onChange={(event) => updateWritebackForm('targetId', event.target.value)} />
                  </div>
                  <div>
                    <label htmlFor="slice-id">切片 ID</label>
                    <input id="slice-id" type="text" value={writebackForm.sliceId} onChange={(event) => updateWritebackForm('sliceId', event.target.value)} />
                  </div>
                </div>
                <div className="row-3">
                  <div>
                    <label htmlFor="zone-id">区域 ID</label>
                    <input id="zone-id" type="text" value={writebackForm.zoneId} onChange={(event) => updateWritebackForm('zoneId', event.target.value)} />
                  </div>
                  <div>
                    <label htmlFor="intensity">观察强度</label>
                    <input id="intensity" type="number" min="1" max="3" step="1" value={writebackForm.intensity} onChange={(event) => updateWritebackForm('intensity', event.target.value)} />
                  </div>
                  <div>
                    <label htmlFor="mark-tag">标记标签</label>
                    <select id="mark-tag" value={writebackForm.tag} onChange={(event) => updateWritebackForm('tag', event.target.value)}>
                      <option value="safe">安全</option>
                      <option value="uncanny">异样</option>
                      <option value="warm_corner">温暖角落</option>
                      <option value="return_again">还想再来</option>
                      <option value="rain_friendly">适合雨天</option>
                    </select>
                  </div>
                </div>
                <label htmlFor="writeback-note">可选备注</label>
                <input id="writeback-note" type="text" value={writebackForm.note} onChange={(event) => updateWritebackForm('note', event.target.value)} placeholder="给这次事件补一条轻量注释" />
                <div className="actions">
                  <button type="button" disabled={writebackSubmitting} onClick={submitWriteback}>
                    {writebackSubmitting ? '写回中...' : '提交写回事件'}
                  </button>
                </div>
                {writebackError ? <p className="note error-note">{writebackError}</p> : null}
              </section>
            </div>

            {writebackResult ? (
              <div className="writeback-grid">
                <div className="result-card">
                  <h3>玩家状态</h3>
                  <div><strong>动作：</strong> {playerState?.action_state || '-'}</div>
                  <div><strong>清晰度：</strong> {playerState?.clarity ?? '-'}</div>
                  <div><strong>张力：</strong> {playerState?.tension ?? '-'}</div>
                  <div><strong>感应度：</strong> {playerState?.attunement ?? '-'}</div>
                  <div><strong>区域熟悉度：</strong> {JSON.stringify(playerState?.zone_familiarity || {})}</div>
                  <div><strong>地点熟悉度：</strong> {JSON.stringify(playerState?.poi_familiarity || {})}</div>
                </div>
                <div className="result-card">
                  <h3>地点状态</h3>
                  <div><strong>目标：</strong> {writebackResult.place_state?.target_id || '-'}</div>
                  <div><strong>类型：</strong> {writebackResult.place_state?.target_type || '-'}</div>
                  <div><strong>熟悉度：</strong> {writebackResult.place_state?.familiarity ?? '-'}</div>
                  <div><strong>标记数：</strong> {writebackResult.place_state?.mark_count ?? '-'}</div>
                  {writebackResult.place_state?.repair_count > 0 ? (
                    <div><strong>修复次数：</strong> {writebackResult.place_state.repair_count}</div>
                  ) : null}
                  <div><strong>最近事件：</strong> {writebackResult.place_state?.last_event_type || '-'}</div>
                  <div><strong>已存事件：</strong> {writebackResult.persistence?.stored_event_count ?? '-'}</div>
                </div>
                <div className="result-card">
                  <h3>世界反馈</h3>
                  <div><strong>摘要：</strong> {feedback?.summary || '-'}</div>
                  <div><strong>广播提示：</strong> {(feedback?.broadcast_hints || []).join(' · ') || '-'}</div>
                  <div><strong>显现字段：</strong> {(feedback?.revealed_fields || []).join(' · ') || '-'}</div>
                  <div><strong>持久化文件：</strong> {writebackResult.persistence?.state_file || '-'}</div>
                </div>
              </div>
            ) : null}

            {recentEchoes.length ? (
              <div className="result-card stacked-card">
                <h3>最近回声</h3>
                {recentEchoes.map((entry) => (
                  <div key={`${entry.timestamp}-${entry.target_id}-${entry.entry_type}`} className="subtle-block">
                    <strong>{entry.entry_type}</strong> · {entry.text}
                  </div>
                ))}
              </div>
            ) : null}

            {recentMarks.length ? (
              <div className="result-card stacked-card">
                <h3>最近标记</h3>
                {recentMarks.map((entry) => (
                  <div key={entry.event_id} className="subtle-block">
                    <strong>{entry.tag}</strong> · {entry.visibility} {entry.note ? `· ${entry.note}` : ''}
                  </div>
                ))}
              </div>
            ) : null}

            {placeLegend ? (
              <div className="result-card stacked-card">
                <h3>地点传说（{placeLegend.tier}）</h3>
                <p className="subtle-block">{placeLegend.narrative}</p>
                {placeLegend.vibe_summary ? (
                  <div className="subtle-block"><strong>气质：</strong>{placeLegend.vibe_summary}</div>
                ) : null}
                <div className="subtle-block"><strong>印记总数：</strong>{placeLegend.mark_count}</div>
              </div>
            ) : null}

            {honorBoard.length > 0 ? (
              <div className="result-card stacked-card">
                <h3>城市荣誉榜</h3>
                {honorBoard.map((entry, i) => (
                  <div key={entry.player_id} className="subtle-block">
                    <strong>#{i + 1} {entry.player_id}</strong> · 修复 {entry.contributions} 次
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        ) : null}
      </section>
    </div>
  )
}
