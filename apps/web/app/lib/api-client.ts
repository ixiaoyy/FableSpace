import { normalizeMediaPayload } from "./media-assets"

type ApiInit = RequestInit & {
  userId?: string
}

const API_BASE = import.meta.env.VITE_API_BASE?.trim() || ""
export const SESSION_EXPIRED_EVENT = "fablespace:session-expired"

type ApiEnvelope = {
  data?: unknown
  meta?: {
    ok?: unknown
    error?: unknown
    envelope?: unknown
  }
}

export function apiUrl(path: string) {
  if (/^https?:\/\//i.test(path)) {
    return path
  }
  const normalizedPath = path.startsWith("/") ? path : `/${path}`
  if (!API_BASE) {
    return normalizedPath
  }
  return `${API_BASE.replace(/\/$/, "")}${normalizedPath}`
}

/** Notify the application shell that a protected request lost its session. */
function notifySessionExpired(response: Response) {
  if (response.status === 401 && typeof window !== "undefined") {
    window.dispatchEvent(new Event(SESSION_EXPIRED_EVENT))
  }
}

export async function readApiJson<T>(path: string, init: ApiInit = {}): Promise<T> {
  const headers = new Headers(init.headers)
  const userId = String(init.userId || "").trim()
  if (userId) {
    headers.set("X-User-Id", userId)
  }

  const response = await fetch(apiUrl(path), {
    cache: "no-store",
    credentials: "include",
    ...init,
    headers,
  })
  notifySessionExpired(response)
  const text = await response.text()
  let payload: unknown = null
  if (text) {
    try {
      payload = JSON.parse(text)
    } catch {
      const snippet = text.trim().slice(0, 80)
      if (!response.ok) {
        throw new Error(`API 请求失败（${response.status}）：${snippet || response.statusText || "暂时无法读取返回内容"}`)
      }
      throw new Error(`返回内容暂时无法读取：${snippet}`)
    }
  }
  if (!response.ok) {
    const message = apiErrorMessage(payload, response.status)
    throw new Error(message)
  }
  return normalizeMediaPayload(unwrapApiPayload<T>(payload))
}

export async function readApiBlob(path: string, init: ApiInit = {}): Promise<Blob> {
  const headers = new Headers(init.headers)
  const userId = String(init.userId || "").trim()
  if (userId) {
    headers.set("X-User-Id", userId)
  }

  const response = await fetch(apiUrl(path), {
    cache: "no-store",
    credentials: "include",
    ...init,
    headers,
  })
  notifySessionExpired(response)
  if (!response.ok) {
    let message = `HTTP ${response.status}`
    try {
      const payload = (await response.json()) as unknown
      message = apiErrorMessage(payload, response.status)
    } catch {
      // Keep status fallback for non-JSON binary endpoints.
    }
    throw new Error(message)
  }
  return response.blob()
}


export function jsonInit(method: "POST" | "PUT" | "PATCH" | "DELETE", body?: unknown, userId = ""): ApiInit {
  return {
    method,
    userId,
    headers: { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  }
}

export function unwrapApiPayload<T>(payload: unknown): T {
  if (isApiEnvelope(payload)) {
    return (payload as ApiEnvelope).data as T
  }
  return payload as T
}

function isApiEnvelope(payload: unknown): payload is ApiEnvelope {
  if (!payload || typeof payload !== "object") {
    return false
  }
  const candidate = payload as ApiEnvelope
  return "data" in candidate && !!candidate.meta && typeof candidate.meta === "object"
}

function apiErrorMessage(payload: unknown, status: number): string {
  if (payload && typeof payload === "object") {
    const candidate = payload as { error?: unknown; detail?: unknown; meta?: { error?: unknown } }
    if (candidate.error || candidate.detail) {
      return String(candidate.error || candidate.detail)
    }
    const metaError = candidate.meta?.error
    if (typeof metaError === "string" && metaError.trim()) {
      return metaError
    }
    if (metaError && typeof metaError === "object") {
      const message = (metaError as { message?: unknown; detail?: unknown }).message
      if (message) {
        return String(message)
      }
      const detail = (metaError as { detail?: unknown }).detail
      if (detail) {
        return String(detail)
      }
    }
  }
  return `HTTP ${status}`
}
