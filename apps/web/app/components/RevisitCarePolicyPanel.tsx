import { useMemo, useState } from "react"
import type { ReactNode } from "react"
import { BellRing, Moon, ShieldCheck, SlidersHorizontal, TimerReset, XCircle } from "lucide-react"

import {
  REVISIT_CARE_GUARDRAILS,
  buildRevisitCarePolicyChecklist,
  evaluateRevisitCareCandidate,
  normalizeRevisitCarePolicy,
} from "../lib/revisit-care-notification-policy.js"
import { Button } from "../ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card"

type RevisitCarePolicyPanelProps = {
  userId: string
}

export function RevisitCarePolicyPanel({ userId }: RevisitCarePolicyPanelProps) {
  const [optInPreview, setOptInPreview] = useState(false)
  const [quietPreview, setQuietPreview] = useState(false)
  const [weeklySentPreview, setWeeklySentPreview] = useState(false)

  const policy = useMemo(() => normalizeRevisitCarePolicy({ optIn: optInPreview }), [optInPreview])
  const candidate = useMemo(() => ({
    trigger: "owner_replied_feedback",
    channel: "in_app",
    now: quietPreview ? "2026-05-04T23:30:00+08:00" : "2026-05-04T21:00:00+08:00",
    sentThisWeek: weeklySentPreview ? 1 : 0,
  }), [quietPreview, weeklySentPreview])
  const result = useMemo(() => evaluateRevisitCareCandidate(candidate, policy), [candidate, policy])
  const checklist = useMemo(() => buildRevisitCarePolicyChecklist(policy), [policy])

  return (
    <Card className="overflow-hidden border-cyan-300/16 bg-cyan-300/[0.045]" data-feature="revisit-care-policy-preview">
      <CardHeader className="border-b border-white/10 bg-slate-950/35">
        <div className="mb-2 inline-flex w-fit items-center gap-2 rounded-full border border-cyan-300/20 bg-cyan-300/10 px-3 py-1.5 text-xs font-black text-cyan-100">
          <BellRing className="h-3.5 w-3.5" />
          revisit-care · 未启用设计预览
        </div>
        <CardTitle className="text-2xl font-black leading-tight">主动回访关怀边界</CardTitle>
        <CardDescription className="text-sm leading-7">
          这里只做安全策略预览，不会发送通知、不会写入 schema，也不会开启系统推送。任何未来实现都必须先满足主动订阅、quiet hours、频控和取消订阅。
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-5 p-5">
        <div className="grid gap-3 sm:grid-cols-2">
          {REVISIT_CARE_GUARDRAILS.map((item) => (
            <div key={item} className="rounded-2xl border border-white/10 bg-slate-950/45 p-3 text-sm font-bold leading-6 text-violet-50">
              <ShieldCheck className="mb-2 h-4 w-4 text-cyan-100" />
              {item}
            </div>
          ))}
        </div>

        <div className="grid gap-2 rounded-3xl border border-white/10 bg-white/[0.035] p-3">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-cyan-100/68">本地预览开关</p>
          <div className="grid gap-2 sm:grid-cols-3">
            <PreviewToggle
              active={optInPreview}
              onClick={() => setOptInPreview((value) => !value)}
              icon={<SlidersHorizontal className="h-4 w-4" />}
              title={optInPreview ? "已主动订阅预览" : "默认未订阅"}
              detail="验证 opt-in 门槛"
            />
            <PreviewToggle
              active={quietPreview}
              onClick={() => setQuietPreview((value) => !value)}
              icon={<Moon className="h-4 w-4" />}
              title={quietPreview ? "模拟安静时段" : "模拟可触达时段"}
              detail="验证 quiet hours"
            />
            <PreviewToggle
              active={weeklySentPreview}
              onClick={() => setWeeklySentPreview((value) => !value)}
              icon={<TimerReset className="h-4 w-4" />}
              title={weeklySentPreview ? "本周已触达 1 次" : "本周未触达"}
              detail="验证频控上限"
            />
          </div>
        </div>

        <div className={`rounded-3xl border p-4 ${result.allowed ? "border-emerald-300/24 bg-emerald-300/[0.08]" : "border-amber-300/24 bg-amber-300/[0.08]"}`}>
          <p className="flex items-center gap-2 text-sm font-black text-white">
            {result.allowed ? <ShieldCheck className="h-4 w-4 text-emerald-100" /> : <XCircle className="h-4 w-4 text-amber-100" />}
            {result.allowed ? "仅可排队站内通知预览" : "当前不会触达"}
          </p>
          <p className="mt-2 text-sm leading-7 text-violet-100/72">{result.summary}</p>
          {result.blockers.length > 0 ? (
            <ul className="mt-3 grid gap-2">
              {result.blockers.map((item) => (
                <li key={item.id} className="rounded-2xl border border-white/10 bg-slate-950/35 px-3 py-2 text-xs leading-5 text-violet-100/64">
                  <b className="text-violet-50">{item.label}</b> — {item.detail}
                </li>
              ))}
            </ul>
          ) : null}
        </div>

        <div className="grid gap-3">
          {checklist.map((item) => (
            <div key={item.id} className="flex flex-col gap-2 rounded-2xl border border-white/10 bg-slate-950/35 p-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="font-black text-white">{item.label}</p>
                <p className="mt-1 text-sm leading-6 text-violet-100/62">{item.detail}</p>
              </div>
              <span className={`w-fit rounded-full border px-3 py-1 text-xs font-black ${item.status === "ready" ? "border-emerald-300/22 bg-emerald-300/10 text-emerald-100" : "border-amber-300/22 bg-amber-300/10 text-amber-100"}`}>
                {item.status === "ready" ? "ready" : "blocked"}
              </span>
            </div>
          ))}
        </div>

        <p className="rounded-2xl border border-white/10 bg-slate-950/35 px-3 py-2 text-xs leading-6 text-violet-100/52">
          当前接收人：{userId ? "已识别" : "未识别"}。这里仅展示回访提醒的设计方向，不会读取或保存个人偏好。
        </p>
      </CardContent>
    </Card>
  )
}

function PreviewToggle({
  active,
  onClick,
  icon,
  title,
  detail,
}: {
  active: boolean
  onClick: () => void
  icon: ReactNode
  title: string
  detail: string
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={`min-h-20 rounded-2xl border px-4 py-3 text-left transition ${
        active
          ? "border-cyan-300/50 bg-cyan-300/15 text-cyan-50"
          : "border-white/10 bg-slate-950/35 text-violet-100/68 hover:border-white/20 hover:text-white"
      }`}
    >
      <span className="flex items-center gap-2 text-sm font-black">
        {icon}
        {title}
      </span>
      <small className="mt-1 block text-xs leading-5 opacity-75">{detail}</small>
    </button>
  )
}
