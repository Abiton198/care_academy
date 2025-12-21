import { Handler } from "@netlify/functions";
import * as admin from "firebase-admin";

/**
 * Initialize Firebase Admin once
 */
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(
      JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY as string)
    ),
  });
}

const db = admin.firestore();

/**
 * PayFast ITN handler
 * - Expects application/x-www-form-urlencoded body from PayFast
 * - Stores the payment under: students/{studentId}/payments/{pf_payment_id}
 * - Updates quick summary fields on students/{studentId}
 */
export const handler: Handler = async (event) => {
  try {
    if (event.httpMethod !== "POST") {
      return { statusCode: 405, body: "Method Not Allowed" };
    }

    // Parse the ITN POST body
    const params = new URLSearchParams(event.body || "");

    // Map of common PayFast fields (subset)
    const pf = Object.fromEntries(params.entries());
    const studentId = params.get("m_payment_id") || "";         // we send student doc id here
    const pfPaymentId = params.get("pf_payment_id") || "";      // PayFast's unique payment id
    const paymentStatus = params.get("payment_status") || "";   // e.g. COMPLETE, FAILED
    const amountGross = params.get("amount_gross") || "0.00";
    const itemName = params.get("item_name") || "";             // contains "Student - Grade | PURPOSE"
    const nameFirst = params.get("name_first") || "";
    const payerEmail = params.get("email_address") || "";

    if (!studentId) {
      console.warn("⚠️ Missing m_payment_id (studentId) in ITN payload.");
      return { statusCode: 400, body: "Missing studentId (m_payment_id)" };
    }

    if (!pfPaymentId) {
      console.warn("⚠️ Missing pf_payment_id in ITN payload.");
      // We still proceed but generate a doc id to avoid losing the event
    }

    // (Optional) Signature verification / source validation:
    // For production, you should validate:
    // 1) signature (MD5 with passphrase)
    // 2) that POST comes from PayFast
    // 3) data validation (amount/item_name)
    // Skipped here for simplicity. Add when you’re ready to harden.

    // References
    const studentRef = db.collection("students").doc(studentId);
    const studentSnap = await studentRef.get();

    if (!studentSnap.exists) {
      console.warn(`⚠️ Student not found for ID: ${studentId}`);
      // You can choose to still log this to a dead-letter collection:
      // await db.collection("unmapped_payments").add({ pf, createdAt: admin.firestore.FieldValue.serverTimestamp() });
      return { statusCode: 404, body: "Student not found" };
    }

    // Write payment (idempotent on pfPaymentId when present)
    const paymentDocId = pfPaymentId || db.collection("_").doc().id;
    const paymentRef = studentRef.collection("payments").doc(paymentDocId);

    await paymentRef.set(
      {
        pfPaymentId: pfPaymentId || null,
        paymentStatus,
        amount: amountGross,
        itemName,
        payerName: nameFirst || null,
        payerEmail: payerEmail || null,
        raw: pf, // full ITN payload for audit
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true }
    );

    // Update quick summary fields on the student
    await studentRef.set(
      {
        lastPaymentAt: admin.firestore.FieldValue.serverTimestamp(),
        lastPaymentStatus: paymentStatus,
        lastPaymentAmount: amountGross,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true }
    );

    console.log(
      `✅ ITN stored for studentId=${studentId}, pfPaymentId=${paymentDocId}, status=${paymentStatus}, amount=${amountGross}`
    );

    // Important: return 200 quickly so PayFast doesn't retry
    return { statusCode: 200, body: "OK" };
  } catch (err: any) {
    console.error("❌ payfast-notify error:", err);
    // Return 200 only if you want to suppress PayFast retries on server errors.
    // Generally better to return 500 so PayFast retries if your DB was momentarily unavailable.
    return { statusCode: 500, body: "Server error" };
  }
};
