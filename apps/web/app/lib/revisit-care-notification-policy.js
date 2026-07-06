export const REVISIT_CARE_GUARDRAILS = [
  '默认关闭，必须由访客主动订阅',
  '必须尊重 quiet hours 安静时段',
  '必须设置频控，避免持续打扰',
  '必须提供取消订阅',
  '不做营销推送、广告复活或公开社交流',
]

export const REVISIT_CARE_ALLOWED_TRIGGERS = [
  'owner_replied_feedback',
  'visitor_requested_reminder',
  'relationship_revisit_summary',
  'gameplay_followup_ready',
]

export const REVISIT_CARE_DEFAULT_POLICY = {
  optIn: false,
  quietHours: {
    enabled: true,
    start: '22:00',
    end: '08:00',
    timezone: 'visitor-local',
  },
  rateLimit: {
    maxPerWeek: 1,
    minHoursBetween: 72,
  },
  unsubscribeAvailable: true,
  channels: ['in_app'],
  allowedTriggers: REVISIT_CARE_ALLOWED_TRIGGERS,
}

function asObject(value) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {}
}

function asBoolean(value, fallback) {
  return typeof value === 'boolean' ? value : fallback
}

function asPositiveInteger(value, fallback, min = 0, max = 999) {
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) return fallback
  return Math.max(min, Math.min(max, Math.floor(parsed)))
}

function safeList(value, fallback) {
  const source = Array.isArray(value) ? value : fallback
  const items = source.map((item) => String(item || '').trim()).filter(Boolean)
  return items.length ? Array.from(new Set(items)) : fallback
}

function normalizeClock(value, fallback) {
  const text = String(value || '').trim()
  return /^\d{2}:\d{2}$/.test(text) ? text : fallback
}

function clockToMinutes(value) {
  const [hours, minutes] = String(value || '00:00').split(':').map((part) => Number(part))
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return 0
  return Math.max(0, Math.min(1439, hours * 60 + minutes))
}

function dateLikeToClockMinutes(value) {
  const text = String(value || '')
  const match = text.match(/T(\d{2}):(\d{2})/)
  if (match) {
    return clockToMinutes(`${match[1]}:${match[2]}`)
  }
  const date = new Date(text)
  if (Number.isNaN(date.getTime())) return null
  return date.getHours() * 60 + date.getMinutes()
}

function isQuietTime(now, quietHours) {
  if (!quietHours?.enabled) return false
  const current = dateLikeToClockMinutes(now)
  if (current === null) return false
  const start = clockToMinutes(quietHours.start)
  const end = clockToMinutes(quietHours.end)
  if (start === end) return false
  if (start < end) return current >= start && current < end
  return current >= start || current < end
}

function hoursBetween(startValue, endValue) {
  const start = Date.parse(startValue || '')
  const end = Date.parse(endValue || '')
  if (!Number.isFinite(start) || !Number.isFinite(end)) return Infinity
  return Math.max(0, (end - start) / 36e5)
}

function blocker(id, label, detail) {
  return { id, label, detail }
}

export function normalizeRevisitCarePolicy(value = {}) {
  const policy = asObject(value)
  const quietHours = asObject(policy.quietHours)
  const rateLimit = asObject(policy.rateLimit)
  return {
    optIn: asBoolean(policy.optIn, REVISIT_CARE_DEFAULT_POLICY.optIn),
    quietHours: {
      enabled: asBoolean(quietHours.enabled, REVISIT_CARE_DEFAULT_POLICY.quietHours.enabled),
      start: normalizeClock(quietHours.start, REVISIT_CARE_DEFAULT_POLICY.quietHours.start),
      end: normalizeClock(quietHours.end, REVISIT_CARE_DEFAULT_POLICY.quietHours.end),
      timezone: String(quietHours.timezone || REVISIT_CARE_DEFAULT_POLICY.quietHours.timezone),
    },
    rateLimit: {
      maxPerWeek: asPositiveInteger(
        rateLimit.maxPerWeek,
        REVISIT_CARE_DEFAULT_POLICY.rateLimit.maxPerWeek,
        0,
        7,
      ),
      minHoursBetween: asPositiveInteger(
        rateLimit.minHoursBetween,
        REVISIT_CARE_DEFAULT_POLICY.rateLimit.minHoursBetween,
        0,
        24 * 14,
      ),
    },
    unsubscribeAvailable: asBoolean(
      policy.unsubscribeAvailable,
      REVISIT_CARE_DEFAULT_POLICY.unsubscribeAvailable,
    ),
    channels: safeList(policy.channels, REVISIT_CARE_DEFAULT_POLICY.channels),
    allowedTriggers: safeList(policy.allowedTriggers, REVISIT_CARE_DEFAULT_POLICY.allowedTriggers),
  }
}

