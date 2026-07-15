import type { ClientLoaderFunctionArgs } from "react-router"
import { ArrowRight, Compass, MapPinned, Play, ShieldCheck } from "lucide-react"
import { Link, useLoaderData } from "react-router"

import { useCreatorAccess } from "../hooks/useCreatorAccess"
import { buildQuestGuideSummary } from "../lib/quest-guide.js"
import { DEFAULT_OWNER_ID, errorMessage, listSpaces, type Space } from "../lib/spaces"
import { WEB_PATHS } from "../lib/web-routes"
import { ProductShell } from "../shell/product-shell"
import { Button } from "../ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card"

export async function clientLoader({ request }: ClientLoaderFunctionArgs) {
  const url = new URL(request.url)
  const ownerId = url.searchParams.get("owner_id")?.trim() || DEFAULT_OWNER_ID
  const errors: string[] = []
  let spaces: Space[] = []

  try {
    const result = await listSpaces({})
    spaces = result.spaces || []
  } catch (error) {
    errors.push(`读取探索指南数据失败：${errorMessage(error)}`)
  }

  return {
    ownerId,
    errors,
    summary: buildQuestGuideSummary({ spaces, ownerId }),
  }
}

export default function QuestsRoute() {
  const { errors, summary } = useLoaderData<typeof clientLoader>()
  const { allowed: showCreatorTools } = useCreatorAccess()
  const visibleGuides = showCreatorTools
    ? summary.quests
    : summary.quests.filter((guide) => guide.type !== "creation")
  const directGameplayGuide = visibleGuides.find((guide) => guide.availabilityLabel === "可直接开始")
  const readyGuideCount = visibleGuides.filter((guide) => guide.availability === "ready").length

  return (
    <ProductShell eyebrow="任务指南">
      <section id="任务主线" className="scroll-mt-28 grid gap-6 lg:grid-cols-[0.82fr_1.18fr] lg:items-start">
        <aside className="space-y-5">
          <Card className="overflow-hidden">
            <CardHeader>
              <div className="mb-2 inline-flex w-fit items-center gap-2 rounded-full border border-theme-accent-border bg-theme-accent-bg px-3 py-1.5 text-xs font-black text-theme-accent-text">
                <Compass className="h-3.5 w-3.5" />
                探索指南
              </div>
              <CardTitle className="text-4xl font-black leading-tight">现在就玩</CardTitle>
              <CardDescription className="text-base leading-7">
                这是给新手的轻量导览：找到真实坐标空间、认识 NPC，或直接开始店主已经发布的玩法。
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <Button asChild size="lg">
                  <Link to={directGameplayGuide?.ctaTo || WEB_PATHS.spaces}>
                    <Play className="h-4 w-4" />
                    {directGameplayGuide ? "直接开始玩法" : "寻找可玩空间"}
                  </Link>
                </Button>
                <Button asChild size="lg" variant="secondary">
                  <Link to={WEB_PATHS.spaces}>
                    <MapPinned className="h-4 w-4" />
                    浏览更多空间
                  </Link>
                </Button>
              </div>

              <div className="rounded-[1.25rem] border border-theme-accent-border bg-theme-accent-bg p-4">
                <p className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.2em] text-theme-accent-text">
                  <ShieldCheck className="h-3.5 w-3.5" />
                  进度归属
                </p>
                <p className="mt-2 text-sm leading-7 text-theme-muted">
                  玩法进度和回访提示保存在所属空间；平台不做等级、装备或竞争排名。
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
                <p className="mt-1 text-2xl font-black text-theme-primary">{summary.metrics.spaces}</p>
              </div>
              <div className="rounded-2xl border border-theme-border bg-theme-card p-4">
                <p className="text-theme-muted">开放入口</p>
                <p className="mt-1 text-2xl font-black text-theme-primary">{summary.metrics.openSpaces}</p>
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
              <p className="mt-3 text-3xl font-black text-theme-primary">{visibleGuides.length}</p>
              <p className="mt-2 text-sm text-theme-muted">帮助你找到下一段真实体验</p>
            </Card>
            <Card className="p-5">
              <p className="text-xs font-black uppercase tracking-[0.2em] text-theme-primary">可直接进入</p>
              <p className="mt-3 text-3xl font-black text-theme-primary">{readyGuideCount}</p>
              <p className="mt-2 text-sm text-theme-muted">基于当前公开空间数据</p>
            </Card>
            <Card className="p-5">
              <p className="text-xs font-black uppercase tracking-[0.2em] text-theme-accent-text">可直接玩法</p>
              <p className="mt-3 text-3xl font-black text-theme-primary">{summary.metrics.publishedGameplays}</p>
              <p className="mt-2 text-sm text-theme-muted">公开开放空间中的已发布玩法</p>
            </Card>
          </div>

          <section className="grid gap-4">
            {visibleGuides.map((guide) => (
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

                  <span className="inline-flex w-fit items-center gap-2 rounded-full border border-theme-border bg-theme-card px-3 py-1 text-xs font-black text-theme-primary">
                    {guide.availabilityLabel}
                  </span>
                </div>

                <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-sm leading-6 text-theme-muted">
                    {guide.echoLabel}：<strong className="text-theme-primary">{guide.echoCount}</strong> · {guide.helperText}
                  </p>
                  <Button asChild size="sm" variant={guide.availabilityLabel === "可直接开始" ? "primary" : "ghost"}>
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
