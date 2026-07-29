import { Plus, Upload } from "lucide-react"
import { useRef, useState } from "react"
import type {
  Character,
  RelationshipStage,
  StoryWorldDocument,
} from "../../lib/admin-content"
import {
  Field,
  ItemActions,
  NumberInput,
  moveItem,
  newContentId,
} from "./admin-fields"

export function CharactersPanel({
  storyWorld,
  onChange,
  onUpload,
}: {
  storyWorld: StoryWorldDocument
  onChange: (storyWorld: StoryWorldDocument) => void
  onUpload: (
    characterId: string,
    image: File,
    sourceNote: string,
  ) => Promise<void>
}) {
  const [selectedId, setSelectedId] = useState(
    storyWorld.characters[0]?.id ?? "",
  )

  const requestedIndex = storyWorld.characters.findIndex(
    (character) => character.id === selectedId,
  )
  const selectedIndex = requestedIndex >= 0 ? requestedIndex : 0
  const selectedCharacter =
    storyWorld.characters[selectedIndex] ?? null
  const effectiveSelectedId = selectedCharacter?.id ?? ""

  const updateCharacters = (characters: Character[]) =>
    onChange({ ...storyWorld, characters })

  const updateCharacter = (character: Character) => {
    if (selectedIndex < 0) return
    const characters = [...storyWorld.characters]
    characters[selectedIndex] = character
    updateCharacters(characters)
  }

  const addCharacter = () => {
    const id = newContentId("character")
    const character: Character = {
      id,
      story_world_id: storyWorld.id,
      name: "新角色",
      identity: "",
      age: "",
      social_position: "",
      motive: "",
      secret: "",
      voice: "",
      current_situation: "",
      opening_line: "",
      portrait_url: null,
      relationship_rules: {
        minimum_affinity: -100,
        maximum_affinity: 100,
        initial_affinity: 0,
        natural_turn_max_delta: 2,
        stages: [
          {
            id: newContentId("relationship"),
            label: "初识",
            minimum_affinity: -100,
            attitude: "",
          },
        ],
      },
    }
    updateCharacters([...storyWorld.characters, character])
    setSelectedId(id)
  }

  return (
    <section className="admin-editor-split">
      <aside className="admin-collection-pane">
        <div className="admin-section-toolbar">
          <h2>角色</h2>
          <button
            aria-label="新增角色"
            className="admin-icon-button"
            onClick={addCharacter}
            type="button"
          >
            <Plus aria-hidden="true" size={17} />
          </button>
        </div>
        <div className="admin-collection-list">
          {storyWorld.characters.map((character) => (
            <button
              className={`admin-character-row${
                character.id === effectiveSelectedId ? " is-active" : ""
              }`}
              key={character.id}
              onClick={() => setSelectedId(character.id)}
              type="button"
            >
              <CharacterAvatar character={character} />
              <span>
                <strong>{character.name}</strong>
                <small>{character.identity || character.id}</small>
              </span>
            </button>
          ))}
        </div>
      </aside>

      {selectedCharacter ? (
        <CharacterEditor
          character={selectedCharacter}
          characterIndex={selectedIndex}
          characterCount={storyWorld.characters.length}
          key={selectedCharacter.id}
          onChange={updateCharacter}
          onDelete={() => {
            const characters = storyWorld.characters.filter(
              (character) => character.id !== selectedCharacter.id,
            )
            updateCharacters(characters)
            setSelectedId(characters[0]?.id ?? "")
          }}
          onMove={(from, to) =>
            updateCharacters(moveItem(storyWorld.characters, from, to))
          }
          onUpload={onUpload}
        />
      ) : (
        <div className="admin-empty-state">暂无角色</div>
      )}
    </section>
  )
}

