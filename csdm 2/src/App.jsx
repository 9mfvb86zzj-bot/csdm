import { useState, useEffect, useRef } from 'react'
import { ref, set, get, update, onValue, off } from 'firebase/database'
import { db } from './firebase'
import { BLACK_CARDS, WHITE_CARDS, shuffle } from './cards'

const VERSION = 'v4.0'

function genCode() { return Math.random().toString(36).substring(2, 7).toUpperCase() }
function genId()   { return Math.random().toString(36).substring(2, 12) }
function getOrCreatePlayerId() {
  let id = sessionStorage.getItem('csdm_pid')
  if (!id) { id = genId(); sessionStorage.setItem('csdm_pid', id) }
  return id
}

const C = {
  bg:'#0D1B4B', bgDeep:'#080F2E', panel:'#112060',
  border:'#1E3A8A', blue:'#2563EB', blueHover:'#3B82F6',
  bluePale:'#BFDBFE', blueFaint:'rgba(37,99,235,0.15)',
  gold:'#FBBF24', goldFaint:'rgba(251,191,36,0.12)',
  green:'#22C55E', muted:'#64748B', text:'#CBD5E1', bright:'#E2E8F0',
}

export default function App() {
  const [screen, setScreen]     = useState('home')
  const [roomCode, setRoomCode] = useState('')
  const playerId = useRef(getOrCreatePlayerId()).current
  if (screen === 'home') return <HomeScreen playerId={playerId} onEnter={code => { setRoomCode(code); setScreen('game') }} />
  return <GameScreen roomCode={roomCode} playerId={playerId} onLeave={() => setScreen('home')} />
}

// ─── HOME ─────────────────────────────────────────────────────────────────────
function HomeScreen({ playerId, onEnter }) {
  const [name, setName]       = useState('')
  const [code, setCode]       = useState('')
  const [mode, setMode]       = useState('create')
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')
  const [publicRooms, setPublicRooms] = useState([])

  useEffect(() => {
    if (mode !== 'public') return
    const r = ref(db, 'public_rooms')
    const unsub = onValue(r, snap => {
      setPublicRooms(snap.exists() ? Object.values(snap.val()).filter(r => r.phase==='lobby') : [])
    })
    return () => off(r)
  }, [mode])

  async function handleCreate(isPublic=false) {
    if (!name.trim()) { setError('Escribí tu nombre'); return }
    setLoading(true); setError('')
    const rc = genCode()
    const whiteDeck = shuffle(WHITE_CARDS)
    const hand = whiteDeck.splice(0, 10)
    const room = {
      code:rc, phase:'lobby', hostId:playerId, isPublic,
      currentBlack:null, blackDeck:shuffle(BLACK_CARDS), whiteDeck,
      submissions:[], votes:{}, roundWinner:null,
      players:{ [playerId]:{ id:playerId, name:name.trim(), hand, score:0, submitted:false, submittedCard:null, vote:null, isHost:true } }
    }
    await set(ref(db,`rooms/${rc}`), room)
    if (isPublic) await set(ref(db,`public_rooms/${rc}`), { code:rc, host:name.trim(), phase:'lobby', playerCount:1, createdAt:Date.now() })
    setLoading(false); onEnter(rc)
  }

  async function handleJoin(codeOverride) {
    if (!name.trim()) { setError('Escribí tu nombre'); return }
    const jc = (codeOverride||code).trim().toUpperCase()
    if (!jc) { setError('Ingresá el código'); return }
    setLoading(true); setError('')
    try {
      const snap = await get(ref(db,`rooms/${jc}`))
      if (!snap.exists())       { setError('Sala no encontrada'); setLoading(false); return }
      const room = snap.val()
      if (room.phase!=='lobby') { setError('La partida ya comenzó'); setLoading(false); return }
      const currentPlayers = room.players || {}
      if (Object.keys(currentPlayers).length >= 12) { setError('Sala llena'); setLoading(false); return }

      // Always write the player (overwrite if already exists with stale data)
      const wd = [...(room.whiteDeck||[])]
      const hand = wd.length >= 10 ? wd.splice(0,10) : [...WHITE_CARDS.slice(0,10)]
      const existingPlayer = currentPlayers[playerId]
      const playerData = {
        id: playerId,
        name: name.trim(),
        hand: existingPlayer?.hand || hand,
        score: existingPlayer?.score || 0,
        submitted: false,
        submittedCard: null,
        vote: null,
        isHost: false,
      }
      // Write player and update deck atomically
      const updates = { [`players/${playerId}`]: playerData }
      if (!existingPlayer) updates.whiteDeck = wd
      await update(ref(db,`rooms/${jc}`), updates)
      if (room.isPublic && !existingPlayer) {
        await update(ref(db,`public_rooms/${jc}`), { playerCount: Object.keys(currentPlayers).length + 1 })
      }
      setLoading(false); onEnter(jc)
    } catch(e) {
      setError('Error al conectar. Intentá de nuevo.')
      setLoading(false)
    }
  }

  return (
    <div style={s.page}>
      <div style={s.homeCard}>
        <div style={{textAlign:'center',marginBottom:8}}>
          <span style={s.logoMain}>CSDM</span>
          <span style={s.logoSub}>HASTA DONDE TE ANIMÁS</span>
        </div>
        <p style={{color:C.muted,textAlign:'center',fontSize:13,marginBottom:20,marginTop:8}}>Juego de cartas · +18 · 3 a 12 jugadores</p>
        <input style={s.input} placeholder="Tu nombre..." value={name} onChange={e=>{setName(e.target.value);setError('')}} maxLength={20}/>
        <div style={s.tabs}>
          {['create','join','public'].map(m=>(
            <button key={m} style={mode===m?s.tabOn:s.tabOff} onClick={()=>setMode(m)}>
              {m==='create'?'+ Crear':m==='join'?'# Código':'🌐 Públicas'}
            </button>
          ))}
        </div>
        {mode==='create' && <>
          <button style={{...s.btnPrimary,opacity:loading?.5:1}} disabled={loading} onClick={()=>handleCreate(false)}>Crear sala privada</button>
          <button style={{...s.btnSecondary,opacity:loading?.5:1}} disabled={loading} onClick={()=>handleCreate(true)}>🌐 Crear sala pública</button>
        </>}
        {mode==='join' && <>
          <input style={{...s.input,marginTop:10,letterSpacing:4,textTransform:'uppercase'}} placeholder="Código..." value={code} onChange={e=>setCode(e.target.value.toUpperCase())} onKeyDown={e=>e.key==='Enter'&&handleJoin()} maxLength={5}/>
          <button style={{...s.btnPrimary,opacity:loading?.5:1}} disabled={loading} onClick={()=>handleJoin()}>{loading?'Entrando...':'Entrar'}</button>
        </>}
        {mode==='public' && (
          <div style={{display:'flex',flexDirection:'column',gap:8,marginTop:4}}>
            {publicRooms.length===0
              ? <div style={s.emptyBox}>No hay salas públicas.<br/><span style={{color:C.bluePale}}>¡Creá una vos!</span></div>
              : publicRooms.map(r=>(
                <div key={r.code} style={s.publicRow}>
                  <div>
                    <div style={{fontSize:14,color:C.bright,fontWeight:700}}>Sala de {r.host}</div>
                    <div style={{fontSize:12,color:C.muted}}>{r.playerCount} jugador{r.playerCount!==1?'es':''} · esperando</div>
                  </div>
                  <button style={s.joinBtn} onClick={()=>handleJoin(r.code)}>Unirse</button>
                </div>
              ))
            }
          </div>
        )}
        {error && <div style={s.errorBox}>{error}</div>}
        <div style={{textAlign:'center',color:C.muted,fontSize:11,marginTop:20,letterSpacing:2}}>{VERSION}</div>
      </div>
    </div>
  )
}

