/**
 * NPC 媒体草稿队列（owner 后台）
 *
 * MVP stub：从后端获取草稿列表（当前返回空），展示审批入口。
 * 后续任务实现 AI 草稿生成、owner 审批、资产入库流程。
 */

import { useEffect, useState } from "react"
import { Image, Clock, CheckCircle, XCircle } from "lucide-react"

type MediaDraft = {
  id: string
  character_id: string
  status: "pending" | "approved" | "rejected" | string
  draft_type: string
  prompt?: string
  asset_url?: string
  created_at: string
  note?: string
}

type NpcMediaDraftQueueProps = {
  tavernId: string
  characterId: string
  userId: string
}

export function NpcMediaDraftQueue({ tavernId, characterId, userId }: NpcMediaDraftQueueProps) {
  const [drafts, setDrafts] = useState<MediaDraft[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    if (!tavernId || !characterId) return
    setLoading(true)
    setError("")
    fetch(
      `/api/v1/taverns/${encodeURIComponent(tavernId)}/characters/${encodeURIComponent(characterId)}/media-drafts`,
      { headers: { "X-User-Id": userId } },
    )
      .then((r) => r.json())
      .then((data) => setDrafts(data?.drafts ?? []))
      .catch((err) => setError(String(err?.message ?? "加载失败")))
      .finally(() => setLoading(false))
  }, [tavernId, characterId, userId])

  return (
    <section aria-label="NPC 媒体草稿队列">
      <div className="mb-3 flex items-center gap-2">
        <Image className="h-4 w-4 text-violet-400" aria-hidden="true" />
        <h3 className="text-sm font-semibold text-white/80">媒体草稿队列</h3>
        <span className="rounded-full bg-violet-500/15 px-2 py-0.5 text-xs text-violet-300">
          Beta
        </span>
      </div>

      {loading && (
        <p className="text-xs text-white/40">加载中…</p>
      )}

      {error && (
        <p className="rounded-xl bg-rose-500/10 p-2.5 text-xs text-rose-300">{error}</p>
      )}

      {!loading && drafts.length === 0 && (
        <div className="rounded-2xl border border-dashed border-white/10 p-6 text-center">
          <Image className="mx-auto mb-2 h-8 w-8 text-white/15" aria-hidden="true" />
          <p className="text-sm text-white/30">暂无待审批的媒体草稿</p>
          <p className="mt-1 text-xs text-white/20">
            当 NPC 在对话中触发媒体生成请求时，草稿将在此处等待你审批。
          </p>
        </div>
      )}

      {drafts.length > 0 && (
        <ul className="space-y-3" aria-label="草稿列表">
          {drafts.map((draft) => (
            <li
              key={draft.id}
              className="rounded-2xl border border-white/6 bg-white/3 p-4"
            >
              <div className="mb-2 flex items-center justify-between">
                <span className="text-xs font-medium text-white/60">
                  {draft.draft_type}
                </span>
                <DraftStatusBadge status={draft.status} />
              </div>
              {draft.prompt && (
                <p className="mb-2 text-xs text-white/40 line-clamp-2">{draft.prompt}</p>
              )}
              {draft.asset_url && (
                <img
                  src={draft.asset_url}
                  alt="草稿预览"
                  className="mb-2 w-full rounded-xl object-cover"
                  style={{ maxHeight: 200 }}
                />
              )}
              <p className="text-[10px] text-white/25">
                <Clock className="inline h-2.5 w-2.5" aria-hidden="true" />{" "}
                {new Date(draft.created_at).toLocaleString("zh-CN")}
              </p>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

function DraftStatusBadge({ status }: { status: string }) {
  if (status === "approved") {
    return (
      <span className="flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] text-emerald-300">
        <CheckCircle className="h-2.5 w-2.5" aria-hidden="true" />
        已审批
      </span>
    )
  }
  if (status === "rejected") {
    return (
      <span className="flex items-center gap-1 rounded-full bg-rose-500/15 px-2 py-0.5 text-[10px] text-rose-300">
        <XCircle className="h-2.5 w-2.5" aria-hidden="true" />
        已拒绝
      </span>
    )
  }
  return (
    <span className="flex items-center gap-1 rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] text-amber-300">
      <Clock className="h-2.5 w-2.5" aria-hidden="true" />
      待审批
    </span>
  )
}
