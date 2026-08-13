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
        <section className="gameEntry__panel gameEntry__panel--compact" aria-labelledby="returning-title">
          <div className="returningCard">
            <AvatarPreview
              avatar={avatar}
              alt={`${inspection.save.player_name}的角色外观`}
              size="card"
            />
            <div className="returningCard__copy">
              <span className="gameEntry__kicker">欢迎回来</span>
              <h2 className="gameEntry__title gameEntry__title--small returningCard__name" id="returning-title">
                {inspection.save.player_name}
              </h2>
              <span className="returningCard__day">第 {inspection.save.day} 天</span>
              <div className="gameEntry__actions">
                <button
                  className="gameEntry__button gameEntry__button--primary"
                  type="button"
                  onClick={() => {
                    setInitialSave(inspection.save)
                    setPhase("playing")
                  }}
                >
                  继续生活
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
          </div>
        </section>
      </div>
    )
  } else {
    const isLegacy = creationMode === "legacy" && inspection.status === "legacy"
    const isRestart = creationMode === "restart"

    entryContent = (
      <div className="gameEntry__screen gameEntry__screen--dense">
        <section className="gameEntry__panel" aria-labelledby="create-character-title">
          <span className="gameEntry__kicker">
            {isLegacy ? "补写入住卡" : isRestart ? "新的入住卡" : "第一天 · 搬家登记"}
          </span>
          <h2 className="gameEntry__title gameEntry__title--small" id="create-character-title">
            先认识一下你
          </h2>
          <p className="gameEntry__lead">挑一个喜欢的模样，再给角色起个名字。就这些。</p>

          {isLegacy ? (
            <p className="gameEntry__notice" role="status">
              旧进度还在。提交后会从第 {inspection.progress.day} 天继续。
            </p>
          ) : null}
          {(inspection.status === "invalid" || inspection.status === "unavailable") && !isRestart ? (
            <p className="gameEntry__notice" role="status">{inspection.reason}</p>
          ) : null}
          {isRestart ? (
            <p className="gameEntry__notice" role="status">
              返回不会影响现在的角色；提交这张新卡后才会覆盖旧进度。
            </p>
          ) : null}

          <form className="gameEntry__form" onSubmit={handleCharacterSubmit} noValidate>
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
                        <AvatarPreview avatar={avatar} alt="" />
                        <span className="avatarChoice__copy">
                          <span className="avatarChoice__label">{avatar.label}</span>
                          <span className="avatarChoice__state">
                            {selected ? "✓ 已选择" : "选择此外观"}
                          </span>
                        </span>
                      </span>
                    </label>
                  )
                })}
              </div>
            </fieldset>

            <div className="nameField">
              <label htmlFor="player-name">
                角色名字
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
                placeholder="写下名字"
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

            <div className="gameEntry__actions">
              <button className="gameEntry__button gameEntry__button--primary" type="submit">
                {isLegacy ? "保存并继续" : "搬进苔野"}
              </button>
              {isRestart ? (
                <button
                  className="gameEntry__button gameEntry__button--quiet"
                  type="button"
                  onClick={() => {
                    setNameError(null)
                    setPhase("returning")
                  }}
                >
                  返回原来的生活
                </button>
              ) : null}
            </div>
          </form>
        </section>
      </div>
    )
  }

  return (
    <>
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
            <span><kbd>E</kbd><kbd>空格</kbd> 交互</span>
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
