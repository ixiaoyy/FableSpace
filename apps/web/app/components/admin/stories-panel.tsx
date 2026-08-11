import { Plus } from "lucide-react"
import { useMemo, useState } from "react"
import type {
  CharacterDecision,
  DecisionPredicate,
  DecisionRule,
  PostEndingMessageMode,
  PredicateValue,
  RelationshipEffect,
  ReviewedStory,
  StoryChapter,
  StoryChoice,
  StoryChoicePresentation,
  StoryExperienceMode,
  StoryKind,
  StoryNode,
  StoryNodePresentationKind,
  StoryReplayPolicy,
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

const STORY_KIND_LABELS: Record<StoryKind, string> = {
  growth: "成长故事",
  ensemble: "群像故事",
}

const EXPERIENCE_MODE_LABELS: Record<StoryExperienceMode, string> = {
  character_growth: "角色成长",
  narrative_story: "剧情故事",
}

const REPLAY_POLICY_LABELS: Record<StoryReplayPolicy, string> = {
  replayable: "可重玩",
  permanent_result: "永久结果",
}

const CHOICE_PRESENTATION_LABELS: Record<StoryChoicePresentation, string> = {
  inline: "行内选择",
  permanent_decision: "永久决定",
}

const POST_ENDING_MODE_LABELS: Record<PostEndingMessageMode, string> = {
  llm: "角色回应",
  unanswered: "无法答复",
  disabled: "关闭消息",
}

const PRESENTATION_LABELS: Record<StoryNodePresentationKind, string> = {
  character: "角色",
  system: "系统",
  action: "行动",
}

const PREDICATE_LABELS: Record<DecisionPredicate["kind"], string> = {
  story_flag: "故事标记",
  investigation_result: "查证结果",
  player_commitment: "玩家承诺",
  current_character: "当前角色",
  relationship_range: "关系范围",
}

/** Return every node in one ReviewedStory for story-scoped selectors. */
function storyNodeOptions(story: ReviewedStory) {
  return story.chapters.flatMap((chapter) => chapter.nodes.map((node) => ({
    id: node.id,
    label: `${chapter.title} / ${node.id}`,
  })))
}

/** Create a closed predicate shape with safe editor defaults for its selected kind. */
function newPredicate(
  kind: DecisionPredicate["kind"],
  characterId: string,
): DecisionPredicate {
  switch (kind) {
    case "story_flag":
      return { kind, flag: "", expected: true }
    case "investigation_result":
      return { kind, result_id: "", expected_value: "" }
    case "player_commitment":
      return { kind, action_id: "", expected: true }
    case "current_character":
      return { kind, character_id: characterId }
    case "relationship_range":
      return { kind, character_id: characterId, minimum_affinity: 0 }
  }
}

/** Create an empty relationship effect bound to a participant in this ReviewedStory. */
function newRelationshipEffect(characterId: string): RelationshipEffect {
  return {
    character_id: characterId,
    affinity_delta: 0,
    reason: "",
    set_flags: [],
  }
}

/** Edit complete ReviewedStory documents without falling back to world-level chapters. */
export function StoriesPanel({
  storyWorld,
  onChange,
}: {
  storyWorld: StoryWorldDocument
  onChange: (storyWorld: StoryWorldDocument) => void
}) {
  const [selectedId, setSelectedId] = useState(
    storyWorld.stories[0]?.id ?? "",
  )
  const requestedIndex = storyWorld.stories.findIndex(
    (story) => story.id === selectedId,
  )
  const selectedIndex = requestedIndex >= 0 ? requestedIndex : 0
  const selectedStory = storyWorld.stories[selectedIndex] ?? null
  const effectiveSelectedId = selectedStory?.id ?? ""

  const updateStories = (stories: ReviewedStory[]) => {
    onChange({ ...storyWorld, stories })
  }

  const updateStory = (story: ReviewedStory) => {
    const stories = [...storyWorld.stories]
    stories[selectedIndex] = story
    updateStories(stories)
  }

  const addStory = () => {
    const storyId = newContentId("story")
    const chapterId = newContentId("chapter")
    const nodeId = newContentId("node")
    const firstCharacterId = storyWorld.characters[0]?.id ?? ""
    const story: ReviewedStory = {
      id: storyId,
      title: "新故事",
      summary: "",
      kind: "growth",
      experience_mode: "character_growth",
      replay_policy: "replayable",
      publication_status: "draft",
      focus_character_id: firstCharacterId || null,
      participants: firstCharacterId ? [{
        character_id: firstCharacterId,
        current_situation: "",
        opening_line: "",
        can_start: true,
        location_label: "",
        arrival_narration: "",
        visit_required_flags: [],
        visit_set_flags: [],
        knowledge_entry_ids: [],
      }] : [],
      historical_reference_unlocks: [],
      entry_chapter_id: chapterId,
      chapters: [{
        id: chapterId,
        title: "第一章",
        entry_node_id: nodeId,
        nodes: [{
          id: nodeId,
          presentation_kind: "system",
          character_id: null,
          narration: "",
          choice_presentation: "inline",
          confirmation_prompt: null,
          choices: [],
          ending_id: null,
        }],
      }],
      endings: [],
      character_decisions: [],
    }
    updateStories([...storyWorld.stories, story])
    setSelectedId(storyId)
  }

  return (
    <section className="admin-editor-split">
      <aside className="admin-collection-pane">
        <div className="admin-section-toolbar">
          <h2>故事</h2>
          <button
            aria-label="新增故事"
            className="admin-icon-button"
            onClick={addStory}
            type="button"
          >
            <Plus aria-hidden="true" size={17} />
          </button>
        </div>
        <div className="admin-collection-list">
          {storyWorld.stories.map((story, index) => (
            <button
              className={`admin-collection-row${
                story.id === effectiveSelectedId ? " is-active" : ""
              }`}
              key={story.id}
              onClick={() => setSelectedId(story.id)}
              type="button"
            >
              <span>{String(index + 1).padStart(2, "0")}</span>
              <strong>{story.title}</strong>
              <small>{STORY_KIND_LABELS[story.kind]}</small>
            </button>
          ))}
        </div>
      </aside>

      {selectedStory ? (
        <StoryEditor
          key={selectedStory.id}
          story={selectedStory}
          storyIndex={selectedIndex}
          storyWorld={storyWorld}
          onChange={updateStory}
          onDelete={() => {
            const stories = storyWorld.stories.filter(
              (story) => story.id !== selectedStory.id,
            )
            updateStories(stories)
            setSelectedId(stories[0]?.id ?? "")
          }}
          onMove={(from, to) => updateStories(
            moveItem(storyWorld.stories, from, to),
          )}
        />
      ) : (
        <div className="admin-empty-state">暂无故事</div>
      )}
    </section>
  )
}

/** Edit one complete ReviewedStory and all story-owned graph structures. */
function StoryEditor({
  story,
  storyIndex,
  storyWorld,
  onChange,
  onDelete,
  onMove,
}: {
  story: ReviewedStory
  storyIndex: number
  storyWorld: StoryWorldDocument
  onChange: (story: ReviewedStory) => void
  onDelete: () => void
  onMove: (from: number, to: number) => void
}) {
  return (
    <div className="admin-editor-pane">
      <div className="admin-card-heading">
        <div>
          <h2>{story.title}</h2>
          <code>{story.id}</code>
        </div>
        <ItemActions
          index={storyIndex}
          length={storyWorld.stories.length}
          onDelete={onDelete}
          onMove={onMove}
        />
      </div>

      <section className="admin-form-card">
        <div className="admin-form-grid">
          <Field label="故事名称">
            <input
              onChange={(event) => onChange({ ...story, title: event.target.value })}
              value={story.title}
            />
          </Field>
          <Field label="发布状态">
            <select
              onChange={(event) => onChange({
                ...story,
                publication_status: event.target.value as ReviewedStory["publication_status"],
              })}
              value={story.publication_status}
            >
              <option value="draft">草稿</option>
              <option value="published">已发布</option>
              <option value="archived">已归档</option>
            </select>
          </Field>
          <Field label="故事类型">
            <select
              onChange={(event) => {
                const kind = event.target.value as StoryKind
                onChange({
                  ...story,
                  kind,
                  focus_character_id: kind === "growth"
                    ? story.focus_character_id || story.participants[0]?.character_id || null
                    : null,
                })
              }}
              value={story.kind}
            >
              {(Object.keys(STORY_KIND_LABELS) as StoryKind[]).map((kind) => (
                <option key={kind} value={kind}>{STORY_KIND_LABELS[kind]}</option>
              ))}
            </select>
          </Field>
          <Field label="体验类型">
            <select
              onChange={(event) => onChange({
                ...story,
                experience_mode: event.target.value as StoryExperienceMode,
              })}
              value={story.experience_mode}
            >
              {(Object.keys(EXPERIENCE_MODE_LABELS) as StoryExperienceMode[]).map(
                (mode) => (
                  <option key={mode} value={mode}>
                    {EXPERIENCE_MODE_LABELS[mode]}
                  </option>
                ),
              )}
            </select>
          </Field>
          <Field label="重玩策略">
            <select
              onChange={(event) => onChange({
                ...story,
                replay_policy: event.target.value as StoryReplayPolicy,
              })}
              value={story.replay_policy}
            >
              {(Object.keys(REPLAY_POLICY_LABELS) as StoryReplayPolicy[]).map(
                (policy) => (
                  <option key={policy} value={policy}>
                    {REPLAY_POLICY_LABELS[policy]}
                  </option>
                ),
              )}
            </select>
          </Field>
          <Field label="焦点角色">
            <select
              disabled={story.kind !== "growth"}
              onChange={(event) => onChange({
                ...story,
                focus_character_id: event.target.value || null,
              })}
              value={story.focus_character_id ?? ""}
            >
              <option value="">无</option>
              {story.participants.map((participant) => {
                const character = storyWorld.characters.find(
                  (candidate) => candidate.id === participant.character_id,
                )
                return (
                  <option key={participant.character_id} value={participant.character_id}>
                    {character?.name || participant.character_id}
                  </option>
                )
              })}
            </select>
          </Field>
          <Field label="入口章节">
            <select
              onChange={(event) => onChange({
                ...story,
                entry_chapter_id: event.target.value,
              })}
              value={story.entry_chapter_id}
            >
              {story.chapters.map((chapter) => (
                <option key={chapter.id} value={chapter.id}>{chapter.title}</option>
              ))}
            </select>
          </Field>
          <Field label="故事 ID">
            <input disabled value={story.id} />
          </Field>
          <Field label="故事摘要" wide>
            <textarea
              onChange={(event) => onChange({ ...story, summary: event.target.value })}
              rows={4}
              value={story.summary}
            />
          </Field>
        </div>
      </section>

      <ParticipantsEditor story={story} storyWorld={storyWorld} onChange={onChange} />
      <HistoricalReferenceUnlocksEditor
        story={story}
        storyWorld={storyWorld}
        onChange={onChange}
      />
      <ChaptersEditor story={story} storyWorld={storyWorld} onChange={onChange} />
      <EndingsEditor story={story} onChange={onChange} />
      <DecisionsEditor story={story} storyWorld={storyWorld} onChange={onChange} />
    </div>
  )
}

/** Edit story-specific Character participation, situation, opening, and entry permission. */
function ParticipantsEditor({
  story,
  storyWorld,
  onChange,
}: {
  story: ReviewedStory
  storyWorld: StoryWorldDocument
  onChange: (story: ReviewedStory) => void
}) {
  const participantIds = new Set(
    story.participants.map((participant) => participant.character_id),
  )
  const availableCharacter = storyWorld.characters.find(
    (character) => !participantIds.has(character.id),
  )
  const updateParticipants = (participants: ReviewedStory["participants"]) => {
    const participantIds = new Set(participants.map((item) => item.character_id))
    onChange({
      ...story,
      participants,
      focus_character_id: story.kind === "growth"
        ? story.focus_character_id && participantIds.has(story.focus_character_id)
          ? story.focus_character_id
          : participants[0]?.character_id ?? null
        : null,
    })
  }

  return (
    <section className="admin-stack is-compact">
      <div className="admin-section-toolbar">
        <h2>参与角色</h2>
        <button
          className="admin-button is-quiet"
          disabled={!availableCharacter}
          onClick={() => {
            if (!availableCharacter) return
            updateParticipants([...story.participants, {
              character_id: availableCharacter.id,
              current_situation: "",
              opening_line: "",
              can_start: false,
              location_label: "",
              arrival_narration: "",
              visit_required_flags: [],
              visit_set_flags: [],
              knowledge_entry_ids: [],
            }])
          }}
          type="button"
        >
          <Plus aria-hidden="true" size={16} />
          新增参与角色
        </button>
      </div>
      {story.participants.map((participant, index) => (
        <article className="admin-form-card" key={participant.character_id}>
          <div className="admin-card-heading">
            <code>{participant.character_id}</code>
            <ItemActions
              index={index}
              length={story.participants.length}
              onDelete={() => updateParticipants(
                story.participants.filter((_, itemIndex) => itemIndex !== index),
              )}
              onMove={(from, to) => updateParticipants(
                moveItem(story.participants, from, to),
              )}
            />
          </div>
          <div className="admin-form-grid">
            <Field label="角色">
              <select
                onChange={(event) => {
                  const participants = [...story.participants]
                  participants[index] = {
                    ...participant,
                    character_id: event.target.value,
                  }
                  updateParticipants(participants)
                }}
                value={participant.character_id}
              >
                {storyWorld.characters.flatMap((character) => (
                  character.id === participant.character_id
                    || !participantIds.has(character.id)
                    ? [(
                        <option key={character.id} value={character.id}>
                          {character.name}
                        </option>
                      )]
                    : []
                ))}
              </select>
            </Field>
            <label className="admin-check-field">
              <input
                checked={participant.can_start}
                onChange={(event) => {
                  const participants = [...story.participants]
                  participants[index] = {
                    ...participant,
                    can_start: event.target.checked,
                  }
                  updateParticipants(participants)
                }}
                type="checkbox"
              />
              <span>允许从此角色开始</span>
            </label>
            <Field label="地点">
              <input
                onChange={(event) => {
                  const participants = [...story.participants]
                  participants[index] = {
                    ...participant,
                    location_label: event.target.value,
                  }
                  updateParticipants(participants)
                }}
                value={participant.location_label}
              />
            </Field>
            <Field label="当前处境" wide>
              <textarea
                onChange={(event) => {
                  const participants = [...story.participants]
                  participants[index] = {
                    ...participant,
                    current_situation: event.target.value,
                  }
                  updateParticipants(participants)
                }}
                rows={3}
                value={participant.current_situation}
              />
            </Field>
            <Field label="开场对白" wide>
              <textarea
                onChange={(event) => {
                  const participants = [...story.participants]
                  participants[index] = {
                    ...participant,
                    opening_line: event.target.value,
                  }
                  updateParticipants(participants)
                }}
                rows={3}
                value={participant.opening_line}
              />
            </Field>
            <Field label="到访叙事" wide>
              <textarea
                onChange={(event) => {
                  const participants = [...story.participants]
                  participants[index] = {
                    ...participant,
                    arrival_narration: event.target.value,
                  }
                  updateParticipants(participants)
                }}
                rows={3}
                value={participant.arrival_narration}
              />
            </Field>
            <FlagField
              label="到访所需标记"
              onChange={(visit_required_flags) => {
                const participants = [...story.participants]
                participants[index] = { ...participant, visit_required_flags }
                updateParticipants(participants)
              }}
              values={participant.visit_required_flags}
            />
            <FlagField
              label="到访写入标记"
              onChange={(visit_set_flags) => {
                const participants = [...story.participants]
                participants[index] = { ...participant, visit_set_flags }
                updateParticipants(participants)
              }}
              values={participant.visit_set_flags}
            />
            <FlagField
              label="角色知识条目"
              onChange={(knowledge_entry_ids) => {
                const participants = [...story.participants]
                participants[index] = { ...participant, knowledge_entry_ids }
                updateParticipants(participants)
              }}
              values={participant.knowledge_entry_ids}
            />
          </div>
        </article>
      ))}
    </section>
  )
}

/** Render one story's unlock editor and emit complete updates through onChange. */
function HistoricalReferenceUnlocksEditor({
  story,
  storyWorld,
  onChange,
}: {
  story: ReviewedStory
  storyWorld: StoryWorldDocument
  onChange: (story: ReviewedStory) => void
}) {
  const referenceEntries = storyWorld.canon_entries.filter(
    (entry) => entry.category !== "story_setting",
  )
  const usedEntryIds = new Set(
    story.historical_reference_unlocks.map((unlock) => unlock.entry_id),
  )
  const availableEntry = referenceEntries.find(
    (entry) => !usedEntryIds.has(entry.id),
  )
  const updateUnlocks = (
    historical_reference_unlocks: ReviewedStory["historical_reference_unlocks"],
  ) => onChange({ ...story, historical_reference_unlocks })

  return (
    <section className="admin-stack is-compact">
      <div className="admin-section-toolbar">
        <h2>历史资料解锁</h2>
        <button
          className="admin-button is-quiet"
          disabled={!availableEntry}
          onClick={() => {
            if (!availableEntry) return
            updateUnlocks([
              ...story.historical_reference_unlocks,
              { entry_id: availableEntry.id, required_flags: [] },
            ])
          }}
          type="button"
        >
          <Plus aria-hidden="true" size={16} />
          新增资料
        </button>
      </div>
      {story.historical_reference_unlocks.map((unlock, index) => (
        <article className="admin-form-card" key={unlock.entry_id}>
          <div className="admin-card-heading">
            <code>{unlock.entry_id}</code>
            <ItemActions
              index={index}
              length={story.historical_reference_unlocks.length}
              onDelete={() => updateUnlocks(
                story.historical_reference_unlocks.filter(
                  (_, unlockIndex) => unlockIndex !== index,
                ),
              )}
              onMove={(from, to) => updateUnlocks(
                moveItem(story.historical_reference_unlocks, from, to),
              )}
            />
          </div>
          <div className="admin-form-grid">
            <Field label="资料条目">
              <select
                onChange={(event) => {
                  const unlocks = [...story.historical_reference_unlocks]
                  unlocks[index] = { ...unlock, entry_id: event.target.value }
                  updateUnlocks(unlocks)
                }}
                value={unlock.entry_id}
              >
                {referenceEntries.flatMap((entry) => (
                  entry.id === unlock.entry_id || !usedEntryIds.has(entry.id)
                    ? [<option key={entry.id} value={entry.id}>{entry.id}</option>]
                    : []
                ))}
              </select>
            </Field>
            <FlagField
              label="解锁所需标记"
              onChange={(required_flags) => {
                const unlocks = [...story.historical_reference_unlocks]
                unlocks[index] = { ...unlock, required_flags }
                updateUnlocks(unlocks)
              }}
              values={unlock.required_flags}
            />
          </div>
        </article>
      ))}
    </section>
  )
}

/** Edit the selected Story's chapters, nodes, presentations, and choices. */
function ChaptersEditor({
  story,
  storyWorld,
  onChange,
}: {
  story: ReviewedStory
  storyWorld: StoryWorldDocument
  onChange: (story: ReviewedStory) => void
}) {
  const [selectedId, setSelectedId] = useState(story.chapters[0]?.id ?? "")
  const requestedIndex = story.chapters.findIndex((chapter) => chapter.id === selectedId)
  const selectedIndex = requestedIndex >= 0 ? requestedIndex : 0
  const chapter = story.chapters[selectedIndex] ?? null
  const allNodes = useMemo(() => storyNodeOptions(story), [story])

  const updateChapters = (chapters: StoryChapter[]) => onChange({ ...story, chapters })
  const updateChapter = (nextChapter: StoryChapter) => {
    const chapters = [...story.chapters]
    chapters[selectedIndex] = nextChapter
    updateChapters(chapters)
  }

  const addChapter = () => {
    const chapterId = newContentId("chapter")
    const nodeId = newContentId("node")
    const nextChapter: StoryChapter = {
      id: chapterId,
      title: "新章节",
      entry_node_id: nodeId,
      nodes: [{
        id: nodeId,
        presentation_kind: "system",
        character_id: null,
        narration: "",
        choice_presentation: "inline",
        confirmation_prompt: null,
        choices: [],
        ending_id: story.endings[0]?.id ?? null,
      }],
    }
    updateChapters([...story.chapters, nextChapter])
    setSelectedId(chapterId)
  }

  return (
    <section className="admin-stack is-compact">
      <div className="admin-section-toolbar">
        <h2>章节与节点</h2>
        <button className="admin-button is-quiet" onClick={addChapter} type="button">
          <Plus aria-hidden="true" size={16} />
          新增章节
        </button>
      </div>
      {chapter ? (
        <>
          <div className="admin-story-subnav">
            <select
              aria-label="章节"
              onChange={(event) => setSelectedId(event.target.value)}
              value={chapter.id}
            >
              {story.chapters.map((candidate) => (
                <option key={candidate.id} value={candidate.id}>{candidate.title}</option>
              ))}
            </select>
            <ItemActions
              index={selectedIndex}
              length={story.chapters.length}
              onDelete={() => {
                const chapters = story.chapters.filter(
                  (candidate) => candidate.id !== chapter.id,
                )
                updateChapters(chapters)
                setSelectedId(chapters[0]?.id ?? "")
              }}
              onMove={(from, to) => updateChapters(
                moveItem(story.chapters, from, to),
              )}
            />
          </div>
          <section className="admin-form-card">
            <div className="admin-form-grid">
              <Field label="章节名称">
                <input
                  onChange={(event) => updateChapter({
                    ...chapter,
                    title: event.target.value,
                  })}
                  value={chapter.title}
                />
              </Field>
              <Field label="入口节点">
                <select
                  onChange={(event) => updateChapter({
                    ...chapter,
                    entry_node_id: event.target.value,
                  })}
                  value={chapter.entry_node_id}
                >
                  {chapter.nodes.map((node) => (
                    <option key={node.id} value={node.id}>{node.id}</option>
                  ))}
                </select>
              </Field>
            </div>
          </section>
          <div className="admin-section-toolbar is-subsection">
            <h3>节点</h3>
            <button
              className="admin-button is-quiet"
              onClick={() => updateChapter({
                ...chapter,
                nodes: [...chapter.nodes, {
                  id: newContentId("node"),
                  presentation_kind: "system",
                  character_id: null,
                  narration: "",
                  choice_presentation: "inline",
                  confirmation_prompt: null,
                  choices: [],
                  ending_id: story.endings[0]?.id ?? null,
                }],
              })}
              type="button"
            >
              <Plus aria-hidden="true" size={16} />
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
                story={story}
                storyWorld={storyWorld}
                onChange={(nextNode) => {
                  const nodes = [...chapter.nodes]
                  nodes[nodeIndex] = nextNode
                  updateChapter({ ...chapter, nodes })
                }}
                onDelete={() => {
                  const nodes = chapter.nodes.filter((_, index) => index !== nodeIndex)
                  updateChapter({
                    ...chapter,
                    nodes,
                    entry_node_id: chapter.entry_node_id === node.id
                      ? nodes[0]?.id ?? ""
                      : chapter.entry_node_id,
                  })
                }}
                onMove={(from, to) => updateChapter({
                  ...chapter,
                  nodes: moveItem(chapter.nodes, from, to),
                })}
              />
            ))}
          </div>
        </>
      ) : (
        <div className="admin-empty-state">暂无章节</div>
      )}
    </section>
  )
}

