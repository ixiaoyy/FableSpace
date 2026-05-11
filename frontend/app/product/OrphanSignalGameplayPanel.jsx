import { useState, useEffect, useRef } from 'react'
import './orphanSignalGameplay.css'

function latestNarration(session, scene) {
  if (scene?.narration) return scene.narration
  const lastEvent = Array.isArray(session?.events) ? session.events[session.events.length - 1] : null
  return lastEvent?.narration || 'SIGNAL CONNECTED. AWAITING INPUT...'
}

function useTypewriter(text, speed = 25, active = true) {
  const [displayedText, setDisplayedText] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const audioCtxRef = useRef(null)

  const playTick = () => {
    try {
      // AudioContext must be resumed after user gesture, but here we just try-catch
      if (!audioCtxRef.current) {
        audioCtxRef.current = new (window.AudioContext || window.webkitAudioContext)()
      }
      const ctx = audioCtxRef.current
      if (ctx.state === 'suspended') ctx.resume()

      const osc = ctx.createOscillator()
      const gain = ctx.createGain()

      // Use 'square' or 'sawtooth' for a more mechanical/crunchy terminal feel
      osc.type = 'square'
      osc.frequency.setValueAtTime(120 + Math.random() * 40, ctx.currentTime)
      osc.frequency.exponentialRampToValueAtTime(30, ctx.currentTime + 0.04)

      // Keep it "weak" as requested
      gain.gain.setValueAtTime(0.015, ctx.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.04)

      osc.connect(gain)
      gain.connect(ctx.destination)

      osc.start()
      osc.stop(ctx.currentTime + 0.04)
    } catch (e) {
      // Audio failures shouldn't break the UI
    }
  }

  useEffect(() => {
    if (!active || !text) {
      setDisplayedText(text || '')
      return
    }

    setDisplayedText('')
    setIsTyping(true)
    let i = 0
    const timer = setInterval(() => {
      const char = text[i]
      setDisplayedText(text.slice(0, i + 1))
      
      // Play tick for non-whitespace characters
      if (char && char.trim()) {
        playTick()
      }
      
      i++
      if (i >= text.length) {
        clearInterval(timer)
        setIsTyping(false)
      }
    }, speed)

    return () => clearInterval(timer)
  }, [text, speed, active])

  return { displayedText, isTyping }
}

