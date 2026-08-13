import type { AvatarDefinition } from "./avatars"

type AvatarPreviewProps = {
  readonly alt: string
  readonly avatar: AvatarDefinition
  readonly size?: "card" | "choice"
}

/**
 * Crop the authored downward idle frame directly from an adopted 4-by-7 sprite sheet.
 * The source URL stays shared with Phaser; this component never redraws or substitutes the avatar.
 */
export function AvatarPreview({
  alt,
  avatar,
  size = "choice",
}: AvatarPreviewProps) {
  const columns = avatar.texture.sheetWidth / avatar.texture.frameWidth
  const rows = avatar.texture.sheetHeight / avatar.texture.frameHeight
  const previewColumn = avatar.texture.previewFrame % columns
  const previewRow = Math.floor(avatar.texture.previewFrame / columns)

  return (
    <span
      className={`avatarPreview avatarPreview--${size}`}
      aria-hidden={alt === "" ? true : undefined}
    >
      <img
        className="avatarPreview__sheet"
        src={avatar.url}
        alt={alt}
        draggable={false}
        style={{
          width: `${columns * 100}%`,
          height: `${rows * 100}%`,
          left: `${previewColumn * -100}%`,
          top: `${previewRow * -100}%`,
        }}
      />
    </span>
  )
}
