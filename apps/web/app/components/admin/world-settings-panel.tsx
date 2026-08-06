import type { StoryWorldDocument } from "../../lib/admin-content"
import { Field } from "./admin-fields"

export function WorldSettingsPanel({
  storyWorld,
  onChange,
}: {
  storyWorld: StoryWorldDocument
  onChange: (storyWorld: StoryWorldDocument) => void
}) {
  return (
    <section className="admin-form-card">
      <div className="admin-form-grid">
        <Field label="世界名称">
          <input
            onChange={(event) =>
              onChange({ ...storyWorld, title: event.target.value })
            }
            value={storyWorld.title}
          />
        </Field>
        <Field label="题材">
          <input
            onChange={(event) =>
              onChange({ ...storyWorld, genre: event.target.value })
            }
            value={storyWorld.genre}
          />
        </Field>
        <Field label="故事摘要" wide>
          <textarea
            onChange={(event) =>
              onChange({ ...storyWorld, summary: event.target.value })
            }
            rows={5}
            value={storyWorld.summary}
          />
        </Field>
        <Field label="世界 ID">
          <input disabled value={storyWorld.id} />
        </Field>
      </div>
    </section>
  )
}
