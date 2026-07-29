import { ArrowRight, BookOpen, Users } from "lucide-react"
import { useCallback, useEffect, useState } from "react"
import {
  Link,
  Navigate,
  useParams,
  type MetaFunction,
} from "react-router"
import { AdminShell, sectionLabel, type AdminSection } from "../components/admin/admin-shell"
import { BackgroundPanel } from "../components/admin/background-panel"
import { ChaptersPanel } from "../components/admin/chapters-panel"
import { CharactersPanel } from "../components/admin/characters-panel"
import { WorldSettingsPanel } from "../components/admin/world-settings-panel"
import {
  getManagedStoryWorld,
  listManagedStoryWorlds,
  saveManagedStoryWorld,
  uploadCharacterPortrait,
  type StoryWorldDocument,
  type StoryWorldSummary,
} from "../lib/admin-content"

import "./admin.css"

export const meta: MetaFunction = () => [{ title: "内容后台｜FableSpace" }]

const ADMIN_SECTIONS = new Set<AdminSection>([
  "settings",
  "background",
  "chapters",
  "characters",
])
const ADMIN_DATE_FORMATTER = new Intl.DateTimeFormat("zh-CN", {
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
})

export default function AdminRoute() {
  const { scope, storyWorldId, section: rawSection } = useParams()
  const section = isAdminSection(rawSection) ? rawSection : undefined
  const [worlds, setWorlds] = useState<StoryWorldSummary[]>([])
  const [draft, setDraft] = useState<StoryWorldDocument | null>(null)
  const [updatedAt, setUpdatedAt] = useState("")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved">(
    "idle",
  )

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError("")
    setSaveState("idle")

    if (storyWorldId) {
      void getManagedStoryWorld(storyWorldId)
        .then((response) => {
          if (cancelled) return
          setDraft(response.story_world)
          setUpdatedAt(response.updated_at)
        })
        .catch((cause: unknown) => {
          if (cancelled) return
          setDraft(null)
          setError(errorMessage(cause))
        })
        .finally(() => {
          if (!cancelled) setLoading(false)
        })
    } else {
      void listManagedStoryWorlds()
        .then((response) => {
          if (cancelled) return
          setWorlds(response.story_worlds)
          setDraft(null)
        })
        .catch((cause: unknown) => {
          if (!cancelled) setError(errorMessage(cause))
        })
        .finally(() => {
          if (!cancelled) setLoading(false)
        })
    }

    return () => {
      cancelled = true
    }
  }, [storyWorldId])

  const changeDraft = useCallback((storyWorld: StoryWorldDocument) => {
    setDraft(storyWorld)
    setSaveState("idle")
    setError("")
  }, [])

  const saveDraft = useCallback(async () => {
    if (!draft) return
    setSaveState("saving")
    setError("")
    try {
      const response = await saveManagedStoryWorld(draft.id, draft)
      setDraft(response.story_world)
      setUpdatedAt(response.updated_at)
      setSaveState("saved")
    } catch (cause) {
      setSaveState("idle")
      setError(errorMessage(cause))
    }
  }, [draft])

  const uploadPortrait = useCallback(
    async (characterId: string, image: File, sourceNote: string) => {
      if (!draft) return
      setSaveState("saving")
      setError("")
      try {
        const saved = await saveManagedStoryWorld(draft.id, draft)
        const response = await uploadCharacterPortrait(
          saved.story_world.id,
          characterId,
          image,
          sourceNote,
        )
        setDraft(response.story_world)
        setUpdatedAt(response.updated_at)
        setSaveState("saved")
      } catch (cause) {
        setSaveState("idle")
        setError(errorMessage(cause))
      }
    },
    [draft],
  )

  if (scope && scope !== "story-worlds") {
    return <Navigate replace to="/admin/story-worlds" />
  }

  if (storyWorldId && !rawSection) {
    return (
      <Navigate
        replace
        to={`/admin/story-worlds/${encodeURIComponent(storyWorldId)}/settings`}
      />
    )
  }

  if (storyWorldId && rawSection && !section) {
    return (
      <Navigate
        replace
        to={`/admin/story-worlds/${encodeURIComponent(storyWorldId)}/settings`}
      />
    )
  }

  if (!storyWorldId) {
    return (
      <AdminShell title="故事世界">
        {error ? <AdminError message={error} /> : null}
        {loading ? (
          <AdminLoading />
        ) : (
          <WorldList storyWorlds={worlds} />
        )}
      </AdminShell>
    )
  }

  const title = section ? sectionLabel(section) : "世界设置"
  return (
    <AdminShell
      onSave={() => void saveDraft()}
      saveDisabled={!draft || loading}
      saveState={saveState}
      section={section ?? "settings"}
      storyWorld={
        draft
          ? { id: draft.id, title: draft.title }
          : { id: storyWorldId, title: storyWorldId }
      }
      title={title}
    >
      {error ? <AdminError message={error} /> : null}
      {loading || !draft ? (
        error ? null : <AdminLoading />
      ) : (
        <>
          <div className="admin-updated-at">
            {saveState === "saved" ? "已保存" : formatUpdatedAt(updatedAt)}
          </div>
          {section === "background" ? (
            <BackgroundPanel onChange={changeDraft} storyWorld={draft} />
          ) : section === "chapters" ? (
            <ChaptersPanel onChange={changeDraft} storyWorld={draft} />
          ) : section === "characters" ? (
            <CharactersPanel
              onChange={changeDraft}
              onUpload={uploadPortrait}
              storyWorld={draft}
            />
          ) : (
            <WorldSettingsPanel onChange={changeDraft} storyWorld={draft} />
          )}
        </>
      )}
    </AdminShell>
  )
}

function WorldList({ storyWorlds }: { storyWorlds: StoryWorldSummary[] }) {
  if (!storyWorlds.length) {
    return <div className="admin-empty-state">暂无故事世界</div>
  }
  return (
    <section className="admin-world-list">
      <div className="admin-table-heading">
        <span>故事世界</span>
        <span>章节</span>
        <span>角色</span>
        <span>最后修改</span>
        <span aria-hidden="true" />
      </div>
      {storyWorlds.map((storyWorld) => (
        <Link
          className="admin-world-row"
          key={storyWorld.id}
          to={`/admin/story-worlds/${encodeURIComponent(storyWorld.id)}/settings`}
        >
          <span className="admin-world-identity">
            <span className="admin-world-monogram">
              {storyWorld.title.slice(0, 1)}
            </span>
            <span>
              <strong>{storyWorld.title}</strong>
              <small>{storyWorld.genre}</small>
            </span>
          </span>
          <span className="admin-world-count">
            <BookOpen aria-hidden="true" size={16} />
            {storyWorld.chapter_count}
          </span>
          <span className="admin-world-count">
            <Users aria-hidden="true" size={16} />
            {storyWorld.character_count}
          </span>
          <time dateTime={storyWorld.updated_at}>
            {formatUpdatedAt(storyWorld.updated_at)}
          </time>
          <ArrowRight aria-hidden="true" size={18} />
        </Link>
      ))}
    </section>
  )
}

function AdminLoading() {
  return <div className="admin-loading">加载中</div>
}

function AdminError({ message }: { message: string }) {
  return <div className="admin-error">{message}</div>
}

function isAdminSection(value: string | undefined): value is AdminSection {
  return !!value && ADMIN_SECTIONS.has(value as AdminSection)
}

function errorMessage(cause: unknown) {
  return cause instanceof Error ? cause.message : "操作失败"
}

function formatUpdatedAt(value: string) {
  if (!value) return ""
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return ADMIN_DATE_FORMATTER.format(date)
}
