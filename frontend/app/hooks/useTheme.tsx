import React, { createContext, useContext, useEffect, useState } from "react"
import { useLocation } from "react-router"

type Theme = "dark" | "light"

interface ThemeContextType {
  theme: Theme
  toggleTheme: () => void
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

function savedTheme(): Theme {
  if (typeof window === "undefined") return "dark"
  return localStorage.getItem("fablespace-theme") === "light" ? "light" : "dark"
}

function supportsLightTheme(pathname: string) {
  return pathname === "/" || pathname === "/discover" || pathname.startsWith("/discover/")
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const location = useLocation()
  const [selectedTheme, setSelectedTheme] = useState<Theme>(savedTheme)
  const effectiveTheme: Theme = supportsLightTheme(location.pathname) ? selectedTheme : "dark"

  useEffect(() => {
    const root = window.document.documentElement
    root.classList.toggle("light", effectiveTheme === "light")
    root.classList.toggle("dark", effectiveTheme === "dark")
    root.setAttribute("data-theme", effectiveTheme)
    localStorage.setItem("fablespace-theme", selectedTheme)
  }, [effectiveTheme, selectedTheme])

  const toggleTheme = () => {
    setSelectedTheme((prev) => (prev === "dark" ? "light" : "dark"))
  }

  return (
    <ThemeContext.Provider value={{ theme: effectiveTheme, toggleTheme }}>
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
