import { useState, useEffect } from 'react'
import { C, wallpaper } from './theme'
import { handleShine, playPop } from './effects'
import CSDMGame from './games/CSDM'
import AnecdotasGame from './games/Anecdotas'
import YoNuncaNuncaGame from './games/YoNuncaNunca'

const APP_VERSION = 'v7.0'

export default function App() {
  const [screen, setScreen] = useState('welcome') // welcome | menu | csdm | anecdotas | nuncanunca

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
  if (screen === 'nuncanunca') {
    return <YoNuncaNuncaGame onExit={() => setScreen('menu')} />
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
      <div style={w.content}>
        <span style={w.eyebrow}>BIENVENIDO A LA</span>
        <h1 style={w.title}>
          <span style={{ ...w.titleWord, animationDelay: '0.05s' }}>HORA</span>{' '}
          <span style={{ ...w.titleWord, animationDelay: '0.2s' }}>DEL</span>{' '}
          <span style={{ ...w.titleWord, color: C.gold, textShadow: `0 0 50px ${C.gold}aa, 0 0 110px ${C.gold}55`, animationDelay: '0.35s' }}>JIJEO</span>
        </h1>
        <div style={w.underline} />
        <p style={{ ...w.tap, opacity: ready ? 1 : 0 }}>Tocá la pantalla para entrar</p>
      </div>
      <div style={w.versionTag}>{APP_VERSION}</div>
    </div>
  )
}

const welcomeKeyframes = `
@keyframes alWelcomeFloat { 0%{ transform:translateY(0) } 50%{ transform:translateY(-14px) } 100%{ transform:translateY(0) } }
@keyframes alWelcomeWord { 0%{ opacity:0; transform:translateY(18px) scale(0.92) } 100%{ opacity:1; transform:translateY(0) scale(1) } }
@keyframes alWelcomePulse { 0%{ opacity:0.4 } 50%{ opacity:1 } 100%{ opacity:0.4 } }
`