// ─── GAME ─────────────────────────────────────────────────────────────────────
function GameScreen({ roomCode, playerId, onLeave }) {
  const [room, setRoom]               = useState(null)
  const [toast, setToast]             = useState('')
  const [selectedIdx, setSelectedIdx] = useState(null)
  const [screen, setScreen]           = useState('game') // game | editCards | editBlack

  const showToast = msg => { setToast(msg); setTimeout(()=>setToast(''),2500) }

  useEffect(() => {
    const r = ref(db,`rooms/${roomCode}`)
    const unsub = onValue(r, snap=>{ if(snap.exists()) setRoom(snap.val()) })
    return ()=>off(r)
  }, [roomCode])

  if (!room) return (
    <div style={s.page}>
      <div style={{color:C.bluePale,fontSize:18,textAlign:'center',marginTop:80}}>
        Conectando a <strong style={{color:C.gold}}>{roomCode}</strong>…
      </div>
    </div>
  )

  const players     = Object.values(room.players||{})
  const me          = room.players?.[playerId]
  const isHost      = me?.isHost
  const votes       = room.votes||{}
  const submissions = Array.isArray(room.submissions) ? room.submissions : []

  // ── Card editor screens ────────────────────────────────────────────────────
  if (screen==='editCards') return <CardEditor roomCode={roomCode} playerId={playerId} type="white" onBack={()=>setScreen('game')} />
  if (screen==='editBlack') return <CardEditor roomCode={roomCode} playerId={playerId} type="black" onBack={()=>setScreen('game')} />

  // ── Actions ───────────────────────────────────────────────────────────────

  async function startGame() {
    const snap = await get(ref(db,`rooms/${roomCode}`)); const r = snap.val()
    if (Object.keys(r.players).length < 2) return
    // Use room's custom decks if set, otherwise defaults
    const bd = Array.isArray(r.customBlackDeck) && r.customBlackDeck.length>0 ? shuffle([...r.customBlackDeck]) : shuffle(BLACK_CARDS)
    const currentBlack = bd[0]
    const updates = { phase:'playing', currentBlack, blackDeck:bd.slice(1), submissions:[], votes:{}, roundWinner:null }
    Object.values(r.players).forEach(p=>{
      updates[`players/${p.id}/submitted`]=false
      updates[`players/${p.id}/submittedCard`]=null
      updates[`players/${p.id}/vote`]=null
    })
    await update(ref(db,`rooms/${roomCode}`), updates)
    if (r.isPublic) await update(ref(db,`public_rooms/${roomCode}`),{phase:'playing'})
  }

  async function submitCard() {
    if (selectedIdx===null||!me) return
    const card = me.hand[selectedIdx]
    const newHand = me.hand.filter((_,i)=>i!==selectedIdx)
    const snap = await get(ref(db,`rooms/${roomCode}`)); const r = snap.val()
    const pList = Object.values(r.players)
    const updates = {
      [`players/${playerId}/submitted`]:true,
      [`players/${playerId}/submittedCard`]:card,
      [`players/${playerId}/hand`]:newHand,
    }
    const willSubmitted = pList.filter(p=>p.submitted||p.id===playerId)
    if (willSubmitted.length===pList.length) {
      updates.submissions = shuffle(pList.map(p=>({ playerId:p.id, playerName:p.name, card:p.id===playerId?card:p.submittedCard })))
      updates.phase='judging'
    }
    await update(ref(db,`rooms/${roomCode}`), updates)
    setSelectedIdx(null); showToast('Carta enviada ✓')
  }

  // Simple vote: just write this player's vote. Host advances manually.
  async function voteCard(targetPlayerId) {
    if (!me||me.vote!==null||targetPlayerId===playerId) return
    await update(ref(db,`rooms/${roomCode}`), {
      [`players/${playerId}/vote`]: targetPlayerId,
      [`votes/${targetPlayerId}`]: (votes[targetPlayerId]||0)+1,
    })
    showToast('Voto registrado ✓')
  }

  async function advanceToResult() {
    // tally winner
    const snap = await get(ref(db,`rooms/${roomCode}`)); const r = snap.val()
    const allSubs = Array.isArray(r.submissions)?r.submissions:[]
    const v = r.votes||{}
    let maxV=0, winnerId=null
    Object.entries(v).forEach(([pid,n])=>{ if(n>maxV){maxV=n;winnerId=pid} })
    // if no votes at all, no winner
    const winnerSub = allSubs.find(s=>s.playerId===winnerId)||null
    const updates = { phase:'result', roundWinner:winnerSub||null }
    if (winnerId) updates[`players/${winnerId}/score`]=(r.players[winnerId]?.score||0)+1
    await update(ref(db,`rooms/${roomCode}`), updates)
  }

  async function nextRound() {
    const snap = await get(ref(db,`rooms/${roomCode}`)); const r = snap.val()
    const bd = Array.isArray(r.blackDeck)&&r.blackDeck.length>0 ? r.blackDeck : shuffle(BLACK_CARDS)
    const currentBlack = bd[0]
    // refill hands
    const customWhite = Array.isArray(r.customWhiteDeck)&&r.customWhiteDeck.length>0 ? r.customWhiteDeck : WHITE_CARDS
    let deck = [...(r.whiteDeck||[])]
    if (deck.length < Object.keys(r.players).length*2) deck=[...deck,...shuffle(customWhite)]
    const updates = { phase:'playing', currentBlack, blackDeck:bd.slice(1), submissions:[], votes:{}, roundWinner:null }
    Object.values(r.players).forEach(p=>{
      updates[`players/${p.id}/submitted`]=false
      updates[`players/${p.id}/submittedCard`]=null
      updates[`players/${p.id}/vote`]=null
      const needed=10-(p.hand?.length||0)
      if(needed>0){ updates[`players/${p.id}/hand`]=[...(p.hand||[]),...deck.splice(0,needed)] }
    })
    updates.whiteDeck=deck
    await update(ref(db,`rooms/${roomCode}`), updates)
  }

  async function leaveRoom() {
    if(isHost&&players.length>1){ const next=players.find(p=>p.id!==playerId); if(next) await update(ref(db,`rooms/${roomCode}/players/${next.id}`),{isHost:true}) }
    await set(ref(db,`rooms/${roomCode}/players/${playerId}`),null)
    if(room.isPublic) await set(ref(db,`public_rooms/${roomCode}`),null)
    onLeave()
  }

  // ── LOBBY ──────────────────────────────────────────────────────────────────
  if (room.phase==='lobby') return (
    <div style={s.page}>
      <div style={s.roomCard}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:24}}>
          <span style={{...s.logoMain,fontSize:36,letterSpacing:8}}>CSDM</span>
          <div style={s.codePill}>Código: <strong style={{color:C.gold,letterSpacing:3}}>{roomCode}</strong></div>
        </div>
        <div style={s.sectionLabel}>JUGADORES</div>
        <div style={{display:'flex',flexDirection:'column',gap:8,marginBottom:20}}>
          {players.map(p=>(
            <div key={p.id} style={s.lobbyRow}>
              <span style={{...s.dot,background:p.id===playerId?C.green:C.blue}}/>
              <span style={{flex:1,fontSize:15,color:C.bright}}>{p.name} {p.isHost?'👑':''}</span>
              {p.id===playerId&&<span style={s.youBadge}>Vos</span>}
            </div>
          ))}
        </div>
        <div style={s.shareBox}>📲 Compartí el código <strong style={{color:C.gold}}>{roomCode}</strong> para que se unan.</div>

        {isHost && (
          <div style={{display:'flex',gap:8,marginBottom:8,marginTop:16}}>
            <button style={{...s.btnSecondary,flex:1,marginTop:0}} onClick={()=>setScreen('editBlack')}>✏️ Editar preguntas</button>
            <button style={{...s.btnSecondary,flex:1,marginTop:0}} onClick={()=>setScreen('editCards')}>✏️ Editar respuestas</button>
          </div>
        )}

        {isHost ? (
          <button
            style={{...s.btnPrimary, opacity: players.length < 2 ? 0.4 : 1}}
            onClick={startGame}
            disabled={players.length < 2}
          >
            {players.length < 2 ? 'Esperando más jugadores…' : `¡Empezar con ${players.length} jugadores!`}
          </button>
        ) : (
          <div style={s.waitBox}>
            {players.find(p=>p.isHost)?.name} va a iniciar la partida cuando estén todos.<br/>
            <span style={{fontSize:12,color:C.muted,marginTop:4,display:'block'}}>
              Si no aparés en la lista, salí y volvé a entrar con el código <strong style={{color:C.gold}}>{roomCode}</strong>
            </span>
          </div>
        )}
        <button style={s.btnGhost} onClick={leaveRoom}>Salir</button>
      </div>
      {toast&&<Toast msg={toast}/>}
    </div>
  )

  // ── RESULT ─────────────────────────────────────────────────────────────────
  if (room.phase==='result') {
    const sorted=[...players].sort((a,b)=>b.score-a.score)
    const allSubs=Array.isArray(room.submissions)?room.submissions:[]
    return (
      <div style={s.page}>
        <GameHeader players={players} playerId={playerId} roomCode={roomCode}/>
        <div style={s.body}>
          <div style={s.resultBanner}>🏆 RONDA TERMINADA</div>
          <BlackCard text={room.currentBlack}/>
          {room.roundWinner&&(
            <div style={s.winnerBox}>
              <div style={s.sectionLabel}>CARTA MÁS VOTADA</div>
              <div style={s.winnerWhite}>
                <p style={{color:'#1a1a2e',fontSize:17,fontWeight:700,margin:0,lineHeight:1.4}}>{room.roundWinner.card}</p>
                <div style={{color:C.blue,fontSize:13,fontWeight:700,marginTop:10}}>— {room.roundWinner.playerName}</div>
              </div>
              <div style={{display:'flex',gap:8,justifyContent:'center',flexWrap:'wrap',marginTop:12}}>
                {allSubs.map(sub=>(
                  <div key={sub.playerId} style={s.voteChip}>
                    <span style={{color:C.text}}>{sub.playerName}</span>
                    <span style={{color:C.gold,fontWeight:700,marginLeft:6}}>{votes[sub.playerId]||0} voto{votes[sub.playerId]===1?'':'s'}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          {!room.roundWinner&&<div style={s.waitBox}>Nadie votó esta ronda.</div>}
          <div style={s.scoreboard}>
            <div style={s.sectionLabel}>PUNTAJE</div>
            {sorted.map((p,i)=>(
              <div key={p.id} style={s.scoreRow}>
                <span style={{fontSize:20,width:28}}>{['🥇','🥈','🥉'][i]||`${i+1}.`}</span>
                <span style={{flex:1,fontSize:15,color:C.bright,fontWeight:p.id===playerId?800:400}}>{p.name}</span>
                <span style={{fontSize:15,color:C.gold,fontWeight:800}}>{p.score} pts</span>
              </div>
            ))}
          </div>
          {isHost
            ? <button style={s.btnPrimary} onClick={nextRound}>Siguiente ronda →</button>
            : <div style={s.waitBox}>Esperando que el host pase a la siguiente ronda…</div>
          }
        </div>
        {toast&&<Toast msg={toast}/>}
      </div>
    )
  }

  // ── JUDGING ────────────────────────────────────────────────────────────────
  if (room.phase==='judging') {
    const myVote=me?.vote??null
    const allSubs=Array.isArray(room.submissions)?room.submissions:[]
    const votedCount=players.filter(p=>p.vote!==null).length
    return (
      <div style={s.page}>
        <GameHeader players={players} playerId={playerId} roomCode={roomCode}/>
        <div style={s.body}>
          <div style={s.blackCardSmall}>
            <span style={{fontSize:10,letterSpacing:3,color:'#555',fontWeight:700}}>CONSIGNA</span>
            <p style={{color:'#fff',fontSize:16,fontWeight:700,lineHeight:1.4,margin:'8px 0 0'}}>{room.currentBlack}</p>
          </div>

          <div style={s.voteStatus}>
            {myVote===null
              ? <span>👇 Votá la respuesta más graciosa (no podés votar la tuya)</span>
              : <span>✅ Tu voto fue registrado — {votedCount}/{players.length} votaron</span>
            }
          </div>

          <div style={{display:'flex',flexDirection:'column',gap:10}}>
            {allSubs.map(sub=>{
              const isMine=sub.playerId===playerId
              const iVoted=myVote===sub.playerId
              const canVote=myVote===null&&!isMine
              return (
                <div key={sub.playerId} style={{...s.voteRow,...(iVoted?s.voteRowVoted:{}),...(isMine?s.voteRowMine:{})}}>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontSize:12,fontWeight:800,color:isMine?C.gold:C.bluePale,marginBottom:4,letterSpacing:1}}>
                      {sub.playerName}{isMine?' (vos)':''}
                    </div>
                    <div style={{fontSize:16,fontWeight:600,color:'#1a1a2e',lineHeight:1.4}}>{sub.card}</div>
                  </div>
                  <div style={{flexShrink:0,marginLeft:14}}>
                    {isMine
                      ? <div style={s.myCardTag}>Tu carta</div>
                      : iVoted
                        ? <div style={s.votedTag}>✓ Votada</div>
                        : <button onClick={()=>voteCard(sub.playerId)} disabled={!canVote}
                            style={{...s.voteBtn,opacity:canVote?1:0.35}}>
                            VOTAR
                          </button>
                    }
                  </div>
                </div>
              )
            })}
          </div>

          {/* Host always sees advance button */}
          {isHost&&(
            <button style={{...s.btnPrimary,marginTop:20,background:'linear-gradient(135deg,#7C3AED,#6D28D9)'}} onClick={advanceToResult}>
              Ver resultados →
            </button>
          )}
          {!isHost&&myVote!==null&&(
            <div style={{color:C.muted,textAlign:'center',fontSize:13,marginTop:12}}>
              Esperando que el host cierre la votación… ({votedCount}/{players.length} votaron)
            </div>
          )}
        </div>
        {toast&&<Toast msg={toast}/>}
      </div>
    )
  }

  // ── PLAYING ────────────────────────────────────────────────────────────────
  const submittedCount=players.filter(p=>p.submitted).length
  const iSubmitted=me?.submitted
  return (
    <div style={s.page}>
      <GameHeader players={players} playerId={playerId} roomCode={roomCode}/>
      <div style={s.body}>
        <div style={s.progressRow}>
          <div style={s.track}><div style={{...s.fill,width:`${players.length?(submittedCount/players.length)*100:0}%`}}/></div>
          <span style={{fontSize:12,color:C.muted,whiteSpace:'nowrap'}}>{submittedCount}/{players.length} enviadas</span>
        </div>
        <BlackCard text={room.currentBlack}/>
        {iSubmitted?(
          <div style={{textAlign:'center'}}>
            <div style={{color:C.green,fontSize:16,fontWeight:700,marginBottom:12}}>✅ Tu carta fue enviada</div>
            <div style={s.sentCard}>{me?.submittedCard}</div>
            <div style={{display:'flex',flexWrap:'wrap',gap:8,justifyContent:'center',marginTop:16}}>
              {players.map(p=>(
                <div key={p.id} style={s.playerChip}>
                  <span style={{...s.dot,background:p.submitted?C.green:C.muted}}/>{p.name} {p.submitted?'✓':'…'}
                </div>
              ))}
            </div>
          </div>
        ):(
          <>
            <div style={{fontSize:14,color:C.muted,marginBottom:14}}>
              Tu mano — <span style={{color:C.bluePale}}>seleccioná y editá tu carta antes de enviar</span>
            </div>
            <div style={s.handGrid}>
              {(me?.hand||[]).map((card,i)=>(
                <HandCard key={i} text={card} selected={selectedIdx===i}
                  onSelect={()=>setSelectedIdx(selectedIdx===i?null:i)}
                  onEdit={newText=>{ const h=[...(me.hand||[])]; h[i]=newText; update(ref(db,`rooms/${roomCode}/players/${playerId}`),{hand:h}) }}
                />
              ))}
            </div>
            <button style={{...s.btnPrimary,opacity:selectedIdx===null?.35:1}} disabled={selectedIdx===null} onClick={submitCard}>
              Enviar carta
            </button>
          </>
        )}
      </div>
      {toast&&<Toast msg={toast}/>}
    </div>
  )
}

// ─── CARD EDITOR ─────────────────────────────────────────────────────────────
function CardEditor({ roomCode, playerId, type, onBack }) {
  const isBlack = type==='black'
  const defaultDeck = isBlack ? BLACK_CARDS : WHITE_CARDS
  const dbKey = isBlack ? 'customBlackDeck' : 'customWhiteDeck'
  const [cards, setCards] = useState(null)
  const [newCard, setNewCard] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(()=>{
    get(ref(db,`rooms/${roomCode}/${dbKey}`)).then(snap=>{
      setCards(snap.exists()&&Array.isArray(snap.val()) ? snap.val() : [...defaultDeck])
    })
  },[])

  async function save() {
    setSaving(true)
    await update(ref(db,`rooms/${roomCode}`),{ [dbKey]: cards })
    setSaving(false)
    onBack()
  }

  function addCard() {
    if (!newCard.trim()) return
    setCards([...cards, newCard.trim()])
    setNewCard('')
  }

  function removeCard(i) { setCards(cards.filter((_,idx)=>idx!==i)) }

  function editCard(i, val) { const c=[...cards]; c[i]=val; setCards(c) }

  function reset() { setCards([...defaultDeck]) }

  if (!cards) return <div style={s.page}><div style={{color:C.bluePale,marginTop:80}}>Cargando…</div></div>

  return (
    <div style={s.page}>
      <div style={{width:'100%',maxWidth:620}}>
        <div style={{display:'flex',alignItems:'center',gap:12,marginBottom:20}}>
          <button onClick={onBack} style={s.backBtn}>← Volver</button>
          <h2 style={{color:C.bright,fontSize:18,fontWeight:800,margin:0}}>
            {isBlack?'✏️ Editar preguntas (cartas negras)':'✏️ Editar respuestas (cartas blancas)'}
          </h2>
        </div>

        <div style={{color:C.muted,fontSize:13,marginBottom:16}}>
          {cards.length} cartas en el mazo. Podés editar, eliminar o agregar nuevas.
        </div>

        {/* Add new */}
        <div style={{display:'flex',gap:8,marginBottom:20}}>
          <input
            style={{...s.input,flex:1}}
            placeholder={isBlack?'Nueva pregunta (usá ___ para el espacio)...':'Nueva respuesta...'}
            value={newCard}
            onChange={e=>setNewCard(e.target.value)}
            onKeyDown={e=>e.key==='Enter'&&addCard()}
          />
          <button style={{...s.joinBtn,padding:'12px 20px',fontSize:14}} onClick={addCard}>+ Agregar</button>
        </div>

        {/* Card list */}
        <div style={{display:'flex',flexDirection:'column',gap:8,marginBottom:20,maxHeight:'50vh',overflowY:'auto'}}>
          {cards.map((card,i)=>(
            <div key={i} style={{
              background:isBlack?'#111':'#fff',
              border:`2px solid ${isBlack?'#333':C.border}`,
              borderRadius:10, padding:'10px 14px',
              display:'flex', alignItems:'center', gap:10,
            }}>
              <input
                style={{
                  flex:1, background:'transparent', border:'none', outline:'none',
                  color:isBlack?'#fff':'#1a1a2e', fontSize:14, fontWeight:600, fontFamily:'inherit',
                }}
                value={card}
                onChange={e=>editCard(i,e.target.value)}
              />
              <button onClick={()=>removeCard(i)} style={{background:'rgba(239,68,68,0.15)',border:'none',color:'#F87171',borderRadius:6,width:28,height:28,cursor:'pointer',fontSize:14,flexShrink:0}}>✕</button>
            </div>
          ))}
        </div>

        <div style={{display:'flex',gap:8}}>
          <button style={{...s.btnGhost,flex:1,marginTop:0}} onClick={reset}>Restaurar originales</button>
          <button style={{...s.btnPrimary,flex:2,marginTop:0,opacity:saving?.5:1}} disabled={saving} onClick={save}>
            {saving?'Guardando...':'Guardar cambios'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── SUB-COMPONENTS ──────────────────────────────────────────────────────────
function HandCard({ text, selected, onSelect, onEdit }) {
  const [editing,setEditing]=useState(false)
  const [val,setVal]=useState(text)
  useEffect(()=>setVal(text),[text])
  return (
    <div style={{...s.handCard,...(selected?s.handCardOn:{})}} onClick={()=>{if(!editing)onSelect()}}>
      {editing
        ? <textarea autoFocus style={s.textarea} value={val} onChange={e=>setVal(e.target.value)} onBlur={()=>{setEditing(false);onEdit(val)}} onClick={e=>e.stopPropagation()} rows={3}/>
        : <p style={{color:'#1a1a2e',fontSize:14,fontWeight:600,lineHeight:1.4,margin:0,flex:1}}>{val}</p>
      }
      <button style={s.editBtn} onClick={e=>{e.stopPropagation();setEditing(!editing)}}>{editing?'✓':' ✏️'}</button>
      {selected&&!editing&&<div style={s.selBadge}>✓ Seleccionada</div>}
    </div>
  )
}

function GameHeader({ players, playerId, roomCode }) {
  const sorted=[...players].sort((a,b)=>b.score-a.score)
  return (
    <div style={s.header}>
      <span style={{...s.logoMain,fontSize:22,letterSpacing:6}}>CSDM</span>
      <span style={s.codePill}>{roomCode}</span>
      <div style={{display:'flex',gap:10,flexWrap:'wrap',marginLeft:'auto'}}>
        {sorted.slice(0,5).map(p=>(
          <span key={p.id} style={{fontSize:12,color:p.id===playerId?C.bluePale:C.muted}}>
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
      <div style={{fontSize:10,letterSpacing:3,color:'#333',fontWeight:700,marginBottom:14}}>CSDM</div>
      <p style={{color:'#fff',fontSize:20,fontWeight:700,lineHeight:1.5,margin:0}}>{text||'Cargando…'}</p>
    </div>
  )
}

function Toast({ msg }) {
  return <div style={{position:'fixed',bottom:24,left:'50%',transform:'translateX(-50%)',background:C.blue,color:'#fff',padding:'12px 24px',borderRadius:30,fontSize:14,fontWeight:700,boxShadow:'0 8px 32px rgba(0,0,0,0.4)',zIndex:999,whiteSpace:'nowrap',pointerEvents:'none'}}>{msg}</div>
}

// ─── STYLES ──────────────────────────────────────────────────────────────────
const s = {
  page:{minHeight:'100vh',background:`linear-gradient(160deg,${C.bg} 0%,${C.bgDeep} 100%)`,display:'flex',flexDirection:'column',alignItems:'center',fontFamily:"'Inter','Segoe UI',sans-serif",color:C.text,padding:'20px 16px 60px'},
  homeCard:{background:C.panel,border:`1px solid ${C.border}`,borderRadius:20,padding:'40px 32px',width:'100%',maxWidth:420,boxShadow:'0 32px 80px rgba(0,0,0,0.5)',marginTop:40},
  roomCard:{background:C.panel,border:`1px solid ${C.border}`,borderRadius:20,padding:'32px 28px',width:'100%',maxWidth:440,boxShadow:'0 32px 80px rgba(0,0,0,0.5)',marginTop:20},
  logoMain:{display:'block',fontSize:72,fontWeight:900,fontFamily:"'Georgia','Times New Roman',serif",color:'#fff',letterSpacing:10,lineHeight:1,textShadow:`0 0 60px ${C.blue}88`},
  logoSub:{display:'block',fontSize:11,letterSpacing:4,color:C.bluePale,marginTop:6,fontWeight:600},
  tabs:{display:'flex',gap:6,margin:'14px 0',background:'rgba(0,0,0,0.3)',borderRadius:10,padding:4},
  tabOn:{flex:1,background:C.blue,border:'none',color:'#fff',borderRadius:8,padding:'8px 4px',fontSize:13,cursor:'pointer',fontFamily:'inherit',fontWeight:700},
  tabOff:{flex:1,background:'transparent',border:'none',color:C.muted,borderRadius:8,padding:'8px 4px',fontSize:13,cursor:'pointer',fontFamily:'inherit',fontWeight:600},
  input:{width:'100%',background:'rgba(255,255,255,0.06)',border:`1px solid ${C.border}`,borderRadius:10,color:'#fff',padding:'12px 16px',fontSize:15,outline:'none',fontFamily:'inherit',boxSizing:'border-box'},
  errorBox:{color:'#FCA5A5',background:'rgba(239,68,68,0.1)',border:'1px solid rgba(239,68,68,0.3)',borderRadius:8,padding:'10px 14px',fontSize:13,marginTop:12},
  btnPrimary:{width:'100%',background:`linear-gradient(135deg,${C.blue},${C.blueHover})`,border:'none',color:'#fff',borderRadius:12,padding:15,fontSize:16,fontWeight:800,letterSpacing:1,cursor:'pointer',fontFamily:'inherit',marginTop:12,boxShadow:`0 8px 24px ${C.blue}44`},
  btnSecondary:{width:'100%',background:'transparent',border:`1px solid ${C.border}`,color:C.bluePale,borderRadius:12,padding:13,fontSize:14,fontWeight:700,cursor:'pointer',fontFamily:'inherit',marginTop:8},
  btnGhost:{width:'100%',background:'transparent',border:`1px solid ${C.border}`,color:C.muted,borderRadius:10,padding:12,fontSize:14,cursor:'pointer',fontFamily:'inherit',marginTop:10},
  backBtn:{background:'transparent',border:`1px solid ${C.border}`,color:C.bluePale,borderRadius:8,padding:'8px 14px',fontSize:14,cursor:'pointer',fontFamily:'inherit',fontWeight:600,flexShrink:0},
  codePill:{background:C.blueFaint,border:`1px solid ${C.border}`,borderRadius:8,padding:'6px 14px',fontSize:14,color:C.bluePale},
  sectionLabel:{fontSize:11,letterSpacing:3,color:C.muted,fontWeight:700,marginBottom:12},
  lobbyRow:{display:'flex',alignItems:'center',gap:10,background:'rgba(255,255,255,0.04)',border:`1px solid ${C.border}`,borderRadius:10,padding:'10px 14px'},
  dot:{width:8,height:8,borderRadius:'50%',flexShrink:0},
  youBadge:{fontSize:11,fontWeight:700,color:C.blue,background:C.blueFaint,padding:'2px 8px',borderRadius:20},
  shareBox:{background:'rgba(251,191,36,0.08)',border:`1px solid ${C.gold}33`,borderRadius:12,padding:14,fontSize:14,color:C.text,lineHeight:1.6,textAlign:'center',marginBottom:8},
  waitBox:{background:C.blueFaint,border:`1px solid ${C.border}`,borderRadius:10,padding:14,color:C.bluePale,textAlign:'center',fontSize:14,marginTop:16},
  emptyBox:{background:'rgba(255,255,255,0.04)',border:`1px solid ${C.border}`,borderRadius:10,padding:20,textAlign:'center',color:C.muted,fontSize:14,lineHeight:1.8},
  publicRow:{display:'flex',justifyContent:'space-between',alignItems:'center',background:'rgba(255,255,255,0.04)',border:`1px solid ${C.border}`,borderRadius:10,padding:'12px 14px'},
  joinBtn:{background:C.blue,border:'none',color:'#fff',borderRadius:8,padding:'8px 16px',fontSize:13,cursor:'pointer',fontFamily:'inherit',fontWeight:700},
  header:{width:'100%',maxWidth:640,background:'rgba(8,15,46,0.85)',backdropFilter:'blur(12px)',borderBottom:`1px solid ${C.border}`,borderRadius:'0 0 16px 16px',padding:'10px 18px',display:'flex',alignItems:'center',gap:12,flexWrap:'wrap',marginBottom:8,position:'sticky',top:0,zIndex:50},
  body:{width:'100%',maxWidth:620,padding:'12px 0'},
  progressRow:{display:'flex',alignItems:'center',gap:10,marginBottom:16},
  track:{flex:1,height:4,background:'rgba(255,255,255,0.08)',borderRadius:2,overflow:'hidden'},
  fill:{height:'100%',background:`linear-gradient(90deg,${C.blue},${C.blueHover})`,borderRadius:2,transition:'width 0.5s ease'},
  blackCard:{background:'#080808',border:'3px solid #1a1a2e',borderRadius:16,padding:'26px 24px',marginBottom:20,boxShadow:'0 12px 40px rgba(0,0,0,0.6)'},
  blackCardSmall:{background:'#080808',border:'2px solid #1a1a2e',borderRadius:12,padding:'16px 20px',marginBottom:14,boxShadow:'0 8px 24px rgba(0,0,0,0.5)'},
  voteStatus:{background:C.blueFaint,border:`1px solid ${C.border}`,borderRadius:10,padding:'12px 16px',fontSize:14,color:C.bluePale,textAlign:'center',marginBottom:14,fontWeight:600},
  voteRow:{background:'#fff',borderRadius:14,padding:'14px 16px',display:'flex',alignItems:'center',border:'3px solid transparent',boxShadow:'0 4px 16px rgba(0,0,0,0.2)',transition:'all 0.2s'},
  voteRowVoted:{border:`3px solid ${C.blue}`,boxShadow:`0 6px 24px ${C.blue}44`,background:'#f0f7ff'},
  voteRowMine:{border:`3px solid ${C.gold}55`,background:'#fffbf0'},
  voteBtn:{background:C.blue,border:'none',color:'#fff',borderRadius:10,padding:'10px 18px',fontSize:14,fontWeight:900,cursor:'pointer',fontFamily:'inherit',letterSpacing:1,boxShadow:`0 4px 16px ${C.blue}55`,minWidth:80},
  myCardTag:{background:C.gold,color:'#000',fontSize:11,fontWeight:800,padding:'6px 10px',borderRadius:8,letterSpacing:1,whiteSpace:'nowrap'},
  votedTag:{background:C.blue,color:'#fff',fontSize:11,fontWeight:800,padding:'6px 10px',borderRadius:8,letterSpacing:1,whiteSpace:'nowrap'},
  handGrid:{display:'grid',gridTemplateColumns:'repeat(auto-fill, minmax(160px, 1fr))',gap:12,marginBottom:16},
  handCard:{background:'#fff',borderRadius:12,padding:14,border:'3px solid transparent',transition:'all 0.15s',boxShadow:'0 4px 16px rgba(0,0,0,0.3)',position:'relative',minHeight:120,display:'flex',flexDirection:'column',cursor:'pointer'},
  handCardOn:{border:`3px solid ${C.blue}`,transform:'translateY(-4px)',boxShadow:`0 12px 32px ${C.blue}44`},
  textarea:{width:'100%',border:'none',background:'transparent',fontFamily:"'Inter',sans-serif",fontSize:14,fontWeight:600,color:'#1a1a2e',resize:'none',outline:'none',lineHeight:1.4,padding:0,boxSizing:'border-box',flex:1},
  editBtn:{background:'transparent',border:'none',cursor:'pointer',fontSize:12,padding:'2px 4px',alignSelf:'flex-end',marginTop:4,color:'#888'},
  selBadge:{position:'absolute',bottom:8,right:8,fontSize:10,fontWeight:800,color:C.blue,background:C.blueFaint,padding:'2px 8px',borderRadius:10},
  sentCard:{background:'#fff',color:'#1a1a2e',borderRadius:12,padding:'16px 20px',fontSize:15,fontWeight:600,maxWidth:300,margin:'0 auto',boxShadow:'0 4px 16px rgba(0,0,0,0.3)',border:`2px solid ${C.green}`},
  playerChip:{display:'flex',alignItems:'center',gap:6,fontSize:13,color:C.text,background:'rgba(255,255,255,0.04)',padding:'4px 12px',borderRadius:20},
  resultBanner:{fontSize:22,fontWeight:900,color:C.gold,letterSpacing:2,textAlign:'center',marginBottom:20},
  winnerBox:{background:C.panel,border:`2px solid ${C.gold}44`,borderRadius:16,padding:20,marginBottom:20,textAlign:'center'},
  winnerWhite:{background:'#fff',borderRadius:12,padding:18,maxWidth:280,margin:'0 auto',border:`3px solid ${C.gold}`},
  voteChip:{display:'flex',alignItems:'center',background:'rgba(255,255,255,0.04)',padding:'4px 12px',borderRadius:20,fontSize:13},
  scoreboard:{background:'rgba(0,0,0,0.3)',border:`1px solid ${C.border}`,borderRadius:14,padding:16,marginBottom:16},
  scoreRow:{display:'flex',alignItems:'center',gap:10,padding:'8px 0',borderBottom:'1px solid rgba(255,255,255,0.04)'},
}
