import type { PlayerRole } from "../lib/story-worlds"

export function PlayerRoleOption({
  playerRole,
  selected,
  disabled,
  onSelect,
}: {
  playerRole: PlayerRole
  selected: boolean
  disabled: boolean
  onSelect: () => void
}) {
  return (
    <button
      className="annieStoryIdentityOption"
      type="button"
      aria-pressed={selected}
      disabled={disabled}
      onClick={onSelect}
    >
      <span className="annieStoryIdentityPortrait">
        {playerRole.avatar_url ? (
          <img src={playerRole.avatar_url} alt="" />
        ) : (
          <span aria-hidden="true">{playerRole.name.slice(0, 1)}</span>
        )}
      </span>
      <span className="annieStoryIdentityCopy">
        <span>
          <strong>{playerRole.name}</strong>
          <small>{playerRole.social_position}</small>
        </span>
        <span>{playerRole.background}</span>
      </span>
      <span className="annieStoryIdentityCheck" aria-hidden="true">
        {selected ? "已选" : "选择"}
      </span>
    </button>
  )
}
