import { NATIVE_FIREBASE } from './native'

/** Google Sign-In via Android Credential Manager; returns an ID token for Firebase Auth. */
const webClientId = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID

export const googleSignInAvailable = (): boolean => !!webClientId || NATIVE_FIREBASE

export async function googleIdToken(): Promise<string | null> {
  // eslint-disable-next-line @typescript-eslint/no-require-imports -- loaded lazily so the Nitro module initializes only when sign-in is used
  const m = require('react-native-nitro-google-signin') as typeof import('react-native-nitro-google-signin')
  const { GoogleOneTapSignIn, isNoSavedCredentialFoundResponse, isSuccessResponse } = m
  GoogleOneTapSignIn.configure({ webClientId: webClientId ?? 'autoDetect' })
  await GoogleOneTapSignIn.checkPlayServices()
  let response = await GoogleOneTapSignIn.signIn()
  if (isNoSavedCredentialFoundResponse(response)) response = await GoogleOneTapSignIn.createAccount()
  if (isNoSavedCredentialFoundResponse(response)) response = await GoogleOneTapSignIn.presentExplicitSignIn()
  return isSuccessResponse(response) ? (response.data.idToken ?? null) : null
}
