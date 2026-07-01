import { FableSpaceHomeReference } from "./fable-space-reference-artboards"

type HomeBlackReferenceProps = {
  featuredCitySlices: { id?: string; name?: string; description?: string; visit_count?: number }[]
  onToggleTheme: () => void
}

export function HomeBlackReference(props: HomeBlackReferenceProps) {
  return <FableSpaceHomeReference variant="black" {...props} />
}
