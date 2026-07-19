import { useEffect, useMemo, useState } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import {
  createRoom,
  joinRoom,
  leaveRoom,
  startRoom,
  subscribeToRoom,
} from './roomService'
import './styles.css'

const SAVED_SESSION_KEY = 'rockola-session-v1'

function App() {
  const [name, setName] = useState(localStorage.getItem('rockola-name') || '')
  const [joinCode, setJoinCode] = useState('')
  const [session, setSession] = useState(() => {
    try { return JSON.parse(localStorage.getItem(SAVED_SESSION_KEY)) }
    catch { return null }
  })
  const [room, setRoom] = useState(null)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    if (!session?.roomCode) return undefined
    const unsubscribe = subscribeToRoom(
      session.roomCode,
      (nextRoom) => {
        if (!nextRoom) {
          localStorage.removeItem(SAVED_SESSION_KEY)
          setSession(null)
          setRoom(null)
          setMessage('La sala terminó.')
          return
        }
        setRoom(nextRoom)
      },
      (error) => setMessage(firebaseMessage(error)),
    )
    return unsubscribe
  }, [session?.roomCode])

  const players = useMemo(() => Object.values(room?.players || {}).sort((a, b) => (a.joinedAt || 0) - (b.joinedAt || 0)), [room])
  const isHost = room?.hostId === session?.playerId
  const inviteUrl = session?.roomCode ? `${window.location.origin}?sala=${session.roomCode}` : ''

  useEffect(() => {
    const codeFromUrl = new URLSearchParams(window.location.search).get('sala')
    if (codeFromUrl && !session) setJoinCode(codeFromUrl.toUpperCase())
  }, [session])

  function validateName() {
    const clean = name.trim()
    if (clean.length < 2) throw new Error('Escribe un nombre de al menos 2 letras.')
    localStorage.setItem('rockola-name', clean)
    return clean
  }

  async function handleCreate() {
    setBusy(true); setMessage('Conectando con Firebase…')
    try {
      const result = await createRoom(validateName())
      saveSession(result)
      setMessage('')
    } catch (error) { 
      console.error('handleCreate error:', error)
      setMessage(firebaseMessage(error)) 
    }
    finally { setBusy(false) }
  }

  async function handleJoin() {
    setBusy(true); setMessage('Entrando a la sala…')
    try {
      if (joinCode.trim().length !== 6) throw new Error('El código debe tener 6 caracteres.')
      const result = await joinRoom(joinCode, validateName())
      saveSession(result)
      setMessage('')
    } catch (error) { 
      console.error('handleJoin error:', error)
      setMessage(firebaseMessage(error)) 
    }
    finally { setBusy(false) }
  }

  function saveSession(result) {
    localStorage.setItem(SAVED_SESSION_KEY, JSON.stringify(result))
    setSession(result)
  }

  async function handleLeave() {
    setBusy(true)
    try { await leaveRoom(session.roomCode, session.playerId, isHost) }
    catch (error) { 
      console.error('handleLeave error:', error)
      setMessage(firebaseMessage(error)) 
    }
    localStorage.removeItem(SAVED_SESSION_KEY)
    setSession(null); setRoom(null); setBusy(false)
  }

  async function handleStart() {
    setBusy(true); setMessage('')
    try { await startRoom(session.roomCode, session.playerId) }
    catch (error) { 
      console.error('handleStart error:', error)
      setMessage(firebaseMessage(error)) 
    }
    finally { setBusy(false) }
  }

  async function copyInvite() {
    await navigator.clipboard.writeText(inviteUrl)
    setMessage('Enlace copiado. Compártelo con los jugadores.')
  }

  if (!session) {
    return (
      <main className="shell">
        <header className="hero">
          <span className="eyebrow">VERSIÓN MULTIJUGADOR</span>
          <h1>La Rockola<br /><em>del Tiempo</em></h1>
          <p>Una sala, varios celulares, una misma partida.</p>
        </header>
        <section className="panel entry-panel">
          <label>Tu nombre<input value={name} onChange={(e) => setName(e.target.value)} maxLength={24} placeholder="Karen" /></label>
          <button className="primary" onClick={handleCreate} disabled={busy}>{busy ? 'Conectando…' : 'Crear sala'}</button>
          <div className="divider"><span>o</span></div>
          <label>Código de sala<input className="code-input" value={joinCode} onChange={(e) => setJoinCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6))} maxLength={6} placeholder="ABC123" /></label>
          <button className="secondary" onClick={handleJoin} disabled={busy}>Unirme a una sala</button>
          {message && <p className="notice">{message}</p>}
        </section>
      </main>
    )
  }

  return (
    <main className="shell room-shell">
      <header className="room-header">
        <div><span className="eyebrow">SALA</span><h1>{session.roomCode}</h1></div>
        <button className="ghost" onClick={handleLeave} disabled={busy}>{isHost ? 'Cerrar sala' : 'Salir'}</button>
      </header>
      <div className="room-grid">
        <section className="panel qr-panel">
          <QRCodeSVG value={inviteUrl} size={188} bgColor="transparent" fgColor="#fff7d6" level="M" />
          <h2>Escanea para entrar</h2>
          <p>También pueden escribir el código <strong>{session.roomCode}</strong>.</p>
          <button className="secondary" onClick={copyInvite}>Copiar enlace</button>
        </section>
        <section className="panel players-panel">
          <div className="section-title"><div><span className="eyebrow">JUGADORES</span><h2>{players.length} / 8 conectados</h2></div><span className="live-dot">EN VIVO</span></div>
          <div className="players-list">
            {players.map((player) => (
              <article className="player" key={player.id}>
                <span className="avatar">{player.name.slice(0, 1).toUpperCase()}</span>
                <div><strong>{player.name}{player.id === session.playerId ? ' · tú' : ''}</strong><small>{player.id === room.hostId ? 'Anfitriona' : player.online === false ? 'Desconectado' : 'En vivo'}</small></div>
                <span>{player.id === room.hostId ? '👑' : player.online === false ? '○' : '●'}</span>
              </article>
            ))}
          </div>
          {room?.status === 'waiting' && isHost && <button className="primary" onClick={handleStart} disabled={busy || players.length < 2}>{players.length < 2 ? 'Esperando otro jugador…' : 'Empezar partida'}</button>}
          {room?.status === 'waiting' && !isHost && <p className="waiting-text">Esperando a que la anfitriona inicie…</p>}
          {room?.status === 'playing' && <div className="success-card"><span>🎵</span><div><strong>¡La sala ya está sincronizada!</strong><p>La siguiente versión agregará canciones, turnos y tablas de puntuaciones.</p></div></div>}
          {message && <p className="notice">{message}</p>}
        </section>
      </div>
    </main>
  )
}

function firebaseMessage(error) {
  const code = error?.code || ''
  const message = error?.message || ''
  
  console.log('Firebase error details:', { code, message })
  
  if (code.includes('auth/operation-not-allowed')) return 'Activa el proveedor Anónimo en Firebase Authentication.'
  if (code.includes('auth/unauthorized-domain')) return 'Este dominio todavía no está autorizado en Firebase.'
  if (code.includes('permission-denied') || message.includes('Permission denied')) return 'Firebase rechazó el acceso. Revisa las reglas de Realtime Database.'
  if (code.includes('network-request-failed')) return 'No se pudo conectar. Revisa tu conexión a internet.'
  if (code.includes('auth/') || message.includes('auth/')) return `Error de autenticación: ${code || message}`
  if (code.includes('database-url-not-specified')) return 'La URL de la base de datos no está configurada en Firebase.'
  
  return `Error: ${code || message || 'Ocurrió un error inesperado.'}`
}

export default App
