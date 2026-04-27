import { History, Send } from "lucide-react"
import { useMemo, useState, type FormEvent } from "react"

import { buildRevisitCue } from "../../lib/revisit-summary.js"
import { DEFAULT_VISITOR_ID, enterTavern, errorMessage, sendTavernChat, type ChatMessage, type Tavern, type TavernCharacter, type VisitorStatePayload } from "../../lib/taverns"
import { Button } from "../../ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../ui/card"

interface TavernChatProps {
  tavern: Tavern
  character?: TavernCharacter
}

function RevisitCuePanel({ cue }: { cue: ReturnType<typeof buildRevisitCue> }) {
  return (
    <div
      aria-live="polite"
      className={
        cue.available
          ? "rounded-3xl border border-cyan-300/25 bg-cyan-300/10 p-4 text-sm text-cyan-50"
          : "rounded-3xl border border-white/10 bg-white/[0.04] p-4 text-sm text-violet-100/70"
      }
    >
      <div className="flex items-start gap-3">
        <span className="mt-0.5 inline-flex h-9 w-9 items-center justify-center rounded-2xl bg-slate-950/50 text-cyan-100">
          <History className="h-4 w-4" />
        </span>
        <div className="min-w-0 space-y-1">
          <p className="text-xs uppercase tracking-[0.2em] text-cyan-100/60">回访提示</p>
          <h3 className="text-base font-semibold text-white">{cue.title}</h3>
          <p className="leading-6 text-violet-50/75">{cue.detail}</p>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        {cue.chips.map((chip) => (
          <span key={chip} className="rounded-full border border-white/10 bg-slate-950/35 px-3 py-1 text-xs text-violet-50/75">
            {chip}
          </span>
        ))}
      </div>
      <p className="mt-3 rounded-2xl bg-slate-950/35 px-3 py-2 text-xs text-violet-50/70">{cue.promptHint}</p>
    </div>
  )
}

export function TavernChat({ tavern, character }: TavernChatProps) {
  const [visitorId, setVisitorId] = useState(DEFAULT_VISITOR_ID)
  const [visitorName, setVisitorName] = useState("测试旅人")
  const [message, setMessage] = useState("")
  const [lines, setLines] = useState<ChatMessage[]>([])
  const [visitorState, setVisitorState] = useState<VisitorStatePayload | null>(null)
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState("")
  const [error, setError] = useState("")
  const revisitCue = useMemo(
    () => buildRevisitCue(visitorState, { tavernName: tavern.name, characterName: character?.name }),
    [character?.name, tavern.name, visitorState],
  )

  async function handleEnter() {
    setBusy(true)
    setError("")
    setNotice("")
    try {
      const result = await enterTavern(tavern.id, "", visitorId)
      setVisitorState(result.visitor_state ?? null)
      setNotice(result.first_mes || "已进入酒馆。")
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!character || !message.trim()) {
      return
    }
    const userLine: ChatMessage = { role: "user", content: message.trim(), visitor_id: visitorId }
    setLines((current) => [...current, userLine])
    setMessage("")
    setBusy(true)
    setError("")
    try {
      const result = await sendTavernChat(tavern.id, {
        character_id: character.id,
        visitor_id: visitorId,
        visitor_name: visitorName,
        message: userLine.content,
      })
      setLines((current) => [...current, { role: "assistant", content: result.response, character_id: character.id }])
      if (result.visitor_state !== undefined) {
        setVisitorState(result.visitor_state ?? null)
      }
      if (result.degradation?.message) {
        setNotice(result.degradation.message)
      }
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>进入并对话</CardTitle>
        <CardDescription>
          当前体验通过 `/api/v1/taverns/{tavern.id}/enter` 和 `/chat` 写入真实会话记录。
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="space-y-1 text-sm">
            <span className="text-violet-100/65">访客 ID</span>
            <input
              value={visitorId}
              onChange={(event) => {
                setVisitorId(event.target.value)
                setVisitorState(null)
              }}
              className="w-full rounded-2xl border border-white/12 bg-white/8 px-4 py-3 text-white outline-none focus:border-cyan-300/60"
            />
          </label>
          <label className="space-y-1 text-sm">
            <span className="text-violet-100/65">显示名</span>
            <input
              value={visitorName}
              onChange={(event) => setVisitorName(event.target.value)}
              className="w-full rounded-2xl border border-white/12 bg-white/8 px-4 py-3 text-white outline-none focus:border-cyan-300/60"
            />
          </label>
        </div>
        <Button type="button" variant="secondary" disabled={busy} onClick={handleEnter}>
          进入酒馆
        </Button>
        <RevisitCuePanel cue={revisitCue} />
        <div className="min-h-52 space-y-3 rounded-3xl border border-white/10 bg-slate-950/70 p-4">
          {lines.length ? (
            lines.map((line, index) => (
              <div
                key={`${line.role}-${index}`}
                className={
                  line.role === "user"
                    ? "ml-auto max-w-[82%] rounded-3xl bg-cyan-300/16 p-3 text-sm text-cyan-50"
                    : "max-w-[82%] rounded-3xl bg-white/8 p-3 text-sm text-violet-50"
                }
              >
                {line.content}
              </div>
            ))
          ) : (
            <p className="text-sm text-violet-100/55">
              {character ? `向 ${character.name} 说第一句话。` : "暂无可对话 NPC。"}
            </p>
          )}
        </div>
        {notice ? <p className="rounded-2xl border border-cyan-300/30 bg-cyan-300/10 p-3 text-sm text-cyan-100">{notice}</p> : null}
        {error ? <p className="rounded-2xl border border-red-300/30 bg-red-300/10 p-3 text-sm text-red-100">{error}</p> : null}
        <form className="flex flex-col gap-3 sm:flex-row" onSubmit={handleSubmit}>
          <input
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            disabled={!character || busy}
            placeholder={character ? "今晚有什么推荐？" : "先添加 NPC"}
            className="min-h-12 flex-1 rounded-full border border-white/12 bg-white/8 px-5 text-white outline-none focus:border-cyan-300/60"
          />
          <Button type="submit" disabled={!character || busy || !message.trim()}>
            <Send className="h-4 w-4" />
            发送
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
