import { Plus } from "lucide-react"
import type {
  CanonCategory,
  CanonEntry,
  StoryWorldDocument,
} from "../../lib/admin-content"
import {
  Field,
  ItemActions,
  joinLines,
  moveItem,
  newContentId,
  splitLines,
} from "./admin-fields"

const CATEGORY_LABELS: Record<CanonCategory, string> = {
  fixed_fact: "史实",
  story_setting: "剧情设定",
  needs_verification: "待核验",
}

export function BackgroundPanel({
  storyWorld,
  onChange,
}: {
  storyWorld: StoryWorldDocument
  onChange: (storyWorld: StoryWorldDocument) => void
}) {
  const updateEntries = (entries: CanonEntry[]) =>
    onChange({ ...storyWorld, canon_entries: entries })

  const updateEntry = (index: number, entry: CanonEntry) => {
    const entries = [...storyWorld.canon_entries]
    entries[index] = entry
    updateEntries(entries)
  }

  const addEntry = () => {
    updateEntries([
      ...storyWorld.canon_entries,
      {
        id: newContentId("canon"),
        category: "story_setting",
        statement: "",
        sources: [],
      },
    ])
  }

  return (
    <section className="admin-stack">
      <div className="admin-section-toolbar">
        <h2>背景条目</h2>
        <button className="admin-button is-quiet" onClick={addEntry} type="button">
          <Plus aria-hidden="true" size={17} />
          新增条目
        </button>
      </div>

      {storyWorld.canon_entries.map((entry, index) => (
        <article className="admin-form-card" key={entry.id}>
          <div className="admin-card-heading">
            <div>
              <span className={`admin-category is-${entry.category}`}>
                {CATEGORY_LABELS[entry.category]}
              </span>
              <code>{entry.id}</code>
            </div>
            <ItemActions
              index={index}
              length={storyWorld.canon_entries.length}
              onDelete={() =>
                updateEntries(
                  storyWorld.canon_entries.filter((_, itemIndex) => itemIndex !== index),
                )
              }
              onMove={(from, to) =>
                updateEntries(moveItem(storyWorld.canon_entries, from, to))
              }
            />
          </div>

          <div className="admin-form-grid">
            <Field label="分类">
              <select
                onChange={(event) =>
                  updateEntry(index, {
                    ...entry,
                    category: event.target.value as CanonCategory,
                  })
                }
                value={entry.category}
              >
                {(Object.keys(CATEGORY_LABELS) as CanonCategory[]).map((category) => (
                  <option key={category} value={category}>
                    {CATEGORY_LABELS[category]}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="条目 ID">
              <input disabled value={entry.id} />
            </Field>
            <Field label="内容" wide>
              <textarea
                onChange={(event) =>
                  updateEntry(index, { ...entry, statement: event.target.value })
                }
                rows={5}
                value={entry.statement}
              />
            </Field>
            <Field label="来源" wide>
              <textarea
                onBlur={(event) =>
                  updateEntry(index, {
                    ...entry,
                    sources: splitLines(event.target.value),
                  })
                }
                onChange={(event) =>
                  updateEntry(index, {
                    ...entry,
                    sources: event.target.value.split(/\r?\n/),
                  })
                }
                rows={4}
                value={joinLines(entry.sources)}
              />
            </Field>
          </div>
        </article>
      ))}
    </section>
  )
}
