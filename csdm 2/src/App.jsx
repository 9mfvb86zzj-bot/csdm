import { useState, useEffect, useRef } from 'react'
import { ref, set, get, update, onValue, off, push } from 'firebase/database'
import { db } from './firebase'
import { BLACK_CARDS, WHITE_CARDS, shuffle } from './cards'

const VERSION = 'v2.1'

function genCode() { return Math.random().toString(36).substring(2, 7).toUpperCase() }
function genId()   { return Math.random().toString(36).substring(2, 12) }
function getOrCreatePlayerId() {
  let id = sessionStorage.getItem('csdm_pid')
  if (!id) { id = genId(); sessionStorage.setItem('csdm_pid', id) }
  return id
}

const C = {
  bg: '#0D1B4B', bgDeep: '#080F2E', panel: '#112060',
  border: '#1E3A8A', blue: '#2563EB', blueHover: '#3B82F6',
  bluePale: '#BFDBFE', blueFaint: 'rgba(37,99,235,0.15)',
  gold: '#FBBF24', goldFaint: 'rgba(251,191,36,0.12)',
  green: '#22C55E', muted: '#64748B', text: '#CBD5E1', bright: '#E2E8F0',
}

export default function App() {
  const [screen, setScreen]     = useState('home')
  const [roomCode, setRoomCode] = useState('')
  const playerId = useRef(getOrCreatePlayerId()).current

  if (screen === 'home') {
    return <HomeScreen playerId={playerId} onEnter={code => { setRoomCode(code); setScreen('game') }} />
  }
  return <GameScreen roomCode={roomCode} playerId={playerId} onLeave={() => setScreen('home')} />
}