export default function OrphanSignalGameplayPanel({ 
  session, 
  scene = {}, 
  gameplay = null, 
  busy = false, 
  onChoice, 
  onSubmit, 
  onAbandon,
  onStart,
  miniGameTemplates = []
}) {
  const [message, setMessage] = useState('')
  const [localLogs, setLocalLogs] = useState([])
  const [booting, setBooting] = useState(false)
  const logEndRef = useRef(null)

  const narration = latestNarration(session, scene)
  const { displayedText, isTyping } = useTypewriter(narration, 20, !busy && !booting)

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    if (events.length > 0 && !booting) {
      const lastType = events[events.length - 1]?.type
      if (lastType === 'narration' || lastType === 'scene') {
        addLocalLog(`DATA PACKET RECEIVED: ${events.length} BYTES`)
        addLocalLog('DECRYPTING SIGNAL...')
      }
    }
  }, [events.length, localLogs.length, booting])

  useEffect(() => {
    if (!session && !booting) {
      setBooting(true)
      const timer = setTimeout(() => setBooting(false), 1500)
      return () => clearTimeout(timer)
    }
  }, [session])

  // if (!session && !booting) return null // Let it render the launcher

  const choices = Array.isArray(scene?.choices) ? scene.choices : []
  const completed = session.state === 'completed'
  const goal = gameplay?.owner_brief?.goal || 'EXPLORE AND DISCOVER.'
  const events = Array.isArray(session?.events) ? session.events : []

  function addLocalLog(content) {
    setLocalLogs((prev) => [...prev, { timestamp: Date.now(), content }])
  }

  function handleSubmit(event) {
    event.preventDefault()
    const text = message.trim()
    if (!text || busy || completed) return
    setMessage('')

    // Local command interceptor
    const cmd = text.toLowerCase()
    if (cmd === '/help' || cmd === '帮助') {
      addLocalLog('COMMAND: HELP')
      addLocalLog('AVAILABLE: /look (refresh), /log (history), /abandon (quit)')
      return
    }
    if (cmd === '/look' || cmd === '查看') {
      addLocalLog('COMMAND: LOOK')
      // This will naturally trigger the typewriter again if we re-trigger state
      // For now, just add a log
      addLocalLog('SCANNING LOCAL ENVIRONMENT...')
      return
    }
    if (cmd === '/log' || cmd === '日志') {
      addLocalLog('COMMAND: LOG')
      addLocalLog(`SHOWING LAST ${events.length} EVENTS. CHECK LOG COLUMN.`)
      return
    }

    onSubmit?.(text)
  }

  return (
    <section className="os-terminal" aria-label="Orphan Signal Console">
      <div className="os-terminal-content">
        <header className="os-footer" style={{ borderBottom: '1px solid var(--os-border)', background: 'rgba(34, 211, 238, 0.08)', padding: '4px 12px' }}>
          <div className="os-label" style={{ fontSize: '0.6rem' }}>
            <span style={{ color: '#fff' }}>COORD:</span> {session?.tavern?.lat?.toFixed(4) || '??.????'}N / {session?.tavern?.lon?.toFixed(4) || '??.????'}E
          </div>
          <div className="os-label" style={{ fontSize: '0.6rem', marginLeft: '12px' }}>
            <span style={{ color: '#fff' }}>SIGNAL:</span> STABLE 98%
          </div>
          <div style={{ flex: 1 }} />
          <div className="os-label" style={{ fontSize: '0.6rem' }}>
            <span style={{ color: '#fff' }}>OS:</span> FABLEMAP-SIG-v1
          </div>
          <button type="button" className="os-btn" style={{ padding: '0px 6px', fontSize: '0.6rem', marginLeft: '12px', borderStyle: 'dashed' }} onClick={onAbandon} disabled={busy}>
            DISCONNECT
          </button>
        </header>

        <div className="os-layout">
          {/* COMMAND Column */}
          <aside className="os-column">
            <div className="os-label">COMMAND</div>
            
            {booting ? (
              <div className="os-section">
                <span className="os-label" style={{ animation: 'pulse 1s infinite' }}>BOOTING...</span>
                <p style={{ fontSize: '0.75rem', opacity: 0.5 }}>KERNEL: FM-OS 1.0.4<br/>SIGNAL: SYNCING...</p>
              </div>
            ) : !session ? (
              <div className="os-section">
                <span className="os-label" style={{ fontSize: '0.6rem' }}>AVAILABLE PROGRAMS</span>
                <div className="os-command-list">
                  {miniGameTemplates.map((tpl) => (
                    <button
                      key={tpl.id}
                      type="button"
                      className="os-btn"
                      onClick={() => onStart?.(tpl)}
                      disabled={busy}
                    >
                      {tpl.icon} {tpl.title}
                    </button>
                  ))}
                  <button type="button" className="os-btn" onClick={() => addLocalLog('SCANNING FOR UPDATES...')}>
                    SCAN FOR UPDATES
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div className="os-section">
                  <span className="os-label" style={{ fontSize: '0.6rem' }}>OBJECTIVE</span>
                  <p style={{ fontSize: '0.85rem', color: 'rgba(207, 250, 254, 0.8)' }}>{goal}</p>
                </div>
                
                {!completed && (
                  <div className="os-section">
                    <span className="os-label" style={{ fontSize: '0.6rem' }}>AVAILABLE ACTIONS</span>
                    <div className="os-command-list">
                      {choices.map((choice) => (
                        <button
                          key={choice.id}
                          type="button"
                          className="os-btn"
                          onClick={() => onChoice?.(choice)}
                          disabled={busy}
                        >
                          {choice.label || choice.id}
                        </button>
                      ))}
                      {choices.length === 0 && !busy && (
                        <span style={{ fontSize: '0.75rem', opacity: 0.5 }}>NO CHOICES. USE MANUAL INPUT.</span>
                      )}
                      {busy && <span className="os-label" style={{ animation: 'pulse 1s infinite' }}>PROCESSING...</span>}
                    </div>
                  </div>
                )}

                {completed && (
                  <div className="os-section">
                    <span className="os-label" style={{ color: '#4ade80' }}>SESSION COMPLETED</span>
                    <p style={{ fontSize: '0.8rem' }}>{session.completion?.summary || 'ALL OBJECTIVES MET.'}</p>
                  </div>
                )}
              </>
            )}
          </aside>

          {/* COMMS Column */}
          <main className="os-column" style={{ background: 'rgba(34, 211, 238, 0.02)' }}>
            <div className="os-label">COMMS</div>
            <div className="os-comms-display">
              {booting ? (
                <div className="os-log-list" style={{ fontSize: '0.8rem' }}>
                  <div>&gt; MEMORY TEST: PASS</div>
                  <div>&gt; SIGNAL RANGE: 12.4ly</div>
                  <div>&gt; ENCRYPTION: ACTIVE</div>
                  <div>&gt; CONNECTION: SECURE</div>
                  <div>&gt; SYNCING COORDS...</div>
                  <div>&gt; INJECTING NEURAL LINK...</div>
                </div>
              ) : !session ? (
                <div className="os-narration" style={{ opacity: 0.6 }}>
                  SYSTEM IDLE. SELECT A PROGRAM TO BEGIN SIGNAL TRANSMISSION.
                </div>
              ) : (
                <div className="os-narration">
                  {displayedText}
                  {isTyping && <span className="os-cursor" style={{ background: 'var(--os-cyan)', width: '8px', height: '1.2em', display: 'inline-block', verticalAlign: 'middle', marginLeft: '4px', animation: 'blink 0.8s infinite' }} />}
                </div>
              )}
            </div>
          </main>

          {/* LOG Column */}
          <aside className="os-column os-log-column" style={{ background: 'rgba(0, 0, 0, 0.2)' }}>
            <div className="os-label">LOG</div>
            <div className="os-log-list">
              {localLogs.map((log, idx) => (
                <div key={`local-${idx}`} className="os-log-entry" style={{ color: 'var(--os-cyan)', opacity: 0.9 }}>
                  <span className="os-log-time">[{new Date(log.timestamp).toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit' })}]</span>
                  <span>{log.content}</span>
                </div>
              ))}
              {events.slice(-10).map((evt, idx) => (
                <div key={idx} className="os-log-entry">
                  <span className="os-log-time">[{new Date(evt.timestamp || Date.now()).toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit' })}]</span>
                  <span>{evt.type === 'choice' ? `ACTION: ${evt.choice_label}` : evt.type === 'message' ? `INPUT: ${evt.content?.slice(0, 20)}...` : 'EVENT REGISTERED'}</span>
                </div>
              ))}
              <div ref={logEndRef} />
            </div>
          </aside>
        </div>

        {/* Footer / Input Area */}
        {!completed && (
          <footer className="os-footer">
            <form className="os-input-wrapper" onSubmit={handleSubmit} style={{ width: '100%' }}>
              <span className="os-input-prefix">USER@SIGNAL:~$</span>
              <input
                className="os-input"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="ENTER COMMAND OR DATA..."
                disabled={busy}
                autoFocus
              />
              {busy && <div className="os-label" style={{ marginLeft: '12px' }}>BUSY</div>}
            </form>
          </footer>
        )}
      </div>
    </section>
  )
}
