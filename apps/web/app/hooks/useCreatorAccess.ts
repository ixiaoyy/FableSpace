import { useEffect, useState } from "react"

import {
  canAccessCreatorTools,
  getAccessStatus,
  subscribeAccessStatus,
  type AccessStatus,
} from "../lib/session"

export type CreatorAccessState = {
  allowed: boolean
  resolved: boolean
  error: string
}

/**
 * Resolves creator access through the shared status cache and follows background refreshes.
 * @returns A fail-closed capability state; standalone legacy mode resolves as allowed.
 */
export function useCreatorAccess(): CreatorAccessState {
  const [state, setState] = useState<CreatorAccessState>({
    allowed: false,
    resolved: false,
    error: "",
  })

  useEffect(() => {
    let cancelled = false

    /** Applies one trusted access response to this mounted capability consumer. */
    const applyStatus = (status: AccessStatus) => {
      if (!cancelled) {
        setState({
          allowed: canAccessCreatorTools(status),
          resolved: true,
          error: "",
        })
      }
    }

    const unsubscribe = subscribeAccessStatus(applyStatus)
    getAccessStatus()
      .catch(() => {
        if (!cancelled) {
          setState({
            allowed: false,
            resolved: true,
            error: "暂时无法确认空间创作权限",
          })
        }
      })

    return () => {
      cancelled = true
      unsubscribe()
    }
  }, [])

  return state
}
