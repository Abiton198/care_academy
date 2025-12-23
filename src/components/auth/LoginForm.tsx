"use client";

import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { auth, db } from "@/lib/firebaseConfig";

/* Firebase Auth */
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  fetchSignInMethodsForEmail,
  RecaptchaVerifier,
  signInWithPhoneNumber,
  PhoneAuthProvider,
} from "firebase/auth";

/* Firestore */
import {
  doc,
  getDoc,
  setDoc,
  serverTimestamp,
} from "firebase/firestore";

export default function LoginForm() {
  const navigate = useNavigate();

  /* ---------------- STATE ---------------- */
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [confirmation, setConfirmation] = useState<any>(null);

  const [role, setRole] = useState<string | null>(null);
  const [accountExists, setAccountExists] = useState<boolean | null>(null);
  const [method, setMethod] = useState<"email" | "phone">("email");

  /* ---------------- INVISIBLE RECAPTCHA ---------------- */
  useEffect(() => {
    if (!(window as any).recaptchaVerifier) {
      (window as any).recaptchaVerifier = new RecaptchaVerifier(
        auth,
        "recaptcha-container",
        { size: "invisible" }
      );
    }
  }, []);

  /* =====================================================
     📧 CHECK EMAIL REGISTRATION STATUS
  ===================================================== */
  const checkEmail = async (email: string) => {
    if (!email) return;
    const methods = await fetchSignInMethodsForEmail(auth, email);
    setAccountExists(methods.length > 0);
  };

  /* =====================================================
     📧 EMAIL AUTH
  ===================================================== */
  const handleEmail = async () => {
    if (!role) return alert("Select role");

    try {
      const userCred = accountExists
        ? await signInWithEmailAndPassword(auth, email, password)
        : await createUserWithEmailAndPassword(auth, email, password);

      await postAuth(userCred.user);
    } catch (err) {
      console.error(err);
      alert("Authentication failed");
    }
  };

  /* =====================================================
     📱 PHONE AUTH
  ===================================================== */
  const sendOtp = async () => {
    if (!phone) return alert("Enter phone");

    const appVerifier = (window as any).recaptchaVerifier;
    const result = await signInWithPhoneNumber(auth, phone, appVerifier);
    setConfirmation(result);
  };

  const verifyOtp = async () => {
    if (!confirmation) return;

    const credential = PhoneAuthProvider.credential(
      confirmation.verificationId,
      otp
    );

    const userCred = await auth.signInWithCredential(credential);
    await postAuth(userCred.user);
  };

  /* =====================================================
     🌐 GOOGLE AUTH
  ===================================================== */
  const handleGoogle = async () => {
    if (!role) return alert("Select role");

    const provider = new GoogleAuthProvider();
    const result = await signInWithPopup(auth, provider);
    await postAuth(result.user);
  };

  /* =====================================================
     🔁 POST AUTH LOGIC (IMPORTANT PART)
  ===================================================== */
  const postAuth = async (user: any) => {
    const userRef = doc(db, "users", user.uid);
    const snap = await getDoc(userRef);

    // CREATE USER DOC ON FIRST SIGNUP ONLY
    if (!snap.exists()) {
      await setDoc(userRef, {
        uid: user.uid,
        role,
        email: user.email ?? null,
        phone: user.phoneNumber ?? null,

        // 🔑 Teacher application control
        applicationStatus:
          role === "teacher" ? "not_submitted" : null,

        createdAt: serverTimestamp(),
      });
    }

    // ALWAYS route by selected role
    navigate(`/${role}-dashboard`);
  };

  /* =====================================================
     🧩 UI
  ===================================================== */
  return (
    <div className="max-w-md mx-auto p-6">
      <div id="recaptcha-container" />

      {/* ROLE */}
      <div className="flex gap-2 justify-center mb-4">
        {["student", "teacher", "parent", "principal"].map((r) => (
          <button
            key={r}
            onClick={() => setRole(r)}
            className={`px-3 py-1 rounded ${
              role === r ? "bg-blue-600 text-white" : "bg-gray-200"
            }`}
          >
            {r}
          </button>
        ))}
      </div>

      {/* METHOD */}
      <div className="flex gap-2 justify-center mb-4">
        <button onClick={() => setMethod("email")}>Email</button>
        <button onClick={() => setMethod("phone")}>Phone</button>
      </div>

      {/* EMAIL */}
      {method === "email" && (
        <>
          <input
            type="email"
            placeholder="Email"
            className="w-full border p-2 mb-2"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              checkEmail(e.target.value);
            }}
          />

          {accountExists !== null && (
            <input
              type="password"
              placeholder={accountExists ? "Enter password" : "Create password"}
              className="w-full border p-2 mb-2"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          )}

          {accountExists !== null && (
            <button
              onClick={handleEmail}
              className="w-full bg-blue-600 text-white py-2"
            >
              {accountExists ? "Sign In" : "Sign Up"}
            </button>
          )}
        </>
      )}

      {/* PHONE */}
      {method === "phone" && (
        <>
          <input
            type="tel"
            placeholder="+27831234567"
            className="w-full border p-2 mb-2"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />

          {!confirmation ? (
            <button
              onClick={sendOtp}
              className="w-full bg-blue-600 text-white py-2"
            >
              Continue
            </button>
          ) : (
            <>
              <input
                placeholder="OTP"
                className="w-full border p-2 mb-2"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
              />
              <button
                onClick={verifyOtp}
                className="w-full bg-green-600 text-white py-2"
              >
                Verify
              </button>
            </>
          )}
        </>
      )}

      {/* GOOGLE */}
      <div className="mt-4">
        <button
          onClick={handleGoogle}
          className="w-full bg-red-500 text-white py-2"
        >
          Continue with Google
        </button>
      </div>
    </div>
  );
}
