"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
} from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth, db } from "@/lib/firebaseConfig";
import {
  doc,
  getDoc,
  setDoc,
  serverTimestamp,
} from "firebase/firestore";

/* ============================================================
   Types
   ============================================================ */
export type UserRole = "parent" | "teacher" | "principal" | "admin";

export interface AppUser {
  uid: string;
  email: string | null;
  role: UserRole;
}

/* ============================================================
   Context
   ============================================================ */
const AuthContext = createContext<{
  user: AppUser | null;
  loading: boolean;
}>({
  user: null,
  loading: true,
});

/* ============================================================
   Provider
   ============================================================ */
export const AuthProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
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
           1. Check existing user document
           ==================================================== */
        const userRef = doc(db, "users", uid);
        const userSnap = await getDoc(userRef);

        if (userSnap.exists()) {
          const data = userSnap.data();

          setUser({
            uid,
            email,
            role: data.role,
          });

          setLoading(false);
          return;
        }

        /* ====================================================
           2. New user → determine role
           ==================================================== */
        let role: UserRole = "parent";

        if (email) {
          const principalAllowRef = doc(db, "principal_emails", email);
          const principalAllowSnap = await getDoc(principalAllowRef);

          if (
            principalAllowSnap.exists() &&
            principalAllowSnap.data().active === true
          ) {
            role = "principal";

            // 🔐 REQUIRED FOR SECURITY RULES
            await setDoc(
              doc(db, "principals", uid),
              {
                uid,
                email,
                createdAt: serverTimestamp(),
              },
              { merge: true }
            );
          }
        }

        /* ====================================================
           3. Create user document
           ==================================================== */
        await setDoc(userRef, {
          uid,
          email,
          role,
          createdAt: serverTimestamp(),
        });

        setUser({
          uid,
          email,
          role,
        });
      } catch (error) {
        console.error("AuthProvider error:", error);
        setUser(null);
      } finally {
        setLoading(false);
      }
    });

    return () => unsub();
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

/* ============================================================
   Hook
   ============================================================ */
export const useAuth = () => useContext(AuthContext);
