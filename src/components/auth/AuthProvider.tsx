"use client";

import { onAuthStateChanged } from "firebase/auth";
import { auth, db } from "@/lib/firebaseConfig";
import {
  doc,
  getDoc,
  setDoc,
  serverTimestamp,
} from "firebase/firestore";
import React, { createContext, useContext, useEffect, useState } from "react";

interface AppUser {
  uid: string;
  email: string | null;
  role: "parent" | "teacher" | "principal" | "admin";
}

const AuthContext = createContext<{ user: AppUser | null; loading: boolean }>({
  user: null,
  loading: true,
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    return onAuthStateChanged(auth, async (firebaseUser) => {
      if (!firebaseUser) {
        setUser(null);
        setLoading(false);
        return;
      }

      try {
        const email = firebaseUser.email?.toLowerCase() || null;
        const userRef = doc(db, "users", firebaseUser.uid);
        const userSnap = await getDoc(userRef);

        // =============================
        // Existing user → normal login
        // =============================
        if (userSnap.exists()) {
          const data = userSnap.data();
          setUser({
            uid: firebaseUser.uid,
            email,
            role: data.role,
          });
          return;
        }

        // =============================
        // New user → check principal allowlist
        // =============================
        let role: AppUser["role"] = "parent";

        if (email) {
          const principalRef = doc(db, "principal_emails", email);
          const principalSnap = await getDoc(principalRef);

          if (principalSnap.exists() && principalSnap.data().active === true) {
            role = "principal";
          }
        }

        // =============================
        // Create user document
        // =============================
        await setDoc(userRef, {
          uid: firebaseUser.uid,
          email,
          role,
          createdAt: serverTimestamp(),
        });

        setUser({
          uid: firebaseUser.uid,
          email,
          role,
        });
      } catch (err) {
        console.error("Auth error:", err);
        setUser(null);
      } finally {
        setLoading(false);
      }
    });
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
