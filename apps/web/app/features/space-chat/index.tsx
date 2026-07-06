import { Heart, History, Send } from "lucide-react"
import { useEffect, useMemo, useState, type FormEvent } from "react"

import { buildRevisitCue, formatRevisitTime } from "../../lib/revisit-summary.js"
import { formatRelationshipStage } from "../../lib/owner-summary.js"
import { GENDER_OPTIONS, genderLabel, normalizeGender } from "../../lib/gender.js"
import { DEFAULT_VISITOR_ID, enterSpace, errorMessage, sendSpaceChat, type ChatMessage, type Space, type SpaceCharacter, type VisitorStatePayload } from "../../lib/spaces"
import { Button } from "../../ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../ui/card"
// @ts-ignore
import { getHobbyIcon, getHobbyCategory } from "../../lib/character-hobbies.js"


interface SpaceChatProps {
  space: Space
  character?: SpaceCharacter
}

function entranceReactionContent(character: SpaceCharacter, spaceName: string) {
  const firstMessage = String(character.first_mes || "").trim()
  if (firstMessage) return firstMessage
  const name = character.name || "这里的 NPC"
  return `你刚走进${spaceName || "这间空间"}，${name}向你点了点头。`
}

function entranceReactionMessages(availableCharacters: SpaceCharacter[], spaceName: string): ChatMessage[] {
  const timestamp = new Date().toISOString()
  return availableCharacters.map((npc, index) => ({
    id: `entrance-${npc.id || index}-${timestamp}`,
    role: "assistant",
    content: entranceReactionContent(npc, spaceName),
    character_id: npc.id,
    timestamp,
  }))
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

function VisitorStateSummary({ state }: { state: VisitorStatePayload }) {
  const relationship = state?.relationship || {}
  const visitCount = Number(state.visit_count ?? 0)
  const strength = Math.round(Number(relationship.strength ?? 0) * 100)
  const stageLabel = formatRelationshipStage(String(relationship.stage || ""), Number(relationship.strength ?? 0))
  const lastVisit = formatRevisitTime(state.last_visit)

  return (
    <div
      aria-label="访客关系状态"
      className="flex min-h-11 flex-wrap items-center gap-2 rounded-2xl border border-cyan-300/20 bg-cyan-300/8 px-4 py-2 text-xs"
    >
      <Heart className="h-3.5 w-3.5 shrink-0 text-cyan-200" />
      <span className="font-bold text-cyan-100">
        {stageLabel}
      </span>
      {visitCount > 0 && (
        <span className="rounded-full border border-white/12 bg-white/5 px-2 py-0.5 text-violet-100/70">
          {visitCount} 次到访
        </span>
      )}
      {strength > 0 && (
        <span className="rounded-full border border-white/12 bg-white/5 px-2 py-0.5 text-violet-100/70">
          关系 {strength}%
        </span>
      )}
      {lastVisit && lastVisit !== "暂无记录" && (
        <span className="rounded-full border border-white/12 bg-white/5 px-2 py-0.5 text-violet-100/70">
          最近 {lastVisit}
        </span>
      )}
    </div>
  )
}

export function SpaceChat({ space, character }: SpaceChatProps) {
  const [visitorId, setVisitorId] = useState(DEFAULT_VISITOR_ID)
  const [visitorName, setVisitorName] = useState("测试旅人")
  const [visitorGender, setVisitorGender] = useState("unspecified")
  const [message, setMessage] = useState("")
  const [lines, setLines] = useState<ChatMessage[]>([])
  const [visitorState, setVisitorState] = useState<VisitorStatePayload | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")
  const availableCharacters = useMemo(
    () => {
      if (Array.isArray(space.characters) && space.characters.length > 0) return space.characters
      return character ? [character] : []
    },
    [character, space.characters],
  )
  const characterSignature = useMemo(
    () => availableCharacters.map((npc) => [
      npc.id || "",
      npc.name || "",
      npc.first_mes || "",
    ].join(":")).join("|"),
    [availableCharacters],
  )
  const characterNameById = useMemo(
    () => new Map(availableCharacters.map((npc) => [npc.id, npc.name || npc.id || "NPC"])),
    [availableCharacters],
  )
  const revisitCue = useMemo(
    () => buildRevisitCue(visitorState, { spaceName: space.name, characterName: character?.name }),
    [character?.name, space.name, visitorState],
  )

  useEffect(() => {
    setLines(entranceReactionMessages(availableCharacters, space.name))
  }, [availableCharacters, characterSignature, space.id, space.name])

  async function handleEnter() {
    setBusy(true)
    setError("")
    try {
      const result = await enterSpace(space.id, "", visitorId, visitorGender)
      setVisitorState(result.visitor_state ?? null)
      setLines(entranceReactionMessages(availableCharacters, space.name))
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
      const result = await sendSpaceChat(space.id, {
        character_id: character.id,
        visitor_id: visitorId,
        visitor_name: visitorName,
        visitor_gender: visitorGender,
        message: userLine.content,
      })
      const responseText = String(result.response || "").trim()
      if (responseText) {
        setLines((current) => [...current, { 
          role: "assistant", 
          content: responseText, 
          character_id: character.id,
          conflicts: result.conflicts
        }])
      }
      if (result.visitor_state !== undefined) {
        setVisitorState(result.visitor_state ?? null)
      }
      if (result.degradation?.message) {
        setError(result.degradation.message)
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
          当前体验通过 `/api/v1/spaces/{space.id}/enter` 和 `/chat` 写入真实会话记录。
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-3">
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
          <label className="space-y-1 text-sm">
            <span className="text-violet-100/65">性别</span>
            <select
              value={visitorGender}
              onChange={(event) => setVisitorGender(normalizeGender(event.target.value))}
              className="w-full rounded-2xl border border-white/12 bg-white/8 px-4 py-3 text-white outline-none focus:border-cyan-300/60"
            >
              {GENDER_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        </div>
        {visitorState?.gender ? (
          <p className="text-xs text-violet-100/60">当前访客性别：{genderLabel(visitorState.gender)}</p>
        ) : null}
        <Button type="button" variant="secondary" disabled={busy} onClick={handleEnter}>
          进入空间
        </Button>
        {visitorState ? <VisitorStateSummary state={visitorState} /> : null}
        {character?.hobbies && character.hobbies.length > 0 && (
          <div className="flex flex-wrap gap-2 py-1">
            {character.hobbies.map((hobby) => {
              const category = getHobbyCategory(hobby)
              return (
                <span 
                  key={hobby} 
                  className={`hobby-chip hobby-chip--${category.id}`}
                >
                  <span>{getHobbyIcon(hobby)}</span>
                  {hobby}
                </span>
              )
            })}
          </div>
        )}
        <RevisitCuePanel cue={revisitCue} />

        <div className="min-h-52 space-y-3 rounded-3xl border border-white/10 bg-slate-950/70 p-4" data-entrance-reactions>
          {lines.length ? (
            lines.map((line, index) => {
              const speakerName = line.role === "user" ? visitorName : characterNameById.get(line.character_id || "") || character?.name
              return (
                <div
                  key={`${line.role}-${index}`}
                  className={
                    line.role === "user"
                      ? "ml-auto max-w-[82%] rounded-3xl bg-cyan-300/16 p-3 text-sm text-cyan-50"
                      : "max-w-[82%] rounded-3xl bg-white/8 p-3 text-sm text-violet-50"
                  }
                >
                  {speakerName ? (
                    <p className="mb-1 text-xs font-semibold uppercase tracking-[0.16em] text-violet-100/55">{speakerName}</p>
                  ) : null}
                  {line.content}
                  {line.conflicts && line.conflicts.length > 0 && (
                    <div className="mt-2 space-y-1 border-t border-red-500/20 pt-2 text-[10px] text-red-300">
                      <p className="flex items-center gap-1 font-bold uppercase tracking-wider">
                        <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
                        正史矛盾预警
                      </p>
                      {line.conflicts.map((c, i) => (
                        <p key={i} className="opacity-80">
                          {c.reason}
                        </p>
                      ))}
                    </div>
                  )}
                </div>
              )
            })
          ) : (
            <p className="text-sm text-violet-100/55">
              {character ? `向 ${character.name} 说第一句话。` : "暂无可对话 NPC。"}
            </p>
          )}
        </div>
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
