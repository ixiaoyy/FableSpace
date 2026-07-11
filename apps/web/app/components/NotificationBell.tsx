import { useState } from "react"
import { Bell, X } from "lucide-react"
import { Link } from "react-router"
import { useNotifications, type Notification } from "../hooks/useNotifications"
import { WEB_PATHS } from "../lib/web-routes"

type NotificationBellProps = {
  userId: string
}

function formatTime(dateStr: string) {
  if (!dateStr) return ""
  const date = new Date(dateStr.replace("Z", "+00:00"))
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMins / 60)
  const diffDays = Math.floor(diffHours / 24)

  if (diffMins < 1) return "刚刚"
  if (diffMins < 60) return `${diffMins} 分钟前`
  if (diffHours < 24) return `${diffHours} 小时前`
  if (diffDays < 7) return `${diffDays} 天前`
  return date.toLocaleDateString("zh-CN", { month: "2-digit", day: "2-digit" })
}

function getNotificationIcon(type: string) {
  switch (type) {
    case "new_visitor":
      return "👤"
    case "new_message":
      return "💬"
    case "new_guest_message":
      return "📝"
    case "guest_reply":
      return "↩️"
    default:
      return "🔔"
  }
}

export function NotificationBell({ userId }: NotificationBellProps) {
  const {
    notifications,
    unreadCount,
    connected,
    loading,
    markAsRead,
    markAllAsRead,
  } = useNotifications(userId)

  const [showDropdown, setShowDropdown] = useState(false)

  const topNotifications = notifications.slice(0, 10)
  const unreadNotifications = topNotifications.filter((n) => !n.read)

  return (
    <div className="relative">
      {/* Bell Button */}
      <button
        onClick={() => setShowDropdown(!showDropdown)}
        className="relative rounded-full p-2 text-white/70 transition-colors hover:bg-white/10 hover:text-white"
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute -right-1 -top-1 grid h-5 w-5 place-items-center rounded-full bg-fuchsia-500 text-[10px] font-bold text-white">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
        {!connected && !loading && (
          <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-amber-400" title="未连接" />
        )}
      </button>

      {/* Dropdown */}
      {showDropdown && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setShowDropdown(false)}
          />

          {/* Panel */}
          <div className="absolute right-0 top-full z-50 mt-2 w-80 rounded-2xl border border-white/12 bg-slate-950/95 p-4 shadow-xl backdrop-blur-sm">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="font-bold text-white">通知</h3>
              <button
                onClick={() => setShowDropdown(false)}
                className="rounded-lg p-1 text-white/50 hover:bg-white/10 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {loading ? (
              <div className="py-8 text-center text-sm text-white/50">连接中...</div>
            ) : topNotifications.length === 0 ? (
              <div className="py-8 text-center text-sm text-white/50">暂无通知</div>
            ) : (
              <>
                {/* Notification List */}
                <div className="max-h-96 space-y-2 overflow-y-auto">
                  {topNotifications.map((notification) => (
                    <div
                      key={notification.id}
                      className={`group relative rounded-xl border p-3 transition-colors ${
                        notification.read
                          ? "border-white/5 bg-white/[0.02]"
                          : "border-cyan-300/20 bg-cyan-300/5"
                      }`}
                      onClick={() => !notification.read && markAsRead(notification.id)}
                    >
                      <div className="flex items-start gap-2">
                        <span className="text-lg">{getNotificationIcon(notification.notification_type)}</span>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between">
                            <p className={`text-sm ${notification.read ? "text-white/60" : "font-medium text-white"}`}>
                              {notification.title}
                            </p>
                            <span className="text-xs text-white/40">
                              {formatTime(notification.created_at)}
                            </span>
                          </div>
                          <p className="mt-1 text-xs text-white/50 line-clamp-2">
                            {notification.content}
                          </p>
                          {notification.space_name && (
                            <p className="mt-1 text-xs text-cyan-300/60">
                              {notification.space_name}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Actions */}
                {unreadNotifications.length > 0 && (
                  <div className="mt-3 flex items-center justify-between border-t border-white/10 pt-3">
                    <span className="text-xs text-white/50">
                      {unreadNotifications.length} 条未读
                    </span>
                    <button
                      onClick={() => markAllAsRead()}
                      className="text-xs text-cyan-300 hover:text-cyan-200"
                    >
                      全部已读
                    </button>
                  </div>
                )}

                {/* View All Link */}
                <div className="mt-3 border-t border-white/10 pt-3">
                  <Link
                    to={`${WEB_PATHS.notifications}?user_id=${encodeURIComponent(userId)}`}
                    onClick={() => setShowDropdown(false)}
                    className="block text-center text-sm text-cyan-300 hover:text-cyan-200"
                  >
                    查看全部通知 →
                  </Link>
                </div>
              </>
            )}
          </div>
        </>
      )}
    </div>
  )
}
