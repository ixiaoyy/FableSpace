import { NEWCOMER_SPACE_CONFIG } from "../../lib/space-runtime-config.js"

export const NEWCOMER_SPACE_ID = NEWCOMER_SPACE_CONFIG.spaceId
export const NEWCOMER_SPACE_QUERY = NEWCOMER_SPACE_CONFIG.query

export function buildGuestNickname() {
  return `旅人${Math.random().toString(36).slice(2, 6).toUpperCase()}`
}

function normalizeSpaceList(payload) {
  if (Array.isArray(payload)) return payload
  if (Array.isArray(payload?.spaces)) return payload.spaces
  return []
}

function isPublicOpenSpace(space) {
  return space?.access === 'public' && space?.status === 'open'
}

function isSpaceClient(value) {
  return Boolean(value)
    && typeof value.getSpace === 'function'
    && typeof value.listSpaces === 'function'
}

async function getDefaultSpaceClient() {
  const { getSpace, listSpaces } = await import('../../lib/spaces')
  return { getSpace, listSpaces }
}

export async function resolveNewcomerSpace(serviceOrUserId = '', maybeUserId = '') {
  const spaceClient = isSpaceClient(serviceOrUserId)
    ? serviceOrUserId
    : await getDefaultSpaceClient()
  const userId = isSpaceClient(serviceOrUserId) ? maybeUserId : serviceOrUserId

  let primaryError = null
  let primarySpace = null

  try {
    primarySpace = await spaceClient.getSpace(NEWCOMER_SPACE_ID, userId)
    if (isPublicOpenSpace(primarySpace)) {
      return primarySpace
    }
    primaryError = new Error('内置新手体验空间当前未公开营业。')
  } catch (err) {
    primaryError = err
  }

  const payload = await spaceClient.listSpaces({
    query: NEWCOMER_SPACE_QUERY,
    access: 'public',
    status: 'open',
  }, userId)
  const candidates = normalizeSpaceList(payload)
  const exactFallback = candidates.find((item) => item?.id === NEWCOMER_SPACE_ID && isPublicOpenSpace(item))
  const publicFallback = candidates.find(isPublicOpenSpace)

  if (exactFallback || publicFallback) {
    return exactFallback || publicFallback
  }

  throw primaryError || new Error('没有找到可用的新手体验空间。')
}
