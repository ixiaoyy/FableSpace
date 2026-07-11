import type { ClientLoaderFunctionArgs } from "react-router"
import { Compass, Gift, MapPinned } from "lucide-react"
import { useState } from "react"
import { Link, replace, useLoaderData } from "react-router"

import {
  DEFAULT_VISITOR_ID,
  claimClueHuntReward,
  errorMessage,
  getClueHuntRoute,
  startClueHuntSession,
  submitClueHuntAnswer,
  type ClueHuntRoutePayload,
  type ClueHuntSessionPayload,
} from "../lib/spaces"
import { clueHuntPath, redirectPathForRequest } from "../lib/web-routes"
import { ProductShell } from "../shell/product-shell"
import { Button } from "../ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card"

type LoaderData = {
  routeId: string
  route: ClueHuntRoutePayload | null
  error: string
}

export async function clientLoader({ params, request }: ClientLoaderFunctionArgs): Promise<LoaderData> {
  const routeRef = params.routeRef || ""
  if (!routeRef) return { routeId: "", route: null, error: "缺少寻宝路线引用" }
  try {
    const data = await getClueHuntRoute(routeRef)
    const routeId = data.route.id
    const url = new URL(request.url)
    const canonicalPath = clueHuntPath(data.route)
    if (url.pathname !== new URL(canonicalPath, url.origin).pathname) {
      throw replace(redirectPathForRequest(request, canonicalPath))
    }
    return { routeId, route: data.route, error: "" }
  } catch (error) {
    if (error instanceof Response) throw error
    return { routeId: routeRef, route: null, error: errorMessage(error) }
  }
}

function nodeCoordinateLabel(node: ClueHuntSessionPayload["visible_nodes"][number]) {
  if (Number.isFinite(Number(node.lat)) && Number.isFinite(Number(node.lon))) {
    return `${Number(node.lat).toFixed(4)}, ${Number(node.lon).toFixed(4)}`
  }
  return node.address || "真实坐标已隐藏，解锁后显示"
}

