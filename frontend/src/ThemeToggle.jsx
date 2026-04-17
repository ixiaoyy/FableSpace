import { useState, useEffect } from 'react'

const THEME_STORAGE_KEY = 'fablemap_theme'

export default function ThemeToggle({ compact = false }) {
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem(THEME_STORAGE_KEY) || 'dark'
  })

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem(THEME_STORAGE_KEY, theme)
  }, [theme])

  function toggleTheme() {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'))
  }

  if (compact) {
    return (
      <button
        type="button"
        className="theme-toggle-compact"
        onClick={toggleTheme}
        title={theme === 'dark' ? '切换到浅色模式' : '切换到暗色模式'}
        aria-label={`当前 ${theme === 'dark' ? '暗色' : '浅色'} 模式，点击切换`}
      >
        {theme === 'dark' ? '☀️' : '🌙'}
      </button>
    )
  }

  return (
    <div className="theme-toggle" role="group" aria-label="主题选择">
      <label className={`theme-toggle-option${theme === 'dark' ? ' is-active' : ''}`}>
        <input
          type="radio"
          name="theme"
          value="dark"
          checked={theme === 'dark'}
          onChange={() => setTheme('dark')}
        />
        <span className="theme-toggle-label">
          <span className="theme-icon">🌙</span>
          暗色
        </span>
      </label>
      <label className={`theme-toggle-option${theme === 'light' ? ' is-active' : ''}`}>
        <input
          type="radio"
          name="theme"
          value="light"
          checked={theme === 'light'}
          onChange={() => setTheme('light')}
        />
        <span className="theme-toggle-label">
          <span className="theme-icon">☀️</span>
          浅色
        </span>
      </label>
    </div>
  )
}