// ─── HOME ─────────────────────────────────────────────────────────────────────
function HomeScreen({ playerId, onEnter }) {
  const [name, setName]           = useState('')
  const [code, setCode]           = useState('')
  const [mode, setMode]           = useState('create')
  const [loading, setLoading]     = useState(false)
  const [error, setError]         = useState('')
  const [publicRooms, setPublicRooms] = useState([])
  const [showPublic, setShowPublic]   = useState(false)

  // Load public rooms
  useEffect(() => {
    if (!showPublic) return
    const r = ref(db, 'public_rooms')
    const unsub = onValue(r, snap => {
      if (!snap.exists()) { setPublicRooms([]); return }
      const rooms = Object.values(snap.val()).filter(r => r.phase === 'lobby' && r.playerCount < 12)
      setPublicRooms(rooms)
    })
    return () => off(r)
  }, [showPublic])

  async function handleCreate() {
    if (!name.trim()) { setError('Escribí tu nombre'); return }
    setLoading(true); setError('')
    const roomCode = genCode()
    const whiteDeck = shuffle(WHITE_CARDS)
    const hand = whiteDeck.splice(0, 10)
    const room = {
      code: roomCode, phase: 'lobby', hostId: playerId, isPublic: false,
      currentBlack: null, blackDeck: shuffle(BLACK_CARDS), whiteDeck,
      submissions: [], votes: {}, roundWinner: null,
      players: {
        [playerId]: { id: playerId, name: name.trim(), hand, score: 0, submitted: false, submittedCard: null, vote: null, isHost: true }
      }
    }
    await set(ref(db, `rooms/${roomCode}`), room)
    setLoading(false); onEnter(roomCode)
  }

  async function handleCreatePublic() {
    if (!name.trim()) { setError('Escribí tu nombre primero'); return }
    setLoading(true); setError('')
    const roomCode = genCode()
    const whiteDeck = shuffle(WHITE_CARDS)
    const hand = whiteDeck.splice(0, 10)
    const room = {
      code: roomCode, phase: 'lobby', hostId: playerId, isPublic: true,
      currentBlack: null, blackDeck: shuffle(BLACK_CARDS), whiteDeck,
      submissions: [], votes: {}, roundWinner: null,
      players: {
        [playerId]: { id: playerId, name: name.trim(), hand, score: 0, submitted: false, submittedCard: null, vote: null, isHost: true }
      }
    }
    await set(ref(db, `rooms/${roomCode}`), room)
    // Register in public index
    await set(ref(db, `public_rooms/${roomCode}`), { code: roomCode, host: name.trim(), phase: 'lobby', playerCount: 1, createdAt: Date.now() })
    setLoading(false); onEnter(roomCode)
  }

  async function handleJoin(codeOverride) {
    if (!name.trim()) { setError('Escribí tu nombre primero'); return }
    const joinCode = (codeOverride || code).trim().toUpperCase()
    if (!joinCode) { setError('Ingresá el código'); return }
    setLoading(true); setError('')
    const snap = await get(ref(db, `rooms/${joinCode}`))
    if (!snap.exists())         { setError('Sala no encontrada'); setLoading(false); return }
    const room = snap.val()
    if (room.phase !== 'lobby') { setError('La partida ya comenzó'); setLoading(false); return }
    if (Object.keys(room.players||{}).length >= 12) { setError('Sala llena'); setLoading(false); return }
    if (room.players?.[playerId]) { setLoading(false); onEnter(joinCode); return }
    const whiteDeck = [...(room.whiteDeck || [])]
    const hand = whiteDeck.splice(0, 10)
    await update(ref(db, `rooms/${joinCode}`), { whiteDeck })
    await set(ref(db, `rooms/${joinCode}/players/${playerId}`), {
      id: playerId, name: name.trim(), hand, score: 0, submitted: false, submittedCard: null, vote: null, isHost: false
    })
    if (room.isPublic) {
      await update(ref(db, `public_rooms/${joinCode}`), { playerCount: Object.keys(room.players||{}).length + 1 })
    }
    setLoading(false); onEnter(joinCode)
  }

  return (
    <div style={s.page}>
      <div style={s.homeCard}>
        <div style={{ textAlign: 'center', marginBottom: 8 }}>
          <span style={s.logoMain}>CSDM</span>
          <span style={s.logoSub}>HASTA DONDE TE ANIMÁS</span>
        </div>
        <p style={{ color: C.muted, textAlign: 'center', fontSize: 13, marginBottom: 24, marginTop: 8 }}>
          Juego de cartas · +18 · 3 a 12 jugadores
        </p>

        {/* Name input always visible */}
        <input style={s.input} placeholder="Tu nombre..." value={name}
          onChange={e => setName(e.target.value)} maxLength={20} />

        <div style={s.tabs}>
          {['create','join','public'].map(m => (
            <button key={m} style={mode===m ? s.tabOn : s.tabOff}
              onClick={() => { setMode(m); if (m==='public') setShowPublic(true) }}>
              {m==='create' ? '+ Crear' : m==='join' ? '# Código' : '🌐 Públicas'}
            </button>
          ))}
        </div>

        {mode === 'create' && (
          <>
            <button style={{...s.btnPrimary, opacity: loading ? 0.5 : 1}} disabled={loading} onClick={handleCreate}>
              {loading ? 'Creando...' : 'Crear sala privada'}
            </button>
            <button style={{...s.btnSecondary, opacity: loading ? 0.5 : 1}} disabled={loading} onClick={handleCreatePublic}>
              {loading ? 'Creando...' : '🌐 Crear sala pública'}
            </button>
          </>
        )}

        {mode === 'join' && (
          <>
            <input style={{...s.input, marginTop:10, letterSpacing:4, textTransform:'uppercase'}}
              placeholder="Código de sala..." value={code}
              onChange={e => setCode(e.target.value.toUpperCase())}
              onKeyDown={e => e.key==='Enter' && handleJoin()}
              maxLength={5} />
            <button style={{...s.btnPrimary, opacity: loading ? 0.5 : 1}} disabled={loading}
              onClick={() => handleJoin()}>
              {loading ? 'Entrando...' : 'Entrar a la sala'}
            </button>
          </>
        )}

        {mode === 'public' && (
          <div style={s.publicList}>
            {publicRooms.length === 0
              ? <div style={s.emptyPublic}>
                  No hay salas públicas abiertas.<br/>
                  <span style={{color:C.bluePale}}>¡Creá una vos!</span>
                </div>
              : publicRooms.map(r => (
                <div key={r.code} style={s.publicRow}>
                  <div>
                    <div style={{fontSize:14, color:C.bright, fontWeight:700}}>Sala de {r.host}</div>
                    <div style={{fontSize:12, color:C.muted}}>{r.playerCount} jugador{r.playerCount!==1?'es':''} · esperando</div>
                  </div>
                  <button style={s.joinBtn} onClick={() => handleJoin(r.code)}>
                    Unirse
                  </button>
                </div>
              ))
            }
          </div>
        )}

        {error && <div style={s.errorBox}>{error}</div>}

        <div style={s.versionBadge}>{VERSION}</div>
      </div>
    </div>
  )
}

