importScripts("https://www.gstatic.com/firebasejs/10.13.2/firebase-app-compat.js")
importScripts("https://www.gstatic.com/firebasejs/10.13.2/firebase-messaging-compat.js")

firebase.initializeApp({
  apiKey: "AIzaSyAhaAy_p8qRxmHEH8VhLn438dQ9cDXCMf0",
  authDomain: "take-care-18dca.firebaseapp.com",
  projectId: "take-care-18dca",
  storageBucket: "take-care-18dca.firebasestorage.app",
  messagingSenderId: "548382735543",
  appId: "1:548382735543:web:17f404551b38667d07e132",
  measurementId: "G-G74QC00J4F",
})

const messaging = firebase.messaging()

messaging.onBackgroundMessage((payload) => {
  const notificationTitle = payload.notification?.title || "Care Notification"
  const notificationOptions = {
    body: payload.notification?.body || "You have a new alert.",
    icon: "/icon-192.png",
  }

  self.registration.showNotification(notificationTitle, notificationOptions)
})