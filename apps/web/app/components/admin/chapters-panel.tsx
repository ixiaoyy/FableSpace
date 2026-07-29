import { Plus } from "lucide-react"
import { useMemo, useState } from "react"
import type {
  RelationshipEffect,
  StoryChapter,
  StoryChoice,
  StoryNode,
  StoryWorldDocument,
} from "../../lib/admin-content"
import {
  Field,
  ItemActions,
  NumberInput,
  joinFlags,
  moveItem,
  newContentId,
  splitFlags,
} from "./admin-fields"

export function ChaptersPanel({
  storyWorld,
  onChange,
}: {
  storyWorld: StoryWorldDocument
  onChange: (storyWorld: StoryWorldDocument) => void
}) {
  const [selectedId, setSelectedId] = useState(
    storyWorld.chapters[0]?.id ?? "",
  )

  const requestedIndex = storyWorld.chapters.findIndex(
    (chapter) => chapter.id === selectedId,
  )
  const selectedIndex = requestedIndex >= 0 ? requestedIndex : 0
  const selectedChapter =
    storyWorld.chapters[selectedIndex] ?? null
  const effectiveSelectedId = selectedChapter?.id ?? ""

  const updateChapters = (chapters: StoryChapter[]) =>
    onChange({ ...storyWorld, chapters })

  const updateChapter = (chapter: StoryChapter) => {
    if (selectedIndex < 0) return
    const chapters = [...storyWorld.chapters]
    chapters[selectedIndex] = chapter
    updateChapters(chapters)
  }

  const addChapter = () => {
    const chapterId = newContentId("chapter")
    const nodeId = newContentId("node")
    const chapter: StoryChapter = {
      id: chapterId,
      title: "新章节",
      entry_node_id: nodeId,
      nodes: [
        {
          id: nodeId,
          narration: "",
          choices: [],
          ending_id: storyWorld.endings[0]?.id ?? null,
        },
      ],
    }
    updateChapters([...storyWorld.chapters, chapter])
    setSelectedId(chapterId)
  }

  return (
    <section className="admin-editor-split">
      <aside className="admin-collection-pane">
        <div className="admin-section-toolbar">
          <h2>章节</h2>
          <button
            aria-label="新增章节"
            className="admin-icon-button"
            onClick={addChapter}
            type="button"
          >
            <Plus aria-hidden="true" size={17} />
          </button>
        </div>
        <div className="admin-collection-list">
          {storyWorld.chapters.map((chapter, index) => (
            <button
              className={`admin-collection-row${
                chapter.id === effectiveSelectedId ? " is-active" : ""
              }`}
              key={chapter.id}
              onClick={() => setSelectedId(chapter.id)}
              type="button"
            >
              <span>{String(index + 1).padStart(2, "0")}</span>
              <strong>{chapter.title}</strong>
              <small>{chapter.nodes.length} 节点</small>
            </button>
          ))}
        </div>
      </aside>

      {selectedChapter ? (
        <ChapterEditor
          chapter={selectedChapter}
          chapterIndex={selectedIndex}
          storyWorld={storyWorld}
          onChange={updateChapter}
          onDelete={() => {
            const chapters = storyWorld.chapters.filter(
              (chapter) => chapter.id !== selectedChapter.id,
            )
            updateChapters(chapters)
            setSelectedId(chapters[0]?.id ?? "")
          }}
          onMove={(from, to) =>
            updateChapters(moveItem(storyWorld.chapters, from, to))
          }
        />
      ) : (
        <div className="admin-empty-state">暂无章节</div>
      )}
    </section>
  )
}

