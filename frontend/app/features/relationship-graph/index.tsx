import { GitBranch, Link2, RefreshCcw, ShieldAlert, Sparkles } from "lucide-react"
import { useEffect, useMemo, useState } from "react"

import {
  createRelationshipEdgeDraftSeed,
  isCrossOwnerRelationshipPerspective,
  normalizeRelationshipEdge,
  normalizeRelationshipEdgeDraft,
  normalizeRelationshipEdges,
  relationshipOptionLabel,
  RELATIONSHIP_BEHAVIOR_TYPES,
  RELATIONSHIP_EDGE_STATUSES,
  RELATIONSHIP_GOVERNANCE_MODES,
  RELATIONSHIP_NODE_TYPES,
  RELATIONSHIP_STRENGTH_PRESETS,
} from "../../lib/relationship-graph.js"
import {
  createRelationshipEdge,
  decideRelationshipEdge,
  DEFAULT_OWNER_ID,
  errorMessage,
  listRelationshipEdges,
  updateRelationshipEdge,
  type RelationshipEdge,
  type Space,
  type SpaceCharacter,
} from "../../lib/spaces"
import { Button } from "../../ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../ui/card"

function localCharacterName(characters: SpaceCharacter[], characterId: string) {
  return characters.find((character) => character.id === characterId)?.name || characterId
}

function edgeStatusTone(status: string) {
  switch (status) {
    case "confirmed":
      return "border-emerald-300/24 bg-emerald-300/10 text-emerald-50"
    case "pending":
      return "border-amber-300/24 bg-amber-300/10 text-amber-50"
    case "rejected":
      return "border-rose-300/24 bg-rose-300/10 text-rose-50"
    default:
      return "border-white/10 bg-white/[0.06] text-violet-50/74"
  }
}

function sortedEdges(edges: RelationshipEdge[]) {
  return [...edges].sort((left, right) => {
    const leftStamp = String(left.updated_at || left.created_at || "")
    const rightStamp = String(right.updated_at || right.created_at || "")
    if (leftStamp !== rightStamp) return rightStamp.localeCompare(leftStamp)
    return String(left.id || "").localeCompare(String(right.id || ""))
  })
}

function edgeNodeLabel(edge: RelationshipEdge, side: "source" | "target", characters: SpaceCharacter[]) {
  const nodeType = String(edge[`${side}_node_type` as const] || "space")
  const nodeId = String(edge[`${side}_node_id` as const] || "")
  const spaceId = String(edge[`${side}_space_id` as const] || "")
  if (nodeType === "character") {
    return `${relationshipOptionLabel(RELATIONSHIP_NODE_TYPES, nodeType, nodeType)} · ${localCharacterName(characters, nodeId)}`
  }
  return `${relationshipOptionLabel(RELATIONSHIP_NODE_TYPES, nodeType, nodeType)} · ${nodeId || spaceId || "未设置"}`
}

