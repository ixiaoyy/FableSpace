import type { ClientLoaderFunctionArgs } from "react-router"
import {
  ArrowRight,
  BarChart3,
  Bell,
  ClipboardList,
  Clock3,
  DoorOpen,
  KeyRound,
  MessageSquareText,
  RefreshCw,
  Sparkles,
  Store,
  UserRoundCheck,
  UsersRound,
  Zap,
  Compass,
} from "lucide-react"
import { useState } from "react"
import { Link, useLoaderData } from "react-router"

import { NotificationBell } from "../components/NotificationBell"
import { PeakHoursChart } from "../components/PeakHoursChart"
import { TokenUsageChart } from "../components/TokenUsageChart"
import {
  buildOwnerOperatingSummary,
  formatOwnerSummaryTime,
} from "../lib/owner-summary.js"
import { hasExplicitOwnerIdentity } from "../lib/space-runtime-config.js"
import {
  DEFAULT_OWNER_ID,
  createClueHuntRoute,
  errorMessage,
  getOwnerDefaultLLM,
  getSpaceMetrics,
  listVisitorNotes,
  listGlobalChatSessions,
  listSpaceVisitors,
  listSpaces,
  type ChatSession,
  type OwnerDefaultLLMSafe,
  type Space,
  type SpaceMetricsResponse,
  type SpaceVisitorNote,
  type SpaceVisitor,
} from "../lib/spaces"
import { WEB_PATHS, clueHuntPath, spaceManagePath } from "../lib/web-routes"
import { ProductShell } from "../shell/product-shell"
import { Button } from "../ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card"

type SpaceMetrics = SpaceMetricsResponse & {
  space_id: string
  space_name?: string
}

type OwnerVisitorNote = SpaceVisitorNote & {
  space_name?: string
}

type OwnerLoaderData = {
  ownerId: string
  spaces: Space[]
  visitors: SpaceVisitor[]
  sessions: ChatSession[]
  visitorNotes: OwnerVisitorNote[]
  ownerLLM: OwnerDefaultLLMSafe | null
  spaceMetrics: Record<string, SpaceMetrics>
  errors: string[]
}

type MetricCardProps = {
  label: string
  value: string | number
  helper: string
  icon: React.ComponentType<{ className?: string }>
}

function formatNumber(value: number) {
  return Number(value || 0).toLocaleString("zh-CN")
}

function ownerSpaceManagePath(spaceId: string, ownerId: string, spaceName = "空间") {
  return `${spaceManagePath({ id: spaceId, name: spaceName })}?owner_id=${encodeURIComponent(ownerId)}`
}

export async function clientLoader({ request }: ClientLoaderFunctionArgs): Promise<OwnerLoaderData> {
  const url = new URL(request.url)
  const ownerId = url.searchParams.get("owner_id")?.trim() || DEFAULT_OWNER_ID
  const errors: string[] = []
  let spaces: Space[] = []
  let sessions: ChatSession[] = []
  let ownerLLM: OwnerDefaultLLMSafe | null = null

  try {
    const result = await listSpaces({ owner_id: ownerId })
    spaces = (result.spaces || []).filter((space) => !space.owner_id || space.owner_id === ownerId)
  } catch (error) {
    errors.push(`读取空间失败：${errorMessage(error)}`)
  }

  try {
    const result = await listGlobalChatSessions({}, ownerId)
    sessions = result.chats || []
  } catch (error) {
    errors.push(`读取会话失败：${errorMessage(error)}`)
  }

  if (hasExplicitOwnerIdentity(ownerId)) {
    try {
      ownerLLM = await getOwnerDefaultLLM(ownerId)
    } catch (error) {
      errors.push(`读取默认 AI 配置失败：${errorMessage(error)}`)
    }
  }

  const visitorRows = await Promise.all(
    spaces.map(async (space) => {
      try {
        const result = await listSpaceVisitors(space.id, ownerId)
        return (result.visitors || []).map((visitor) => ({
          ...visitor,
          space_id: space.id,
          space_name: space.name,
        }))
      } catch (error) {
        errors.push(`读取 ${space.name || space.id} 访客失败：${errorMessage(error)}`)
        return []
      }
    }),
  )

  const visitorNoteRows = await Promise.all(
    spaces.map(async (space) => {
      try {
        const result = await listVisitorNotes(space.id, { limit: 5 }, ownerId)
        return (result.notes || []).map((note) => ({
          ...note,
          space_name: space.name,
        }))
      } catch (error) {
        errors.push(`读取 ${space.name || space.id} 访客反馈失败：${errorMessage(error)}`)
        return []
      }
    }),
  )

  // Fetch metrics for each space
  const spaceMetricsMap: Record<string, SpaceMetrics> = {}
  await Promise.all(
    spaces.map(async (space) => {
      try {
        const metrics = await getSpaceMetrics(space.id, ownerId)
        spaceMetricsMap[space.id] = {
          ...metrics,
          space_name: space.name,
        }
      } catch (error) {
        // Metrics are optional, don't add to errors
        console.warn(`读取 ${space.name || space.id} 指标失败：${errorMessage(error)}`)
      }
    }),
  )

  return {
    ownerId,
    spaces,
    visitors: visitorRows.flat(),
    sessions,
    visitorNotes: visitorNoteRows.flat(),
    ownerLLM,
    spaceMetrics: spaceMetricsMap,
    errors,
  }
}

