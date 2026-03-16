import { getApp, getApps, initializeApp } from "firebase/app"
import { getFirestore } from "firebase/firestore"
import { getMessaging, isSupported } from "firebase/messaging"

const firebaseConfig = {
 apiKey: "AIzaSyAhaAy_p8qRxmHEH8VhLn438dQ9cDXCMf0",
  authDomain: "take-care-18dca.firebaseapp.com",
  projectId: "take-care-18dca",
  storageBucket: "take-care-18dca.firebasestorage.app",
  messagingSenderId: "548382735543",
  appId: "1:548382735543:web:17f404551b38667d07e132",
  measurementId: "G-G74QC00J4F",
}

const app = getApps().length ? getApp() : initializeApp(firebaseConfig)

export const db = getFirestore(app)

export const messaging = async () => {
  if (typeof window === "undefined") return null
  const supported = await isSupported()
  if (!supported) return null
  return getMessaging(app)
}

export default app