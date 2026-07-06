import { useState, useEffect, useCallback, useRef } from "react"

export type Notification = {
  id: string
  user_id: string
  notification_type: string
  title: string
  content: string
  data: Record<string, unknown>
  created_at: string
  read: boolean
  space_id: string | null
  space_name: string | null
}

export type NotificationState = {
  notifications: Notification[]
  unreadCount: number
  connected: boolean
  loading: boolean
}

export function useNotifications(userId: string | null) {
  const [state, setState] = useState<NotificationState>({
    notifications: [],
    unreadCount: 0,
    connected: false,
    loading: true,
  })
  const wsRef = useRef<WebSocket | null>(null)
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  const connect = useCallback(() => {
    if (!userId || wsRef.current?.readyState === WebSocket.OPEN) return

    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:"
    const wsUrl = `${protocol}//${window.location.host}/api/v1/notifications/ws/${encodeURIComponent(userId)}?user_id=${encodeURIComponent(userId)}`

    try {
      const ws = new WebSocket(wsUrl)
      wsRef.current = ws

      ws.onopen = () => {
        setState((prev) => ({ ...prev, connected: true, loading: false }))
      }

      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data)

          if (message.type === "connected") {
            setState((prev) => ({
              ...prev,
              notifications: message.notifications || [],
              unreadCount: message.unread_count || 0,
            }))
          } else if (message.type === "notification") {
            setState((prev) => ({
              ...prev,
              notifications: [message.data, ...prev.notifications],
              unreadCount: prev.unreadCount + 1,
            }))
          } else if (message.type === "notification_read") {
            setState((prev) => ({
              ...prev,
              notifications: prev.notifications.map((n) =>
                n.id === message.notification_id ? { ...n, read: true } : n
              ),
              unreadCount: Math.max(0, prev.unreadCount - 1),
            }))
          } else if (message.type === "all_notifications_read") {
            setState((prev) => ({
              ...prev,
              notifications: prev.notifications.map((n) => ({ ...n, read: true })),
              unreadCount: 0,
            }))
          } else if (message.type === "unread_count") {
            setState((prev) => ({ ...prev, unreadCount: message.count }))
          }
        } catch (e) {
          console.error("Failed to parse notification message:", e)
        }
      }

      ws.onclose = () => {
        setState((prev) => ({ ...prev, connected: false }))
        // Reconnect after 3 seconds
        reconnectTimeoutRef.current = setTimeout(() => {
          connect()
        }, 3000)
      }

      ws.onerror = (error) => {
        console.error("WebSocket error:", error)
        ws.close()
      }
    } catch (e) {
      console.error("Failed to connect WebSocket:", e)
      setState((prev) => ({ ...prev, loading: false }))
    }
  }, [userId])

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current)
    }
    if (wsRef.current) {
      wsRef.current.close()
      wsRef.current = null
    }
    setState((prev) => ({ ...prev, connected: false }))
  }, [])

  const sendMessage = useCallback((message: object) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message))
    }
  }, [])

  const markAsRead = useCallback(
    (notificationId: string) => {
      sendMessage({ type: "mark_read", notification_id: notificationId })
    },
    [sendMessage]
  )

  const markAllAsRead = useCallback(() => {
    sendMessage({ type: "mark_all_read" })
  }, [sendMessage])

  const requestUnreadCount = useCallback(() => {
    sendMessage({ type: "get_unread_count" })
  }, [sendMessage])

  useEffect(() => {
    if (userId) {
      connect()
    }
    return () => {
      disconnect()
    }
  }, [userId, connect, disconnect])

  return {
    ...state,
    connect,
    disconnect,
    markAsRead,
    markAllAsRead,
    requestUnreadCount,
  }
}
