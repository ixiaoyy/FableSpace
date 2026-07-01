import { useEffect, useMemo, useState } from 'react'
import { buildAiDraftLifecycle } from '../lib/ai-draft-lifecycle.js'
import { getGameplays, saveGameplays as persistGameplays } from '../lib/spaces'
import GameplayDefinitionEditor, { createBlankGameplay } from './GameplayDefinitionEditor'
import { createShortDramaDraftFromSpace } from './shortDramaDraftAssistant'
import {
  OWNER_GAMEPLAY_TEMPLATE_CATEGORIES,
  createOwnerGameplayFromTemplate,
  filterOwnerGameplayTemplates,
} from './ownerGameplayTemplates'
import {
  createShortDramaGameplayFromTemplate,
  SHORT_DRAMA_GAMEPLAY_TEMPLATES,
} from './shortDramaGameplayTemplates'
import {
  STORY_GAMEPLAY_CATEGORIES,
  createStoryGameplayFromTemplate,
  filterStoryGameplayTemplates,
} from './storyMicrogameTemplates'
import './spaceGameplay.css'

const STATUS_LABEL = {
  draft: '草稿',
  published: '已发布',
  disabled: '已停用',
}

function normalizeGameplays(value) {
  return Array.isArray(value) ? value.filter((item) => item && typeof item === 'object') : []
}

function responseGameplays(result) {
  return result?.gameplays ?? result?.gameplay_definitions
}