const w = {
  page: { minHeight: '100vh', width: '100%', background: wallpaper(), display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', fontFamily: C.font, color: '#fff', position: 'relative', overflow: 'hidden', cursor: 'pointer' },
  content: { textAlign: 'center', zIndex: 1, animation: 'alWelcomeFloat 5s ease-in-out infinite' },
  eyebrow: { display: 'block', fontSize: 14, letterSpacing: 8, color: C.bluePale, fontWeight: 600, marginBottom: 14 },
  title: { margin: 0, fontFamily: C.font, fontWeight: 600, lineHeight: 1.05, letterSpacing: 1 },
  titleWord: { display: 'inline-block', fontSize: 'clamp(40px, 11vw, 84px)', color: '#fff', textShadow: `0 0 50px ${C.blue}aa, 0 0 100px ${C.blue}55`, animation: 'alWelcomeWord 0.7s ease both' },
  underline: { width: 120, height: 2, background: `linear-gradient(90deg, transparent, ${C.gold}, transparent)`, margin: '22px auto 0' },
  tap: { marginTop: 28, fontSize: 13, letterSpacing: 3, color: C.bluePale, fontWeight: 500, transition: 'opacity 0.5s ease', animation: 'alWelcomePulse 1.8s ease-in-out infinite' },
  versionTag: { position: 'absolute', bottom: 18, fontSize: 11, letterSpacing: 2, color: C.muted },
}

// ─── MENU ───────────────────────────────────────────────────────────────────
function MenuScreen({ onSelect }) {
  return (
    <div style={m.page}>
      <div style={{ textAlign: 'center', marginTop: 10, marginBottom: 30 }}>
        <span style={m.logo}>HORA DEL JIJEO</span>
        <span style={m.logoSub}>ELEGÍ A QUÉ JUGAR</span>
      </div>

      <div style={m.cardsWrap}>
        <button style={m.card} className="glass-shine press-fx" onPointerMove={handleShine} onClick={() => { playPop(); onSelect('csdm') }}>
          <span style={m.cardIcon}>🃏</span>
          <span style={m.cardTitle}>CSDM</span>
          <span style={m.cardDesc}>Hasta dónde te animás · juego de cartas online, +18, 3 a 12 jugadores</span>
          <span style={m.cardCta}>Jugar →</span>
        </button>

        <button style={m.card} className="glass-shine press-fx" onPointerMove={handleShine} onClick={() => { playPop(); onSelect('anecdotas') }}>
          <span style={m.cardIcon}>🎤</span>
          <span style={m.cardTitle}>ANÉCDOTAS IRL</span>
          <span style={m.cardDesc}>Leé una consigna, contá tu historia en voz alta y sumá puntos al mejor relato</span>
          <span style={m.cardCta}>Jugar →</span>
        </button>

        <button style={m.card} className="glass-shine press-fx" onPointerMove={handleShine} onClick={() => { playPop(); onSelect('nuncanunca') }}>
          <span style={m.cardIcon}>🥂</span>
          <span style={m.cardTitle}>YO NUNCA NUNCA</span>
          <span style={m.cardDesc}>Consignas al azar por categoría · clásico, fiesta y picante, sin repetir</span>
          <span style={m.cardCta}>Jugar →</span>
        </button>

        <button style={m.card} className="glass-shine press-fx" onPointerMove={handleShine} onClick={() => { playPop(); window.location.href = '/games/90segundos.html' }}>
          <span style={m.cardIcon}>⏱️</span>
          <span style={m.cardTitle}>90 SEGUNDOS DE JIJEO</span>
          <span style={m.cardDesc}>Respondé la mayor cantidad de preguntas posibles en 90 segundos, con modo picante 🌶</span>
          <span style={m.cardCta}>Jugar →</span>
        </button>
      </div>

      <div style={m.versionTag}>{APP_VERSION}</div>
    </div>
  )
}

const m = {
  page: { minHeight: '100vh', width: '100%', background: wallpaper(), display: 'flex', flexDirection: 'column', alignItems: 'center', fontFamily: C.font, color: C.text, padding: '50px 16px 40px', boxSizing: 'border-box' },
  logo: { display: 'block', fontSize: 'clamp(26px, 6.5vw, 38px)', fontWeight: 600, fontFamily: C.font, color: '#fff', letterSpacing: 1, textShadow: `0 0 40px ${C.blue}66` },
  logoSub: { display: 'block', fontSize: 11, letterSpacing: 4, color: C.bluePale, marginTop: 8, fontWeight: 500 },
  cardsWrap: { display: 'flex', flexDirection: 'column', gap: 16, width: '100%', maxWidth: 420 },
  card: {
    position: 'relative',
    background: `linear-gradient(135deg, ${C.panelStrong}, ${C.panel})`,
    border: `1px solid ${C.border}`,
    borderRadius: C.radiusLg,
    padding: '26px 24px',
    textAlign: 'left',
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
    cursor: 'pointer',
    fontFamily: 'inherit',
    backdropFilter: C.blurLg,
    WebkitBackdropFilter: C.blurLg,
    boxShadow: `0 20px 50px rgba(0,0,0,0.4), inset 0 1px 0 ${C.glassHighlight}`,
    transition: `transform 0.15s ${C.ease}, border 0.15s ${C.ease}`,
  },
  cardIcon: { fontSize: 30, marginBottom: 4 },
  cardTitle: { fontSize: 18, fontWeight: 600, color: '#fff', letterSpacing: 0.5 },
  cardDesc: { fontSize: 13, color: C.muted, lineHeight: 1.5, fontWeight: 400 },
  cardCta: { fontSize: 13, color: C.bluePale, fontWeight: 600, marginTop: 8 },
  versionTag: { fontSize: 11, letterSpacing: 2, color: C.muted, marginTop: 32 },
}
