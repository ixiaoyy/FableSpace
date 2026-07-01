import { Moon, Sun } from "lucide-react"
import { useEffect, useState } from "react"

export function ThemeToggle() {
  const [theme, setTheme] = useState<"dark" | "light">("dark")

  useEffect(() => {
    const savedTheme = localStorage.getItem("fablespace_theme") || "dark"
    setTheme(savedTheme as "dark" | "light")
    if (savedTheme === "light") {
      document.documentElement.classList.add("light")
      document.documentElement.classList.remove("dark")
      document.documentElement.setAttribute("data-theme", "light")
    } else {
      document.documentElement.classList.add("dark")
      document.documentElement.classList.remove("light")
      document.documentElement.setAttribute("data-theme", "dark")
    }
  }, [])

  const toggleTheme = () => {
    const newTheme = theme === "dark" ? "light" : "dark"
    setTheme(newTheme)
    localStorage.setItem("fablespace_theme", newTheme)
    
    if (newTheme === "light") {
      document.documentElement.classList.add("light")
      document.documentElement.classList.remove("dark")
      document.documentElement.setAttribute("data-theme", "light")
    } else {
      document.documentElement.classList.add("dark")
      document.documentElement.classList.remove("light")
      document.documentElement.setAttribute("data-theme", "dark")
    }
  }

  return (
    <button
      onClick={toggleTheme}
      className="flex h-9 w-9 items-center justify-center rounded-full border border-theme-border bg-theme-card text-theme-muted hover:text-theme-primary transition-colors"
      aria-label="Toggle theme"
    >
      {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </button>
  )
}
