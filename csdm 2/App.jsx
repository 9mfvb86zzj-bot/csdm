import { useState, useEffect, useRef } from 'react'
import { ref, set, get, update, onValue, off } from 'firebase/database'
import { db } from './firebase'
import { BLACK_CARDS, WHITE_CARDS, shuffle } from './cards'

// ─── helpers ─────────────────────────────────────────────────────────────────
function genCode() {
  return Math.random().toString(36).substring(2, 7).toUpperCase()
}
function genId() {
  return Math.random().toString(36).substring(2, 12)
}
function getOrCreatePlayerId() {
  let id = sessionStorage.getItem('csdm_pid')
  if (!id) { id = genId(); sessionStorage.setItem('csdm_pid', id) }
  return id
}

// ─── colors ──────────────────────────────────────────────────────────────────
const C = {
  bg: '#0D1B4B', bgDeep: '#080F2E', panel: '#112060',
  border: '#1E3A8A', blue: '#2563EB', blueHover: '#3B82F6',
  bluePale: '#BFDBFE', blueFaint: 'rgba(37,99,235,0.15)',
  white: '#FFFFFF', gold: '#FBBF24', goldFaint: 'rgba(251,191,36,0.12)',
  green: '#22C55E', greenFaint: 'rgba(34,197,94,0.12)',
  red: '#EF4444', muted: '#64748B', text: '#CBD5E1', bright: '#E2E8F0',
}

// ─── root ────────────────────────────────────────────────────────────────────
export default function App() {
  const [screen, setScreen] = useState('home')   // home | game
  const [roomCode, setRoomCode] = useState('')
  const playerId = useRef(getOrCreatePlayerId()).current

  if (screen === 'home') {
    return (
      <HomeScreen
        playerId={playerId}
        onEnter={code => { setRoomCode(code); setScreen('game') }}
      />
    )
  }
  return (
    <GameScreen
      roomCode={roomCode}
      playerId={playerId}
      onLeave={() => setScreen('home')}
    />
  )
}

// ─── home screen ─────────────────────────────────────────────────────────────
function HomeScreen({ playerId, onEnter }) {
  const [name, setName]       = useState('')
  const [code, setCode]       = useState('')
  const [mode, setMode]       = useState('create')
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')

  async function handleCreate() {
    if (!name.trim()) { setError('Escribí tu nombre'); return }
    setLoading(true); setError('')
    const roomCode = genCode()
    const whiteDeck = shuffle(WHITE_CARDS)
    const hand = whiteDeck.splice(0, 10)
    const room = {
      code: roomCode,
      phase: 'lobby',
      hostId: playerId,
      hdpIndex: 0,
      currentBlack: null,
      blackDeck: shuffle(BLACK_CARDS),
      whiteDeck,
      submissions: [],
      votes: {},
      roundWinner: null,
      revealIndex: -1,
      players: {
        [playerId]: {
          id: playerId, name: name.trim(),
          hand, score: 0,
          submitted: false, submittedCard: null,
          vote: null, isHost: true,
        }
      }
    }
    await set(ref(db, `rooms/${roomCode}`), room)
    sessionStorage.setItem('csdm_name', name.trim())
    setLoading(false)
    onEnter(roomCode)
  }

  async function handleJoin() {
    if (!name.trim()) { setError('Escribí tu nombre'); return }
    if (!code.trim())  { setError('Ingresá el código'); return }
    setLoading(true); setError('')
    const roomCode = code.trim().toUpperCase()
    const snap = await get(ref(db, `rooms/${roomCode}`))
    if (!snap.exists()) { setError('Sala no encontrada'); setLoading(false); return }
    const room = snap.val()
    if (room.phase !== 'lobby') { setError('La partida ya comenzó'); setLoading(false); return }
    const playerCount = Object.keys(room.players || {}).length
    if (playerCount >= 12) { setError('Sala llena (máx 12)'); setLoading(false); return }

    const whiteDeck = room.whiteDeck || []
    const hand = whiteDeck.splice(0, 10)
    await update(ref(db, `rooms/${roomCode}`), { whiteDeck })
    await set(ref(db, `rooms/${roomCode}/players/${playerId}`), {
      id: playerId, name: name.trim(),
      hand, score: 0,
      submitted: false, submittedCard: null,
      vote: null, isHost: false,
    })
    sessionStorage.setItem('csdm_name', name.trim())
    setLoading(false)
    onEnter(roomCode)
  }

  return (
    <div style={s.page}>
      <div style={s.homeCard}>
        <div style={{ textAlign: 'center', marginBottom: 8 }}>
          <span style={s.logoMain}>CSDM</span>
          <span style={s.logoSub}>HASTA DONDE TE ANIMÁS</span>
        </div>
        <p style={s.homeDesc}>Juego de cartas · +18 · 3 a 12 jugadores</p>

        <div style={s.tabs}>
          {['create','join'].map(m => (
            <button key={m} style={mode===m ? s.tabOn : s.tabOff} onClick={() => setMode(m)}>
              {m === 'create' ? 'Crear sala' : 'Unirse'}
            </button>
          ))}
        </div>

        <input style={s.input} placeholder="Tu nombre..." value={name}
          onChange={e => setName(e.target.value)}
          onKeyDown={e => e.key==='Enter' && (mode==='create' ? handleCreate() : handleJoin())}
          maxLength={20} />

        {mode === 'join' && (
          <input style={{...s.input, marginTop:10, letterSpacing:4, textTransform:'uppercase'}}
            placeholder="Código de sala..." value={code}
            onChange={e => setCode(e.target.value.toUpperCase())}
            onKeyDown={e => e.key==='Enter' && handleJoin()}
            maxLength={5} />
        )}

        {error && <div style={s.errorBox}>{error}</div>}

        <button style={{...s.btnPrimary, opacity: loading ? 0.5 : 1}}
          disabled={loading}
          onClick={mode==='create' ? handleCreate : handleJoin}>
          {loading ? 'Cargando...' : mode==='create' ? '¡Crear sala!' : 'Entrar'}
        </button>

        <p style={{color:C.muted, fontSize:12, textAlign:'center', marginTop:14, lineHeight:1.6}}>
          Creá una sala y compartí el código con tus amigos.<br/>
          Cada uno entra desde su propio dispositivo.
        </p>
      </div>
    </div>
  )
}

