import { BookOpenText, ExternalLink, MapPin } from "lucide-react"

import {
  HISTORY_PILOT_REFERENCE_NOTICE,
  historyPilotReferenceEntriesForNode,
  type HistoryPilotReferenceKind,
} from "../../lib/history-pilot-space"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "../../ui/dialog"

type HistoricalStoryChoice = {
  id: string
  label?: string
}

type HistoricalBroadStreetStoryProps = {
  session: Record<string, any> | null
  scene: Record<string, any>
  busy?: boolean
  onChoice: (choice: HistoricalStoryChoice) => void | Promise<void>
}

const REFERENCE_KIND_STYLES: Record<HistoryPilotReferenceKind, string> = {
  "史实": "border-cyan-200/30 bg-cyan-200/10 text-cyan-50",
  "剧情设定": "border-amber-200/30 bg-amber-200/10 text-amber-50",
  "待核验": "border-violet-200/30 bg-violet-200/10 text-violet-50",
}

function currentNodeId(session: Record<string, any> | null, scene: Record<string, any>) {
  return String(scene?.node_id || session?.current_node_id || "start")
}

export function HistoricalBroadStreetStory({
  session,
  scene,
  busy = false,
  onChoice,
}: HistoricalBroadStreetStoryProps) {
  if (!session) return null

  const nodeId = currentNodeId(session, scene)
  const choices = Array.isArray(scene?.choices) ? scene.choices.filter((choice) => choice?.id) : []
  const narration = String(scene?.narration || "").trim()
  const references = historyPilotReferenceEntriesForNode(nodeId)
  const completed = session.state === "completed" || nodeId.startsWith("complete")

  return (
    <article
      data-history-broad-street-story
      data-history-node={nodeId}
      className="relative overflow-hidden rounded-[1.4rem] border border-amber-100/18 bg-[linear-gradient(145deg,rgba(68,50,38,0.84),rgba(23,28,55,0.96)_58%,rgba(16,23,47,0.98))] p-4 shadow-[0_20px_54px_rgba(3,7,20,0.34)] sm:p-5"
    >
      <div className="pointer-events-none absolute inset-0 opacity-25 [background-image:repeating-linear-gradient(0deg,transparent,transparent_23px,rgba(255,241,204,0.07)_24px)]" />
      <div className="relative">
        <header className="flex items-center justify-between gap-3 border-b border-amber-100/12 pb-3">
          <p className="flex min-w-0 items-center gap-2 text-xs font-bold tracking-[0.08em] text-amber-50/68">
            <MapPin className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">伦敦宽街 · 1854 年 9 月 7 日</span>
          </p>
          <Dialog>
            <DialogTrigger asChild>
              <button
                type="button"
                data-history-reference-trigger
                className="inline-flex min-h-10 shrink-0 items-center gap-2 rounded-full border border-cyan-100/22 bg-slate-950/32 px-3 text-xs font-black text-cyan-50 transition hover:border-cyan-100/45 hover:bg-cyan-200/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-200/50"
              >
                <BookOpenText className="h-3.5 w-3.5" />
                史料
              </button>
            </DialogTrigger>
            <DialogContent
              aria-describedby={undefined}
              data-history-reference-dialog
              className="bottom-0 left-0 top-auto max-h-[92dvh] w-full max-w-none translate-x-0 translate-y-0 overflow-y-auto rounded-b-none rounded-t-[1.5rem] border-amber-100/18 bg-[#111831] p-5 text-violet-50 sm:bottom-auto sm:left-1/2 sm:top-1/2 sm:w-[min(92vw,42rem)] sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-[1.5rem] sm:p-6"
            >
              <DialogHeader className="border-b border-white/10 pb-4">
                <DialogTitle className="font-serif text-2xl font-black text-amber-50">史料</DialogTitle>
                <p className="text-sm leading-6 text-violet-100/66">{HISTORY_PILOT_REFERENCE_NOTICE}</p>
              </DialogHeader>
              <div className="mt-5 space-y-3">
                {references.map((entry) => (
                  <section key={entry.id} className="rounded-2xl border border-white/10 bg-white/[0.045] p-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`rounded-full border px-2.5 py-1 text-[0.68rem] font-black ${REFERENCE_KIND_STYLES[entry.kind]}`}>
                        {entry.kind}
                      </span>
                      <h3 className="font-serif text-base font-black text-white">{entry.title}</h3>
                    </div>
                    <p className="mt-3 text-sm leading-6 text-violet-50/78">{entry.content}</p>
                    {entry.sourceUrl ? (
                      <a
                        href={entry.sourceUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-3 inline-flex items-center gap-1.5 text-xs font-black text-cyan-100 underline decoration-cyan-100/30 underline-offset-4 hover:text-white"
                      >
                        {entry.sourceName || "来源"}
                        <ExternalLink className="h-3.5 w-3.5" />
                      </a>
                    ) : null}
                  </section>
                ))}
              </div>
            </DialogContent>
          </Dialog>
        </header>

        {narration ? (
          <p className="mt-4 whitespace-pre-wrap font-serif text-[1.02rem] font-semibold leading-8 text-amber-50/92 sm:text-lg">
            {narration}
          </p>
        ) : null}

        {!completed && choices.length ? (
          <div className="mt-5 grid gap-2.5" aria-label="回应安妮">
            {choices.map((choice: HistoricalStoryChoice, index: number) => (
              <button
                key={choice.id}
                type="button"
                data-history-story-choice={choice.id}
                disabled={busy}
                onClick={() => void onChoice(choice)}
                className="group flex min-h-12 w-full items-center gap-3 rounded-2xl border border-amber-100/16 bg-amber-50/[0.055] px-3.5 py-3 text-left text-sm font-bold leading-6 text-amber-50 transition hover:border-amber-100/38 hover:bg-amber-50/[0.11] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-100/45 disabled:cursor-wait disabled:opacity-55"
              >
                <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full border border-amber-100/20 bg-slate-950/28 font-serif text-xs text-amber-100/72 transition group-hover:border-amber-100/40 group-hover:text-amber-50">
                  {index + 1}
                </span>
                <span>{choice.label || choice.id}</span>
              </button>
            ))}
          </div>
        ) : null}
      </div>
    </article>
  )
}
