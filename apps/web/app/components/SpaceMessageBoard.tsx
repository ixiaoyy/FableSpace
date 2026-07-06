import { useState, useEffect } from "react"
import { MessageSquare, Pin, Trash2, Reply, Send, X } from "lucide-react"
import {
  type SpaceMessage,
  type SpaceMessageListResponse,
  listSpaceMessages,
  createSpaceMessage,
  deleteSpaceMessage,
  togglePinSpaceMessage,
  replySpaceMessage,
} from "../lib/spaces"

type SpaceMessageBoardProps = {
  spaceId: string
  ownerId?: string
  visitorId?: string
  isOwner?: boolean
  compact?: boolean
}

const MAX_CONTENT_LENGTH = 500
const PAGE_SIZE = 20

function formatTime(dateStr: string) {
  if (!dateStr) return ""
  const date = new Date(dateStr.replace("Z", "+00:00"))
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMins / 60)
  const diffDays = Math.floor(diffHours / 24)

  if (diffMins < 1) return "刚刚"
  if (diffMins < 60) return `${diffMins} 分钟前`
  if (diffHours < 24) return `${diffHours} 小时前`
  if (diffDays < 7) return `${diffDays} 天前`
  return date.toLocaleDateString("zh-CN", { month: "2-digit", day: "2-digit" })
}

