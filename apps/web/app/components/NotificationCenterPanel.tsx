import { useMemo, useState } from "react"
import { BellRing, CheckCheck, Circle, ShieldCheck, Wifi, WifiOff } from "lucide-react"

import type { Notification } from "../hooks/useNotifications"
import {
  NOTIFICATION_CENTER_GUARDRAILS,
  NOTIFICATION_FILTERS,
  buildNotificationCenterView,
  filterNotificationItems,
  formatNotificationTime,
} from "../lib/notification-center.js"
import { Button } from "../ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card"

type NotificationCenterPanelProps = {
  userId: string
  notifications: Notification[]
  unreadCount: number
  connected: boolean
  loading: boolean
  onMarkAsRead?: (notificationId: string) => void
  onMarkAllAsRead?: () => void
}

type NotificationFilterId = "all" | "owner" | "visitor" | "unread"

export function NotificationCenterPanel({
  userId,
  notifications,
  unreadCount,
  connected,
  loading,
  onMarkAsRead,
  onMarkAllAsRead,
}: NotificationCenterPanelProps) {
  const [activeFilter, setActiveFilter] = useState<NotificationFilterId>("all")
  const view = useMemo(() => buildNotificationCenterView(notifications), [notifications])
  const filteredItems = useMemo(
    () => filterNotificationItems(view.items, activeFilter),
    [activeFilter, view.items],
  )
  const effectiveUnread = Math.max(unreadCount || 0, view.unreadCount)

  return (
    <Card className="overflow-hidden">
      <CardHeader className="border-b border-white/10 bg-white/[0.025]">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <div className="mb-3 inline-flex w-fit items-center gap-2 rounded-full border border-cyan-300/20 bg-cyan-300/10 px-3 py-1.5 text-xs font-black text-cyan-100">
              <BellRing className="h-3.5 w-3.5" />
              通知中心
            </div>
            <CardTitle className="text-3xl font-black leading-tight">通知中心</CardTitle>
            <CardDescription className="mt-3 max-w-2xl text-base leading-7">
              这里只整理与你当前身份有关的空间事件；不会推送广告或营销提醒。
            </CardDescription>
          </div>
          <div className="grid gap-2 rounded-3xl border border-white/10 bg-slate-950/50 p-4 text-sm text-violet-100/70">
            <span className="flex items-center gap-2 font-bold text-white">
              {connected ? <Wifi className="h-4 w-4 text-emerald-200" /> : <WifiOff className="h-4 w-4 text-amber-200" />}
              {connected ? "实时连接中" : loading ? "连接中..." : "等待实时连接"}
            </span>
            <span className="text-xs">当前接收人：{userId ? "已识别" : "未识别"}</span>
          </div>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {NOTIFICATION_CENTER_GUARDRAILS.map((item) => (
            <div key={item} className="rounded-2xl border border-white/10 bg-white/[0.045] px-4 py-3 text-sm font-bold text-violet-50">
              <ShieldCheck className="mb-2 h-4 w-4 text-cyan-100" />
              {item}
            </div>
          ))}
        </div>
      </CardHeader>

      <CardContent className="space-y-5 p-5">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <SummaryTile label="未读" value={effectiveUnread} helper="可一键标记已读" />
          <SummaryTile label="全部事件" value={view.total} helper="只与你有关" />
          <SummaryTile label="店主侧" value={view.ownerCount} helper="空间维护 / 反馈" />
          <SummaryTile label="访客侧" value={view.visitorCount} helper="个人探索事件" />
        </div>

        <div className="flex flex-col gap-3 rounded-3xl border border-white/10 bg-white/[0.035] p-3 md:flex-row md:items-center md:justify-between">
          <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
            {NOTIFICATION_FILTERS.map((filter) => (
              <button
                key={filter.id}
                type="button"
                aria-pressed={activeFilter === filter.id}
                onClick={() => setActiveFilter(filter.id as NotificationFilterId)}
                className={`min-h-11 rounded-2xl border px-4 py-2 text-sm font-bold transition ${
                  activeFilter === filter.id
                    ? "border-cyan-300/50 bg-cyan-300/15 text-cyan-50"
                    : "border-white/10 bg-slate-950/35 text-violet-100/68 hover:border-white/20 hover:text-white"
                }`}
              >
                {filter.label}
              </button>
            ))}
          </div>
          <Button
            type="button"
            variant="secondary"
            disabled={effectiveUnread === 0}
            onClick={() => onMarkAllAsRead?.()}
          >
            <CheckCheck className="h-4 w-4" />
            全部标记已读
          </Button>
        </div>

        {loading ? (
          <EmptyState title="正在连接通知流" detail="连接后会同步待处理通知。" />
        ) : filteredItems.length === 0 ? (
          <EmptyState
            title={view.total === 0 ? "暂无通知" : "当前筛选没有通知"}
            detail="通知中心只呈现与你有关的事件，不会制造公开动态或营销触达。"
          />
        ) : (
          <div className="grid gap-3">
            {filteredItems.map((item) => (
              <article
                key={item.id}
                className={`rounded-3xl border p-4 transition ${
                  item.read
                    ? "border-white/10 bg-white/[0.025]"
                    : "border-cyan-300/24 bg-cyan-300/[0.07] shadow-[0_20px_70px_rgba(244,114,182,0.08)]"
                }`}
              >
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-slate-950/70 text-2xl">
                    {item.icon}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          {!item.read ? <Circle className="h-2.5 w-2.5 fill-cyan-200 text-cyan-200" /> : null}
                          <span className="rounded-full border border-white/10 bg-white/[0.05] px-2.5 py-1 text-xs font-black text-violet-100/72">
                            {item.audienceLabel}
                          </span>
                          <span className="rounded-full border border-cyan-300/20 bg-cyan-300/10 px-2.5 py-1 text-xs font-black text-cyan-100">
                            {item.typeLabel}
                          </span>
                        </div>
                        <h3 className="mt-3 text-lg font-black text-white">{item.title}</h3>
                        <p className="mt-2 text-sm leading-6 text-violet-100/68">{item.content}</p>
                        {item.space_name ? (
                          <p className="mt-2 text-sm font-bold text-cyan-100/82">{item.space_name}</p>
                        ) : null}
                      </div>
                      <div className="shrink-0 text-left md:text-right">
                        <p className="text-xs text-violet-100/48">{formatNotificationTime(item.created_at)}</p>
                        {!item.read ? (
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            className="mt-2"
                            onClick={() => onMarkAsRead?.(item.id)}
                          >
                            标记已读
                          </Button>
                        ) : (
                          <span className="mt-3 inline-flex rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs text-violet-100/48">
                            已读
                          </span>
                        )}
                      </div>
                    </div>
                    <p className="mt-3 rounded-2xl border border-white/10 bg-slate-950/35 px-3 py-2 text-xs leading-5 text-violet-100/52">
                      {item.helper}
                    </p>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function SummaryTile({ label, value, helper }: { label: string; value: number; helper: string }) {
  return (
    <div className="rounded-3xl border border-white/10 bg-slate-950/45 p-4">
      <p className="text-xs font-black uppercase tracking-[0.2em] text-cyan-100/62">{label}</p>
      <p className="mt-3 text-3xl font-black text-white">{Number(value || 0).toLocaleString("zh-CN")}</p>
      <p className="mt-2 text-sm leading-6 text-violet-100/56">{helper}</p>
    </div>
  )
}

function EmptyState({ title, detail }: { title: string; detail: string }) {
  return (
    <div className="min-h-36 rounded-3xl border border-dashed border-white/14 bg-white/[0.025] p-8 text-center">
      <p className="text-lg font-black text-white">{title}</p>
      <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-violet-100/58">{detail}</p>
    </div>
  )
}
