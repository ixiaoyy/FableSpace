import type { ClientLoaderFunctionArgs } from "react-router"
import { ArrowRight, Copy, Share2 } from "lucide-react"
import { useEffect, useMemo, useState } from "react"
import { Link, useLoaderData } from "react-router"

import { TavernChatWorkbench } from "../features/tavern-chat-workbench"
import { NeighborhoodRumorBubble } from "../components/NeighborhoodRumorBubble"
import { buildCreatorConversionLink } from "../lib/creator-conversion.js"
import { fallbackRoleplayState } from "../lib/roleplay-state"
import { buildTavernShareDisplay, buildTavernSharePayload } from "../lib/tavern-share.js"
import {
  createVisitorNote,
  DEFAULT_VISITOR_ID,
  errorMessage,
  getRoleplayState,
  getTavern,
  getTavernShare,
  type RoleplayState,
  type Tavern,
  type TavernSharePayload,
} from "../lib/taverns"
import { ProductShell } from "../shell/product-shell"
import { Button } from "../ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card"

type TavernLoaderData = {
  tavernId: string
  currentUserId: string
  tavern: Tavern | null
  roleplay: RoleplayState | null
  error: string
}

function getCurrentUserIdFromRequest(request: Request) {
  const url = new URL(request.url)
  return (
    url.searchParams.get("user_id")?.trim() ||
    url.searchParams.get("owner_id")?.trim() ||
    url.searchParams.get("visitor_id")?.trim() ||
    DEFAULT_VISITOR_ID
  )
}

export async function clientLoader({ params, request }: ClientLoaderFunctionArgs): Promise<TavernLoaderData> {
  const tavernId = params.tavernId ?? ""
  const currentUserId = getCurrentUserIdFromRequest(request)
  if (!tavernId) {
    return { tavernId, currentUserId, tavern: null, roleplay: null, error: "缺少酒馆 ID" }
  }
  try {
    const tavern = await getTavern(tavernId, currentUserId)
    let roleplay: RoleplayState | null = null
    try {
      roleplay = await getRoleplayState(tavernId, currentUserId)
    } catch {
      roleplay = null
    }
    return { tavernId, currentUserId, tavern, roleplay, error: "" }
  } catch (error) {
    return { tavernId, currentUserId, tavern: null, roleplay: null, error: errorMessage(error) }
  }
}

function TavernShareCard({ tavern }: { tavern: Tavern }) {
  const [copyStatus, setCopyStatus] = useState("")
  const [shareStatus, setShareStatus] = useState("正在同步公开分享信息…")
  const [serverSharePayload, setServerSharePayload] = useState<TavernSharePayload | null>(null)
  const fallbackSharePayload = useMemo(
    () => buildTavernSharePayload(tavern, {
      origin: typeof window !== "undefined" ? window.location.origin : "",
    }),
    [tavern],
  )
  const sharePayload = useMemo(
    () => (serverSharePayload ? buildTavernShareDisplay(serverSharePayload) : fallbackSharePayload),
    [fallbackSharePayload, serverSharePayload],
  )

  useEffect(() => {
    let cancelled = false
    setShareStatus("正在同步公开分享信息…")
    setServerSharePayload(null)

    getTavernShare(tavern.id, DEFAULT_VISITOR_ID)
      .then((payload) => {
        if (cancelled) return
        setServerSharePayload(payload)
        setShareStatus("")
      })
      .catch(() => {
        if (cancelled) return
        setShareStatus("当前使用本地邀请文案；公开分享接口暂不可用。")
      })

    return () => {
      cancelled = true
    }
  }, [tavern.id])

  async function handleCopyShareText() {
    setCopyStatus("")
    try {
      if (typeof navigator === "undefined" || !navigator.clipboard?.writeText) {
        setCopyStatus("当前浏览器不支持自动复制，请手动选中文案复制。")
        return
      }
      await navigator.clipboard.writeText(sharePayload.copyText)
      setCopyStatus("已复制邀请文案。")
    } catch {
      setCopyStatus("当前浏览器不允许自动复制，请手动选中文案复制。")
    }
  }

  return (
    <Card className="min-w-0 overflow-hidden">
      <CardHeader>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Share2 className="h-5 w-5 text-cyan-200" />
              邀请链接
            </CardTitle>
            <CardDescription className="mt-2">
              复制当前酒馆入口给朋友或社群。文案只使用店主公开填写的信息，不生成或改写酒馆内容。
            </CardDescription>
          </div>
          <Button type="button" variant="secondary" onClick={handleCopyShareText}>
            <Copy className="h-4 w-4" />
            复制邀请
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-4">
          <p className="text-sm font-bold text-white">{sharePayload.title}</p>
          <p className="mt-2 text-sm leading-6 text-violet-50/70">{sharePayload.summary}</p>
          {sharePayload.characters ? (
            <p className="mt-2 text-sm font-bold text-cyan-100">
              <span className="text-violet-100/55">NPC：</span>{sharePayload.characters}
            </p>
          ) : null}
          <p className="mt-3 break-all rounded-2xl bg-slate-950/45 px-3 py-2 text-xs text-cyan-100">
            {sharePayload.url}
          </p>
        </div>
        <textarea
          readOnly
          value={sharePayload.copyText}
          rows={4}
          className="w-full resize-none rounded-2xl border border-white/12 bg-slate-950/70 px-4 py-3 text-sm leading-6 text-violet-50 outline-none focus:border-cyan-300/60"
          aria-label="酒馆邀请文案"
        />
        {shareStatus ? <p className="rounded-2xl border border-white/10 bg-white/[0.04] p-3 text-sm text-violet-50/64">{shareStatus}</p> : null}
        {copyStatus ? <p className="rounded-2xl border border-cyan-300/20 bg-cyan-300/10 p-3 text-sm text-cyan-50">{copyStatus}</p> : null}
      </CardContent>
    </Card>
  )
}

