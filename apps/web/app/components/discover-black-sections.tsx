import type { Space } from "../lib/spaces"

export type DiscoverBlackReferenceProps = {
  search: string
  spaces: Space[]
  onSearchChange: (value: string) => void
  onClear: () => void
  onTogglePlaceType: (placeTypeId: string) => void
  onToggleSpecialType: (specialTypeId: string) => void
  onToggleCategory: (label: string) => void
  onPublicOnlyChange: (value: boolean) => void
  onOpenOnlyChange: (value: boolean) => void
  onToggleTheme: () => void
}

export function DiscoverBlackSearchSection() {
  return null
}
