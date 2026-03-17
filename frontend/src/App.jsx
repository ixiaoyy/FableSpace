import { useEffect, useMemo, useState } from 'react'
import WorldMap from './WorldMap'
import WorldDensityIndicator from './WorldDensityIndicator'

function getDefaultApiBase() {
  const envBase = import.meta.env.VITE_API_BASE?.trim()
  if (envBase) {
    return envBase.replace(/\/$/, '')
  }
  return ''
}

function createApiClient(getBaseUrl) {
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
      throw new Error(payload.error || payload.detail || `HTTP ${response.status}`)
    }
    return payload
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
  }
}

const LOCATION_PRESETS = [
  {
    id: 'shibuya-crossing',
    title: '涩谷十字路口',
    subtitle: '高密度都市神话入口',
    lat: '35.6595',
    lon: '139.7005',
    radius: '320',
    mode: 'live',
  },
  {
    id: 'tokyo-tower',
    title: '东京塔周边',
    subtitle: '纪念碑 / 观景台 / 夜色氛围',
    lat: '35.6586',
    lon: '139.7454',
    radius: '360',
    mode: 'live',
  },
  {
    id: 'fixture-demo',
    title: '演示样例世界',
    subtitle: '离线可用，适合先确认流程',
    lat: '35.6580',
    lon: '139.7016',
    radius: '300',
    mode: 'fixture',
  },
]

const initialForm = {
  lat: '35.6580',
  lon: '139.7016',
  radius: '300',
  mode: 'fixture',
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

function clampObserveIntensity(value) {
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) {
    return 1
  }
  return Math.min(3, Math.max(1, Math.round(parsed)))
}

function getWritebackTargetSummary(activePoi, form) {
  const targetName = activePoi?.real_name || activePoi?.fantasy_name || form.targetId || '当前地点'
  const zoneName = form.zoneId || '当前区域'

  if (form.eventType === 'dwell') {
    return `你将对 ${zoneName} 发起一次驻足写回。`
  }
  if (form.eventType === 'mark') {
    return `你将为 ${targetName} 留下一枚「${form.tag}」标记。`
  }
  return `你将观察 ${targetName}，并累积该地点的熟悉度。`
}

function getActionButtonText(eventType, busy) {
  if (busy) {
    if (eventType === 'dwell') return '驻足写回中...'
    if (eventType === 'mark') return '标记写回中...'
    return '观察写回中...'
  }

  if (eventType === 'dwell') return '驻足'
  if (eventType === 'mark') return '留下标记'
  return '观察'
}

function buildWritebackTimeline(payload) {
  if (!payload) {
    return []
  }

  const steps = []
  const eventType = payload?.event?.event_type || '-'
  const targetId = payload?.event?.target?.target_id || '-'
  const visibility = payload?.event?.visibility || '-'
  const playerState = payload?.player_state || {}
  const placeState = payload?.place_state || {}
  const worldFeedback = payload?.world_feedback || {}
  const effects = worldFeedback?.effects || {}

  steps.push({
    id: 'event',
    title: '事件写入',
    text: `${eventType} 已发送到 ${targetId}，可见性为 ${visibility}。`,
  })

  steps.push({
    id: 'player',
    title: '玩家状态变化',
    text: `action=${playerState.action_state || '-'} · clarity=${playerState.clarity ?? '-'} · tension=${playerState.tension ?? '-'} · attunement=${playerState.attunement ?? '-'}`,
  })

  steps.push({
    id: 'place',
    title: '地点状态变化',
    text: `familiarity=${placeState.familiarity ?? '-'} · mark_count=${placeState.mark_count ?? '-'} · last_event=${placeState.last_event_type || '-'}`,
  })

  steps.push({
    id: 'world',
    title: '世界反馈',
    text: worldFeedback.summary || '世界暂时保持沉默。',
  })

  if ((worldFeedback.broadcast_hints || []).length) {
    steps.push({
      id: 'broadcast',
      title: '广播提示',
      text: worldFeedback.broadcast_hints.join(' · '),
    })
  }

  if ((worldFeedback.revealed_fields || []).length) {
    steps.push({
      id: 'revealed',
      title: '可见字段',
      text: worldFeedback.revealed_fields.join(' · '),
    })
  }

  if (Object.keys(effects.player_effects || {}).length || Object.keys(effects.place_effects || {}).length || Object.keys(effects.world_effects || {}).length) {
    steps.push({
      id: 'effects',
      title: '结构化 effects',
      text: JSON.stringify(effects),
    })
  }

  steps.push({
    id: 'persistence',
    title: '持久化',
    text: `${payload?.persistence?.storage || 'unknown'} · events=${payload?.persistence?.stored_event_count ?? '-'} · ${payload?.persistence?.state_file || '-'}`,
  })

  return steps
}

function buildWritebackResidue(placeState) {
  if (!placeState) {
    return []
  }

  const residues = []
  const echoes = Array.isArray(placeState.recent_echoes) ? placeState.recent_echoes.filter(Boolean) : []
  const marks = Array.isArray(placeState.marks) ? placeState.marks.filter(Boolean) : []

  if (echoes.length) {
    residues.push({
      id: 'echoes',
      title: 'Recent echoes',
      items: echoes.slice(-3),
    })
  }

  if (marks.length) {
    residues.push({
      id: 'marks',
      title: 'Recent marks',
      items: marks.slice(-3).map((mark) => {
        const tag = mark?.tag || 'untagged'
        const note = mark?.note ? ` · ${mark.note}` : ''
        return `${tag}${note}`
      }),
    })
  }

  return residues
}

