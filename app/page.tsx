"use client"

import { useState } from "react"
import { addDoc, collection, getDocs, query, where } from "firebase/firestore"
import { getToken } from "firebase/messaging"
import { db, messaging } from "@/lib/firebase"

export default function HomePage() {
  const [status, setStatus] = useState("Ready")
  const [loading, setLoading] = useState(false)
  const [savedToken, setSavedToken] = useState("")

  const handleEnableNotifications = async () => {
    try {
      setLoading(true)
      setStatus("Checking browser support...")

      if (typeof window === "undefined") {
        setStatus("Window not available.")
        return
      }

      if (!("Notification" in window)) {
        setStatus("This browser does not support notifications.")
        return
      }

      setStatus("Requesting notification permission...")
      const permission = await Notification.requestPermission()

      if (permission !== "granted") {
        setStatus("Notification permission was not granted.")
        return
      }

      setStatus("Preparing messaging...")
      const messagingInstance = await messaging()

      if (!messagingInstance) {
        setStatus("Firebase messaging is not supported in this browser.")
        return
      }

      setStatus("Registering service worker...")
      const registration = await navigator.serviceWorker.register(
        "/firebase-messaging-sw.js"
      )

      setStatus("Getting device token...")
      const token = await getToken(messagingInstance, {
        vapidKey: process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY,
        serviceWorkerRegistration: registration,
      })

      if (!token) {
        setStatus("Token was not generated.")
        return
      }

      setStatus("Checking existing token...")
      const existingQuery = query(
        collection(db, "deviceTokens"),
        where("token", "==", token)
      )
      const existingSnapshot = await getDocs(existingQuery)

      if (!existingSnapshot.empty) {
        setSavedToken(token)
        setStatus("This device is already registered.")
        return
      }

      const userAgent = navigator.userAgent
      const isAndroid = /Android/i.test(userAgent)
      const isChrome = /Chrome/i.test(userAgent)

      setStatus("Saving token to Firestore...")
      await addDoc(collection(db, "deviceTokens"), {
        token,
        createdAt: new Date().toISOString(),
        userAgent,
        platform: isAndroid ? "Android" : "Other",
        browser: isChrome ? "Chrome" : "Other",
      })

      setSavedToken(token)
      setStatus("Notifications enabled and device registered successfully.")
    } catch (error) {
      console.error(error)
      setStatus("Something went wrong while enabling notifications.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen bg-slate-950 text-white px-4 py-8">
      <div className="mx-auto max-w-md">
        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-lg">
          <div className="mb-6">
            <p className="text-sm text-slate-400">Care Notification</p>
            <h1 className="mt-2 text-2xl font-semibold">
              Android alert setup
            </h1>
            <p className="mt-3 text-sm leading-6 text-slate-300">
              Enable push notifications on this Android phone so care alerts can
              be sent here later.
            </p>
          </div>

          <button
            onClick={handleEnableNotifications}
            disabled={loading}
            className="w-full rounded-xl bg-white px-4 py-3 text-sm font-medium text-slate-900 transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? "Please wait..." : "Enable notifications"}
          </button>

          <div className="mt-5 rounded-xl bg-slate-800/70 p-4">
            <p className="text-xs uppercase tracking-wide text-slate-400">
              Status
            </p>
            <p className="mt-2 text-sm text-slate-200">{status}</p>
          </div>

          {savedToken && (
            <div className="mt-5 rounded-xl bg-slate-800/70 p-4">
              <p className="text-xs uppercase tracking-wide text-slate-400">
                Token saved
              </p>
              <p className="mt-2 break-all text-xs text-slate-300">
                {savedToken}
              </p>
            </div>
          )}
        </div>
      </div>
    </main>
  )
}