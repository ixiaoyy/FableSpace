import {
  ArrowLeft,
  ArrowRight,
  Check,
  ChevronDown,
  Compass,
  Eye,
  LockKeyhole,
  Search,
  ShieldCheck,
  Sparkles,
  UserRound,
  UsersRound,
} from "lucide-react"
import { useState } from "react"

import { mediaAssetUrl } from "../lib/media-assets"
import {
  VISITOR_PLAY_GENDERS,
  VISITOR_PLAY_IDENTITIES,
  type VisitorPlayGender,
  type VisitorPlayIdentity,
  type VisitorPlayIdentityId,
} from "../lib/visitor-play-identity"

type VisitorPlayIdentityOnboardingProps = {
  onConfirm: (identity: VisitorPlayIdentity) => void
}

type OnboardingStep = "identity" | "details"
type IdentityFilter = "all" | "fantasy" | "modern"
type IdentitySort = "default" | "name"

type IdentityPreview = {
  id: string
  label: string
  summary: string
  image: string
  category: Exclude<IdentityFilter, "all"> | "grounded"
  categoryLabel?: string
  playIdentityId?: VisitorPlayIdentityId
}

const BEGGAR_IDENTITY_ART = mediaAssetUrl("app/assets/identity-onboarding/v3/beggar.webp")

/**
 * Describe the reference-aligned identity catalog without widening the server-supported contract.
 * Entries without playIdentityId are preview-only and cannot be submitted.
 */
const IDENTITY_PREVIEWS: IdentityPreview[] = [
  {
    id: "beggar",
    label: "乞丐",
    summary: "身无长物，懂观察、开口和交换一点善意继续前行。",
    image: BEGGAR_IDENTITY_ART,
    category: "grounded",
    categoryLabel: "古代",
    playIdentityId: "beggar",
  },
  {
    id: "eunuch",
    label: "太监",
    summary: "在深宫之中，靠眼力、分寸和表情活下去。",
    image: mediaAssetUrl("app/assets/identity-onboarding/v3/eunuch.webp"),
    category: "grounded",
    categoryLabel: "古代",
  },
  {
    id: "palace-maid",
    label: "宫女",
    summary: "在深宫之中，靠细心、隐忍和运气生存。",
    image: mediaAssetUrl("app/assets/identity-onboarding/v3/palace-maid.png"),
    category: "grounded",
  },
  {
    id: "radish-spirit",
    label: "萝卜精",
    summary: "一颗成精的小萝卜，有点呆萌，爱吃爱睡。",
    image: mediaAssetUrl("app/assets/identity-onboarding/v3/radish-spirit.webp"),
    category: "fantasy",
    categoryLabel: "奇幻生物",
  },
  {
    id: "puppy",
    label: "小奶狗",
    summary: "一只奶里奶气的小狗，对世界充满好奇和依赖。",
    image: mediaAssetUrl("app/assets/identity-onboarding/v3/puppy.webp"),
    category: "fantasy",
    categoryLabel: "奇幻生物",
  },
  {
    id: "monster-hunter",
    label: "捉妖师",
    summary: "行走人间，斩妖除魔，守护世间平衡。",
    image: mediaAssetUrl("app/assets/identity-onboarding/v3/monster-hunter.png"),
    category: "fantasy",
    categoryLabel: "幻想",
  },
  {
    id: "underachiever",
    label: "学渣",
    summary: "学习全靠临时抱佛脚，日常摸鱼王者。",
    image: mediaAssetUrl("app/assets/identity-onboarding/v3/underachiever.png"),
    category: "modern",
    categoryLabel: "现代",
  },
  {
    id: "top-student",
    label: "学霸",
    summary: "天生自律，知识就是力量，目标是顶尖。",
    image: mediaAssetUrl("app/assets/identity-onboarding/v3/top-student.png"),
    category: "modern",
    categoryLabel: "现代",
  },
]

const IDENTITY_FILTERS: Array<{ id: IdentityFilter; label: string }> = [
  { id: "all", label: "全部" },
  { id: "fantasy", label: "幻想" },
  { id: "modern", label: "现代" },
]

const BEGGAR_STORY_EFFECTS = [
  {
    title: "更容易接触市井人物",
    description: "部分角色更愿意与你交谈，并向你求助。",
    icon: Eye,
  },
  {
    title: "需要主动寻找机会",
    description: "观察、交谈和选择会推动故事向前发展。",
    icon: Compass,
  },
  {
    title: "部分角色会低估你",
    description: "你需要用行动赢得他们的信任与尊重。",
    icon: UsersRound,
  },
  {
    title: "自由的开局",
    description: "没有额外身份承诺，你的选择更加灵活。",
    icon: Sparkles,
  },
]

