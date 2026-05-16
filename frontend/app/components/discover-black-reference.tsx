import { FableMapDiscoverReference } from "./fable-map-reference-artboards"
import type { Tavern } from "../lib/taverns"

type DiscoverBlackReferenceProps = {
  search: string
  taverns: Tavern[]
  onSearchChange: (value: string) => void
  onClear: () => void
  onTogglePlaceType: (placeTypeId: string) => void
  onToggleSpecialType: (specialTypeId: string) => void
  onToggleCategory: (label: string) => void
  onPublicOnlyChange: (value: boolean) => void
  onOpenOnlyChange: (value: boolean) => void
  onToggleTheme: () => void
}

export function DiscoverBlackReference(props: DiscoverBlackReferenceProps) {
  return <FableMapDiscoverReference variant="black" {...props} />
}