function ChapterEditor({
  chapter,
  chapterIndex,
  storyWorld,
  onChange,
  onDelete,
  onMove,
}: {
  chapter: StoryChapter
  chapterIndex: number
  storyWorld: StoryWorldDocument
  onChange: (chapter: StoryChapter) => void
  onDelete: () => void
  onMove: (from: number, to: number) => void
}) {
  const allNodes = useMemo(
    () =>
      storyWorld.chapters.flatMap((candidateChapter) =>
        candidateChapter.nodes.map((node) => ({
          id: node.id,
          label: `${candidateChapter.title} / ${node.id}`,
        })),
      ),
    [storyWorld.chapters],
  )

  const updateNode = (nodeIndex: number, node: StoryNode) => {
    const nodes = [...chapter.nodes]
    nodes[nodeIndex] = node
    onChange({ ...chapter, nodes })
  }

  const addNode = () => {
    const node: StoryNode = {
      id: newContentId("node"),
      narration: "",
      choices: [],
      ending_id: storyWorld.endings[0]?.id ?? null,
    }
    onChange({ ...chapter, nodes: [...chapter.nodes, node] })
  }

  return (
    <div className="admin-editor-pane">
      <div className="admin-card-heading">
        <div>
          <h2>{chapter.title}</h2>
          <code>{chapter.id}</code>
        </div>
        <ItemActions
          index={chapterIndex}
          length={storyWorld.chapters.length}
          onDelete={onDelete}
          onMove={onMove}
        />
      </div>

      <section className="admin-form-card">
        <div className="admin-form-grid">
          <Field label="章节名称">
            <input
              onChange={(event) =>
                onChange({ ...chapter, title: event.target.value })
              }
              value={chapter.title}
            />
          </Field>
          <Field label="入口节点">
            <select
              onChange={(event) =>
                onChange({ ...chapter, entry_node_id: event.target.value })
              }
              value={chapter.entry_node_id}
            >
              {chapter.nodes.map((node) => (
                <option key={node.id} value={node.id}>
                  {node.id}
                </option>
              ))}
            </select>
          </Field>
        </div>
      </section>

      <div className="admin-section-toolbar">
        <h2>节点</h2>
        <button className="admin-button is-quiet" onClick={addNode} type="button">
          <Plus aria-hidden="true" size={17} />
          新增节点
        </button>
      </div>

      <div className="admin-stack is-compact">
        {chapter.nodes.map((node, nodeIndex) => (
          <NodeEditor
            allNodes={allNodes}
            chapter={chapter}
            key={node.id}
            node={node}
            nodeIndex={nodeIndex}
            storyWorld={storyWorld}
            onChange={(nextNode) => updateNode(nodeIndex, nextNode)}
            onDelete={() => {
              const nodes = chapter.nodes.filter(
                (_, index) => index !== nodeIndex,
              )
              onChange({
                ...chapter,
                nodes,
                entry_node_id:
                  chapter.entry_node_id === node.id
                    ? nodes[0]?.id ?? ""
                    : chapter.entry_node_id,
              })
            }}
            onMove={(from, to) =>
              onChange({ ...chapter, nodes: moveItem(chapter.nodes, from, to) })
            }
          />
        ))}
      </div>
    </div>
  )
}

function NodeEditor({
  node,
  nodeIndex,
  chapter,
  storyWorld,
  allNodes,
  onChange,
  onDelete,
  onMove,
}: {
  node: StoryNode
  nodeIndex: number
  chapter: StoryChapter
  storyWorld: StoryWorldDocument
  allNodes: { id: string; label: string }[]
  onChange: (node: StoryNode) => void
  onDelete: () => void
  onMove: (from: number, to: number) => void
}) {
  const [open, setOpen] = useState(nodeIndex === 0)
  const addChoice = () => {
    const choice: StoryChoice = {
      id: newContentId("choice"),
      label: "",
      next_node_id: node.id,
      is_key: false,
      required_flags: [],
      blocked_flags: [],
      set_flags: [],
      relationship_effects: [],
    }
    onChange({
      ...node,
      ending_id: null,
      choices: [...node.choices, choice],
    })
  }

  return (
    <details
      className="admin-node-card"
      onToggle={(event) => setOpen(event.currentTarget.open)}
      open={open}
    >
      <summary>
        <div>
          <strong>{node.id}</strong>
          <span>{node.ending_id ? "终局" : `${node.choices.length} 选择`}</span>
        </div>
        <ItemActions
          index={nodeIndex}
          length={chapter.nodes.length}
          onDelete={onDelete}
          onMove={onMove}
        />
      </summary>

      <div className="admin-node-body">
        <div className="admin-form-grid">
          <Field label="节点 ID">
            <input disabled value={node.id} />
          </Field>
          <Field label="结局">
            <select
              onChange={(event) =>
                onChange({
                  ...node,
                  ending_id: event.target.value || null,
                  choices: event.target.value ? [] : node.choices,
                })
              }
              value={node.ending_id ?? ""}
            >
              <option value="">无</option>
              {storyWorld.endings.map((ending) => (
                <option key={ending.id} value={ending.id}>
                  {ending.title}
                </option>
              ))}
            </select>
          </Field>
          <Field label="旁白" wide>
            <textarea
              onChange={(event) =>
                onChange({ ...node, narration: event.target.value })
              }
              rows={5}
              value={node.narration}
            />
          </Field>
        </div>

        {!node.ending_id ? (
          <>
            <div className="admin-section-toolbar is-subsection">
              <h3>选择</h3>
              <button
                className="admin-button is-quiet"
                onClick={addChoice}
                type="button"
              >
                <Plus aria-hidden="true" size={16} />
                新增选择
              </button>
            </div>
            <div className="admin-stack is-compact">
              {node.choices.map((choice, choiceIndex) => (
                <ChoiceEditor
                  allNodes={allNodes}
                  choice={choice}
                  choiceCount={node.choices.length}
                  choiceIndex={choiceIndex}
                  key={choice.id}
                  storyWorld={storyWorld}
                  onChange={(nextChoice) => {
                    const choices = [...node.choices]
                    choices[choiceIndex] = nextChoice
                    onChange({ ...node, choices })
                  }}
                  onDelete={() =>
                    onChange({
                      ...node,
                      choices: node.choices.filter(
                        (_, index) => index !== choiceIndex,
                      ),
                    })
                  }
                  onMove={(from, to) =>
                    onChange({
                      ...node,
                      choices: moveItem(node.choices, from, to),
                    })
                  }
                />
              ))}
            </div>
          </>
        ) : null}
      </div>
    </details>
  )
}