function CharacterEditor({
  character,
  characterIndex,
  characterCount,
  onChange,
  onDelete,
  onMove,
  onUpload,
}: {
  character: Character
  characterIndex: number
  characterCount: number
  onChange: (character: Character) => void
  onDelete: () => void
  onMove: (from: number, to: number) => void
  onUpload: (
    characterId: string,
    image: File,
    sourceNote: string,
  ) => Promise<void>
}) {
  return (
    <div className="admin-editor-pane">
      <div className="admin-character-heading">
        <CharacterAvatar character={character} large />
        <div>
          <h2>{character.name}</h2>
          <code>{character.id}</code>
        </div>
        <ItemActions
          index={characterIndex}
          length={characterCount}
          onDelete={onDelete}
          onMove={onMove}
        />
      </div>

      <CharacterIdentityFields character={character} onChange={onChange} />
      <CharacterPortraitEditor character={character} onUpload={onUpload} />
      <RelationshipRulesEditor character={character} onChange={onChange} />
    </div>
  )
}

function CharacterIdentityFields({
  character,
  onChange,
}: {
  character: Character
  onChange: (character: Character) => void
}) {
  return (
    <section className="admin-form-card">
      <div className="admin-form-grid">
        <Field label="角色名称">
          <input
            onChange={(event) =>
              onChange({ ...character, name: event.target.value })
            }
            value={character.name}
          />
        </Field>
        <Field label="年龄">
          <input
            onChange={(event) =>
              onChange({ ...character, age: event.target.value })
            }
            value={character.age}
          />
        </Field>
        <Field label="角色身份" wide>
          <textarea
            onChange={(event) =>
              onChange({ ...character, identity: event.target.value })
            }
            rows={3}
            value={character.identity}
          />
        </Field>
        <Field label="社会地位" wide>
          <textarea
            onChange={(event) =>
              onChange({
                ...character,
                social_position: event.target.value,
              })
            }
            rows={3}
            value={character.social_position}
          />
        </Field>
        <Field label="角色动机" wide>
          <textarea
            onChange={(event) =>
              onChange({ ...character, motive: event.target.value })
            }
            rows={4}
            value={character.motive}
          />
        </Field>
        <Field label="角色秘密" wide>
          <textarea
            onChange={(event) =>
              onChange({ ...character, secret: event.target.value })
            }
            rows={4}
            value={character.secret}
          />
        </Field>
        <Field label="语言与语气" wide>
          <textarea
            onChange={(event) =>
              onChange({ ...character, voice: event.target.value })
            }
            rows={4}
            value={character.voice}
          />
        </Field>
        <Field label="当前处境" wide>
          <textarea
            onChange={(event) =>
              onChange({
                ...character,
                current_situation: event.target.value,
              })
            }
            rows={4}
            value={character.current_situation}
          />
        </Field>
        <Field label="开场对白" wide>
          <textarea
            onChange={(event) =>
              onChange({ ...character, opening_line: event.target.value })
            }
            rows={4}
            value={character.opening_line}
          />
        </Field>
      </div>
    </section>
  )
}

function CharacterPortraitEditor({
  character,
  onUpload,
}: {
  character: Character
  onUpload: (
    characterId: string,
    image: File,
    sourceNote: string,
  ) => Promise<void>
}) {
  const fileInput = useRef<HTMLInputElement>(null)
  const [sourceNote, setSourceNote] = useState("")
  const [uploading, setUploading] = useState(false)

  return (
    <section className="admin-form-card">
      <div className="admin-card-heading">
        <h2>角色图片</h2>
      </div>
      <div className="admin-portrait-editor">
        <CharacterAvatar character={character} large />
        <Field label="来源">
          <input
            onChange={(event) => setSourceNote(event.target.value)}
            value={sourceNote}
          />
        </Field>
        <input
          accept="image/png,image/jpeg,image/webp"
          hidden
          onChange={async (event) => {
            const image = event.target.files?.[0]
            event.target.value = ""
            if (!image) return
            setUploading(true)
            try {
              await onUpload(character.id, image, sourceNote)
            } finally {
              setUploading(false)
            }
          }}
          ref={fileInput}
          type="file"
        />
        <button
          className="admin-button is-quiet"
          disabled={uploading}
          onClick={() => fileInput.current?.click()}
          type="button"
        >
          <Upload aria-hidden="true" size={17} />
          {uploading ? "上传中" : "上传图片"}
        </button>
      </div>
    </section>
  )
}