/**
 * Render the required two-step choice for a visitor's fictional role and self-declared gender.
 * @param onConfirm Callback invoked after both explicit choices are complete.
 * @returns A responsive full-page onboarding surface; confirmation is its only external side effect.
 */
export function VisitorPlayIdentityOnboarding({ onConfirm }: VisitorPlayIdentityOnboardingProps) {
  const [step, setStep] = useState<OnboardingStep>("identity")
  const [playIdentityId, setPlayIdentityId] = useState<VisitorPlayIdentityId | "">("beggar")
  const [gender, setGender] = useState<VisitorPlayGender | "">("")
  const [identityQuery, setIdentityQuery] = useState("")
  const [identityFilter, setIdentityFilter] = useState<IdentityFilter>("all")
  const [identitySort, setIdentitySort] = useState<IdentitySort>("default")

  const selectedIdentity = VISITOR_PLAY_IDENTITIES.find((identity) => identity.id === playIdentityId) || null
  const selectedPreview = IDENTITY_PREVIEWS.find((identity) => identity.playIdentityId === playIdentityId) || null
  const activeStep: OnboardingStep = step === "details" && selectedIdentity ? "details" : "identity"
  const normalizedQuery = identityQuery.trim().toLocaleLowerCase()
  const filteredPreviews = IDENTITY_PREVIEWS.filter((identity) => {
    const matchesQuery = !normalizedQuery || `${identity.label} ${identity.summary} ${identity.categoryLabel || ""}`.toLocaleLowerCase().includes(normalizedQuery)
    const matchesFilter = identityFilter === "all" || identity.category === identityFilter
    return matchesQuery && matchesFilter
  })
  // Sort only the presentation catalog; server-owned identity priority remains unchanged.
  const visiblePreviews = identitySort === "name"
    ? [...filteredPreviews].sort((left, right) => left.label.localeCompare(right.label, "zh-CN"))
    : filteredPreviews
  const canAdvance = Boolean(selectedIdentity)
  const canContinue = canAdvance && (gender === "male" || gender === "female")

  /**
   * Confirm the two explicit selections without inventing defaults for the visitor's gender.
   * @returns Nothing. This handler invokes onConfirm only after a supported identity and gender are selected.
   */
  function handleConfirm() {
    if (!canContinue || !selectedIdentity || !gender) return
    onConfirm({ version: 1, playIdentityId: selectedIdentity.id, gender })
  }

  return (
    <main className="cinematic-entry relative flex min-h-[var(--dvh)] items-center overflow-hidden p-2.5 sm:p-5">
      <div aria-hidden="true" className="cinematic-entry__ambient pointer-events-none absolute inset-0" />

      <div className="identity-onboarding__frame relative mx-auto flex h-[calc(var(--dvh)-1.25rem)] min-h-[620px] max-h-[970px] w-full max-w-[1280px] flex-col overflow-hidden rounded-2xl border sm:h-[calc(var(--dvh)-2.5rem)]">
        <header className="absolute inset-x-0 top-0 z-30 flex min-h-16 items-center justify-between gap-4 px-5 sm:px-6">
          {activeStep === "identity" ? (
            <span className="flex items-center gap-2 text-lg font-black tracking-[-0.02em]">
              <Sparkles className="h-5 w-5 text-[var(--entry-lavender)]" aria-hidden="true" />
              FableSpace
            </span>
          ) : (
            <button
              type="button"
              onClick={() => setStep("identity")}
              className="inline-flex min-h-11 touch-manipulation items-center gap-2 rounded-xl bg-[var(--entry-surface)] px-3 text-sm font-black text-[var(--entry-muted)] outline-none backdrop-blur-md transition hover:text-[var(--entry-ink)] focus:ring-4 focus:ring-[var(--entry-focus)]"
            >
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
              返回选择
            </button>
          )}
          <span className="rounded-full border border-[var(--entry-border)] bg-[var(--entry-surface)] px-3 py-1.5 text-xs font-black text-[var(--entry-muted)] backdrop-blur-md">
            首次进入 · {activeStep === "identity" ? "1/2" : "2/2"}
          </span>
        </header>

        {activeStep === "identity" ? (
          <section className="flex min-h-0 flex-1 flex-col" aria-labelledby="identity-directory-title">
            <div className="relative min-h-0 flex-1 overscroll-contain overflow-y-auto">
              <div aria-hidden="true" className="absolute inset-x-0 top-0 h-[330px] overflow-hidden">
                <img src={mediaAssetUrl("app/assets/place-atmosphere-hd/atmosphere-market.webp")} alt="" className="identity-onboarding__hero-image h-full w-full object-cover object-center" />
                <div className="identity-onboarding__hero-overlay absolute inset-0" />
              </div>

              <div className="relative mx-auto max-w-[1120px] px-5 pb-6 pt-20 sm:px-8">
                <div className="max-w-2xl sm:ml-8">
                  <h1 id="identity-directory-title" className="max-w-[680px] text-4xl font-black leading-[1.22] tracking-[-0.04em] sm:text-[38px]">
                    同一个人，<br />会被每个角色<span className="text-[var(--entry-lavender-light)]">不同地看见。</span>
                  </h1>
                  <p className="mt-3 text-sm font-bold text-[var(--entry-muted)] sm:text-base">
                    选择一个身份进入世界，开启属于你的故事。
                  </p>
                </div>

                <label className="mt-6 flex min-h-11 w-full items-center gap-3 rounded-xl border border-[var(--entry-border)] bg-[var(--entry-surface)] px-4 text-[var(--entry-ink)] backdrop-blur-md focus-within:border-[var(--entry-lavender)] focus-within:ring-4 focus-within:ring-[var(--entry-focus)]">
                  <Search className="h-4 w-4 shrink-0 text-[var(--entry-quiet)]" aria-hidden="true" />
                  <span className="sr-only">搜索身份</span>
                  <input
                    type="search"
                    value={identityQuery}
                    onChange={(event) => setIdentityQuery(event.target.value)}
                    placeholder="搜索身份名称或关键词"
                    className="min-w-0 flex-1 bg-transparent text-sm font-bold text-[var(--entry-ink)] outline-none placeholder:text-[var(--entry-quiet)]"
                  />
                </label>

                <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex flex-wrap gap-2" aria-label="身份类型筛选">
                    {IDENTITY_FILTERS.map((filter) => {
                      const active = identityFilter === filter.id
                      return (
                        <button
                          key={filter.id}
                          type="button"
                          aria-pressed={active}
                          onClick={() => setIdentityFilter(filter.id)}
                          className={`min-h-9 touch-manipulation rounded-full px-4 text-xs font-black outline-none transition focus:ring-4 focus:ring-[var(--entry-focus)] ${active ? "bg-[var(--entry-primary)] text-[var(--entry-primary-ink)]" : "border border-transparent text-[var(--entry-muted)] hover:border-[var(--entry-border)] hover:text-[var(--entry-ink)]"}`}
                        >
                          {filter.label}
                        </button>
                      )
                    })}
                  </div>
                  <label className="relative inline-flex min-h-10 w-full items-center sm:w-40">
                    <span className="sr-only">身份排序</span>
                    <select
                      value={identitySort}
                      onChange={(event) => setIdentitySort(event.target.value as IdentitySort)}
                      className="h-10 w-full appearance-none rounded-xl border border-[var(--entry-border)] bg-[var(--entry-surface)] px-4 pr-10 text-xs font-black text-[var(--entry-muted)] outline-none focus:border-[var(--entry-lavender)] focus:ring-4 focus:ring-[var(--entry-focus)]"
                    >
                      <option value="default">默认排序</option>
                      <option value="name">按名称排序</option>
                    </select>
                    <ChevronDown className="pointer-events-none absolute right-3 h-4 w-4 text-[var(--entry-quiet)]" aria-hidden="true" />
                  </label>
                </div>

                <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-4" role="radiogroup" aria-label="游玩身份">
                  {visiblePreviews.length > 0 ? visiblePreviews.map((identity) => {
                    const selectable = Boolean(identity.playIdentityId)
                    const selected = Boolean(identity.playIdentityId && playIdentityId === identity.playIdentityId)
                    return (
                      <button
                        key={identity.id}
                        type="button"
                        role={selectable ? "radio" : undefined}
                        aria-checked={selectable ? selected : undefined}
                        aria-disabled={!selectable}
                        disabled={!selectable}
                        title={selectable ? undefined : `${identity.label}即将开放`}
                        onClick={() => identity.playIdentityId && setPlayIdentityId(identity.playIdentityId)}
                        className={`group relative h-56 touch-manipulation overflow-hidden rounded-xl border text-left outline-none transition focus:ring-4 focus:ring-[var(--entry-focus)] sm:h-[clamp(220px,30dvh,260px)] ${selected ? "border-[var(--entry-lavender)] ring-1 ring-[var(--entry-primary)]" : selectable ? "border-[var(--entry-border)] hover:border-[var(--entry-border-strong)]" : "cursor-not-allowed border-[var(--entry-border)] opacity-75"}`}
                      >
                        <img
                          src={identity.image}
                          alt=""
                          aria-hidden="true"
                          className={`absolute inset-0 h-full w-full object-cover object-center transition duration-300 ${selectable ? "group-hover:scale-[1.025]" : "opacity-45 saturate-[0.72]"}`}
                          loading="eager"
                          decoding="async"
                        />
                        <span aria-hidden="true" className="identity-onboarding__card-overlay absolute inset-0" />
                        {!selectable ? <span aria-hidden="true" className="absolute inset-0 bg-[var(--entry-canvas)]/50 backdrop-saturate-50" /> : null}
                        {selected ? (
                          <span className="absolute right-3 top-3 grid h-7 w-7 place-items-center rounded-full bg-[var(--entry-primary)] text-[var(--entry-primary-ink)]" aria-hidden="true">
                            <Check className="h-4 w-4" />
                          </span>
                        ) : !selectable ? (
                          <span className="absolute left-1/2 top-1/2 z-20 grid h-16 w-16 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border border-[var(--entry-border-strong)] bg-[var(--entry-surface)] text-[var(--entry-muted)] backdrop-blur-md" aria-label="即将开放">
                            <LockKeyhole className="h-7 w-7" aria-hidden="true" />
                          </span>
                        ) : null}
                        <span className="absolute inset-x-0 bottom-0 z-10 px-3 pb-3">
                          <span className="flex flex-wrap items-center gap-2">
                            <span className="text-lg font-black text-[var(--entry-ink)]">{identity.label}</span>
                            {identity.categoryLabel ? (
                              <span className="rounded-full border border-[var(--entry-border)] bg-[var(--entry-surface)] px-2 py-0.5 text-[10px] font-black text-[var(--entry-muted)]">
                                {identity.categoryLabel}
                              </span>
                            ) : null}
                          </span>
                          <span className="mt-1 block line-clamp-2 text-xs font-bold leading-5 text-[var(--entry-muted)]">
                            {identity.summary}
                          </span>
                        </span>
                      </button>
                    )
                  }) : (
                    <div className="col-span-full grid min-h-44 place-items-center rounded-xl border border-dashed border-[var(--entry-border)] px-6 text-center">
                      <p className="text-sm font-bold text-[var(--entry-quiet)]">没有找到匹配的身份。</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <footer className="identity-onboarding__footer grid shrink-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-3 border-t px-4 py-3 sm:flex sm:flex-row sm:gap-4 sm:px-8 sm:py-4">
              <p className="flex min-w-0 items-start gap-2 text-[11px] font-bold leading-4 text-[var(--entry-muted)] sm:flex-1 sm:items-center sm:text-xs sm:leading-5">
                <ShieldCheck className="h-4 w-4 shrink-0 text-[var(--entry-romance)]" aria-hidden="true" />
                身份与性别是私有游玩设定，不会公开展示，也不会改写任何 NPC 角色卡。
              </p>
              <p className="shrink-0 text-xs font-bold text-[var(--entry-muted)] sm:text-sm" aria-live="polite">
                已选择：<span className="font-black text-[var(--entry-ink)]">{selectedIdentity?.label || "尚未选择"}</span>
              </p>
              <button
                type="button"
                onClick={() => setStep("details")}
                disabled={!canAdvance}
                className="col-span-2 inline-flex min-h-12 w-full shrink-0 touch-manipulation items-center justify-center gap-2 rounded-xl bg-[var(--entry-primary)] px-7 font-black text-[var(--entry-primary-ink)] outline-none transition hover:bg-[var(--entry-primary-hover)] active:bg-[var(--entry-primary-active)] focus:ring-4 focus:ring-[var(--entry-focus)] disabled:cursor-not-allowed disabled:opacity-35 sm:col-auto sm:min-h-14 sm:w-auto"
              >
                下一步：确认身份
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </button>
            </footer>
          </section>
        ) : (
          <section className="grid min-h-0 flex-1 overflow-y-auto md:grid-cols-[0.82fr_1.18fr] md:overflow-hidden" aria-labelledby="identity-details-title">
            <div className="relative min-h-[430px] overflow-hidden md:min-h-0">
              <img
                src={selectedPreview?.image || BEGGAR_IDENTITY_ART}
                alt={`${selectedIdentity.label}身份主视觉`}
                className="identity-onboarding__detail-image absolute inset-0 h-full w-full object-cover object-[52%_44%]"
                loading="eager"
                decoding="async"
              />
              <div aria-hidden="true" className="identity-onboarding__detail-overlay absolute inset-0" />
            </div>

            <div className="identity-onboarding__detail-panel min-h-0 p-4 pt-20 sm:p-6 sm:pt-20 md:overflow-y-auto md:p-5 md:pt-[72px] lg:p-7 lg:pt-[72px]">
              <div className="rounded-2xl border border-[var(--entry-border)] bg-[var(--entry-surface-raised)] p-4 sm:p-5 md:px-5 md:pb-5 md:pt-7">
                <div className="px-1">
                  <h1 id="identity-details-title" className="text-3xl font-black tracking-[-0.035em] text-[var(--entry-ink)] sm:text-4xl">
                    {selectedIdentity.label}
                  </h1>
                  <p className="mt-2 text-xs font-bold leading-5 text-[var(--entry-muted)]">
                    {selectedPreview?.summary}
                  </p>
                </div>

                <section className="mt-4 rounded-xl border border-[var(--entry-border)] bg-[var(--entry-frame)] px-4 py-5" aria-labelledby="identity-story-effects-title">
                  <h2 id="identity-story-effects-title" className="text-sm font-black text-[var(--entry-ink)]">这个身份会如何影响故事</h2>
                  <ul className="mt-4 grid gap-5">
                    {BEGGAR_STORY_EFFECTS.map((effect) => {
                      const EffectIcon = effect.icon
                      return (
                        <li key={effect.title} className="flex gap-3">
                          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[var(--entry-lavender-soft)] text-[var(--entry-lavender)]">
                            <EffectIcon className="h-4 w-4" aria-hidden="true" />
                          </span>
                          <span className="min-w-0">
                            <span className="block text-sm font-black text-[var(--entry-ink)]">{effect.title}</span>
                            <span className="mt-0.5 block text-xs font-bold leading-5 text-[var(--entry-quiet)]">{effect.description}</span>
                          </span>
                        </li>
                      )
                    })}
                  </ul>
                </section>

                <fieldset className="mt-4 rounded-xl border border-[var(--entry-border)] bg-[var(--entry-frame)] p-4">
                  <legend className="sr-only">故事中的性别</legend>
                  <p aria-hidden="true" className="text-sm font-black text-[var(--entry-ink)]">故事中的性别</p>
                  <p className="mt-1 text-xs font-bold leading-5 text-[var(--entry-quiet)]">选择你希望在故事中使用的性别。平台不会自行推断。</p>
                  <div className="mt-4 grid grid-cols-2 gap-2" role="radiogroup" aria-label="故事中的性别">
                    {VISITOR_PLAY_GENDERS.map((option) => {
                      const selected = gender === option.id
                      return (
                        <button
                          key={option.id}
                          type="button"
                          role="radio"
                          aria-checked={selected}
                          onClick={() => setGender(option.id)}
                          className={`flex min-h-11 touch-manipulation items-center justify-center gap-2 rounded-lg border px-4 text-sm font-black outline-none transition focus:ring-4 focus:ring-[var(--entry-focus)] ${selected ? "border-[var(--entry-primary)] bg-[var(--entry-primary-soft)] text-[var(--entry-ink)]" : "border-[var(--entry-border)] bg-[var(--entry-surface)] text-[var(--entry-muted)] hover:border-[var(--entry-border-strong)]"}`}
                        >
                          <UserRound className="h-4 w-4" aria-hidden="true" />
                          {option.label}
                        </button>
                      )
                    })}
                  </div>
                </fieldset>

                <button
                  type="button"
                  onClick={handleConfirm}
                  disabled={!canContinue}
                  className="mt-5 flex min-h-14 w-full touch-manipulation items-center justify-center gap-2 rounded-xl bg-[var(--entry-primary)] px-5 font-black text-[var(--entry-primary-ink)] outline-none transition hover:bg-[var(--entry-primary-hover)] active:bg-[var(--entry-primary-active)] focus:ring-4 focus:ring-[var(--entry-focus)] disabled:cursor-not-allowed disabled:opacity-35"
                >
                  以这个身份进入世界
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>

              <p className="mt-4 flex items-start gap-2 px-2 text-xs font-bold leading-5 text-[var(--entry-quiet)]">
                <LockKeyhole className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                确认后，可在首页通过“重选”更改身份与性别。
              </p>
            </div>
          </section>
        )}
      </div>
    </main>
  )
}
