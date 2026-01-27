"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { auth, db } from "@/lib/firebaseConfig";
import { doc, getDoc } from "firebase/firestore";

/* ============================================================
   TYPES
============================================================ */
export type UserRole =
  | "parent"
  | "teacher"
  | "principal"
  | "admin"
  | "student";

export interface AppUser {
  uid: string;
  email?: string | null;
  role: UserRole;
  firstName?: string;
  lastName?: string;
  grade?: string;
  parentName?: string;
  parentId?: string;
}

/* ============================================================
   CONTEXT
============================================================ */
interface AuthContextType {
  user: AppUser | null;
  loading: boolean;
  logoutStudent: () => void;
  logoutParent: () => Promise<void>;
  logoutAll: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  logoutStudent: () => {},
  logoutParent: async () => {},
  logoutAll: async () => {},
});

/* ============================================================
   PROVIDER
============================================================ */
export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      setLoading(true);

      /* ===============================
         1️⃣ STUDENT SESSION (NO FIREBASE)
      =============================== */
      const studentSessionRaw = sessionStorage.getItem("studentSession");

      if (!firebaseUser && studentSessionRaw) {
        try {
          const studentData = JSON.parse(studentSessionRaw);

          let parentName = studentData.parentName;

          if (studentData.parentId && !parentName) {
            const parentDoc = await getDoc(
              doc(db, "users", studentData.parentId)
            );
            if (parentDoc.exists()) {
              const p = parentDoc.data();
              parentName =
                `${p.firstName || ""} ${p.lastName || ""}`.trim() || "Parent";
              studentData.parentName = parentName;
              sessionStorage.setItem(
                "studentSession",
                JSON.stringify(studentData)
              );
            }
          }

          setUser({
            uid: studentData.uid,
            role: "student",
            firstName: studentData.firstName || "Student",
            lastName: studentData.lastName || "",
            parentName,
            parentId: studentData.parentId,
          });
        } catch (e) {
          console.error("Student session error:", e);
          sessionStorage.removeItem("studentSession");
        }

        setLoading(false);
        return;
      }

      /* ===============================
         2️⃣ FIREBASE USERS (PARENT/STAFF)
      =============================== */
      if (firebaseUser) {
        try {
          const snap = await getDoc(doc(db, "users", firebaseUser.uid));
          if (snap.exists()) {
            const data = snap.data();

            setUser({
              uid: firebaseUser.uid,
              email: firebaseUser.email,
              role: data.role,
              firstName: data.firstName || "",
              lastName: data.lastName || "",
            });
          } else {
            await signOut(auth);
            setUser(null);
          }
        } catch (err) {
          console.error("Auth sync failed:", err);
          setUser(null);
        }

        setLoading(false);
        return;
      }

      /* ===============================
         3️⃣ NO SESSION
      =============================== */
      setUser(null);
      setLoading(false);
    });

    return () => unsub();
  }, []);

  /* ============================================================
     LOGOUTS
  ============================================================ */

  const logoutStudent = () => {
    sessionStorage.removeItem("studentSession");
    setUser(null);
    window.location.href = "/";
  };

  const logoutParent = async () => {
    sessionStorage.removeItem("studentSession");
    await signOut(auth); // 🔑 REQUIRED
    setUser(null);
    window.location.href = "/";
  };

  const logoutAll = async () => {
    sessionStorage.clear();
    await signOut(auth);
    setUser(null);
    window.location.href = "/";
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        logoutStudent,
        logoutParent,
        logoutAll,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

/* ============================================================
   HOOK
============================================================ */
export const useAuth = () => useContext(AuthContext);
