import { FableMapHomeReference } from "./fable-map-reference-artboards"

type HomeBlackReferenceProps = {
  featuredCitySlices: { id?: string; name?: string; description?: string; visit_count?: number }[]
  onToggleTheme: () => void
}

export function HomeBlackReference(props: HomeBlackReferenceProps) {
  return <FableMapHomeReference variant="black" {...props} />
}
