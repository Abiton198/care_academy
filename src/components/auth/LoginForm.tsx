"use client";

import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";

import { auth, db, googleProvider } from "@/lib/firebaseConfig";
import {
  signInWithPopup,
  onAuthStateChanged,
  signInWithEmailAndPassword,
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
import { Eye, EyeOff } from "lucide-react";

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
    const [showPassword, setShowPassword] = useState(false);
  
  
  /* =====================================================
   AUTH STATE LISTENER (SAFE REDIRECTS)
   ===================================================== */
useEffect(() => {
  const unsub = onAuthStateChanged(auth, (user) => {
    if (!user || redirectedRef.current) {
      setLoading(false);
      return;
    }

    // 🔐 Delay Firestore until auth token is ready
    user.getIdTokenResult().then(async () => {
      try {
        const userRef = doc(db, "users", user.uid);
        const snap = await getDoc(userRef);

        if (!snap.exists()) {
          setLoading(false);
          return;
        }

        const data = snap.data();
        const role = data.role?.toLowerCase();

        if (!role) {
          setError("Account configuration error.");
          setLoading(false);
          return;
        }

        redirectedRef.current = true;

        if (role === "principal") {
          window.location.href = "/principal-dashboard";
        } else if (role === "teacher") {
          if (data.applicationStatus === "pending") {
            setNewTeacherUid(user.uid);
            setShowTeacherModal(true);
            setLoading(false);
            return;
          }
          window.location.href = "/teacher-dashboard";
        } else if (role === "parent") {
          window.location.href = "/parent-dashboard";
        } else {
          window.location.href = `/${role}-dashboard`;
        }

      } catch (err) {
        console.error("Auth check failed:", err);
        setError("Permission verification failed.");
        setLoading(false);
      }
    });
  });

  return () => unsub();
}, []);

 
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
   EMAIL & PASSWORD SIGN-IN (NO SIGN-UP)
   ===================================================== */
const handleEmailPasswordSignIn = async () => {
  if (authLoading) return;

  setError(null);
  setAuthLoading(true);

  try {
    await signInWithEmailAndPassword(auth, email, password);
    // ✅ onAuthStateChanged will handle redirect automatically
  } catch (err: any) {
    console.error(err);

    switch (err.code) {
      case "auth/user-not-found":
        setError("No account found for this email.");
        break;
      case "auth/wrong-password":
        setError("Incorrect password.");
        break;
      case "auth/invalid-email":
        setError("Invalid email address.");
        break;
      case "auth/user-disabled":
        setError("This account has been disabled.");
        break;
      default:
        setError("Sign-in failed. Please try again.");
    }
  } finally {
    setAuthLoading(false);
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

  <div className="space-y-2">
    <Label htmlFor="email">Email</Label>
    <Input
      id="email"
      type="email"
      placeholder="admin@school.co.za"
      value={email}
      onChange={(e) => setEmail(e.target.value)}
      autoComplete="email"
    />
  </div>

   <div className="space-y-2 relative">
      <Label htmlFor="password">Password</Label>
      <Input
        id="password"
        type={showPassword ? "text" : "password"}
        placeholder="••••••••"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        autoComplete="current-password"
        className="pr-12" // space for the toggle button
      />
      <button
        type="button"
        onClick={() => setShowPassword(!showPassword)}
        className="absolute right-3 top-9 text-slate-400 hover:text-slate-600"
      >
        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
      </button>
    </div>

  <Button
    type="button"
    className="w-full"
    disabled={authLoading || !email || !password}
    onClick={handleEmailPasswordSignIn}
  >
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
