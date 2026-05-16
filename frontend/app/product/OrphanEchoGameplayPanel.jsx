import { useState, useEffect, useRef } from 'react'
import './orphanEchoGameplay.css'

function latestNarration(session, scene) {
  if (scene?.narration) return scene.narration
  const lastEvent = Array.isArray(session?.events) ? session.events[session.events.length - 1] : null
  return lastEvent?.narration || 'ECHO ESTABLISHED. AWAITING RESONANCE...'
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

export default function OrphanEchoGameplayPanel({ 
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
        addLocalLog('SYNCING ECHO...')
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
    <section className="oe-terminal" aria-label="Orphan Echo Console">
      <div className="oe-terminal-content">
        <header className="oe-footer" style={{ borderBottom: '1px solid var(--oe-border)', background: 'rgba(34, 211, 238, 0.08)', padding: '4px 12px' }}>
          <div className="oe-label" style={{ fontSize: '0.6rem' }}>
            <span style={{ color: '#fff' }}>COORD:</span> {session?.tavern?.lat?.toFixed(4) || '??.????'}N / {session?.tavern?.lon?.toFixed(4) || '??.????'}E
          </div>
          <div className="oe-label" style={{ fontSize: '0.6rem', marginLeft: '12px' }}>
            <span style={{ color: '#fff' }}>ECHO:</span> STABLE 98%
          </div>
          <div style={{ flex: 1 }} />
          <div className="oe-label" style={{ fontSize: '0.6rem' }}>
            <span style={{ color: '#fff' }}>OS:</span> FABLEMAP-ECHO-v1
          </div>
          <button type="button" className="oe-btn" style={{ padding: '0px 6px', fontSize: '0.6rem', marginLeft: '12px', borderStyle: 'dashed' }} onClick={onAbandon} disabled={busy}>
            DISCONNECT
          </button>
        </header>

        <div className="oe-layout" style={{ flex: 1, display: 'grid', gridTemplateColumns: '260px 1fr 240px', overflow: 'hidden' }}>
          {/* INFO Column */}
          <aside className="oe-column" style={{ background: 'rgba(0, 0, 0, 0.1)' }}>
            {!session ? (
              <div className="oe-section">
                <span className="oe-label">PROGRAMS</span>
                <div className="oe-program-grid">
                  {miniGameTemplates.map(tmpl => (
                    <div 
                      key={tmpl.id} 
                      className="oe-program-card"
                      onClick={() => onStart?.(tmpl.id)}
                    >
                      <div className="oe-program-id">{tmpl.id}</div>
                      <div className="oe-program-title">{tmpl.title}</div>
                    </div>
                  ))}
                </div>
                <div className="mt-8">
                  <button 
                    className="oe-btn w-full" 
                    onClick={() => onStart?.('resonance-scan')}
                  >
                    SCAN FOR UPDATES
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div className="oe-section">
                  <span className="oe-label" style={{ fontSize: '0.6rem' }}>OBJECTIVE</span>
                  <p style={{ fontSize: '0.85rem', color: 'rgba(207, 250, 254, 0.8)' }}>{goal}</p>
                </div>
                
                {!completed && (
                  <div className="oe-section">
                    <span className="oe-label" style={{ fontSize: '0.6rem' }}>AVAILABLE ACTIONS</span>
                    <div className="oe-command-list">
                      {choices.map((choice) => (
                        <button
                          key={choice.id}
                          type="button"
                          className="oe-btn"
                          onClick={() => onChoice?.(choice)}
                          disabled={busy}
                        >
                          {choice.label || choice.id}
                        </button>
                      ))}
                      {choices.length === 0 && !busy && (
                        <span style={{ fontSize: '0.75rem', opacity: 0.5 }}>NO CHOICES. USE MANUAL INPUT.</span>
                      )}
                      {busy && <span className="oe-label" style={{ animation: 'pulse 1s infinite' }}>PROCESSING...</span>}
                    </div>
                  </div>
                )}

                {completed && (
                  <div className="oe-section">
                    <span className="oe-label" style={{ color: '#4ade80' }}>SESSION COMPLETED</span>
                    <p style={{ fontSize: '0.8rem' }}>{session.completion?.summary || 'ALL OBJECTIVES MET.'}</p>
                  </div>
                )}
              </>
            )}
          </aside>

          {/* COMMS Column */}
          <main className="oe-column" style={{ background: 'rgba(34, 211, 238, 0.02)' }}>
            <div className="oe-label">COMMS</div>
            <div className="oe-comms-display">
              {booting ? (
                <div className="oe-log-list" style={{ fontSize: '0.8rem' }}>
                  <div>&gt; MEMORY TEST: PASS</div>
                  <div>&gt; ECHO RANGE: 12.4ly</div>
                  <div>&gt; ENCRYPTION: ACTIVE</div>
                  <div>&gt; CONNECTION: SECURE</div>
                  <div>&gt; SYNCING COORDS...</div>
                  <div>&gt; INJECTING ECHO LINK...</div>
                </div>
              ) : !session ? (
                <div className="oe-narration" style={{ opacity: 0.6 }}>
                  SYSTEM IDLE. SELECT A PROGRAM TO BEGIN ECHO TRANSMISSION.
                </div>
              ) : (
                <div className="oe-narration">
                  {displayedText}
                  {isTyping && <span className="oe-cursor" style={{ background: 'var(--oe-cyan)', width: '8px', height: '1.2em', display: 'inline-block', verticalAlign: 'middle', marginLeft: '4px', animation: 'blink 0.8s infinite' }} />}
                </div>
              )}
            </div>
          </main>

          {/* LOG Column */}
          <aside className="oe-column oe-log-column" style={{ background: 'rgba(0, 0, 0, 0.2)' }}>
            <div className="oe-label">LOG</div>
            <div className="oe-log-list">
              {localLogs.map((log, idx) => (
                <div key={`local-${idx}`} className="oe-log-entry" style={{ color: 'var(--oe-cyan)', opacity: 0.9 }}>
                  <span className="oe-log-time">[{new Date(log.timestamp).toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit' })}]</span>
                  <span>{log.content}</span>
                </div>
              ))}
              {events.slice(-10).map((evt, idx) => (
                <div key={idx} className="oe-log-entry">
                  <span className="oe-log-time">[{new Date(evt.timestamp || Date.now()).toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit' })}]</span>
                  <span>{evt.type === 'choice' ? `ACTION: ${evt.choice_label}` : evt.type === 'message' ? `INPUT: ${evt.content?.slice(0, 20)}...` : 'EVENT REGISTERED'}</span>
                </div>
              ))}
              <div ref={logEndRef} />
            </div>
          </aside>
        </div>

        {/* Footer / Input Area */}
        {!completed && (
          <footer className="oe-footer">
            <form className="oe-input-wrapper" onSubmit={handleSubmit} style={{ width: '100%' }}>
              <span className="oe-input-prefix">USER@ECHO:~$</span>
              <input
                className="oe-input"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="ENTER COMMAND OR DATA..."
                disabled={busy}
                autoFocus
              />
              {busy && <div className="oe-label" style={{ marginLeft: '12px' }}>BUSY</div>}
            </form>
          </footer>
        )}
      </div>
    </section>
  )
}