/** Edit one node using story-scoped graph, ending, presentation, and Character references. */
function NodeEditor({
  node,
  nodeIndex,
  chapter,
  story,
  storyWorld,
  allNodes,
  onChange,
  onDelete,
  onMove,
}: {
  node: StoryNode
  nodeIndex: number
  chapter: StoryChapter
  story: ReviewedStory
  storyWorld: StoryWorldDocument
  allNodes: { id: string; label: string }[]
  onChange: (node: StoryNode) => void
  onDelete: () => void
  onMove: (from: number, to: number) => void
}) {
  const [open, setOpen] = useState(nodeIndex === 0)
  const participantCharacters = story.participants.flatMap((participant) => {
    const character = storyWorld.characters.find(
      (candidate) => candidate.id === participant.character_id,
    )
    return character ? [character] : []
  })
  const participantCharacterIds = participantCharacters.map(
    (character) => character.id,
  )

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
          <Field label="节点 ID"><input disabled value={node.id} /></Field>
          <Field label="呈现方式">
            <select
              onChange={(event) => {
                const presentationKind = event.target.value as StoryNodePresentationKind
                onChange({
                  ...node,
                  presentation_kind: presentationKind,
                  character_id: presentationKind === "character"
                    ? node.character_id || participantCharacters[0]?.id || null
                    : null,
                })
              }}
              value={node.presentation_kind}
            >
              {(Object.keys(PRESENTATION_LABELS) as StoryNodePresentationKind[]).map(
                (kind) => <option key={kind} value={kind}>{PRESENTATION_LABELS[kind]}</option>,
              )}
            </select>
          </Field>
          <Field label="呈现角色">
            <select
              disabled={node.presentation_kind !== "character"}
              onChange={(event) => onChange({
                ...node,
                character_id: event.target.value || null,
              })}
              value={node.character_id ?? ""}
            >
              <option value="">无</option>
              {participantCharacters.map((character) => (
                <option key={character.id} value={character.id}>{character.name}</option>
              ))}
            </select>
          </Field>
          <Field label="选择呈现">
            <select
              disabled={node.ending_id !== null}
              onChange={(event) => {
                const choicePresentation = event.target.value as StoryChoicePresentation
                onChange({
                  ...node,
                  choice_presentation: choicePresentation,
                  confirmation_prompt: choicePresentation === "permanent_decision"
                    ? node.confirmation_prompt ?? ""
                    : null,
                  choices: choicePresentation === "permanent_decision"
                    ? node.choices.map((choice) => ({ ...choice, is_key: true }))
                    : node.choices,
                })
              }}
              value={node.choice_presentation}
            >
              {(Object.keys(CHOICE_PRESENTATION_LABELS) as StoryChoicePresentation[])
                .map((presentation) => (
                  <option key={presentation} value={presentation}>
                    {CHOICE_PRESENTATION_LABELS[presentation]}
                  </option>
                ))}
            </select>
          </Field>
          <Field label="结局">
            <select
              onChange={(event) => onChange({
                ...node,
                ending_id: event.target.value || null,
                choices: event.target.value ? [] : node.choices,
                choice_presentation: event.target.value
                  ? "inline"
                  : node.choice_presentation,
                confirmation_prompt: event.target.value
                  ? null
                  : node.confirmation_prompt,
              })}
              value={node.ending_id ?? ""}
            >
              <option value="">无</option>
              {story.endings.map((ending) => (
                <option key={ending.id} value={ending.id}>{ending.title}</option>
              ))}
            </select>
          </Field>
          <Field label="确认文案" wide>
            <textarea
              disabled={node.choice_presentation !== "permanent_decision"}
              onChange={(event) => onChange({
                ...node,
                confirmation_prompt: event.target.value,
              })}
              rows={2}
              value={node.confirmation_prompt ?? ""}
            />
          </Field>
          <Field label="内容" wide>
            <textarea
              onChange={(event) => onChange({ ...node, narration: event.target.value })}
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
                onClick={() => onChange({
                  ...node,
                  choices: [...node.choices, {
                    id: newContentId("choice"),
                    label: "",
                    next_node_id: node.id,
                    is_key: node.choice_presentation === "permanent_decision",
                    required_flags: [],
                    blocked_flags: [],
                    set_flags: [],
                    relationship_effects: [],
                  }],
                })}
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
                  isKeyLocked={node.choice_presentation === "permanent_decision"}
                  key={choice.id}
                  participantCharacterIds={participantCharacterIds}
                  storyWorld={storyWorld}
                  onChange={(nextChoice) => {
                    const choices = [...node.choices]
                    choices[choiceIndex] = nextChoice
                    onChange({ ...node, choices })
                  }}
                  onDelete={() => onChange({
                    ...node,
                    choices: node.choices.filter((_, index) => index !== choiceIndex),
                  })}
                  onMove={(from, to) => onChange({
                    ...node,
                    choices: moveItem(node.choices, from, to),
                  })}
                />
              ))}
            </div>
          </>
        ) : null}
      </div>
    </details>
  )
}

