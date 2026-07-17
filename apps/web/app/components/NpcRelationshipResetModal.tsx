import { useState } from "react"
import { cn } from "../lib/utils"

type NpcRelationshipResetModalProps = {
  /** NPC 名字，用于弹窗文案 */
  npcName: string
  /** 是否有活跃的 public bond（决定是否显示额外警告） */
  hasActiveBond?: boolean
  /** 是否正在提交 */
  busy?: boolean
  /** 点击确认回调，传入可选的离开原因 */
  onConfirm: (reason: string) => void
  /** 点击取消或关闭回调 */
  onCancel: () => void
}

/**
 * 访客重置与 NPC 关系的二次确认弹窗。
 *
 * 明确说明操作影响：
 * - 好感清零 → 重回陌生人
 * - 私有记忆归档（对话历史只读，不删除）
 * - 若有 public bond，结缘状态同步结束
 */
export function NpcRelationshipResetModal({
  npcName,
  hasActiveBond = false,
  busy = false,
  onConfirm,
  onCancel,
}: NpcRelationshipResetModalProps) {
  const [reason, setReason] = useState("")

  function handleConfirm() {
    if (!busy) {
      onConfirm(reason.trim())
    }
  }

  function handleBackdropClick(event: React.MouseEvent<HTMLDivElement>) {
    if (event.target === event.currentTarget && !busy) {
      onCancel()
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm sm:items-center"
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby="reset-modal-title"
    >
      <div className="relative w-full max-w-sm rounded-t-3xl border border-[rgba(174,169,230,0.22)] bg-[#1b2144] p-6 shadow-[0_16px_48px_rgba(4,7,22,0.42)] sm:rounded-3xl">
        {/* 顶部拖拽指示（移动端） */}
        <div className="mx-auto mb-5 h-1 w-10 rounded-full bg-white/20 sm:hidden" aria-hidden="true" />

        {/* 标题区 */}
        <div className="mb-4 flex items-start gap-3">
          <span
            className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-[rgba(217,119,168,0.14)] text-xl"
            aria-hidden="true"
          >
            💔
          </span>
          <div>
            <h2 id="reset-modal-title" className="text-base font-semibold text-white">
              和 {npcName} 道别
            </h2>
            <p className="mt-0.5 text-xs text-white/50">此操作将重置你们的私密关系</p>
          </div>
        </div>

        {/* 影响说明 */}
        <ul className="mb-4 space-y-2 text-sm text-white/70">
          <li className="flex items-start gap-2">
            <span className="mt-0.5 text-[#d977a8]" aria-hidden="true">•</span>
            <span>好感归零，重回陌生人阶段</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="mt-0.5 text-amber-400" aria-hidden="true">•</span>
            <span>你的私密记忆将被归档（对话历史仍保留，仅对你隐藏）</span>
          </li>
          {hasActiveBond && (
            <li className="flex items-start gap-2">
              <span className="mt-0.5 text-[#d977a8]" aria-hidden="true">•</span>
              <span>你们之间的结缘关系将同步结束</span>
            </li>
          )}
          <li className="flex items-start gap-2">
            <span className="mt-0.5 text-white/30" aria-hidden="true">•</span>
            <span className="text-white/40">TA 的角色设定和空间内容不会受影响</span>
          </li>
        </ul>

        {/* 离开原因（可选） */}
        <label className="block text-xs text-white/50">
          <span className="mb-1.5 block">想对 {npcName} 说的话（可以不填）</span>
          <textarea
            id="reset-reason-input"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            maxLength={200}
            rows={2}
            placeholder="道一声再见……"
            disabled={busy}
            className={cn(
              "w-full resize-none rounded-2xl border border-white/10 bg-white/5 px-3.5 py-2.5 text-sm text-white/80 outline-none placeholder:text-white/20",
              "focus:border-[#d977a8]/50 focus:bg-white/8",
              "transition-colors duration-150",
              busy && "opacity-50 cursor-not-allowed",
            )}
          />
        </label>

        {/* 操作按钮 */}
        <div className="mt-4 flex gap-3">
          <button
            id="reset-modal-cancel"
            type="button"
            onClick={onCancel}
            disabled={busy}
            className={cn(
              "flex-1 rounded-2xl border border-white/10 bg-white/5 py-3 text-sm font-medium text-white/70",
              "hover:bg-white/10 active:bg-white/6 transition-colors",
              busy && "opacity-50 cursor-not-allowed",
            )}
          >
            再想想
          </button>
          <button
            id="reset-modal-confirm"
            type="button"
            onClick={handleConfirm}
            disabled={busy}
            className={cn(
              "flex-1 rounded-2xl bg-[#d977a8] py-3 text-sm font-semibold text-[#0d1226]",
              "hover:bg-[#e8a4c3] active:bg-[#c46596] transition-colors",
              "disabled:opacity-60 disabled:cursor-not-allowed",
            )}
          >
            {busy ? "正在处理…" : "确认道别"}
          </button>
        </div>
      </div>
    </div>
  )
}
