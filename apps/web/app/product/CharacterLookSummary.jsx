import { summarizeCharacterLook } from './characterLooks'

export default function CharacterLookSummary({
  character,
  lookPresetId = '',
  compact = false,
  showDefault = false,
  showSummary = false,
  className = '',
}) {
  const summary = summarizeCharacterLook(character, lookPresetId)

  if (!showDefault && summary.chips.length === 0 && summary.title === '默认形象') {
    return null
  }

  return (
    <div className={['character-look-summary', compact ? 'compact' : '', className].filter(Boolean).join(' ')}>
      <div className="character-look-summary__chips">
        <span className="look-chip look-chip--primary">{summary.title}</span>
        {summary.chips.map((chip) => (
          <span key={chip} className="look-chip">{chip}</span>
        ))}
      </div>
      {showSummary && summary.summary ? (
        <p className="character-look-summary__text">{summary.summary}</p>
      ) : null}
    </div>
  )
}
