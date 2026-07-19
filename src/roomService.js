import {
  get,
  onDisconnect,
  onValue,
  ref,
  remove,
  serverTimestamp,
  set,
  update,
} from 'firebase/database'
import { db, ensureAnonymousUser } from './firebase'

const ROOM_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'

function createCode(length = 6) {
  return Array.from({ length }, () => ROOM_ALPHABET[Math.floor(Math.random() * ROOM_ALPHABET.length)]).join('')
}

async function uniqueRoomCode() {
  for (let attempt = 0; attempt < 10; attempt += 1) {
    const code = createCode()
    const snapshot = await get(ref(db, `rooms/${code}`))
    if (!snapshot.exists()) return code
  }
  throw new Error('No se pudo generar un código de sala. Intenta otra vez.')
}

export async function createRoom(playerName) {
  const user = await ensureAnonymousUser()
  const roomCode = await uniqueRoomCode()
  const player = {
    id: user.uid,
    name: playerName,
    joinedAt: serverTimestamp(),
    online: true,
  }

  await set(ref(db, `rooms/${roomCode}`), {
    code: roomCode,
    hostId: user.uid,
    status: 'waiting',
    createdAt: serverTimestamp(),
    players: { [user.uid]: player },
  })

  await registerPresence(roomCode, user.uid)
  return { roomCode, playerId: user.uid }
}

export async function joinRoom(roomCode, playerName) {
  const user = await ensureAnonymousUser()
  const normalizedCode = roomCode.trim().toUpperCase()
  const roomRef = ref(db, `rooms/${normalizedCode}`)
  const snapshot = await get(roomRef)

  if (!snapshot.exists()) throw new Error('No encontramos esa sala.')
  const room = snapshot.val()
  if (room.status !== 'waiting') throw new Error('La partida ya empezó.')
  if (Object.keys(room.players || {}).length >= 8 && !room.players?.[user.uid]) {
    throw new Error('La sala ya tiene 8 jugadores.')
  }

  await update(ref(db, `rooms/${normalizedCode}/players/${user.uid}`), {
    id: user.uid,
    name: playerName,
    joinedAt: serverTimestamp(),
    online: true,
  })

  await registerPresence(normalizedCode, user.uid)
  return { roomCode: normalizedCode, playerId: user.uid }
}

async function registerPresence(roomCode, playerId) {
  const onlineRef = ref(db, `rooms/${roomCode}/players/${playerId}/online`)
  await set(onlineRef, true)
  await onDisconnect(onlineRef).set(false)
}

export function subscribeToRoom(roomCode, onRoom, onError) {
  return onValue(ref(db, `rooms/${roomCode}`), (snapshot) => {
    onRoom(snapshot.exists() ? snapshot.val() : null)
  }, onError)
}

export async function startRoom(roomCode, playerId) {
  const snapshot = await get(ref(db, `rooms/${roomCode}`))
  if (!snapshot.exists()) throw new Error('La sala ya no existe.')
  const room = snapshot.val()
  if (room.hostId !== playerId) throw new Error('Solo la anfitriona puede iniciar.')
  if (Object.keys(room.players || {}).length < 2) throw new Error('Se necesitan al menos 2 jugadores.')
  await update(ref(db, `rooms/${roomCode}`), {
    status: 'playing',
    startedAt: serverTimestamp(),
  })
}

export async function leaveRoom(roomCode, playerId, isHost) {
  if (!roomCode || !playerId) return
  if (isHost) {
    await remove(ref(db, `rooms/${roomCode}`))
  } else {
    await remove(ref(db, `rooms/${roomCode}/players/${playerId}`))
  }
}
