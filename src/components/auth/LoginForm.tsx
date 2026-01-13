"use client";

import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";

import { auth, db, googleProvider } from "@/lib/firebaseConfig";
import {
  signInWithPopup,
  onAuthStateChanged,
} from "firebase/auth";

import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  serverTimestamp,
} from "firebase/firestore";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { Loader2, AlertCircle, Chrome, X } from "lucide-react";

import TeacherApplicationModal from "../dashboards/TeacherApplicationModal";

const ROLES = [
  { value: "parent", label: "Parent" },
  { value: "teacher", label: "Teacher" },
  { value: "principal", label: "Principal" },
];

export default function LoginForm() {
  const navigate = useNavigate();
  const redirectedRef = useRef(false);

  const [tab, setTab] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [selectedRole, setSelectedRole] = useState("");

  const [loading, setLoading] = useState(true);
  const [authLoading, setAuthLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [showTeacherModal, setShowTeacherModal] = useState(false);
  const [newTeacherUid, setNewTeacherUid] = useState<string | null>(null);
  
  
  /* =====================================================
   AUTH STATE LISTENER (SAFE REDIRECTS)
   ===================================================== */
useEffect(() => {
  const unsub = onAuthStateChanged(auth, async (user) => {
    if (!user || authLoading || redirectedRef.current) {
      setLoading(false);
      return;
    }

    try {
      const userRef = doc(db, "users", user.uid);
      const snap = await getDoc(userRef);

      // If they are logged in but have no Firestore record yet, stay on login
      if (!snap.exists()) {
        setLoading(false);
        return;
      }

      const data = snap.data();
      const role = data.role?.toLowerCase();

      // 🛑 SAFETY GUARD: Prevent /-dashboard errors
      if (!role) {
        console.error("User document found but no role assigned!");
        setError("Account configuration error. Please contact the administrator.");
        setLoading(false);
        setAuthLoading(false);
        return;
      }

      // 1. Principal Redirect
      if (role === "principal") {
        redirectedRef.current = true;
        window.location.href = "/principal-dashboard";
        return;
      }

      // 2. Teacher Redirect (with Application Check)
      if (role === "teacher") {
        if (data.applicationStatus === "pending") {
          setNewTeacherUid(user.uid);
          setShowTeacherModal(true);
          setLoading(false);
          return;
        }
        redirectedRef.current = true;
        window.location.href = "/teacher-dashboard";
        return;
      }

      // 3. Parent Redirect
      if (role === "parent") {
        redirectedRef.current = true;
        window.location.href = "/parent-dashboard";
        return;
      }

      // 4. Fallback for Students or others
      redirectedRef.current = true;
      navigate(`/${role}-dashboard`, { replace: true });

    } catch (err) {
      console.error("Auth listener error:", err);
      setError("Failed to verify user permissions.");
    } finally {
      setLoading(false);
    }
  });

  return () => unsub();
}, [navigate, authLoading]);

 
 
  /* =====================================================
     GOOGLE AUTH
     ===================================================== */
  const handleGoogle = async () => {
    if (authLoading) return;

    if (tab === "signup" && !selectedRole) {
      setError("Please select a role before continuing with Google");
      return;
    }

    setError(null);
    setAuthLoading(true);

    try {
      // 🔥 ADD THIS LINE HERE:
      // This forces the "Choose an account" screen even if already logged in
      googleProvider.setCustomParameters({
        prompt: 'select_account'
      });

      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;

      const ref = doc(db, "users", user.uid);
      const snap = await getDoc(ref);

      if (!snap.exists()) {
        await setDoc(ref, {
          uid: user.uid,
          email: user.email,
          role: selectedRole,
          applicationStatus:
            selectedRole === "teacher" ? "pending" : "approved",
          createdAt: serverTimestamp(),
        });
      }
    } catch (err: any) {
      setError(err.message || "Google sign-in failed");
      setAuthLoading(false);
    }
  };

  /* =====================================================
     TEACHER SUBMISSION COMPLETE
     ===================================================== */
  const handleTeacherSubmitted = async () => {
    if (!newTeacherUid) return;

    try {
      const userRef = doc(db, "users", newTeacherUid);
      await updateDoc(userRef, {
        applicationStatus: "submitted",
        profileCompleted: true,
        submittedAt: serverTimestamp(),
      });

      setShowTeacherModal(false);
      navigate("/teacher-dashboard", { replace: true });
    } catch (err) {
      console.error("Submission error:", err);
    }
  };

  /* =====================================================
     UI
     ===================================================== */
  if (loading) return null;

  return (
    <>
      <div className="relative min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 to-blue-50 p-4">
        <Card className="w-full max-w-md rounded-3xl shadow-xl">

    {/* HEADER */}
    <CardHeader className="relative bg-gradient-to-r from-indigo-600 to-purple-600 text-white text-center py-8">

      {/* ❌ CLOSE BUTTON */}
      <button
        type="button"
        onClick={() => {console.log("Close clicked!"); window.location.href = "/";}}
        aria-label="Close"
        className="
          absolute
          top-4
          right-4
          z-[99] 
          pointer-events-auto 
          rounded-full
          bg-white/90
          p-2
          text-slate-700
          hover:bg-white
          hover:text-slate-900
          transition
        "
      >
        <X size={20} />
      </button>

      <CardTitle className="text-3xl font-bold">
        Care Academy
      </CardTitle>

      <CardDescription className="text-indigo-100">
        Secure Portal Access
      </CardDescription>

    </CardHeader>

              <CardContent className="p-8 space-y-6">
                  {error && (
                    <Alert variant="destructive">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>{error}</AlertDescription>
                    </Alert>
                  )}

                  <form>
                    
                    <Tabs value={tab} onValueChange={(v) => setTab(v as any)}>
                      <TabsList className="grid grid-cols-2 bg-indigo-100 rounded-xl">
                        <TabsTrigger value="signin">Sign In</TabsTrigger>
                        <TabsTrigger value="signup">Sign Up</TabsTrigger>
                      </TabsList>

                      {/* SIGN IN TAB */}
                      <TabsContent value="signin" className="space-y-4 mt-6">
                     
                        <Button type="submit" className="w-full" disabled={authLoading}>
                          {authLoading ? <Loader2 className="animate-spin" /> : "Sign In"}
                        </Button>
                      </TabsContent>

                      {/* SIGN UP TAB */}
                      <TabsContent value="signup" className="space-y-4 mt-6">
                     
                        <Select value={selectedRole} onValueChange={setSelectedRole}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select role" />
                          </SelectTrigger>
                          <SelectContent>
                            {ROLES.map((r) => (
                              <SelectItem key={r.value} value={r.value}>
                                {r.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Button
                          type="submit"
                          className="w-full"
                          disabled={!selectedRole || authLoading}
                        >
                          {authLoading ? <Loader2 className="animate-spin" />: "Sign Up"}
                        </Button>
                      </TabsContent>
                    </Tabs>
                  </form>

                  <div className="relative py-4">
                    <div className="absolute inset-0 flex items-center"><span className="w-full border-t" /></div>
                    <div className="relative flex justify-center text-xs uppercase">
                      <span className="bg-white px-2 text-muted-foreground"> continue with</span>
                    </div>
                  </div>

                  <Button
                    variant="outline"
                    type="button"
                    className="w-full"
                    onClick={handleGoogle}
                  >
                   <img 
                      src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" 
                      alt="Google" 
                      className="mr-3 h-5 w-5" 
                    />
                    Google Account
                  </Button>
                </CardContent>
        </Card>
      </div>

      <TeacherApplicationModal
        open={showTeacherModal}
        applicationId={newTeacherUid}
        onSubmitted={handleTeacherSubmitted}
        onClose={() => {
          setShowTeacherModal(false);
          navigate("/", { replace: true });
        }}
      />
    </>
  );
}