/** Edit one reviewed choice and its deterministic story and relationship effects. */
function ChoiceEditor({
  choice,
  choiceCount,
  choiceIndex,
  isKeyLocked,
  participantCharacterIds,
  storyWorld,
  allNodes,
  onChange,
  onDelete,
  onMove,
}: {
  choice: StoryChoice
  choiceCount: number
  choiceIndex: number
  isKeyLocked: boolean
  participantCharacterIds: string[]
  storyWorld: StoryWorldDocument
  allNodes: { id: string; label: string }[]
  onChange: (choice: StoryChoice) => void
  onDelete: () => void
  onMove: (from: number, to: number) => void
}) {
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
            onChange={(event) => onChange({ ...choice, label: event.target.value })}
            value={choice.label}
          />
        </Field>
        <Field label="下一节点">
          <select
            onChange={(event) => onChange({
              ...choice,
              next_node_id: event.target.value,
            })}
            value={choice.next_node_id}
          >
            {allNodes.map((node) => (
              <option key={node.id} value={node.id}>{node.label}</option>
            ))}
          </select>
        </Field>
        <label className="admin-check-field">
          <input
            checked={isKeyLocked || choice.is_key}
            disabled={isKeyLocked}
            onChange={(event) => onChange({ ...choice, is_key: event.target.checked })}
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
      <RelationshipEffectsEditor
        effects={choice.relationship_effects}
        participantCharacterIds={participantCharacterIds}
        storyWorld={storyWorld}
        onChange={(relationship_effects) => onChange({
          ...choice,
          relationship_effects,
        })}
      />
    </article>
  )
}

