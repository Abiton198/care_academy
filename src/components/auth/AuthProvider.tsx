"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { auth, db } from "@/lib/firebaseConfig";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";

/* ============================================================
   TYPES
============================================================ */
export type UserRole = "parent" | "teacher" | "principal" | "admin";

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
     AUTH STATE LISTENER
  ============================================================ */
  useEffect(() => {
const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
  setLoading(true);

  if (!firebaseUser) {
    setUser(null);
    setLoading(false);
    return;
  }

  try {
    // 1. Check the 'users' collection FIRST
    const userDoc = await getDoc(doc(db, "users", firebaseUser.uid));

    if (userDoc.exists()) {
      const data = userDoc.data();
      setUser({
        uid: firebaseUser.uid,
        email: firebaseUser.email,
        role: data.role, // This will be "teacher"
        applicationStatus: data.applicationStatus,
         firstName: data.firstName || "",  
          lastName: data.lastName || "", 
      });
    } else {
      // 2. Only if the document literally doesn't exist yet, 
      // we wait. DO NOT SET DEFAULT ROLE HERE.
      // This allows the LoginForm enough time to create the record.
      console.log("Waiting for profile creation...");
    }
  } catch (err) {
    console.error("Auth error:", err);
  } finally {
    setLoading(false);
  }
});
  }, []);

  /* ============================================================
     LOGOUT
  ============================================================ */
  const logout = async () => {
    await signOut(auth);
    setUser(null);
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
