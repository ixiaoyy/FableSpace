/**
 * Visitor Note Submit — 访客反馈提交组件
 *
 * 访客可以在空间留下简短反馈给店主。
 * 反馈内容仅店主可见，不做公开显示。
 */

import { useState } from "react"
import { MessageSquare, Send, Check } from "lucide-react"
import { createVisitorNote, type SpaceVisitorNote } from "../lib/spaces"

type VisitorNoteSubmitProps = {
  spaceId: string
  visitorId?: string
  onNoteCreated?: (note: SpaceVisitorNote) => void
  compact?: boolean
}

const MAX_CONTENT_LENGTH = 500

export function VisitorNoteSubmit({
  spaceId,
  visitorId,
  onNoteCreated,
  compact = false,
}: VisitorNoteSubmitProps) {
  const [nickname, setNickname] = useState("")
  const [content, setContent] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState("")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!content.trim()) {
      setError("请输入反馈内容")
      return
    }

    setSubmitting(true)
    setError("")

    try {
      const response = await createVisitorNote(
        spaceId,
        {
          content: content.trim(),
          visitor_nickname: nickname.trim() || "旅人",
        },
        visitorId,
      )

      if (response.ok && response.note) {
        setSubmitted(true)
        setContent("")
        setNickname("")
        onNoteCreated?.(response.note)
      } else {
        setError("提交失败，请稍后重试")
      }
    } catch (err) {
      setError("网络错误，请稍后重试")
    } finally {
      setSubmitting(false)
    }
  }

  // 已提交状态
  if (submitted) {
    return (
      <div className={`rounded-xl border border-cyan-300/20 bg-cyan-300/5 p-4 ${compact ? "py-3" : ""}`}>
        <div className="flex items-center gap-3">
          <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full border border-cyan-300/30 bg-cyan-300/10">
            <Check className="h-4 w-4 text-cyan-300" />
          </div>
          <div>
            <p className="text-sm font-medium text-cyan-100">已发送给店主</p>
            <p className="text-xs text-violet-100/50">感谢你的反馈</p>
          </div>
          <button
            onClick={() => setSubmitted(false)}
            className="ml-auto text-xs text-violet-100/40 hover:text-violet-100/70"
          >
            再留一条
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className={`rounded-xl border border-white/10 bg-white/[0.02] ${compact ? "p-3" : "p-4"}`}>
      <div className="flex items-center gap-2 mb-3">
        <MessageSquare className="h-4 w-4 text-cyan-300/70" />
        <span className="text-sm text-violet-100/70">给店主留一句反馈</span>
      </div>

      <form onSubmit={handleSubmit} className="space-y-3">
        <input
          type="text"
          value={nickname}
          onChange={(e) => setNickname(e.target.value)}
          placeholder="你的昵称（可选）"
          maxLength={50}
          className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-white/30 focus:border-cyan-300/50 focus:outline-none focus:ring-1 focus:ring-cyan-300/30"
        />

        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value.slice(0, MAX_CONTENT_LENGTH))}
          placeholder="分享你的体验、建议或想法..."
          rows={compact ? 2 : 3}
          className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-white/30 focus:border-cyan-300/50 focus:outline-none focus:ring-1 focus:ring-cyan-300/30 resize-none"
        />

        <div className="flex items-center justify-between">
          <span className="text-xs text-violet-100/40">
            {content.length}/{MAX_CONTENT_LENGTH}
          </span>

          {error && <span className="text-xs text-red-400">{error}</span>}

          <button
            type="submit"
            disabled={submitting || !content.trim()}
            className="flex items-center gap-2 rounded-lg bg-cyan-300/20 px-4 py-2 text-sm font-medium text-cyan-100 transition-colors hover:bg-cyan-300/30 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Send className="h-3.5 w-3.5" />
            {submitting ? "发送中..." : "发送"}
          </button>
        </div>
      </form>

      <p className="mt-2 text-xs text-violet-100/30">
        反馈仅店主可见，不会公开显示
      </p>
    </div>
  )
}