function CreatorConversionCard({ tavern }: { tavern: Tavern }) {
  const createLink = useMemo(() => buildCreatorConversionLink(tavern), [tavern])

  return (
    <Card className="min-w-0 overflow-hidden border-cyan-300/18 bg-cyan-300/8">
      <CardHeader>
        <CardTitle>也在附近开一间自己的酒馆</CardTitle>
        <CardDescription className="mt-2">
          只带入这处真实空间锚点的坐标/地址，不复制原酒馆名称、简介、角色或场景内容。
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="rounded-2xl border border-white/10 bg-slate-950/45 p-3 text-sm leading-6 text-violet-50/72">
          如果这间酒馆让你有了灵感，可以用同一片现实区域开一间属于自己的赛博酒馆；内容仍由你自己确认。
        </p>
        <Button asChild>
          <Link to={createLink}>
            开自己的酒馆
            <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
      </CardContent>
    </Card>
  )
}

function VisitorFeedbackCard({ tavern }: { tavern: Tavern }) {
  const [visitorId, setVisitorId] = useState(DEFAULT_VISITOR_ID)
  const [nickname, setNickname] = useState("旅人")
  const [content, setContent] = useState("")
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState("")

  async function handleSubmitNote() {
    setBusy(true)
    setMessage("")
    try {
      await createVisitorNote(tavern.id, { visitor_nickname: nickname, content }, visitorId)
      setContent("")
      setMessage("已发送给店主。你的反馈不会成为公开留言墙。")
    } catch (error) {
      setMessage(errorMessage(error))
    } finally {
      setBusy(false)
    }
  }

  return (
    <Card className="min-w-0 overflow-hidden border-violet-300/18 bg-violet-300/8">
      <CardHeader>
        <CardTitle>给店主的私密反馈</CardTitle>
        <CardDescription className="mt-2">
          这不是公开留言墙：反馈只发送给本酒馆店主，不支持访客互相回复、点赞或私信。
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid gap-3 md:grid-cols-2">
          <label className="space-y-1.5 text-sm">
            <span className="text-violet-100/65">Visitor ID</span>
            <input value={visitorId} onChange={(event) => setVisitorId(event.target.value)} className="w-full rounded-2xl border border-white/12 bg-white/[0.06] px-4 py-3 text-white outline-none focus:border-cyan-300/60" />
          </label>
          <label className="space-y-1.5 text-sm">
            <span className="text-violet-100/65">昵称</span>
            <input value={nickname} onChange={(event) => setNickname(event.target.value)} className="w-full rounded-2xl border border-white/12 bg-white/[0.06] px-4 py-3 text-white outline-none focus:border-cyan-300/60" />
          </label>
        </div>
        <label className="space-y-1.5 text-sm">
          <span className="text-violet-100/65">反馈内容</span>
          <textarea value={content} onChange={(event) => setContent(event.target.value)} rows={3} maxLength={500} placeholder="告诉店主这次回访的感受，或希望下次看到什么。" className="w-full rounded-2xl border border-white/12 bg-white/[0.06] px-4 py-3 text-white outline-none focus:border-cyan-300/60" />
        </label>
        <Button type="button" disabled={!content.trim() || busy} className="w-full" onClick={handleSubmitNote}>
          发送给店主
        </Button>
        {message ? <p className="rounded-2xl border border-cyan-300/20 bg-cyan-300/10 p-3 text-sm text-cyan-50">{message}</p> : null}
      </CardContent>
    </Card>
  )
}

export default function TavernRoute() {
  const { tavernId, currentUserId, tavern, roleplay, error } = useLoaderData<typeof clientLoader>()
  const characters = tavern?.characters || []
  const effectiveRoleplay = tavern ? roleplay || fallbackRoleplayState(tavern, characters) : null
  const isOwner = Boolean(tavern?.owner_id && tavern.owner_id === currentUserId)

  return (
    <ProductShell eyebrow="Tavern">
      <div id="tavern-mainline" className="scroll-mt-28">
        {tavern ? (
          <TavernChatWorkbench
            tavern={tavern}
            roleplay={effectiveRoleplay}
            currentUserId={currentUserId}
            isOwner={isOwner}
            publicPanel={
              <div className="space-y-4">
                <TavernShareCard tavern={tavern} />
                <NeighborhoodRumorBubble tavernId={tavern.id} limit={3} />
                <CreatorConversionCard tavern={tavern} />
                <VisitorFeedbackCard tavern={tavern} />
              </div>
            }
          />
        ) : (
          <Card className="min-w-0 overflow-hidden">
            <CardHeader>
              <CardTitle>无法进入酒馆</CardTitle>
              <CardDescription className="mt-2">
                {error || `未找到酒馆 ${tavernId}`}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-sm leading-6 text-violet-50/70">
                请确认酒馆链接、访问权限或当前用户身份。店主可从管理页进入并携带 owner_id。
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </ProductShell>
  )
}
