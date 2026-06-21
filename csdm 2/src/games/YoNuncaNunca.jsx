import { useState, useRef } from 'react'
import { C, wallpaper } from '../theme'
import { handleShine, playPop } from '../effects'

const PROMPTS = [
  { text: 'Nunca nunca me quedé dormido en clase o en el trabajo', cat: 'clasico' },
  { text: 'Nunca nunca lloré viendo una película', cat: 'clasico' },
  { text: 'Nunca nunca me caí en público delante de mucha gente', cat: 'clasico' },
  { text: 'Nunca nunca le mentí a mis padres sobre dónde estaba', cat: 'clasico' },
  { text: 'Nunca nunca canté en la ducha pensando que nadie escuchaba', cat: 'clasico' },
  { text: 'Nunca nunca me reí en un momento muy inoportuno', cat: 'clasico' },
  { text: 'Nunca nunca perdí las llaves de mi casa', cat: 'clasico' },
  { text: 'Nunca nunca le copié la tarea a alguien', cat: 'clasico' },
  { text: 'Nunca nunca hablé solo en voz alta sin querer', cat: 'clasico' },
  { text: 'Nunca nunca fingí estar enfermo para faltar', cat: 'clasico' },
  { text: 'Nunca nunca rompí algo de otra persona y no dije nada', cat: 'clasico' },
  { text: 'Nunca nunca me equivoqué de nombre con alguien importante', cat: 'clasico' },
  { text: 'Nunca nunca bailé arriba de una mesa', cat: 'fiesta' },
  { text: 'Nunca nunca terminé la noche en un lugar que no esperaba', cat: 'fiesta' },
  { text: 'Nunca nunca canté karaoke estando muy mal', cat: 'fiesta' },
  { text: 'Nunca nunca me perdí una fiesta por quedarme dormido', cat: 'fiesta' },
  { text: 'Nunca nunca mezclé tragos que no debía', cat: 'fiesta' },
  { text: 'Nunca nunca terminé hablando con un desconocido toda la noche', cat: 'fiesta' },
  { text: 'Nunca nunca llegué a una fiesta sin estar invitado', cat: 'fiesta' },
  { text: 'Nunca nunca organicé una previa que terminó siendo el evento principal', cat: 'fiesta' },
  { text: 'Nunca nunca perdí el celular en una fiesta', cat: 'fiesta' },
  { text: 'Nunca nunca me disfracé sin que la fiesta fuera de disfraces', cat: 'fiesta' },
  { text: 'Nunca nunca le mandé un mensaje a un ex estando de mal humor', cat: 'picante' },
  { text: 'Nunca nunca besé a alguien en la primera cita', cat: 'picante' },
  { text: 'Nunca nunca inventé una excusa para cortar una cita que iba mal', cat: 'picante' },
  { text: 'Nunca nunca stalkeé en redes a alguien que me gustaba', cat: 'picante' },
  { text: 'Nunca nunca exageré algo sobre mí para impresionar a alguien', cat: 'picante' },
  { text: 'Nunca nunca me enamoré de alguien que ya tenía pareja', cat: 'picante' },
  { text: 'Nunca nunca le pedí el número a un desconocido en la calle', cat: 'picante' },
  { text: 'Nunca nunca fingí que me gustaba algo para gustarle a alguien', cat: 'picante' },
  { text: 'Nunca nunca tuve una cita a ciegas', cat: 'picante' },
  { text: 'Nunca nunca dije "te amo" antes de tiempo y me arrepentí', cat: 'picante' },
]

const CATS = [
  { id: 'clasico', label: 'Clásico' },
  { id: 'fiesta', label: 'Fiesta' },
  { id: 'picante', label: 'Picante' },
]

function shuffledIndexes(active) {
  const idx = PROMPTS.map((p, i) => i).filter(i => active.has(PROMPTS[i].cat))
  for (let i = idx.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[idx[i], idx[j]] = [idx[j], idx[i]]
  }
  return idx
}

