import * as admin from "firebase-admin";
import { FieldValue } from "firebase-admin/firestore";

// 🔑 Path to your service account key
const serviceAccount = require("../serviceAccountKey.json");

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

async function makeAdmin() {
  try {
    // 👉 Replace this with the UID of the user you want to promote
    const uid = "OqmagRcVt1OG51TuQdpQIMoqlQY2";

    // 1. Set custom claim
    await admin.auth().setCustomUserClaims(uid, { role: "admin" });
    console.log(`✅ User ${uid} is now an admin via custom claims`);

    // 2. Fetch user record for email + verification
    const user = await admin.auth().getUser(uid);

    // 3. Create/update Firestore profile
    await admin.firestore().collection("admins").doc(uid).set(
      {
        uid,
        email: user.email,
        role: "admin",
        createdAt: FieldValue.serverTimestamp(),
      },
      { merge: true }
    );
    console.log(`✅ Firestore profile created/updated for admin ${uid}`);

    // 4. Verify claims
    console.log("Custom claims now:", user.customClaims);
  } catch (err) {
    console.error("❌ Error setting admin role:", err);
  }
}

makeAdmin();
