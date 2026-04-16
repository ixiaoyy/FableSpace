const TAG_LABELS_ZH = {
  verdant_district: '绿意城区',
  healing_quarter: '疗愈街区',
  market_quarter: '市集街区',
  bureau_district: '秩序街区',
  scholar_quarter: '学识街区',
  threshold_district: '边界地带',
  trade_guild: '贸易行会',
  order_bureau: '秩序局',
  clinic_circle: '诊疗环',
  memory_collective: '记忆共社',
  night_bloom: '夜绽社',
  ghibli_town: '绿野町',
  quiet_rain: '静雨',
  neon_nostalgia: '霓虹怀旧',
  amber_evening: '琥珀夜色',
  iron_blue: '铁蓝',
  chalk_dawn: '粉笔黎明',
  whispering_grove: '低语林苑',
  healing_sanctum: '疗愈圣所',
  supply_outpost: '补给站',
  judgement_tower: '裁定塔',
  ember_parlor: '余烬馆',
  lore_academy: '学识堂',
  debt_cathedral: '债务堂',
  feast_hall: '宴飨厅',
  refuel_station: '补能站',
  memory_archive: '记忆档案馆',
  spirit_sanctum: '灵息圣所',
  dormant_lot: '静置空场',
  remedy_post: '疗护铺',
  labor_forge: '劳作工坊',
  contract_spire: '契约尖塔',
}

const PROVIDER_LABELS_ZH = {
  live: '实时地图',
  fixture: '离线样例',
  unknown: '未知来源',
}

const CACHE_STATUS_LABELS_ZH = {
  fresh: '新生成',
  hit: '命中缓存',
  miss: '缓存未命中',
  stale: '旧缓存',
  bypassed: '跳过缓存',
  unknown: '未知状态',
}

const VISIBILITY_LABELS_ZH = {
  private: '仅自己可见',
  local_public: '区域公开',
  global: '城市神话层候选',
}

export function formatTagLabel(value, fallback = '未分类') {
  if (!value) {
    return fallback
  }
  return TAG_LABELS_ZH[value] || value.replace(/_/g, ' ')
}

export function formatProviderLabel(value) {
  if (!value) {
    return PROVIDER_LABELS_ZH.unknown
  }
  return PROVIDER_LABELS_ZH[value] || value
}

export function formatCacheStatusLabel(value) {
  if (!value) {
    return CACHE_STATUS_LABELS_ZH.unknown
  }
  return CACHE_STATUS_LABELS_ZH[value] || value
}

export function formatVisibilityLabel(value) {
  if (!value) {
    return VISIBILITY_LABELS_ZH.private
  }
  return VISIBILITY_LABELS_ZH[value] || value
}

export function normalizeSearchText(value) {
  return String(value || '').trim().toLowerCase()
}

export function getPoiTypeLabel(poi) {
  return formatTagLabel(poi?.fantasy_type || poi?.real_type || '', '未分类地点')
}

export function getPoiFactionLabel(poi) {
  return formatTagLabel(poi?.faction || poi?.district || poi?.alignment || '', '未知势力')
}

export function matchesPoiSearch(poi, query) {
  if (!query) {
    return true
  }

  const searchableText = [
    poi?.id,
    poi?.real_name,
    poi?.fantasy_name,
    poi?.real_type,
    poi?.fantasy_type,
    poi?.satire_hook,
    poi?.emotion_hook,
    poi?.faction,
    poi?.district,
    poi?.alignment,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()

  return searchableText.includes(query)
}

export function clampObserveIntensity(value) {
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) {
    return 1
  }
  return Math.min(3, Math.max(1, Math.round(parsed)))
}

export function getWritebackTargetSummary(activePoi, form) {
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

export function getActionButtonText(eventType, busy) {
  if (busy) {
    if (eventType === 'dwell') return '驻足写回中...'
    if (eventType === 'mark') return '标记写回中...'
    return '观察写回中...'
  }

  if (eventType === 'dwell') return '驻足'
  if (eventType === 'mark') return '留下标记'
  return '观察'
}

export function buildWritebackTimeline(payload) {
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
    text: `${eventType} 已发送到 ${targetId}，可见性为 ${formatVisibilityLabel(visibility)}。`,
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
    id: 'slice-feedback',
    title: '切片反馈',
    text: worldFeedback.summary || '地点切片暂时保持沉默。',
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
    text: `${payload?.persistence?.storage || '未知存储'} · events=${payload?.persistence?.stored_event_count ?? '-'} · ${payload?.persistence?.state_file || '-'}`,
  })

  return steps
}

export function buildWritebackResidue(placeState) {
  if (!placeState) {
    return []
  }

  const residues = []
  const echoes = Array.isArray(placeState.recent_echoes) ? placeState.recent_echoes.filter(Boolean) : []
  const marks = Array.isArray(placeState.marks) ? placeState.marks.filter(Boolean) : []

  if (echoes.length) {
    residues.push({
      id: 'echoes',
      title: '最近回声',
      items: echoes.slice(-3),
    })
  }

  if (marks.length) {
    residues.push({
      id: 'marks',
      title: '最近标记',
      items: marks.slice(-3).map((mark) => {
        const tag = mark?.tag || '未标记'
        const note = mark?.note ? ` · ${mark.note}` : ''
        return `${tag}${note}`
      }),
    })
  }

  const legend = placeState.place_legend
  if (legend?.narrative) {
    residues.push({
      id: 'place_legend',
      title: `地点传说（${legend.tier || '碎片'}）`,
      items: [
        legend.narrative,
        legend.vibe_summary ? `气质：${legend.vibe_summary}` : null,
      ].filter(Boolean),
    })
  }

  return residues
}

export function buildWritebackRevisitSummary(result, writebackResult, familiarityMap, writebackForm) {
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

export function formatCoordinates(lat, lon) {
  const latNumber = Number(lat)
  const lonNumber = Number(lon)
  if (!Number.isFinite(latNumber) || !Number.isFinite(lonNumber)) {
    return '坐标未设置'
  }
  return `${latNumber.toFixed(4)}, ${lonNumber.toFixed(4)}`
}

export function pickPresetMeta(form, locationPresets) {
  return locationPresets.find(
    (preset) =>
      preset.lat === form.lat &&
      preset.lon === form.lon &&
      preset.radius === form.radius &&
      preset.mode === form.mode
  )
}

export function buildSliceHighlights(result) {
  if (!result) {
    return []
  }

  return [
    result.region_theme ? `这片区域当前被“${formatTagLabel(result.region_theme, '未命名切片')}”主导。` : '地点主题仍在等待生成。',
    result.dominant_faction ? `主导势力是 ${formatTagLabel(result.dominant_faction, '未显形势力')}。` : '主导势力尚未显形。',
    result.poi_count
      ? `附近浮现 ${result.poi_count} 个可进入地点，可直接点选。`
      : '这次切片还没有稳定的可进入地点。',
  ]
}

export function buildSliceAtmosphere(result) {
  if (!result) {
    return '先选择一个入口，地点切片才会开始组织自己的语气。'
  }

  const sourceText = formatProviderLabel(result.provider)
  const cacheText = formatCacheStatusLabel(result.cache_status)
  return `现实骨架来自 ${sourceText}，当前缓存状态为 ${cacheText}。你现在看到的不是表单结果，而是一段可进入的地点切片。`
}
