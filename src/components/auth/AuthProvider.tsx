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

      // --- PATH A: FIREBASE AUTH ---
      if (firebaseUser) {
        try {
          // Check if this specific tab belongs to this Firebase User
          const activeTabUid = sessionStorage.getItem("activeTabUser");
          
          // If the tab has a different user or no user recorded, we can handle it
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
            // Lock this tab to this user
            sessionStorage.setItem("activeTabUser", firebaseUser.uid);
          }
        } catch (err) {
          console.error(err);
        } finally {
          setLoading(false);
        }
        return; 
      }

      // --- PATH B: STUDENT SESSION (Change to sessionStorage) ---
      const studentSession = sessionStorage.getItem("studentSession");
      if (studentSession) {
        const studentData = JSON.parse(studentSession);
        setUser({
          uid: studentData.uid,
          email: null,
          role: "student",
          firstName: studentData.firstName || "Student",
          lastName: studentData.lastName || "",
        });
      } else {
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