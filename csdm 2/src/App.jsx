import { useState, useEffect } from 'react'
import { C } from './theme'
import CSDMGame from './games/CSDM'
import AnecdotasGame from './games/Anecdotas'

const APP_VERSION = 'v6.0'

export default function App() {
  const [screen, setScreen] = useState('welcome') // welcome | menu | csdm | anecdotas

  // Si entran por un link de invitación (?sala=CODE) saltamos directo al CSDM
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (params.get('sala')) setScreen('csdm')
  }, [])

  if (screen === 'welcome') {
    return <WelcomeScreen onContinue={() => setScreen('menu')} />
  }
  if (screen === 'csdm') {
    return <CSDMGame onExit={() => setScreen('menu')} />
  }
  if (screen === 'anecdotas') {
    return <AnecdotasGame onExit={() => setScreen('menu')} />
  }
  return <MenuScreen onSelect={g => setScreen(g)} />
}

// ─── WELCOME ────────────────────────────────────────────────────────────────
function WelcomeScreen({ onContinue }) {
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const t = setTimeout(() => setReady(true), 1800)
    return () => clearTimeout(t)
  }, [])

  return (
    <div style={w.page} onClick={() => ready && onContinue()}>
      <style>{welcomeKeyframes}</style>
      <div style={w.glowA} />
      <div style={w.glowB} />
      <div style={w.content}>
        <span style={w.eyebrow}>BIENVENIDO A</span>
        <h1 style={w.title}>
          <span style={{ ...w.titleWord, animationDelay: '0.05s' }}>AFTER</span>
          <span style={w.dash}>-</span>
          <span style={{ ...w.titleWord, animationDelay: '0.25s' }}>LABURO</span>
        </h1>
        <div style={w.underline} />
        <p style={{ ...w.tap, opacity: ready ? 1 : 0 }}>Tocá la pantalla para entrar</p>
      </div>
      <div style={{ ...w.versionTag }}>{APP_VERSION}</div>
    </div>
  )
}

const welcomeKeyframes = `
@keyframes alWelcomeFloat { 0%{ transform:translateY(0) } 50%{ transform:translateY(-14px) } 100%{ transform:translateY(0) } }
@keyframes alWelcomeWord { 0%{ opacity:0; transform:translateY(18px) scale(0.92) } 100%{ opacity:1; transform:translateY(0) scale(1) } }
@keyframes alWelcomeGlow { 0%{ opacity:0.35 } 50%{ opacity:0.7 } 100%{ opacity:0.35 } }
@keyframes alWelcomePulse { 0%{ opacity:0.4 } 50%{ opacity:1 } 100%{ opacity:0.4 } }
`