function MetricCard({ label, value, helper, icon: Icon }: MetricCardProps) {
  return (
    <Card className="min-w-0 p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-theme-accent-text">{label}</p>
          <p className="mt-3 text-3xl font-black text-theme-primary">{value}</p>
          <p className="mt-2 text-sm leading-6 text-theme-muted">{helper}</p>
        </div>
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl border border-theme-accent-border bg-theme-accent-bg text-theme-accent-text">
          <Icon className="h-5 w-5" />
        </span>
      </div>
    </Card>
  )
}

function ClueHuntBuilderCard({ ownerId, spaces }: { ownerId: string; spaces: Space[] }) {
  const publicSpaces = spaces.filter((space) => space.access === "public")
  const [title, setTitle] = useState("两站线索小路")
  const [firstSpaceId, setFirstSpaceId] = useState(publicSpaces[0]?.id || "")
  const [secondSpaceId, setSecondSpaceId] = useState(publicSpaces[1]?.id || publicSpaces[0]?.id || "")
  const [firstClue, setFirstClue] = useState("第一站灯牌上最显眼的词是什么？")
  const [firstAnswer, setFirstAnswer] = useState("")
  const [secondClue, setSecondClue] = useState("第二站入口旁的物件是什么？")
  const [secondAnswer, setSecondAnswer] = useState("")
  const [rewardText, setRewardText] = useState("你把这条真实坐标之间的小路记住了。")
  const [coinAmount, setCoinAmount] = useState(3)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState("")
  const [routeLink, setRouteLink] = useState("")

  async function handleCreate() {
    setBusy(true)
    setMessage("")
    setRouteLink("")
    try {
      const data = await createClueHuntRoute({
        title,
        description: "店主确认的半隐藏寻宝路线。后续站点和答案不会提前公开。",
        status: "published",
        reward_text: rewardText,
        reward_coin_amount: coinAmount,
        nodes: [
          { id: "node_1", space_id: firstSpaceId, clue: firstClue, answer: firstAnswer, hint: "回到当前空间公开内容里找线索。" },
          { id: "node_2", space_id: secondSpaceId, clue: secondClue, answer: secondAnswer, hint: "第二站会在第一题答对后显示。" },
        ],
      }, ownerId)
      setRouteLink(clueHuntPath(data.route))
      setMessage("寻宝路线已创建。访客只会看到第一站，不会拿到答案。")
    } catch (error) {
      setMessage(errorMessage(error))
    } finally {
      setBusy(false)
    }
  }

  return (
    <Card className="overflow-hidden border-theme-accent-border bg-theme-accent-bg">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Compass className="h-5 w-5 text-theme-accent-text" />
          寻宝路线 MVP
        </CardTitle>
        <CardDescription className="mt-2">
          只能串联你名下的公开真实坐标；线索、答案和纪念文案都由店主确认，平台不自动生成发布。
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <label className="space-y-1.5 text-sm">
          <span className="text-theme-muted">路线标题</span>
          <input value={title} onChange={(event) => setTitle(event.target.value)} className="w-full rounded-2xl border border-theme-border bg-theme-card px-4 py-3 text-theme-primary outline-none focus:border-theme-accent-border" />
        </label>
        <div className="grid gap-3 md:grid-cols-2">
          <label className="space-y-1.5 text-sm">
            <span className="text-theme-muted">第一站空间</span>
            <select value={firstSpaceId} onChange={(event) => setFirstSpaceId(event.target.value)} className="w-full rounded-2xl border border-theme-border bg-theme-card px-4 py-3 text-theme-primary outline-none focus:border-theme-accent-border">
              {publicSpaces.map((space) => <option key={space.id} value={space.id}>{space.name}</option>)}
            </select>
          </label>
          <label className="space-y-1.5 text-sm">
            <span className="text-theme-muted">第二站空间</span>
            <select value={secondSpaceId} onChange={(event) => setSecondSpaceId(event.target.value)} className="w-full rounded-2xl border border-theme-border bg-theme-card px-4 py-3 text-theme-primary outline-none focus:border-theme-accent-border">
              {publicSpaces.map((space) => <option key={space.id} value={space.id}>{space.name}</option>)}
            </select>
          </label>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <label className="space-y-1.5 text-sm">
            <span className="text-theme-muted">第一站线索 / 答案</span>
            <textarea value={firstClue} onChange={(event) => setFirstClue(event.target.value)} rows={2} className="w-full rounded-2xl border border-theme-border bg-theme-card px-4 py-3 text-theme-primary outline-none focus:border-theme-accent-border" />
            <input value={firstAnswer} onChange={(event) => setFirstAnswer(event.target.value)} placeholder="答案只在后端 hash 保存" className="w-full rounded-2xl border border-theme-border bg-theme-card px-4 py-3 text-theme-primary outline-none focus:border-theme-accent-border" />
          </label>
          <label className="space-y-1.5 text-sm">
            <span className="text-theme-muted">第二站线索 / 答案</span>
            <textarea value={secondClue} onChange={(event) => setSecondClue(event.target.value)} rows={2} className="w-full rounded-2xl border border-theme-border bg-theme-card px-4 py-3 text-theme-primary outline-none focus:border-theme-accent-border" />
            <input value={secondAnswer} onChange={(event) => setSecondAnswer(event.target.value)} placeholder="答案只在后端 hash 保存" className="w-full rounded-2xl border border-theme-border bg-theme-card px-4 py-3 text-theme-primary outline-none focus:border-theme-accent-border" />
          </label>
        </div>
        <div className="grid gap-3 md:grid-cols-[1fr_10rem]">
          <label className="space-y-1.5 text-sm">
            <span className="text-theme-muted">完成纪念文案</span>
            <input value={rewardText} onChange={(event) => setRewardText(event.target.value)} className="w-full rounded-2xl border border-theme-border bg-theme-card px-4 py-3 text-theme-primary outline-none focus:border-theme-accent-border" />
          </label>
          <label className="space-y-1.5 text-sm">
            <span className="text-theme-muted">纪念币</span>
            <input type="number" min={0} max={99} value={coinAmount} onChange={(event) => setCoinAmount(Number(event.target.value))} className="w-full rounded-2xl border border-theme-border bg-theme-card px-4 py-3 text-theme-primary outline-none focus:border-theme-accent-border" />
          </label>
        </div>
        <Button type="button" className="w-full" disabled={busy || publicSpaces.length < 2 || firstSpaceId === secondSpaceId || !firstAnswer.trim() || !secondAnswer.trim()} onClick={handleCreate}>
          创建半隐藏路线
        </Button>
        {message ? <p className="rounded-2xl border border-theme-border bg-theme-card p-3 text-sm text-theme-primary">{message}</p> : null}
        {routeLink ? (
          <Button asChild variant="secondary" className="w-full">
            <Link to={routeLink}>打开访客寻宝页 →</Link>
          </Button>
        ) : null}
      </CardContent>
    </Card>
  )
}