/** Edit Story endings inside the selected ReviewedStory. */
function EndingsEditor({
  story,
  onChange,
}: {
  story: ReviewedStory
  onChange: (story: ReviewedStory) => void
}) {
  const updateEndings = (endings: ReviewedStory["endings"]) => {
    onChange({ ...story, endings })
  }
  return (
    <section className="admin-stack is-compact">
      <div className="admin-section-toolbar">
        <h2>结局</h2>
        <button
          className="admin-button is-quiet"
          onClick={() => updateEndings([...story.endings, {
            id: newContentId("ending"),
            title: "新结局",
            summary: "",
            post_ending_message_mode: "disabled",
            unanswered_reply: null,
            post_ending_context: null,
          }])}
          type="button"
        >
          <Plus aria-hidden="true" size={16} />
          新增结局
        </button>
      </div>
      {story.endings.map((ending, index) => (
        <article className="admin-form-card" key={ending.id}>
          <div className="admin-card-heading">
            <code>{ending.id}</code>
            <ItemActions
              index={index}
              length={story.endings.length}
              onDelete={() => updateEndings(
                story.endings.filter((_, endingIndex) => endingIndex !== index),
              )}
              onMove={(from, to) => updateEndings(moveItem(story.endings, from, to))}
            />
          </div>
          <div className="admin-form-grid">
            <Field label="结局名称">
              <input
                onChange={(event) => {
                  const endings = [...story.endings]
                  endings[index] = { ...ending, title: event.target.value }
                  updateEndings(endings)
                }}
                value={ending.title}
              />
            </Field>
            <Field label="结局后消息">
              <select
                onChange={(event) => {
                  const endings = [...story.endings]
                  const postEndingMessageMode = event.target.value as PostEndingMessageMode
                  endings[index] = {
                    ...ending,
                    post_ending_message_mode: postEndingMessageMode,
                    unanswered_reply: postEndingMessageMode === "unanswered"
                      ? ending.unanswered_reply ?? ""
                      : null,
                    post_ending_context: postEndingMessageMode === "llm"
                      ? ending.post_ending_context
                      : null,
                  }
                  updateEndings(endings)
                }}
                value={ending.post_ending_message_mode}
              >
                {(Object.keys(POST_ENDING_MODE_LABELS) as PostEndingMessageMode[])
                  .map((mode) => (
                    <option key={mode} value={mode}>
                      {POST_ENDING_MODE_LABELS[mode]}
                    </option>
                  ))}
              </select>
            </Field>
            <Field label="结局摘要" wide>
              <textarea
                onChange={(event) => {
                  const endings = [...story.endings]
                  endings[index] = { ...ending, summary: event.target.value }
                  updateEndings(endings)
                }}
                rows={3}
                value={ending.summary}
              />
            </Field>
            <Field label="无法答复提示" wide>
              <textarea
                disabled={ending.post_ending_message_mode !== "unanswered"}
                onChange={(event) => {
                  const endings = [...story.endings]
                  endings[index] = {
                    ...ending,
                    unanswered_reply: event.target.value,
                  }
                  updateEndings(endings)
                }}
                rows={2}
                value={ending.unanswered_reply ?? ""}
              />
            </Field>
            <Field label="结局后角色上下文" wide>
              <textarea
                disabled={ending.post_ending_message_mode !== "llm"}
                onBlur={(event) => {
                  const endings = [...story.endings]
                  endings[index] = {
                    ...ending,
                    post_ending_context: event.target.value.trim() || null,
                  }
                  updateEndings(endings)
                }}
                onChange={(event) => {
                  const endings = [...story.endings]
                  endings[index] = {
                    ...ending,
                    post_ending_context: event.target.value || null,
                  }
                  updateEndings(endings)
                }}
                rows={4}
                value={ending.post_ending_context ?? ""}
              />
            </Field>
          </div>
        </article>
      ))}
    </section>
  )
}

