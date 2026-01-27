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

 useEffect(() => {
  const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
    setLoading(true);

    // --- PATH A: FIREBASE AUTH (Parents/Staff) ---
    if (firebaseUser) {
      try {
        const userRef = doc(db, "users", firebaseUser.uid);
        let snap = await getDoc(userRef);

        // Retry guard for brand-new Google registrations
        if (!snap.exists()) {
          await new Promise((resolve) => setTimeout(resolve, 2000));
          snap = await getDoc(userRef);
        }

        if (snap.exists()) {
          const data = snap.data();
          setUser({
            uid: firebaseUser.uid,
            email: firebaseUser.email,
            role: data.role as UserRole,
            applicationStatus: data.applicationStatus,
            // Fallback for naming inconsistencies
            firstName: data.firstName || data.firstname || "",
            lastName: data.lastName || data.lastname || "",
          });
          setLoading(false);
          return;
        }
      } catch (err) {
        console.error("Firebase profile fetch failed:", err);
      }
    }

    // --- PATH B: STUDENT SESSION (Tab-Specific sessionStorage) ---
    // If we reach here, either there's no Firebase user, or the Firebase user has no profile yet.
    const studentSessionRaw = sessionStorage.getItem("studentSession");
    
    if (studentSessionRaw) {
      try {
        const studentData = JSON.parse(studentSessionRaw);
        
        setUser({
          uid: studentData.uid,
          email: null,
          role: "student",
          // Maps names exactly as saved in handleStudentLogin
          firstName: studentData.firstName || studentData.firstname || "Student",
          lastName: studentData.lastName || studentData.lastname || "",
        });
      } catch (e) {
        console.error("Student session parse error:", e);
        sessionStorage.removeItem("studentSession");
        setUser(null);
      }
    } else {
      // No Firebase user and no Student session = Logged Out
      setUser(null);
    }

    setLoading(false);
  });

  return () => unsub();
}, []);

  /* ============================================================
     TARGETED LOGOUT (TAB-SPECIFIC)
  ============================================================ */

  const logoutStudent = () => {
    sessionStorage.removeItem("studentSession");
    setUser(null);
    window.location.href = "/"; 
  };

  const logoutParent = async () => {
    // 1. Remove the "Lock" for this tab
    sessionStorage.removeItem("activeTabUser");
    
    // 2. IMPORTANT: DO NOT call signOut(auth) if you want other tabs to stay alive.
    // Simply clear the state for this tab.
    setUser(null);
    window.location.href = "/";
  };

  const logoutAll = async () => {
    sessionStorage.clear(); // Clears everything for THIS tab only
    await signOut(auth);    // This will still kill other Firebase tabs 
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