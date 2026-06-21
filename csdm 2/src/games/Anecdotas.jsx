import { useState, useEffect } from 'react'
import { C, wallpaper } from '../theme'

const STORAGE_KEY = 'afterlaburo_consignas_v1'

const DEFAULT_CONSIGNAS = [
  'Cosas que aprendiste por el Maxo.',
  'Anécdotas de pueblo.',
  'Contá la vez que más la cagaste en un laburo.',
  'La excusa más boluda que diste para faltar al trabajo.',
  'Tu jefe o jefa más particular: contá una anécdota.',
  'La vez que casi te despiden (o te despidieron).',
  'Una mentira que dijiste en una entrevista laboral.',
  'El viaje o las vacaciones que más se complicaron.',
  'La cita o primer encuentro más desastroso que tuviste.',
  'Algo que rompiste y nunca confesaste quién fue.',
  'La joda de la oficina que se fue más al descontrol.',
  'Una vez que te confundieron de persona y seguiste la corriente.',
  'El cumpleaños o despedida más loca a la que fuiste.',
  'Algo vergonzoso que pasó en un grupo de WhatsApp laboral.',
  'La peor decisión que tomaste estando borracho/a.',
  'Tu primer día de laburo: contá cómo fue.',
  'Una vez que te quedaste dormido/a en una reunión.',
  'El regalo más raro que recibiste de un compañero de trabajo.',
  'La vez que mandaste un mensaje a la persona equivocada.',
  'Algo que hiciste para evitar cruzarte a un compañero de laburo.',
  'Tu excusa más creativa para llegar tarde.',
  'Una anécdota de un compañero que se volvió leyenda en la oficina.',
]

function loadConsignas() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed) && parsed.length) return parsed
    }
  } catch (e) {}
  return DEFAULT_CONSIGNAS
}
function saveConsignas(list) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(list)) } catch (e) {}
}
function genId() { return Math.random().toString(36).substring(2, 10) }
function shuffle(arr) { return [...arr].sort(() => Math.random() - 0.5) }

