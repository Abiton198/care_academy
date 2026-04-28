"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
} from "react";

import {
  onAuthStateChanged,
  signOut,
} from "firebase/auth";

import { auth, db } from "@/lib/firebaseConfig";

import {
  doc,
  getDoc,
} from "firebase/firestore";

/* ======================================
 TYPES
====================================== */

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

/* ======================================
 HELPERS
====================================== */

const sleep = (ms: number) =>
  new Promise((resolve) => setTimeout(resolve, ms));

async function fetchUserProfile(uid: string, retries = 3) {
  for (let i = 0; i < retries; i++) {
    const snap = await getDoc(doc(db, "users", uid));

    if (snap.exists()) {
      return snap.data();
    }

    // Retry for Firestore propagation after signup
    if (i < retries - 1) {
      await sleep(1000);
    }
  }

  return null;
}

/* ======================================
 PROVIDER
====================================== */

export const AuthProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const [user, setUser] =
    useState<AppUser | null>(null);

  const [loading, setLoading] =
    useState(true);

  useEffect(() => {
    let mounted = true;

    setLoading(true);

    const unsub = onAuthStateChanged(
      auth,
      async (firebaseUser) => {
        try {
          if (!mounted) return;

          /* ======================================
             1 STUDENT ANONYMOUS SESSION
          ====================================== */
          if (firebaseUser?.isAnonymous) {
            const raw =
              sessionStorage.getItem(
                "studentSession"
              );

            if (!raw) {
              await signOut(auth).catch(() => {});
              if (mounted) setUser(null);
              return;
            }

            try {
              const studentData =
                JSON.parse(raw);

              if (!mounted) return;

              setUser({
                uid:
                  studentData.studentId ||
                  firebaseUser.uid,
                role: "student",
                firstName:
                  studentData.firstName ||
                  "Student",
                lastName:
                  studentData.lastName || "",
                grade:
                  studentData.grade || "",
                parentName:
                  studentData.parentName,
                parentId:
                  studentData.parentId,
              });
            } catch (e) {
              console.error(
                "Invalid student session:",
                e
              );
              sessionStorage.removeItem(
                "studentSession"
              );
              await signOut(auth).catch(() => {});
              if (mounted) setUser(null);
            }

            return;
          }

          /* ======================================
             2 NO FIREBASE USER
          ====================================== */
          if (!firebaseUser) {
            const raw =
              sessionStorage.getItem(
                "studentSession"
              );

            if (!raw) {
              if (mounted) setUser(null);
              return;
            }

            try {
              const studentData =
                JSON.parse(raw);

              let parentName =
                studentData.parentName;

              if (
                studentData.parentId &&
                !parentName
              ) {
                try {
                  const parentDoc =
                    await getDoc(
                      doc(
                        db,
                        "users",
                        studentData.parentId
                      )
                    );

                  if (parentDoc.exists()) {
                    const p =
                      parentDoc.data();

                    parentName =
                      (
                        `${p.firstName || ""} ${
                          p.lastName || ""
                        }`
                      ).trim() || "Parent";

                    studentData.parentName =
                      parentName;

                    sessionStorage.setItem(
                      "studentSession",
                      JSON.stringify(
                        studentData
                      )
                    );
                  }
                } catch (e) {
                  console.warn(
                    "Parent lookup failed",
                    e
                  );
                }
              }

              if (!mounted) return;

              setUser({
                uid:
                  studentData.studentId,
                role: "student",
                firstName:
                  studentData.firstName ||
                  "Student",
                lastName:
                  studentData.lastName || "",
                grade:
                  studentData.grade || "",
                parentName,
                parentId:
                  studentData.parentId,
              });
            } catch (e) {
              console.error(
                "Session recovery failed:",
                e
              );
              sessionStorage.removeItem(
                "studentSession"
              );

              if (mounted) setUser(null);
            }

            return;
          }

          /* ======================================
             3 REGISTERED USER
          ====================================== */

          const profile =
            await fetchUserProfile(
              firebaseUser.uid
            );

          if (!mounted) return;

          if (!profile) {
            console.warn(
              "Authenticated user found but user profile missing."
            );

            // IMPORTANT:
            // Do NOT auto sign-out.
            setUser(null);
            return;
          }

          setUser({
            uid: firebaseUser.uid,
            email: firebaseUser.email,
            role:
              profile.role || "parent",
            firstName:
              profile.firstName || "",
            lastName:
              profile.lastName || "",
          });
        } catch (error) {
          console.error(
            "Auth sync failed:",
            error
          );

          if (mounted) {
            setUser(null);
          }
        } finally {
          if (mounted) {
            setLoading(false);
          }
        }
      }
    );

    return () => {
      mounted = false;
      unsub();
    };
  }, []);

  /* ======================================
     LOGOUTS
  ====================================== */

  const goHome = () => {
    window.location.replace("/");
  };

  const logoutStudent = () => {
    sessionStorage.removeItem(
      "studentSession"
    );

    signOut(auth).catch(() => {});

    setUser(null);

    goHome();
  };

  const logoutParent = async () => {
    sessionStorage.removeItem(
      "studentSession"
    );

    try {
      await signOut(auth);
    } catch {}

    setUser(null);

    goHome();
  };

  const logoutAll = async () => {
    sessionStorage.clear();

    try {
      await signOut(auth);
    } catch {}

    setUser(null);

    goHome();
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

/* ======================================
 HOOK
====================================== */

export const useAuth = () =>
  useContext(AuthContext);