import { useEffect, useMemo, useState } from 'react'
import {
  DEFAULT_OWNER_PREVIEW_MESSAGE,
  buildOwnerDialoguePreview,
  normalizeOwnerDialogueDryRunPreview,
  summarizePreviewCharacter,
} from './dialoguePreviewSimulator'
import { errorMessage, previewOwnerDialogueDryRun } from '../lib/taverns'

export default function OwnerDialoguePreviewSimulator({
  tavern,
  characters = [],
  ownerId = '',
  disabled = false,
}) {
  const availableCharacters = useMemo(
    () => (Array.isArray(characters) ? characters.filter((character) => character?.name) : []),
    [characters],
  )
  const [selectedCharacterId, setSelectedCharacterId] = useState(() => availableCharacters[0]?.id || availableCharacters[0]?.name || '')
  const [visitorMessage, setVisitorMessage] = useState(DEFAULT_OWNER_PREVIEW_MESSAGE)
  const [preview, setPreview] = useState(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (availableCharacters.length === 0) {
      setSelectedCharacterId('')
      setPreview(null)
      return
    }
    const stillExists = availableCharacters.some((character) => getCharacterOptionId(character) === selectedCharacterId)
    if (!stillExists) {
      setSelectedCharacterId(getCharacterOptionId(availableCharacters[0]))
      setPreview(null)
    }
  }, [availableCharacters, selectedCharacterId])

  const selectedCharacter = useMemo(
    () => availableCharacters.find((character) => getCharacterOptionId(character) === selectedCharacterId) || availableCharacters[0],
    [availableCharacters, selectedCharacterId],
  )

  const characterSummary = useMemo(
    () => selectedCharacter ? summarizePreviewCharacter(selectedCharacter) : null,
    [selectedCharacter],
  )

  async function handlePreview(callModel = false) {
    if (!selectedCharacter) {
      setError('请先新建或导入至少一个 NPC。')
      setPreview(null)
      return
    }
    const fallbackPreview = buildOwnerDialoguePreview({ tavern, character: selectedCharacter, visitorMessage })
    if (!tavern?.id || !ownerId) {
      setError('缺少酒馆或店主身份，暂时只能显示本地模拟降级结果。')
      setPreview(fallbackPreview)
      return
    }
    setError('')
    setLoading(true)
    try {
      const payload = await previewOwnerDialogueDryRun(
        tavern.id,
        {
          character_id: getCharacterOptionId(selectedCharacter),
          message: visitorMessage,
          visitor_id: 'owner-preview-dry-run',
          visitor_name: '预览旅人',
          call_model: Boolean(callModel),
        },
        ownerId,
      )
      setPreview(normalizeOwnerDialogueDryRunPreview(payload, fallbackPreview))
    } catch (err) {
      setError(errorMessage(err))
      setPreview(null)
    } finally {
      setLoading(false)
    }
  }

  return (
    <section className="owner-dialogue-preview" aria-label="店主 AI 对话 prompt dry-run">
      <div className="character-editor-section-heading">
        <span>AI 对话 prompt dry-run</span>
        <small>Owner-only · dry_run。后端组装真实 Tavern / NPC / WorldInfo prompt；默认不调用 LLM，不写入聊天历史 / 记忆 / writeback。</small>
      </div>

      {availableCharacters.length === 0 ? (
        <div className="owner-dialogue-preview__empty">
          先导入、批量创建或新建一个 NPC，再用这里检查开场语气和边界是否像店主想要的样子。
        </div>
      ) : (
        <>
          <div className="owner-dialogue-preview__controls">
            <label>
              <span>选择 NPC</span>
              <select
                value={getCharacterOptionId(selectedCharacter)}
                onChange={(event) => {
                  setSelectedCharacterId(event.target.value)
                  setPreview(null)
                }}
                disabled={disabled}
              >
                {availableCharacters.map((character) => (
                  <option key={getCharacterOptionId(character)} value={getCharacterOptionId(character)}>
                    {character.name || '未命名 NPC'}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span>模拟访客输入</span>
              <textarea
                value={visitorMessage}
                onChange={(event) => {
                  setVisitorMessage(event.target.value)
                  setPreview(null)
                }}
                disabled={disabled}
                rows={3}
                placeholder={DEFAULT_OWNER_PREVIEW_MESSAGE}
              />
            </label>
          </div>

          {characterSummary ? (
            <div className="owner-dialogue-preview__readiness" aria-label="NPC 预览准备度">
              {characterSummary.fieldCoverage.map((item) => (
                <span key={item.label} className={item.done ? 'is-done' : ''}>
                  {item.done ? '✓' : '·'} {item.label}
                </span>
              ))}
            </div>
          ) : null}

          <div className="owner-dialogue-preview__actions">
            <button type="button" className="primary" onClick={() => handlePreview(false)} disabled={disabled || loading}>
              {loading ? '组装中…' : '后端 dry-run 组装'}
            </button>
            <button type="button" className="secondary" onClick={() => handlePreview(true)} disabled={disabled || loading}>
              确认调用模型测试一次
            </button>
            <span>只有点击模型测试才可能消耗店主 provider token；dry-run 结果始终 persisted=false。</span>
          </div>

          {preview ? (
            <div className="owner-dialogue-preview__result" role="status">
              <div className="owner-dialogue-preview__flags">
                <span>dry_run: {String(preview.dry_run)}</span>
                <span>persisted: {String(preview.persisted)}</span>
                <span>model_called: {String(preview.model_called)}</span>
                <span>history_written: {String(preview.history_written)}</span>
                <span>memory_written: {String(preview.memory_written)}</span>
                <span>writeback_written: {String(preview.writeback_written)}</span>
                <span>token_estimate: {String(preview.token_estimate || 0)}</span>
              </div>
              <div className="owner-dialogue-preview__chat">
                <p className="owner-dialogue-preview__bubble is-user">{preview.visitor_message}</p>
                <p className="owner-dialogue-preview__bubble is-assistant">{preview.assistant_message}</p>
              </div>
              <div className="owner-dialogue-preview__flags">
                <span>prompt_messages: {String(preview.message_count || preview.messages?.length || 0)}</span>
                <span>world_info_matched: {String(preview.matched_world_info_count || 0)}</span>
                <span>model_status: {preview.model_status || 'not_requested'}</span>
              </div>
              {preview.model_error ? <div className="char-mgmt-error">{preview.model_error}</div> : null}
              <ul>
                {preview.notes.map((note) => <li key={note}>{note}</li>)}
              </ul>
            </div>
          ) : null}
        </>
      )}

      {error && <div className="char-mgmt-error">{error}</div>}
    </section>
  )
}

function getCharacterOptionId(character) {
  return String(character?.id || character?.name || '')
}
