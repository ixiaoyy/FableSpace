import { Heart, Loader2, Users } from "lucide-react"
import { useEffect, useState } from "react"

import { AffinityProgress } from "./AffinityProgress.js"
import { BondBadge } from "./BondBadge.js"
import { getPublicBondTypes, applyPublicBond, getVisitorBond, AFFINITY_TRIGGER_THRESHOLD, type PublicBondType } from "../lib/publicBond.js"
import { getAffinityStageMeta, normalizeAffinityStrength } from "../lib/affinity.js"
import { Button } from "../ui/button.js"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "../ui/dialog.js"
import { cn } from "../lib/utils.js"

type BondApplyModalProps = {
  spaceId: string
  characterId: string
  characterName: string
  visitorId: string
  visitorStrength?: number
  visitorGender?: string
  onSuccess?: () => void
  className?: string
  children?: React.ReactNode
}

type ApplyState = "idle" | "submitting" | "success" | "error"

export function BondApplyModal({
  spaceId,
  characterId,
  characterName,
  visitorId,
  visitorStrength = 0,
  visitorGender,
  onSuccess,
  className,
  children,
}: BondApplyModalProps) {
  const [open, setOpen] = useState(false)
  const [bondTypes, setBondTypes] = useState<PublicBondType[]>([])
  const [typesLoading, setTypesLoading] = useState(false)
  const [typesError, setTypesError] = useState("")
  const [selectedType, setSelectedType] = useState("")
  const [note, setNote] = useState("")
  const [state, setState] = useState<ApplyState>("idle")
  const [errorMsg, setErrorMsg] = useState("")
  const [resultMsg, setResultMsg] = useState("")

  const normStrength = normalizeAffinityStrength(visitorStrength)
  const canApply = normStrength >= AFFINITY_TRIGGER_THRESHOLD
  const stage = getAffinityStageMeta("", normStrength)

  // Load bond types when modal opens
  useEffect(() => {
    if (!open || bondTypes.length > 0) return
    setTypesLoading(true)
    setTypesError("")
    getPublicBondTypes()
      .then((res) => setBondTypes(res.types))
      .catch((e: unknown) => setTypesError(String(e)))
      .finally(() => setTypesLoading(false))
  }, [open, bondTypes.length])

  function reset() {
    setSelectedType("")
    setNote("")
    setState("idle")
    setErrorMsg("")
    setResultMsg("")
  }

  function handleOpenChange(next: boolean) {
    setOpen(next)
    if (!next) {
      reset()
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedType) return
    setState("submitting")
    setErrorMsg("")
    try {
      const result = await applyPublicBond(
        spaceId,
        characterId,
        {
          bond_type: selectedType,
          visitor_note: note.trim() || undefined,
          visitor_strength: visitorStrength,
          visitor_gender: visitorGender,
        },
        { userId: visitorId },
      )
      if (result.pending_bond) {
        setState("success")
        setResultMsg("申请已提交，等待空间审批。")
      } else if (result.active_bond) {
        setState("success")
        setResultMsg("结缘成功！")
      } else {
        setState("success")
        setResultMsg("申请已收到。")
      }
      onSuccess?.()
    } catch (e: unknown) {
      setState("error")
      setErrorMsg(String(e))
    }
  }

  const exclusiveTypes = bondTypes.filter((t) => t.is_exclusive)
  const multiTypes = bondTypes.filter((t) => !t.is_exclusive)

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {children ?? (
          <Button variant="secondary" size="sm" className={cn("gap-1.5", className)}>
            <Heart className="h-4 w-4" />
            申请结缘
          </Button>
        )}
      </DialogTrigger>

      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            与「{characterName}」结缘
          </DialogTitle>
          <DialogDescription>
            选择你们之间的关系类型，申请建立公开羁绊。
          </DialogDescription>
        </DialogHeader>

        {/* Affinity prerequisite */}
        <div className="rounded-xl border border-white/10 bg-white/5 p-4 space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-violet-100/75">当前好感度</span>
            <span className={cn("font-semibold", `text-${stage.tone}-300`)}>
              {stage.name_zh}（{Math.round(normStrength * 100)}%）
            </span>
          </div>
          <AffinityProgress strength={visitorStrength} compact />
          {!canApply && (
            <p className="text-xs text-amber-400/80">
              好感度达到「挚友」阶段（70%）后可申请结缘，继续与 NPC 互动提升好感吧。
            </p>
          )}
        </div>

        {state === "success" ? (
          <div className="space-y-4 py-4 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400">
              <Heart className="h-6 w-6" />
            </div>
            <p className="text-lg font-semibold text-white">{resultMsg}</p>
            <p className="text-sm text-violet-100/65">
              审批结果可在 NPC 资料页查看，请留意通知。
            </p>
            <Button variant="secondary" onClick={() => handleOpenChange(false)} className="mt-2">
              完成
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Bond type selector */}
            <fieldset disabled={!canApply || state === "submitting"} className="space-y-3">
              <legend className="text-sm font-medium text-violet-100/75">
                选择关系类型
              </legend>

              {typesLoading && (
                <div className="flex items-center gap-2 py-4 text-sm text-violet-100/50">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  加载中…
                </div>
              )}

              {typesError && (
                <p className="text-sm text-red-400">加载失败：{typesError}</p>
              )}

              {!typesLoading && !typesError && bondTypes.length === 0 && (
                <p className="text-sm text-violet-100/50">暂无可用关系类型。</p>
              )}

              {!typesLoading && !typesError && bondTypes.length > 0 && (
                <>
                  {/* Exclusive bonds */}
                  <BondTypeGroup
                    label="专属关系（1:1 排他）"
                    icon={<Heart className="h-3 w-3" />}
                    types={exclusiveTypes}
                    selected={selectedType}
                    onSelect={setSelectedType}
                    disabled={!canApply}
                  />

                  {/* Multi bonds */}
                  <BondTypeGroup
                    label="多元关系（可同时存在）"
                    icon={<Users className="h-3 w-3" />}
                    types={multiTypes}
                    selected={selectedType}
                    onSelect={setSelectedType}
                    disabled={!canApply}
                  />
                </>
              )}
            </fieldset>

            {/* Application note */}
            <div className="space-y-2">
              <label htmlFor="bond-note" className="text-sm font-medium text-violet-100/75">
                申请留言（可选）
              </label>
              <textarea
                id="bond-note"
                rows={3}
                maxLength={200}
                disabled={!canApply || state === "submitting"}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="写一段话，让店主更好地了解你们的羁绊..."
                className={cn(
                  "w-full rounded-xl border border-white/15 bg-white/8 px-4 py-3 text-sm text-white placeholder-white/30",
                  "focus:border-cyan-400/50 focus:outline-none focus:ring-1 focus:ring-cyan-400/30",
                  "disabled:cursor-not-allowed disabled:opacity-40",
                  "resize-none",
                )}
              />
              <p className="text-right text-xs text-white/30">{note.length}/200</p>
            </div>

            {/* Error */}
            {state === "error" && (
              <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-2 text-sm text-red-300">
                {errorMsg}
              </p>
            )}

            {/* Submit */}
            <div className="flex items-center justify-end gap-3 pt-1">
              <Button
                type="button"
                variant="ghost"
                onClick={() => handleOpenChange(false)}
                disabled={state === "submitting"}
              >
                取消
              </Button>
              <Button
                type="submit"
                disabled={!canApply || !selectedType || state === "submitting"}
                className="gap-2"
              >
                {state === "submitting" ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    提交申请…
                  </>
                ) : (
                  <>
                    <Heart className="h-4 w-4" />
                    提交申请
                  </>
                )}
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}