function buildWritebackRevisitSummary(result, writebackResult, familiarityMap, writebackForm) {
  const currentSliceId = result?.world_id || ''
  const persistedSliceId = writebackResult?.event?.target?.slice_id || writebackForm?.sliceId || ''
  const sameSlice = Boolean(currentSliceId && persistedSliceId && currentSliceId === persistedSliceId)
  const targetId = writebackResult?.event?.target?.target_id || writebackForm?.targetId || ''
  const familiarity = targetId ? familiarityMap?.[targetId] ?? 0 : 0
  const storedEvents = writebackResult?.persistence?.stored_event_count ?? 0
  const lastEventType = writebackResult?.event?.event_type || writebackResult?.place_state?.last_event_type || '-'

  return {
    sameSlice,
    currentSliceId,
    persistedSliceId,
    targetId,
    familiarity,
    storedEvents,
    lastEventType,
    hasResidue: Boolean(storedEvents || familiarity || (writebackResult?.place_state?.recent_echoes || []).length || (writebackResult?.place_state?.marks || []).length),
  }
}

const LAST_WORLD_STORAGE_KEY = 'fablemap:last-world-session'
const LAST_WRITEBACK_STORAGE_KEY = 'fablemap:last-writeback-session'

function isPersistedResultUsable(result) {
  return Boolean(result && typeof result === 'object' && result.preview_url)
}

function isWritebackResultUsable(result) {
  return Boolean(result && typeof result === 'object' && result.event && result.persistence)
}

function loadPersistedWorldSession() {
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
      lastUpdatedAt: typeof payload.lastUpdatedAt === 'string' ? payload.lastUpdatedAt : '',
    }
  } catch {
    return null
  }
}

