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
} from "lucide-react"
import { Link, useLoaderData } from "react-router"

import { NotificationBell } from "../components/NotificationBell"
import { PeakHoursChart } from "../components/PeakHoursChart"
import { TokenUsageChart } from "../components/TokenUsageChart"
import {
  buildOwnerOperatingSummary,
  formatOwnerSummaryTime,
} from "../lib/owner-summary.js"
import {
  DEFAULT_OWNER_ID,
  errorMessage,
  getOwnerDefaultLLM,
  getTavernMetrics,
  listVisitorNotes,
  listGlobalChatSessions,
  listTavernVisitors,
  listTaverns,
  type ChatSession,
  type OwnerDefaultLLMSafe,
  type Tavern,
  type TavernMetricsResponse,
  type TavernVisitorNote,
  type TavernVisitor,
} from "../lib/taverns"
import { ProductShell } from "../shell/product-shell"
import { Button } from "../ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card"

type TavernMetrics = TavernMetricsResponse & {
  tavern_id: string
  tavern_name?: string
}

type OwnerVisitorNote = TavernVisitorNote & {
  tavern_name?: string
}

type OwnerLoaderData = {
  ownerId: string
  taverns: Tavern[]
  visitors: TavernVisitor[]
  sessions: ChatSession[]
  visitorNotes: OwnerVisitorNote[]
  ownerLLM: OwnerDefaultLLMSafe | null
  tavernMetrics: Record<string, TavernMetrics>
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

function ownerTavernManagePath(tavernId: string, ownerId: string) {
  return `/tavern/${encodeURIComponent(tavernId)}/manage?owner_id=${encodeURIComponent(ownerId)}`
}

export async function clientLoader({ request }: ClientLoaderFunctionArgs): Promise<OwnerLoaderData> {
  const url = new URL(request.url)
  const ownerId = url.searchParams.get("owner_id")?.trim() || DEFAULT_OWNER_ID
  const errors: string[] = []
  let taverns: Tavern[] = []
  let sessions: ChatSession[] = []
  let ownerLLM: OwnerDefaultLLMSafe | null = null

  try {
    const result = await listTaverns({ owner_id: ownerId })
    taverns = (result.taverns || []).filter((tavern) => !tavern.owner_id || tavern.owner_id === ownerId)
  } catch (error) {
    errors.push(`读取酒馆失败：${errorMessage(error)}`)
  }

  try {
    const result = await listGlobalChatSessions({}, ownerId)
    sessions = result.chats || []
  } catch (error) {
    errors.push(`读取会话失败：${errorMessage(error)}`)
  }

  try {
    ownerLLM = await getOwnerDefaultLLM(ownerId)
  } catch (error) {
    errors.push(`读取默认 AI 配置失败：${errorMessage(error)}`)
  }

  const visitorRows = await Promise.all(
    taverns.map(async (tavern) => {
      try {
        const result = await listTavernVisitors(tavern.id, ownerId)
        return (result.visitors || []).map((visitor) => ({
          ...visitor,
          tavern_id: tavern.id,
          tavern_name: tavern.name,
        }))
      } catch (error) {
        errors.push(`读取 ${tavern.name || tavern.id} 访客失败：${errorMessage(error)}`)
        return []
      }
    }),
  )

  const visitorNoteRows = await Promise.all(
    taverns.map(async (tavern) => {
      try {
        const result = await listVisitorNotes(tavern.id, { limit: 5 }, ownerId)
        return (result.notes || []).map((note) => ({
          ...note,
          tavern_name: tavern.name,
        }))
      } catch (error) {
        errors.push(`读取 ${tavern.name || tavern.id} 访客反馈失败：${errorMessage(error)}`)
        return []
      }
    }),
  )

  // Fetch metrics for each tavern
  const tavernMetricsMap: Record<string, TavernMetrics> = {}
  await Promise.all(
    taverns.map(async (tavern) => {
      try {
        const metrics = await getTavernMetrics(tavern.id, ownerId)
        tavernMetricsMap[tavern.id] = {
          ...metrics,
          tavern_name: tavern.name,
        }
      } catch (error) {
        // Metrics are optional, don't add to errors
        console.warn(`读取 ${tavern.name || tavern.id} 指标失败：${errorMessage(error)}`)
      }
    }),
  )

  return {
    ownerId,
    taverns,
    visitors: visitorRows.flat(),
    sessions,
    visitorNotes: visitorNoteRows.flat(),
    ownerLLM,
    tavernMetrics: tavernMetricsMap,
    errors,
  }
}

function MetricCard({ label, value, helper, icon: Icon }: MetricCardProps) {
  return (
    <Card className="min-w-0 p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-cyan-100/62">{label}</p>
          <p className="mt-3 text-3xl font-black text-white">{value}</p>
          <p className="mt-2 text-sm leading-6 text-violet-100/58">{helper}</p>
        </div>
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl border border-cyan-300/22 bg-cyan-300/10 text-cyan-100">
          <Icon className="h-5 w-5" />
        </span>
      </div>
    </Card>
  )
}

export default function OwnerRoute() {
  const { ownerId, taverns, visitors, sessions, visitorNotes, ownerLLM, tavernMetrics, errors } = useLoaderData<typeof clientLoader>()
  const summary = buildOwnerOperatingSummary({ taverns, visitors, sessions, visitorNotes, ownerLLM })
  const metrics = summary.metrics
  const openRatio = metrics.taverns ? Math.round((metrics.openTaverns / metrics.taverns) * 100) : 0
  const returnRatio = metrics.visitors ? Math.round((metrics.returningVisitors / metrics.visitors) * 100) : 0
  const llmStatusText = metrics.llmConfigured ? "已配置" : "待配置"
  const llmHelperText = metrics.llmConfigured
    ? `${metrics.llmBackend || "AI"}${metrics.llmModel ? ` · ${metrics.llmModel}` : ""}`
    : "进入创建页配置默认 AI；草稿保存前仍需店主确认"

  // Calculate aggregate metrics from all taverns
  const totalTokens = Object.values(tavernMetrics).reduce((sum, m) => {
    const usage = m.token_usage
    return sum + (typeof usage === "number" ? usage : usage?.total || 0)
  }, 0)
  const allPeakHours = Object.values(tavernMetrics).flatMap((m) => m.peak_hours || [])
  const peakHourCounts: Record<number, number> = {}
  allPeakHours.forEach((h) => { peakHourCounts[h] = (peakHourCounts[h] || 0) + 1 })
  const topPeakHours = Object.entries(peakHourCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([h]) => Number(h))

  const allSessions = Object.values(tavernMetrics).flatMap((m) =>
    m.npc_rankings?.map((npc) => ({
      updated_at: npc.last_interaction,
      message_count: npc.message_count,
    })) || [],
  )

  return (
    <ProductShell eyebrow="Owner">
      <section id="owner-mainline" className="grid scroll-mt-28 gap-6 lg:grid-cols-[0.78fr_1.22fr] lg:items-start">
        <aside className="space-y-5">
          <Card className="overflow-hidden">
            <CardHeader>
              <div className="mb-2 inline-flex w-fit items-center gap-2 rounded-full border border-fuchsia-300/20 bg-fuchsia-300/10 px-3 py-1.5 text-xs font-black text-fuchsia-100">
                <Sparkles className="h-3.5 w-3.5" />
                Operating feedback
              </div>
              <CardTitle className="text-4xl font-black leading-tight">店主经营摘要</CardTitle>
              <CardDescription className="text-base leading-7">
                先不急着收费，先让店主看见：谁来过、谁回来了、哪些酒馆正在变活。
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <form className="space-y-3" method="get">
                <label className="space-y-1.5 text-sm">
                  <span className="text-violet-100/65">店主 ID</span>
                  <input
                    name="owner_id"
                    defaultValue={ownerId}
                    className="w-full rounded-2xl border border-white/12 bg-white/[0.06] px-4 py-3 text-white outline-none focus:border-cyan-300/60"
                  />
                </label>
                <Button type="submit" className="w-full">
                  <RefreshCw className="h-4 w-4" />
                  刷新经营数据
                </Button>
              </form>

              <div className="grid gap-3 sm:grid-cols-2">
                <Button asChild size="lg">
                  <Link to={`/create?owner_id=${encodeURIComponent(ownerId)}`}>
                    <Sparkles className="h-4 w-4" />
                    开店 / AI 草稿辅助
                  </Link>
                </Button>
                <Button asChild size="lg" variant="secondary">
                  <Link to="/discover">
                    <DoorOpen className="h-4 w-4" />
                    查看发现页入口
                  </Link>
                </Button>
              </div>

              <div className="flex items-center justify-between gap-3 rounded-3xl border border-white/10 bg-white/[0.045] p-4">
                <div className="min-w-0">
                  <p className="flex items-center gap-2 text-sm font-bold text-white">
                    <Bell className="h-4 w-4 text-cyan-100" />
                    通知入口
                  </p>
                  <p className="mt-1 text-xs leading-5 text-violet-100/55">
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

              <div className="rounded-3xl border border-cyan-300/16 bg-cyan-300/[0.07] p-4">
                <p className="text-xs font-black uppercase tracking-[0.2em] text-cyan-100/70">当前判断</p>
                <p className="mt-2 text-sm leading-7 text-violet-100/72">
                  {metrics.taverns === 0
                    ? "还没有酒馆。第一步是创建一个真实坐标锚定入口。"
                    : metrics.returningVisitors > 0
                      ? `已有 ${metrics.returningVisitors} 位回访者，说明酒馆关系链开始成立。`
                      : "已有酒馆基础，但还需要让访客完成第一次对话和回访。"}
                </p>
              </div>

              <div className="rounded-3xl border border-fuchsia-300/16 bg-fuchsia-300/[0.07] p-4">
                <p className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.2em] text-fuchsia-100/70">
                  <KeyRound className="h-3.5 w-3.5" />
                  AI / LLM
                </p>
                <p className="mt-2 text-sm leading-7 text-violet-100/72">
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
                <article key={action.kind} className="rounded-2xl border border-white/10 bg-white/[0.045] p-4">
                  <p className="font-bold text-white">{action.title}</p>
                  <p className="mt-2 text-sm leading-6 text-violet-100/62">{action.detail}</p>
                  {"to" in action && action.to ? (
                    <Button asChild size="sm" variant="ghost" className="mt-3">
                      <Link to={action.to}>
                        前往
                        <ArrowRight className="h-4 w-4" />
                      </Link>
                    </Button>
                  ) : action.tavernId ? (
                    <Button asChild size="sm" variant="ghost" className="mt-3">
                      <Link to={ownerTavernManagePath(action.tavernId, ownerId)}>
                        管理酒馆
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
              label="酒馆"
              value={formatNumber(metrics.taverns)}
              helper={`${formatNumber(metrics.openTaverns)} 间营业中 · ${openRatio}% 开放率`}
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
              helper="owner-visible notes，不是公开留言墙"
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
              helper={`${Object.keys(tavernMetrics).length} 个酒馆统计`}
              icon={Zap}
            />
          </div>

          {/* Token Usage and Peak Hours Charts */}
          {(Object.keys(tavernMetrics).length > 0) && (
            <section className="grid gap-6 xl:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>消息量趋势</CardTitle>
                  <CardDescription>各酒馆消息量随时间变化</CardDescription>
                </CardHeader>
                <CardContent>
                  <TokenUsageChart
                    peakDays={Object.values(tavernMetrics).flatMap((m) => m.peak_days || [])}
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
                  <article key={`${visitor.tavernId}-${visitor.visitorId}`} className="rounded-2xl border border-white/10 bg-white/[0.045] p-4">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <p className="font-black text-white">{visitor.visitorLabel}</p>
                        <p className="mt-1 text-sm text-violet-100/58">{visitor.tavernName} · {visitor.relationshipLabel}</p>
                      </div>
                      <span className="w-fit rounded-full border border-cyan-300/22 bg-cyan-300/10 px-3 py-1 text-xs font-black text-cyan-100">
                        {visitor.visitCount} 次访问
                      </span>
                    </div>
                    <div className="mt-4 grid gap-3 text-sm sm:grid-cols-3">
                      <span className="rounded-xl border border-white/8 bg-slate-950/45 px-3 py-2">消息 {visitor.messageCount}</span>
                      <span className="rounded-xl border border-white/8 bg-slate-950/45 px-3 py-2">关系 {Math.round(visitor.relationshipStrength * 100)}%</span>
                      <span className="rounded-xl border border-white/8 bg-slate-950/45 px-3 py-2">{formatOwnerSummaryTime(visitor.lastVisit)}</span>
                    </div>
                  </article>
                )) : (
                  <div className="grid min-h-40 place-items-center rounded-2xl border border-white/10 bg-white/[0.04] p-6 text-center text-sm leading-6 text-violet-100/60">
                    暂无回访者。访客第二次进入同一酒馆后，这里会开始显示关系线索。
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>最近会话</CardTitle>
                <CardDescription>只展示 owner 可见会话摘要，不读取访客私密记忆。</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {summary.recentSessions.length ? summary.recentSessions.map((session) => (
                  <article key={`${session.tavernId}-${session.visitorId}-${session.characterId}-${session.updatedAt}`} className="rounded-2xl border border-white/10 bg-white/[0.045] p-4">
                    <div className="flex items-start gap-3">
                      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl border border-fuchsia-300/20 bg-fuchsia-300/10 text-fuchsia-100">
                        <Clock3 className="h-4 w-4" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="font-bold text-white">{session.tavernName} · {session.characterName}</p>
                        <p className="mt-1 text-xs text-violet-100/45">{session.visitorLabel} · {formatOwnerSummaryTime(session.updatedAt)}</p>
                        <p className="mt-2 line-clamp-2 text-sm leading-6 text-violet-100/68">{session.lastMessage || "暂无最近消息"}</p>
                      </div>
                    </div>
                  </article>
                )) : (
                  <div className="grid min-h-40 place-items-center rounded-2xl border border-white/10 bg-white/[0.04] p-6 text-center text-sm leading-6 text-violet-100/60">
                    暂无会话记录。先从发现页进入酒馆测试一次 NPC 对话。
                  </div>
                )}
              </CardContent>
            </Card>
          </section>

          <Card>
            <CardHeader>
              <CardTitle>访客给店主的反馈</CardTitle>
              <CardDescription>只汇总 owner-visible notes，帮助店主复盘体验；不构成公开留言墙或访客社交。</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {summary.latestFeedback.length ? summary.latestFeedback.map((note) => (
                <article key={`${note.tavernId}-${note.noteId}-${note.createdAt}`} className="rounded-2xl border border-white/10 bg-white/[0.045] p-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <p className="font-black text-white">{note.visitorLabel}</p>
                      <p className="mt-1 text-sm text-violet-100/58">{note.tavernName} · {formatOwnerSummaryTime(note.createdAt)}</p>
                    </div>
                    <span className="w-fit rounded-full border border-fuchsia-300/20 bg-fuchsia-300/10 px-3 py-1 text-xs font-black text-fuchsia-100">
                      {note.visibility}
                    </span>
                  </div>
                  <p className="mt-3 text-sm leading-6 text-violet-100/72">{note.content || "访客未留下文字内容"}</p>
                  {note.tavernId ? (
                    <Button asChild size="sm" variant="ghost" className="mt-3">
                      <Link to={ownerTavernManagePath(note.tavernId, ownerId)}>
                        进入管理页处理反馈
                        <ArrowRight className="h-4 w-4" />
                      </Link>
                    </Button>
                  ) : null}
                </article>
              )) : (
                <div className="grid min-h-36 place-items-center rounded-2xl border border-white/10 bg-white/[0.04] p-6 text-center text-sm leading-6 text-violet-100/60">
                  暂无访客反馈。访客在酒馆内提交给店主的私密反馈会出现在这里，不会展示给其他访客。
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>酒馆表现</CardTitle>
              <CardDescription>按访客、回访、会话和消息量综合排序。</CardDescription>
            </CardHeader>
            <CardContent>
              {summary.tavernHighlights.length ? (
                <div className="grid gap-3">
                  {summary.tavernHighlights.map((item) => (
                    <Link
                      key={item.tavernId}
                      to={ownerTavernManagePath(item.tavernId, ownerId)}
                      className="group grid gap-4 rounded-2xl border border-white/10 bg-white/[0.045] p-4 transition hover:border-cyan-300/45 hover:bg-cyan-300/10 sm:grid-cols-[minmax(0,1fr)_auto]"
                    >
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <DoorOpen className="h-4 w-4 text-cyan-200" />
                          <p className="font-black text-white group-hover:text-cyan-100">{item.tavernName}</p>
                          <span className="rounded-full border border-white/10 px-2 py-0.5 text-xs text-violet-100/55">{item.status}</span>
                        </div>
                        <p className="mt-2 text-sm text-violet-100/58">
                          {formatNumber(item.visitorCount)} 位访客 · {formatNumber(item.returningVisitorCount)} 位回访 · {formatNumber(item.messageCount)} 条消息
                        </p>
                      </div>
                      <span className="flex w-fit items-center gap-2 rounded-full border border-cyan-300/20 bg-cyan-300/10 px-3 py-1 text-xs font-black text-cyan-100">
                        <BarChart3 className="h-3.5 w-3.5" />
                        经营分 {item.score.toFixed(1)}
                      </span>
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="grid min-h-40 place-items-center rounded-2xl border border-white/10 bg-white/[0.04] p-6 text-center text-sm leading-6 text-violet-100/60">
                  暂无酒馆。创建第一间酒馆后，这里会显示经营表现。
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </section>
    </ProductShell>
  )
}
