import { useMemo, useState } from 'react'
import CharacterAvatar from './CharacterAvatar'
import CharacterLookSummary from './CharacterLookSummary'
import {
  SYSTEM_CHARACTER_PRESETS,
  SYSTEM_CHARACTER_PRESET_CATEGORIES,
} from './systemCharacterPresets'

export default function SystemCharacterPresetPicker({
  title = '系统预设角色',
  description = '从系统内置角色原型里挑一个，再按你的空间风格继续改。',
  actionLabel = '加入角色',
  disabled = false,
  onPick,
}) {
  const [activeCategory, setActiveCategory] = useState('全部')
  const [query, setQuery] = useState('')

  const categories = useMemo(
    () => ['全部', ...SYSTEM_CHARACTER_PRESET_CATEGORIES],
    [],
  )

  const presets = useMemo(() => {
    const keyword = query.trim().toLowerCase()
    return SYSTEM_CHARACTER_PRESETS.filter((preset) => {
      if (activeCategory !== '全部' && preset.category !== activeCategory) return false
      if (!keyword) return true
      return [
        preset.name,
        preset.category,
        preset.summary,
        preset.description,
        preset.personality,
        preset.tags?.join(' '),
      ].join(' ').toLowerCase().includes(keyword)
    })
  }, [activeCategory, query])

  return (
    <section className="system-character-picker">
      <div className="system-character-picker__header">
        <div>
          <p className="mini-label">系统预设角色</p>
          <strong>{title}</strong>
          <p>{description}</p>
        </div>
        <span className="system-character-picker__count">
          {presets.length}/{SYSTEM_CHARACTER_PRESETS.length}
        </span>
      </div>

      <div className="system-character-picker__toolbar">
        <label className="system-character-picker__search">
          <span>搜索角色</span>
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="搜夜班、档案、向导、技术员..."
            disabled={disabled}
          />
        </label>
        <div className="system-character-picker__filters" aria-label="角色题材筛选">
          {categories.map((category) => (
            <button
              key={category}
              type="button"
              className={activeCategory === category ? 'is-active' : ''}
              onClick={() => setActiveCategory(category)}
              disabled={disabled}
            >
              {category}
            </button>
          ))}
        </div>
      </div>

      {presets.length === 0 ? (
        <div className="system-character-picker__empty">当前分类下还没有可用角色。</div>
      ) : (
        <div className="system-character-picker__grid">
          {presets.map((preset) => (
            <article key={preset.id} className="system-character-card">
              <div className="system-character-card__meta">
                <CharacterAvatar character={preset} size="small" />
                <div>
                  <span>{preset.category}</span>
                  <small>{preset.tags.slice(0, 3).join(' · ')}</small>
                </div>
              </div>
              <div className="system-character-card__title">
                <strong>{preset.name}</strong>
                <em>{preset.summary}</em>
              </div>
              <CharacterLookSummary character={preset} compact />
              <p>{preset.description}</p>
              <div className="system-character-card__tags" aria-label={`${preset.name} 标签`}>
                {preset.tags.map((tag) => (
                  <span key={tag}>{tag}</span>
                ))}
              </div>
              <button
                type="button"
                className="secondary"
                disabled={disabled}
                onClick={() => onPick?.(preset)}
              >
                {actionLabel}
              </button>
            </article>
          ))}
        </div>
      )}
    </section>
  )
}