export function evaluateRevisitCareCandidate(candidate = {}, policyValue = {}) {
  const policy = normalizeRevisitCarePolicy(policyValue)
  const event = asObject(candidate)
  const now = event.now || new Date().toISOString()
  const trigger = String(event.trigger || '').trim()
  const channel = String(event.channel || 'in_app').trim()
  const sentThisWeek = asPositiveInteger(event.sentThisWeek, 0, 0, 999)
  const blockers = []

  if (!policy.optIn) {
    blockers.push(blocker('opt_in_required', '等待访客主动订阅', '默认不主动打扰访客，必须先由访客 opt-in。'))
  }

  if (event.unsubscribed) {
    blockers.push(blocker('unsubscribed', '已取消订阅', '访客取消订阅后不能再排队回访关怀通知。'))
  }

  if (!policy.unsubscribeAvailable) {
    blockers.push(blocker('unsubscribe_missing', '缺少取消订阅', '任何主动回访能力都必须提供取消订阅入口。'))
  }

  if (!policy.channels.includes(channel) || channel !== 'in_app') {
    blockers.push(blocker('channel_not_allowed', '只允许站内通知预览', '当前设计不启用系统推送、短信、邮件或跨渠道触达。'))
  }

  if (!policy.allowedTriggers.includes(trigger)) {
    blockers.push(blocker('trigger_not_allowed', '触发原因不在白名单', '只允许回访反馈、访客请求提醒、关系摘要或玩法后续等非营销原因。'))
  }

  if (/marketing|campaign|ad|friend|social|rank/i.test(trigger)) {
    blockers.push(blocker('forbidden_growth_push', '禁止营销/社交触达', '不做营销推送、广告复活、好友在线或排行榜提醒。'))
  }

  if (event.containsGeneratedContent) {
    blockers.push(blocker('generated_content_blocked', '不得自动生成发布内容', '回访关怀不能绕过店主确认生成或发布空间/NPC/故事内容。'))
  }

  if (isQuietTime(now, policy.quietHours)) {
    blockers.push(blocker('quiet_hours', '当前处于安静时段', `${policy.quietHours.start}-${policy.quietHours.end} 不应主动打扰。`))
  }

  if (sentThisWeek >= policy.rateLimit.maxPerWeek) {
    blockers.push(blocker('weekly_rate_limit', '达到周频控', `每周最多 ${policy.rateLimit.maxPerWeek} 次。`))
  }

  if (event.lastSentAt && hoursBetween(event.lastSentAt, now) < policy.rateLimit.minHoursBetween) {
    blockers.push(blocker('min_interval', '距离上次触达太近', `两次回访关怀至少间隔 ${policy.rateLimit.minHoursBetween} 小时。`))
  }

  const allowed = blockers.length === 0
  return {
    allowed,
    policy,
    blockers,
    summary: allowed
      ? '可以排队一条站内通知预览；真实发送仍需要后端调度、用户设置和审计。'
      : `当前不会触达：${blockers.map((item) => item.label).join('、')}`,
  }
}

export function buildRevisitCarePolicyChecklist(policyValue = {}) {
  const policy = normalizeRevisitCarePolicy(policyValue)
  return [
    {
      id: 'opt_in',
      label: 'Opt-in',
      status: policy.optIn ? 'ready' : 'blocked',
      detail: policy.optIn ? '访客已主动订阅预览。' : '默认关闭，等待访客主动订阅。',
    },
    {
      id: 'quiet_hours',
      label: 'Quiet hours',
      status: policy.quietHours.enabled ? 'ready' : 'blocked',
      detail: policy.quietHours.enabled
        ? `${policy.quietHours.start}-${policy.quietHours.end} 不主动触达。`
        : '缺少安静时段会让主动触达过度打扰。',
    },
    {
      id: 'rate_limit',
      label: 'Rate limit',
      status: policy.rateLimit.maxPerWeek > 0 && policy.rateLimit.minHoursBetween > 0 ? 'ready' : 'blocked',
      detail: `每周最多 ${policy.rateLimit.maxPerWeek} 次，间隔至少 ${policy.rateLimit.minHoursBetween} 小时。`,
    },
    {
      id: 'unsubscribe',
      label: 'Unsubscribe',
      status: policy.unsubscribeAvailable ? 'ready' : 'blocked',
      detail: policy.unsubscribeAvailable ? '界面和协议必须保留取消订阅。' : '缺少取消订阅则不可启用。',
    },
    {
      id: 'content_boundary',
      label: 'Content boundary',
      status: 'ready',
      detail: '只提醒既有回访事实，不生成、发布或改写空间内容。',
    },
  ]
}