const w = {
  page: { minHeight: '100vh', width: '100%', background: `radial-gradient(circle at 50% 30%, ${C.bg} 0%, ${C.bgDeep} 70%)`, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', fontFamily: "'Inter','Segoe UI',sans-serif", color: '#fff', position: 'relative', overflow: 'hidden', cursor: 'pointer' },
  glowA: { position: 'absolute', width: 420, height: 420, borderRadius: '50%', background: `${C.blue}33`, filter: 'blur(80px)', top: '10%', left: '-10%', animation: 'alWelcomeGlow 4s ease-in-out infinite' },
  glowB: { position: 'absolute', width: 380, height: 380, borderRadius: '50%', background: `${C.gold}22`, filter: 'blur(90px)', bottom: '5%', right: '-8%', animation: 'alWelcomeGlow 5s ease-in-out infinite reverse' },
  content: { textAlign: 'center', zIndex: 1, animation: 'alWelcomeFloat 5s ease-in-out infinite' },
  eyebrow: { display: 'block', fontSize: 14, letterSpacing: 8, color: C.bluePale, fontWeight: 700, marginBottom: 14 },
  title: { margin: 0, fontFamily: "'Georgia','Times New Roman',serif", fontWeight: 900, lineHeight: 1.05, letterSpacing: 2 },
  titleWord: { display: 'inline-block', fontSize: 'clamp(40px, 11vw, 84px)', color: '#fff', textShadow: `0 0 50px ${C.blue}aa, 0 0 100px ${C.blue}55`, animation: 'alWelcomeWord 0.7s ease both' },
  dash: { display: 'inline-block', fontSize: 'clamp(40px, 11vw, 84px)', color: C.gold },
  underline: { width: 120, height: 4, background: `linear-gradient(90deg, transparent, ${C.gold}, transparent)`, margin: '22px auto 0' },
  tap: { marginTop: 28, fontSize: 13, letterSpacing: 3, color: C.bluePale, fontWeight: 600, transition: 'opacity 0.5s ease', animation: 'alWelcomePulse 1.8s ease-in-out infinite' },
  versionTag: { position: 'absolute', bottom: 18, fontSize: 11, letterSpacing: 2, color: C.muted },
}

// ─── MENU ───────────────────────────────────────────────────────────────────
function MenuScreen({ onSelect }) {
  return (
    <div style={m.page}>
      <div style={{ textAlign: 'center', marginTop: 10, marginBottom: 30 }}>
        <span style={m.logo}>AFTER-LABURO</span>
        <span style={m.logoSub}>ELEGÍ A QUÉ JUGAR</span>
      </div>

      <div style={m.cardsWrap}>
        <button style={m.card} onClick={() => onSelect('csdm')}>
          <span style={m.cardIcon}>🃏</span>
          <span style={m.cardTitle}>CSDM</span>
          <span style={m.cardDesc}>Hasta dónde te animás · juego de cartas online, +18, 3 a 12 jugadores</span>
          <span style={m.cardCta}>Jugar →</span>
        </button>

        <button style={m.card} onClick={() => onSelect('anecdotas')}>
          <span style={m.cardIcon}>🎤</span>
          <span style={m.cardTitle}>ANÉCDOTAS IRL</span>
          <span style={m.cardDesc}>Leé una consigna, contá tu historia en voz alta y sumá puntos al mejor relato</span>
          <span style={m.cardCta}>Jugar →</span>
        </button>
      </div>

      <div style={m.versionTag}>{APP_VERSION}</div>
    </div>
  )
}

const m = {
  page: { minHeight: '100vh', width: '100%', background: `linear-gradient(160deg,${C.bg} 0%,${C.bgDeep} 100%)`, display: 'flex', flexDirection: 'column', alignItems: 'center', fontFamily: "'Inter','Segoe UI',sans-serif", color: C.text, padding: '50px 16px 40px', boxSizing: 'border-box' },
  logo: { display: 'block', fontSize: 'clamp(28px, 7vw, 42px)', fontWeight: 900, fontFamily: "'Georgia','Times New Roman',serif", color: '#fff', letterSpacing: 4, textShadow: `0 0 40px ${C.blue}77` },
  logoSub: { display: 'block', fontSize: 11, letterSpacing: 4, color: C.bluePale, marginTop: 8, fontWeight: 600 },
  cardsWrap: { display: 'flex', flexDirection: 'column', gap: 18, width: '100%', maxWidth: 420 },
  card: { background: C.panel, border: `1px solid ${C.border}`, borderRadius: 20, padding: '28px 24px', textAlign: 'left', display: 'flex', flexDirection: 'column', gap: 6, cursor: 'pointer', fontFamily: 'inherit', boxShadow: '0 20px 50px rgba(0,0,0,0.4)', transition: 'transform 0.15s, border 0.15s' },
  cardIcon: { fontSize: 32, marginBottom: 4 },
  cardTitle: { fontSize: 19, fontWeight: 900, color: '#fff', letterSpacing: 1 },
  cardDesc: { fontSize: 13, color: C.muted, lineHeight: 1.5 },
  cardCta: { fontSize: 13, color: C.blueHover, fontWeight: 700, marginTop: 8 },
  versionTag: { fontSize: 11, letterSpacing: 2, color: C.muted, marginTop: 32 },
}
