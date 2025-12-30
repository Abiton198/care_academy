"use client";

import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";

import { auth, db } from "@/lib/firebaseConfig";
import { signOut } from "firebase/auth";
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

import {
  doc,
  getDoc,
  setDoc,
  serverTimestamp,
} from "firebase/firestore";

export default function LoginForm() {
  const navigate = useNavigate();

  /* =========================
     AUTH GUARDS
  ========================= */
  const [authInProgress, setAuthInProgress] = useState(false);
  const hasNavigatedRef = useRef(false);

  /* =========================
     FORM STATE
  ========================= */
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [confirmation, setConfirmation] = useState<any>(null);

  const [role, setRole] = useState<string | null>(null);
  const [accountExists, setAccountExists] = useState<boolean | null>(null);
  const [method, setMethod] = useState<"email" | "phone">("email");

  /* =========================
     RECAPTCHA
  ========================= */
  useEffect(() => {
    if (!(window as any).recaptchaVerifier) {
      (window as any).recaptchaVerifier = new RecaptchaVerifier(
        auth,
        "recaptcha-container",
        { size: "invisible" }
      );
    }
  }, []);

  /* =========================
     CHECK EMAIL
  ========================= */
  const checkEmail = async (email: string) => {
    if (!email) return;
    const methods = await fetchSignInMethodsForEmail(auth, email);
    setAccountExists(methods.length > 0);
  };

  /* =========================
     EMAIL AUTH
  ========================= */
  const handleEmail = async () => {
    if (authInProgress) return;

    if (accountExists === false && !role) {
      alert("Select role to continue");
      return;
    }

    try {
      setAuthInProgress(true);

      const cred = accountExists
        ? await signInWithEmailAndPassword(auth, email, password)
        : await createUserWithEmailAndPassword(auth, email, password);

      await postAuth(cred.user);
    } catch (err) {
      console.error(err);
      alert("Authentication failed");
    } finally {
      setAuthInProgress(false);
    }
  };

  /* =========================
     GOOGLE AUTH
  ========================= */
  const handleGoogle = async () => {
    if (authInProgress) return;

    if (accountExists === false && !role) {
      alert("Select role to continue");
      return;
    }

    try {
      setAuthInProgress(true);
      const result = await signInWithPopup(auth, new GoogleAuthProvider());
      await postAuth(result.user);
    } catch (err: any) {
      if (err.code !== "auth/cancelled-popup-request") {
        console.error(err);
      }
    } finally {
      setAuthInProgress(false);
    }
  };

  /* =========================
     PHONE AUTH
  ========================= */
  const sendOtp = async () => {
    if (!phone || authInProgress) return;
    const appVerifier = (window as any).recaptchaVerifier;
    const result = await signInWithPhoneNumber(auth, phone, appVerifier);
    setConfirmation(result);
  };

  const verifyOtp = async () => {
    if (!confirmation || authInProgress) return;

    if (!role) {
      alert("Select role to continue");
      return;
    }

    try {
      setAuthInProgress(true);
      const cred = PhoneAuthProvider.credential(
        confirmation.verificationId,
        otp
      );
      const userCred = await auth.signInWithCredential(cred);
      await postAuth(userCred.user);
    } finally {
      setAuthInProgress(false);
    }
  };

  /* =========================
     POST AUTH (CORE FIX)
  ========================= */
  const postAuth = async (user: any) => {
    if (hasNavigatedRef.current) return;
    hasNavigatedRef.current = true;

    const userRef = doc(db, "users", user.uid);
    const snap = await getDoc(userRef);

    let finalRole: string;

    if (snap.exists()) {
      finalRole = snap.data().role;
    } else {
      finalRole = role!;
      await setDoc(userRef, {
        uid: user.uid,
        role: finalRole,
        email: user.email ?? null,
        phone: user.phoneNumber ?? null,
        applicationStatus:
          finalRole === "teacher" ? "not_submitted" : null,
        createdAt: serverTimestamp(),
      });
    }

    navigate(`/${finalRole}-dashboard`, { replace: true });
  };

  /* =========================
     CONTINUE TO DASHBOARD
  ========================= */
  
  const continueToDashboard = async () => {
  if (!auth.currentUser) return;

  const userRef = doc(db, "users", auth.currentUser.uid);
  const snap = await getDoc(userRef);

  if (!snap.exists()) {
    alert("User profile not found");
    return;
  }

  const userRole = snap.data().role;

  if (!userRole) {
    alert("User role missing");
    return;
  }

  navigate(`/${userRole}-dashboard`, { replace: true });
};


  /* =========================
     UI
  ========================= */
  return (
    <div className="max-w-md mx-auto p-6 relative">
      <div id="recaptcha-container" />

    <div className="flex justify-between items-center mb-4">
        {/* ← Cancel */}
        <button
          onClick={async () => {
            await signOut(auth);
            navigate("/", { replace: true });
          }}
          disabled={authInProgress}
          className="flex items-center gap-1 text-sm text-gray-600 hover:text-black"
        >
          ← Cancel
        </button>

        {/* Continue → */}
        <button
          onClick={continueToDashboard}
          disabled={authInProgress}
          className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800 font-medium"
        >
          Continue →
        </button>
</div>



      <h2 className="text-xl font-bold text-center mb-4">
        Sign in to your account
      </h2>

      {/* ROLE — ONLY FOR NEW USERS */}
      {accountExists === false && (
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
      )}

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
              placeholder="Password"
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
