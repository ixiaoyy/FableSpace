import {
  getSpaceAccessIcon,
  getSpaceAccessMarkerLabel,
} from './services/spaceService.js'

const ACCESS_LINES = {
  public: '可推门进入',
  password: '门口需要口令',
  private: '主人私域',
}

function toTrimmedText(value) {
  return typeof value === 'string' ? value.trim() : ''
}

function formatCoordinate(value) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed.toFixed(4) : ''
}

export function formatSpaceAnchorLocation(space = {}) {
  const address = toTrimmedText(space?.address)
  if (address) {
    return {
      label: '街角门牌',
      text: address,
      line: `街角门牌 · ${address}`,
    }
  }

  const lat = formatCoordinate(space?.lat)
  const lon = formatCoordinate(space?.lon)
  if (lat && lon) {
    const text = `${lat}, ${lon}`
    return {
      label: '坐标门牌',
      text,
      line: `坐标门牌 · ${text}`,
    }
  }

  return {
    label: '真实锚点',
    text: '坐标待确认',
    line: '真实锚点 · 坐标待确认',
  }
}

export function buildMapAnchorCardCopy(space = {}) {
  const anchor = formatSpaceAnchorLocation(space)
  const statusLine = space?.status === 'closed'
    ? '灯牌暂暗 · 可以先记下门牌'
    : space?.status === 'open'
      ? '灯牌亮着 · 附近有人经营'
      : '灯牌状态待确认 · 真实锚点保留'
  const accessLine = ACCESS_LINES[space?.access] || '入口规则待确认'

  return {
    eyebrow: '街区灯牌',
    anchor,
    anchorLine: anchor.line,
    locationLabel: anchor.label,
    locationText: anchor.text,
    statusLine,
    accessLine,
    descriptionFallback: '店主还没有把门口故事写出来。',
  }
}

export function buildMapAnchorMarkerCopy(space = {}) {
  const name = toTrimmedText(space?.name) || '未命名空间'
  const icon = getSpaceAccessIcon(space?.access)
  const accessLabel = getSpaceAccessMarkerLabel(space?.access)
  const statusText = space?.status === 'closed'
    ? '灯牌暂暗'
    : space?.status === 'open'
      ? '灯牌亮着'
      : '灯牌待确认'

  return {
    name,
    badgeLabel: `${icon} ${accessLabel}灯牌`,
    statusText,
    title: `${name} · ${statusText}`,
  }
}

export function buildMapAnchorSummaryCopy({ matching = 0, total = 0 } = {}) {
  const safeMatching = Math.max(0, Number.isFinite(Number(matching)) ? Number(matching) : 0)
  const parsedTotal = Math.max(0, Number.isFinite(Number(total)) ? Number(total) : 0)
  const safeTotal = parsedTotal || safeMatching

  if (!safeTotal) {
    return '这片街区还没有灯牌亮起'
  }

  return `街区里有 ${safeMatching} / ${safeTotal} 盏灯牌可查看`
}