function ChoiceEditor({
  choice,
  choiceCount,
  choiceIndex,
  storyWorld,
  allNodes,
  onChange,
  onDelete,
  onMove,
}: {
  choice: StoryChoice
  choiceCount: number
  choiceIndex: number
  storyWorld: StoryWorldDocument
  allNodes: { id: string; label: string }[]
  onChange: (choice: StoryChoice) => void
  onDelete: () => void
  onMove: (from: number, to: number) => void
}) {
  const updateEffect = (index: number, effect: RelationshipEffect) => {
    const effects = [...choice.relationship_effects]
    effects[index] = effect
    onChange({ ...choice, relationship_effects: effects })
  }

  return (
    <article className="admin-choice-card">
      <div className="admin-card-heading">
        <code>{choice.id}</code>
        <ItemActions
          index={choiceIndex}
          length={choiceCount}
          onDelete={onDelete}
          onMove={onMove}
        />
      </div>
      <div className="admin-form-grid">
        <Field label="选择文案" wide>
          <input
            onChange={(event) =>
              onChange({ ...choice, label: event.target.value })
            }
            value={choice.label}
          />
        </Field>
        <Field label="下一节点">
          <select
            onChange={(event) =>
              onChange({ ...choice, next_node_id: event.target.value })
            }
            value={choice.next_node_id}
          >
            {allNodes.map((node) => (
              <option key={node.id} value={node.id}>
                {node.label}
              </option>
            ))}
          </select>
        </Field>
        <label className="admin-check-field">
          <input
            checked={choice.is_key}
            onChange={(event) =>
              onChange({ ...choice, is_key: event.target.checked })
            }
            type="checkbox"
          />
          <span>关键选择</span>
        </label>
        <FlagField
          label="所需标记"
          onChange={(required_flags) => onChange({ ...choice, required_flags })}
          values={choice.required_flags}
        />
        <FlagField
          label="阻断标记"
          onChange={(blocked_flags) => onChange({ ...choice, blocked_flags })}
          values={choice.blocked_flags}
        />
        <FlagField
          label="写入标记"
          onChange={(set_flags) => onChange({ ...choice, set_flags })}
          values={choice.set_flags}
        />
      </div>

      <div className="admin-section-toolbar is-subsection">
        <h3>关系影响</h3>
        <button
          className="admin-button is-quiet"
          onClick={() =>
            onChange({
              ...choice,
              relationship_effects: [
                ...choice.relationship_effects,
                {
                  character_id: storyWorld.characters[0]?.id ?? "",
                  affinity_delta: 0,
                  reason: "",
                  set_flags: [],
                },
              ],
            })
          }
          type="button"
        >
          <Plus aria-hidden="true" size={16} />
          新增影响
        </button>
      </div>

      {choice.relationship_effects.map((effect, effectIndex) => (
        <div className="admin-effect-row" key={`${choice.id}-${effectIndex}`}>
          <select
            aria-label="角色"
            onChange={(event) =>
              updateEffect(effectIndex, {
                ...effect,
                character_id: event.target.value,
              })
            }
            value={effect.character_id}
          >
            {storyWorld.characters.map((character) => (
              <option key={character.id} value={character.id}>
                {character.name}
              </option>
            ))}
          </select>
          <NumberInput
            ariaLabel="关系变化"
            onCommit={(value) =>
              updateEffect(effectIndex, {
                ...effect,
                affinity_delta: value,
              })
            }
            value={effect.affinity_delta}
          />
          <input
            aria-label="变化原因"
            onChange={(event) =>
              updateEffect(effectIndex, {
                ...effect,
                reason: event.target.value,
              })
            }
            value={effect.reason}
          />
          <input
            aria-label="关系标记"
            onBlur={(event) =>
              updateEffect(effectIndex, {
                ...effect,
                set_flags: splitFlags(event.target.value),
              })
            }
            onChange={(event) =>
              updateEffect(effectIndex, {
                ...effect,
                set_flags: event.target.value
                  .split(/[,，]/)
                  .map((item) => item.trim()),
              })
            }
            value={joinFlags(effect.set_flags)}
          />
          <button
            className="admin-text-button is-danger"
            onClick={() =>
              onChange({
                ...choice,
                relationship_effects: choice.relationship_effects.filter(
                  (_, index) => index !== effectIndex,
                ),
              })
            }
            type="button"
          >
            删除
          </button>
        </div>
      ))}
    </article>
  )
}

function FlagField({
  label,
  values,
  onChange,
}: {
  label: string
  values: string[]
  onChange: (values: string[]) => void
}) {
  return (
    <Field label={label}>
      <input
        onBlur={(event) => onChange(splitFlags(event.target.value))}
        onChange={(event) =>
          onChange(
            event.target.value
              .split(/[,，]/)
              .map((item) => item.trim()),
          )
        }
        value={joinFlags(values)}
      />
    </Field>
  )
}