/** Edit ordered CharacterDecision rules and their closed typed predicates. */
function DecisionsEditor({
  story,
  storyWorld,
  onChange,
}: {
  story: ReviewedStory
  storyWorld: StoryWorldDocument
  onChange: (story: ReviewedStory) => void
}) {
  const allNodes = useMemo(() => storyNodeOptions(story), [story])
  const updateDecisions = (character_decisions: CharacterDecision[]) => {
    onChange({ ...story, character_decisions })
  }
  const decisionTriggers = story.chapters.flatMap((chapter) => (
    chapter.nodes.flatMap((node) => (
      node.presentation_kind === "character" && node.character_id
        ? [{ nodeId: node.id, characterId: node.character_id }]
        : []
    ))
  ))
  const firstTrigger = decisionTriggers[0]
  const firstNodeId = allNodes[0]?.id ?? ""

  return (
    <section className="admin-stack is-compact">
      <div className="admin-section-toolbar">
        <h2>角色决定</h2>
        <button
          className="admin-button is-quiet"
          disabled={!firstTrigger || !firstNodeId}
          onClick={() => updateDecisions([...story.character_decisions, {
            id: newContentId("decision"),
            character_id: firstTrigger?.characterId ?? "",
            trigger_node_id: firstTrigger?.nodeId ?? "",
            rules: [{
              id: newContentId("rule"),
              conditions: [],
              next_node_id: firstNodeId,
              set_flags: [],
              relationship_effects: [],
              reason: "",
            }],
          }])}
          type="button"
        >
          <Plus aria-hidden="true" size={16} />
          新增决定
        </button>
      </div>
      {story.character_decisions.map((decision, decisionIndex) => (
        <DecisionEditor
          allNodes={allNodes}
          decision={decision}
          decisionIndex={decisionIndex}
          decisionCount={story.character_decisions.length}
          key={decision.id}
          story={story}
          storyWorld={storyWorld}
          onChange={(nextDecision) => {
            const decisions = [...story.character_decisions]
            decisions[decisionIndex] = nextDecision
            updateDecisions(decisions)
          }}
          onDelete={() => updateDecisions(
            story.character_decisions.filter((_, index) => index !== decisionIndex),
          )}
          onMove={(from, to) => updateDecisions(
            moveItem(story.character_decisions, from, to),
          )}
        />
      ))}
    </section>
  )
}

