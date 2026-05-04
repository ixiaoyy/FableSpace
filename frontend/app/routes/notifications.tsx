import { BellRing, DoorOpen, RefreshCw } from "lucide-react"
import { Link, useSearchParams } from "react-router"

import { NotificationCenterPanel } from "../components/NotificationCenterPanel"
import { RevisitCarePolicyPanel } from "../components/RevisitCarePolicyPanel"
import { useNotifications } from "../hooks/useNotifications"
import { DEFAULT_OWNER_ID } from "../lib/taverns"
import { ProductShell } from "../shell/product-shell"
import { Button } from "../ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card"

export default function NotificationsRoute() {
  const [searchParams] = useSearchParams()
  const userId = searchParams.get("user_id")?.trim() || searchParams.get("owner_id")?.trim() || DEFAULT_OWNER_ID
  const notificationState = useNotifications(userId)

  return (
    <ProductShell eyebrow="Notifications">
      <section className="grid gap-6 lg:grid-cols-[0.78fr_1.22fr] lg:items-start">
        <aside className="space-y-5">
          <Card>
            <CardHeader>
              <div className="mb-2 inline-flex w-fit items-center gap-2 rounded-full border border-fuchsia-300/20 bg-fuchsia-300/10 px-3 py-1.5 text-xs font-black text-fuchsia-100">
                <BellRing className="h-3.5 w-3.5" />
                Existing notification MVP
              </div>
              <CardTitle className="text-4xl font-black leading-tight">通知中心</CardTitle>
              <CardDescription className="text-base leading-7">
                这是已有通知 MVP 的表现化入口：复用 WebSocket / 标记已读能力，不新增营销推送协议。
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <form className="space-y-3" method="get">
                <label className="space-y-1.5 text-sm">
                  <span className="text-violet-100/65">当前身份 ID</span>
                  <input
                    name="user_id"
                    defaultValue={userId}
                    className="w-full rounded-2xl border border-white/12 bg-white/[0.06] px-4 py-3 text-white outline-none focus:border-cyan-300/60"
                  />
                </label>
                <Button type="submit" className="w-full">
                  <RefreshCw className="h-4 w-4" />
                  切换身份 / 刷新
                </Button>
              </form>

              <div className="grid gap-3 sm:grid-cols-2">
                <Button asChild size="lg" variant="secondary">
                  <Link to={`/owner?owner_id=${encodeURIComponent(userId)}`}>
                    <BellRing className="h-4 w-4" />
                    回到店主台
                  </Link>
                </Button>
                <Button asChild size="lg" variant="secondary">
                  <Link to="/discover">
                    <DoorOpen className="h-4 w-4" />
                    查看发现页
                  </Link>
                </Button>
              </div>

              <div className="rounded-3xl border border-cyan-300/16 bg-cyan-300/[0.07] p-4">
                <p className="text-xs font-black uppercase tracking-[0.2em] text-cyan-100/70">边界</p>
                <p className="mt-2 text-sm leading-7 text-violet-100/72">
                  通知只围绕酒馆访问、owner-visible 反馈、审批和个人探索状态；不会变成公开社交流，也不会用于广告复活。
                </p>
              </div>
            </CardContent>
          </Card>

          {/* revisit-care safety policy preview stays local-only; no proactive send is enabled here. */}
          <RevisitCarePolicyPanel userId={userId} />
        </aside>

        <NotificationCenterPanel
          userId={userId}
          notifications={notificationState.notifications}
          unreadCount={notificationState.unreadCount}
          connected={notificationState.connected}
          loading={notificationState.loading}
          onMarkAsRead={notificationState.markAsRead}
          onMarkAllAsRead={notificationState.markAllAsRead}
        />
      </section>
    </ProductShell>
  )
}
