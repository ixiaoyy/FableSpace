import type { ClientLoaderFunctionArgs } from "react-router"
import { ArrowRight, Compass, MapPinned, ShieldCheck, Sparkles } from "lucide-react"
import { Link, useLoaderData } from "react-router"

import { buildQuestGuideSummary } from "../lib/quest-guide.js"
import { DEFAULT_OWNER_ID, errorMessage, listTaverns, type Tavern } from "../lib/taverns"
import { ProductShell } from "../shell/product-shell"
import { Button } from "../ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card"

export async function clientLoader({ request }: ClientLoaderFunctionArgs) {
  const url = new URL(request.url)
  const ownerId = url.searchParams.get("owner_id")?.trim() || DEFAULT_OWNER_ID
  const errors: string[] = []
  let taverns: Tavern[] = []

  try {
    const result = await listTaverns({})
    taverns = result.taverns || []
  } catch (error) {
    errors.push(`读取探索指南数据失败：${errorMessage(error)}`)
  }

  return {
    ownerId,
    errors,
    summary: buildQuestGuideSummary({ taverns, ownerId }),
  }
}

export default function QuestsRoute() {
  const { ownerId, errors, summary } = useLoaderData<typeof clientLoader>()

  return (
    <ProductShell eyebrow="Guide">
      <section id="guide-mainline" className="scroll-mt-28 grid gap-6 lg:grid-cols-[0.82fr_1.18fr] lg:items-start">
        <aside className="space-y-5">
          <Card className="overflow-hidden">
            <CardHeader>
              <div className="mb-2 inline-flex w-fit items-center gap-2 rounded-full border border-theme-accent-border bg-theme-accent-bg px-3 py-1.5 text-xs font-black text-theme-accent-text">
                <Compass className="h-3.5 w-3.5" />
                Explorer guide
              </div>
              <CardTitle className="text-4xl font-black leading-tight">探索指南</CardTitle>
              <CardDescription className="text-base leading-7">
                这是给新手的轻量导览：帮你找到下一间真实坐标空间、认识 NPC，并把回访提示留在具体空间里。
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <Button asChild size="lg">
                  <Link to="/discover">
                    <MapPinned className="h-4 w-4" />
                    从发现页开始
                  </Link>
                </Button>
                <Button asChild size="lg" variant="secondary">
                  <Link to={`/create?owner_id=${encodeURIComponent(ownerId)}`}>
                    <Sparkles className="h-4 w-4" />
                    创建自己的空间
                  </Link>
                </Button>
              </div>

              <div className="rounded-3xl border border-emerald-300/16 bg-emerald-300/[0.07] p-4">
                <p className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.2em] text-emerald-100/75">
                  <ShieldCheck className="h-3.5 w-3.5" />
                  边界说明
                </p>
                <p className="mt-2 text-sm leading-7 text-theme-muted">
                  这里只给出探索建议，不记录完成进度，不发放奖励，也不展示排名。
                </p>
              </div>

              {errors.length ? (
                <div className="space-y-2 rounded-2xl border border-amber-300/28 bg-amber-300/10 p-4 text-sm leading-6 text-amber-50">
                  {errors.map((item) => <p key={item}>{item}</p>)}
                </div>
              ) : null}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>当前可参考线索</CardTitle>
              <CardDescription>这些数字只说明现在能从哪里开始，不代表个人完成记录。</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3 text-sm">
              <div className="rounded-2xl border border-theme-border bg-theme-card p-4">
                <p className="text-theme-muted">可见空间</p>
                <p className="mt-1 text-2xl font-black text-theme-primary">{summary.metrics.taverns}</p>
              </div>
              <div className="rounded-2xl border border-theme-border bg-theme-card p-4">
                <p className="text-theme-muted">开放入口</p>
                <p className="mt-1 text-2xl font-black text-theme-primary">{summary.metrics.openTaverns}</p>
              </div>
              <div className="rounded-2xl border border-theme-border bg-theme-card p-4">
                <p className="text-theme-muted">可认识 NPC</p>
                <p className="mt-1 text-2xl font-black text-theme-primary">{summary.metrics.npcCount}</p>
              </div>
            </CardContent>
          </Card>
        </aside>

        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-3">
            <Card className="p-5">
              <p className="text-xs font-black uppercase tracking-[0.2em] text-theme-accent-text">指南卡片</p>
              <p className="mt-3 text-3xl font-black text-theme-primary">{summary.guideCount}</p>
              <p className="mt-2 text-sm text-theme-muted">不保存为访客任务记录</p>
            </Card>
            <Card className="p-5">
              <p className="text-xs font-black uppercase tracking-[0.2em] text-theme-primary">可直接进入</p>
              <p className="mt-3 text-3xl font-black text-theme-primary">{summary.readyGuideCount}</p>
              <p className="mt-2 text-sm text-theme-muted">基于当前公开空间数据</p>
            </Card>
            <Card className="p-5">
              <p className="text-xs font-black uppercase tracking-[0.2em] text-emerald-100/62">玩法空间</p>
              <p className="mt-3 text-3xl font-black text-theme-primary">{summary.metrics.questPlayTaverns}</p>
              <p className="mt-2 text-sm text-theme-muted">含探索布局或已发布玩法</p>
            </Card>
          </div>

          <section className="grid gap-4">
            {summary.quests.map((guide) => (
              <Card key={guide.id} className="overflow-hidden p-5">
                <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="grid h-10 w-10 place-items-center rounded-2xl border border-theme-accent-border bg-theme-accent-bg text-lg" aria-hidden="true">
                        {guide.icon}
                      </span>
                      <div>
                        <p className="text-xs font-black uppercase tracking-[0.2em] text-theme-accent-text">{guide.typeLabel}</p>
                        <h2 className="text-xl font-black text-theme-primary">{guide.title}</h2>
                      </div>
                    </div>
                    <p className="mt-3 max-w-3xl text-sm leading-6 text-theme-muted">{guide.description}</p>
                  </div>

                  <span className="inline-flex w-fit items-center gap-2 rounded-full border border-theme-border bg-theme-card px-3 py-1 text-xs font-black text-violet-50">
                    {guide.availabilityLabel}
                  </span>
                </div>

                <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-sm leading-6 text-theme-muted">
                    {guide.echoLabel}：<strong className="text-violet-50">{guide.echoCount}</strong> · {guide.helperText}
                  </p>
                  <Button asChild size="sm" variant="ghost">
                    <Link to={guide.ctaTo}>
                      {guide.ctaLabel}
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  </Button>
                </div>
              </Card>
            ))}
          </section>
        </div>
      </section>
    </ProductShell>
  )
}
