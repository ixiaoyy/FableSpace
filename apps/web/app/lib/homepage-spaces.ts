import type { Space } from "./spaces"

function firstText(values: unknown[]) {
  return values
    .map((value) => String(value || "").trim())
    .find(Boolean) || ""
}

export function resolveHomepageSpaceCover(space: Space) {
  const record = space as Record<string, unknown>
  const leadCharacter = Array.isArray(space.characters) ? space.characters[0] : undefined
  return firstText([
    record.cover_url,
    record.cover_image_url,
    record.image_url,
    leadCharacter?.image_url,
    leadCharacter?.avatar,
    leadCharacter?.sprites?.neutral,
  ])
}
