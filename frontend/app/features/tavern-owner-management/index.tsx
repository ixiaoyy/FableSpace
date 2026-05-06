import { CheckCircle2, Send, ShieldCheck, UserCheck, XCircle } from "lucide-react"
import { useState } from "react"

import { PLACE_RELATIONSHIP_TYPES, normalizePlaceRelationshipDraft } from "../../lib/place-home.js"
import { fallbackRoleplayState } from "../../lib/roleplay-state"
import {
  addHomeMember,
  createPlaceRelationship,
  createSchoolEnrollment,
  DEFAULT_OWNER_ID,
  DEFAULT_VISITOR_ID,
  deleteVisitorNote,
  decidePlaceRelationship,
  decideRoleplayClaim,
  errorMessage,
  listVisitorNotes,
  requestRoleplayClaim,
  saveRoleplayConfig,
  type HomeMember,
  type PlaceRelationship,
  type RoleplayClaim,
  type RoleplayState,
  type Tavern,
  type TavernCharacter,
  type TavernVisitorNote,
} from "../../lib/taverns"
import { Button } from "../../ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../ui/card"

function characterName(characters: TavernCharacter[], characterId: string) {
  return characters.find((character) => character.id === characterId)?.name || characterId
}

function RoleplayPanel({
  tavern,
  characters,
  roleplay,
  onRoleplayChange,
}: {
  tavern: Tavern
  characters: TavernCharacter[]
  roleplay: RoleplayState
  onRoleplayChange: (state: RoleplayState) => void
}) {
  const [ownerId, setOwnerId] = useState(tavern.owner_id || DEFAULT_OWNER_ID)
  const [visitorId, setVisitorId] = useState(DEFAULT_VISITOR_ID)
  const [playerName, setPlayerName] = useState("Demo performer")
  const [mode, setMode] = useState(String(roleplay.roleplay_mode || "ai_only"))
  const [characterId, setCharacterId] = useState(characters[0]?.id || "")
  const [busy, setBusy] = useState("")
  const [message, setMessage] = useState("")

  const claims = roleplay.claims || []
  const pendingClaims = claims.filter((claim) => claim.status === "pending")
  const approvedClaims = claims.filter((claim) => claim.status === "approved")
  const hybridEnabled = roleplay.roleplay_mode === "hybrid"

  async function run(action: string, task: () => Promise<RoleplayState>, success: string) {
    setBusy(action)
    setMessage("")
    try {
      const next = await task()
      onRoleplayChange(next)
      setMode(String(next.roleplay_mode || "ai_only"))
      setMessage(success)
    } catch (error) {
      setMessage(errorMessage(error))
    } finally {
      setBusy("")
    }
  }

  return (
    <Card className="relative min-w-0 overflow-hidden border-cyan-300/18 bg-[radial-gradient(circle_at_top_right,rgba(34,211,238,0.16),transparent_34%),linear-gradient(135deg,rgba(15,23,42,0.92),rgba(30,27,75,0.68))]">
      <div className="pointer-events-none absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-cyan-200/55 to-transparent" />
      <CardHeader className="relative">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.22em] text-cyan-100/55">Owner console</p>
            <CardTitle className="mt-1">店主角色控制台</CardTitle>
            <CardDescription className="mt-2">
              只在店主视角处理 NPC 扮演模式与认领审批，不进入访客首屏。
            </CardDescription>
          </div>
          <div className="flex flex-wrap gap-2">
            <span className="inline-flex w-fit items-center gap-2 rounded-full border border-cyan-300/24 bg-cyan-300/10 px-3 py-1 text-xs font-black text-cyan-100">
              <UserCheck className="h-3.5 w-3.5" />
              Tavern scoped
            </span>
            <span className="inline-flex w-fit rounded-full border border-white/10 bg-white/[0.06] px-3 py-1 text-xs font-bold text-violet-50/72">
              {roleplay.roleplay_mode} · {approvedClaims.length} approved · {pendingClaims.length} pending
            </span>
          </div>
        </div>
      </CardHeader>
      <CardContent className="relative space-y-5">
        <section className="space-y-3 rounded-3xl border border-cyan-300/12 bg-cyan-300/[0.045] p-4">
          <div>
            <p className="text-sm font-black text-white">扮演模式信号</p>
            <p className="mt-1 text-xs leading-5 text-cyan-50/58">
              模式保存后才会影响本酒馆；店主身份仍由后端权限校验决定。
            </p>
          </div>
          <div className="grid min-w-0 gap-3">
          <label className="min-w-0 space-y-1.5 text-sm">
            <span className="text-violet-100/65">Owner ID</span>
            <input value={ownerId} onChange={(event) => setOwnerId(event.target.value)} className="w-full rounded-2xl border border-white/12 bg-white/[0.06] px-4 py-3 text-white outline-none focus:border-cyan-300/60" />
          </label>
          <label className="space-y-1.5 text-sm">
            <span className="text-violet-100/65">Mode</span>
            <select value={mode} onChange={(event) => setMode(event.target.value)} className="w-full rounded-2xl border border-white/12 bg-slate-950 px-4 py-3 text-white outline-none focus:border-cyan-300/60">
              <option value="ai_only">ai_only</option>
              <option value="hybrid">hybrid</option>
            </select>
          </label>
          <Button
            type="button"
            disabled={busy === "mode"}
            className="w-full"
            onClick={() => run("mode", () => saveRoleplayConfig(tavern.id, { roleplay_mode: mode }, ownerId), "Roleplay mode saved.")}
          >
            <ShieldCheck className="h-4 w-4" />
            Save mode
          </Button>
          </div>
        </section>

        <section className="space-y-3 rounded-3xl border border-violet-300/12 bg-violet-300/[0.045] p-4">
          <div>
            <p className="text-sm font-black text-white">NPC 认领队列</p>
            <p className="mt-1 text-xs leading-5 text-violet-100/58">
              访客可申请临时扮演，店主在这里批准或拒绝；它不是公开社交关系。
            </p>
          </div>
          <div className="grid min-w-0 gap-3">
          <label className="min-w-0 space-y-1.5 text-sm">
            <span className="text-violet-100/65">Visitor ID</span>
            <input value={visitorId} onChange={(event) => setVisitorId(event.target.value)} className="w-full rounded-2xl border border-white/12 bg-white/[0.06] px-4 py-3 text-white outline-none focus:border-cyan-300/60" />
          </label>
          <label className="min-w-0 space-y-1.5 text-sm">
            <span className="text-violet-100/65">Player name</span>
            <input value={playerName} onChange={(event) => setPlayerName(event.target.value)} className="w-full rounded-2xl border border-white/12 bg-white/[0.06] px-4 py-3 text-white outline-none focus:border-cyan-300/60" />
          </label>
          <label className="min-w-0 space-y-1.5 text-sm">
            <span className="text-violet-100/65">NPC role</span>
            <select value={characterId} onChange={(event) => setCharacterId(event.target.value)} className="w-full rounded-2xl border border-white/12 bg-slate-950 px-4 py-3 text-white outline-none focus:border-cyan-300/60">
              {characters.map((character) => (
                <option key={character.id} value={character.id}>{character.name || character.id}</option>
              ))}
            </select>
          </label>
          <Button
            type="button"
            disabled={!hybridEnabled || !characterId || busy === "claim"}
            className="w-full"
            onClick={() => run("claim", () => requestRoleplayClaim(tavern.id, { character_id: characterId, player_name: playerName }, visitorId), "Claim request sent.")}
          >
            <Send className="h-4 w-4" />
            Request claim
          </Button>
          </div>
        </section>

        {claims.length ? (
          <div data-roleplay-claims="compact" className="space-y-2">
            {claims.map((claim: RoleplayClaim) => (
              <div key={claim.id} className="flex min-w-0 flex-col gap-3 rounded-2xl border border-white/10 bg-white/[0.045] p-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold text-white" title={`${characterName(characters, claim.character_id)} · ${claim.player_name || claim.player_id}`}>
                    {characterName(characters, claim.character_id)} · {claim.player_name || claim.player_id}
                  </p>
                  <p className="mt-1 truncate text-xs text-violet-100/55" title={`${claim.status} · ${claim.id}`}>{claim.status} · {claim.id}</p>
                </div>
                {claim.status === "pending" ? (
                  <div className="grid gap-2 sm:grid-cols-2">
                    <Button type="button" size="sm" disabled={busy === claim.id} onClick={() => run(claim.id, () => decideRoleplayClaim(tavern.id, claim.id, { status: "approved" }, ownerId), "Claim approved.")}>
                      <CheckCircle2 className="h-4 w-4" />
                      Approve
                    </Button>
                    <Button type="button" size="sm" variant="secondary" disabled={busy === claim.id} onClick={() => run(claim.id, () => decideRoleplayClaim(tavern.id, claim.id, { status: "rejected" }, ownerId), "Claim rejected.")}>
                      <XCircle className="h-4 w-4" />
                      Reject
                    </Button>
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        ) : (
          <p className="rounded-2xl border border-white/10 bg-white/[0.04] p-3 text-sm text-violet-100/62">No roleplay claims yet.</p>
        )}

        {message ? <p className="rounded-2xl border border-cyan-300/20 bg-cyan-300/10 p-3 text-sm text-cyan-50">{message}</p> : null}
      </CardContent>
    </Card>
  )
}

function OwnerVisitorNotesPanel({ tavern }: { tavern: Tavern }) {
  const [ownerId, setOwnerId] = useState(tavern.owner_id || DEFAULT_OWNER_ID)
  const [notes, setNotes] = useState<TavernVisitorNote[]>([])
  const [count, setCount] = useState(0)
  const [busy, setBusy] = useState("")
  const [message, setMessage] = useState("")

  async function handleLoadOwnerNotes() {
    setBusy("list")
    setMessage("")
    try {
      const payload = await listVisitorNotes(tavern.id, { limit: 20 }, ownerId)
      setNotes(payload.notes || [])
      setCount(payload.count || 0)
      setMessage("已加载店主可见反馈。")
    } catch (error) {
      setMessage(errorMessage(error))
    } finally {
      setBusy("")
    }
  }

  async function handleDeleteNote(noteId: string) {
    setBusy(noteId)
    setMessage("")
    try {
      await deleteVisitorNote(tavern.id, noteId, ownerId)
      setNotes((current) => current.filter((note) => note.id !== noteId))
      setCount((current) => Math.max(0, current - 1))
      setMessage("反馈已删除。")
    } catch (error) {
      setMessage(errorMessage(error))
    } finally {
      setBusy("")
    }
  }

  return (
    <Card className="mt-6 min-w-0 overflow-hidden border-violet-300/18 bg-violet-300/8">
      <CardHeader>
        <CardTitle>访客反馈管理</CardTitle>
        <CardDescription className="mt-2">
          只汇总 owner-visible notes，帮助店主复盘体验；这不是公开留言墙，也不支持访客互相回复、点赞或私信。
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_auto]">
          <label className="space-y-1.5 text-sm">
            <span className="text-violet-100/65">Owner ID</span>
            <input value={ownerId} onChange={(event) => setOwnerId(event.target.value)} className="w-full rounded-2xl border border-white/12 bg-white/[0.06] px-4 py-3 text-white outline-none focus:border-cyan-300/60" />
          </label>
          <Button type="button" variant="secondary" disabled={busy === "list"} className="self-end" onClick={handleLoadOwnerNotes}>
            加载店主反馈 ({count})
          </Button>
        </div>

        <div className="space-y-3">
          {notes.length ? notes.map((note) => (
            <div key={note.id} className="rounded-2xl border border-white/10 bg-slate-950/45 p-3">
              <p className="text-sm leading-6 text-violet-50/78">{note.content}</p>
              <p className="mt-2 text-xs text-violet-100/45">{note.visitor_nickname} · {note.created_at}</p>
              <Button type="button" size="sm" variant="secondary" className="mt-3" disabled={busy === note.id} onClick={() => handleDeleteNote(note.id)}>
                删除反馈
              </Button>
            </div>
          )) : (
            <p className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-sm leading-6 text-violet-100/62">
              暂无已加载反馈。点击加载后，仅店主可见的回访反馈会显示在这里。
            </p>
          )}
        </div>

        {message ? <p className="rounded-2xl border border-cyan-300/20 bg-cyan-300/10 p-3 text-sm text-cyan-50">{message}</p> : null}
      </CardContent>
    </Card>
  )
}

function PlaceHomePanel({ tavern }: { tavern: Tavern }) {
  const [ownerId, setOwnerId] = useState(tavern.owner_id || DEFAULT_OWNER_ID)
  const [memberName, setMemberName] = useState("")
  const [memberType, setMemberType] = useState("silent_member")
  const [memberDescription, setMemberDescription] = useState("")
  const [members, setMembers] = useState<HomeMember[]>(tavern.home_members || [])
  const [selectedMemberId, setSelectedMemberId] = useState((tavern.home_members || [])[0]?.id || "")
  const [targetTavernId, setTargetTavernId] = useState("")
  const [relationType, setRelationType] = useState("school_enrollment")
  const [pendingRelationships, setPendingRelationships] = useState<PlaceRelationship[]>(tavern.pending_place_relationships || tavern.pending_school_enrollments || [])
  const [schoolMembers, setSchoolMembers] = useState(tavern.school_members || [])
  const [busy, setBusy] = useState("")
  const [message, setMessage] = useState("")
  const isHome = tavern.place_type === "home"
  const isSchool = tavern.place_type === "school"
  const hasTargetRelationships = Boolean((tavern.target_place_relationships || tavern.pending_place_relationships || []).length)

  async function handleAddMember() {
    setBusy("member")
    setMessage("")
    try {
      const payload = await addHomeMember(
        tavern.id,
        { name: memberName, display_name: memberName, member_type: memberType, description: memberDescription },
        ownerId,
      )
      setMembers(payload.members || [])
      setSelectedMemberId(payload.member?.id || selectedMemberId)
      setMemberName("")
      setMemberDescription("")
      setMessage("家庭成员已保存；非对话成员会保持沉默。")
    } catch (error) {
      setMessage(errorMessage(error))
    } finally {
      setBusy("")
    }
  }

  async function handleCreateRelationship() {
    setBusy("enroll")
    setMessage("")
    try {
      const draft = normalizePlaceRelationshipDraft({
        member_id: selectedMemberId,
        target_tavern_id: targetTavernId,
        relation_type: relationType,
      })
      const payload = relationType === "school_enrollment" ? await createSchoolEnrollment(
        tavern.id,
        { member_id: selectedMemberId, school_tavern_id: draft.target_tavern_id },
        ownerId,
      ) : await createPlaceRelationship(
        tavern.id,
        draft,
        ownerId,
      )
      setMessage(payload.relationship.status === "approved" ? "同主人地点关系已同步。" : "已提交目标地点审批，批准前不会公开展示。")
      setTargetTavernId("")
    } catch (error) {
      setMessage(errorMessage(error))
    } finally {
      setBusy("")
    }
  }

  async function handleDecision(relationship: PlaceRelationship, status: "approved" | "rejected") {
    setBusy(relationship.id)
    setMessage("")
    try {
      const payload = await decidePlaceRelationship(tavern.id, relationship.id, { status }, ownerId)
      setPendingRelationships((current) => current.filter((item) => item.id !== relationship.id))
      if (payload.relationship.status === "approved" && payload.relationship.relation_type === "school_enrollment") {
        setSchoolMembers((current) => [
          ...current,
          {
            relationship_id: payload.relationship.id,
            home_tavern_id: payload.relationship.source_tavern_id,
            member_id: payload.relationship.source_member_id,
            display_name: payload.relationship.display_name || payload.relationship.source_member_id,
            member_type: "silent_member",
          },
        ])
      }
      setMessage(status === "approved" ? "已批准入学关系。" : "已拒绝入学关系。")
    } catch (error) {
      setMessage(errorMessage(error))
    } finally {
      setBusy("")
    }
  }

  if (!isHome && !isSchool && !hasTargetRelationships) return null

  return (
    <Card className="mt-6 min-w-0 overflow-hidden border-cyan-300/18 bg-cyan-300/8">
      <CardHeader>
        <CardTitle>{isHome ? "Home 成员与地点关系" : isSchool ? "学校成员审批" : "地点关系审批"}</CardTitle>
        <CardDescription className="mt-2">
          {isHome
            ? "Home 是受控真实坐标空间。家庭成员默认不对话；学生-学校只是关系类型之一，送往其他地点也会先生成审批关系。"
            : isSchool
              ? "学校只展示已批准的成员摘要；跨主人入学必须由学校主人批准。"
              : "目标地点只处理 owner 可见的待审批关系；这不是好友、私信或公开社交图谱。"}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <label className="space-y-1.5 text-sm">
          <span className="text-violet-100/65">Owner ID</span>
          <input value={ownerId} onChange={(event) => setOwnerId(event.target.value)} className="w-full rounded-2xl border border-white/12 bg-white/[0.06] px-4 py-3 text-white outline-none focus:border-cyan-300/60" />
        </label>

        {isHome ? (
          <>
            <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_auto]">
              <label className="space-y-1.5 text-sm">
                <span className="text-violet-100/65">成员名称</span>
                <input value={memberName} onChange={(event) => setMemberName(event.target.value)} placeholder="小石头 / 孩子 / 宠物 / 纪念物" className="w-full rounded-2xl border border-white/12 bg-white/[0.06] px-4 py-3 text-white outline-none focus:border-cyan-300/60" />
              </label>
              <label className="space-y-1.5 text-sm">
                <span className="text-violet-100/65">成员类型</span>
                <select value={memberType} onChange={(event) => setMemberType(event.target.value)} className="w-full rounded-2xl border border-white/12 bg-slate-950 px-4 py-3 text-white outline-none focus:border-cyan-300/60">
                  <option value="silent_member">silent_member</option>
                  <option value="display_object">display_object</option>
                  <option value="conversational_character">conversational_character</option>
                </select>
              </label>
              <label className="space-y-1.5 text-sm md:col-span-2">
                <span className="text-violet-100/65">描述</span>
                <input value={memberDescription} onChange={(event) => setMemberDescription(event.target.value)} placeholder="主人确认的展示描述，不自动生成人格。" className="w-full rounded-2xl border border-white/12 bg-white/[0.06] px-4 py-3 text-white outline-none focus:border-cyan-300/60" />
              </label>
              <Button type="button" disabled={!memberName.trim() || busy === "member"} className="md:col-span-2" onClick={handleAddMember}>
                添加 Home 成员
              </Button>
            </div>

            <div className="grid gap-2">
              {members.length ? members.map((member) => (
                <div key={member.id} className="rounded-2xl border border-white/10 bg-white/[0.04] p-3 text-sm text-violet-50/72">
                  <span className="font-bold text-white">{member.display_name || member.name}</span>
                  <span className="ml-2 text-xs text-violet-100/50">{member.member_type} · {member.speech_mode}</span>
                </div>
              )) : (
                <p className="rounded-2xl border border-white/10 bg-white/[0.04] p-3 text-sm text-violet-100/62">还没有 Home 成员。</p>
              )}
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <label className="space-y-1.5 text-sm">
                <span className="text-violet-100/65">送去学校的成员</span>
                <select value={selectedMemberId} onChange={(event) => setSelectedMemberId(event.target.value)} className="w-full rounded-2xl border border-white/12 bg-slate-950 px-4 py-3 text-white outline-none focus:border-cyan-300/60">
                  {members.map((member) => (
                    <option key={member.id} value={member.id}>{member.display_name || member.name}</option>
                  ))}
                </select>
              </label>
              <label className="space-y-1.5 text-sm">
                <span className="text-violet-100/65">关系类型</span>
                <select value={relationType} onChange={(event) => setRelationType(event.target.value)} className="w-full rounded-2xl border border-white/12 bg-slate-950 px-4 py-3 text-white outline-none focus:border-cyan-300/60">
                  {PLACE_RELATIONSHIP_TYPES.map((type) => (
                    <option key={type.id} value={type.id}>{type.label}</option>
                  ))}
                </select>
              </label>
              <label className="space-y-1.5 text-sm md:col-span-2">
                <span className="text-violet-100/65">目标地点 Tavern ID</span>
                <input value={targetTavernId} onChange={(event) => setTargetTavernId(event.target.value)} placeholder="tavern_xxx" className="w-full rounded-2xl border border-white/12 bg-white/[0.06] px-4 py-3 text-white outline-none focus:border-cyan-300/60" />
              </label>
              <Button type="button" disabled={!selectedMemberId || !targetTavernId.trim() || busy === "enroll"} className="md:col-span-2" onClick={handleCreateRelationship}>
                创建地点关系
              </Button>
            </div>
          </>
        ) : null}

        {isSchool || hasTargetRelationships ? (
          <>
            <div className="grid gap-2">
              <p className="text-sm font-black text-white">已批准成员 ({schoolMembers.length})</p>
              {schoolMembers.length ? schoolMembers.map((member) => (
                <div key={member.relationship_id} className="rounded-2xl border border-white/10 bg-white/[0.04] p-3 text-sm text-violet-50/72">
                  <span className="font-bold text-white">{member.display_name}</span>
                  <span className="ml-2 text-xs text-violet-100/50">{member.member_type}</span>
                </div>
              )) : <p className="text-sm text-violet-100/55">暂无已批准成员。</p>}
            </div>
            <div className="grid gap-2">
              <p className="text-sm font-black text-white">待审批 ({pendingRelationships.length})</p>
              {pendingRelationships.map((relationship) => (
                <div key={relationship.id} className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-white/[0.04] p-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="font-bold text-white">{relationship.display_name || relationship.source_member_id}</p>
                    <p className="text-xs text-violet-100/50">{relationship.relation_type} · {relationship.source_tavern_id} → {relationship.target_tavern_id}</p>
                  </div>
                  <div className="flex gap-2">
                    <Button type="button" size="sm" disabled={busy === relationship.id} onClick={() => handleDecision(relationship, "approved")}>批准</Button>
                    <Button type="button" size="sm" variant="secondary" disabled={busy === relationship.id} onClick={() => handleDecision(relationship, "rejected")}>拒绝</Button>
                  </div>
                </div>
              ))}
            </div>
          </>
        ) : null}

        {message ? <p className="rounded-2xl border border-cyan-300/20 bg-cyan-300/10 p-3 text-sm text-cyan-50">{message}</p> : null}
      </CardContent>
    </Card>
  )
}

export function TavernOwnerManagement({
  tavern,
  roleplay,
}: {
  tavern: Tavern
  roleplay: RoleplayState | null
}) {
  const characters = Array.isArray(tavern.characters) ? tavern.characters : []
  const [roleplayState, setRoleplayState] = useState<RoleplayState | null>(roleplay)
  const effectiveRoleplay = roleplayState || fallbackRoleplayState(tavern, characters)

  return (
    <div data-owner-only-panel data-tavern-owner-management-panels className="space-y-5">
      <Card className="min-w-0 overflow-hidden border-cyan-300/18 bg-[radial-gradient(circle_at_top_left,rgba(34,211,238,0.14),transparent_34%),rgba(15,23,42,0.74)]">
        <CardHeader>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.22em] text-cyan-100/62">Dedicated owner mode</p>
              <CardTitle>只处理管理，不默认聊天</CardTitle>
              <CardDescription className="mt-2">
                这里是本酒馆 owner-only 的治理台。访客聊天、密码入场和 NPC 对话保留在独立访客视角。
              </CardDescription>
            </div>
            <span className="inline-flex w-fit items-center gap-2 rounded-full border border-cyan-300/24 bg-cyan-300/10 px-3 py-1 text-xs font-black text-cyan-100">
              <UserCheck className="h-3.5 w-3.5" />
              {tavern.owner_id || "owner"}
            </span>
          </div>
        </CardHeader>
      </Card>

      <RoleplayPanel
        tavern={tavern}
        characters={characters}
        roleplay={effectiveRoleplay}
        onRoleplayChange={setRoleplayState}
      />
      <PlaceHomePanel tavern={tavern} />
      <OwnerVisitorNotesPanel tavern={tavern} />
    </div>
  )
}
