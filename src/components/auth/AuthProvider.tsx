"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { auth, db } from "@/lib/firebaseConfig";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";

/* ============================================================
   Types
============================================================ */
export type UserRole = "parent" | "teacher" | "principal" | "admin";

export interface AppUser {
  uid: string;
  email: string | null;
  role: UserRole;
  applicationStatus?: "pending" | "approved" | "rejected";
  classActivated?: boolean;
}

/* ============================================================
   Context
============================================================ */
const AuthContext = createContext<{
  user: AppUser | null;
  loading: boolean;
  logout: () => Promise<void>;
}>({
  user: null,
  loading: true,
  logout: async () => {},
});

/* ============================================================
   Provider
============================================================ */
export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      setLoading(true);
      
      if (!firebaseUser) {
        setUser(null);
        setLoading(false);
        return;
      }

      const uid = firebaseUser.uid;
      const email = firebaseUser.email?.toLowerCase() || null;

      try {
        /* ====================================================
           1. PARALLEL ROLE CHECK
           Checks all possible role collections at once
        ==================================================== */
        const [tSnap, pSnap, aSnap, uSnap] = await Promise.all([
          getDoc(doc(db, "teachers", uid)),
          getDoc(doc(db, "principals", uid)),
          getDoc(doc(db, "admins", uid)),
          getDoc(doc(db, "users", uid))
        ]);

        if (tSnap.exists()) {
          const data = tSnap.data();
          setUser({
            uid,
            email,
            role: "teacher",
            applicationStatus: data.applicationStatus,
            classActivated: data.classActivated,
          });
        } else if (pSnap.exists()) {
          setUser({ uid, email, role: "principal" });
        } else if (aSnap.exists()) {
          setUser({ uid, email, role: "admin" });
        } else if (uSnap.exists()) {
          const data = uSnap.data();
          setUser({ uid, email, role: data.role || "parent" });
        } else {
          /* ====================================================
             2. BRAND NEW USER → DEFAULT TO PARENT
          ==================================================== */
          const newUserRef = doc(db, "users", uid);
          await setDoc(newUserRef, { 
            uid, 
            email, 
            role: "parent", 
            createdAt: serverTimestamp() 
          });
          setUser({ uid, email, role: "parent" });
        }
      } catch (error: any) {
        console.error("AuthProvider Error:", error.message);
        setUser(null);
      } finally {
        setLoading(false);
      }
    });

    return () => unsub();
  }, []);

  /* ============================================================
     Logout function
  ============================================================ */
  const logout = async () => {
    try {
      await signOut(auth);
      setUser(null);
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

/* ============================================================
   Hook
============================================================ */
export const useAuth = () => useContext(AuthContext);