export default function YoNuncaNuncaGame({ onExit }) {
  const [active, setActive] = useState(new Set(['clasico', 'fiesta', 'picante']))
  const [current, setCurrent] = useState(null)
  const [round, setRound] = useState(0)
  const [swap, setSwap] = useState(false)
  const pool = useRef(shuffledIndexes(active))

  function toggleCat(id) {
    setActive(prev => {
      if (prev.has(id) && prev.size === 1) return prev
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      pool.current = shuffledIndexes(next)
      setRound(0)
      setCurrent(null)
      return next
    })
  }

  function next() {
    if (pool.current.length === 0) pool.current = shuffledIndexes(active)
    const idx = pool.current.pop()
    playPop()
    setSwap(true)
    setTimeout(() => {
      setCurrent(PROMPTS[idx].text)
      setRound(r => r + 1)
      setSwap(false)
    }, 180)
  }

  return (
    <div style={s.page}>
      <div style={s.card} className="glass-shine" onPointerMove={handleShine}>
        <button style={s.backBtn} className="press-fx" onClick={onExit}>← Menú</button>

        <div style={{ textAlign: 'center', margin: '14px 0 20px' }}>
          <span style={s.logo}>YO NUNCA NUNCA</span>
          <span style={s.logoSub}>TOCÁ SIGUIENTE Y EL QUE LO HIZO, TOMA</span>
        </div>

        <div style={s.chips}>
          {CATS.map(c => (
            <button
              key={c.id}
              className="press-fx"
              onClick={() => toggleCat(c.id)}
              style={{ ...s.chip, ...(active.has(c.id) ? s.chipOn : {}) }}
            >
              {c.label}
            </button>
          ))}
        </div>

        <div style={s.stage}>
          <p style={{ ...s.consigna, opacity: swap ? 0 : 1, transform: swap ? 'translateY(8px)' : 'translateY(0)' }}>
            {current || 'Tocá "siguiente" para arrancar'}
          </p>
        </div>

        <p style={s.counter}>{round > 0 ? `Ronda ${round}` : ' '}</p>

        <button style={s.nextBtn} className="press-fx" onClick={next}>Siguiente consigna →</button>
      </div>
    </div>
  )
}

const s = {
  page: { minHeight: '100vh', width: '100%', background: wallpaper(), display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: C.font, color: '#fff', padding: '24px 16px', boxSizing: 'border-box' },
  card: {
    position: 'relative',
    width: '100%',
    maxWidth: 440,
    background: `linear-gradient(135deg, ${C.panelStrong}, ${C.panel})`,
    border: `1px solid ${C.border}`,
    borderRadius: C.radiusLg,
    backdropFilter: C.blurLg,
    WebkitBackdropFilter: C.blurLg,
    boxShadow: `0 24px 70px rgba(0,0,0,0.45), inset 0 1px 0 ${C.glassHighlight}`,
    padding: '28px 26px 30px',
  },
  backBtn: { background: 'transparent', border: `1px solid ${C.border}`, color: C.bright, borderRadius: 8, padding: '8px 14px', fontSize: 13, cursor: 'pointer', fontFamily: 'inherit', fontWeight: 500 },
  logo: { display: 'block', fontSize: 22, fontWeight: 600, color: '#fff', letterSpacing: 0.5 },
  logoSub: { display: 'block', fontSize: 11, letterSpacing: 2, color: C.bluePale, marginTop: 8, fontWeight: 500 },
  chips: { display: 'flex', justifyContent: 'center', gap: 8, marginBottom: 20, flexWrap: 'wrap' },
  chip: {
    fontFamily: 'inherit', fontSize: 13, fontWeight: 500, padding: '7px 14px', borderRadius: 999,
    border: `1px solid ${C.border}`, background: C.panel, color: C.muted, cursor: 'pointer',
    backdropFilter: C.blurSm, WebkitBackdropFilter: C.blurSm,
    transition: `background 0.25s ${C.ease}, color 0.25s ${C.ease}, transform 0.15s ${C.ease}`,
  },
  chipOn: { background: `${C.blue}88`, borderColor: C.blue, color: '#fff', boxShadow: `0 6px 16px ${C.blue}44` },
  stage: { minHeight: 140, display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '6px 4px' },
  consigna: { fontSize: 21, fontWeight: 600, lineHeight: 1.45, margin: 0, transition: `opacity 0.32s ${C.ease}, transform 0.32s ${C.ease}` },
  counter: { textAlign: 'center', fontSize: 12.5, color: C.muted, margin: '6px 0 20px', fontWeight: 500 },
  nextBtn: {
    width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
    fontFamily: 'inherit', fontSize: 15.5, fontWeight: 600, color: '#fff',
    background: `linear-gradient(135deg, ${C.blue}, ${C.blueHover})`,
    border: '1px solid rgba(255,255,255,0.3)', borderRadius: C.radiusMd, padding: 14, cursor: 'pointer',
    boxShadow: `0 10px 26px ${C.blue}55, inset 0 1px 0 rgba(255,255,255,0.4)`,
    transition: `transform 0.15s ${C.ease}`,
  },
}
