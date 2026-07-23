import React, { createContext, useCallback, useContext, useEffect, useMemo, useSyncExternalStore } from "react"
import { useLocation } from "react-router"

import { WEB_PATHS } from "../lib/web-routes"

type Theme = "dark" | "light"

interface ThemeContextType {
  theme: Theme
  toggleTheme: () => void
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined)
const THEME_STORAGE_KEY = "fablespace-theme"
const THEME_CHANGE_EVENT = "fablespace-theme-change"

/** Read the persisted theme without affecting the server-rendered first paint. */
function savedTheme(): Theme {
  if (typeof window === "undefined") return "dark"
  try {
    return window.localStorage.getItem(THEME_STORAGE_KEY) === "light" ? "light" : "dark"
  } catch {
    return "dark"
  }
}

/** Keep the server and hydration snapshot stable; client storage is read after hydration. */
function serverThemeSnapshot(): Theme {
  return "dark"
}

/** Subscribe same-tab and cross-tab theme storage changes for useSyncExternalStore. */
function subscribeToThemeChanges(onStoreChange: () => void) {
  if (typeof window === "undefined") return () => undefined
  const handleStorage = (event: StorageEvent) => {
    if (event.key === THEME_STORAGE_KEY) onStoreChange()
  }
  const handleLocalThemeChange = () => onStoreChange()
  window.addEventListener("storage", handleStorage)
  window.addEventListener(THEME_CHANGE_EVENT, handleLocalThemeChange)
  return () => {
    window.removeEventListener("storage", handleStorage)
    window.removeEventListener(THEME_CHANGE_EVENT, handleLocalThemeChange)
  }
}

function supportsLightTheme(pathname: string) {
  return pathname === WEB_PATHS.home
    || pathname === WEB_PATHS.characters
    || pathname.startsWith(`${WEB_PATHS.characters}/`)
    || pathname.startsWith(`${WEB_PATHS.stories}/`)
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const location = useLocation()
  const selectedTheme = useSyncExternalStore(subscribeToThemeChanges, savedTheme, serverThemeSnapshot)
  const effectiveTheme: Theme = supportsLightTheme(location.pathname) ? selectedTheme : "dark"

  useEffect(() => {
    const root = window.document.documentElement
    root.classList.toggle("light", effectiveTheme === "light")
    root.classList.toggle("dark", effectiveTheme === "dark")
    root.setAttribute("data-theme", effectiveTheme)
  }, [effectiveTheme])

  const toggleTheme = useCallback(() => {
    if (typeof window === "undefined") return
    const nextTheme: Theme = selectedTheme === "dark" ? "light" : "dark"
    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, nextTheme)
    } catch {
      return
    }
    window.dispatchEvent(new Event(THEME_CHANGE_EVENT))
  }, [selectedTheme])

  const contextValue = useMemo(
    () => ({ theme: effectiveTheme, toggleTheme }),
    [effectiveTheme, toggleTheme],
  )

  return (
    <ThemeContext.Provider value={contextValue}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const context = useContext(ThemeContext)
  if (context === undefined) {
    throw new Error("useTheme must be used within a ThemeProvider")
  }
  return context
}
