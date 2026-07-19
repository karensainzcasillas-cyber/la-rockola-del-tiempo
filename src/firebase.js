import { initializeApp } from 'firebase/app'
import { getAuth, signInAnonymously } from 'firebase/auth'
import { getDatabase } from 'firebase/database'

const firebaseConfig = {
  apiKey: 'AIzaSyAs5xP8lCVpYpy1M241XCiA8ORWYi9meUI',
  authDomain: 'la-rockola-del-tiempo.firebaseapp.com',
  databaseURL: 'https://la-rockola-del-tiempo-default-rtdb.firebaseio.com',
  projectId: 'la-rockola-del-tiempo',
  storageBucket: 'la-rockola-del-tiempo.firebasestorage.app',
  messagingSenderId: '1053145758148',
  appId: '1:1053145758148:web:3489a8b9bb14f2563c8c91',
  measurementId: 'G-82NCWVN80G',
}

const app = initializeApp(firebaseConfig)
export const auth = getAuth(app)
export const db = getDatabase(app)

export async function ensureAnonymousUser() {
  if (auth.currentUser) return auth.currentUser
  try {
    const credential = await signInAnonymously(auth)
    return credential.user
  } catch (error) {
    console.error('Error en signInAnonymously:', error.code, error.message)
    throw error
  }
}
