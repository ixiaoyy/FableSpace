import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

import {
  NOTIFICATION_CENTER_GUARDRAILS,
  buildNotificationCenterView,
  filterNotificationItems,
  formatNotificationTime,
  normalizeNotificationItem,
  notificationTypeMeta,
} from '../app/lib/notification-center.js'

const sampleNotifications = [
  {
    id: 'n_owner_unread',
    user_id: 'owner-demo',
    notification_type: 'new_guest_message',
    title: '新回访反馈',
    content: '访客留下了 owner-visible 反馈',
    created_at: '2026-04-30T08:00:00Z',
    read: false,
    tavern_id: 'tavern_a',
    tavern_name: '月台茶室',
  },
  {
    id: 'n_visitor_read',
    user_id: 'visitor-demo',
    notification_type: 'quest_completed',
    title: '探索完成',
    content: '你完成了一段轻量探索',
    created_at: '2026-04-30T07:00:00Z',
    read: true,
    tavern_id: 'tavern_b',
    tavern_name: '街角小馆',
  },
  {
    id: 'n_owner_read',
    user_id: 'owner-demo',
    notification_type: 'new_visitor',
    title: '新访客进入',
    content: '有人进入你的酒馆',
    created_at: '2026-04-30T06:00:00Z',
    read: true,
    tavern_id: 'tavern_a',
    tavern_name: '月台茶室',
  },
]

assert.equal(notificationTypeMeta('new_guest_message').audience, 'owner')
assert.equal(notificationTypeMeta('quest_completed').audience, 'visitor')
assert.equal(notificationTypeMeta('unknown').label, '通知')

const normalized = normalizeNotificationItem(sampleNotifications[0])
assert.equal(normalized.audienceLabel, '店主侧')
assert.equal(normalized.typeLabel, '回访反馈')
assert.equal(normalized.tavern_name, '月台茶室')

const view = buildNotificationCenterView(sampleNotifications)
assert.equal(view.total, 3)
assert.equal(view.unreadCount, 1)
assert.equal(view.ownerCount, 2)
assert.equal(view.visitorCount, 1)
assert.equal(view.latestUnread.id, 'n_owner_unread')
assert.deepEqual(view.items.map((item) => item.id), ['n_owner_unread', 'n_visitor_read', 'n_owner_read'])

assert.deepEqual(filterNotificationItems(view.items, 'owner').map((item) => item.id), ['n_owner_unread', 'n_owner_read'])
assert.deepEqual(filterNotificationItems(view.items, 'visitor').map((item) => item.id), ['n_visitor_read'])
assert.deepEqual(filterNotificationItems(view.items, 'unread').map((item) => item.id), ['n_owner_unread'])
assert.notEqual(formatNotificationTime('2026-04-30T08:00:00Z'), '暂无时间')

assert(NOTIFICATION_CENTER_GUARDRAILS.includes('只显示当前身份相关通知'))
assert(NOTIFICATION_CENTER_GUARDRAILS.includes('店主/访客边界清晰'))
assert(NOTIFICATION_CENTER_GUARDRAILS.includes('不做营销推送或广告复活'))
assert(NOTIFICATION_CENTER_GUARDRAILS.includes('不扩展频控不明的主动触达'))

const panelSource = readFileSync(new URL('../app/components/NotificationCenterPanel.tsx', import.meta.url), 'utf8')
assert(panelSource.includes('NotificationCenterPanel'))
assert(panelSource.includes('复用现有通知 API / WebSocket'))
assert(panelSource.includes('店主侧'))
assert(panelSource.includes('访客侧'))
assert(panelSource.includes('不做营销推送、广告复活或频控不明的主动触达'))
assert(panelSource.includes('aria-pressed'))
assert(panelSource.includes('min-h-11'))

const routeSource = readFileSync(new URL('../app/routes/notifications.tsx', import.meta.url), 'utf8')
assert(routeSource.includes('useNotifications(userId)'))
assert(routeSource.includes('不会变成公开社交流'))
assert(routeSource.includes('不会用于广告复活'))
assert(!routeSource.includes('Existing notification MVP'))
assert(!routeSource.includes('通知 MVP'))

const routesSource = readFileSync(new URL('../app/routes.ts', import.meta.url), 'utf8')
assert(routesSource.includes('route("notifications", "./routes/notifications.tsx")'))

const bellSource = readFileSync(new URL('../app/components/NotificationBell.tsx', import.meta.url), 'utf8')
assert(bellSource.includes('notifications?user_id='))

const hookSource = readFileSync(new URL('../app/hooks/useNotifications.ts', import.meta.url), 'utf8')
assert(hookSource.includes('/api/v1/notifications/ws/${encodeURIComponent(userId)}?user_id=${encodeURIComponent(userId)}'))

const forbiddenProductCopy = `${panelSource}\n${routeSource}`
for (const forbidden of ['购买 Token', '营销群发', '广告投放', '排行榜', '复活广告', 'MVP']) {
  assert(!forbiddenProductCopy.includes(forbidden), `notification center should not include forbidden copy: ${forbidden}`)
}

console.log('notification-center-test: ok')