// ─── GAME ─────────────────────────────────────────────────────────────────────
function GameScreen({ roomCode, playerId, onLeave }) {
  const [room, setRoom]               = useState(null)
  const [toast, setToast]             = useState('')
  const [selectedIdx, setSelectedIdx] = useState(null)
  const [voting, setVoting]           = useState(false) // prevent double-tap

  const showToast = msg => { setToast(msg); setTimeout(() => setToast(''), 3000) }

  useEffect(() => {
    const r = ref(db, `rooms/${roomCode}`)
    const unsub = onValue(r, snap => { if (snap.exists()) setRoom(snap.val()) })
    return () => off(r)
  }, [roomCode])

  if (!room) return (
    <div style={s.page}>
      <div style={{color:C.bluePale, fontSize:18, textAlign:'center', marginTop:80}}>
        Conectando a <strong style={{color:C.gold}}>{roomCode}</strong>…
      </div>
    </div>
  )

  const players     = Object.values(room.players || {})
  const me          = room.players?.[playerId]
  const isHost      = me?.isHost
  const votes       = room.votes || {}
  const submissions = Array.isArray(room.submissions) ? room.submissions : []
  const allVoted    = players.length >= 2 && players.every(p => p.vote !== null)

  // ── ACTIONS ─────────────────────────────────────────────────────────────────

  async function startGame() {
    const snap = await get(ref(db, `rooms/${roomCode}`))
    const r = snap.val()
    if (Object.keys(r.players).length < 3) return
    let blackDeck = shuffle(BLACK_CARDS)
    const currentBlack = blackDeck.shift()
    const updates = { phase: 'playing', currentBlack, blackDeck, submissions: [], votes: {}, roundWinner: null }
    Object.values(r.players).forEach(p => {
      updates[`players/${p.id}/submitted`]     = false
      updates[`players/${p.id}/submittedCard`] = null
      updates[`players/${p.id}/vote`]          = null
    })
    await update(ref(db, `rooms/${roomCode}`), updates)
    // Update public room phase
    if (r.isPublic) await update(ref(db, `public_rooms/${roomCode}`), { phase: 'playing' })
  }

  async function submitCard() {
    if (selectedIdx === null || !me) return
    const card    = me.hand[selectedIdx]
    const newHand = me.hand.filter((_, i) => i !== selectedIdx)

    const snap = await get(ref(db, `rooms/${roomCode}`))
    const r    = snap.val()
    const pList = Object.values(r.players)

    // mark this player as submitted
    const updates = {
      [`players/${playerId}/submitted`]:     true,
      [`players/${playerId}/submittedCard`]: card,
      [`players/${playerId}/hand`]:          newHand,
    }

    // check if everyone will have submitted
    const willBeSubmitted = pList.filter(p => p.submitted || p.id === playerId)
    if (willBeSubmitted.length === pList.length) {
      const subs = pList.map(p => ({
        playerId:   p.id,
        playerName: p.name,
        card: p.id === playerId ? card : p.submittedCard
      }))
      updates.submissions = shuffle(subs)
      updates.phase       = 'judging'
    }

    await update(ref(db, `rooms/${roomCode}`), updates)
    setSelectedIdx(null)
    showToast('Carta enviada ✓')
  }

  async function voteCard(targetPlayerId) {
    if (voting)                      return  // prevent double tap
    if (!me)                         return
    if (me.vote !== null)            return  // already voted
    if (targetPlayerId === playerId) return  // can't vote own card

    setVoting(true)
    try {
      // Use a transaction-like approach: fetch fresh, write atomically
      const snap = await get(ref(db, `rooms/${roomCode}`))
      const r    = snap.val()

      // Re-check vote hasn't been cast (race condition guard)
      if (r.players?.[playerId]?.vote !== null) { setVoting(false); return }

      const currentVotes = r.votes || {}
      const updVotes     = { ...currentVotes, [targetPlayerId]: (currentVotes[targetPlayerId] || 0) + 1 }
      const pList        = Object.values(r.players)

      const updates = {
        [`players/${playerId}/vote`]: targetPlayerId,
        votes: updVotes,
      }

      // Check if this is the last vote
      const votedAfterThis = pList.filter(p => p.vote !== null || p.id === playerId)
      if (votedAfterThis.length === pList.length) {
        // Find winner
        let maxV = 0, winnerId = null
        Object.entries(updVotes).forEach(([pid, v]) => { if (v > maxV) { maxV = v; winnerId = pid } })

        const allSubs = Array.isArray(r.submissions) ? r.submissions : []
        const winnerSub = allSubs.find(s => s.playerId === winnerId) || null
        updates.roundWinner = winnerSub
        updates.phase       = 'result'

        if (winnerId) {
          updates[`players/${winnerId}/score`] = (r.players[winnerId]?.score || 0) + 1
        }

        // Refill hands
        let deck = [...(r.whiteDeck || [])]
        if (deck.length < pList.length * 2) deck = [...deck, ...shuffle(WHITE_CARDS)]
        pList.forEach(p => {
          const currentHand = p.id === playerId ? newHand(p.hand, selectedIdx) : (p.hand || [])
          const needed = 10 - currentHand.length
          if (needed > 0) {
            updates[`players/${p.id}/hand`] = [...currentHand, ...deck.splice(0, needed)]
          }
        })
        updates.whiteDeck = deck
      }

      await update(ref(db, `rooms/${roomCode}`), updates)
      showToast('Voto registrado ✓')
    } catch(e) {
      console.error('voteCard error:', e)
    }
    setVoting(false)
  }

  // helper — get hand without submitted card
  function newHand(hand, idx) {
    if (idx === null || !hand) return hand || []
    return hand.filter((_, i) => i !== idx)
  }

  async function nextRound() {
    const snap = await get(ref(db, `rooms/${roomCode}`))
    const r    = snap.val()
    let blackDeck = Array.isArray(r.blackDeck) && r.blackDeck.length > 0
      ? r.blackDeck : shuffle(BLACK_CARDS)
    const currentBlack = blackDeck[0]
    blackDeck = blackDeck.slice(1)
    const updates = { phase: 'playing', currentBlack, blackDeck, submissions: [], votes: {}, roundWinner: null }
    Object.values(r.players).forEach(p => {
      updates[`players/${p.id}/submitted`]     = false
      updates[`players/${p.id}/submittedCard`] = null
      updates[`players/${p.id}/vote`]          = null
    })
    await update(ref(db, `rooms/${roomCode}`), updates)
  }

  async function leaveRoom() {
    if (isHost && players.length > 1) {
      const next = players.find(p => p.id !== playerId)
      if (next) await update(ref(db, `rooms/${roomCode}/players/${next.id}`), { isHost: true })
    }
    await set(ref(db, `rooms/${roomCode}/players/${playerId}`), null)
    if (room.isPublic) await set(ref(db, `public_rooms/${roomCode}`), null)
    onLeave()
  }

  // ── LOBBY ──────────────────────────────────────────────────────────────────
  if (room.phase === 'lobby') {
    return (
      <div style={s.page}>
        <div style={s.roomCard}>
          <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:24}}>
            <span style={{...s.logoMain, fontSize:36, letterSpacing:8}}>CSDM</span>
            <div style={s.codePill}>
              Código: <strong style={{color:C.gold, letterSpacing:3}}>{roomCode}</strong>
            </div>
          </div>
          {room.isPublic && (
            <div style={{...s.shareBox, background:'rgba(34,197,94,0.08)', border:`1px solid ${C.green}33`, marginBottom:12}}>
              🌐 Sala pública — visible en el listado para que cualquiera se una
            </div>
          )}
          <div style={s.sectionLabel}>JUGADORES</div>
          <div style={{display:'flex', flexDirection:'column', gap:8, marginBottom:20}}>
            {players.map(p => (
              <div key={p.id} style={s.lobbyRow}>
                <span style={{...s.dot, background: p.id===playerId ? C.green : C.blue}} />
                <span style={{flex:1, fontSize:15, color:C.bright}}>{p.name} {p.isHost?'👑':''}</span>
                {p.id===playerId && <span style={s.youBadge}>Vos</span>}
              </div>
            ))}
          </div>
          <div style={s.shareBox}>
            📲 Compartí el código <strong style={{color:C.gold}}>{roomCode}</strong> para que se unan.
          </div>
          {players.length < 3
            ? <div style={s.waitBox}>Esperando jugadores… (mínimo 3, hay {players.length})</div>
            : isHost
              ? <button style={s.btnPrimary} onClick={startGame}>¡Empezar partida!</button>
              : <div style={s.waitBox}>Esperando que {players.find(p=>p.isHost)?.name} inicie…</div>
          }
          <button style={s.btnGhost} onClick={leaveRoom}>Salir</button>
        </div>
        {toast && <Toast msg={toast} />}
      </div>
    )
  }

  // ── RESULT ─────────────────────────────────────────────────────────────────
  if (room.phase === 'result') {
    const sorted  = [...players].sort((a,b) => b.score - a.score)
    const allSubs = Array.isArray(room.submissions) ? room.submissions : []
    return (
      <div style={s.page}>
        <GameHeader players={players} playerId={playerId} roomCode={roomCode} />
        <div style={s.body}>
          <div style={s.resultBanner}>🏆 RONDA TERMINADA</div>
          <BlackCard text={room.currentBlack} />
          {room.roundWinner && (
            <div style={s.winnerBox}>
              <div style={s.sectionLabel}>CARTA MÁS VOTADA</div>
              <div style={s.winnerWhite}>
                <p style={{color:'#1a1a2e', fontSize:17, fontWeight:700, margin:0, lineHeight:1.4}}>
                  {room.roundWinner.card}
                </p>
                <div style={{color:C.blue, fontSize:13, fontWeight:700, marginTop:10}}>
                  — {room.roundWinner.playerName}
                </div>
              </div>
              <div style={{display:'flex', gap:8, justifyContent:'center', flexWrap:'wrap', marginTop:12}}>
                {allSubs.map(sub => (
                  <div key={sub.playerId} style={s.voteChip}>
                    <span style={{color:C.text}}>{sub.playerName}</span>
                    <span style={{color:C.gold, fontWeight:700, marginLeft:6}}>
                      {votes[sub.playerId]||0} voto{votes[sub.playerId]===1?'':'s'}
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
                <span style={{fontSize:20, width:28}}>{['🥇','🥈','🥉'][i]||`${i+1}.`}</span>
                <span style={{flex:1, fontSize:15, color:C.bright, fontWeight:p.id===playerId?800:400}}>
                  {p.name}
                </span>
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

  // ── JUDGING ────────────────────────────────────────────────────────────────
  if (room.phase === 'judging') {
    const myVote     = me?.vote ?? null
    const allSubs    = Array.isArray(room.submissions) ? room.submissions : []
    const votedCount = players.filter(p => p.vote !== null).length

    return (
      <div style={s.page}>
        <GameHeader players={players} playerId={playerId} roomCode={roomCode} />
        <div style={s.body}>
          <BlackCard text={room.currentBlack} />
          <div style={s.phaseTitle}>
            {myVote === null
              ? '👆 Tocá la carta más graciosa para votar (no podés votar la tuya)'
              : `✅ Voto registrado — ${votedCount}/${players.length} votaron`}
          </div>
          <div style={s.cardsGrid}>
            {allSubs.map((sub, i) => {
              const isMine  = sub.playerId === playerId
              const iVoted  = myVote === sub.playerId
              const canVote = myVote === null && !isMine && !voting
              return (
                <div
                  key={i}
                  onClick={() => canVote && voteCard(sub.playerId)}
                  style={{
                    ...s.subCard,
                    ...(iVoted  ? s.subVoted : {}),
                    ...(isMine  ? s.subMine  : {}),
                    ...(canVote ? s.subHover : {}),
                    cursor:  canVote ? 'pointer' : 'default',
                    opacity: myVote !== null && !iVoted ? 0.6 : 1,
                    transform: iVoted ? 'translateY(-4px)' : 'none',
                  }}
                >
                  <p style={{color:'#1a1a2e', fontSize:14, fontWeight:600, lineHeight:1.4, margin:0}}>
                    {sub.card}
                  </p>
                  {isMine && <div style={s.mineBadge}>Tu carta</div>}
                  {iVoted && <div style={s.votedBadge}>Tu voto ✓</div>}
                  {allVoted && (votes[sub.playerId]||0) > 0 && (
                    <div style={s.voteCountBadge}>{votes[sub.playerId]} voto{votes[sub.playerId]===1?'':'s'}</div>
                  )}
                </div>
              )
            })}
          </div>
          {myVote !== null && !allVoted && (
            <div style={{color:C.muted, textAlign:'center', fontSize:13, marginTop:8}}>
              Esperando que voten los demás… ({votedCount}/{players.length})
            </div>
          )}
        </div>
        {toast && <Toast msg={toast} />}
      </div>
    )
  }

  // ── PLAYING ────────────────────────────────────────────────────────────────
  const submittedCount = players.filter(p => p.submitted).length
  const iSubmitted     = me?.submitted

  return (
    <div style={s.page}>
      <GameHeader players={players} playerId={playerId} roomCode={roomCode} />
      <div style={s.body}>
        <div style={s.progressRow}>
          <div style={s.track}>
            <div style={{...s.fill, width:`${players.length ? (submittedCount/players.length)*100 : 0}%`}} />
          </div>
          <span style={{fontSize:12, color:C.muted, whiteSpace:'nowrap'}}>
            {submittedCount}/{players.length} enviadas
          </span>
        </div>
        <BlackCard text={room.currentBlack} />
        {iSubmitted ? (
          <div style={{textAlign:'center'}}>
            <div style={{color:C.green, fontSize:16, fontWeight:700, marginBottom:12}}>
              ✅ Tu carta fue enviada
            </div>
            <div style={s.sentCard}>{me?.submittedCard}</div>
            <div style={{display:'flex', flexWrap:'wrap', gap:8, justifyContent:'center', marginTop:16}}>
              {players.map(p => (
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
                  key={i} text={card}
                  selected={selectedIdx === i}
                  onSelect={() => setSelectedIdx(selectedIdx === i ? null : i)}
                  onEdit={newText => {
                    const newH = [...(me.hand||[])]
                    newH[i] = newText
                    update(ref(db, `rooms/${roomCode}/players/${playerId}`), { hand: newH })
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

// ─── SUB-COMPONENTS ──────────────────────────────────────────────────────────
function HandCard({ text, selected, onSelect, onEdit }) {
  const [editing, setEditing] = useState(false)
  const [val, setVal]         = useState(text)
  useEffect(() => setVal(text), [text])
  return (
    <div style={{...s.handCard, ...(selected ? s.handCardOn : {})}}
      onClick={() => { if (!editing) onSelect() }}>
      {editing ? (
        <textarea autoFocus style={s.textarea} value={val}
          onChange={e => setVal(e.target.value)}
          onBlur={() => { setEditing(false); onEdit(val) }}
          onClick={e => e.stopPropagation()} rows={3} />
      ) : (
        <p style={{color:'#1a1a2e', fontSize:14, fontWeight:600, lineHeight:1.4, margin:0, flex:1}}>{val}</p>
      )}
      <button style={s.editBtn} onClick={e => { e.stopPropagation(); setEditing(!editing) }}>
        {editing ? '✓ ok' : '✏️'}
      </button>
      {selected && !editing && <div style={s.selBadge}>✓ Seleccionada</div>}
    </div>
  )
}

function GameHeader({ players, playerId, roomCode }) {
  const sorted = [...players].sort((a,b) => b.score - a.score)
  return (
    <div style={s.header}>
      <span style={{...s.logoMain, fontSize:22, letterSpacing:6}}>CSDM</span>
      <span style={s.codePill}>{roomCode}</span>
      <div style={{display:'flex', gap:10, flexWrap:'wrap', marginLeft:'auto'}}>
        {sorted.slice(0,5).map(p => (
          <span key={p.id} style={{fontSize:12, color: p.id===playerId ? C.bluePale : C.muted}}>
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
      <p style={{color:'#fff', fontSize:20, fontWeight:700, lineHeight:1.5, margin:0}}>{text||'Cargando…'}</p>
    </div>
  )
}

function Toast({ msg }) {
  return (
    <div style={{
      position:'fixed', bottom:24, left:'50%', transform:'translateX(-50%)',
      background:C.blue, color:'#fff', padding:'12px 24px', borderRadius:30,
      fontSize:14, fontWeight:700, boxShadow:'0 8px 32px rgba(0,0,0,0.4)',
      zIndex:999, whiteSpace:'nowrap', pointerEvents:'none',
    }}>{msg}</div>
  )
}

// ─── STYLES ──────────────────────────────────────────────────────────────────
const s = {
  page: {
    minHeight:'100vh',
    background:`linear-gradient(160deg, ${C.bg} 0%, ${C.bgDeep} 100%)`,
    display:'flex', flexDirection:'column', alignItems:'center',
    fontFamily:"'Inter','Segoe UI',sans-serif", color:C.text,
    padding:'20px 16px 60px',
  },
  homeCard: {
    background:C.panel, border:`1px solid ${C.border}`, borderRadius:20,
    padding:'40px 32px', width:'100%', maxWidth:420,
    boxShadow:'0 32px 80px rgba(0,0,0,0.5)', marginTop:40,
  },
  roomCard: {
    background:C.panel, border:`1px solid ${C.border}`, borderRadius:20,
    padding:'32px 28px', width:'100%', maxWidth:440,
    boxShadow:'0 32px 80px rgba(0,0,0,0.5)', marginTop:20,
  },
  logoMain: {
    display:'block', fontSize:72, fontWeight:900,
    fontFamily:"'Georgia','Times New Roman',serif",
    color:'#fff', letterSpacing:10, lineHeight:1,
    textShadow:`0 0 60px ${C.blue}88`,
  },
  logoSub: {
    display:'block', fontSize:11, letterSpacing:4,
    color:C.bluePale, marginTop:6, fontWeight:600,
  },
  tabs: {
    display:'flex', gap:6, margin:'16px 0',
    background:'rgba(0,0,0,0.3)', borderRadius:10, padding:4,
  },
  tabOn: {
    flex:1, background:C.blue, border:'none', color:'#fff',
    borderRadius:8, padding:'8px 4px', fontSize:13, cursor:'pointer',
    fontFamily:'inherit', fontWeight:700,
  },
  tabOff: {
    flex:1, background:'transparent', border:'none', color:C.muted,
    borderRadius:8, padding:'8px 4px', fontSize:13, cursor:'pointer',
    fontFamily:'inherit', fontWeight:600,
  },
  input: {
    width:'100%', background:'rgba(255,255,255,0.06)', border:`1px solid ${C.border}`,
    borderRadius:10, color:'#fff', padding:'12px 16px', fontSize:15,
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
    fontFamily:'inherit', marginTop:12, boxShadow:`0 8px 24px ${C.blue}44`,
  },
  btnSecondary: {
    width:'100%', background:'transparent',
    border:`1px solid ${C.border}`,
    color:C.bluePale, borderRadius:12, padding:13,
    fontSize:14, fontWeight:700, cursor:'pointer',
    fontFamily:'inherit', marginTop:8,
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
  },
  shareBox: {
    background:'rgba(251,191,36,0.08)', border:`1px solid ${C.gold}33`,
    borderRadius:12, padding:14, fontSize:14, color:C.text,
    lineHeight:1.6, textAlign:'center', marginBottom:16,
  },
  waitBox: {
    background:C.blueFaint, border:`1px solid ${C.border}`,
    borderRadius:10, padding:14, color:C.bluePale,
    textAlign:'center', fontSize:14, marginTop:16,
  },
  publicList: { display:'flex', flexDirection:'column', gap:8, marginTop:4 },
  emptyPublic: {
    background:'rgba(255,255,255,0.04)', border:`1px solid ${C.border}`,
    borderRadius:10, padding:20, textAlign:'center',
    color:C.muted, fontSize:14, lineHeight:1.8,
  },
  publicRow: {
    display:'flex', justifyContent:'space-between', alignItems:'center',
    background:'rgba(255,255,255,0.04)', border:`1px solid ${C.border}`,
    borderRadius:10, padding:'12px 14px',
  },
  joinBtn: {
    background:C.blue, border:'none', color:'#fff',
    borderRadius:8, padding:'8px 16px', fontSize:13,
    cursor:'pointer', fontFamily:'inherit', fontWeight:700,
  },
  versionBadge: {
    textAlign:'center', color:C.muted, fontSize:11,
    marginTop:20, letterSpacing:2, fontWeight:600,
  },
  header: {
    width:'100%', maxWidth:640,
    background:'rgba(8,15,46,0.85)', backdropFilter:'blur(12px)',
    borderBottom:`1px solid ${C.border}`, borderRadius:'0 0 16px 16px',
    padding:'10px 18px', display:'flex', alignItems:'center',
    gap:12, flexWrap:'wrap', marginBottom:8,
    position:'sticky', top:0, zIndex:50,
  },
  body: { width:'100%', maxWidth:620, padding:'12px 0' },
  progressRow: { display:'flex', alignItems:'center', gap:10, marginBottom:16 },
  track: { flex:1, height:4, background:'rgba(255,255,255,0.08)', borderRadius:2, overflow:'hidden' },
  fill: { height:'100%', background:`linear-gradient(90deg, ${C.blue}, ${C.blueHover})`, borderRadius:2, transition:'width 0.5s ease' },
  blackCard: {
    background:'#080808', border:'3px solid #1a1a2e', borderRadius:16,
    padding:'26px 24px', marginBottom:20, boxShadow:'0 12px 40px rgba(0,0,0,0.6)',
  },
  handGrid: {
    display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(160px, 1fr))',
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
    fontSize:12, padding:'2px 4px', alignSelf:'flex-end', marginTop:4, color:'#888',
  },
  selBadge: {
    position:'absolute', bottom:8, right:8,
    fontSize:10, fontWeight:800, color:C.blue,
    background:C.blueFaint, padding:'2px 8px', borderRadius:10,
  },
  sentCard: {
    background:'#fff', color:'#1a1a2e', borderRadius:12,
    padding:'16px 20px', fontSize:15, fontWeight:600,
    maxWidth:300, margin:'0 auto',
    boxShadow:'0 4px 16px rgba(0,0,0,0.3)',
    border:`2px solid ${C.green}`,
  },
  playerChip: {
    display:'flex', alignItems:'center', gap:6,
    fontSize:13, color:C.text, background:'rgba(255,255,255,0.04)',
    padding:'4px 12px', borderRadius:20,
  },
  phaseTitle: {
    fontSize:15, fontWeight:700, color:C.bluePale,
    marginBottom:16, textAlign:'center', lineHeight:1.5,
  },
  cardsGrid: {
    display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(160px, 1fr))',
    gap:12, marginBottom:16,
  },
  subCard: {
    background:'#fff', borderRadius:12, minHeight:110, padding:14,
    border:'3px solid transparent', transition:'all 0.2s',
    position:'relative', display:'flex', flexDirection:'column',
    justifyContent:'center', boxShadow:'0 4px 16px rgba(0,0,0,0.3)',
  },
  subHover: { boxShadow:'0 8px 28px rgba(0,0,0,0.4)' },
  subVoted: { border:`3px solid ${C.blue}`, boxShadow:`0 8px 24px ${C.blue}44` },
  subMine:  { border:`3px solid ${C.gold}55`, opacity:0.8 },
  mineBadge: {
    position:'absolute', top:-8, left:-8,
    background:C.gold, color:'#000', fontSize:10, fontWeight:800,
    padding:'3px 8px', borderRadius:10,
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
  resultBanner: {
    fontSize:22, fontWeight:900, color:C.gold,
    letterSpacing:2, textAlign:'center', marginBottom:20,
  },
  winnerBox: {
    background:C.panel, border:`2px solid ${C.gold}44`, borderRadius:16,
    padding:20, marginBottom:20, textAlign:'center',
  },
  winnerWhite: {
    background:'#fff', borderRadius:12, padding:18,
    maxWidth:280, margin:'0 auto', border:`3px solid ${C.gold}`,
  },
  voteChip: {
    display:'flex', alignItems:'center', background:'rgba(255,255,255,0.04)',
    padding:'4px 12px', borderRadius:20, fontSize:13,
  },
  scoreboard: {
    background:'rgba(0,0,0,0.3)', border:`1px solid ${C.border}`,
    borderRadius:14, padding:16, marginBottom:16,
  },
  scoreRow: {
    display:'flex', alignItems:'center', gap:10, padding:'8px 0',
    borderBottom:'1px solid rgba(255,255,255,0.04)',
  },
}
