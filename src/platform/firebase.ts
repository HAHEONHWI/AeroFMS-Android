import { getApp, getApps, initializeApp } from 'firebase/app'
import type { FirebaseApp } from 'firebase/app'
 
import { getAuth, getReactNativePersistence, initializeAuth } from 'firebase/auth'
import type { Auth } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'
import type { Firestore } from 'firebase/firestore'
import { getFunctions } from 'firebase/functions'
import type { Functions } from 'firebase/functions'
import { getStorage } from 'firebase/storage'
import type { FirebaseStorage } from 'firebase/storage'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { readFirebaseConfig } from '@aerofms/cloud'
import type { FirebaseClientConfig } from '@aerofms/cloud'

/** Must match firebase/functions deployment region. */
export const FUNCTIONS_REGION = 'asia-northeast3'

export interface FirebaseServices {
  config: FirebaseClientConfig
  app: FirebaseApp
  auth: Auth
  db: Firestore
  functions: Functions
  storage: FirebaseStorage
}

let cached: FirebaseServices | null | undefined

const env: Record<string, string | undefined> = {
  FIREBASE_API_KEY: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  FIREBASE_AUTH_DOMAIN: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  FIREBASE_PROJECT_ID: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  FIREBASE_STORAGE_BUCKET: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  FIREBASE_MESSAGING_SENDER_ID: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  FIREBASE_APP_ID: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
}

/** Firebase JS SDK services, or null when the build has no Firebase configuration. */
export function getFirebase(): FirebaseServices | null {
  if (cached !== undefined) return cached
  const config = readFirebaseConfig(env, '')
  if (!config) {
    cached = null
    return cached
  }
  const app = getApps().length ? getApp() : initializeApp(config)
  let auth: Auth
  try {
    auth = initializeAuth(app, { persistence: getReactNativePersistence(AsyncStorage) })
  } catch {
    auth = getAuth(app)
  }
  cached = { config, app, auth, db: getFirestore(app), functions: getFunctions(app, FUNCTIONS_REGION), storage: getStorage(app) }
  return cached
}
