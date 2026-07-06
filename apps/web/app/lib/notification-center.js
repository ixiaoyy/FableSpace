export const NOTIFICATION_CENTER_GUARDRAILS = [
  '只显示与你有关的通知',
  '店主/访客边界清晰',
  '不做营销推送或广告复活',
  '不突然打扰访客',
]

export const NOTIFICATION_FILTERS = [
  { id: 'all', label: '全部' },
  { id: 'owner', label: '店主侧' },
  { id: 'visitor', label: '访客侧' },
  { id: 'unread', label: '未读' },
]

export const NOTIFICATION_TYPE_META = {
  new_visitor: {
    icon: '👤',
    label: '新访客',
    audience: 'owner',
    tone: 'cyan',
    helper: '店主侧事件：有人进入你的空间。',
  },
  new_message: {
    icon: '💬',
    label: '新对话',
    audience: 'owner',
    tone: 'violet',
    helper: '店主侧事件：空间内出现新的 AI 对话。',
  },
  new_guest_message: {
    icon: '📝',
    label: '回访反馈',
    audience: 'owner',
    tone: 'fuchsia',
    helper: '店主侧事件：访客留下私密反馈。',
  },
  guest_reply: {
    icon: '↩️',
    label: '反馈回复',
    audience: 'owner',
    tone: 'amber',
    helper: '店主侧事件：回访反馈产生新回复。',
  },
  quest_completed: {
    icon: '✅',
    label: '探索完成',
    audience: 'visitor',
    tone: 'emerald',
    helper: '访客侧事件：你在空间内完成了一段探索。',
  },
  home_visit_request: {
    icon: '🏠',
    label: '到访申请',
    audience: 'owner',
    tone: 'blue',
    helper: '店主侧事件：需要主人确认的到访/关系请求。',
  },
}

function safeText(value, fallback = '') {
  const text = typeof value === 'string' ? value.trim() : ''
  return text || fallback
}

export function notificationTypeMeta(type) {
  return NOTIFICATION_TYPE_META[type] || {
    icon: '🔔',
    label: '通知',
    audience: 'owner',
    tone: 'slate',
    helper: '与你有关的事件。',
  }
}

export function normalizeNotificationItem(item = {}) {
  const meta = notificationTypeMeta(item.notification_type)
  const fallbackId = `notification-${safeText(item.notification_type, 'unknown')}-${safeText(item.created_at, '0')}`
  return {
    id: safeText(item.id, fallbackId),
    type: safeText(item.notification_type, 'unknown'),
    title: safeText(item.title, meta.label),
    content: safeText(item.content, '暂无详情'),
    created_at: safeText(item.created_at),
    read: Boolean(item.read),
    space_id: safeText(item.space_id),
    space_name: safeText(item.space_name),
    icon: meta.icon,
    typeLabel: meta.label,
    audience: meta.audience,
    audienceLabel: meta.audience === 'visitor' ? '访客侧' : '店主侧',
    tone: meta.tone,
    helper: meta.helper,
  }
}

export function buildNotificationCenterView(notifications = []) {
  const items = (Array.isArray(notifications) ? notifications : [])
    .map(normalizeNotificationItem)
    .sort((a, b) => {
      const aTime = Date.parse(a.created_at || '') || 0
      const bTime = Date.parse(b.created_at || '') || 0
      return bTime - aTime
    })

  return {
    items,
    total: items.length,
    unreadCount: items.filter((item) => !item.read).length,
    ownerCount: items.filter((item) => item.audience === 'owner').length,
    visitorCount: items.filter((item) => item.audience === 'visitor').length,
    latestUnread: items.find((item) => !item.read) || null,
  }
}

export function filterNotificationItems(items = [], filter = 'all') {
  if (!Array.isArray(items)) return []
  if (filter === 'owner') return items.filter((item) => item.audience === 'owner')
  if (filter === 'visitor') return items.filter((item) => item.audience === 'visitor')
  if (filter === 'unread') return items.filter((item) => !item.read)
  return items
}

export function formatNotificationTime(dateStr) {
  if (!dateStr) return '暂无时间'
  const date = new Date(String(dateStr).replace('Z', '+00:00'))
  if (Number.isNaN(date.getTime())) return String(dateStr).slice(0, 16)
  return date.toLocaleString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}
