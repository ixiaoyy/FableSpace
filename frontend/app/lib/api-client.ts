type ApiInit = RequestInit & {
  userId?: string
}

const API_BASE = import.meta.env.VITE_API_BASE?.trim() || ""

function apiUrl(path: string) {
  if (/^https?:\/\//i.test(path)) {
    return path
  }
  const normalizedPath = path.startsWith("/") ? path : `/${path}`
  if (!API_BASE) {
    return normalizedPath
  }
  return `${API_BASE.replace(/\/$/, "")}${normalizedPath}`
}

export async function readApiJson<T>(path: string, init: ApiInit = {}): Promise<T> {
  const headers = new Headers(init.headers)
  const userId = String(init.userId || "").trim()
  if (userId) {
    headers.set("X-User-Id", userId)
  }

  const response = await fetch(apiUrl(path), {
    cache: "no-store",
    ...init,
    headers,
  })
  const text = await response.text()
  let payload: unknown = null
  if (text) {
    try {
      payload = JSON.parse(text)
    } catch {
      const snippet = text.trim().slice(0, 80)
      if (!response.ok) {
        throw new Error(`API 请求失败（${response.status}）：${snippet || response.statusText || "非 JSON 响应"}`)
      }
      throw new Error(`API 返回了无效 JSON：${snippet}`)
    }
  }
  if (!response.ok) {
    const message =
      payload && typeof payload === "object" && ("error" in payload || "detail" in payload)
        ? String((payload as { error?: unknown; detail?: unknown }).error || (payload as { detail?: unknown }).detail)
        : `HTTP ${response.status}`
    throw new Error(message)
  }
  return payload as T
}

export async function readApiBlob(path: string, init: ApiInit = {}): Promise<Blob> {
  const headers = new Headers(init.headers)
  const userId = String(init.userId || "").trim()
  if (userId) {
    headers.set("X-User-Id", userId)
  }

  const response = await fetch(apiUrl(path), {
    cache: "no-store",
    ...init,
    headers,
  })
  if (!response.ok) {
    let message = `HTTP ${response.status}`
    try {
      const payload = (await response.json()) as { error?: unknown; detail?: unknown }
      message = String(payload.error || payload.detail || message)
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