// ─── game screen ─────────────────────────────────────────────────────────────
function GameScreen({ roomCode, playerId, onLeave }) {
  const [room, setRoom] = useState(null)
  const [toast, setToast] = useState('')
  const [selectedIdx, setSelectedIdx] = useState(null)

  const showToast = msg => { setToast(msg); setTimeout(() => setToast(''), 3000) }

  // realtime listener
  useEffect(() => {
    const r = ref(db, `rooms/${roomCode}`)
    const unsub = onValue(r, snap => {
      if (snap.exists()) setRoom(snap.val())
    })
    return () => off(r)
  }, [roomCode])

  if (!room) {
    return (
      <div style={s.page}>
        <div style={{color:C.bluePale, fontSize:18, textAlign:'center', marginTop:80}}>
          Conectando a la sala <strong style={{color:C.gold}}>{roomCode}</strong>…
        </div>
      </div>
    )
  }

  const players      = Object.values(room.players || {})
  const me           = room.players?.[playerId]
  const isHost       = me?.isHost
  const hdpPlayer    = players[room.hdpIndex] || players[0]
  const isHdp        = hdpPlayer?.id === playerId
  const nonHdp       = players.filter(p => p.id !== hdpPlayer?.id)
  const submissions  = Array.isArray(room.submissions) ? room.submissions : []
  const revealIdx    = room.revealIndex ?? -1
  const allRevealed  = submissions.length > 0 && revealIdx >= submissions.length - 1
  const votes        = room.votes || {}
  const allVoted     = nonHdp.length > 0 && nonHdp.every(p => p.vote !== null)

  // ── actions ─────────────────────────────────────────────────────────────────

  async function startGame() {
    const snap = await get(ref(db, `rooms/${roomCode}`))
    const r = snap.val()
    const pList = Object.values(r.players)
    if (pList.length < 3) return
    const blackDeck = shuffle(BLACK_CARDS)
    const currentBlack = blackDeck.shift()
    const updates = {
      phase: 'playing',
      currentBlack,
      blackDeck,
      hdpIndex: 0,
      submissions: [],
      votes: {},
      roundWinner: null,
      revealIndex: -1,
    }
    Object.values(r.players).forEach(p => {
      updates[`players/${p.id}/submitted`]    = false
      updates[`players/${p.id}/submittedCard`]= null
      updates[`players/${p.id}/vote`]         = null
    })
    await update(ref(db, `rooms/${roomCode}`), updates)
  }

  async function submitCard() {
    if (selectedIdx === null || !me) return
    const card = me.hand[selectedIdx]
    const newHand = me.hand.filter((_, i) => i !== selectedIdx)

    // Check if all non-hdp have submitted after this
    const snap = await get(ref(db, `rooms/${roomCode}`))
    const r = snap.val()
    const pList = Object.values(r.players).filter(p => p.id !== hdpPlayer?.id)
    const alreadySubmitted = pList.filter(p => p.submitted || p.id === playerId)
    const allDone = alreadySubmitted.length === pList.length

    const updates = {
      [`players/${playerId}/submitted`]:    true,
      [`players/${playerId}/submittedCard`]: card,
      [`players/${playerId}/hand`]:          newHand,
    }

    if (allDone) {
      const subs = [
        ...pList.filter(p => p.submitted && p.id !== playerId)
          .map(p => ({ playerId: p.id, playerName: p.name, card: p.submittedCard })),
        { playerId, playerName: me.name, card }
      ]
      updates.submissions = shuffle(subs)
      updates.phase = 'judging'
      updates.revealIndex = -1
    }

    await update(ref(db, `rooms/${roomCode}`), updates)
    setSelectedIdx(null)
    showToast('Carta enviada ✓')
  }

  async function revealNext() {
    await update(ref(db, `rooms/${roomCode}`), {
      revealIndex: revealIdx + 1
    })
  }

  async function voteCard(targetPlayerId) {
    if (!me || me.vote !== null || isHdp) return
    if (targetPlayerId === playerId) return

    const snap = await get(ref(db, `rooms/${roomCode}`))
    const r = snap.val()
    const currentVotes = r.votes || {}
    const updVotes = { ...currentVotes, [targetPlayerId]: (currentVotes[targetPlayerId] || 0) + 1 }

    const updates = {
      [`players/${playerId}/vote`]: targetPlayerId,
      votes: updVotes,
    }

    // check if all voted
    const pList = Object.values(r.players).filter(p => p.id !== hdpPlayer?.id)
    const votedSoFar = pList.filter(p => p.vote !== null || p.id === playerId).length
    if (votedSoFar === pList.length) {
      // find winner
      let maxV = 0, winnerId = null
      Object.entries(updVotes).forEach(([pid, v]) => { if (v > maxV) { maxV = v; winnerId = pid } })
      const winnerSub = submissions.find(s => s.playerId === winnerId)
      updates.roundWinner = winnerSub || null
      updates.phase = 'result'
      if (winnerId) updates[`players/${winnerId}/score`] = (r.players[winnerId]?.score || 0) + 1

      // refill hands
      let deck = [...(r.whiteDeck || [])]
      if (deck.length < 30) deck = [...deck, ...shuffle(WHITE_CARDS)]
      Object.values(r.players).forEach(p => {
        const needed = 10 - (p.hand?.length || 0) - (p.submitted ? 1 : 0)
        if (needed > 0) {
          updates[`players/${p.id}/hand`] = [...(p.hand || []), ...deck.splice(0, needed)]
        }
      })
      updates.whiteDeck = deck
    }

    await update(ref(db, `rooms/${roomCode}`), updates)
  }

  async function nextRound() {
    const snap = await get(ref(db, `rooms/${roomCode}`))
    const r = snap.val()
    const pList = Object.values(r.players)
    const newHdp = (r.hdpIndex + 1) % pList.length
    let blackDeck = Array.isArray(r.blackDeck) && r.blackDeck.length > 0
      ? r.blackDeck : shuffle(BLACK_CARDS)
    const currentBlack = blackDeck[0]
    blackDeck = blackDeck.slice(1)

    const updates = {
      phase: 'playing', currentBlack, blackDeck,
      hdpIndex: newHdp, submissions: [],
      votes: {}, roundWinner: null, revealIndex: -1,
    }
    pList.forEach(p => {
      updates[`players/${p.id}/submitted`]    = false
      updates[`players/${p.id}/submittedCard`]= null
      updates[`players/${p.id}/vote`]         = null
    })
    await update(ref(db, `rooms/${roomCode}`), updates)
  }

  async function leaveRoom() {
    if (isHost && players.length > 1) {
      // transfer host
      const next = players.find(p => p.id !== playerId)
      if (next) await update(ref(db, `rooms/${roomCode}/players/${next.id}`), { isHost: true })
    }
    await set(ref(db, `rooms/${roomCode}/players/${playerId}`), null)
    onLeave()
  }

  // ── LOBBY ────────────────────────────────────────────────────────────────────
  if (room.phase === 'lobby') {
    return (
      <div style={s.page}>
        <div style={s.roomCard}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:24 }}>
            <span style={s.logoMain}>CSDM</span>
            <div style={s.codePill}>
              Código: <strong style={{color:C.gold, letterSpacing:3}}>{roomCode}</strong>
            </div>
          </div>

          <div style={s.sectionLabel}>JUGADORES EN SALA</div>
          <div style={{ display:'flex', flexDirection:'column', gap:8, marginBottom:20 }}>
            {players.map(p => (
              <div key={p.id} style={s.lobbyRow}>
                <span style={{...s.dot, background: p.id===playerId ? C.green : C.blue}} />
                <span style={{flex:1, fontSize:15, color:C.bright}}>
                  {p.name} {p.isHost ? '👑' : ''}
                </span>
                {p.id === playerId && <span style={s.youBadge}>Vos</span>}
              </div>
            ))}
          </div>

          <div style={s.shareBox}>
            📲 Compartí el código <strong style={{color:C.gold}}>{roomCode}</strong> con tus amigos.<br/>
            Cada uno entra desde su celular o computadora.
          </div>

          {players.length < 3
            ? <div style={s.waitBox}>Esperando jugadores… (mínimo 3, hay {players.length})</div>
            : isHost
              ? <button style={s.btnPrimary} onClick={startGame}>¡Empezar partida!</button>
              : <div style={s.waitBox}>Esperando que {players.find(p=>p.isHost)?.name} inicie…</div>
          }

          <button style={s.btnGhost} onClick={leaveRoom}>Salir de la sala</button>
        </div>
        {toast && <Toast msg={toast} />}
      </div>
    )
  }

  const hdpName = hdpPlayer?.name || '?'
  const submittedCount = nonHdp.filter(p => p.submitted).length

  // ── RESULT ───────────────────────────────────────────────────────────────────
  if (room.phase === 'result') {
    const sorted = [...players].sort((a,b) => b.score - a.score)
    return (
      <div style={s.page}>
        <GameHeader room={room} players={players} playerId={playerId} roomCode={roomCode} />
        <div style={s.body}>
          <div style={s.resultBanner}>🏆 RONDA TERMINADA</div>
          <BlackCard text={room.currentBlack} />

          {room.roundWinner && (
            <div style={s.winnerBox}>
              <div style={s.winnerLabel}>Carta más votada</div>
              <div style={s.winnerWhite}>
                <p style={{color:'#1a1a2e', fontSize:17, fontWeight:700, margin:0, lineHeight:1.4}}>
                  {room.roundWinner.card}
                </p>
                <div style={{color:C.blue, fontSize:13, fontWeight:700, marginTop:10}}>
                  — {room.roundWinner.playerName}
                </div>
              </div>
              <div style={{display:'flex', gap:8, justifyContent:'center', flexWrap:'wrap', marginTop:12}}>
                {submissions.map(s => (
                  <div key={s.playerId} style={s.voteChip}>
                    <span style={{color:C.text}}>{s.playerName}</span>
                    <span style={{color:C.gold, fontWeight:700, marginLeft:6}}>
                      {votes[s.playerId] || 0} voto{votes[s.playerId]===1?'':'s'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div style={s.scoreboard}>
            <div style={s.sectionLabel}>PUNTAJE</div>
            {sorted.map((p,i) => (
              <div key={p.id} style={s.scoreRow}>
                <span style={{fontSize:20, width:28}}>{['🥇','🥈','🥉'][i] || `${i+1}.`}</span>
                <span style={{flex:1, fontSize:15, color:C.bright,
                  fontWeight: p.id===playerId ? 800 : 400}}>{p.name}</span>
                <span style={{fontSize:15, color:C.gold, fontWeight:800}}>{p.score} pts</span>
              </div>
            ))}
          </div>

          {isHost
            ? <button style={s.btnPrimary} onClick={nextRound}>Siguiente ronda →</button>
            : <div style={s.waitBox}>Esperando que el host pase a la siguiente ronda…</div>
          }
        </div>
        {toast && <Toast msg={toast} />}
      </div>
    )
  }

  // ── JUDGING ──────────────────────────────────────────────────────────────────
  if (room.phase === 'judging') {
    return (
      <div style={s.page}>
        <GameHeader room={room} players={players} playerId={playerId} roomCode={roomCode} />
        <div style={s.body}>
          <div style={s.phaseTitle}>⚖️ Todos votan la mejor carta</div>
          <BlackCard text={room.currentBlack} />

          {isHdp && (
            <div style={s.hdpBox}>
              <div style={s.hdpBadge}>👑 Sos el HDP esta ronda</div>
              <p style={{color:C.muted, fontSize:14, marginTop:8, lineHeight:1.6}}>
                Revelá las cartas de a una. Cuando todas estén visibles, el resto vota.
              </p>
              {!allRevealed
                ? <button style={{...s.btnPrimary, marginTop:12}} onClick={revealNext}>
                    Revelar siguiente ({revealIdx+1}/{submissions.length})
                  </button>
                : <div style={{...s.waitBox, marginTop:12}}>
                    Todas reveladas — esperando votos… ({nonHdp.filter(p=>p.vote!==null).length}/{nonHdp.length})
                  </div>
              }
            </div>
          )}

          <div style={s.cardsGrid}>
            {submissions.map((sub, i) => {
              const revealed = i <= revealIdx
              const iVoted   = me?.vote === sub.playerId
              const vCount   = votes[sub.playerId] || 0
              const canVote  = revealed && allRevealed && !isHdp && sub.playerId !== playerId && !me?.vote

              return (
                <div
                  key={i}
                  style={{
                    ...s.subCard,
                    ...(revealed ? s.subRevealed : s.subHidden),
                    ...(iVoted ? s.subVoted : {}),
                    cursor: canVote ? 'pointer' : 'default',
                    transform: canVote ? 'translateY(0)' : 'none',
                  }}
                  onClick={() => canVote && voteCard(sub.playerId)}
                >
                  {revealed ? (
                    <>
                      <p style={{color:'#1a1a2e', fontSize:14, fontWeight:600, lineHeight:1.4, margin:0}}>
                        {sub.card}
                      </p>
                      {iVoted && (
                        <div style={s.votedBadge}>Tu voto ✓</div>
                      )}
                      {allVoted && vCount > 0 && (
                        <div style={s.voteCountBadge}>{vCount} voto{vCount===1?'':'s'}</div>
                      )}
                    </>
                  ) : (
                    <div style={s.cardBack}>
                      <span style={{color:'rgba(255,255,255,0.08)', fontSize:18, fontWeight:900, letterSpacing:3}}>CSDM</span>
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          {!isHdp && allRevealed && !me?.vote && me?.id !== hdpPlayer?.id && (
            <div style={{color:C.bluePale, textAlign:'center', fontSize:14, padding:10}}>
              👆 Tocá la carta que te parece la mejor
            </div>
          )}
          {!isHdp && me?.vote && (
            <div style={s.votedConfirm}>
              ✅ Voto registrado — esperando a los demás… ({nonHdp.filter(p=>p.vote!==null).length}/{nonHdp.length})
            </div>
          )}
        </div>
        {toast && <Toast msg={toast} />}
      </div>
    )
  }

  // ── PLAYING ──────────────────────────────────────────────────────────────────
  const iSubmitted = me?.submitted

  return (
    <div style={s.page}>
      <GameHeader room={room} players={players} playerId={playerId} roomCode={roomCode} />
      <div style={s.body}>
        <div style={s.progressRow}>
          <div style={s.track}>
            <div style={{...s.fill, width:`${nonHdp.length ? (submittedCount/nonHdp.length)*100 : 0}%`}} />
          </div>
          <span style={{fontSize:12, color:C.muted, whiteSpace:'nowrap'}}>
            {submittedCount}/{nonHdp.length} enviadas
          </span>
        </div>

        <BlackCard text={room.currentBlack} />

        {isHdp ? (
          <div style={s.hdpBox}>
            <div style={s.hdpBadge}>👑 Sos el HDP esta ronda</div>
            <p style={{color:C.muted, fontSize:14, marginTop:8, lineHeight:1.6}}>
              Esperá que todos elijan su carta. Después vas a revelarlas y el grupo vota.
            </p>
            <div style={{display:'flex', flexWrap:'wrap', gap:8, justifyContent:'center', marginTop:14}}>
              {nonHdp.map(p => (
                <div key={p.id} style={s.playerChip}>
                  <span style={{...s.dot, background: p.submitted ? C.green : C.muted}} />
                  {p.name} {p.submitted ? '✓' : '…'}
                </div>
              ))}
            </div>
          </div>
        ) : iSubmitted ? (
          <div style={{textAlign:'center'}}>
            <div style={{color:C.green, fontSize:16, fontWeight:700, marginBottom:12}}>
              ✅ Tu carta fue enviada
            </div>
            <div style={s.sentCard}>{me?.submittedCard}</div>
            <div style={{display:'flex', flexWrap:'wrap', gap:8, justifyContent:'center', marginTop:14}}>
              {nonHdp.map(p => (
                <div key={p.id} style={s.playerChip}>
                  <span style={{...s.dot, background: p.submitted ? C.green : C.muted}} />
                  {p.name} {p.submitted ? '✓' : '…'}
                </div>
              ))}
            </div>
          </div>
        ) : (
          <>
            <div style={{fontSize:14, color:C.muted, marginBottom:14}}>
              Tu mano — <span style={{color:C.bluePale}}>seleccioná y editá tu carta antes de enviar</span>
            </div>
            <div style={s.handGrid}>
              {(me?.hand || []).map((card, i) => (
                <HandCard
                  key={i}
                  text={card}
                  selected={selectedIdx === i}
                  onSelect={() => setSelectedIdx(selectedIdx === i ? null : i)}
                  onEdit={newText => {
                    // Optimistic local update
                    update(ref(db, `rooms/${roomCode}/players/${playerId}/hand`),
                      me.hand.map((c, idx) => idx === i ? newText : c))
                  }}
                />
              ))}
            </div>
            <button
              style={{...s.btnPrimary, opacity: selectedIdx===null ? 0.35 : 1}}
              disabled={selectedIdx === null}
              onClick={submitCard}>
              Enviar carta
            </button>
          </>
        )}
      </div>
      {toast && <Toast msg={toast} />}
    </div>
  )
}

// ─── sub-components ───────────────────────────────────────────────────────────
function HandCard({ text, selected, onSelect, onEdit }) {
  const [editing, setEditing] = useState(false)
  const [val, setVal] = useState(text)

  useEffect(() => setVal(text), [text])

  return (
    <div
      style={{...s.handCard, ...(selected ? s.handCardOn : {})}}
      onClick={() => { if (!editing) onSelect() }}
    >
      {editing ? (
        <textarea
          autoFocus
          style={s.textarea}
          value={val}
          onChange={e => setVal(e.target.value)}
          onBlur={() => { setEditing(false); onEdit(val) }}
          onClick={e => e.stopPropagation()}
          rows={3}
        />
      ) : (
        <p style={{color:'#1a1a2e', fontSize:14, fontWeight:600, lineHeight:1.4, margin:0, flex:1}}>
          {val}
        </p>
      )}
      <button
        style={s.editBtn}
        onClick={e => { e.stopPropagation(); setEditing(!editing) }}>
        {editing ? 'ok' : '✏️'}
      </button>
      {selected && !editing && <div style={s.selBadge}>✓</div>}
    </div>
  )
}

function GameHeader({ room, players, playerId, roomCode }) {
  const hdp = players[room.hdpIndex] || players[0]
  const sorted = [...players].sort((a,b) => b.score - a.score)
  return (
    <div style={s.header}>
      <span style={{...s.logoMain, fontSize:22, letterSpacing:6}}>CSDM</span>
      <div style={s.headerMid}>
        <span style={s.codePill}>{roomCode}</span>
        <span style={{...s.codePill, background:C.goldFaint, border:`1px solid ${C.gold}44`, color:C.gold}}>
          HDP: {hdp?.name}
        </span>
      </div>
      <div style={{display:'flex', gap:8, flexWrap:'wrap'}}>
        {sorted.slice(0,4).map(p => (
          <span key={p.id} style={{
            fontSize:12, color: p.id===playerId ? C.bluePale : C.muted
          }}>
            {p.name} <b style={{color:C.gold}}>{p.score}</b>
          </span>
        ))}
      </div>
    </div>
  )
}

function BlackCard({ text }) {
  return (
    <div style={s.blackCard}>
      <div style={{fontSize:10, letterSpacing:3, color:'#333', fontWeight:700, marginBottom:14}}>CSDM</div>
      <p style={{color:'#fff', fontSize:20, fontWeight:700, lineHeight:1.5, margin:0}}>
        {text || 'Cargando…'}
      </p>
    </div>
  )
}

function Toast({ msg }) {
  return (
    <div style={{
      position:'fixed', bottom:24, left:'50%', transform:'translateX(-50%)',
      background:C.blue, color:'#fff', padding:'12px 24px', borderRadius:30,
      fontSize:14, fontWeight:700, boxShadow:'0 8px 32px rgba(0,0,0,0.4)',
      zIndex:999, whiteSpace:'nowrap',
    }}>{msg}</div>
  )
}

// ─── styles ──────────────────────────────────────────────────────────────────
const s = {
  page: {
    minHeight:'100vh',
    background:`linear-gradient(160deg, ${C.bg} 0%, ${C.bgDeep} 100%)`,
    display:'flex', flexDirection:'column', alignItems:'center',
    fontFamily:"'Inter','Segoe UI',sans-serif", color:C.text,
    padding:'20px 16px 60px',
  },
  homeCard: {
    background:C.panel, border:`1px solid ${C.border}`,
    borderRadius:20, padding:'40px 32px', width:'100%', maxWidth:420,
    boxShadow:'0 32px 80px rgba(0,0,0,0.5)', marginTop:40,
  },
  roomCard: {
    background:C.panel, border:`1px solid ${C.border}`,
    borderRadius:20, padding:'32px 28px', width:'100%', maxWidth:440,
    boxShadow:'0 32px 80px rgba(0,0,0,0.5)', marginTop:20,
  },
  logoMain: {
    display:'block', fontSize:72, fontWeight:900,
    fontFamily:"'Georgia','Times New Roman',serif",
    color:'#fff', letterSpacing:10, lineHeight:1,
    textShadow:`0 0 60px ${C.blue}88, 0 0 20px ${C.blue}44`,
  },
  logoSub: {
    display:'block', fontSize:11, letterSpacing:4,
    color:C.bluePale, marginTop:6, fontWeight:600,
  },
  homeDesc: { color:C.muted, textAlign:'center', fontSize:13, marginBottom:28, marginTop:8 },
  tabs: {
    display:'flex', gap:8, marginBottom:18,
    background:'rgba(0,0,0,0.3)', borderRadius:10, padding:4,
  },
  tabOn: {
    flex:1, background:C.blue, border:'none', color:'#fff',
    borderRadius:8, padding:10, fontSize:14, cursor:'pointer',
    fontFamily:'inherit', fontWeight:700, boxShadow:`0 4px 16px ${C.blue}66`,
  },
  tabOff: {
    flex:1, background:'transparent', border:'none', color:C.muted,
    borderRadius:8, padding:10, fontSize:14, cursor:'pointer',
    fontFamily:'inherit', fontWeight:600,
  },
  input: {
    width:'100%', background:'rgba(255,255,255,0.06)',
    border:`1px solid ${C.border}`, borderRadius:10,
    color:'#fff', padding:'12px 16px', fontSize:15,
    outline:'none', fontFamily:'inherit', boxSizing:'border-box',
  },
  errorBox: {
    color:'#FCA5A5', background:'rgba(239,68,68,0.1)',
    border:'1px solid rgba(239,68,68,0.3)',
    borderRadius:8, padding:'10px 14px', fontSize:13, marginTop:12,
  },
  btnPrimary: {
    width:'100%', background:`linear-gradient(135deg, ${C.blue}, ${C.blueHover})`,
    border:'none', color:'#fff', borderRadius:12, padding:15,
    fontSize:16, fontWeight:800, letterSpacing:1, cursor:'pointer',
    fontFamily:'inherit', marginTop:16, boxShadow:`0 8px 24px ${C.blue}44`,
    transition:'opacity 0.2s',
  },
  btnGhost: {
    width:'100%', background:'transparent', border:`1px solid ${C.border}`,
    color:C.muted, borderRadius:10, padding:12, fontSize:14,
    cursor:'pointer', fontFamily:'inherit', marginTop:10,
  },
  codePill: {
    background:C.blueFaint, border:`1px solid ${C.border}`,
    borderRadius:8, padding:'6px 14px', fontSize:14, color:C.bluePale,
  },
  sectionLabel: { fontSize:11, letterSpacing:3, color:C.muted, fontWeight:700, marginBottom:12 },
  lobbyRow: {
    display:'flex', alignItems:'center', gap:10,
    background:'rgba(255,255,255,0.04)', border:`1px solid ${C.border}`,
    borderRadius:10, padding:'10px 14px',
  },
  dot: { width:8, height:8, borderRadius:'50%', flexShrink:0 },
  youBadge: {
    fontSize:11, fontWeight:700, color:C.blue,
    background:C.blueFaint, padding:'2px 8px', borderRadius:20,
    border:`1px solid ${C.border}`,
  },
  shareBox: {
    background:'rgba(251,191,36,0.08)', border:`1px solid ${C.gold}33`,
    borderRadius:12, padding:16, fontSize:14, color:C.text,
    lineHeight:1.6, textAlign:'center', marginBottom:16,
  },
  waitBox: {
    background:C.blueFaint, border:`1px solid ${C.border}`,
    borderRadius:10, padding:14, color:C.bluePale,
    textAlign:'center', fontSize:14, marginTop:16,
  },
  header: {
    width:'100%', maxWidth:640,
    background:'rgba(8,15,46,0.85)', backdropFilter:'blur(12px)',
    borderBottom:`1px solid ${C.border}`, borderRadius:'0 0 16px 16px',
    padding:'10px 18px', display:'flex', alignItems:'center',
    gap:12, flexWrap:'wrap', marginBottom:8,
    position:'sticky', top:0, zIndex:50,
  },
  headerMid: { display:'flex', gap:8, alignItems:'center', flex:1 },
  body: { width:'100%', maxWidth:620, padding:'12px 0' },
  progressRow: { display:'flex', alignItems:'center', gap:10, marginBottom:16 },
  track: {
    flex:1, height:4, background:'rgba(255,255,255,0.08)',
    borderRadius:2, overflow:'hidden',
  },
  fill: {
    height:'100%', background:`linear-gradient(90deg, ${C.blue}, ${C.blueHover})`,
    borderRadius:2, transition:'width 0.5s ease',
  },
  blackCard: {
    background:'#080808', border:'3px solid #1a1a2e', borderRadius:16,
    padding:'26px 24px', marginBottom:20, boxShadow:'0 12px 40px rgba(0,0,0,0.6)',
  },
  handGrid: {
    display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(170px, 1fr))',
    gap:12, marginBottom:16,
  },
  handCard: {
    background:'#fff', borderRadius:12, padding:14,
    border:'3px solid transparent', transition:'all 0.15s',
    boxShadow:'0 4px 16px rgba(0,0,0,0.3)', position:'relative',
    minHeight:120, display:'flex', flexDirection:'column', cursor:'pointer',
  },
  handCardOn: {
    border:`3px solid ${C.blue}`,
    transform:'translateY(-4px)',
    boxShadow:`0 12px 32px ${C.blue}44`,
  },
  textarea: {
    width:'100%', border:'none', background:'transparent',
    fontFamily:"'Inter',sans-serif", fontSize:14, fontWeight:600,
    color:'#1a1a2e', resize:'none', outline:'none',
    lineHeight:1.4, padding:0, boxSizing:'border-box', flex:1,
  },
  editBtn: {
    background:'transparent', border:'none', cursor:'pointer',
    fontSize:14, padding:'2px 4px', alignSelf:'flex-end', marginTop:4,
  },
  selBadge: {
    position:'absolute', bottom:8, right:8,
    fontSize:10, fontWeight:800, color:C.blue,
    background:C.blueFaint, padding:'2px 8px', borderRadius:10,
  },
  sentCard: {
    background:'#fff', color:'#1a1a2e', borderRadius:12,
    padding:'16px 20px', fontSize:15, fontWeight:600,
    maxWidth:300, margin:'0 auto', boxShadow:'0 4px 16px rgba(0,0,0,0.3)',
    border:`2px solid ${C.green}`,
  },
  hdpBox: {
    background:C.panel, border:`1px solid ${C.border}`,
    borderRadius:14, padding:20, textAlign:'center',
  },
  hdpBadge: {
    background:C.goldFaint, border:`1px solid ${C.gold}44`,
    color:C.gold, fontSize:15, fontWeight:700,
    padding:'8px 18px', borderRadius:20, display:'inline-block',
  },
  playerChip: {
    display:'flex', alignItems:'center', gap:6,
    fontSize:13, color:C.text, background:'rgba(255,255,255,0.04)',
    padding:'4px 12px', borderRadius:20,
  },
  phaseTitle: { fontSize:17, fontWeight:700, color:C.bluePale, marginBottom:16, textAlign:'center' },
  cardsGrid: {
    display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(170px, 1fr))',
    gap:12, marginBottom:16,
  },
  subCard: {
    borderRadius:12, minHeight:110, padding:14,
    border:'3px solid transparent', transition:'all 0.2s',
    position:'relative', display:'flex', flexDirection:'column', justifyContent:'center',
  },
  subRevealed: { background:'#fff', boxShadow:'0 4px 16px rgba(0,0,0,0.3)' },
  subHidden: { background:C.panel, border:`3px solid ${C.border}` },
  subVoted: { border:`3px solid ${C.blue}`, boxShadow:`0 8px 24px ${C.blue}44` },
  cardBack: {
    display:'flex', alignItems:'center', justifyContent:'center',
    height:80, background:`linear-gradient(135deg, #1E3A8A, #0D1B4B)`,
    borderRadius:8,
  },
  votedBadge: {
    position:'absolute', top:-8, right:-8,
    background:C.blue, color:'#fff', fontSize:10, fontWeight:800,
    padding:'3px 8px', borderRadius:10,
  },
  voteCountBadge: {
    position:'absolute', bottom:6, right:8,
    fontSize:11, fontWeight:700, color:C.gold,
  },
  votedConfirm: {
    background:C.greenFaint, border:`1px solid ${C.green}44`,
    borderRadius:10, padding:12, color:C.green,
    textAlign:'center', fontSize:14,
  },
  resultBanner: {
    fontSize:22, fontWeight:900, color:C.gold,
    letterSpacing:2, textAlign:'center', marginBottom:20,
  },
  winnerBox: {
    background:C.panel, border:`2px solid ${C.gold}44`,
    borderRadius:16, padding:20, marginBottom:20,
    textAlign:'center', boxShadow:`0 0 40px ${C.gold}18`,
  },
  winnerLabel: { fontSize:11, letterSpacing:3, color:C.gold, fontWeight:700, marginBottom:12 },
  winnerWhite: {
    background:'#fff', borderRadius:12, padding:18,
    maxWidth:280, margin:'0 auto', border:`3px solid ${C.gold}`,
  },
  voteChip: {
    display:'flex', alignItems:'center',
    background:'rgba(255,255,255,0.04)', padding:'4px 12px',
    borderRadius:20, fontSize:13,
  },
  scoreboard: {
    background:'rgba(0,0,0,0.3)', border:`1px solid ${C.border}`,
    borderRadius:14, padding:16, marginBottom:16,
  },
  scoreRow: {
    display:'flex', alignItems:'center', gap:10,
    padding:'8px 0', borderBottom:'1px solid rgba(255,255,255,0.04)',
  },
}