export default function ClueHuntRoute() {
  const { routeId, route, error } = useLoaderData<typeof clientLoader>()
  const [visitorId, setVisitorId] = useState(DEFAULT_VISITOR_ID)
  const [session, setSession] = useState<ClueHuntSessionPayload | null>(null)
  const [answer, setAnswer] = useState("")
  const [status, setStatus] = useState("")
  const [rewardText, setRewardText] = useState("")
  const [busy, setBusy] = useState(false)

  async function handleStart() {
    setBusy(true)
    setStatus("")
    try {
      const data = await startClueHuntSession(routeId, { visitor_id: visitorId }, visitorId)
      setSession(data.session)
      setStatus("路线已点亮。先从当前站的线索开始。")
    } catch (err) {
      setStatus(errorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  async function handleSubmitAnswer() {
    if (!session) return
    setBusy(true)
    setStatus("")
    try {
      const data = await submitClueHuntAnswer(routeId, session.id, { answer, visitor_id: visitorId }, visitorId)
      setSession(data.session)
      setAnswer("")
      setStatus(data.message || (data.correct ? "线索对上了。" : "答案还没有对上。"))
    } catch (err) {
      setStatus(errorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  async function handleClaimReward() {
    if (!session) return
    setBusy(true)
    setStatus("")
    try {
      const data = await claimClueHuntReward(routeId, session.id, visitorId)
      setSession(data.session)
      setRewardText(`${data.reward.text} · 纪念币 +${data.reward.coin_amount}${data.duplicate ? "（已领取过）" : ""}`)
    } catch (err) {
      setStatus(errorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <ProductShell eyebrow="寻宝">
      <section className="mx-auto grid max-w-5xl gap-5">
        <Card className="overflow-hidden border-theme-accent-border bg-theme-accent-bg">
          <CardHeader>
            <div className="mb-2 inline-flex w-fit items-center gap-2 rounded-full border border-theme-accent-border bg-theme-card px-3 py-1.5 text-xs font-black text-theme-accent-text">
              <Compass className="h-3.5 w-3.5" />
              半隐藏寻宝路线
            </div>
            <CardTitle className="text-3xl font-black">{route?.title || "寻宝路线"}</CardTitle>
            <CardDescription className="text-base leading-7">
              {route?.description || error || "路线会按顺序解锁真实坐标，不提前公开后续站点或答案。"}
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-[1fr_auto] md:items-end">
            <label className="space-y-1.5 text-sm">
              <span className="text-theme-muted">访客 ID</span>
              <input
                value={visitorId}
                onChange={(event) => setVisitorId(event.target.value)}
                className="w-full rounded-2xl border border-theme-border bg-theme-card px-4 py-3 text-theme-primary outline-none focus:border-theme-accent-border"
              />
            </label>
            <Button type="button" onClick={handleStart} disabled={!route || busy || !visitorId.trim()}>
              <MapPinned className="h-4 w-4" />
              开始 / 继续
            </Button>
          </CardContent>
        </Card>

        {session ? (
          <div className="grid gap-4 lg:grid-cols-[1fr_0.85fr]">
            <Card>
              <CardHeader>
                <CardTitle>当前站</CardTitle>
                <CardDescription>
                  {session.status === "completed" ? "路线已完成，可以领取纪念。" : "只显示当前已解锁站点，答案不会下发到前端。"}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {session.current_node ? (
                  <>
                    <div className="rounded-3xl border border-theme-border bg-theme-card p-4">
                      <p className="font-black text-theme-primary">{session.current_node.space_name}</p>
                      <p className="mt-1 text-xs font-bold text-theme-accent-text">{nodeCoordinateLabel(session.current_node)}</p>
                      <p className="mt-3 text-sm leading-6 text-theme-muted">{session.current_node.clue}</p>
                      {session.current_node.hint ? <p className="mt-3 rounded-2xl bg-theme-bg p-3 text-sm text-theme-primary/70">提示：{session.current_node.hint}</p> : null}
                    </div>
                    <label className="space-y-1.5 text-sm">
                      <span className="text-theme-muted">提交答案</span>
                      <input
                        value={answer}
                        onChange={(event) => setAnswer(event.target.value)}
                        className="w-full rounded-2xl border border-theme-border bg-theme-card px-4 py-3 text-theme-primary outline-none focus:border-theme-accent-border"
                      />
                    </label>
                    <Button type="button" onClick={handleSubmitAnswer} disabled={busy || !answer.trim()}>
                      校验答案
                    </Button>
                  </>
                ) : (
                  <div className="rounded-3xl border border-emerald-300/24 bg-emerald-300/10 p-5">
                    <p className="font-black text-emerald-100">所有线索已解开</p>
                    <p className="mt-2 text-sm leading-6 text-emerald-50/70">领取的是 space-local 纪念，不是平台钱包、充值或排行榜积分。</p>
                    <Button type="button" className="mt-4" onClick={handleClaimReward} disabled={busy || session.reward_claimed}>
                      <Gift className="h-4 w-4" />
                      {session.reward_claimed ? "已领取" : "领取纪念"}
                    </Button>
                  </div>
                )}
                {status ? <p className="rounded-2xl border border-theme-border bg-theme-card p-3 text-sm text-theme-primary">{status}</p> : null}
                {rewardText ? <p className="rounded-2xl border border-theme-accent-border bg-theme-accent-bg p-3 text-sm text-theme-accent-text">{rewardText}</p> : null}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>已解锁坐标</CardTitle>
                <CardDescription>{session.visible_nodes.length}/{session.node_count} 站</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {session.visible_nodes.map((node) => (
                  <div key={node.id} className="rounded-2xl border border-theme-border bg-theme-card p-3">
                    <p className="font-black text-theme-primary">{node.space_name || node.id}</p>
                    <p className="mt-1 text-xs text-theme-muted">{nodeCoordinateLabel(node)}</p>
                    {node.to ? (
                      <Button asChild variant="secondary" size="sm" className="mt-3">
                        <Link to={node.to}>进入这个空间 →</Link>
                      </Button>
                    ) : null}
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        ) : null}
      </section>
    </ProductShell>
  )
}
