"use client";

import { onAuthStateChanged, User as FirebaseUser } from "firebase/auth";
import { auth, db } from "@/lib/firebaseConfig";
import {
  doc,
  getDoc,
} from "firebase/firestore";
import React, { createContext, useContext, useEffect, useState } from "react";

interface AppUser {
  uid: string;
  email: string | null;
  role: "parent" | "teacher" | "principal" | "admin"; // student removed
}

interface AuthContextType {
  user: AppUser | null;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser: FirebaseUser | null) => {
      if (!firebaseUser) {
        setUser(null);
        setLoading(false);
        return;
      }

      try {
        const userRef = doc(db, "users", firebaseUser.uid);
        const userSnap = await getDoc(userRef);

        if (userSnap.exists()) {
          const data = userSnap.data();
          const role = data.role;

          // Only allow parent, teacher, principal, admin
          if (["parent", "teacher", "principal", "admin"].includes(role)) {
            setUser({
              uid: firebaseUser.uid,
              email: firebaseUser.email,
              role: role as AppUser["role"],
            });
          } else {
            console.warn("Unauthorized role:", role);
            setUser(null);
          }
        } else {
          console.warn("No user doc found for UID:", firebaseUser.uid);
          setUser(null);
        }
      } catch (err) {
        console.error("Auth error:", err);
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

export const useAuth = () => useContext(AuthContext);