import type { ClientLoaderFunctionArgs } from "react-router"
import { replace } from "react-router"

import {
  clueHuntPath,
  characterPath,
  ownerProfilePath,
  promptEditorPath,
  redirectPathForRequest,
  spaceManagePath,
  spacePath,
  WEB_PATHS,
} from "../lib/web-routes"
import { getClueHuntRoute, getSpace } from "../lib/spaces"

function destinationWithSearch(request: Request, pathname: string) {
  return redirectPathForRequest(request, pathname)
}

function requestUserId(request: Request) {
  const search = new URL(request.url).searchParams
  return (
    search.get("user_id")?.trim()
    || search.get("owner_id")?.trim()
    || search.get("visitor_id")?.trim()
    || ""
  )
}

function missingResource(message: string): never {
  throw new Response(message, { status: 404, statusText: "Not Found" })
}

export async function clientLoader({ params, request }: ClientLoaderFunctionArgs) {
  const requestUrl = new URL(request.url)
  const pathname = requestUrl.pathname.replace(/\/+$/, "") || "/"

  const staticDestinations: Record<string, string> = {
    "/discover": WEB_PATHS.spaces,
    "/quests": WEB_PATHS.quests,
    "/create": WEB_PATHS.createSpace,
    "/owner": WEB_PATHS.owner,
    "/territory": WEB_PATHS.territory,
    "/notifications": WEB_PATHS.notifications,
    "/home-me": WEB_PATHS.myHome,
    "/home/me": WEB_PATHS.myHome,
  }
  const staticDestination = staticDestinations[pathname]
  if (staticDestination) {
    return replace(destinationWithSearch(request, staticDestination))
  }

  if (pathname.startsWith("/creator/")) {
    const ownerId = params.ownerId || ""
    if (!ownerId) missingResource("缺少店主标识")
    return replace(destinationWithSearch(request, ownerProfilePath(ownerId)))
  }

  if (pathname.startsWith("/clue-hunts/")) {
    const routeId = params.routeId || ""
    if (!routeId) missingResource("缺少寻宝路线标识")
    const { route } = await getClueHuntRoute(routeId)
    return replace(destinationWithSearch(request, clueHuntPath(route)))
  }

  if (pathname.startsWith("/space/") || pathname.startsWith("/tavern/")) {
    const legacySpaceId = params.spaceId || ""
    if (!legacySpaceId) missingResource("缺少空间标识")

    const space = await getSpace(legacySpaceId, requestUserId(request), { view: "entry" })
    const legacyCharacterId = params.characterId || ""

    if (legacyCharacterId) {
      const character = space.characters?.find((item) => item.id === legacyCharacterId)
      if (!character) missingResource("未找到目标角色")
      return replace(destinationWithSearch(request, promptEditorPath(space, character)))
    }

    if (pathname.endsWith("/manage")) {
      return replace(destinationWithSearch(request, spaceManagePath(space)))
    }

    return replace(destinationWithSearch(request, spacePath(space)))
  }

  if (pathname.startsWith("/npc/")) {
    const legacySpaceId = params.spaceId || ""
    const legacyCharacterId = params.characterId || ""
    if (!legacySpaceId || !legacyCharacterId) missingResource("缺少空间或角色标识")

    const space = await getSpace(legacySpaceId, requestUserId(request), { view: "entry" })
    const character = space.characters?.find((item) => item.id === legacyCharacterId)
    if (!character) missingResource("未找到目标角色")
    return replace(destinationWithSearch(request, characterPath(space, character)))
  }

  throw new Response("未知的旧网页入口", { status: 404, statusText: "Not Found" })
}

export default function LegacyWebRoute() {
  return null
}
