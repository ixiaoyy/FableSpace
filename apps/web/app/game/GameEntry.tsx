import { useEffect, useRef, useState, type FormEvent } from "react"

import { AvatarPreview } from "./AvatarPreview"
import { AVATAR_OPTIONS, getAvatar, type AvatarId } from "./avatars"
import { GameCanvas } from "./GameCanvas"
import {
  createNewGameSave,
  inspectGameSave,
  validatePlayerName,
  type GameSave,
  type SaveInspection,
} from "./save"

type EntryPhase = "creating" | "returning" | "playing"
type CreationMode = "new" | "legacy" | "restart"

type RestartDialogProps = {
  readonly open: boolean
  readonly onCancel: () => void
  readonly onConfirm: () => void
}

/**
 * Present a native modal restart confirmation and place initial focus on the safe action.
 * Escape and the cancel button both preserve the existing local save.
 */
function RestartDialog({ open, onCancel, onConfirm }: RestartDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const cancelRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    const dialog = dialogRef.current
    if (dialog === null) return

    if (open) {
      if (!dialog.open) dialog.showModal()
      cancelRef.current?.focus()
      return
    }

    if (dialog.open) dialog.close()
  }, [open])

  return (
    <dialog
      className="restartDialog"
      ref={dialogRef}
      aria-labelledby="restart-dialog-title"
      aria-describedby="restart-dialog-description"
      onCancel={(event) => {
        event.preventDefault()
        onCancel()
      }}
      onKeyDown={(event) => {
        if (event.key !== "Escape") return
        event.preventDefault()
        onCancel()
      }}
    >
      <div className="restartDialog__content">
        <h2 id="restart-dialog-title">重新开始生活？</h2>
        <p id="restart-dialog-description">
          现在的角色和进度会保留，直到你填写并提交一张新的入住卡。
        </p>
        <div className="restartDialog__actions">
          <button
            className="gameEntry__button gameEntry__button--secondary"
            ref={cancelRef}
            type="button"
            onClick={onCancel}
          >
            先不重开
          </button>
          <button
            className="gameEntry__button gameEntry__button--primary"
            type="button"
            onClick={onConfirm}
          >
            填写新角色
          </button>
        </div>
      </div>
    </dialog>
  )
}

/**
 * Own the browser-only entry state, character draft, and one-way handoff into Phaser.
 * Local save inspection is pure; an existing save is overwritten only after a valid form submit.
 */
