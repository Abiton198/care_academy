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
      if (!firebaseUser) {
        setUser(null);
        setLoading(false);
        return;
      }

      const uid = firebaseUser.uid;
      const email = firebaseUser.email?.toLowerCase() || null;

      try {
        /* ====================================================
           1. CHECK TEACHER FIRST
        ==================================================== */
        const teacherRef = doc(db, "teachers", uid);
        const teacherSnap = await getDoc(teacherRef);

        if (teacherSnap.exists()) {
          const data = teacherSnap.data();
          setUser({
            uid,
            email,
            role: "teacher",
            applicationStatus: data.applicationStatus,
            classActivated: data.classActivated,
          });
          setLoading(false);
          return;
        }

        /* ====================================================
           2. CHECK PRINCIPAL
        ==================================================== */
        const principalRef = doc(db, "principals", uid);
        const principalSnap = await getDoc(principalRef);

        if (principalSnap.exists()) {
          setUser({ uid, email, role: "principal" });
          setLoading(false);
          return;
        }

        /* ====================================================
           3. CHECK ADMIN
        ==================================================== */
        const adminRef = doc(db, "admins", uid);
        const adminSnap = await getDoc(adminRef);

        if (adminSnap.exists()) {
          setUser({ uid, email, role: "admin" });
          setLoading(false);
          return;
        }

        /* ====================================================
           4. CHECK GENERIC USER
        ==================================================== */
        const userRef = doc(db, "users", uid);
        const userSnap = await getDoc(userRef);

        if (userSnap.exists()) {
          const data = userSnap.data();
          setUser({ uid, email, role: data.role || "parent" });
          setLoading(false);
          return;
        }

        /* ====================================================
           5. BRAND NEW USER → DEFAULT PARENT
        ==================================================== */
        await setDoc(userRef, { uid, email, role: "parent", createdAt: serverTimestamp() });
        setUser({ uid, email, role: "parent" });
      } catch (error) {
        console.error("AuthProvider error:", error);
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