function MessageItem({
  message,
  replies,
  isOwner,
  ownerId,
  onDelete,
  onPin,
  onReply,
}: {
  message: SpaceMessage
  replies: SpaceMessage[]
  isOwner: boolean
  ownerId?: string
  onDelete: (id: string) => void
  onPin: (id: string) => void
  onReply: (id: string) => void
}) {
  return (
    <div className={`group rounded-xl border bg-white/[0.045] p-4 ${message.is_pinned ? "border-fuchsia-300/40 bg-fuchsia-300/5" : "border-white/10"}`}>
      <div className="flex items-start gap-3">
        <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-cyan-300/20 bg-cyan-300/10">
          <MessageSquare className="h-4 w-4 text-cyan-100" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-bold text-white">{message.visitor_nickname}</span>
            <span className="text-xs text-violet-100/50">{formatTime(message.created_at)}</span>
            {message.is_pinned && (
              <span className="flex items-center gap-1 rounded-full border border-fuchsia-300/30 bg-fuchsia-300/10 px-2 py-0.5 text-xs text-fuchsia-100">
                <Pin className="h-3 w-3" />
                置顶
              </span>
            )}
          </div>
          <p className="mt-2 text-sm leading-6 text-violet-100/80">{message.content}</p>

          {/* Replies */}
          {replies.length > 0 && (
            <div className="mt-3 space-y-2 rounded-lg border-l-2 border-cyan-300/20 bg-cyan-300/5 p-3">
              {replies.map((reply) => (
                <div key={reply.id} className="text-sm">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium text-cyan-100">{reply.visitor_nickname}</span>
                    <span className="text-xs text-violet-100/40">{formatTime(reply.created_at)}</span>
                  </div>
                  <p className="mt-1 text-violet-100/70">{reply.content}</p>
                </div>
              ))}
            </div>
          )}

          {/* Actions */}
          <div className="mt-3 flex items-center gap-2 opacity-0 transition-opacity group-hover:opacity-100">
            <button
              onClick={() => onReply(message.id)}
              className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs text-violet-100/60 transition-colors hover:bg-white/5 hover:text-cyan-100"
            >
              <Reply className="h-3 w-3" />
              回复
            </button>
            {isOwner && (
              <>
                <button
                  onClick={() => onPin(message.id)}
                  className={`flex items-center gap-1 rounded-lg px-2 py-1 text-xs transition-colors hover:bg-white/5 ${
                    message.is_pinned ? "text-fuchsia-100" : "text-violet-100/60 hover:text-fuchsia-100"
                  }`}
                >
                  <Pin className="h-3 w-3" />
                  {message.is_pinned ? "取消置顶" : "置顶"}
                </button>
                <button
                  onClick={() => onDelete(message.id)}
                  className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs text-violet-100/60 transition-colors hover:bg-red-500/10 hover:text-red-300"
                >
                  <Trash2 className="h-3 w-3" />
                  删除
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export function SpaceMessageBoard({ spaceId, ownerId, visitorId, isOwner = false, compact = false }: SpaceMessageBoardProps) {
  const [messages, setMessages] = useState<SpaceMessage[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [offset, setOffset] = useState(0)
  const [hasMore, setHasMore] = useState(false)
  const [total, setTotal] = useState(0)

  const [newMessage, setNewMessage] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [replyTo, setReplyTo] = useState<string | null>(null)
  const [replyContent, setReplyContent] = useState("")

  const currentUserId = visitorId || ""

  // Group messages by parent_id
  const topLevelMessages = messages.filter((m) => !m.parent_id)
  const repliesMap = messages
    .filter((m) => m.parent_id)
    .reduce((acc, m) => {
      const parentId = m.parent_id!
      if (!acc[parentId]) acc[parentId] = []
      acc[parentId].push(m)
      return acc
    }, {} as Record<string, SpaceMessage[]>)

  async function loadMessages(reset = false) {
    setLoading(true)
    setError("")
    try {
      const newOffset = reset ? 0 : offset
      const result: SpaceMessageListResponse = await listSpaceMessages(spaceId, {
        limit: PAGE_SIZE,
        offset: newOffset,
      })
      if (reset) {
        setMessages(result.messages)
      } else {
        setMessages((prev) => [...prev, ...result.messages])
      }
      setTotal(result.count)
      setHasMore(result.messages.length === PAGE_SIZE)
      setOffset(newOffset + PAGE_SIZE)
    } catch (err) {
      setError(err instanceof Error ? err.message : "加载留言失败")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadMessages(true)
  }, [spaceId])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!newMessage.trim() || newMessage.length > MAX_CONTENT_LENGTH) return

    setSubmitting(true)
    try {
      await createSpaceMessage(spaceId, { content: newMessage.trim() }, currentUserId)
      setNewMessage("")
      loadMessages(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : "发送留言失败")
    } finally {
      setSubmitting(false)
    }
  }

  async function handleDelete(messageId: string) {
    if (!confirm("确定要删除这条留言吗？")) return
    try {
      await deleteSpaceMessage(spaceId, messageId, currentUserId)
      setMessages((prev) => prev.filter((m) => m.id !== messageId))
      setTotal((prev) => prev - 1)
    } catch (err) {
      setError(err instanceof Error ? err.message : "删除失败")
    }
  }

  async function handlePin(messageId: string) {
    try {
      const updated = await togglePinSpaceMessage(spaceId, messageId, ownerId)
      setMessages((prev) =>
        prev.map((m) => (m.id === messageId ? { ...m, is_pinned: updated.is_pinned } : m)),
      )
    } catch (err) {
      setError(err instanceof Error ? err.message : "置顶失败")
    }
  }

  async function handleReply(parentId: string) {
    setReplyTo(parentId)
    setReplyContent("")
  }

  async function handleSubmitReply(e: React.FormEvent) {
    e.preventDefault()
    if (!replyContent.trim() || replyContent.length > MAX_CONTENT_LENGTH) return
    if (!replyTo) return

    setSubmitting(true)
    try {
      await replySpaceMessage(spaceId, replyTo, { content: replyContent.trim() }, currentUserId)
      setReplyTo(null)
      setReplyContent("")
      loadMessages(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : "发送回复失败")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className={`space-y-4 ${compact ? "" : "rounded-2xl border border-white/10 bg-white/[0.04] p-5"}`}>
      <div className="flex items-center justify-between">
        <h3 className="flex items-center gap-2 text-lg font-bold text-white">
          <MessageSquare className="h-5 w-5 text-cyan-100" />
          留言板
        </h3>
        <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-violet-100/60">
          {total} 条留言
        </span>
      </div>

      {/* Message Input */}
      <form onSubmit={handleSubmit} className="space-y-2">
        <textarea
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          placeholder="写点什么..."
          maxLength={MAX_CONTENT_LENGTH}
          rows={compact ? 2 : 3}
          className="w-full resize-none rounded-xl border border-white/12 bg-white/[0.06] px-4 py-3 text-sm text-white placeholder:text-violet-100/40 focus:border-cyan-300/60 focus:outline-none"
        />
        <div className="flex items-center justify-between">
          <span className={`text-xs ${newMessage.length > MAX_CONTENT_LENGTH * 0.9 ? "text-amber-300" : "text-violet-100/40"}`}>
            {newMessage.length}/{MAX_CONTENT_LENGTH}
          </span>
          <button
            type="submit"
            disabled={!newMessage.trim() || submitting || newMessage.length > MAX_CONTENT_LENGTH}
            className="flex items-center gap-2 rounded-xl bg-cyan-400/20 px-4 py-2 text-sm font-medium text-cyan-100 transition-colors hover:bg-cyan-400/30 disabled:opacity-50"
          >
            <Send className="h-4 w-4" />
            发送
          </button>
        </div>
      </form>

      {/* Error */}
      {error && (
        <div className="rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-300">
          {error}
        </div>
      )}

      {/* Message List */}
      <div className="space-y-3">
        {topLevelMessages.map((message) => (
          <div key={message.id}>
            <MessageItem
              message={message}
              replies={repliesMap[message.id] || []}
              isOwner={isOwner}
              ownerId={ownerId}
              onDelete={handleDelete}
              onPin={handlePin}
              onReply={handleReply}
            />

            {/* Reply Input */}
            {replyTo === message.id && (
              <form onSubmit={handleSubmitReply} className="ml-12 mt-2 space-y-2 rounded-xl border border-cyan-300/20 bg-cyan-300/5 p-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-cyan-100/70">回复 {message.visitor_nickname}</span>
                  <button type="button" onClick={() => setReplyTo(null)} className="text-violet-100/40 hover:text-violet-100">
                    <X className="h-4 w-4" />
                  </button>
                </div>
                <textarea
                  value={replyContent}
                  onChange={(e) => setReplyContent(e.target.value)}
                  placeholder="写下你的回复..."
                  maxLength={MAX_CONTENT_LENGTH}
                  rows={2}
                  className="w-full resize-none rounded-lg border border-white/10 bg-white/[0.06] px-3 py-2 text-sm text-white placeholder:text-violet-100/40 focus:border-cyan-300/60 focus:outline-none"
                />
                <div className="flex items-center justify-end gap-2">
                  <span className="text-xs text-violet-100/40">{replyContent.length}/{MAX_CONTENT_LENGTH}</span>
                  <button
                    type="submit"
                    disabled={!replyContent.trim() || submitting}
                    className="flex items-center gap-1 rounded-lg bg-cyan-400/20 px-3 py-1.5 text-xs font-medium text-cyan-100 transition-colors hover:bg-cyan-400/30 disabled:opacity-50"
                  >
                    <Send className="h-3 w-3" />
                    发送回复
                  </button>
                </div>
              </form>
            )}
          </div>
        ))}

        {topLevelMessages.length === 0 && !loading && (
          <div className="grid min-h-32 place-items-center rounded-xl border border-white/10 bg-white/[0.04] p-6 text-center text-sm text-violet-100/60">
            暂无留言，来做第一个留言者吧
          </div>
        )}

        {loading && (
          <div className="grid min-h-20 place-items-center text-sm text-violet-100/40">加载中...</div>
        )}

        {hasMore && !loading && (
          <button
            onClick={() => loadMessages(false)}
            className="w-full rounded-xl border border-white/10 bg-white/[0.04] py-3 text-sm text-violet-100/60 transition-colors hover:bg-white/[0.08]"
          >
            加载更多
          </button>
        )}
      </div>
    </div>
  )
}