export default function OwnerRoute() {
  const { ownerId, spaces, visitors, sessions, visitorNotes, ownerLLM, spaceMetrics, errors } = useLoaderData<typeof clientLoader>()
  const summary = buildOwnerOperatingSummary({ spaces, visitors, sessions, visitorNotes, ownerLLM })
  const metrics = summary.metrics
  const openRatio = metrics.spaces ? Math.round((metrics.openSpaces / metrics.spaces) * 100) : 0
  const returnRatio = metrics.visitors ? Math.round((metrics.returningVisitors / metrics.visitors) * 100) : 0
  const llmStatusText = metrics.llmConfigured ? "已配置" : "待配置"
  const llmHelperText = metrics.llmConfigured
    ? `${metrics.llmBackend || "AI"}${metrics.llmModel ? ` · ${metrics.llmModel}` : ""}`
    : "进入创建页配置默认 AI；草稿保存前仍需店主确认"

  // Calculate aggregate metrics from all spaces
  const totalTokens = Object.values(spaceMetrics).reduce((sum, m) => {
    const usage = m.token_usage
    return sum + (typeof usage === "number" ? usage : usage?.total || 0)
  }, 0)
  const allPeakHours = Object.values(spaceMetrics).flatMap((m) => m.peak_hours || [])
  const peakHourCounts: Record<number, number> = {}
  allPeakHours.forEach((h) => { peakHourCounts[h] = (peakHourCounts[h] || 0) + 1 })
  const topPeakHours = Object.entries(peakHourCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([h]) => Number(h))

  const allSessions = Object.values(spaceMetrics).flatMap((m) =>
    m.npc_rankings?.map((npc) => ({
      updated_at: npc.last_interaction,
      message_count: npc.message_count,
    })) || [],
  )

  return (
    <ProductShell eyebrow="店主后台">
      <section id="店主主线" className="grid scroll-mt-28 gap-6 lg:grid-cols-[0.78fr_1.22fr] lg:items-start">
        <aside className="space-y-5">
          <Card className="overflow-hidden">
            <CardHeader>
              <div className="mb-2 inline-flex w-fit items-center gap-2 rounded-full border border-theme-border bg-theme-bg px-3 py-1.5 text-xs font-black text-theme-primary">
                <Sparkles className="h-3.5 w-3.5" />
                Operating feedback
              </div>
              <CardTitle className="text-4xl font-black leading-tight">店主经营摘要</CardTitle>
              <CardDescription className="text-base leading-7">
                先不急着收费，先让店主看见：谁来过、谁回来了、哪些空间正在变活。
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <form className="space-y-3" method="get">
                <label className="space-y-1.5 text-sm">
                  <span className="text-theme-muted">店主 ID</span>
                  <input
                    name="owner_id"
                    defaultValue={ownerId}
                    className="w-full rounded-2xl border border-theme-border bg-theme-card px-4 py-3 text-theme-primary outline-none focus:border-theme-accent-border"
                  />
                </label>
                <Button type="submit" className="w-full">
                  <RefreshCw className="h-4 w-4" />
                  刷新经营数据
                </Button>
              </form>

              <div className="grid gap-3 sm:grid-cols-2">
                <Button asChild size="lg">
                  <Link to={`${WEB_PATHS.createSpace}?owner_id=${encodeURIComponent(ownerId)}`}>
                    <Sparkles className="h-4 w-4" />
                    开店 / AI 草稿辅助
                  </Link>
                </Button>
                <Button asChild size="lg" variant="secondary">
                  <Link to={WEB_PATHS.spaces}>
                    <DoorOpen className="h-4 w-4" />
                    查看发现页入口
                  </Link>
                </Button>
                <Button asChild size="lg" variant="secondary" className="sm:col-span-2">
                  <Link to={`${WEB_PATHS.territory}?owner_id=${encodeURIComponent(ownerId)}`}>
                    <Compass className="h-4 w-4" />
                    领地地图申领
                  </Link>
                </Button>
              </div>

              <div className="flex items-center justify-between gap-3 rounded-3xl border border-theme-border bg-theme-card p-4">
                <div className="min-w-0">
                  <p className="flex items-center gap-2 text-sm font-bold text-theme-primary">
                    <Bell className="h-4 w-4 text-theme-accent-text" />
                    通知入口
                  </p>
                  <p className="mt-1 text-xs leading-5 text-theme-muted">
                    用于查看店主侧待处理事件；这里不生成公开社交动态。
                  </p>
                </div>
                <NotificationBell userId={ownerId} />
              </div>

              {errors.length ? (
                <div className="space-y-2 rounded-2xl border border-amber-300/28 bg-amber-300/10 p-4 text-sm leading-6 text-amber-50">
                  {errors.map((item) => (
                    <p key={item}>{item}</p>
                  ))}
                </div>
              ) : null}

              <div className="rounded-3xl border border-theme-accent-border bg-theme-accent-bg p-4">
                <p className="text-xs font-black uppercase tracking-[0.2em] text-theme-accent-text">当前判断</p>
                <p className="mt-2 text-sm leading-7 text-theme-muted">
                  {metrics.spaces === 0
                    ? "还没有空间。第一步是创建一个真实坐标锚定入口。"
                    : metrics.returningVisitors > 0
                      ? `已有 ${metrics.returningVisitors} 位回访者，说明空间关系链开始成立。`
                      : "已有空间基础，但还需要让访客完成第一次对话和回访。"}
                </p>
              </div>

              <div className="rounded-3xl border border-theme-border bg-fuchsia-300/[0.07] p-4">
                <p className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.2em] text-theme-primary">
                  <KeyRound className="h-3.5 w-3.5" />
                  AI / LLM
                </p>
                <p className="mt-2 text-sm leading-7 text-theme-muted">
                  {metrics.llmConfigured
                    ? `店主默认 AI 已配置：${llmHelperText}。AI 草稿仍只会填充待确认表单。`
                    : "默认 AI 尚未配置或暂不可确认；可进入创建页配置后再使用 AI 草稿辅助。"}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>下一步建议</CardTitle>
              <CardDescription>确定性规则摘要，不替店主生成内容。</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {summary.nextActions.map((action) => (
                <article key={action.kind} className="rounded-2xl border border-theme-border bg-theme-card p-4">
                  <p className="font-bold text-theme-primary">{action.title}</p>
                  <p className="mt-2 text-sm leading-6 text-theme-muted">{action.detail}</p>
                  {"to" in action && action.to ? (
                    <Button asChild size="sm" variant="ghost" className="mt-3">
                      <Link to={action.to}>
                        前往
                        <ArrowRight className="h-4 w-4" />
                      </Link>
                    </Button>
                  ) : action.spaceId ? (
                    <Button asChild size="sm" variant="ghost" className="mt-3">
                      <Link to={ownerSpaceManagePath(action.spaceId, ownerId)}>
                        管理空间
                        <ArrowRight className="h-4 w-4" />
                      </Link>
                    </Button>
                  ) : null}
                </article>
              ))}
            </CardContent>
          </Card>
        </aside>

        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <MetricCard
              label="空间"
              value={formatNumber(metrics.spaces)}
              helper={`${formatNumber(metrics.openSpaces)} 间营业中 · ${openRatio}% 开放率`}
              icon={Store}
            />
            <MetricCard
              label="访客"
              value={formatNumber(metrics.visitors)}
              helper={`${formatNumber(metrics.returningVisitors)} 位回访 · ${returnRatio}% 回访率`}
              icon={UsersRound}
            />
            <MetricCard
              label="会话"
              value={formatNumber(metrics.sessions)}
              helper={`${formatNumber(metrics.messages)} 条消息可复盘`}
              icon={MessageSquareText}
            />
            <MetricCard
              label="关系"
              value={formatNumber(metrics.engagedVisitors)}
              helper="已产生对话的访客"
              icon={UserRoundCheck}
            />
            <MetricCard
              label="访客反馈"
              value={formatNumber(metrics.visitorNotes)}
              helper="私密反馈，不是公开留言墙"
              icon={ClipboardList}
            />
            <MetricCard
              label="默认 AI"
              value={llmStatusText}
              helper={llmHelperText}
              icon={KeyRound}
            />
            <MetricCard
              label="Token"
              value={totalTokens > 0 ? `${(totalTokens / 1000).toFixed(1)}k` : "0"}
              helper={`${Object.keys(spaceMetrics).length} 个空间统计`}
              icon={Zap}
            />
          </div>

          <ClueHuntBuilderCard ownerId={ownerId} spaces={spaces} />

          {/* Token Usage and Peak Hours Charts */}
          {(Object.keys(spaceMetrics).length > 0) && (
            <section className="grid gap-6 xl:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>消息量趋势</CardTitle>
                  <CardDescription>各空间消息量随时间变化</CardDescription>
                </CardHeader>
                <CardContent>
                  <TokenUsageChart
                    peakDays={Object.values(spaceMetrics).flatMap((m) => m.peak_days || [])}
                    totalTokens={metrics.messages}
                  />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>热门时段</CardTitle>
                  <CardDescription>访客活跃时段分布</CardDescription>
                </CardHeader>
                <CardContent>
                  <PeakHoursChart
                    peakHours={topPeakHours.length > 0 ? topPeakHours : []}
                    sessions={allSessions}
                  />
                </CardContent>
              </Card>
            </section>
          )}

          <section className="grid gap-6 xl:grid-cols-[1.04fr_0.96fr]">
            <Card>
              <CardHeader>
                <CardTitle>重点回访者</CardTitle>
                <CardDescription>优先关注 visit_count ≥ 2 的访客。</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {summary.returningHighlights.length ? summary.returningHighlights.map((visitor) => (
                  <article key={`${visitor.spaceId}-${visitor.visitorId}`} className="rounded-2xl border border-theme-border bg-theme-card p-4">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <p className="font-black text-theme-primary">{visitor.visitorLabel}</p>
                        <p className="mt-1 text-sm text-theme-muted">{visitor.spaceName} · {visitor.relationshipLabel}</p>
                      </div>
                      <span className="w-fit rounded-full border border-theme-accent-border bg-theme-accent-bg px-3 py-1 text-xs font-black text-theme-accent-text">
                        {visitor.visitCount} 次访问
                      </span>
                    </div>
                    <div className="mt-4 grid gap-3 text-sm sm:grid-cols-3">
                      <span className="rounded-xl border border-theme-border bg-theme-card px-3 py-2">消息 {visitor.messageCount}</span>
                      <span className="rounded-xl border border-theme-border bg-theme-card px-3 py-2">关系 {Math.round(visitor.relationshipStrength * 100)}%</span>
                      <span className="rounded-xl border border-theme-border bg-theme-card px-3 py-2">{formatOwnerSummaryTime(visitor.lastVisit)}</span>
                    </div>
                  </article>
                )) : (
                  <div className="grid min-h-40 place-items-center rounded-2xl border border-theme-border bg-theme-card p-6 text-center text-sm leading-6 text-theme-muted">
                    暂无回访者。访客第二次进入同一空间后，这里会开始显示关系线索。
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>最近会话</CardTitle>
                <CardDescription>只展示店主可见的会话摘要，不读取访客私密记忆。</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {summary.recentSessions.length ? summary.recentSessions.map((session) => (
                  <article key={`${session.spaceId}-${session.visitorId}-${session.characterId}-${session.updatedAt}`} className="rounded-2xl border border-theme-border bg-theme-card p-4">
                    <div className="flex items-start gap-3">
                      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl border border-theme-border bg-theme-bg text-theme-primary">
                        <Clock3 className="h-4 w-4" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="font-bold text-theme-primary">{session.spaceName} · {session.characterName}</p>
                        <p className="mt-1 text-xs text-theme-muted">{session.visitorLabel} · {formatOwnerSummaryTime(session.updatedAt)}</p>
                        <p className="mt-2 line-clamp-2 text-sm leading-6 text-theme-muted">{session.lastMessage || "暂无最近消息"}</p>
                      </div>
                    </div>
                  </article>
                )) : (
                  <div className="grid min-h-40 place-items-center rounded-2xl border border-theme-border bg-theme-card p-6 text-center text-sm leading-6 text-theme-muted">
                    暂无会话记录。先从发现页进入空间测试一次 NPC 对话。
                  </div>
                )}
              </CardContent>
            </Card>
          </section>

          <Card>
            <CardHeader>
              <CardTitle>访客给店主的反馈</CardTitle>
              <CardDescription>只汇总访客私密反馈，帮助店主复盘体验；不构成公开留言墙或访客社交。</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {summary.latestFeedback.length ? summary.latestFeedback.map((note) => (
                <article key={`${note.spaceId}-${note.noteId}-${note.createdAt}`} className="rounded-2xl border border-theme-border bg-theme-card p-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <p className="font-black text-theme-primary">{note.visitorLabel}</p>
                      <p className="mt-1 text-sm text-theme-muted">{note.spaceName} · {formatOwnerSummaryTime(note.createdAt)}</p>
                    </div>
                    <span className="w-fit rounded-full border border-theme-border bg-theme-bg px-3 py-1 text-xs font-black text-theme-primary">
                      {note.visibility}
                    </span>
                  </div>
                  <p className="mt-3 text-sm leading-6 text-theme-muted">{note.content || "访客未留下文字内容"}</p>
                  {note.spaceId ? (
                    <Button asChild size="sm" variant="ghost" className="mt-3">
                      <Link to={ownerSpaceManagePath(note.spaceId, ownerId, note.spaceName)}>
                        进入管理页处理反馈
                        <ArrowRight className="h-4 w-4" />
                      </Link>
                    </Button>
                  ) : null}
                </article>
              )) : (
                <div className="grid min-h-36 place-items-center rounded-2xl border border-theme-border bg-theme-card p-6 text-center text-sm leading-6 text-theme-muted">
                  暂无访客反馈。访客在空间内提交给店主的私密反馈会出现在这里，不会展示给其他访客。
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>空间表现</CardTitle>
              <CardDescription>按访客、回访、会话和消息量综合排序。</CardDescription>
            </CardHeader>
            <CardContent>
              {summary.spaceHighlights.length ? (
                <div className="grid gap-3">
                  {summary.spaceHighlights.map((item) => (
                    <Link
                      key={item.spaceId}
                      to={ownerSpaceManagePath(item.spaceId, ownerId, item.spaceName)}
                      className="group grid gap-4 rounded-2xl border border-theme-border bg-theme-card p-4 transition hover:border-theme-accent-border hover:bg-theme-accent-bg sm:grid-cols-[minmax(0,1fr)_auto]"
                    >
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <DoorOpen className="h-4 w-4 text-theme-accent-text" />
                          <p className="font-black text-theme-primary group-hover:text-theme-accent-text">{item.spaceName}</p>
                          <span className="rounded-full border border-theme-border px-2 py-0.5 text-xs text-theme-muted">{item.status}</span>
                        </div>
                        <p className="mt-2 text-sm text-theme-muted">
                          {formatNumber(item.visitorCount)} 位访客 · {formatNumber(item.returningVisitorCount)} 位回访 · {formatNumber(item.messageCount)} 条消息
                        </p>
                      </div>
                      <span className="flex w-fit items-center gap-2 rounded-full border border-theme-accent-border bg-theme-accent-bg px-3 py-1 text-xs font-black text-theme-accent-text">
                        <BarChart3 className="h-3.5 w-3.5" />
                        经营分 {item.score.toFixed(1)}
                      </span>
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="grid min-h-40 place-items-center rounded-2xl border border-theme-border bg-theme-card p-6 text-center text-sm leading-6 text-theme-muted">
                  暂无空间。创建第一间空间后，这里会显示经营表现。
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </section>
    </ProductShell>
  )
}
