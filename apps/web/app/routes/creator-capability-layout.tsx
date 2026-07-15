import { ShieldAlert } from "lucide-react"
import {
  isRouteErrorResponse,
  Link,
  Outlet,
  useRouteError,
} from "react-router"

import { requireCreatorTools } from "../lib/session"
import { WEB_PATHS } from "../lib/web-routes"
import { ProductShell } from "../shell/product-shell"
import { Button } from "../ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card"

/**
 * Verifies creator capability before a supply-side route renders.
 * @returns Empty loader data when access is allowed; throws a route response otherwise.
 */
export async function clientLoader() {
  await requireCreatorTools()
  return null
}

/**
 * Hosts all creator-only pages behind one shared capability boundary.
 * @returns The selected supply-side route after its client loader authorizes access.
 */
export default function CreatorCapabilityLayout() {
  return <Outlet />
}

/**
 * Renders one consistent linked-mode denial state without exposing admin-only controls.
 * @returns A recovery page that routes the user back to public space discovery.
 */
export function ErrorBoundary() {
  const error = useRouteError()
  const accessDenied = isRouteErrorResponse(error) && error.status === 403

  return (
    <ProductShell eyebrow="权限受限">
      <div className="mx-auto max-w-2xl py-8 sm:py-16">
        <Card>
          <CardHeader>
            <span className="mb-3 grid h-12 w-12 place-items-center rounded-2xl border border-theme-accent-border bg-theme-accent-bg text-theme-accent-text">
              <ShieldAlert className="h-6 w-6" />
            </span>
            <CardTitle>{accessDenied ? "空间创作暂未开放" : "暂时无法确认创作权限"}</CardTitle>
            <CardDescription className="mt-2 text-base leading-7">
              {accessDenied
                ? "当前账号可以继续发现和体验空间，但暂不能创建或管理空间。"
                : "权限服务暂时不可用，请先返回发现页，稍后再试。"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild size="lg">
              <Link to={WEB_PATHS.spaces}>返回发现空间</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </ProductShell>
  )
}