export function RelationshipGraphPanel({
  space,
  characters,
}: {
  space: Space
  characters: SpaceCharacter[]
}) {
  const [ownerId, setOwnerId] = useState(space.owner_id || DEFAULT_OWNER_ID)
  const [edges, setEdges] = useState<RelationshipEdge[]>([])
  const [draft, setDraft] = useState(() => createRelationshipEdgeDraftSeed(space, characters))
  const [editingEdgeId, setEditingEdgeId] = useState("")
  const [busy, setBusy] = useState("")
  const [message, setMessage] = useState("")

  const characterOptions = useMemo(
    () => characters.map((character) => ({ id: character.id, label: character.name || character.id })),
    [characters],
  )
  const pendingEdges = edges.filter((edge) => edge.status === "pending")

  function resetDraft() {
    setEditingEdgeId("")
    setDraft(createRelationshipEdgeDraftSeed(space, characters))
  }

  async function loadEdges(userId = ownerId) {
    setBusy("load")
    setMessage("")
    try {
      const payload = await listRelationshipEdges(space.id, userId)
      setEdges(
        sortedEdges(
          normalizeRelationshipEdges(payload.edges, {
            source_space_id: space.id,
            source_owner_id: space.owner_id,
          }),
        ),
      )
      setMessage(`已加载 ${payload.count || 0} 条关系边。`)
    } catch (error) {
      setMessage(errorMessage(error))
    } finally {
      setBusy("")
    }
  }

  useEffect(() => {
    if (!ownerId) return
    void loadEdges(ownerId)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [space.id])

  async function handleSave() {
    const normalized = normalizeRelationshipEdgeDraft(draft, {
      source_space_id: space.id,
      source_owner_id: space.owner_id,
      fallback_source_character_id: characterOptions[0]?.id || "",
    })
    if (!ownerId) {
      setMessage("需要 owner ID 才能保存关系。")
      return
    }
    if (!normalized.target_space_id) {
      setMessage("请填写目标 Space ID。")
      return
    }
    if (normalized.source_node_type === "character" && !normalized.source_node_id) {
      setMessage("角色 source-side 关系需要选择当前空间角色。")
      return
    }
    if (normalized.target_node_type === "character" && !normalized.target_node_id) {
      setMessage("target 角色关系需要填写目标角色 ID。")
      return
    }

    const payload = {
      source_space_id: space.id,
      source_node_type: normalized.source_node_type,
      source_node_id: normalized.source_node_id,
      target_space_id: normalized.target_space_id,
      target_node_type: normalized.target_node_type,
      target_node_id: normalized.target_node_id,
      behavior_type: normalized.behavior_type,
      display_name: normalized.display_name,
      description: normalized.description,
      strength_preset: normalized.strength_preset,
      status: normalized.status,
      governance_mode: normalized.governance_mode,
      confirmed_by_type: normalized.confirmed_by_type || "owner",
      metadata: normalized.metadata,
    }

    setBusy("save")
    setMessage("")
    try {
      const response = editingEdgeId
        ? await updateRelationshipEdge(space.id, editingEdgeId, payload, ownerId)
        : await createRelationshipEdge(space.id, payload, ownerId)
      const saved = normalizeRelationshipEdge(response.edge, {
        source_space_id: space.id,
        source_owner_id: space.owner_id,
      })
      setEdges((current) =>
        sortedEdges([
          saved,
          ...current.filter((edge) => edge.id !== saved.id),
        ]),
      )
      setEditingEdgeId(saved.id)
      setDraft(
        normalizeRelationshipEdgeDraft(saved, {
          source_space_id: space.id,
          fallback_source_character_id: characterOptions[0]?.id || "",
        }),
      )
      setMessage(editingEdgeId ? "关系边已更新。" : "关系边已创建。")
    } catch (error) {
      setMessage(errorMessage(error))
    } finally {
      setBusy("")
    }
  }

  async function handleDecision(edge: RelationshipEdge, status: "confirmed" | "rejected") {
    if (!ownerId) {
      setMessage("需要 owner ID 才能提交审批。")
      return
    }
    setBusy(edge.id)
    setMessage("")
    try {
      const response = await decideRelationshipEdge(
        space.id,
        edge.id,
        { status, confirmed_by_type: "owner" },
        ownerId,
      )
      const saved = normalizeRelationshipEdge(response.edge, {
        source_space_id: space.id,
        source_owner_id: space.owner_id,
      })
      setEdges((current) => sortedEdges(current.map((item) => (item.id === saved.id ? saved : item))))
      setMessage(status === "confirmed" ? "待确认关系已批准。" : "待确认关系已拒绝。")
    } catch (error) {
      setMessage(errorMessage(error))
    } finally {
      setBusy("")
    }
  }

  function startEdit(edge: RelationshipEdge) {
    setEditingEdgeId(edge.id)
    setDraft(
      normalizeRelationshipEdgeDraft(edge, {
        source_space_id: space.id,
        fallback_source_character_id: characterOptions[0]?.id || "",
      }),
    )
    setMessage(`正在编辑 ${edge.display_name || edge.id}`)
  }

  const perspectiveNotice = draft.target_space_id
    ? "跨 owner 目标在保存后仍只会被记录为当前空间 source-side 视角；不会自动变成目标空间的正史。"
    : "跨 owner 关系默认是单边视角，只代表当前空间 source-side 立场。"

  return (
    <Card className="min-w-0 overflow-hidden border-cyan-300/18 bg-[radial-gradient(circle_at_top_right,rgba(34,211,238,0.12),transparent_34%),linear-gradient(135deg,rgba(15,23,42,0.92),rgba(30,41,59,0.66))]">
      <CardHeader>
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <p className="text-xs font-black uppercase tracking-[0.22em] text-cyan-100/55">关系图谱</p>
            <CardTitle className="mt-1">关系图谱治理台</CardTitle>
            <CardDescription className="mt-2 max-w-3xl leading-6">
              这里用于维护本空间与角色之间的关系。涉及其他店主空间时，只作为本店主的备注，不会变成平台共同设定。
            </CardDescription>
          </div>
          <div className="flex flex-wrap gap-2">
            <span className="inline-flex items-center gap-2 rounded-full border border-cyan-300/24 bg-cyan-300/10 px-3 py-1 text-xs font-black text-cyan-100">
              <GitBranch className="h-3.5 w-3.5" />
              {edges.length} 条关系
            </span>
            <span className="inline-flex items-center gap-2 rounded-full border border-amber-300/24 bg-amber-300/10 px-3 py-1 text-xs font-black text-amber-100">
              <Sparkles className="h-3.5 w-3.5" />
              {pendingEdges.length} pending
            </span>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_auto]">
          <label className="space-y-1.5 text-sm">
            <span className="text-violet-100/65">店主标识</span>
            <input value={ownerId} onChange={(event) => setOwnerId(event.target.value)} className="w-full rounded-2xl border border-white/12 bg-white/[0.06] px-4 py-3 text-white outline-none focus:border-cyan-300/60" />
          </label>
          <Button type="button" variant="secondary" disabled={busy === "load"} className="self-end" onClick={() => loadEdges()}>
            <RefreshCcw className="h-4 w-4" />
            刷新关系边
          </Button>
        </div>

        <section className="space-y-3 rounded-3xl border border-white/10 bg-white/[0.04] p-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-sm font-black text-white">{editingEdgeId ? "编辑关系边" : "新建关系边"}</p>
              <p className="mt-1 text-xs leading-5 text-violet-100/58">
                Source-side 固定属于当前空间；角色边可选择本空间角色。目标 space / character 仍按后端 owner 边界校验。
              </p>
            </div>
            {editingEdgeId ? (
              <Button type="button" size="sm" variant="secondary" onClick={resetDraft}>
                新建另一条
              </Button>
            ) : null}
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <label className="space-y-1.5 text-sm">
              <span className="text-violet-100/65">Source 节点类型</span>
              <select
                value={draft.source_node_type}
                onChange={(event) =>
                  setDraft((current) =>
                    normalizeRelationshipEdgeDraft(
                      {
                        ...current,
                        source_node_type: event.target.value,
                        source_node_id: event.target.value === "space" ? space.id : characterOptions[0]?.id || "",
                      },
                      {
                        source_space_id: space.id,
                        fallback_source_character_id: characterOptions[0]?.id || "",
                      },
                    ),
                  )
                }
                className="w-full rounded-2xl border border-white/12 bg-slate-950 px-4 py-3 text-white outline-none focus:border-cyan-300/60"
              >
                {RELATIONSHIP_NODE_TYPES.map((type) => (
                  <option key={type.id} value={type.id}>{type.label}</option>
                ))}
              </select>
            </label>
            <label className="space-y-1.5 text-sm">
              <span className="text-violet-100/65">Source 节点</span>
              {draft.source_node_type === "character" ? (
                <select
                  value={draft.source_node_id}
                  onChange={(event) => setDraft((current) => ({ ...current, source_node_id: event.target.value }))}
                  className="w-full rounded-2xl border border-white/12 bg-slate-950 px-4 py-3 text-white outline-none focus:border-cyan-300/60"
                >
                  {characterOptions.length ? characterOptions.map((character) => (
                    <option key={character.id} value={character.id}>{character.label}</option>
                  )) : <option value="">当前空间暂无角色</option>}
                </select>
              ) : (
                <input value={space.id} readOnly className="w-full rounded-2xl border border-white/12 bg-white/[0.04] px-4 py-3 text-violet-50/78 outline-none" />
              )}
            </label>
            <label className="space-y-1.5 text-sm">
              <span className="text-violet-100/65">目标 Space ID</span>
              <input
                value={draft.target_space_id}
                onChange={(event) =>
                  setDraft((current) =>
                    normalizeRelationshipEdgeDraft(
                      {
                        ...current,
                        target_space_id: event.target.value,
                        target_node_id: current.target_node_type === "space" ? event.target.value : current.target_node_id,
                      },
                      { source_space_id: space.id },
                    ),
                  )
                }
                placeholder="space_xxx"
                className="w-full rounded-2xl border border-white/12 bg-white/[0.06] px-4 py-3 text-white outline-none focus:border-cyan-300/60"
              />
            </label>
            <label className="space-y-1.5 text-sm">
              <span className="text-violet-100/65">目标节点类型</span>
              <select
                value={draft.target_node_type}
                onChange={(event) =>
                  setDraft((current) =>
                    normalizeRelationshipEdgeDraft(
                      {
                        ...current,
                        target_node_type: event.target.value,
                        target_node_id: event.target.value === "space" ? current.target_space_id : current.target_node_id,
                      },
                      { source_space_id: space.id },
                    ),
                  )
                }
                className="w-full rounded-2xl border border-white/12 bg-slate-950 px-4 py-3 text-white outline-none focus:border-cyan-300/60"
              >
                {RELATIONSHIP_NODE_TYPES.map((type) => (
                  <option key={type.id} value={type.id}>{type.label}</option>
                ))}
              </select>
            </label>
            <label className="space-y-1.5 text-sm md:col-span-2">
              <span className="text-violet-100/65">目标节点 ID</span>
              <input
                value={draft.target_node_id}
                onChange={(event) => setDraft((current) => ({ ...current, target_node_id: event.target.value }))}
                placeholder={draft.target_node_type === "character" ? "character_xxx" : "默认跟随目标 Space ID"}
                className="w-full rounded-2xl border border-white/12 bg-white/[0.06] px-4 py-3 text-white outline-none focus:border-cyan-300/60"
                readOnly={draft.target_node_type === "space"}
              />
            </label>
            <label className="space-y-1.5 text-sm">
              <span className="text-violet-100/65">关系类型</span>
              <select value={draft.behavior_type} onChange={(event) => setDraft((current) => ({ ...current, behavior_type: event.target.value }))} className="w-full rounded-2xl border border-white/12 bg-slate-950 px-4 py-3 text-white outline-none focus:border-cyan-300/60">
                {RELATIONSHIP_BEHAVIOR_TYPES.map((type) => (
                  <option key={type.id} value={type.id}>{type.label}</option>
                ))}
              </select>
            </label>
            <label className="space-y-1.5 text-sm">
              <span className="text-violet-100/65">强度预设</span>
              <select value={draft.strength_preset} onChange={(event) => setDraft((current) => ({ ...current, strength_preset: event.target.value }))} className="w-full rounded-2xl border border-white/12 bg-slate-950 px-4 py-3 text-white outline-none focus:border-cyan-300/60">
                {RELATIONSHIP_STRENGTH_PRESETS.map((type) => (
                  <option key={type.id} value={type.id}>{type.label}</option>
                ))}
              </select>
            </label>
            <label className="space-y-1.5 text-sm">
              <span className="text-violet-100/65">治理模式</span>
              <select value={draft.governance_mode} onChange={(event) => setDraft((current) => ({ ...current, governance_mode: event.target.value }))} className="w-full rounded-2xl border border-white/12 bg-slate-950 px-4 py-3 text-white outline-none focus:border-cyan-300/60">
                {RELATIONSHIP_GOVERNANCE_MODES.map((type) => (
                  <option key={type.id} value={type.id}>{type.label}</option>
                ))}
              </select>
            </label>
            <label className="space-y-1.5 text-sm">
              <span className="text-violet-100/65">状态</span>
              <select value={draft.status} onChange={(event) => setDraft((current) => ({ ...current, status: event.target.value }))} className="w-full rounded-2xl border border-white/12 bg-slate-950 px-4 py-3 text-white outline-none focus:border-cyan-300/60">
                {RELATIONSHIP_EDGE_STATUSES.map((type) => (
                  <option key={type.id} value={type.id}>{type.label}</option>
                ))}
              </select>
            </label>
            <label className="space-y-1.5 text-sm md:col-span-2">
              <span className="text-violet-100/65">展示名</span>
              <input value={draft.display_name} onChange={(event) => setDraft((current) => ({ ...current, display_name: event.target.value }))} placeholder="如：旧城同盟 / 对老厂区保持戒备" className="w-full rounded-2xl border border-white/12 bg-white/[0.06] px-4 py-3 text-white outline-none focus:border-cyan-300/60" />
            </label>
            <label className="space-y-1.5 text-sm md:col-span-2">
              <span className="text-violet-100/65">描述 / 备注</span>
              <textarea value={draft.description} onChange={(event) => setDraft((current) => ({ ...current, description: event.target.value }))} rows={3} placeholder="说明这条边为什么存在、只在什么上下文下成立。" className="w-full rounded-2xl border border-white/12 bg-white/[0.06] px-4 py-3 text-white outline-none focus:border-cyan-300/60" />
            </label>
          </div>

          <div className="rounded-2xl border border-amber-300/24 bg-amber-300/10 p-3 text-sm text-amber-50/88">
            <div className="flex items-start gap-2">
              <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
              <p>{perspectiveNotice}</p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button type="button" disabled={busy === "save"} onClick={handleSave}>
              <Link2 className="h-4 w-4" />
              {editingEdgeId ? "保存编辑" : "创建关系边"}
            </Button>
            <Button type="button" variant="secondary" onClick={resetDraft}>
              重置草稿
            </Button>
          </div>
        </section>

        <section className="space-y-3">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-black text-white">已登记关系边</p>
              <p className="mt-1 text-xs text-violet-100/58">待确认候选可直接批准 / 拒绝；visitor 视角不会暴露这些管理控件。</p>
            </div>
            <span className="text-xs font-bold text-violet-100/55">{edges.length ? `${edges.length} 条` : "暂无关系边"}</span>
          </div>

          {edges.length ? (
            <div className="grid gap-3">
              {edges.map((edge) => {
                const crossOwner = isCrossOwnerRelationshipPerspective(edge, space.owner_id || ownerId)
                return (
                  <div key={edge.id} className="rounded-3xl border border-white/10 bg-white/[0.04] p-4">
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                      <div className="min-w-0">
                        <div className="flex flex-wrap gap-2">
                          <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-black ${edgeStatusTone(String(edge.status || ""))}`}>
                            {relationshipOptionLabel(RELATIONSHIP_EDGE_STATUSES, String(edge.status || ""), String(edge.status || "unknown"))}
                          </span>
                          <span className="inline-flex rounded-full border border-white/10 bg-white/[0.06] px-2.5 py-1 text-xs font-bold text-violet-50/72">
                            {relationshipOptionLabel(RELATIONSHIP_BEHAVIOR_TYPES, String(edge.behavior_type || ""), String(edge.behavior_type || ""))}
                          </span>
                          <span className="inline-flex rounded-full border border-white/10 bg-white/[0.06] px-2.5 py-1 text-xs font-bold text-violet-50/72">
                            {relationshipOptionLabel(RELATIONSHIP_STRENGTH_PRESETS, String(edge.strength_preset || ""), String(edge.strength_preset || ""))}
                          </span>
                        </div>
                        <p className="mt-3 truncate text-sm font-black text-white" title={edge.display_name || edge.id}>
                          {edge.display_name || edge.id}
                        </p>
                        <p className="mt-1 text-xs leading-5 text-violet-100/55">
                          {edgeNodeLabel(edge, "source", characters)} → {edgeNodeLabel(edge, "target", characters)}
                        </p>
                        <p className="mt-2 text-xs leading-5 text-violet-100/62">
                          {crossOwner ? "单边 perspective：只代表当前空间 source-side 立场。" : "同 owner / 同治理域：可在本地视为更接近 canon 的关系配置。"}
                        </p>
                        {edge.description ? <p className="mt-2 text-sm leading-6 text-violet-50/74">{edge.description}</p> : null}
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {edge.status === "pending" ? (
                          <>
                            <Button type="button" size="sm" disabled={busy === edge.id} onClick={() => handleDecision(edge, "confirmed")}>
                              批准
                            </Button>
                            <Button type="button" size="sm" variant="secondary" disabled={busy === edge.id} onClick={() => handleDecision(edge, "rejected")}>
                              拒绝
                            </Button>
                          </>
                        ) : null}
                        <Button type="button" size="sm" variant="secondary" onClick={() => startEdit(edge)}>
                          编辑
                        </Button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <p className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-sm text-violet-100/62">
              还没有 source-side 关系边。先创建一条，表达本空间或本空间角色如何看待另一家空间 / 角色。
            </p>
          )}
        </section>

        {message ? <p className="rounded-2xl border border-cyan-300/20 bg-cyan-300/10 p-3 text-sm text-cyan-50">{message}</p> : null}
      </CardContent>
    </Card>
  )
}