/** Edit one CharacterDecision while preserving an unconditional final fallback rule. */
function DecisionEditor({
  decision,
  decisionIndex,
  decisionCount,
  story,
  storyWorld,
  allNodes,
  onChange,
  onDelete,
  onMove,
}: {
  decision: CharacterDecision
  decisionIndex: number
  decisionCount: number
  story: ReviewedStory
  storyWorld: StoryWorldDocument
  allNodes: { id: string; label: string }[]
  onChange: (decision: CharacterDecision) => void
  onDelete: () => void
  onMove: (from: number, to: number) => void
}) {
  const [open, setOpen] = useState(false)
  const participantIds = new Set(story.participants.map((item) => item.character_id))
  const participantCharacters = storyWorld.characters.filter(
    (character) => participantIds.has(character.id),
  )
  const triggerNodes = story.chapters.flatMap((chapter) => (
    chapter.nodes.flatMap((node) => (
      node.presentation_kind === "character"
      && node.character_id === decision.character_id
        ? [{ id: node.id, label: `${chapter.title} / ${node.id}` }]
        : []
    ))
  ))

  const updateRules = (rules: DecisionRule[]) => onChange({ ...decision, rules })

  return (
    <details
      className="admin-node-card admin-decision-card"
      onToggle={(event) => setOpen(event.currentTarget.open)}
      open={open}
    >
      <summary>
        <div>
          <strong>{decision.id}</strong>
          <span>{decision.rules.length} 规则</span>
        </div>
        <ItemActions
          index={decisionIndex}
          length={decisionCount}
          onDelete={onDelete}
          onMove={onMove}
        />
      </summary>
      <div className="admin-node-body">
        <div className="admin-form-grid">
          <Field label="决定 ID"><input disabled value={decision.id} /></Field>
          <Field label="角色">
            <select
              onChange={(event) => onChange({
                ...decision,
                character_id: event.target.value,
                trigger_node_id: story.chapters.flatMap(
                  (chapter) => chapter.nodes,
                ).find((node) => (
                  node.presentation_kind === "character"
                  && node.character_id === event.target.value
                ))?.id ?? "",
              })}
              value={decision.character_id}
            >
              {participantCharacters.map((character) => (
                <option key={character.id} value={character.id}>{character.name}</option>
              ))}
            </select>
          </Field>
          <Field label="触发节点">
            <select
              onChange={(event) => onChange({
                ...decision,
                trigger_node_id: event.target.value,
              })}
              value={decision.trigger_node_id}
            >
              {triggerNodes.map((node) => (
                <option key={node.id} value={node.id}>{node.label}</option>
              ))}
            </select>
          </Field>
        </div>
        <div className="admin-section-toolbar is-subsection">
          <h3>规则</h3>
          <button
            className="admin-button is-quiet"
            onClick={() => {
              const existingFallback = decision.rules[decision.rules.length - 1] || {
                id: newContentId("rule"),
                conditions: [],
                next_node_id: allNodes[0]?.id ?? "",
                set_flags: [],
                relationship_effects: [],
                reason: "",
              }
              const fallback = { ...existingFallback, conditions: [] }
              const conditional: DecisionRule = {
                id: newContentId("rule"),
                conditions: [newPredicate("story_flag", decision.character_id)],
                next_node_id: fallback.next_node_id,
                set_flags: [],
                relationship_effects: [],
                reason: "",
              }
              updateRules([
                ...decision.rules.slice(0, Math.max(0, decision.rules.length - 1)),
                conditional,
                fallback,
              ])
            }}
            type="button"
          >
            <Plus aria-hidden="true" size={16} />
            新增条件规则
          </button>
        </div>
        <div className="admin-stack is-compact">
          {decision.rules.map((rule, ruleIndex) => (
            <DecisionRuleEditor
              allNodes={allNodes}
              conditionalRuleCount={Math.max(0, decision.rules.length - 1)}
              decisionCharacterId={decision.character_id}
              participantCharacterIds={participantCharacters.map(
                (character) => character.id,
              )}
              fallback={ruleIndex === decision.rules.length - 1}
              key={rule.id}
              rule={rule}
              ruleIndex={ruleIndex}
              storyWorld={storyWorld}
              onChange={(nextRule) => {
                const rules = [...decision.rules]
                rules[ruleIndex] = nextRule
                updateRules(rules)
              }}
              onDelete={() => updateRules(
                decision.rules.filter((_, index) => index !== ruleIndex),
              )}
              onMove={(from, to) => {
                const conditionalRules = decision.rules.slice(0, -1)
                updateRules([
                  ...moveItem(conditionalRules, from, to),
                  decision.rules[decision.rules.length - 1],
                ])
              }}
            />
          ))}
        </div>
      </div>
    </details>
  )
}

