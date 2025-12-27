"use client";

import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";

/* 🔥 Firebase Core */
import { auth, db } from "@/lib/firebaseConfig";

/* 🔐 Firebase Auth */
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

/* 🧾 Firestore */
import {
  doc,
  getDoc,
  setDoc,
  serverTimestamp,
} from "firebase/firestore";

/* =====================================================
   🚪 LOGIN FORM
   - Prevents double auth
   - Prevents double navigation
   - Prevents duplicate Firestore writes
===================================================== */
export default function LoginForm() {
  const navigate = useNavigate();

  /* =====================================================
     🧠 AUTH FLOW GUARDS (CRITICAL)
  ===================================================== */

  // Prevents multiple login attempts at once
  const [authInProgress, setAuthInProgress] = useState(false);

  // Hard lock: ensures dashboard navigation happens ONLY ONCE
  const hasNavigatedRef = useRef(false);

  /* =====================================================
     📌 FORM STATE
  ===================================================== */
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [confirmation, setConfirmation] = useState<any>(null);

  const [role, setRole] = useState<string | null>(null);
  const [accountExists, setAccountExists] = useState<boolean | null>(null);
  const [method, setMethod] = useState<"email" | "phone">("email");

  /* =====================================================
     🔐 INVISIBLE RECAPTCHA (PHONE AUTH)
     - Initialized ONCE
  ===================================================== */
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
     - Determines Sign In vs Sign Up
  ===================================================== */
  const checkEmail = async (email: string) => {
    if (!email) return;

    const methods = await fetchSignInMethodsForEmail(auth, email);
    setAccountExists(methods.length > 0);
  };

  /* =====================================================
     📧 EMAIL AUTH (Sign In / Sign Up)
  ===================================================== */
  const handleEmail = async () => {
    if (!role) return alert("Select role");
    if (authInProgress) return;

    try {
      setAuthInProgress(true);

      const userCred = accountExists
        ? await signInWithEmailAndPassword(auth, email, password)
        : await createUserWithEmailAndPassword(auth, email, password);

      await postAuth(userCred.user);
    } catch (err) {
      console.error(err);
      alert("Authentication failed");
    } finally {
      setAuthInProgress(false);
    }
  };

  /* =====================================================
     📱 PHONE AUTH
  ===================================================== */
  const sendOtp = async () => {
    if (!phone || authInProgress) return;

    const appVerifier = (window as any).recaptchaVerifier;
    const result = await signInWithPhoneNumber(auth, phone, appVerifier);
    setConfirmation(result);
  };

  const verifyOtp = async () => {
    if (!confirmation || authInProgress) return;

    try {
      setAuthInProgress(true);

      const credential = PhoneAuthProvider.credential(
        confirmation.verificationId,
        otp
      );

      const userCred = await auth.signInWithCredential(credential);
      await postAuth(userCred.user);
    } finally {
      setAuthInProgress(false);
    }
  };

  /* =====================================================
     🌐 GOOGLE AUTH
  ===================================================== */
  const handleGoogle = async () => {
    if (!role) return alert("Select role");
    if (authInProgress) return;

    try {
      setAuthInProgress(true);

      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);

      await postAuth(result.user);
    } catch (err: any) {
      // Safe to ignore — occurs when popup is closed or duplicated
      if (err.code !== "auth/cancelled-popup-request") {
        console.error(err);
      }
    } finally {
      setAuthInProgress(false);
    }
  };

  /* =====================================================
     🔁 POST-AUTH LOGIC (MOST IMPORTANT)
     - Creates Firestore user doc ONCE
     - Navigates to dashboard ONCE
  ===================================================== */
  const postAuth = async (user: any) => {
    // 🚫 Prevent duplicate navigation
    if (hasNavigatedRef.current) return;
    hasNavigatedRef.current = true;

    const userRef = doc(db, "users", user.uid);
    const snap = await getDoc(userRef);

    // 🆕 Create user document only on first signup
    if (!snap.exists()) {
      await setDoc(userRef, {
        uid: user.uid,
        role,
        email: user.email ?? null,
        phone: user.phoneNumber ?? null,

        // Teacher application gate
        applicationStatus:
          role === "teacher" ? "not_submitted" : null,

        createdAt: serverTimestamp(),
      });
    }

    // ✅ Navigate exactly once
    navigate(`/${role}-dashboard`, { replace: true });
  };

  /* =====================================================
     🎨 UI
  ===================================================== */
  return (
    <div className="max-w-md mx-auto p-6">
      <div id="recaptcha-container" />

      {/* ROLE SELECTION */}
      <div className="flex gap-2 justify-center mb-4">
        {["student", "teacher", "parent", "principal"].map((r) => (
          <button
            key={r}
            onClick={() => setRole(r)}
            disabled={authInProgress}
            className={`px-3 py-1 rounded ${
              role === r ? "bg-blue-600 text-white" : "bg-gray-200"
            }`}
          >
            {r}
          </button>
        ))}
      </div>

      {/* AUTH METHOD */}
      <div className="flex gap-2 justify-center mb-4">
        <button onClick={() => setMethod("email")}>Email</button>
        <button onClick={() => setMethod("phone")}>Phone</button>
      </div>

      {/* EMAIL AUTH */}
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
              disabled={authInProgress}
              className="w-full bg-blue-600 text-white py-2 disabled:opacity-50"
            >
              {authInProgress
                ? "Signing in..."
                : accountExists
                ? "Sign In"
                : "Sign Up"}
            </button>
          )}
        </>
      )}

      {/* PHONE AUTH */}
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
              disabled={authInProgress}
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
                disabled={authInProgress}
                className="w-full bg-green-600 text-white py-2"
              >
                Verify
              </button>
            </>
          )}
        </>
      )}

      {/* GOOGLE AUTH */}
      <div className="mt-4">
        <button
          onClick={handleGoogle}
          disabled={authInProgress}
          className="w-full bg-red-500 text-white py-2 disabled:opacity-50"
        >
          {authInProgress ? "Signing in..." : "Continue with Google"}
        </button>
      </div>
    </div>
  );
}
