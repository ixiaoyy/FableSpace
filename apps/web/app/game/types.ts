/** Runtime events emitted by BootScene after assets either finish loading or fail. */
export const GAME_RUNTIME_EVENTS = {
  ready: "farm-game:ready",
  error: "farm-game:error",
} as const

/** Callbacks and DOM parent required to create one browser-owned Phaser instance. */
export type CreateGameOptions = {
  parent: HTMLElement
  onReady: () => void
  onError: (reason?: unknown) => void
}
