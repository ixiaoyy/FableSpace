import { Send } from "lucide-react"
import { useState, type FormEvent } from "react"

import { DEFAULT_VISITOR_ID, enterTavern, errorMessage, sendTavernChat, type ChatMessage, type Tavern, type TavernCharacter } from "../../lib/taverns"
import { Button } from "../../ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../ui/card"

interface TavernChatProps {
  tavern: Tavern
  character?: TavernCharacter
}

export function TavernChat({ tavern, character }: TavernChatProps) {
  const [visitorId, setVisitorId] = useState(DEFAULT_VISITOR_ID)
  const [visitorName, setVisitorName] = useState("测试旅人")
  const [message, setMessage] = useState("")
  const [lines, setLines] = useState<ChatMessage[]>([])
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState("")
  const [error, setError] = useState("")

  async function handleEnter() {
    setBusy(true)
    setError("")
    setNotice("")
    try {
      const result = await enterTavern(tavern.id, "", visitorId)
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
              onChange={(event) => setVisitorId(event.target.value)}
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
