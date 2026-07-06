import { buildOpeningSceneDigest, truncateSceneText } from './sceneSettingProse'
import CharacterAvatar from './CharacterAvatar'

/**
 * OpeningSceneReader — 聊天首屏的场景阅读器。
 * @param {object} props
 * @param {object} props.space — 当前空间对象，只读取公开/已授权字段。
 * @param {object} props.character — 当前选中的 NPC。
 * @param {object} props.playMode — 已推断玩法模式，用于提示用户如何继续。
 * @param {object|null} props.entryState — 入场回访状态；只展示非敏感计数/关系提示。
 * @param {Array} props.starterPrompts — 访客侧入戏回复模板。
 * @param {Function} props.onStarterClick — 点击模板后的草稿填入回调；不自动发送。
 * @param {boolean} props.sending — 当前是否正在发送，控制按钮禁用。
 * @param {boolean} props.fullOpenerVisible — 完整开场白是否已在消息流中展示。
 * @returns {JSX.Element|null} 场景引导 UI；不调用 API、不写入持久状态。
 */
export default function OpeningSceneReader({
  space = {},
  character = null,
  playMode = {},
  entryState = null,
  starterPrompts = [],
  onStarterClick,
  sending = false,
  fullOpenerVisible = true,
}) {
  if (!character) return null

  const digest = buildOpeningSceneDigest({ space, character, playMode, entryState })
  const opener = truncateSceneText(character.first_mes, 180)

  return (
    <section className="opening-scene-reader" aria-label="入场场景与开局提示">
      <div className="opening-scene-reader__header">
        <CharacterAvatar character={character} size="small" />
        <div>
          <span className="mini-label">开场阅读器</span>
          <h4>先入戏，再开口</h4>
          <p>这里不是普通问答助手。读懂当前场景后，用动作 + 对话接住 NPC。</p>
        </div>
        <span className="opening-scene-reader__mode">
          {playMode?.icon} {playMode?.label || '空间体验'}
        </span>
      </div>

      {digest.length > 0 ? (
        <div className="opening-scene-reader__digest" aria-label="当前场景摘要">
          {digest.map((item) => (
            <article key={item.label}>
              <span>{item.label}</span>
              <p>{item.value}</p>
            </article>
          ))}
        </div>
      ) : null}

      <div className="opening-scene-reader__reply-rule">
        <strong>别先问“你会做什么”。</strong>
        <span>试试：<code>*推开门，小声问*</code> 这里刚刚发生了什么？</span>
      </div>

      {opener ? (
        <div className="opening-scene-reader__opener-note">
          <span>{fullOpenerVisible ? '完整开场白在下方第一条消息中。' : 'NPC 开场白'}</span>
          {!fullOpenerVisible ? <p>{opener}</p> : null}
        </div>
      ) : null}

      {starterPrompts.length > 0 ? (
        <div className="opening-scene-reader__starters" aria-label="入戏回复模板">
          <p className="opening-scene-reader__draft-note" data-starter-draft-note>
            点击模板只会填入输入框，不会自动发送；你可以改完再按发送。
          </p>
          {starterPrompts.slice(0, 4).map((starter) => (
            <button
              key={starter.id}
              type="button"
              onClick={() => onStarterClick?.(starter.prompt)}
              disabled={sending}
              title={starter.helper}
            >
              <strong>{starter.label}</strong>
              <span>{starter.prompt}</span>
            </button>
          ))}
        </div>
      ) : null}
    </section>
  )
}
