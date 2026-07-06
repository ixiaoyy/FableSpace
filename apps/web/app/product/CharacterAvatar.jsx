import { getActiveCharacterLook } from './characterLooks'

const DEFAULT_EXPRESSION = 'neutral'

function normalizeSprites(rawSprites) {
  if (!rawSprites || typeof rawSprites !== 'object') return {}
  return Object.fromEntries(
    Object.entries(rawSprites).filter(([, url]) => typeof url === 'string' && url.trim())
  )
}

export default function CharacterAvatar({
  character,
  size = 'normal',
  isActive = false,
  onClick = null,
  expression = DEFAULT_EXPRESSION,
  spritesOverride = null,
  lookPresetId = '',
  className = '',
}) {
  const sizeMap = {
    small: '40px',
    normal: '56px',
    large: '72px',
  }
  const px = sizeMap[size] || sizeMap.normal
  const sprites = normalizeSprites(spritesOverride || character?.sprites)
  const resolvedExpression = expression || DEFAULT_EXPRESSION
  const avatarUrl = sprites[resolvedExpression] || character?.avatar || sprites.neutral || character?.image_url || null
  const expressionClass = String(resolvedExpression).replace(/[^a-z0-9_-]/gi, '') || DEFAULT_EXPRESSION
  const look = getActiveCharacterLook(character, lookPresetId)
  const displayName = character?.name || '访客'
  const title = character
    ? [displayName, look?.name, resolvedExpression].filter(Boolean).join(' · ')
    : displayName

  return (
    <div
      className={[
        'char-avatar',
        `char-avatar--${expressionClass}`,
        look ? `char-avatar--effect-${look.effectStyle || 'none'}` : 'char-avatar--effect-none',
        isActive ? 'active' : '',
        onClick ? 'clickable' : '',
        className,
      ].filter(Boolean).join(' ')}
      style={{
        width: px,
        height: px,
        flexShrink: 0,
        '--look-accent': look?.accent || '#60a5fa',
        '--look-accent-soft': look?.accentSoft || 'rgba(96, 165, 250, 0.16)',
        '--look-surface': look?.surface || 'linear-gradient(135deg, rgba(30, 41, 59, 0.96), rgba(71, 85, 105, 0.66))',
        '--look-glow': look?.glow || 'rgba(96, 165, 250, 0.2)',
      }}
      onClick={onClick}
      title={title || '角色头像'}
    >
      <div className="char-avatar__frame" aria-hidden="true" />
      {avatarUrl ? (
        <img className="char-avatar__image" src={avatarUrl} alt={displayName} />
      ) : (
        <div className="char-avatar-placeholder">
          {displayName[0] || '?'}
        </div>
      )}
      <div className="char-avatar__fx" aria-hidden="true" />
      {look?.badge ? (
        <span className="char-avatar__badge" aria-hidden="true">{look.badge}</span>
      ) : null}
    </div>
  )
}
