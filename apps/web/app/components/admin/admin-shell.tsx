import { BookOpen, Check, ChevronLeft, Save } from "lucide-react"
import { Link, NavLink } from "react-router"
import type { ReactNode } from "react"

export type AdminSection = "settings" | "background" | "chapters" | "characters"

const SECTION_LABELS: Record<AdminSection, string> = {
  settings: "世界设置",
  background: "背景设定",
  chapters: "章节管理",
  characters: "角色管理",
}

type AdminShellProps = {
  children: ReactNode
  title: string
  storyWorld?: { id: string; title: string }
  section?: AdminSection
  saveState?: "idle" | "saving" | "saved"
  onSave?: () => void
  saveDisabled?: boolean
}

export function AdminShell({
  children,
  title,
  storyWorld,
  section,
  saveState = "idle",
  onSave,
  saveDisabled,
}: AdminShellProps) {
  return (
    <div className="admin-app">
      <aside className="admin-sidebar">
        <Link className="admin-brand" to="/admin/story-worlds">
          <span>FABLESPACE</span>
          <small>内容后台</small>
        </Link>

        <nav className="admin-global-nav" aria-label="后台导航">
          <NavLink
            className={({ isActive }) =>
              `admin-global-link${isActive ? " is-active" : ""}`
            }
            to="/admin/story-worlds"
          >
            <BookOpen aria-hidden="true" size={19} strokeWidth={1.7} />
            <span>故事世界</span>
          </NavLink>
        </nav>

        <div className="admin-sidebar-user">管理员</div>
      </aside>

      <main className="admin-workspace">
        <header className="admin-topbar">
          <div className="admin-heading">
            {storyWorld ? (
              <div className="admin-breadcrumb">
                <Link to="/admin/story-worlds">故事世界</Link>
                <span>/</span>
                <span>{storyWorld.title}</span>
              </div>
            ) : (
              <div className="admin-kicker">内容管理</div>
            )}
            <h1>{title}</h1>
          </div>

          <div className="admin-topbar-actions">
            {storyWorld ? (
              <Link className="admin-button is-quiet" to="/admin/story-worlds">
                <ChevronLeft aria-hidden="true" size={17} />
                切换世界
              </Link>
            ) : null}
            {onSave ? (
              <button
                className="admin-button is-primary"
                disabled={saveDisabled || saveState === "saving"}
                onClick={onSave}
                type="button"
              >
                {saveState === "saved" ? (
                  <Check aria-hidden="true" size={17} />
                ) : (
                  <Save aria-hidden="true" size={17} />
                )}
                {saveState === "saving"
                  ? "保存中"
                  : saveState === "saved"
                    ? "已保存"
                    : "保存"}
              </button>
            ) : null}
          </div>
        </header>

        {storyWorld && section ? (
          <nav className="admin-world-tabs" aria-label="故事世界配置">
            {(Object.keys(SECTION_LABELS) as AdminSection[]).map((item) => (
              <NavLink
                className={item === section ? "is-active" : undefined}
                key={item}
                to={`/admin/story-worlds/${encodeURIComponent(storyWorld.id)}/${item}`}
              >
                {SECTION_LABELS[item]}
              </NavLink>
            ))}
          </nav>
        ) : null}

        <div className="admin-page">{children}</div>
      </main>
    </div>
  )
}

export function sectionLabel(section: AdminSection) {
  return SECTION_LABELS[section]
}