/** Edit one ordered decision rule; the final fallback cannot gain conditions or move. */
function DecisionRuleEditor({
  rule,
  ruleIndex,
  conditionalRuleCount,
  decisionCharacterId,
  participantCharacterIds,
  fallback,
  storyWorld,
  allNodes,
  onChange,
  onDelete,
  onMove,
}: {
  rule: DecisionRule
  ruleIndex: number
  conditionalRuleCount: number
  decisionCharacterId: string
  participantCharacterIds: string[]
  fallback: boolean
  storyWorld: StoryWorldDocument
  allNodes: { id: string; label: string }[]
  onChange: (rule: DecisionRule) => void
  onDelete: () => void
  onMove: (from: number, to: number) => void
}) {
  return (
    <article className="admin-choice-card">
      <div className="admin-card-heading">
        <div>
          <code>{rule.id}</code>
          <span className="admin-rule-kind">{fallback ? "兜底" : "条件"}</span>
        </div>
        {!fallback ? (
          <ItemActions
            index={ruleIndex}
            length={conditionalRuleCount}
            onDelete={onDelete}
            onMove={onMove}
          />
        ) : null}
      </div>
      {!fallback ? (
        <PredicateList
          characterId={decisionCharacterId}
          conditions={rule.conditions}
          participantCharacterIds={participantCharacterIds}
          storyWorld={storyWorld}
          onChange={(conditions) => onChange({ ...rule, conditions })}
        />
      ) : null}
      <div className="admin-form-grid">
        <Field label="结果节点">
          <select
            onChange={(event) => onChange({ ...rule, next_node_id: event.target.value })}
            value={rule.next_node_id}
          >
            {allNodes.map((node) => (
              <option key={node.id} value={node.id}>{node.label}</option>
            ))}
          </select>
        </Field>
        <FlagField
          label="写入标记"
          onChange={(set_flags) => onChange({ ...rule, set_flags })}
          values={rule.set_flags}
        />
        <Field label="决定原因" wide>
          <textarea
            onChange={(event) => onChange({ ...rule, reason: event.target.value })}
            rows={2}
            value={rule.reason}
          />
        </Field>
      </div>
      <RelationshipEffectsEditor
        effects={rule.relationship_effects}
        participantCharacterIds={participantCharacterIds}
        storyWorld={storyWorld}
        onChange={(relationship_effects) => onChange({
          ...rule,
          relationship_effects,
        })}
      />
    </article>
  )
}

/** Edit the closed predicate list for one conditional decision rule. */
function PredicateList({
  conditions,
  characterId,
  participantCharacterIds,
  storyWorld,
  onChange,
}: {
  conditions: DecisionPredicate[]
  characterId: string
  participantCharacterIds: string[]
  storyWorld: StoryWorldDocument
  onChange: (conditions: DecisionPredicate[]) => void
}) {
  const [conditionKeys, setConditionKeys] = useState(
    () => conditions.map(() => newContentId("predicate")),
  )
  const keyedConditions = conditions.map((predicate, index) => ({
    key: conditionKeys[index],
    predicate,
  }))

  return (
    <div className="admin-stack is-compact admin-predicate-list">
      <div className="admin-section-toolbar is-subsection">
        <h3>条件</h3>
        <button
          className="admin-button is-quiet"
          onClick={() => {
            setConditionKeys((keys) => [...keys, newContentId("predicate")])
            onChange([
              ...conditions,
              newPredicate("story_flag", characterId),
            ])
          }}
          type="button"
        >
          <Plus aria-hidden="true" size={16} />
          新增条件
        </button>
      </div>
      {keyedConditions.map(({ key, predicate }, index) => (
        <PredicateEditor
          key={key}
          predicate={predicate}
          participantCharacterIds={participantCharacterIds}
          storyWorld={storyWorld}
          onChange={(nextPredicate) => {
            const next = [...conditions]
            next[index] = nextPredicate
            onChange(next)
          }}
          onDelete={() => {
            setConditionKeys((keys) => (
              keys.filter((_, conditionIndex) => conditionIndex !== index)
            ))
            onChange(
              conditions.filter((_, conditionIndex) => conditionIndex !== index),
            )
          }}
        />
      ))}
    </div>
  )
}

/** Edit one discriminated predicate without exposing an arbitrary expression field. */
function PredicateEditor({
  predicate,
  participantCharacterIds,
  storyWorld,
  onChange,
  onDelete,
}: {
  predicate: DecisionPredicate
  participantCharacterIds: string[]
  storyWorld: StoryWorldDocument
  onChange: (predicate: DecisionPredicate) => void
  onDelete: () => void
}) {
  return (
    <div className="admin-predicate-row">
      <select
        aria-label="条件类型"
        onChange={(event) => onChange(newPredicate(
          event.target.value as DecisionPredicate["kind"],
          participantCharacterIds[0] ?? "",
        ))}
        value={predicate.kind}
      >
        {(Object.keys(PREDICATE_LABELS) as DecisionPredicate["kind"][]).map(
          (kind) => <option key={kind} value={kind}>{PREDICATE_LABELS[kind]}</option>,
        )}
      </select>
      {predicate.kind === "story_flag" ? (
        <>
          <input
            aria-label="故事标记"
            onChange={(event) => onChange({ ...predicate, flag: event.target.value })}
            value={predicate.flag}
          />
          <BooleanSelect
            label="预期值"
            value={predicate.expected}
            onChange={(expected) => onChange({ ...predicate, expected })}
          />
        </>
      ) : null}
      {predicate.kind === "investigation_result" ? (
        <>
          <input
            aria-label="查证结果 ID"
            onChange={(event) => onChange({
              ...predicate,
              result_id: event.target.value,
            })}
            value={predicate.result_id}
          />
          <PredicateValueEditor
            value={predicate.expected_value}
            onChange={(expected_value) => onChange({
              ...predicate,
              expected_value,
            })}
          />
        </>
      ) : null}
      {predicate.kind === "player_commitment" ? (
        <>
          <input
            aria-label="承诺动作 ID"
            onChange={(event) => onChange({
              ...predicate,
              action_id: event.target.value,
            })}
            value={predicate.action_id}
          />
          <BooleanSelect
            label="预期值"
            value={predicate.expected}
            onChange={(expected) => onChange({ ...predicate, expected })}
          />
        </>
      ) : null}
      {predicate.kind === "current_character" ? (
        <CharacterSelect
          label="当前角色"
          value={predicate.character_id}
          characterIds={participantCharacterIds}
          storyWorld={storyWorld}
          onChange={(character_id) => onChange({ ...predicate, character_id })}
        />
      ) : null}
      {predicate.kind === "relationship_range" ? (
        <>
          <CharacterSelect
            label="关系角色"
            value={predicate.character_id}
            characterIds={participantCharacterIds}
            storyWorld={storyWorld}
            onChange={(character_id) => onChange({ ...predicate, character_id })}
          />
          <div className="admin-predicate-bounds">
            <OptionalNumberInput
              ariaLabel="关系下限"
              onCommit={(minimum_affinity) => onChange({
                ...predicate,
                minimum_affinity,
              })}
              value={predicate.minimum_affinity}
            />
            <OptionalNumberInput
              ariaLabel="关系上限"
              onCommit={(maximum_affinity) => onChange({
                ...predicate,
                maximum_affinity,
              })}
              value={predicate.maximum_affinity}
            />
          </div>
        </>
      ) : null}
      <button
        className="admin-text-button is-danger"
        onClick={onDelete}
        type="button"
      >
        删除
      </button>
    </div>
  )
}

