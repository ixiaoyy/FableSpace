import { ArrowRight, Check, LockKeyhole, UserRound } from "lucide-react"
import { useState } from "react"

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

/**
 * Render the required first-run choice for a visitor's fictional role and self-declared gender.
 * @param onConfirm Callback invoked after both explicit choices are complete.
 * @returns A responsive full-page onboarding surface; confirmation is its only side effect.
 */
export function VisitorPlayIdentityOnboarding({ onConfirm }: VisitorPlayIdentityOnboardingProps) {
  const [playIdentityId, setPlayIdentityId] = useState<VisitorPlayIdentityId | "">("")
  const [gender, setGender] = useState<VisitorPlayGender | "">("")
  const canContinue = playIdentityId === "beggar" && (gender === "male" || gender === "female")

  /**
   * Confirm the two explicit selections without inventing defaults for the visitor.
   * @returns Nothing. This handler invokes onConfirm only for the supported v1 combination.
   */
  function handleConfirm() {
    if (!canContinue || !playIdentityId || !gender) return
    onConfirm({ version: 1, playIdentityId, gender })
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#0b0512] px-4 py-5 text-white sm:px-6 lg:px-10 lg:py-8">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_18%_8%,rgba(124,58,237,0.3),transparent_31rem),radial-gradient(circle_at_82%_18%,rgba(244,114,182,0.2),transparent_28rem),linear-gradient(145deg,#180b2c_0%,#0b0512_58%)]" />
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 opacity-35 [background-image:linear-gradient(rgba(251,207,232,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(251,207,232,0.04)_1px,transparent_1px)] [background-size:64px_64px]" />

      <div className="relative mx-auto flex min-h-[calc(100vh-2.5rem)] max-w-[1240px] flex-col">
        <header className="flex min-h-14 items-center justify-between border-b border-cyan-200/14">
          <span className="text-lg font-black tracking-[-0.02em]">FableSpace</span>
          <span className="rounded-full border border-cyan-200/20 bg-cyan-300/8 px-3 py-1.5 text-xs font-black text-cyan-100/72">
            首次进入
          </span>
        </header>

        <section className="flex flex-1 items-center py-10 lg:py-14" aria-labelledby="identity-onboarding-title">
          <div className="grid w-full gap-10 lg:grid-cols-[minmax(0,0.88fr)_minmax(440px,0.72fr)] lg:items-center lg:gap-16">
            <div className="max-w-[620px]">
              <p className="text-sm font-black text-cyan-300">先决定你以谁的身份进入</p>
              <h1 id="identity-onboarding-title" className="mt-4 text-4xl font-black leading-[1.08] tracking-[-0.035em] text-balance sm:text-5xl lg:text-6xl">
                同一个人，
                <br />
                会被每个角色
                <br />
                <span className="text-cyan-300">不同地看见。</span>
              </h1>
              <p className="mt-6 max-w-[58ch] text-base font-bold leading-7 text-cyan-100/64 text-pretty">
                你会带着这个身份进入店主创造的独立世界。Space、角色人设和访问规则保持不变，但每个 NPC 会依据自己的性格与世界处境回应你。
              </p>
              <div className="mt-8 flex items-start gap-3 border-t border-cyan-200/12 pt-5 text-sm font-bold leading-6 text-cyan-100/52">
                <LockKeyhole className="mt-0.5 h-4 w-4 shrink-0 text-cyan-300" aria-hidden="true" />
                <p>身份与性别是私有游玩设定，不会公开展示，也不会改写任何 NPC 角色卡。</p>
              </div>
            </div>

            <div className="rounded-2xl border border-cyan-200/18 bg-[#170c29]/92 p-4 sm:p-6">
              <fieldset>
                <legend className="text-base font-black text-white">选择你的游玩身份</legend>
                <p className="mt-1 text-sm font-bold text-cyan-100/52">当前版本仅开放一个身份。</p>
                <div className="mt-4" role="radiogroup" aria-label="游玩身份">
                  {VISITOR_PLAY_IDENTITIES.map((identity) => {
                    const selected = playIdentityId === identity.id
                    return (
                      <button
                        key={identity.id}
                        type="button"
                        role="radio"
                        aria-checked={selected}
                        onClick={() => setPlayIdentityId(identity.id)}
                        className={`flex min-h-28 w-full touch-manipulation items-center gap-4 rounded-xl border p-4 text-left outline-none transition focus:ring-4 focus:ring-cyan-300/25 ${selected ? "border-cyan-300 bg-cyan-300/12" : "border-cyan-200/16 bg-[#100719] hover:border-cyan-200/36"}`}
                      >
                        <span className={`grid h-16 w-16 shrink-0 place-items-center rounded-xl border text-3xl font-black ${selected ? "border-cyan-200/58 bg-cyan-300 text-slate-950" : "border-cyan-200/18 bg-cyan-300/8 text-cyan-100"}`} aria-hidden="true">
                          丐
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="flex items-center justify-between gap-3">
                            <span className="flex min-w-0 items-center gap-2">
                              <span className="text-xl font-black text-white">{identity.label}</span>
                              <span className="rounded-full border border-violet-300/30 bg-violet-300/10 px-2 py-0.5 text-[10px] font-black text-violet-200">
                                {identity.eraLabel}
                              </span>
                            </span>
                            {selected ? <Check className="h-5 w-5 shrink-0 text-cyan-300" aria-hidden="true" /> : null}
                          </span>
                          <span className="mt-2 block text-sm font-bold leading-6 text-cyan-100/58">{identity.shortDescription}</span>
                        </span>
                      </button>
                    )
                  })}
                </div>
              </fieldset>

              <fieldset className="mt-7">
                <legend className="text-base font-black text-white">选择性别</legend>
                <p className="mt-1 text-sm font-bold text-cyan-100/52">由你自选，仅用于故事中的称呼与代词。</p>
                <div className="mt-4 grid grid-cols-2 gap-3" role="radiogroup" aria-label="游玩性别">
                  {VISITOR_PLAY_GENDERS.map((option) => {
                    const selected = gender === option.id
                    return (
                      <button
                        key={option.id}
                        type="button"
                        role="radio"
                        aria-checked={selected}
                        onClick={() => setGender(option.id)}
                        className={`flex min-h-12 touch-manipulation items-center justify-center gap-2 rounded-xl border px-4 font-black outline-none transition focus:ring-4 focus:ring-cyan-300/25 ${selected ? "border-cyan-300 bg-cyan-300 text-slate-950" : "border-cyan-200/16 bg-[#100719] text-cyan-100 hover:border-cyan-200/36"}`}
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
                className="mt-7 flex min-h-12 w-full touch-manipulation items-center justify-center gap-2 rounded-xl bg-cyan-300 px-5 font-black text-slate-950 outline-none transition hover:bg-cyan-200 focus:ring-4 focus:ring-cyan-300/30 disabled:cursor-not-allowed disabled:bg-cyan-100/12 disabled:text-cyan-100/34"
              >
                以这个身份进入
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
          </div>
        </section>
      </div>
    </main>
  )
}