export default function GameplayManager({ space, ownerId = '', onUpdated, onClose }) {
  const [gameplays, setGameplays] = useState(() => normalizeGameplays(space?.gameplay_definitions))
  const [selectedId, setSelectedId] = useState(gameplays[0]?.id || '')
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [status, setStatus] = useState('')
  const [error, setError] = useState('')
  const [templateQuery, setTemplateQuery] = useState('')
  const [templateCategory, setTemplateCategory] = useState('全部')
  const [storyQuery, setStoryQuery] = useState('')
  const [storyCategory, setStoryCategory] = useState('全部')
  const [assistantConflictHook, setAssistantConflictHook] = useState('')
  const [assistantTone, setAssistantTone] = useState('短剧主持感、节奏清楚、克制、不羞辱任何人')

  const selectedGameplay = useMemo(() => (
    gameplays.find((item) => item.id === selectedId) || gameplays[0] || null
  ), [gameplays, selectedId])
  const ownerTemplates = useMemo(
    () => filterOwnerGameplayTemplates({ query: templateQuery, category: templateCategory }),
    [templateCategory, templateQuery],
  )
  const storyTemplates = useMemo(
    () => filterStoryGameplayTemplates({ query: storyQuery, category: storyCategory }),
    [storyCategory, storyQuery],
  )
  const gameplayDraftLifecycle = buildAiDraftLifecycle('gameplay')

  useEffect(() => {
    let ignore = false
    async function loadGameplays() {
      if (!space?.id) return
      setLoading(true)
      setError('')
      try {
        const result = await getGameplays(space.id, ownerId)
        if (ignore) return
        const next = normalizeGameplays(responseGameplays(result))
        setGameplays(next)
        setSelectedId((current) => current && next.some((item) => item.id === current) ? current : (next[0]?.id || ''))
      } catch (err) {
        if (!ignore) setError(`读取玩法失败：${err.message}`)
      } finally {
        if (!ignore) setLoading(false)
      }
    }
    loadGameplays()
    return () => { ignore = true }
  }, [space?.id, ownerId])

  function addGameplay() {
    const next = createBlankGameplay(gameplays.length + 1)
    setGameplays((prev) => [next, ...prev])
    setSelectedId(next.id)
    setStatus('新玩法已加入草稿，填写目标后保存。')
  }

  function addShortDramaGameplay(template) {
    const next = createShortDramaGameplayFromTemplate(template, gameplays.length + 1)
    if (!next) return
    setGameplays((prev) => [next, ...prev])
    setSelectedId(next.id)
    setStatus('短剧模板已生成本地草稿；请检查内容、按本空间调整，并保存/发布后访客才可见。')
  }

  function addAssistantShortDramaDraft() {
    const next = createShortDramaDraftFromSpace(space, {
      conflictHook: assistantConflictHook,
      tone: assistantTone,
    }, gameplays.length + 1)
    if (!next) return
    setGameplays((prev) => [next, ...prev])
    setSelectedId(next.id)
    setStatus('AI 短剧草稿助手已生成本地未发布建议；请编辑、删除或保存后再决定是否发布。')
  }

  function addOwnerTemplateGameplay(template) {
    const next = createOwnerGameplayFromTemplate(template, gameplays.length + 1)
    if (!next) return
    setGameplays((prev) => [next, ...prev])
    setSelectedId(next.id)
    setStatus('玩法模板已生成本地草稿；店主检查并点击”保存玩法”后才会写入空间，发布状态为 draft。')
  }

  function addStoryGameplay(template) {
    const next = createStoryGameplayFromTemplate(template, gameplays.length + 1)
    if (!next) return
    setGameplays((prev) => [next, ...prev])
    setSelectedId(next.id)
    setStatus('剧情微玩法模板已生成本地草稿；请检查内容、按本空间调整，并保存/发布后访客才可见。')
  }

  function updateGameplay(nextGameplay) {
    setGameplays((prev) => prev.map((item) => item.id === nextGameplay.id ? nextGameplay : item))
    setStatus('')
  }

  function removeGameplay(targetId) {
    setGameplays((prev) => prev.filter((item) => item.id !== targetId))
    if (selectedId === targetId) {
      const next = gameplays.find((item) => item.id !== targetId)
      setSelectedId(next?.id || '')
    }
    setStatus('已从本地列表移除，保存后生效。')
  }

  async function saveGameplayDefinitions() {
    if (!space?.id) return
    setSaving(true)
    setError('')
    setStatus('')
    try {
      const result = await persistGameplays(space.id, gameplays, ownerId)
      const next = normalizeGameplays(responseGameplays(result))
      setGameplays(next)
      setSelectedId((current) => current && next.some((item) => item.id === current) ? current : (next[0]?.id || ''))
      setStatus('玩法已保存。published 对访客可见，disabled 会从入口隐藏。')
      onUpdated?.({ ...space, gameplay_definitions: next })
    } catch (err) {
      setError(`保存玩法失败：${err.message}`)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content panel gameplay-manager" onClick={(event) => event.stopPropagation()}>
        <header className="modal-header gameplay-manager__header">
          <div>
            <p className="mini-label">空间玩法</p>
            <h3>{space?.name || '当前空间'} · 玩法管理</h3>
            <p className="note muted">只填目标、氛围和结算即可；有 AI 时由 AI Director 决定下一步，无 AI 时走随机事件。</p>
          </div>
          <button className="close-btn" type="button" onClick={onClose}>&times;</button>
        </header>

        {loading ? <div className="owner-loading">正在读取玩法...</div> : null}
        {error ? <div className="owner-error">{error}</div> : null}
        {status ? <div className="owner-package-status">{status}</div> : null}
        <section className="ai-draft-lifecycle gameplay-manager__lifecycle" aria-label="AI 草稿生命周期">
          <strong>{gameplayDraftLifecycle.title}</strong>
          <p>{gameplayDraftLifecycle.summary}</p>
          <div className="ai-draft-lifecycle__steps">
            {gameplayDraftLifecycle.steps.map((step) => (
              <span key={step.id}>
                <b>{step.label}</b>
                <small>{step.helper}</small>
              </span>
            ))}
          </div>
          <ul>
            {gameplayDraftLifecycle.guardrails.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </section>

        <div className="gameplay-manager__layout">
          <aside className="gameplay-manager__list">
            <button type="button" className="btn-primary" onClick={addGameplay}>+ 添加玩法</button>
            <section className="owner-gameplay-template-panel" aria-label="店主玩法模板库">
              <div className="owner-gameplay-template-panel__header">
                <span className="mini-label">玩法模板库</span>
                <small>复用 GameplayDefinition，只生成草稿；不含战斗、等级、装备、排行或交易奖励。</small>
              </div>
              <label className="owner-gameplay-template-search">
                <span>搜索模板</span>
                <input
                  type="search"
                  value={templateQuery}
                  onChange={(event) => setTemplateQuery(event.target.value)}
                  placeholder="线索、回访、陪伴、物件..."
                />
              </label>
              <div className="owner-gameplay-template-filters" aria-label="玩法模板分类">
                {OWNER_GAMEPLAY_TEMPLATE_CATEGORIES.map((category) => (
                  <button
                    key={category}
                    type="button"
                    className={templateCategory === category ? 'is-active' : ''}
                    onClick={() => setTemplateCategory(category)}
                  >
                    {category}
                  </button>
                ))}
              </div>
              <div className="owner-gameplay-template-grid">
                {ownerTemplates.length > 0 ? ownerTemplates.map((template) => (
                  <button
                    key={template.id}
                    type="button"
                    className="owner-gameplay-template-card"
                    onClick={() => addOwnerTemplateGameplay(template)}
                    title={template.bestFor}
                  >
                    <span>{template.badge}</span>
                    <strong>{template.title}</strong>
                    <small>{template.duration} · {template.bestFor}</small>
                    <em>{template.summary}</em>
                  </button>
                )) : (
                  <p className="note muted">没有匹配模板。换个关键词或切回“全部”。</p>
                )}
              </div>
            </section>
            <section className="short-drama-assistant-panel" aria-label="AI 短剧草稿助手">
              <div className="short-drama-assistant-panel__header">
                <span className="mini-label">AI 短剧草稿助手</span>
                <strong>基于当前空间设定生成未发布草稿</strong>
                <small>短剧草稿是本地未发布建议；不会覆盖已有玩法，保存前不写入空间，发布前访客不可见。</small>
              </div>
              <label className="short-drama-assistant-field">
                <span>冲突钩子</span>
                <textarea
                  value={assistantConflictHook}
                  onChange={(event) => setAssistantConflictHook(event.target.value)}
                  rows={3}
                  placeholder="例如：有人说登记册上的名字不是自己写的"
                />
              </label>
              <label className="short-drama-assistant-field">
                <span>语气边界</span>
                <textarea
                  value={assistantTone}
                  onChange={(event) => setAssistantTone(event.target.value)}
                  rows={3}
                  placeholder="轻推理、克制、像竖屏短剧但不羞辱任何人"
                />
              </label>
              <div className="short-drama-assistant-risks" aria-label="短剧草稿风险提示">
                <span>Prompt safety：不索取隐私、不替访客/店主做决定</span>
                <span>版权素材：不套用影视、名人或外部 IP 桥段</span>
                <span>Token 成本：当前只生成本地草稿，不调用外部模型</span>
              </div>
              <button type="button" className="short-drama-assistant-button" onClick={addAssistantShortDramaDraft}>
                生成未发布短剧草稿
              </button>
            </section>
            <section className="short-drama-template-panel" aria-label="短剧玩法模板">
              <div className="short-drama-template-panel__header">
                <span className="mini-label">短剧模板</span>
                <small>只生成草稿，不会自动发布。</small>
              </div>
              <div className="short-drama-template-grid">
                {SHORT_DRAMA_GAMEPLAY_TEMPLATES.map((template) => (
                  <button
                    key={template.id}
                    type="button"
                    className="short-drama-template-card"
                    onClick={() => addShortDramaGameplay(template)}
                    title={template.bestFor}
                  >
                    <span>{template.badge}</span>
                    <strong>{template.title}</strong>
                    <small>{template.duration} · {template.bestFor}</small>
                  </button>
                ))}
              </div>
            </section>
            <section className="story-template-panel" aria-label="剧情微玩法模板">
              <div className="story-template-panel__header">
                <span className="mini-label">剧情微玩法</span>
                <small>叙事型轻量玩法模板（3–5 步），基于现有 GameplayDefinition，不改 schema。</small>
              </div>
              <label className="story-template-search">
                <span>搜索模板</span>
                <input
                  type="search"
                  value={storyQuery}
                  onChange={(event) => setStoryQuery(event.target.value)}
                  placeholder="剧情、故事、目标、抉择..."
                />
              </label>
              <div className="story-template-filters" aria-label="剧情模板分类">
                {STORY_GAMEPLAY_CATEGORIES.map((category) => (
                  <button
                    key={category}
                    type="button"
                    className={storyCategory === category ? 'is-active' : ''}
                    onClick={() => setStoryCategory(category)}
                  >
                    {category}
                  </button>
                ))}
              </div>
              <div className="story-template-grid">
                {storyTemplates.length > 0 ? storyTemplates.map((template) => (
                  <button
                    key={template.id}
                    type="button"
                    className="story-template-card"
                    onClick={() => addStoryGameplay(template)}
                    title={template.bestFor}
                  >
                    <span>{template.badge}</span>
                    <strong>{template.title}</strong>
                    <small>{template.duration} · {template.bestFor}</small>
                    <em>{template.summary}</em>
                  </button>
                )) : (
                  <p className="note muted">没有匹配模板。换个关键词或切回"全部"。</p>
                )}
              </div>
            </section>
            {gameplays.length === 0 ? (
              <p className="note muted">还没有玩法。添加一个草稿后，填写目标并保存即可。</p>
            ) : gameplays.map((gameplay) => (
              <button
                key={gameplay.id}
                type="button"
                className={`gameplay-manager__item ${selectedGameplay?.id === gameplay.id ? 'active' : ''}`}
                onClick={() => setSelectedId(gameplay.id)}
              >
                <strong>{gameplay.title || '未命名玩法'}</strong>
                <span>{STATUS_LABEL[gameplay.status] || gameplay.status || '草稿'}</span>
              </button>
            ))}
          </aside>

          <main className="gameplay-manager__editor">
            {selectedGameplay ? (
              <>
                <GameplayDefinitionEditor gameplay={selectedGameplay} onChange={updateGameplay} />
                <div className="modal-actions gameplay-manager__actions">
                  <button type="button" className="secondary" onClick={() => removeGameplay(selectedGameplay.id)}>删除草稿</button>
                  <button type="button" className="secondary" onClick={onClose}>关闭</button>
                  <button type="button" className="primary" onClick={saveGameplayDefinitions} disabled={saving}>
                    {saving ? '保存中...' : '保存玩法'}
                  </button>
                </div>
              </>
            ) : (
              <div className="owner-empty">
                <p>先添加一个玩法草稿。</p>
                <button type="button" className="btn-primary" onClick={addGameplay}>添加玩法</button>
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  )
}