export default function AnecdotasGame({ onExit }) {
  const [screen, setScreen] = useState('setup') // setup | play | editor
  const [participants, setParticipants] = useState([])
  const [nameInput, setNameInput] = useState('')
  const [consignas, setConsignas] = useState(loadConsignas())
  const [pool, setPool] = useState([])       // consignas restantes en esta partida
  const [current, setCurrent] = useState(null)
  const [round, setRound] = useState(1)
  const [winnerFlash, setWinnerFlash] = useState(null)

  useEffect(() => { saveConsignas(consignas) }, [consignas])

  function addParticipant() {
    const name = nameInput.trim()
    if (!name) return
    setParticipants(p => [...p, { id: genId(), name, score: 0 }])
    setNameInput('')
  }
  function removeParticipant(id) {
    setParticipants(p => p.filter(x => x.id !== id))
  }

  function drawConsigna(fromPool) {
    let p = fromPool
    if (!p || p.length === 0) p = shuffle(consignas)
    const [next, ...rest] = p
    setCurrent(next)
    setPool(rest)
  }

  function startGame() {
    const shuffled = shuffle(consignas)
    const [first, ...rest] = shuffled
    setCurrent(first)
    setPool(rest)
    setRound(1)
    setParticipants(p => p.map(x => ({ ...x, score: 0 })))
    setScreen('play')
  }

  function awardPoint(id) {
    setParticipants(p => p.map(x => x.id === id ? { ...x, score: x.score + 1 } : x))
    setWinnerFlash(id)
    setTimeout(() => {
      setWinnerFlash(null)
      setRound(r => r + 1)
      drawConsigna(pool)
    }, 700)
  }

  function skipConsigna() {
    setRound(r => r + 1)
    drawConsigna(pool)
  }

  if (screen === 'editor') {
    return (
      <ConsignaEditor
        consignas={consignas}
        setConsignas={setConsignas}
        onBack={() => setScreen(participants.length && current ? 'play' : 'setup')}
      />
    )
  }

  if (screen === 'play') {
    const sorted = [...participants].sort((a, b) => b.score - a.score)
    return (
      <div style={st.page}>
        <style>{keyframes}</style>
        <div style={st.playWrap}>
          <div style={st.topRow}>
            <button style={st.backBtn} onClick={() => setScreen('setup')}>← Jugadores</button>
            <span style={st.roundTag}>Ronda {round}</span>
            <button style={st.backBtn} onClick={() => setScreen('editor')}>✎ Consignas</button>
          </div>

          <div style={st.consignaCard}>
            <div style={st.consignaLabel}>CONSIGNA</div>
            <div style={st.consignaText}>{current}</div>
          </div>

          <div style={st.hint}>Cada uno cuenta su anécdota en voz alta. Tocá quién la rompió 👇</div>

          <div style={st.participantGrid}>
            {participants.map(pl => (
              <button
                key={pl.id}
                onClick={() => awardPoint(pl.id)}
                style={{
                  ...st.participantBtn,
                  ...(winnerFlash === pl.id ? st.participantBtnWin : {})
                }}
              >
                <span style={st.participantName}>{pl.name}</span>
                <span style={st.participantScore}>{pl.score} pt{pl.score !== 1 ? 's' : ''}</span>
              </button>
            ))}
          </div>

          <button style={st.skipBtn} onClick={skipConsigna}>Saltear esta consigna →</button>

          <div style={st.scoreboard}>
            <div style={st.sectionLabel}>TABLA DE POSICIONES</div>
            {sorted.map((pl, i) => (
              <div key={pl.id} style={st.scoreRow}>
                <span style={st.medal}>{i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}°`}</span>
                <span style={{ flex: 1 }}>{pl.name}</span>
                <span style={{ fontWeight: 800, color: C.gold }}>{pl.score}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  // setup screen
  return (
    <div style={st.page}>
      <style>{keyframes}</style>
      <div style={st.setupCard}>
        <button style={{ ...st.backBtn, marginBottom: 16 }} onClick={onExit}>← Menú</button>
        <div style={{ textAlign: 'center', marginBottom: 6 }}>
          <span style={st.logo}>ANÉCDOTAS</span>
          <span style={st.logoSub}>IRL · CONTÁ Y SUMÁ PUNTOS</span>
        </div>
        <p style={{ color: C.muted, textAlign: 'center', fontSize: 13, marginBottom: 22 }}>
          Sumá participantes, leé la consigna en voz alta y votá la mejor anécdota
        </p>

        <div style={st.addRow}>
          <input
            style={st.input}
            placeholder="Nombre del participante..."
            value={nameInput}
            onChange={e => setNameInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addParticipant()}
            maxLength={20}
          />
          <button style={st.addBtn} onClick={addParticipant}>+</button>
        </div>

        {participants.length === 0 ? (
          <div style={st.emptyBox}>Todavía no agregaste a nadie.</div>
        ) : (
          <div style={st.participantList}>
            {participants.map(p => (
              <div key={p.id} style={st.participantRow}>
                <span>{p.name}</span>
                <button style={st.removeBtn} onClick={() => removeParticipant(p.id)}>✕</button>
              </div>
            ))}
          </div>
        )}

        <button
          style={{ ...st.btnPrimary, opacity: participants.length < 2 ? 0.5 : 1 }}
          disabled={participants.length < 2}
          onClick={startGame}
        >
          {participants.length < 2 ? 'Sumá al menos 2 jugadores' : '🎤 Empezar'}
        </button>

        <button style={st.btnSecondary} onClick={() => setScreen('editor')}>✎ Editar consignas ({consignas.length})</button>
      </div>
    </div>
  )
}

function ConsignaEditor({ consignas, setConsignas, onBack }) {
  const [newText, setNewText] = useState('')
  const [editingId, setEditingId] = useState(null)
  const [editingText, setEditingText] = useState('')

  // Use index as id surrogate since consignas is a flat string array
  function addConsigna() {
    const t = newText.trim()
    if (!t) return
    setConsignas(c => [...c, t])
    setNewText('')
  }
  function deleteConsigna(idx) {
    setConsignas(c => c.filter((_, i) => i !== idx))
  }
  function startEdit(idx, text) {
    setEditingId(idx)
    setEditingText(text)
  }
  function commitEdit(idx) {
    const t = editingText.trim()
    if (t) setConsignas(c => c.map((x, i) => i === idx ? t : x))
    setEditingId(null)
  }
  function restoreDefaults() {
    setConsignas(DEFAULT_CONSIGNAS)
  }

  return (
    <div style={st.page}>
      <div style={st.setupCard}>
        <button style={{ ...st.backBtn, marginBottom: 16 }} onClick={onBack}>← Volver</button>
        <div style={{ textAlign: 'center', marginBottom: 16 }}>
          <span style={st.logo}>CONSIGNAS</span>
          <span style={st.logoSub}>EDITÁ EL MAZO DE TEMAS</span>
        </div>

        <div style={st.addRow}>
          <input
            style={st.input}
            placeholder="Nueva consigna..."
            value={newText}
            onChange={e => setNewText(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addConsigna()}
            maxLength={140}
          />
          <button style={st.addBtn} onClick={addConsigna}>+</button>
        </div>

        <div style={st.consignaList}>
          {consignas.map((c, idx) => (
            <div key={idx} style={st.consignaRow}>
              {editingId === idx ? (
                <input
                  style={{ ...st.input, flex: 1 }}
                  value={editingText}
                  autoFocus
                  onChange={e => setEditingText(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && commitEdit(idx)}
                  onBlur={() => commitEdit(idx)}
                />
              ) : (
                <span style={{ flex: 1, fontSize: 13.5 }} onClick={() => startEdit(idx, c)}>{c}</span>
              )}
              <button style={st.removeBtn} onClick={() => deleteConsigna(idx)}>✕</button>
            </div>
          ))}
        </div>

        <button style={st.btnSecondary} onClick={restoreDefaults}>↺ Restaurar consignas originales</button>
      </div>
    </div>
  )
}

const keyframes = `
@keyframes alPop { 0%{ transform:scale(0.9); opacity:0 } 100%{ transform:scale(1); opacity:1 } }
@keyframes alFlash { 0%{ box-shadow:0 0 0 ${C.gold}00 } 50%{ box-shadow:0 0 0 8px ${C.gold}33 } 100%{ box-shadow:0 0 0 ${C.gold}00 } }
`

const st = {
  page: { minHeight: '100vh', background: wallpaper(), display: 'flex', flexDirection: 'column', alignItems: 'center', fontFamily: C.font, color: C.text, padding: '20px 16px 60px' },
  setupCard: { background: `linear-gradient(135deg, ${C.panelStrong}, ${C.panel})`, border: `1px solid ${C.border}`, borderRadius: C.radiusLg, padding: '32px 28px', width: '100%', maxWidth: 460, backdropFilter: C.blurLg, WebkitBackdropFilter: C.blurLg, boxShadow: `0 24px 70px rgba(0,0,0,0.45), inset 0 1px 0 ${C.glassHighlight}`, marginTop: 30 },
  playWrap: { width: '100%', maxWidth: 560, marginTop: 16 },
  logo: { display: 'block', fontSize: 30, fontWeight: 600, fontFamily: C.font, color: '#fff', letterSpacing: 1, lineHeight: 1, textShadow: `0 0 40px ${C.blue}66` },
  logoSub: { display: 'block', fontSize: 10.5, letterSpacing: 3, color: C.bluePale, marginTop: 6, fontWeight: 500 },
  addRow: { display: 'flex', gap: 8, marginBottom: 14 },
  input: { width: '100%', background: 'rgba(255,255,255,0.07)', border: `1px solid ${C.border}`, borderRadius: 10, color: '#fff', padding: '12px 14px', fontSize: 14, outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' },
  addBtn: { background: C.blue, border: '1px solid rgba(255,255,255,0.3)', color: '#fff', borderRadius: 10, width: 46, fontSize: 20, fontWeight: 600, cursor: 'pointer', flexShrink: 0 },
  emptyBox: { background: 'rgba(255,255,255,0.05)', border: `1px solid ${C.border}`, borderRadius: 10, padding: 18, textAlign: 'center', color: C.muted, fontSize: 13.5, marginBottom: 14 },
  participantList: { display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 14, maxHeight: 220, overflowY: 'auto' },
  participantRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.05)', border: `1px solid ${C.border}`, borderRadius: 10, padding: '10px 14px', fontSize: 14 },
  removeBtn: { background: 'transparent', border: 'none', color: C.muted, cursor: 'pointer', fontSize: 14, padding: 4 },
  btnPrimary: { width: '100%', background: `linear-gradient(135deg,${C.blue},${C.blueHover})`, border: '1px solid rgba(255,255,255,0.3)', color: '#fff', borderRadius: C.radiusMd, padding: 15, fontSize: 16, fontWeight: 600, letterSpacing: 0.5, cursor: 'pointer', fontFamily: 'inherit', marginTop: 6, boxShadow: `0 10px 26px ${C.blue}44, inset 0 1px 0 rgba(255,255,255,0.4)` },
  btnSecondary: { width: '100%', background: C.panel, border: `1px solid ${C.border}`, color: C.bluePale, borderRadius: C.radiusMd, padding: 13, fontSize: 13.5, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', marginTop: 10, backdropFilter: C.blurSm, WebkitBackdropFilter: C.blurSm },
  backBtn: { background: C.panel, border: `1px solid ${C.border}`, color: C.bluePale, borderRadius: 8, padding: '8px 14px', fontSize: 13, cursor: 'pointer', fontFamily: 'inherit', fontWeight: 500, flexShrink: 0, backdropFilter: C.blurSm, WebkitBackdropFilter: C.blurSm },
  topRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, marginBottom: 16, flexWrap: 'wrap' },
  roundTag: { fontSize: 12, letterSpacing: 2, color: C.muted, fontWeight: 600 },
  consignaCard: { background: `linear-gradient(135deg, ${C.panelStrong}, ${C.panel})`, border: `1px solid ${C.gold}55`, borderRadius: C.radiusLg, padding: '32px 24px', textAlign: 'center', marginBottom: 14, backdropFilter: C.blurLg, WebkitBackdropFilter: C.blurLg, boxShadow: `0 18px 50px rgba(0,0,0,0.4), inset 0 1px 0 ${C.glassHighlight}`, animation: 'alPop 0.35s ease' },
  consignaLabel: { fontSize: 11, letterSpacing: 4, color: C.gold, fontWeight: 600, marginBottom: 12 },
  consignaText: { fontSize: 20, fontWeight: 600, color: '#fff', lineHeight: 1.4 },
  hint: { textAlign: 'center', fontSize: 12.5, color: C.muted, marginBottom: 16 },
  participantGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 10, marginBottom: 14 },
  participantBtn: { background: C.panel, border: `1px solid ${C.border}`, borderRadius: 14, padding: '16px 10px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, cursor: 'pointer', fontFamily: 'inherit', backdropFilter: C.blurSm, WebkitBackdropFilter: C.blurSm, transition: 'all 0.15s' },
  participantBtnWin: { border: `1px solid ${C.gold}`, background: C.goldFaint, animation: 'alFlash 0.7s ease', transform: 'translateY(-2px)' },
  participantName: { fontSize: 14.5, fontWeight: 600, color: C.bright },
  participantScore: { fontSize: 11.5, color: C.muted, fontWeight: 500 },
  skipBtn: { width: '100%', background: 'transparent', border: `1px dashed ${C.border}`, color: C.muted, borderRadius: 10, padding: 12, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit', marginBottom: 18 },
  scoreboard: { background: C.panel, border: `1px solid ${C.border}`, borderRadius: C.radiusMd, padding: 16, backdropFilter: C.blurMd, WebkitBackdropFilter: C.blurMd },
  sectionLabel: { fontSize: 11, letterSpacing: 3, color: C.muted, fontWeight: 600, marginBottom: 10 },
  scoreRow: { display: 'flex', alignItems: 'center', gap: 10, padding: '7px 0', borderBottom: '1px solid rgba(255,255,255,0.06)', fontSize: 14 },
  medal: { width: 24, textAlign: 'center', fontSize: 14 },
  consignaList: { display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 320, overflowY: 'auto', marginBottom: 14 },
  consignaRow: { display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(255,255,255,0.05)', border: `1px solid ${C.border}`, borderRadius: 10, padding: '10px 12px' },
}
