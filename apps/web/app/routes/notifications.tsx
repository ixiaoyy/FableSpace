import { BellRing, DoorOpen, RefreshCw } from "lucide-react"
import { Link, useSearchParams } from "react-router"

import { NotificationCenterPanel } from "../components/NotificationCenterPanel"
import { RevisitCarePolicyPanel } from "../components/RevisitCarePolicyPanel"
import { useCreatorAccess } from "../hooks/useCreatorAccess"
import { useNotifications } from "../hooks/useNotifications"
import { DEFAULT_OWNER_ID } from "../lib/spaces"
import { WEB_PATHS } from "../lib/web-routes"
import { ProductShell } from "../shell/product-shell"
import { Button } from "../ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card"

export default function NotificationsRoute() {
  const [searchParams] = useSearchParams()
  const { allowed: showCreatorTools } = useCreatorAccess()
  const userId = searchParams.get("user_id")?.trim() || searchParams.get("owner_id")?.trim() || DEFAULT_OWNER_ID
  const notificationState = useNotifications(userId)

  return (
    <ProductShell eyebrow="通知">
      <section className="grid gap-6 lg:grid-cols-[0.78fr_1.22fr] lg:items-start">
        <aside className="space-y-5">
          <Card>
            <CardHeader>
              <div className="mb-2 inline-flex w-fit items-center gap-2 rounded-full border border-theme-border bg-theme-bg px-3 py-1.5 text-xs font-black text-theme-primary">
                <BellRing className="h-3.5 w-3.5" />
                通知中心
              </div>
              <CardTitle className="text-4xl font-black leading-tight">通知中心</CardTitle>
              <CardDescription className="text-base leading-7">
                这里只收集与你有关的空间提醒和实时消息，不会加入广告或营销推送。
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <form className="space-y-3" method="get">
                <label className="space-y-1.5 text-sm">
                  <span className="text-theme-muted">当前接收人</span>
                  <input
                    name="user_id"
                    defaultValue={userId}
                    className="w-full rounded-2xl border border-theme-border bg-theme-card px-4 py-3 text-theme-primary outline-none focus:border-theme-accent-border"
                  />
                </label>
                <Button type="submit" className="w-full">
                  <RefreshCw className="h-4 w-4" />
                  切换身份 / 刷新
                </Button>
              </form>

              <div className="grid gap-3 sm:grid-cols-2">
                {showCreatorTools ? (
                  <Button asChild size="lg" variant="secondary">
                    <Link to={`${WEB_PATHS.owner}?owner_id=${encodeURIComponent(userId)}`}>
                      <BellRing className="h-4 w-4" />
                      回到店主台
                    </Link>
                  </Button>
                ) : null}
                <Button asChild size="lg" variant="secondary">
                  <Link to={WEB_PATHS.spaces}>
                    <DoorOpen className="h-4 w-4" />
                    查看发现页
                  </Link>
                </Button>
              </div>

              <div className="rounded-3xl border border-theme-accent-border bg-theme-accent-bg p-4">
                <p className="text-xs font-black uppercase tracking-[0.2em] text-theme-accent-text">边界</p>
                <p className="mt-2 text-sm leading-7 text-theme-muted">
                  通知只围绕空间访问、私密反馈、审批和个人探索状态；不会变成公开社交流，也不会用于广告复活。
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
