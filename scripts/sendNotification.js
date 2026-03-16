const admin = require("firebase-admin")
const serviceAccount = require("../serviceAccountKey.json")

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
})

const db = admin.firestore()

async function sendBroadcastNotification() {
  try {
    const snapshot = await db.collection("deviceTokens").get()

    if (snapshot.empty) {
      console.log("No device tokens found.")
      return
    }

    const tokens = []
    const tokenDocs = []

    snapshot.forEach((doc) => {
      const data = doc.data()
      if (data.token) {
        tokens.push(data.token)
        tokenDocs.push({ id: doc.id, token: data.token })
      }
    })

    if (tokens.length === 0) {
      console.log("No valid tokens found.")
      return
    }

    const message = {
      notification: {
        title: "Care Alert",
        body: "This is a broadcast test notification.",
      },
      webpush: {
        notification: {
          icon: "/icon-192.png",
        },
      },
      tokens,
    }

    const response = await admin.messaging().sendEachForMulticast(message)

    console.log(`Successfully sent: ${response.successCount}`)
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
  } catch (error) {
    console.error("Error sending broadcast notification:", error)
  }
}

sendBroadcastNotification()