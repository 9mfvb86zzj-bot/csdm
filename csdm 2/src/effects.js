// ─── Liquid Glass microinteractions ────────────────────────────────────────
// Shared across every screen: live specular highlight on glass surfaces,
// synthesized sound feedback (no audio files needed) and a small confetti
// burst for win moments. Import what each screen needs.

// Pointer-tracked specular highlight — pair with the .glass-shine class
// (defined globally in index.html) on any glass card/button.
export function handleShine(e) {
  const el = e.currentTarget
  const r = el.getBoundingClientRect()
  el.style.setProperty('--mx', ((e.clientX - r.left) / r.width) * 100 + '%')
  el.style.setProperty('--my', ((e.clientY - r.top) / r.height) * 100 + '%')
}

// ─── Sound (Web Audio, synthesized — no assets to host) ────────────────────
let _ctx
function getCtx() {
  if (!_ctx) {
    const Ctx = window.AudioContext || window.webkitAudioContext
    if (!Ctx) return null
    _ctx = new Ctx()
  }
  if (_ctx.state === 'suspended') _ctx.resume()
  return _ctx
}

// Soft tap — for "next card", "vote sent", "consigna revelada"
export function playPop() {
  try {
    const ctx = getCtx()
    if (!ctx) return
    const o = ctx.createOscillator()
    const g = ctx.createGain()
    o.type = 'sine'
    o.frequency.setValueAtTime(640, ctx.currentTime)
    o.frequency.exponentialRampToValueAtTime(380, ctx.currentTime + 0.09)
    g.gain.setValueAtTime(0.14, ctx.currentTime)
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.13)
    o.connect(g); g.connect(ctx.destination)
    o.start(); o.stop(ctx.currentTime + 0.14)
  } catch (e) { /* audio is a nicety, never block the game on it */ }
}

// Tiny triumphant arpeggio — for round winners / awarded points
export function playWin() {
  try {
    const ctx = getCtx()
    if (!ctx) return
    const notes = [523.25, 659.25, 783.99]
    notes.forEach((freq, i) => {
      const o = ctx.createOscillator()
      const g = ctx.createGain()
      o.type = 'triangle'
      o.frequency.value = freq
      const t0 = ctx.currentTime + i * 0.09
      g.gain.setValueAtTime(0.0001, t0)
      g.gain.linearRampToValueAtTime(0.16, t0 + 0.02)
      g.gain.exponentialRampToValueAtTime(0.001, t0 + 0.35)
      o.connect(g); g.connect(ctx.destination)
      o.start(t0); o.stop(t0 + 0.36)
    })
  } catch (e) {}
}

// ─── Confetti (pairs with @keyframes alConfetti in index.html) ─────────────
const CONFETTI_COLORS = ['#0A84FF', '#FFD60A', '#FF375F', '#30D158', '#5e5ce6']

export function burstConfetti(x, y) {
  const n = 14
  for (let i = 0; i < n; i++) {
    const el = document.createElement('span')
    const angle = (Math.PI * 2 * i) / n + Math.random() * 0.5
    const dist = 55 + Math.random() * 45
    const dx = Math.cos(angle) * dist
    const dy = Math.sin(angle) * dist - 26
    el.style.cssText = `position:fixed; left:${x}px; top:${y}px; width:7px; height:7px;` +
      `background:${CONFETTI_COLORS[i % CONFETTI_COLORS.length]}; border-radius:${i % 2 ? '50%' : '2px'};` +
      `pointer-events:none; z-index:9999; transform:translate(-50%,-50%);` +
      `animation: alConfetti 0.7s cubic-bezier(0.2,0.8,0.3,1) forwards;` +
      `--dx:${dx}px; --dy:${dy}px;`
    document.body.appendChild(el)
    setTimeout(() => el.remove(), 760)
  }
}

export function burstConfettiFromEvent(e) {
  const r = e.currentTarget.getBoundingClientRect()
  burstConfetti(r.left + r.width / 2, r.top + r.height / 2)
}

export function burstConfettiFromRect(r) {
  burstConfetti(r.left + r.width / 2, r.top + r.height / 2)
}
