// ─── HORA DEL JIJEO — Liquid Glass design tokens ───────────────────────────
// Shared across App.jsx, CSDM.jsx, Anecdotas.jsx and YoNuncaNunca.jsx.
// Keep key names stable — every game's style block reads from this object.
export const C = {
  // base canvas that sits behind every glass surface (see *.page backgrounds)
  bg: '#0b0b14',
  bgDeep: '#050509',

  // glass material — translucent, paired with C.blurMd / C.blurLg as backdropFilter
  panel: 'rgba(255,255,255,0.05)',
  panelStrong: 'rgba(255,255,255,0.09)',
  border: 'rgba(255,255,255,0.16)',
  glassHighlight: 'rgba(255,255,255,0.30)',

  // single primary accent (iOS blue) — used for primary actions and brand glow
  blue: '#0A84FF',
  blueHover: '#3AA0FF',
  bluePale: '#BFE0FF',
  blueFaint: 'rgba(10,132,235,0.16)',

  // secondary "system" hues — reserved for score/status, never for chrome
  gold: '#FFD60A',
  goldFaint: 'rgba(255,214,10,0.14)',
  green: '#30D158',
  greenFaint: 'rgba(48,209,88,0.14)',
  red: '#FF453A',
  redFaint: 'rgba(255,69,58,0.14)',

  // text
  muted: 'rgba(235,235,245,0.55)',
  text: 'rgba(235,235,245,0.80)',
  bright: '#f5f5f7',

  // the glass recipe
  blurSm: 'blur(14px) saturate(180%)',
  blurMd: 'blur(22px) saturate(180%)',
  blurLg: 'blur(38px) saturate(190%)',
  radiusLg: 28,
  radiusMd: 18,
  radiusSm: 12,
  ease: 'cubic-bezier(0.4, 0.0, 0.2, 1)',
  font: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'SF Pro Text', 'Helvetica Neue', sans-serif",

  // ambient wallpaper blobs that show through every glass surface
  blobs: ['#5e5ce6', '#ff375f', '#0a84ff', '#30d158', '#ffd60a'],
}

// Layered radial-gradient "wallpaper" — drop straight into any `page` background.
// No extra DOM nodes needed: the soft gradient stops already read as blurred blobs,
// and any glass surface placed on top will refract it via backdropFilter.
export function wallpaper() {
  const [c1, c2, c3, c4, c5] = C.blobs
  return `
    radial-gradient(620px circle at 6% -8%, ${c1}4d, transparent 60%),
    radial-gradient(580px circle at 108% 14%, ${c5}33, transparent 60%),
    radial-gradient(560px circle at 96% 104%, ${c2}4a, transparent 60%),
    radial-gradient(520px circle at -8% 92%, ${c3}45, transparent 60%),
    radial-gradient(420px circle at 46% 50%, ${c4}26, transparent 60%),
    linear-gradient(160deg, ${C.bg} 0%, ${C.bgDeep} 100%)
  `
}