function RelationshipRulesEditor({
  character,
  onChange,
}: {
  character: Character
  onChange: (character: Character) => void
}) {
  const rules = character.relationship_rules
  const updateRules = (
    changes: Partial<Character["relationship_rules"]>,
  ) =>
    onChange({
      ...character,
      relationship_rules: { ...rules, ...changes },
    })
  const updateStages = (stages: RelationshipStage[]) =>
    updateRules({ stages })
  const updateStage = (index: number, stage: RelationshipStage) => {
    const stages = [...rules.stages]
    stages[index] = stage
    updateStages(stages)
  }

  return (
    <section className="admin-form-card">
      <div className="admin-card-heading">
        <h2>关系规则</h2>
      </div>
      <div className="admin-form-grid is-four">
        <Field label="下限">
          <NumberInput
            onCommit={(value) => updateRules({ minimum_affinity: value })}
            value={rules.minimum_affinity}
          />
        </Field>
        <Field label="上限">
          <NumberInput
            onCommit={(value) => updateRules({ maximum_affinity: value })}
            value={rules.maximum_affinity}
          />
        </Field>
        <Field label="初始值">
          <NumberInput
            onCommit={(value) => updateRules({ initial_affinity: value })}
            value={rules.initial_affinity}
          />
        </Field>
        <Field label="单轮上限">
          <NumberInput
            onCommit={(value) =>
              updateRules({ natural_turn_max_delta: value })
            }
            value={rules.natural_turn_max_delta}
          />
        </Field>
      </div>

      <div className="admin-section-toolbar is-subsection">
        <h3>关系阶段</h3>
        <button
          className="admin-button is-quiet"
          onClick={() =>
            updateStages([
              ...rules.stages,
              {
                id: newContentId("relationship"),
                label: "新阶段",
                minimum_affinity: rules.initial_affinity,
                attitude: "",
              },
            ])
          }
          type="button"
        >
          <Plus aria-hidden="true" size={16} />
          新增阶段
        </button>
      </div>

      <div className="admin-stack is-compact">
        {rules.stages.map((stage, stageIndex) => (
          <div className="admin-stage-row" key={stage.id}>
            <input
              aria-label="阶段名称"
              onChange={(event) =>
                updateStage(stageIndex, {
                  ...stage,
                  label: event.target.value,
                })
              }
              value={stage.label}
            />
            <NumberInput
              ariaLabel="阶段下限"
              onCommit={(value) =>
                updateStage(stageIndex, {
                  ...stage,
                  minimum_affinity: value,
                })
              }
              value={stage.minimum_affinity}
            />
            <input
              aria-label="角色态度"
              onChange={(event) =>
                updateStage(stageIndex, {
                  ...stage,
                  attitude: event.target.value,
                })
              }
              value={stage.attitude}
            />
            <ItemActions
              index={stageIndex}
              length={rules.stages.length}
              onDelete={() =>
                updateStages(
                  rules.stages.filter((_, index) => index !== stageIndex),
                )
              }
              onMove={(from, to) =>
                updateStages(moveItem(rules.stages, from, to))
              }
            />
          </div>
        ))}
      </div>
    </section>
  )
}

function CharacterAvatar({
  character,
  large,
}: {
  character: Character
  large?: boolean
}) {
  return (
    <span className={`admin-avatar${large ? " is-large" : ""}`}>
      {character.portrait_url ? (
        <img alt="" src={character.portrait_url} />
      ) : (
        character.name.slice(0, 1)
      )}
    </span>
  )
}
