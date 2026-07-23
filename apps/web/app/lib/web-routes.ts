const FNV64_OFFSET_BASIS = 14_695_981_039_346_656_037n
const FNV64_PRIME = 1_099_511_628_211n
const UINT64_MAX = (1n << 64n) - 1n
const BASE64URL_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_"

export type PublicReferenceNamespace = "space" | "character" | "clue-hunt" | "owner"

type NamedRouteEntity = {
  id: string
  name: string
}

type TitledRouteEntity = {
  id: string
  title: string
}

export const WEB_PATHS = {
  home: "/",
  spaces: "/空间",
  createSpace: "/空间/新建",
  quests: "/任务",
  owner: "/店主",
  territory: "/领地",
  notifications: "/通知",
} as const

const LEGACY_HASH_ALIASES: Record<string, string> = {
  "#space-mainline": "#空间主线",
  "#discover-mainline": "#发现主线",
  "#guide-mainline": "#任务主线",
  "#create-mainline": "#新建主线",
  "#owner-mainline": "#店主主线",
}

function compactUint64(value: bigint) {
  if (value < 0n || value > UINT64_MAX) return ""

  let output = ""
  let buffer = 0
  let bufferedBits = 0

  for (let shift = 56n; shift >= 0n; shift -= 8n) {
    buffer = (buffer << 8) | Number((value >> shift) & 0xffn)
    bufferedBits += 8

    while (bufferedBits >= 6) {
      bufferedBits -= 6
      output += BASE64URL_ALPHABET[(buffer >> bufferedBits) & 0x3f]
      buffer &= (1 << bufferedBits) - 1
    }
  }

  if (bufferedBits > 0) {
    output += BASE64URL_ALPHABET[(buffer << (6 - bufferedBits)) & 0x3f]
  }

  return output
}

/** Derive the stable, non-secret public code for an internal resource identity. */
export function publicCode(namespace: PublicReferenceNamespace, ...identityParts: string[]) {
  if (!identityParts.length || identityParts.some((part) => !String(part || ""))) {
    throw new Error("Public reference identity parts cannot be empty")
  }
  const namespacedIdentity = `${namespace}:${identityParts.map(String).join(":")}`
  let hash = FNV64_OFFSET_BASIS

  for (const byte of new TextEncoder().encode(namespacedIdentity)) {
    hash ^= BigInt(byte)
    hash = BigInt.asUintN(64, hash * FNV64_PRIME)
  }

  return compactUint64(hash)
}

/** Build the compact 11-character public ID used in canonical public URLs. */
export function publicReference(
  _displayName: string,
  namespace: PublicReferenceNamespace,
  ...identityParts: string[]
) {
  return publicCode(namespace, ...identityParts)
}

/** Read a public ID, upgrading the former `~{code}` and `{name}~{20 digits}` formats in memory. */
export function publicReferenceCode(reference: string) {
  const value = String(reference || "")
  const publicIdMatch = /^([A-Za-z0-9_-]{11})$/.exec(value)
  if (publicIdMatch) return publicIdMatch[1]

  const prefixedCompactMatch = /^~([A-Za-z0-9_-]{11})$/.exec(value)
  if (prefixedCompactMatch) return prefixedCompactMatch[1]

  const separatorIndex = value.lastIndexOf("~")
  if (separatorIndex <= 0) return ""
  const legacyCode = value.slice(separatorIndex + 1)
  if (!/^\d{20}$/.test(legacyCode)) return ""

  try {
    return compactUint64(BigInt(legacyCode))
  } catch {
    return ""
  }
}

export function matchesPublicReference(
  reference: string,
  namespace: PublicReferenceNamespace,
  ...identityParts: string[]
) {
  const code = publicReferenceCode(reference)
  return Boolean(code) && code === publicCode(namespace, ...identityParts)
}

function encodePathSegment(value: string) {
  return encodeURIComponent(value).replace(/[!'()*]/g, (character) => (
    `%${character.charCodeAt(0).toString(16).toUpperCase()}`
  ))
}

export function spacePath(space: NamedRouteEntity) {
  const reference = publicReference(space.name, "space", space.id)
  return `${WEB_PATHS.spaces}/${encodePathSegment(reference)}`
}

export function spaceManagePath(space: NamedRouteEntity) {
  return `${spacePath(space)}/管理`
}

export function characterPath(space: NamedRouteEntity, character: NamedRouteEntity) {
  const reference = publicReference(character.name, "character", space.id, character.id)
  return `${spacePath(space)}/角色/${encodePathSegment(reference)}`
}

/**
 * Build a public space deep-link that preserves the visitor's selected NPC target.
 * @param space Hosting space used to construct the canonical public space path.
 * @param character Target NPC encoded as a public reference rather than an internal id.
 * @returns A space URL that selects the target NPC and scrolls to the interaction surface. This function has no side effects.
 */
export function characterSpacePath(space: NamedRouteEntity, character: NamedRouteEntity) {
  const reference = publicReference(character.name, "character", space.id, character.id)
  return `${spacePath(space)}?character_ref=${encodePathSegment(reference)}#空间主线`
}

export function promptEditorPath(space: NamedRouteEntity, character: NamedRouteEntity) {
  return `${characterPath(space, character)}/提示词`
}

export function clueHuntPath(route: TitledRouteEntity) {
  const reference = publicReference(route.title, "clue-hunt", route.id)
  return `/寻宝/${encodePathSegment(reference)}`
}

export function ownerProfilePath(ownerId: string, displayName = "店主") {
  const reference = publicReference(displayName, "owner", ownerId)
  return `${WEB_PATHS.owner}/${encodePathSegment(reference)}`
}

/** Build an ASCII-safe Location value for React Router redirect Responses. */
export function redirectPathForRequest(request: Request, pathname: string) {
  const requestUrl = new URL(request.url)
  const destination = new URL(pathname, requestUrl)

  if (!destination.search) destination.search = requestUrl.search
  if (!destination.hash) {
    destination.hash = typeof window !== "undefined" && window.location.pathname === requestUrl.pathname
      ? window.location.hash
      : requestUrl.hash
  }

  destination.hash = LEGACY_HASH_ALIASES[destination.hash] || destination.hash

  return `${destination.pathname}${destination.search}${destination.hash}`
}
