import { useEffect, useState } from "react"

import {
  getAccessStatus,
  PARALLELLINES_AUTH_MODE,
  subscribeAccessStatus,
  type AccessStatus,
} from "../lib/session"

export type SessionAccountState = {
  status: "loading" | "linked" | "guest" | "error"
  name: string
  meta: string
  avatarUrl: string
}

const LOADING_ACCOUNT: SessionAccountState = {
  status: "loading",
  name: "账号加载中",
  meta: "正在确认会话",
  avatarUrl: "",
}

const GUEST_ACCOUNT: SessionAccountState = {
  status: "guest",
  name: "访客模式",
  meta: "独立模式",
  avatarUrl: "",
}

const ERROR_ACCOUNT: SessionAccountState = {
  status: "error",
  name: "账号状态不可用",
  meta: "暂时无法读取会话",
  avatarUrl: "",
}

function accountFromAccessStatus(accessStatus: AccessStatus): SessionAccountState {
  if (accessStatus.auth_mode !== PARALLELLINES_AUTH_MODE) {
    return GUEST_ACCOUNT
  }

  const username = accessStatus.user?.username?.trim() || ""
  const name = accessStatus.user?.display_name?.trim() || username
  if (!accessStatus.user || !username || !name) {
    return ERROR_ACCOUNT
  }

  return {
    status: "linked",
    name,
    meta: `@${username}`,
    avatarUrl: accessStatus.user.avatar_url?.trim() || "",
  }
}

/**
 * Projects the trusted shared session status into account-card copy without using visitor or play identity.
 * @returns Linked account, standalone guest, loading, or error presentation state.
 */
export function useSessionAccount(): SessionAccountState {
  const [account, setAccount] = useState<SessionAccountState>(LOADING_ACCOUNT)

  useEffect(() => {
    let cancelled = false

    const applyStatus = (accessStatus: AccessStatus) => {
      if (!cancelled) setAccount(accountFromAccessStatus(accessStatus))
    }

    const unsubscribe = subscribeAccessStatus(applyStatus)
    getAccessStatus().catch(() => {
      if (!cancelled) setAccount(ERROR_ACCOUNT)
    })

    return () => {
      cancelled = true
      unsubscribe()
    }
  }, [])

  return account
}
