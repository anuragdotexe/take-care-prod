const admin = require("firebase-admin")
const serviceAccount = require("../serviceAccountKey.json")

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
})

const db = admin.firestore()

async function getAllTokens() {
  const snapshot = await db.collection("deviceTokens").get()

  if (snapshot.empty) return { tokens: [], tokenDocs: [] }

  const tokens = []
  const tokenDocs = []

  snapshot.forEach((doc) => {
    const data = doc.data()
    if (data.token) {
      tokens.push(data.token)
      tokenDocs.push({ id: doc.id, token: data.token })
    }
  })

  return { tokens, tokenDocs }
}

async function sendToTokens(tokens, tokenDocs, title, body) {
  if (!tokens.length) {
    console.log("No tokens found.")
    return { successCount: 0, failureCount: 0 }
  }

  const message = {
    notification: {
      title,
      body,
    },
    webpush: {
      notification: {
        icon: "/icon-192.png",
      },
    },
    tokens,
  }

  const response = await admin.messaging().sendEachForMulticast(message)

  console.log(`Sent: ${response.successCount}`)
  console.log(`Failed: ${response.failureCount}`)

  const invalidDocIds = []

  response.responses.forEach((resp, index) => {
    if (!resp.success) {
      console.log(`Failed token: ${tokens[index]}`)
      console.log(resp.error?.message)

      const errorCode = resp.error?.code || ""
      if (
        errorCode.includes("registration-token-not-registered") ||
        errorCode.includes("invalid-argument")
      ) {
        invalidDocIds.push(tokenDocs[index].id)
      }
    }
  })

  for (const docId of invalidDocIds) {
    await db.collection("deviceTokens").doc(docId).delete()
    console.log(`Deleted invalid token doc: ${docId}`)
  }

  return {
    successCount: response.successCount,
    failureCount: response.failureCount,
  }
}

async function processScheduledNotifications() {
  try {
    const now = new Date().toISOString()

    const snapshot = await db
      .collection("notifications")
      .where("type", "==", "scheduled")
      .where("status", "==", "pending")
      .where("scheduledFor", "<=", now)
      .get()

    if (snapshot.empty) {
      console.log("No scheduled notifications due right now.")
      return
    }

    const { tokens, tokenDocs } = await getAllTokens()

    for (const doc of snapshot.docs) {
      const data = doc.data()

      try {
        const result = await sendToTokens(
          tokens,
          tokenDocs,
          data.title,
          data.body
        )

        await doc.ref.update({
          status: "sent",
          sentAt: new Date().toISOString(),
          successCount: result.successCount,
          failureCount: result.failureCount,
        })

        console.log(`Notification sent for doc: ${doc.id}`)
      } catch (error) {
        console.error(`Failed for doc: ${doc.id}`, error)

        await doc.ref.update({
          status: "failed",
          failedAt: new Date().toISOString(),
        })
      }
    }
  } catch (error) {
    console.error("Scheduler script failed:", error)
  }
}

processScheduledNotifications()