export function GameEntry() {
  const [inspection] = useState<SaveInspection>(() => inspectGameSave())
  const [phase, setPhase] = useState<EntryPhase>(() => (
    inspection.status === "current" ? "returning" : "creating"
  ))
  const [creationMode, setCreationMode] = useState<CreationMode>(() => (
    inspection.status === "legacy" ? "legacy" : "new"
  ))
  const [playerName, setPlayerName] = useState("")
  const [avatarId, setAvatarId] = useState<AvatarId>(AVATAR_OPTIONS[0].id)
  const [nameError, setNameError] = useState<string | null>(null)
  const [initialSave, setInitialSave] = useState<GameSave | null>(null)
  const [sessionWarning, setSessionWarning] = useState<string | null>(null)
  const [restartDialogOpen, setRestartDialogOpen] = useState(false)
  const nameInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (phase !== "creating" || creationMode !== "restart" || restartDialogOpen) return
    nameInputRef.current?.focus()
  }, [creationMode, phase, restartDialogOpen])

  /** Validate the shared name contract, persist the completed card, then mount Phaser once. */
  function handleCharacterSubmit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault()

    const validatedName = validatePlayerName(playerName)
    if (validatedName.ok === false) {
      setNameError(validatedName.message)
      nameInputRef.current?.focus()
      return
    }

    const legacyProgress = creationMode === "legacy" && inspection.status === "legacy"
      ? inspection.progress
      : undefined

    try {
      const result = createNewGameSave(validatedName.value, avatarId, legacyProgress)
      setNameError(null)
      setSessionWarning(result.persisted === false ? result.error : null)
      setInitialSave(result.save)
      setPhase("playing")
    } catch {
      setNameError("入住卡没有写好，请再试一次。")
      nameInputRef.current?.focus()
    }
  }

  /** Leave the old save untouched and open an empty replacement draft after confirmation. */
  function beginRestartDraft(): void {
    setRestartDialogOpen(false)
    setCreationMode("restart")
    setPlayerName("")
    setAvatarId(AVATAR_OPTIONS[0].id)
    setNameError(null)
    setPhase("creating")
  }

  const isReturning = phase === "returning" && inspection.status === "current"
  const isPlaying = phase === "playing" && initialSave !== null

  let entryContent
  if (isReturning) {
    const avatar = getAvatar(inspection.save.avatar_id)
    entryContent = (
      <div className="gameEntry__screen">
        <section className="gameEntry__panel gameEntry__panel--save" aria-labelledby="returning-title">
          <header className="gameEntry__menuHeader">
            <span>苔野小屋</span>
            <h2 id="returning-title">继续游戏</h2>
          </header>

          <div className="saveSlot">
            <span className="saveSlot__number" aria-hidden="true">1</span>
            <AvatarPreview
              avatar={avatar}
              alt={`${inspection.save.player_name}的角色外观`}
              size="slot"
            />
            <div className="saveSlot__copy">
              <strong className="saveSlot__name">{inspection.save.player_name}</strong>
              <span className="saveSlot__place">苔野小屋</span>
              <span className="saveSlot__day">第 {inspection.save.day} 天</span>
            </div>
            <div className="saveSlot__actions">
              <button
                className="gameEntry__button gameEntry__button--primary"
                type="button"
                onClick={() => {
                  setInitialSave(inspection.save)
                  setPhase("playing")
                }}
              >
                进入农场
              </button>
              <button
                className="gameEntry__button gameEntry__button--quiet"
                type="button"
                onClick={() => setRestartDialogOpen(true)}
              >
                重新开始
              </button>
            </div>
          </div>
        </section>
      </div>
    )
  } else {
    const isLegacy = creationMode === "legacy" && inspection.status === "legacy"
    const isRestart = creationMode === "restart"
    const chosenAvatar = getAvatar(avatarId)

    entryContent = (
      <div className="gameEntry__screen">
        <section className="gameEntry__panel gameEntry__panel--creation" aria-labelledby="create-character-title">
          <header className="gameEntry__menuHeader">
            <span>{isLegacy ? "补全角色" : isRestart ? "新的生活" : "新游戏"}</span>
            <h2 id="create-character-title">创建角色</h2>
          </header>

          <form className="gameEntry__form gameEntry__form--character" onSubmit={handleCharacterSubmit} noValidate>
            <div className="characterStage">
              <div className="characterStage__window">
                <AvatarPreview
                  avatar={chosenAvatar}
                  alt={`当前选择：${chosenAvatar.label}`}
                  size="hero"
                />
              </div>
              <strong className="characterStage__label">{chosenAvatar.label}</strong>
            </div>

            <div className="characterSettings">
              <fieldset className="avatarFieldset">
                <legend>选择外观</legend>
                <div className="avatarChoices">
                  {AVATAR_OPTIONS.map((avatar) => {
                    const selected = avatar.id === avatarId
                    return (
                      <label className="avatarChoice" key={avatar.id}>
                        <input
                          className="avatarChoice__radio"
                          type="radio"
                          name="avatar"
                          value={avatar.id}
                          checked={selected}
                          onChange={() => setAvatarId(avatar.id)}
                        />
                        <span className="avatarChoice__surface">
                          <span aria-hidden="true">{avatar.id === "male" ? "◀" : "▶"}</span>
                          <span className="avatarChoice__label">{avatar.label}</span>
                        </span>
                      </label>
                    )
                  })}
                </div>
              </fieldset>

              <div className="nameField">
                <label htmlFor="player-name">
                  你的名字
                  <span className="nameField__hint" id="player-name-hint">1–12 个字符</span>
                </label>
                <input
                  ref={nameInputRef}
                  id="player-name"
                  name="player-name"
                  type="text"
                  value={playerName}
                  autoComplete="nickname"
                  autoFocus
                  placeholder="输入名字"
                  aria-invalid={nameError === null ? undefined : true}
                  aria-describedby={nameError === null ? "player-name-hint" : "player-name-hint player-name-error"}
                  onChange={(event) => {
                    setPlayerName(event.currentTarget.value)
                    if (nameError !== null) setNameError(null)
                  }}
                />
                {nameError === null ? null : (
                  <p className="nameField__error" id="player-name-error" role="alert">
                    {nameError}
                  </p>
                )}
              </div>

              {isLegacy ? (
                <p className="gameEntry__notice" role="status">
                  保存后从第 {inspection.progress.day} 天继续。
                </p>
              ) : null}
              {(inspection.status === "invalid" || inspection.status === "unavailable") && !isRestart ? (
                <p className="gameEntry__notice" role="status">{inspection.reason}</p>
              ) : null}
              {isRestart ? (
                <p className="gameEntry__notice" role="status">
                  提交新角色后才会覆盖原进度。
                </p>
              ) : null}
            </div>

            <div className="gameEntry__actions gameEntry__actions--menu">
              {isRestart ? (
                <button
                  className="gameEntry__button gameEntry__button--secondary"
                  type="button"
                  onClick={() => {
                    setNameError(null)
                    setPhase("returning")
                  }}
                >
                  返回存档
                </button>
              ) : <span />}
              <button className="gameEntry__button gameEntry__button--primary" type="submit">
                {isLegacy ? "保存并继续" : "开始生活"}
              </button>
            </div>
          </form>
        </section>
      </div>
    )
  }

  return (
    <>
      {/*
        THESIS: a real game menu led by the player sprite, never a skinned web form.
        OWN-WORLD: moss-green sky, honey wood frames, ink-brown type, stepped pixel edges.
        STORY: choose one body, name it, enter the farm; returning players resume one visible save.
        FIRST VIEWPORT: centered menu, player stage left, compact settings right, action at lower right.
        FORM: familiar farming-RPG character and save menus, simplified to this game's real data.
      */}
      <section className="gamePage__cabinet" aria-label="苔野小屋游戏">
        <div className="gamePage__screw gamePage__screw--one" aria-hidden="true" />
        <div className="gamePage__screw gamePage__screw--two" aria-hidden="true" />
        {isPlaying ? <GameCanvas initialSave={initialSave} /> : <div className="gameEntry">{entryContent}</div>}
        {isPlaying && sessionWarning !== null ? (
          <p className="gameEntry__sessionWarning" role="status">{sessionWarning}</p>
        ) : null}
      </section>

      <footer className="gamePage__controls" aria-label={isPlaying ? "操作方式" : "入住卡操作方式"}>
        {isPlaying ? (
          <>
            <span><kbd>WASD</kbd><kbd>↑↓←→</kbd> 移动</span>
            <span>门口自动进出 · 床边确认睡觉</span>
          </>
        ) : (
          <>
            <span><kbd>Tab</kbd> 切换选项</span>
            <span><kbd>Enter</kbd> 确认</span>
          </>
        )}
      </footer>

      <RestartDialog
        open={restartDialogOpen}
        onCancel={() => setRestartDialogOpen(false)}
        onConfirm={beginRestartDraft}
      />
    </>
  )
}