/** Edit a typed string, number, or boolean predicate value. */
function PredicateValueEditor({
  value,
  onChange,
}: {
  value: PredicateValue
  onChange: (value: PredicateValue) => void
}) {
  const valueKind = typeof value
  return (
    <span className="admin-predicate-value">
      <select
        aria-label="结果值类型"
        onChange={(event) => {
          const kind = event.target.value
          onChange(kind === "boolean" ? false : kind === "number" ? 0 : "")
        }}
        value={valueKind}
      >
        <option value="string">文本</option>
        <option value="number">数字</option>
        <option value="boolean">布尔值</option>
      </select>
      {valueKind === "boolean" ? (
        <BooleanSelect
          label="结果值"
          value={value as boolean}
          onChange={onChange}
        />
      ) : valueKind === "number" ? (
        <NumberInput
          ariaLabel="结果值"
          onCommit={onChange}
          step="any"
          value={value as number}
        />
      ) : (
        <input
          aria-label="结果值"
          onChange={(event) => onChange(event.target.value)}
          type="text"
          value={String(value)}
        />
      )}
    </span>
  )
}

/** Edit an optional finite numeric boundary, preserving an empty value as undefined. */
function OptionalNumberInput({
  ariaLabel,
  value,
  onCommit,
}: {
  ariaLabel: string
  value: number | undefined
  onCommit: (value: number | undefined) => void
}) {
  return (
    <input
      aria-label={ariaLabel}
      defaultValue={value ?? ""}
      key={value ?? "empty"}
      onBlur={(event) => {
        const rawValue = event.currentTarget.value.trim()
        if (!rawValue) {
          onCommit(undefined)
          return
        }
        const nextValue = Number(rawValue)
        if (!Number.isFinite(nextValue)) {
          event.currentTarget.value = value === undefined ? "" : String(value)
          return
        }
        onCommit(nextValue)
      }}
      step="any"
      type="number"
    />
  )
}

/** Render a compact boolean selector with a precise accessible label. */
function BooleanSelect({
  label,
  value,
  onChange,
}: {
  label: string
  value: boolean
  onChange: (value: boolean) => void
}) {
  return (
    <select
      aria-label={label}
      onChange={(event) => onChange(event.target.value === "true")}
      value={String(value)}
    >
      <option value="true">是</option>
      <option value="false">否</option>
    </select>
  )
}

/** Render a Character selector owned by the current StoryWorld document. */
function CharacterSelect({
  label,
  value,
  characterIds,
  storyWorld,
  onChange,
}: {
  label: string
  value: string
  characterIds?: string[]
  storyWorld: StoryWorldDocument
  onChange: (value: string) => void
}) {
  const allowedCharacterIds = characterIds ? new Set(characterIds) : null
  return (
    <select
      aria-label={label}
      onChange={(event) => onChange(event.target.value)}
      value={value}
    >
      {storyWorld.characters.flatMap((character) => (
        !allowedCharacterIds || allowedCharacterIds.has(character.id)
          ? [(
              <option key={character.id} value={character.id}>
                {character.name}
              </option>
            )]
          : []
      ))}
    </select>
  )
}

/** Edit deterministic relationship effects shared by choices and decision rules. */
function RelationshipEffectsEditor({
  effects,
  participantCharacterIds,
  storyWorld,
  onChange,
}: {
  effects: RelationshipEffect[]
  participantCharacterIds: string[]
  storyWorld: StoryWorldDocument
  onChange: (effects: RelationshipEffect[]) => void
}) {
  const updateEffect = (index: number, effect: RelationshipEffect) => {
    const next = [...effects]
    next[index] = effect
    onChange(next)
  }
  const firstCharacterId = participantCharacterIds[0] ?? ""
  return (
    <>
      <div className="admin-section-toolbar is-subsection">
        <h3>关系影响</h3>
        <button
          className="admin-button is-quiet"
          disabled={!firstCharacterId}
          onClick={() => onChange([
            ...effects,
            newRelationshipEffect(firstCharacterId),
          ])}
          type="button"
        >
          <Plus aria-hidden="true" size={16} />
          新增影响
        </button>
      </div>
      {effects.map((effect, effectIndex) => (
        <div className="admin-effect-row" key={`${effect.character_id}-${effectIndex}`}>
          <CharacterSelect
            label="角色"
            value={effect.character_id}
            characterIds={participantCharacterIds}
            storyWorld={storyWorld}
            onChange={(character_id) => updateEffect(effectIndex, {
              ...effect,
              character_id,
            })}
          />
          <NumberInput
            ariaLabel="关系变化"
            onCommit={(affinity_delta) => updateEffect(effectIndex, {
              ...effect,
              affinity_delta,
            })}
            step="any"
            value={effect.affinity_delta}
          />
          <input
            aria-label="变化原因"
            onChange={(event) => updateEffect(effectIndex, {
              ...effect,
              reason: event.target.value,
            })}
            value={effect.reason}
          />
          <input
            aria-label="关系标记"
            onBlur={(event) => updateEffect(effectIndex, {
              ...effect,
              set_flags: splitFlags(event.target.value),
            })}
            onChange={(event) => updateEffect(effectIndex, {
              ...effect,
              set_flags: event.target.value.split(/[,，]/).map((item) => item.trim()),
            })}
            value={joinFlags(effect.set_flags)}
          />
          <button
            className="admin-text-button is-danger"
            onClick={() => onChange(
              effects.filter((_, index) => index !== effectIndex),
            )}
            type="button"
          >
            删除
          </button>
        </div>
      ))}
    </>
  )
}

/** Edit a comma-separated reviewed flag list while storing normalized IDs. */
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
        onChange={(event) => onChange(
          event.target.value.split(/[,，]/).map((item) => item.trim()),
        )}
        value={joinFlags(values)}
      />
    </Field>
  )
}
