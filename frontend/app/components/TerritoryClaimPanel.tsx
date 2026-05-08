/**
 * TerritoryClaimPanel - 领地申领面板
 *
 * 让用户选择地图位置、设置领地类型和半径，然后申领领地。
 */

import { useState, useCallback, type CSSProperties } from 'react'
import {
  TERRITORY_TYPE_META,
  TERRITORY_DEFAULT_RADIUS,
  TERRITORY_RADIUS_LIMITS,
  checkTerritoryAvailability,
  claimTerritory,
} from '../lib/territoryService.js'

const TERRITORY_TYPE_OPTIONS = Object.entries(TERRITORY_TYPE_META).map(([type, meta]) => ({
  type,
  ...meta,
}))

export default function TerritoryClaimPanel({
  userId,
  tavernId,
  initialLat,
  initialLon,
  onClaimSuccess,
  onCancel,
}) {
  const [selectedType, setSelectedType] = useState('tavern')
  const [centerLat, setCenterLat] = useState(initialLat || 39.9042)
  const [centerLon, setCenterLon] = useState(initialLon || 116.4074)
  const [radius, setRadius] = useState(TERRITORY_DEFAULT_RADIUS.tavern)
  const [name, setName] = useState('')
  const [checking, setChecking] = useState(false)
  const [claiming, setClaiming] = useState(false)
  const [checkResult, setCheckResult] = useState(null)
  const [error, setError] = useState('')

  const currentTypeMeta = TERRITORY_TYPE_META[selectedType] || {}
  const currentLimits = TERRITORY_RADIUS_LIMITS[selectedType] || { min: 10, max: 500 }

  const handleTypeChange = useCallback((type) => {
    setSelectedType(type)
    setRadius(TERRITORY_DEFAULT_RADIUS[type] || 50)
    setCheckResult(null)
    setError('')
  }, [])

  const handleRadiusChange = useCallback((e) => {
    const value = Number(e.target.value)
    setRadius(value)
    setCheckResult(null)
    setError('')
  }, [])

  const handleCheck = useCallback(async () => {
    setChecking(true)
    setError('')
    setCheckResult(null)

    try {
      const result = await checkTerritoryAvailability(centerLat, centerLon, radius, selectedType)
      setCheckResult(result)
    } catch (err) {
      setError(err.message || '检查失败')
    } finally {
      setChecking(false)
    }
  }, [centerLat, centerLon, radius, selectedType])

  const handleClaim = useCallback(async () => {
    if (!checkResult?.available) {
      setError('该位置不可用，请换一个位置或调整半径')
      return
    }

    setClaiming(true)
    setError('')

    try {
      const territory = await claimTerritory({
        type: selectedType,
        center_lat: centerLat,
        center_lon: centerLon,
        radius,
        tavern_id: tavernId,
        name: name || currentTypeMeta.name,
      }, userId)

      if (onClaimSuccess) {
        onClaimSuccess(territory)
      }
    } catch (err) {
      setError(err.message || '申领失败')
    } finally {
      setClaiming(false)
    }
  }, [checkResult, selectedType, centerLat, centerLon, radius, tavernId, name, currentTypeMeta, userId, onClaimSuccess])

  return (
    <div className="territory-claim-panel" style={panelStyle}>
      <h3 style={titleStyle}>申领领地</h3>

      {/* 领地类型选择 */}
      <div style={sectionStyle}>
        <label style={labelStyle}>领地类型</label>
        <div style={typeGridStyle}>
          {TERRITORY_TYPE_OPTIONS.map((option) => (
            <button
              key={option.type}
              type="button"
              onClick={() => handleTypeChange(option.type)}
              style={{
                ...typeButtonStyle,
                ...(selectedType === option.type ? typeButtonActiveStyle : {}),
              }}
            >
              <span style={typeIconStyle}>{option.icon}</span>
              <span>{option.name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* 坐标输入 */}
      <div style={sectionStyle}>
        <label style={labelStyle}>中心坐标</label>
        <div style={coordRowStyle}>
          <div style={coordFieldStyle}>
            <label style={smallLabelStyle}>纬度</label>
            <input
              type="number"
              step="0.0001"
              value={centerLat}
              onChange={(e) => setCenterLat(Number(e.target.value))}
              style={inputStyle}
            />
          </div>
          <div style={coordFieldStyle}>
            <label style={smallLabelStyle}>经度</label>
            <input
              type="number"
              step="0.0001"
              value={centerLon}
              onChange={(e) => setCenterLon(Number(e.target.value))}
              style={inputStyle}
            />
          </div>
        </div>
      </div>

      {/* 半径设置 */}
      <div style={sectionStyle}>
        <label style={labelStyle}>
          领地半径: {radius} 米
          <span style={limitStyle}>
            (范围: {currentLimits.min}-{currentLimits.max}m)
          </span>
        </label>
        <input
          type="range"
          min={currentLimits.min}
          max={currentLimits.max}
          step="10"
          value={radius}
          onChange={handleRadiusChange}
          style={rangeStyle}
        />
        <div style={radiusLabelsStyle}>
          <span>{currentLimits.min}m</span>
          <span>{radius}m</span>
          <span>{currentLimits.max}m</span>
        </div>
      </div>

      {/* 名称输入 */}
      <div style={sectionStyle}>
        <label style={labelStyle}>
          领地名称
          <span style={hintStyle}>（可选）</span>
        </label>
        <input
          type="text"
          placeholder={currentTypeMeta.name || '领地名称'}
          value={name}
          onChange={(e) => setName(e.target.value)}
          style={inputStyle}
          maxLength={50}
        />
      </div>

      {/* 检查结果 */}
      {checkResult && (
        <div style={{
          ...resultStyle,
          backgroundColor: checkResult.available ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)',
          borderColor: checkResult.available ? '#22c55e' : '#ef4444',
        }}>
          {checkResult.available ? '✓' : '✗'} {checkResult.message}
          {checkResult.conflicting_territories?.length > 0 && (
            <div style={{ marginTop: '4px', fontSize: '12px' }}>
              冲突领地: {checkResult.conflicting_territories.map(t => t.name || t.id).join(', ')}
            </div>
          )}
        </div>
      )}

      {/* 错误信息 */}
      {error && (
        <div style={errorStyle}>{error}</div>
      )}

      {/* 操作按钮 */}
      <div style={buttonRowStyle}>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            style={cancelButtonStyle}
            disabled={checking || claiming}
          >
            取消
          </button>
        )}
        <button
          type="button"
          onClick={handleCheck}
          style={secondaryButtonStyle}
          disabled={checking || claiming}
        >
          {checking ? '检查中…' : '检查可用性'}
        </button>
        <button
          type="button"
          onClick={handleClaim}
          style={primaryButtonStyle}
          disabled={checking || claiming || !checkResult?.available}
        >
          {claiming ? '申领中…' : '确认申领'}
        </button>
      </div>
    </div>
  )
}

