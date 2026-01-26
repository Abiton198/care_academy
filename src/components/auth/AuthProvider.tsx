"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { auth, db } from "@/lib/firebaseConfig";
import { doc, getDoc } from "firebase/firestore";

/* ============================================================
   TYPES
============================================================ */
// Added 'student' to the roles
export type UserRole = "parent" | "teacher" | "principal" | "admin" | "student";

export interface AppUser {
  uid: string;
  email: string | null;
  role: UserRole;
  applicationStatus?: "pending" | "approved" | "rejected";
  classActivated?: boolean;
  firstName?: string;
  lastName?: string;
}

/* ============================================================
   CONTEXT
============================================================ */
interface AuthContextType {
  user: AppUser | null;
  loading: boolean;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  logout: async () => {},
});

/* ============================================================
   PROVIDER
============================================================ */
export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);

  /* ============================================================
     AUTH STATE LISTENER (HYBRID LOGIC)
  ============================================================ */
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      setLoading(true);

      // --- PATH A: FIREBASE AUTH (Parents/Teachers/Principals) ---
      if (firebaseUser) {
        try {
          const userDoc = await getDoc(doc(db, "users", firebaseUser.uid));
          if (userDoc.exists()) {
            const data = userDoc.data();
            setUser({
              uid: firebaseUser.uid,
              email: firebaseUser.email,
              role: data.role as UserRole,
              applicationStatus: data.applicationStatus,
              firstName: data.firstName || "",
              lastName: data.lastName || "",
            });
          } else {
            // This handles the gap between Auth creation and Firestore doc creation
            console.log("Waiting for profile creation...");
          }
        } catch (err) {
          console.error("Auth provider error:", err);
        } finally {
          setLoading(false);
        }
        return; 
      }

      // --- PATH B: CUSTOM SESSION (Students) ---
      const studentSession = localStorage.getItem("studentSession");
      if (studentSession) {
        try {
          const studentData = JSON.parse(studentSession);
          setUser({
            uid: studentData.uid,
            email: null,
            role: "student",
            firstName: studentData.firstName || "Student",
            lastName: "",
          });
        } catch (e) {
          console.error("Invalid student session", e);
          localStorage.removeItem("studentSession");
          setUser(null);
        }
      } else {
        // No Firebase user and no Student session
        setUser(null);
      }

      setLoading(false);
    });

    return () => unsub();
  }, []);

  /* ============================================================
     LOGOUT (CLEARS EVERYTHING)
  ============================================================ */
  const logout = async () => {
    try {
      // 1. Sign out of Firebase Auth
      await signOut(auth);
      // 2. Clear Student LocalStorage
      localStorage.removeItem("studentSession");
      // 3. Reset State
      setUser(null);
      // 4. Force Redirect to login
      window.location.href = "/login";
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
   HOOK
============================================================ */
export const useAuth = () => useContext(AuthContext);