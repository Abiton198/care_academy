"use client";

import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";

import { auth, db, googleProvider } from "@/lib/firebaseConfig";
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  onAuthStateChanged,
} from "firebase/auth";

import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
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
import { Loader2, AlertCircle, Chrome } from "lucide-react";

import TeacherApplicationModal from "../dashboards/TeacherApplicationModal";
import { updateDoc } from "firebase/firestore";

const ROLES = [
  { value: "student", label: "Student" },
  { value: "parent", label: "Parent" },
  { value: "teacher", label: "Teacher" },
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
     AUTH STATE LISTENER (ONE SOURCE OF REDIRECT)
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

      if (snap.exists()) {
        const data = snap.data();
        const role = data.role?.toLowerCase().trim();

        // LOGGING FOR VERIFICATION
        console.log("Current User UID:", user.uid);
        console.log("Detected Firestore Role:", role);

        if (role === "teacher") {
          if (data.applicationStatus === "pending") {
            setNewTeacherUid(user.uid);
            setShowTeacherModal(true);
            setLoading(false);
            return;
          }
          redirectedRef.current = true;
          // Explicitly push to the TEACHER path
          window.location.href = "/teacher-dashboard"; 
          return;
        }

        if (role === "parent") {
          redirectedRef.current = true;
          window.location.href = "/parent-dashboard";
          return;
        }

        // Default handle for others
        navigate(`/${role}-dashboard`, { replace: true });
      }
    } catch (err) {
      console.error("Auth Listener Error:", err);
    } finally {
      setLoading(false);
    }
  });

  return () => unsub();
}, [navigate, authLoading]);

  /* =====================================================
     EMAIL / PASSWORD AUTH
     ===================================================== */
const handleSubmit = async () => {
  if (authLoading || (tab === "signup" && !selectedRole)) return;
  setError(null);
  setAuthLoading(true);

  try {
    const isSignup = tab === "signup";
    const cred = isSignup
      ? await createUserWithEmailAndPassword(auth, email.trim(), password)
      : await signInWithEmailAndPassword(auth, email.trim(), password);

    const user = cred.user;
    const userRef = doc(db, "users", user.uid);

    if (isSignup) {
      // 1. Create the Firestore document first
      await setDoc(userRef, {
        uid: user.uid,
        email: user.email,
        role: selectedRole,
        applicationStatus: selectedRole === "teacher" ? "pending" : "approved",
        createdAt: serverTimestamp(),
      });

      // 2. Handle Teacher Signup (Show Modal, No Redirect)
      if (selectedRole === "teacher") {
        setNewTeacherUid(user.uid);
        setShowTeacherModal(true);
        setAuthLoading(false);
        setLoading(false); // Stop global loading
        return; // CRITICAL: Stop here so navigate() isn't called
      }

      // 3. Handle Parent/Student Signup (Immediate Redirect)
      redirectedRef.current = true;
      navigate(`/${selectedRole}-dashboard`, { replace: true });
    } else {
      // Sign-in flow: Let the useEffect listener handle the redirect
      // because the document already exists in Firestore.
    }
  } catch (err: any) {
    console.error("Auth Error:", err);
    setError(err.message || "Authentication failed");
    setAuthLoading(false);
  }
};


  /* =====================================================
     GOOGLE AUTH
     ===================================================== */
 const handleGoogle = async () => {
  if (authLoading) return;

  // Guard: Role selection required for new users
  if (tab === "signup" && !selectedRole) {
    setError("Please select a role before continuing with Google");
    return;
  }

  setError(null);
  setAuthLoading(true);

  try {
    const result = await signInWithPopup(auth, googleProvider);
    const user = result.user;
    const ref = doc(db, "users", user.uid);
    const snap = await getDoc(ref);

    if (!snap.exists()) {
      // Create new record with the SELECTED role
      await setDoc(ref, {
        uid: user.uid,
        email: user.email,
        role: selectedRole,
        applicationStatus: selectedRole === "teacher" ? "pending" : "approved",
        createdAt: serverTimestamp(),
      });
      // The useEffect listener above will now pick this up and handle the redirect/modal
    } else {
      // User exists - let the useEffect listener handle the redirect 
      // based on their existing Firestore role
    }
  } catch (err: any) {
    setError(err.message || "Google sign-in failed");
    setAuthLoading(false);
  }
};

const handleTeacherSubmitted = async () => {
  if (!newTeacherUid) return;

  try {
    // 1. Move status from 'pending' to 'submitted'
    const userRef = doc(db, "users", newTeacherUid);
    await updateDoc(userRef, {
      applicationStatus: "submitted",
      profileCompleted: true,
      submittedAt: serverTimestamp(),
    });

    // 2. Close modal and send to their new dashboard
    setShowTeacherModal(false);
    navigate("/teacher-dashboard", { replace: true });
  } catch (err) {
    console.error("Submission Error:", err);
  }
};

  /* =====================================================
     UI
     ===================================================== */
  return (
    <>
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 to-blue-50 p-4">
        <Card className="w-full max-w-md rounded-3xl shadow-xl">
          <CardHeader className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white text-center py-8">
            <CardTitle className="text-3xl font-bold">Care Academy</CardTitle>
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

            <Tabs value={tab} onValueChange={(v) => setTab(v as any)}>
              <TabsList className="grid grid-cols-2 bg-indigo-100 rounded-xl">
                <TabsTrigger value="signin">Sign In</TabsTrigger>
                <TabsTrigger value="signup">Sign Up</TabsTrigger>
              </TabsList>

<form onSubmit={(e) => { e.preventDefault(); handleSubmit(); }}>
  <TabsContent value="signin" className="space-y-4 mt-6">
    <Label>Email</Label>
    <Input 
      autoComplete="username"
      value={email} 
      onChange={(e) => setEmail(e.target.value)} 
    />
    <Label>Password</Label>
    <Input 
      type="password" 
      autoComplete="current-password"
      value={password} 
      onChange={(e) => setPassword(e.target.value)} 
    />
    <Button type="submit" className="w-full" disabled={authLoading}>
      {authLoading ? <Loader2 className="animate-spin" /> : "Sign In"}
    </Button>
  </TabsContent>
</form>

              <TabsContent value="signup" className="space-y-4 mt-6">
                <Input placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
                <Input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} />
                <Select value={selectedRole} onValueChange={setSelectedRole}>
                  <SelectTrigger><SelectValue placeholder="Select role" /></SelectTrigger>
                  <SelectContent>
                    {ROLES.map((r) => (
                      <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button className="w-full" onClick={handleSubmit} disabled={!selectedRole || authLoading}>
                  Create Account
                </Button>
              </TabsContent>
            </Tabs>

            <Button variant="outline" className="w-full" onClick={handleGoogle}>
              <Chrome className="mr-2 h-4 w-4" /> Continue with Google
            </Button>
          </CardContent>
        </Card>
      </div>

      <TeacherApplicationModal
          open={showTeacherModal}
          applicationId={newTeacherUid}
          onSubmitted={handleTeacherSubmitted} // This must call the navigate function
          onClose={() => setShowTeacherModal(false)}
        />
    </>
  );
}
