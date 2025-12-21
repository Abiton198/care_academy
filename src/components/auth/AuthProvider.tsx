"use client";

import { onAuthStateChanged, User as FirebaseUser } from "firebase/auth";
import { auth, db } from "@/lib/firebaseConfig";
import {
  doc,
  getDoc,
  setDoc,
  serverTimestamp,
} from "firebase/firestore";
import React, { createContext, useContext, useEffect, useState } from "react";

/* ======================================================
   Types
   ====================================================== */

interface AppUser {
  uid: string;
  email: string | null;
  role: "parent" | "teacher" | "principal" | "admin";
}

interface AuthContextType {
  user: AppUser | null;
  loading: boolean;
}

/* ======================================================
   Context
   ====================================================== */

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
});

/* ======================================================
   Provider
   ====================================================== */

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser: FirebaseUser | null) => {
      if (!firebaseUser) {
        // User signed out
        setUser(null);
        setLoading(false);
        return;
      }

      try {
        const userRef = doc(db, "users", firebaseUser.uid);
        const userSnap = await getDoc(userRef);

        /* ======================================================
           CASE 1: Existing user → normal sign-in
           ====================================================== */
        if (userSnap.exists()) {
          const data = userSnap.data();
          const role = data.role;

          if (["parent", "teacher", "principal", "admin"].includes(role)) {
            setUser({
              uid: firebaseUser.uid,
              email: firebaseUser.email,
              role,
            });
          } else {
            console.warn("Unauthorized role detected:", role);
            setUser(null);
          }
        }

        /* ======================================================
           CASE 2: New user → auto-provision (SIGN-UP)
           ====================================================== */
        else {
          console.info("No user doc found. Creating default parent profile…");

          // Create base user record
          await setDoc(userRef, {
            uid: firebaseUser.uid,
            email: firebaseUser.email,
            role: "parent",              // ✅ default role
            createdAt: serverTimestamp(),
          });

          setUser({
            uid: firebaseUser.uid,
            email: firebaseUser.email,
            role: "parent",
          });
        }
      } catch (err) {
        console.error("Auth provider error:", err);
        setUser(null);
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

/* ======================================================
   Hook
   ====================================================== */

export const useAuth = () => useContext(AuthContext);