// Styles
const panelStyle: CSSProperties = {
  padding: '16px',
  background: 'rgba(15,23,42,0.95)',
  borderRadius: '8px',
  border: '1px solid rgba(148,163,184,0.2)',
  maxWidth: '400px',
}

const titleStyle: CSSProperties = {
  margin: '0 0 16px 0',
  fontSize: '16px',
  fontWeight: '600',
  color: '#f8fafc',
}

const sectionStyle: CSSProperties = {
  marginBottom: '16px',
}

const labelStyle: CSSProperties = {
  display: 'block',
  marginBottom: '8px',
  fontSize: '13px',
  fontWeight: '500',
  color: '#e2e8f0',
}

const smallLabelStyle: CSSProperties = {
  display: 'block',
  marginBottom: '4px',
  fontSize: '11px',
  color: '#94a3b8',
}

const hintStyle: CSSProperties = {
  fontSize: '11px',
  fontWeight: '400',
  color: '#64748b',
  marginLeft: '4px',
}

const limitStyle: CSSProperties = {
  fontSize: '11px',
  fontWeight: '400',
  color: '#64748b',
  marginLeft: '8px',
}

const typeGridStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(4, 1fr)',
  gap: '6px',
}

const typeButtonStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: '2px',
  padding: '8px 4px',
  borderRadius: '6px',
  border: '1px solid rgba(148,163,184,0.2)',
  background: 'rgba(30,41,59,0.8)',
  color: '#e2e8f0',
  fontSize: '11px',
  cursor: 'pointer',
  transition: 'all 0.15s',
}

const typeButtonActiveStyle: CSSProperties = {
  borderColor: '#3b82f6',
  background: 'rgba(59,130,246,0.2)',
}

const typeIconStyle: CSSProperties = {
  fontSize: '18px',
}

const coordRowStyle: CSSProperties = {
  display: 'flex',
  gap: '8px',
}

const coordFieldStyle: CSSProperties = {
  flex: 1,
}

const inputStyle: CSSProperties = {
  width: '100%',
  padding: '8px 12px',
  borderRadius: '6px',
  border: '1px solid rgba(148,163,184,0.3)',
  background: 'rgba(30,41,59,0.8)',
  color: '#f8fafc',
  fontSize: '13px',
  boxSizing: 'border-box',
}

const rangeStyle: CSSProperties = {
  width: '100%',
  height: '4px',
  borderRadius: '2px',
  appearance: 'none',
  background: 'linear-gradient(to right, #3b82f6, #60a5fa)',
  cursor: 'pointer',
}

const radiusLabelsStyle: CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  marginTop: '4px',
  fontSize: '11px',
  color: '#64748b',
}

const resultStyle: CSSProperties = {
  padding: '10px 12px',
  borderRadius: '6px',
  border: '1px solid',
  fontSize: '13px',
  color: '#f8fafc',
  marginBottom: '12px',
}

const errorStyle: CSSProperties = {
  padding: '10px 12px',
  borderRadius: '6px',
  border: '1px solid rgba(239,68,68,0.5)',
  background: 'rgba(239,68,68,0.1)',
  color: '#fca5a5',
  fontSize: '13px',
  marginBottom: '12px',
}

const buttonRowStyle: CSSProperties = {
  display: 'flex',
  gap: '8px',
  justifyContent: 'flex-end',
}

const cancelButtonStyle: CSSProperties = {
  padding: '8px 16px',
  borderRadius: '6px',
  border: '1px solid rgba(148,163,184,0.3)',
  background: 'transparent',
  color: '#94a3b8',
  fontSize: '13px',
  cursor: 'pointer',
}

const secondaryButtonStyle: CSSProperties = {
  padding: '8px 16px',
  borderRadius: '6px',
  border: '1px solid rgba(59,130,246,0.5)',
  background: 'rgba(59,130,246,0.1)',
  color: '#60a5fa',
  fontSize: '13px',
  cursor: 'pointer',
}

const primaryButtonStyle: CSSProperties = {
  padding: '8px 16px',
  borderRadius: '6px',
  border: 'none',
  background: 'linear-gradient(135deg, #3b82f6, #2563eb)',
  color: '#ffffff',
  fontSize: '13px',
  fontWeight: '500',
  cursor: 'pointer',
}
