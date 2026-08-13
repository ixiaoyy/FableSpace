export const GAME_DAY_START_MINUTES = 6 * 60
export const GAME_DAY_END_MINUTES = 26 * 60
export const GAME_TIME_STEP_MINUTES = 10
export const GAME_TIME_TICK_MS = 7_000

/** Validate one persisted day-clock value against the authored 06:00–01:50 range. */
export function isValidGameTime(value: unknown): value is number {
  return typeof value === "number"
    && Number.isSafeInteger(value)
    && value >= GAME_DAY_START_MINUTES
    && value < GAME_DAY_END_MINUTES
    && value % GAME_TIME_STEP_MINUTES === 0
}

/** Return the next ten-minute value, or null when the 02:00 day boundary is reached. */
export function nextGameTime(currentMinutes: number): number | null {
  if (!isValidGameTime(currentMinutes)) {
    throw new Error(`Invalid game time: ${currentMinutes}`)
  }

  const nextMinutes = currentMinutes + GAME_TIME_STEP_MINUTES
  return nextMinutes >= GAME_DAY_END_MINUTES ? null : nextMinutes
}

/** Format persisted minutes as an original compact Chinese day-period clock label. */
export function formatGameTime(timeMinutes: number): string {
  if (!isValidGameTime(timeMinutes)) {
    throw new Error(`Invalid game time: ${timeMinutes}`)
  }

  const normalizedMinutes = timeMinutes % (24 * 60)
  const hour24 = Math.floor(normalizedMinutes / 60)
  const minute = normalizedMinutes % 60
  const hour12 = hour24 % 12 || 12
  const dayPeriod = normalizedMinutes < 6 * 60
    ? "凌晨"
    : normalizedMinutes < 12 * 60
      ? "上午"
      : normalizedMinutes < 18 * 60
        ? "下午"
        : "晚上"

  return `${dayPeriod} ${hour12}:${minute.toString().padStart(2, "0")}`
}
