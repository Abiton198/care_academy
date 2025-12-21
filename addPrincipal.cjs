// addPrincipal.js
const admin = require("firebase-admin");
const serviceAccount = require("./serviceAccountKey.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

async function addPrincipal(email) {
  try {
    await db.collection("principal_emails").doc(email.toLowerCase()).set({
      email: email.toLowerCase(),
      role: "principal",
      active: true,
      createdAt: new Date(),
    });
    console.log("Principal added:", email);
  } catch (err) {
    console.error("Error adding principal:", err);
  }
}

//  principal email
addPrincipal("nextgenskills96@gmail.com");
