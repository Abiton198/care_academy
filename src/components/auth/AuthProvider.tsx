"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { auth, db } from "@/lib/firebaseConfig";
import { doc, getDoc } from "firebase/firestore";

/* ============================================================
   TYPES
============================================================ */
export type UserRole = "parent" | "teacher" | "principal" | "admin" | "student";

export interface AppUser {
  uid: string;
  email: string | null;
  role: UserRole;
  applicationStatus?: "pending" | "approved" | "rejected";
  classActivated?: boolean;
  firstName?: string;
  lastName?: string;
  grade?: string;      
  parentName?: string; 
}

/* ============================================================
   CONTEXT INTERFACE
============================================================ */
interface AuthContextType {
  user: AppUser | null;
  loading: boolean;
  logoutStudent: () => void;
  logoutParent: () => Promise<void>;
  logoutAll: () => Promise<void>;
}

// Initialize with defaults that match the Interface
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
            lastName: studentData.lastName || "",
          });
        } catch (e) {
          console.error("Invalid student session", e);
          localStorage.removeItem("studentSession");
          setUser(null);
        }
      } else {
        setUser(null);
      }

      setLoading(false);
    });

    return () => unsub();
  }, []);

  /* ============================================================
     TARGETED LOGOUT HANDLERS
  ============================================================ */

  // 1. Logs out ONLY the Student (keeps Parent/Firebase active)
  const logoutStudent = () => {
    localStorage.removeItem("studentSession");
    // If current user is a student, clear state and redirect
    if (user?.role === "student") {
      setUser(null);
      window.location.href = "/"; 
    }
  };

  // 2. Logs out ONLY the Parent/Admin/Teacher (Firebase Auth)
  const logoutParent = async () => {
    try {
      await signOut(auth);
      // We do NOT touch studentSession localStorage here
      if (user?.role !== "student") {
        setUser(null);
      }
      window.location.href = "/";
    } catch (error) {
      console.error("Parent logout failed:", error);
    }
  };

  // 3. Global Logout (Logs out of everything)
  const logoutAll = async () => {
    localStorage.removeItem("studentSession");
    try {
      await signOut(auth);
    } catch (err) {
      console.error("SignOut error:", err);
    }
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
        logoutAll
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