function loadPersistedWritebackSession() {
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

function persistWorldSession(session) {
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

function persistWritebackSession(session) {
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

function formatCoordinates(lat, lon) {
  const latNumber = Number(lat)
  const lonNumber = Number(lon)
  if (!Number.isFinite(latNumber) || !Number.isFinite(lonNumber)) {
    return '坐标未设置'
  }
  return `${latNumber.toFixed(4)}, ${lonNumber.toFixed(4)}`
}

function pickPresetMeta(form) {
  return LOCATION_PRESETS.find(
    (preset) =>
      preset.lat === form.lat &&
      preset.lon === form.lon &&
      preset.radius === form.radius &&
      preset.mode === form.mode
  )
}

function buildSliceHighlights(result) {
  if (!result) {
    return []
  }

  return [
    result.region_theme ? `这片区域当前被“${result.region_theme}”主导。` : '世界主题仍在等待生成。',
    result.dominant_faction ? `主导势力是 ${result.dominant_faction}。` : '主导势力尚未显形。',
    result.poi_count
      ? `附近浮现 ${result.poi_count} 个可观察节点，可直接点入。`
      : '这次切片还没有稳定的观察节点。',
  ]
}

function buildWorldAtmosphere(result) {
  if (!result) {
    return '先选择一个入口，世界才会开始组织自己的语气。'
  }

  const sourceText = result.provider || 'unknown source'
  const cacheText = result.cache_status || 'fresh'
  return `现实骨架来自 ${sourceText}，当前缓存状态为 ${cacheText}。你现在看到的不是表单结果，而是一段可进入的局部世界。`
}

export default function App() {
  const restoredSession = useMemo(loadPersistedWorldSession, [])
  const restoredWritebackSession = useMemo(loadPersistedWritebackSession, [])
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
  const [originLabel, setOriginLabel] = useState(restoredSession?.originLabel || '演示样例世界')
  const [originHint, setOriginHint] = useState(restoredSession?.originHint || '先用预设入口确认世界生成链路，再切到实时地图。')
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
  const [activePoi, setActivePoi] = useState(restoredWritebackSession?.activePoi || null)
  const [familiarityMap, setFamiliarityMap] = useState(restoredWritebackSession?.familiarityMap || {})

  const api = useMemo(() => createApiClient(() => apiBase.replace(/\/$/, '')), [apiBase])
  const presetMeta = pickPresetMeta(form)
  const previewUrl = result?.preview_url || ''
  const worldPois = result?.world?.pois || []
  const recentEchoes = writebackResult?.place_state?.recent_echoes || []
  const recentMarks = writebackResult?.place_state?.marks || []
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
      const canReuseWriteback = Boolean(
        restoredWritebackSession?.sliceId &&
          nextSliceId &&
          restoredWritebackSession.sliceId === nextSliceId
      )

      setResult(payload)
      setAdvancedOpen(true)
      setErrorText('')

      if (canReuseWriteback) {
        setActivePoiId(restoredWritebackSession?.activePoiId || null)
        setActivePoi(restoredWritebackSession?.activePoi || null)
        setFamiliarityMap(restoredWritebackSession?.familiarityMap || {})
        setWritebackResult(restoredWritebackSession?.writebackResult || null)
        setWritebackForm((current) => ({
          ...current,
          ...(restoredWritebackSession?.writebackForm || {}),
          sliceId: nextSliceId || current.sliceId,
          targetId:
            restoredWritebackSession?.writebackForm?.targetId ||
            payload.primary_poi_id ||
            current.targetId,
          zoneId:
            restoredWritebackSession?.writebackForm?.zoneId ||
            payload.primary_zone_id ||
            current.zoneId,
        }))
      } else {
        setActivePoiId(null)
        setActivePoi(null)
        setFamiliarityMap({})
        setWritebackResult(null)
        setWritebackForm((current) => ({
          ...current,
          sliceId: nextSliceId || current.sliceId,
          targetId: payload.primary_poi_id || current.targetId,
          zoneId: payload.primary_zone_id || current.zoneId,
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
    } catch (error) {
      setWritebackError(`写回失败：${error.message || String(error)}`)
    } finally {
      setWritebackSubmitting(false)
    }
  }

  useEffect(() => {
    checkBackend()
  }, [])

  useEffect(() => {
    setOrchestrationEvents([])
  }, [result?.world_id, writebackForm.playerId])

  useEffect(() => {
    persistWorldSession({
      form,
      result,
      originLabel,
      originHint,
    })
  }, [form, result, originLabel, originHint])

  useEffect(() => {
    persistWritebackSession({
      sliceId: result?.world_id || writebackForm.sliceId,
      activePoiId,
      activePoi,
      familiarityMap,
      writebackForm,
      writebackResult,
    })
  }, [activePoi, activePoiId, familiarityMap, result, writebackForm, writebackResult])

  return (
    <div className="wrap app-shell">
      <section className="hero panel">
        <div className="hero-copy">
          <p className="eyebrow">Player-facing world explorer</p>
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
              {checking ? 'Checking...' : '重新检查服务'}
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
        <section className="panel primary-panel">
          <div className="section-heading">
            <div>
              <p className="mini-label">Step 1</p>
              <h2>选择入口并生成世界</h2>
            </div>
            <p className="note muted">
              优先用人类能理解的入口，再把坐标与种子折叠为高级选项。
              {lastSessionAt ? ` 已恢复上次记录：${new Date(lastSessionAt).toLocaleString()}` : ''}
            </p>
          </div>

          <div className="origin-card">
            <div className="origin-card-copy">
              <strong>{originLabel}</strong>
              <p className="note muted">{originHint}</p>
            </div>
            <div className="origin-card-meta">
              <span>{formatCoordinates(form.lat, form.lon)}</span>
              <span>{form.radius}m 半径</span>
            </div>
          </div>

          <div className="preset-grid">
            {LOCATION_PRESETS.map((preset) => {
              const active = preset.id === presetMeta?.id
              return (
                <button
                  key={preset.id}
                  type="button"
                  className={`preset-card${active ? ' active' : ''}`}
                  onClick={() => usePreset(preset)}
                >
                  <span className="preset-title">{preset.title}</span>
                  <span className="preset-subtitle">{preset.subtitle}</span>
                  <span className="preset-meta">{preset.mode === 'fixture' ? '离线稳定' : '实时地图'} · {preset.radius}m</span>
                </button>
              )
            })}
          </div>

          <div className="actions origin-actions">
            <button type="button" className="secondary" disabled={locating} onClick={useCurrentLocation}>
              {locating ? '定位中...' : '用我的当前位置'}
            </button>
            <button type="button" disabled={submitting} onClick={() => submitNearby(false)}>
              {submitting ? '生成中...' : '生成世界预览'}
            </button>
            <button type="button" className="secondary" disabled={submitting} onClick={() => submitNearby(true)}>
              刷新实时地图
            </button>
          </div>

          <button
            type="button"
            className="ghost-toggle"
            onClick={() => setAdvancedOpen((current) => !current)}
          >
            {advancedOpen ? '收起高级参数' : '展开高级参数'}
          </button>

          {advancedOpen ? (
            <div className="advanced-panel">
              <div className="row">
                <div>
                  <label htmlFor="lat">Latitude</label>
                  <input id="lat" type="number" step="0.000001" value={form.lat} onChange={(event) => updateForm('lat', event.target.value)} />
                </div>
                <div>
                  <label htmlFor="lon">Longitude</label>
                  <input id="lon" type="number" step="0.000001" value={form.lon} onChange={(event) => updateForm('lon', event.target.value)} />
                </div>
                <div>
                  <label htmlFor="radius">Radius (m)</label>
                  <input id="radius" type="number" min="1" step="1" value={form.radius} onChange={(event) => updateForm('radius', event.target.value)} />
                </div>
              </div>

              <div className="row-2">
                <div>
                  <label htmlFor="mode">World source</label>
                  <select id="mode" value={form.mode} onChange={(event) => updateForm('mode', event.target.value)}>
                    <option value="live">Live OSM</option>
                    <option value="fixture">Fixture demo</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="seed">Seed</label>
                  <input id="seed" type="text" placeholder="optional stable seed" value={form.seed} onChange={(event) => updateForm('seed', event.target.value)} />
                </div>
              </div>
            </div>
          ) : null}

          {errorText ? <p className="note error-note">{errorText}</p> : null}
        </section>

        <section className="panel secondary-panel">
          <div className="section-heading">
            <div>
              <p className="mini-label">Step 2</p>
              <h2>当前切片结果</h2>
            </div>
            <p className="note muted">生成成功后，这里先给出世界摘要，再进入地图和文字观察窗。</p>
          </div>

          {result ? (
            <div className="result-stack">
              <div className="result-card emphasis-card story-card">
                <p className="mini-label">World snapshot</p>
                <h3 className="story-card-title">{result.region_theme || '未命名切片'}</h3>
                <p className="note story-card-copy">{worldAtmosphere}</p>
                <div className="story-chip-row">
                  <span>Faction · {result.dominant_faction || '-'}</span>
                  <span>POI · {result.poi_count ?? '-'}</span>
                  <span>Roads · {result.road_count ?? '-'}</span>
                  <span>Landmarks · {result.landmark_count ?? '-'}</span>
                </div>
              </div>

              <div className="result-grid">
                <div className="result-card">
                  <p className="mini-label">你将进入什么</p>
                  <div className="story-bullets">
                    {sliceHighlights.map((item) => (
                      <div key={item} className="story-bullet">{item}</div>
                    ))}
                  </div>
                </div>
                <div className="result-card">
                  <p className="mini-label">下一步</p>
                  <div className="story-bullets">
                    <div className="story-bullet">先打开下方地图，悬停节点查看地点名字与讽刺钩子。</div>
                    <div className="story-bullet">点击一个节点，页面会把它提升为当前观察目标。</div>
                    <div className="story-bullet">如果要看更完整的文本世界，再打开文字预览。</div>
                  </div>
                </div>
              </div>

              <div className="link-row action-links">
                <a className="button-link" href={result.preview_url} target="_blank" rel="noreferrer">打开预览</a>
                <a href={result.world_url} target="_blank" rel="noreferrer">world.json</a>
                <a href={result.manifest_url} target="_blank" rel="noreferrer">manifest.json</a>
              </div>
            </div>
          ) : (
            <div className="empty-state story-empty-state">
              <div>
                <p className="empty-title">还没有打开任何世界切片</p>
                <p className="note muted">先选一个入口：可以用预设地点，也可以直接用浏览器定位。</p>
                <div className="empty-chips">
                  <span>{statusOk ? '服务已就绪' : '先确认服务'}</span>
                  <span>推荐先试演示样例世界</span>
                  <span>生成后可直接点地图节点</span>
                </div>
              </div>
            </div>
          )}
        </section>
      </div>

      <section className="panel preview-panel player-preview-panel storyboard-panel">
        <div className="section-heading storyboard-heading">
          <div>
            <p className="mini-label">Step 3</p>
            <h2>进入 2D 世界地图</h2>
          </div>
          <div className="storyboard-heading-copy">
            <p className="note muted">这里不再是平面预览区，而是你附近切片被转译成 2D 游戏世界地图的主舞台。</p>
          </div>
        </div>

        <div className="storyboard-shell">
          <div className="storyboard-shell-top">
            <div className="storyboard-category">
              <span className="storyboard-category-label">World biome</span>
              <div className="storyboard-chip-row">
                <span className={`storyboard-chip${result ? '' : ' storyboard-chip--empty'}`}>
                  {result ? '切片已就绪' : '待生成'}
                </span>
                <span className="storyboard-chip">{result?.world?.region?.vibe_profile || 'quiet_rain'}</span>
                <span className="storyboard-chip">{result?.dominant_faction || '未显形势力'}</span>
                <span className="storyboard-chip">{result?.region_theme || '未命名切片'}</span>
              </div>
            </div>
            <div className="storyboard-category">
              <span className="storyboard-category-label">Adventure setup</span>
              <div className="storyboard-chip-row">
                <span className="storyboard-chip">{originLabel}</span>
                <span className="storyboard-chip">{form.radius}m 半径</span>
                <span className="storyboard-chip">{result?.landmark_count ?? 0} 个地标</span>
              </div>
            </div>
          </div>

          <div className="storyboard-map-frame">
            <WorldMap
              world={result?.world}
              onPoiClick={handlePoiClick}
              activePoiId={activePoiId}
              familiarityMap={familiarityMap}
              originLabel={originLabel}
            />
          </div>

          <div className="storyboard-shell-bottom">
            <div className="storyboard-lane">
              <div className="storyboard-lane-header">
                <span className="storyboard-category-label">探索引导</span>
                <span className="storyboard-lane-meta">按 2D 世界地图的方式进入，而不是读表单</span>
              </div>
              {result?.world_id ? (
                <WorldDensityIndicator
                  sliceId={result.world_id}
                  playerId={writebackForm.playerId}
                  lat={form.lat}
                  lon={form.lon}
                  onEvent={handleOrchestrationEvent}
                />
              ) : null}
              <div className="shared-task-grid">
                <article className={`shared-task-card shared-task-card--gen${result ? ' is-done' : submitting ? ' is-loading' : ''}`}>
                  <span className="shared-task-index">00</span>
                  <div className="shared-task-gen-body">
                    <h3>{result ? result.region_theme || '世界已生成' : '生成当前切片'}</h3>
                    <p className="shared-task-gen-meta">
                      {result
                        ? `${result.poi_count ?? 0} 个节点 · ${result.road_count ?? 0} 条路径 · ${result.dominant_faction || '未知势力'}`
                        : `${originLabel} · ${form.radius}m · ${form.mode === 'fixture' ? '离线样例' : '实时地图'}`
                      }
                    </p>
                    {!result ? (
                      <div className="shared-task-gen-actions">
                        <button
                          type="button"
                          className="shared-task-gen-btn"
                          disabled={submitting}
                          onClick={() => submitNearby(false)}
                        >
                          {submitting ? '生成中...' : '生成世界'}
                        </button>
                        <button
                          type="button"
                          className="shared-task-gen-btn secondary"
                          disabled={submitting}
                          onClick={() => submitNearby(true)}
                        >
                          刷新
                        </button>
                      </div>
                    ) : (
                      <div className="shared-task-gen-actions">
                        <button
                          type="button"
                          className="shared-task-gen-btn secondary"
                          disabled={submitting}
                          onClick={() => submitNearby(true)}
                        >
                          {submitting ? '刷新中...' : '重新生成'}
                        </button>
                      </div>
                    )}
                  </div>
                </article>
                <article className={`shared-task-card${resolvedActivePoi ? ' is-active' : ''}`}>
                  <span className="shared-task-index">01</span>
                  <div>
                    <h3>选一个据点</h3>
                    <p>{resolvedActivePoi ? `${resolvedActivePoi.fantasy_name} 已成为当前主据点。` : '先在地图上点击一个节点，把它变成你这次进入世界的主据点。'}</p>
                  </div>
                </article>
                <article className="shared-task-card">
                  <span className="shared-task-index">02</span>
                  <div>
                    <h3>读地图气氛</h3>
                    <p>{resolvedActivePoi?.satire_hook || '悬停节点先读名字、阵营、钩子，再决定往哪一块世界深入。'}</p>
                  </div>
                </article>
                <article className="shared-task-card">
                  <span className="shared-task-index">03</span>
                  <div>
                    <h3>留下你的动静</h3>
                    <p>{writebackResult ? `最近一次观察已经落在 ${writebackResult?.event?.target?.target_id || writebackForm.targetId || '当前地点'}。` : '点“驻足观察”，把这次进入留成地点的第一层痕迹。'}</p>
                  </div>
                </article>
                <article className="shared-task-card shared-task-card--visibility">
                  <span className="shared-task-index">04</span>
                  <div>
                    <h3>决定这次写回留在哪一层</h3>
                    <p>{selectedVisibilityMeta.title} · {selectedVisibilityMeta.hint}</p>
                  </div>
                </article>
              </div>

              {orchestrationEvents.length ? (
                <div className="storyboard-lane orchestration-lane">
                  <div className="storyboard-lane-header">
                    <span className="storyboard-category-label">编排事件</span>
                    <span className="storyboard-lane-meta">世界编排器正在根据当前切片与你的位置发出信号</span>
                  </div>
                  <div className="orchestration-event-grid">
                    {orchestrationEvents.map((event, index) => (
                      <article key={`${event.type}-${event.priority}-${index}`} className="orchestration-event-card">
                        <strong>{event.type || 'unknown_event'}</strong>
                        <span>priority · {event.priority ?? '-'}</span>
                      </article>
                    ))}
                  </div>
                </div>
              ) : null}

              <div className="storyboard-lane d3-lane">
                <div className="storyboard-lane-header">
                  <span className="storyboard-category-label">D3 · 玩家参与入口</span>
                  <span className="storyboard-lane-meta">把写回动作解释成城市神话共创的上游入口，而不是孤立按钮</span>
                </div>
                <div className="d3-entry-hero">
                  <div>
                    <p className="mini-label">City myth co-creation</p>
                    <h3>{selectedVisibilityMeta.participationLabel}</h3>
                    <p>{selectedVisibilityMeta.semantics}</p>
                  </div>
                  <div className="d3-entry-pill-group">
                    <span className="d3-entry-pill">当前动作 · {selectedActionMeta.label}</span>
                    <span className="d3-entry-pill">可见性 · {selectedVisibilityMeta.label}</span>
                    <span className="d3-entry-pill">目标 · {writebackForm.eventType === 'dwell' ? 'zone' : 'poi'}</span>
                  </div>
                </div>

                <div className="d3-entry-grid">
                  {VISIBILITY_OPTIONS.map((option, index) => {
                    const active = writebackForm.visibility === option.value
                    return (
                      <article key={option.value} className={`d3-entry-card${active ? ' is-active' : ''}`}>
                        <span className="d3-entry-index">0{index + 1}</span>
                        <strong>{option.participationLabel}</strong>
                        <p>{option.semantics}</p>
                        <div className="d3-entry-copy">
                          <span>{option.participationAction}</span>
                          <span>{option.participationReward}</span>
                        </div>
                      </article>
                    )
                  })}
                </div>

                <div className="d3-flow-grid">
                  <article className="d3-flow-card">
                    <strong>即时反馈</strong>
                    <p>{selectedActionMeta.label} 会先改变玩家状态、地点状态与当前切片反馈，属于你这次进入的即时回响。</p>
                  </article>
                  <article className="d3-flow-card">
                    <strong>持久写回</strong>
                    <p>{selectedVisibilityMeta.participationAction}</p>
                  </article>
                  <article className="d3-flow-card">
                    <strong>神话推进</strong>
                    <p>{selectedVisibilityMeta.participationReward}</p>
                  </article>
                </div>
              </div>
            </div>
 
            <div className="storyboard-lane">
              <div className="storyboard-lane-header">
                <span className="storyboard-category-label">当前舞台卡</span>
                <span className="storyboard-lane-meta">把选中的地点当成 RPG 世界节点来看</span>
              </div>
              {resolvedActivePoi ? (
                <div className="storyboard-stage-stack">
                  <div className="poi-detail-bar storyboard-poi-bar">
                    <span className="poi-detail-name">{resolvedActivePoi.fantasy_name}</span>
                    <span className="poi-detail-type muted">{resolvedActivePoi.fantasy_type}</span>
                    <span className="poi-detail-satire">{resolvedActivePoi.satire_hook}</span>
                    <span className="poi-detail-emotion muted">{resolvedActivePoi.emotion_hook}</span>
                  </div>

                  <div className="writeback-action-panel">
                    <div className="writeback-action-header">
                      <div>
                        <p className="mini-label">P6 · 写回动作</p>
                        <h3>在主舞台直接触发 observe / dwell / mark</h3>
                      </div>
                      <span className="writeback-action-target">{writebackTargetSummary}</span>
                    </div>

                    <div className="writeback-action-grid">
                      {WRITEBACK_ACTIONS.map((action) => {
                        const active = writebackForm.eventType === action.eventType
                        return (
                          <button
                            key={action.eventType}
                            type="button"
                            className={`writeback-action-card${active ? ' is-active' : ''}`}
                            onClick={() => applyWritebackAction(action.eventType)}
                          >
                            <strong>{action.label}</strong>
                            <span>{action.hint}</span>
                          </button>
                        )
                      })}
                    </div>

                    <div className="writeback-quick-panel">
                      <div className="writeback-quick-meta">
                        <strong>{selectedActionMeta.label}</strong>
                        <span>{selectedActionMeta.hint}</span>
                      </div>

                      {writebackForm.eventType === 'observe' ? (
                        <label className="writeback-inline-field">
                          <span>观察强度</span>
                          <input
                            type="number"
                            min="1"
                            max="3"
                            step="1"
                            value={writebackForm.intensity}
                            onChange={(event) => updateWritebackForm('intensity', event.target.value)}
                          />
                        </label>
                      ) : null}

                      {writebackForm.eventType === 'mark' ? (
                        <label className="writeback-inline-field">
                          <span>标记类型</span>
                          <select value={writebackForm.tag} onChange={(event) => updateWritebackForm('tag', event.target.value)}>
                            <option value="safe">safe</option>
                            <option value="uncanny">uncanny</option>
                            <option value="warm_corner">warm_corner</option>
                            <option value="return_again">return_again</option>
                            <option value="rain_friendly">rain_friendly</option>
                          </select>
                        </label>
                      ) : null}

                      <label className="writeback-inline-field writeback-inline-field--wide">
                        <span>补充说明</span>
                        <input
                          type="text"
                          value={writebackForm.note}
                          onChange={(event) => updateWritebackForm('note', event.target.value)}
                          placeholder="可选的一句备注，用于帮助你回访时辨认这次写回"
                        />
                      </label>

                      <label className="writeback-inline-field">
                        <span>可见性</span>
                        <select value={writebackForm.visibility} onChange={(event) => updateWritebackForm('visibility', event.target.value)}>
                          {VISIBILITY_OPTIONS.map((option) => (
                            <option key={option.value} value={option.value}>{option.label}</option>
                          ))}
                        </select>
                      </label>

                      <button
                        type="button"
                        className="writeback-primary-btn"
                        disabled={writebackSubmitting}
                        onClick={submitWriteback}
                      >
                        {getActionButtonText(writebackForm.eventType, writebackSubmitting)}
                      </button>
                    </div>

                    <div className="writeback-visibility-panel">
                      <div className="writeback-visibility-header">
                        <div>
                          <p className="mini-label">D3 · 参与与可见性</p>
                          <h3>这次写回准备留在什么层</h3>
                        </div>
                        <span className={`writeback-visibility-badge writeback-visibility-badge--${selectedVisibilityMeta.value}`}>
                          {selectedVisibilityMeta.label}
                        </span>
                      </div>
                      <p className="writeback-visibility-summary">{selectedVisibilityMeta.title} · {selectedVisibilityMeta.hint}</p>
                      <div className="writeback-visibility-grid">
                        {VISIBILITY_OPTIONS.map((option) => (
                          <article key={option.value} className={`writeback-visibility-card${writebackForm.visibility === option.value ? ' is-active' : ''}`}>
                            <strong>{option.label}</strong>
                            <span>{option.title}</span>
                            <p>{option.access}</p>
                          </article>
                        ))}
                      </div>
                    </div>

                    {writebackError ? <p className="note error-note">{writebackError}</p> : null}

                    {writebackTimeline.length ? (
                      <div className="writeback-structured-panel">
                        <div className="writeback-structured-header">
                          <div>
                            <p className="mini-label">结构化状态变化</p>
                            <h3>本次写回已经产生可验证的状态链路</h3>
                          </div>
                          <span className="writeback-persistence-badge">{writebackResult?.persistence?.stored_event_count ?? 0} stored events</span>
                        </div>

                        <div className={`writeback-revisit-banner${revisitSummary.sameSlice ? ' is-valid' : ''}`}>
                          <div>
                            <strong>{revisitSummary.sameSlice ? '回访验证成功' : '等待同一 slice 回访验证'}</strong>
                            <p>
                              {revisitSummary.sameSlice
                                ? `当前切片 ${revisitSummary.currentSliceId} 与最近一次写回目标一致，说明这次进入仍然挂着你上次留下的痕迹。`
                                : `最近写回记录来自 ${revisitSummary.persistedSliceId || '未知 slice'}，当前切片为 ${revisitSummary.currentSliceId || '尚未生成'}。重新进入同一 slice 时，这里会继续显示残留痕迹。`}
                            </p>
                          </div>
                          <div className="writeback-revisit-stats">
                            <span>last_event={revisitSummary.lastEventType}</span>
                            <span>familiarity={revisitSummary.familiarity}</span>
                            <span>stored_events={revisitSummary.storedEvents}</span>
                          </div>
                        </div>

                        <div className="writeback-timeline">
                          {writebackTimeline.map((item) => (
                            <article key={item.id} className="writeback-timeline-item">
                              <strong>{item.title}</strong>
                              <p>{item.text}</p>
                            </article>
                          ))}
                        </div>

                        {writebackResidues.length ? (
                          <div className="writeback-residue-grid">
                            {writebackResidues.map((group) => (
                              <article key={group.id} className="writeback-residue-card">
                                <strong>{group.title}</strong>
                                <ul>
                                  {group.items.map((item) => (
                                    <li key={item}>{item}</li>
                                  ))}
                                </ul>
                              </article>
                            ))}
                          </div>
                        ) : null}
                      </div>
                    ) : (
                      <div className="storyboard-placeholder-card writeback-placeholder-card">
                        <strong>等待第一次主舞台写回</strong>
                        <p>先在上方选择 observe、dwell 或 mark，然后直接把动作提交到 [`/api/world/event`](frontend/src/App.jsx:52)。这里会显示玩家状态、地点状态、世界反馈与持久化结果。</p>
                      </div>
                    )}

                    <div className="behavior-insight-panel">
                      <div className="writeback-visibility-header behavior-insight-header">
                        <div>
                          <p className="mini-label">AIO4 · 行为到意义</p>
                          <h3>这段行动正在形成怎样的玩家含义</h3>
                        </div>
                        <span className="writeback-persistence-badge">{behaviorInsights?.dominant_meaning || 'waiting_trace'}</span>
                      </div>
                      {behaviorInsights ? (
                        <>
                          <p className="writeback-visibility-summary">
                            myth entry · {behaviorInsights.myth_entry || 'unnamed_drifter'} · dominant district · {behaviorInsights.dominant_district || 'unknown'}
                          </p>
                          <div className="behavior-score-grid">
                            <article className="behavior-score-card">
                              <strong>explorer</strong>
                              <span>{behaviorInsights.explorer_score ?? 0}</span>
                            </article>
                            <article className="behavior-score-card">
                              <strong>chronicler</strong>
                              <span>{behaviorInsights.chronicler_score ?? 0}</span>
                            </article>
                            <article className="behavior-score-card">
                              <strong>restorer</strong>
                              <span>{behaviorInsights.restorer_score ?? 0}</span>
                            </article>
                            <article className="behavior-score-card">
                              <strong>recluse</strong>
                              <span>{behaviorInsights.recluse_score ?? 0}</span>
                            </article>
                            <article className="behavior-score-card">
                              <strong>resonant</strong>
                              <span>{behaviorInsights.resonant_score ?? 0}</span>
                            </article>
                          </div>
                          <div className="behavior-action-summary">
                            {Object.entries(behaviorInsights.action_counts || {}).map(([key, value]) => (
                              <span key={key} className="d3-entry-pill">{key} · {value}</span>
                            ))}
                          </div>
                        </>
                      ) : (
                        <p className="writeback-visibility-summary">等待行为轨迹输入。第一次写回后，这里会把事件流编译成更高层的玩家角色倾向。</p>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="storyboard-placeholder-card">
                  <strong>等待你选中第一块地图据点</strong>
                  <p>这张地图应该像 2D 游戏世界入口，而不是静态平面图。先点一个地点，右侧信息就会变成你的当前舞台卡。</p>
                  {writebackResult && lastWritebackPoiId ? (
                    <button type="button" className="storyboard-inline-btn" onClick={focusWritebackTarget}>
                      回到上次写回目标
                    </button>
                  ) : null}
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      <section className="panel admin-panel">
        <div className="admin-header">
          <div>
            <p className="mini-label">Admin / Debug</p>
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
                <h3>Backend connection</h3>
                <label htmlFor="server-base">API base URL</label>
                <div className="row-2">
                  <input id="server-base" type="text" value={apiBase} onChange={(event) => setApiBase(event.target.value)} />
                  <button type="button" className="secondary" disabled={checking} onClick={checkBackend}>
                    {checking ? 'Checking...' : 'Recheck'}
                  </button>
                </div>
                <p className="status">
                  <span className={`dot${statusOk ? ' ok' : ''}`}></span>
                  <span>{statusText}</span>
                </p>
                <p className="note muted">{statusDetail}</p>
              </section>

              <section className="panel inner-panel">
                <h3>Writeback event</h3>
                <p className="note">使用同一切片提交最小事件，验证玩家状态、地点痕迹与世界反馈是否会被后端持久化。</p>
                <div className="row-3">
                  <div>
                    <label htmlFor="player-id">Player ID</label>
                    <input id="player-id" type="text" value={writebackForm.playerId} onChange={(event) => updateWritebackForm('playerId', event.target.value)} />
                  </div>
                  <div>
                    <label htmlFor="event-type">Event type</label>
                    <select id="event-type" value={writebackForm.eventType} onChange={(event) => updateWritebackForm('eventType', event.target.value)}>
                      <option value="observe">observe</option>
                      <option value="dwell">dwell</option>
                      <option value="mark">mark</option>
                    </select>
                  </div>
                  <div>
                    <label htmlFor="visibility">Visibility</label>
                    <select id="visibility" value={writebackForm.visibility} onChange={(event) => updateWritebackForm('visibility', event.target.value)}>
                      <option value="private">private</option>
                      <option value="local_public">local_public</option>
                      <option value="global">global</option>
                    </select>
                  </div>
                </div>
                <div className="row-3">
                  <div>
                    <label htmlFor="target-type">Target type</label>
                    <select id="target-type" value={writebackForm.targetType} onChange={(event) => updateWritebackForm('targetType', event.target.value)}>
                      <option value="poi">poi</option>
                      <option value="zone">zone</option>
                      <option value="route">route</option>
                      <option value="home">home</option>
                      <option value="world">world</option>
                    </select>
                  </div>
                  <div>
                    <label htmlFor="target-id">Target ID</label>
                    <input id="target-id" type="text" value={writebackForm.targetId} onChange={(event) => updateWritebackForm('targetId', event.target.value)} />
                  </div>
                  <div>
                    <label htmlFor="slice-id">Slice ID</label>
                    <input id="slice-id" type="text" value={writebackForm.sliceId} onChange={(event) => updateWritebackForm('sliceId', event.target.value)} />
                  </div>
                </div>
                <div className="row-3">
                  <div>
                    <label htmlFor="zone-id">Zone ID</label>
                    <input id="zone-id" type="text" value={writebackForm.zoneId} onChange={(event) => updateWritebackForm('zoneId', event.target.value)} />
                  </div>
                  <div>
                    <label htmlFor="intensity">Observe intensity</label>
                    <input id="intensity" type="number" min="1" max="3" step="1" value={writebackForm.intensity} onChange={(event) => updateWritebackForm('intensity', event.target.value)} />
                  </div>
                  <div>
                    <label htmlFor="mark-tag">Mark tag</label>
                    <select id="mark-tag" value={writebackForm.tag} onChange={(event) => updateWritebackForm('tag', event.target.value)}>
                      <option value="safe">safe</option>
                      <option value="uncanny">uncanny</option>
                      <option value="warm_corner">warm_corner</option>
                      <option value="return_again">return_again</option>
                      <option value="rain_friendly">rain_friendly</option>
                    </select>
                  </div>
                </div>
                <label htmlFor="writeback-note">Optional note</label>
                <input id="writeback-note" type="text" value={writebackForm.note} onChange={(event) => updateWritebackForm('note', event.target.value)} placeholder="lightweight annotation for the event" />
                <div className="actions">
                  <button type="button" disabled={writebackSubmitting} onClick={submitWriteback}>
                    {writebackSubmitting ? 'Writing back...' : 'Submit writeback event'}
                  </button>
                </div>
                {writebackError ? <p className="note error-note">{writebackError}</p> : null}
              </section>
            </div>

            {writebackResult ? (
              <div className="writeback-grid">
                <div className="result-card">
                  <h3>Player state</h3>
                  <div><strong>Action:</strong> {playerState?.action_state || '-'}</div>
                  <div><strong>Clarity:</strong> {playerState?.clarity ?? '-'}</div>
                  <div><strong>Tension:</strong> {playerState?.tension ?? '-'}</div>
                  <div><strong>Attunement:</strong> {playerState?.attunement ?? '-'}</div>
                  <div><strong>Zone familiarity:</strong> {JSON.stringify(playerState?.zone_familiarity || {})}</div>
                  <div><strong>POI familiarity:</strong> {JSON.stringify(playerState?.poi_familiarity || {})}</div>
                </div>
                <div className="result-card">
                  <h3>Place state</h3>
                  <div><strong>Target:</strong> {writebackResult.place_state?.target_id || '-'}</div>
                  <div><strong>Type:</strong> {writebackResult.place_state?.target_type || '-'}</div>
                  <div><strong>Familiarity:</strong> {writebackResult.place_state?.familiarity ?? '-'}</div>
                  <div><strong>Mark count:</strong> {writebackResult.place_state?.mark_count ?? '-'}</div>
                  <div><strong>Last event:</strong> {writebackResult.place_state?.last_event_type || '-'}</div>
                  <div><strong>Stored events:</strong> {writebackResult.persistence?.stored_event_count ?? '-'}</div>
                </div>
                <div className="result-card">
                  <h3>World feedback</h3>
                  <div><strong>Summary:</strong> {feedback?.summary || '-'}</div>
                  <div><strong>Broadcast:</strong> {(feedback?.broadcast_hints || []).join(' · ') || '-'}</div>
                  <div><strong>Revealed:</strong> {(feedback?.revealed_fields || []).join(' · ') || '-'}</div>
                  <div><strong>Persistence file:</strong> {writebackResult.persistence?.state_file || '-'}</div>
                </div>
              </div>
            ) : null}

            {recentEchoes.length ? (
              <div className="result-card stacked-card">
                <h3>Recent echoes</h3>
                {recentEchoes.map((entry) => (
                  <div key={`${entry.timestamp}-${entry.target_id}-${entry.entry_type}`} className="subtle-block">
                    <strong>{entry.entry_type}</strong> · {entry.text}
                  </div>
                ))}
              </div>
            ) : null}

            {recentMarks.length ? (
              <div className="result-card stacked-card">
                <h3>Recent marks</h3>
                {recentMarks.map((entry) => (
                  <div key={entry.event_id} className="subtle-block">
                    <strong>{entry.tag}</strong> · {entry.visibility} {entry.note ? `· ${entry.note}` : ''}
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