// ─── BondTypeGroup ─────────────────────────────────────────────────────────────

type BondTypeGroupProps = {
  label: string
  icon: React.ReactNode
  types: PublicBondType[]
  selected: string
  onSelect: (value: string) => void
  disabled: boolean
}

function BondTypeGroup({ label, icon, types, selected, onSelect, disabled }: BondTypeGroupProps) {
  if (types.length === 0) return null
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-1.5 text-xs text-violet-100/50">
        {icon}
        <span>{label}</span>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {types.map((t) => (
          <button
            key={t.value}
            type="button"
            disabled={disabled}
            onClick={() => onSelect(t.value)}
            className={cn(
              "flex flex-col items-start gap-1 rounded-xl border p-3 text-left transition",
              "hover:border-cyan-400/40 hover:bg-cyan-400/5",
              "focus:outline-none focus:ring-1 focus:ring-cyan-400/40",
              selected === t.value
                ? "border-cyan-400/60 bg-cyan-400/10"
                : "border-white/10 bg-white/5",
              disabled && "cursor-not-allowed opacity-40 hover:border-white/10 hover:bg-white/5",
            )}
          >
            <div className="flex w-full items-center justify-between">
              <BondBadge bondType={t.value} size="sm" />
              {selected === t.value && (
                <span className="h-2 w-2 rounded-full bg-cyan-400" />
              )}
            </div>
            <p className="text-xs leading-snug text-violet-100/60 line-clamp-2">
              {t.description_zh}
            </p>
          </button>
        ))}
      </div>
    </div>
  )
}
