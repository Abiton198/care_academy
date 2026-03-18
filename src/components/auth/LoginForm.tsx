"use client";

import React, { useState, useEffect, useRef } from "react";
import { auth, db, googleProvider } from "@/lib/firebaseConfig";
import {
  signInWithPopup,
  onAuthStateChanged,
  signInWithEmailAndPassword,
} from "firebase/auth";

import {
  doc,
  collection,
  query,
  where,
  getDocs,
  getDoc,
  setDoc,
  updateDoc,
  serverTimestamp,
} from "firebase/firestore";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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

import { Loader2, AlertCircle, X, Eye, EyeOff } from "lucide-react";

import TeacherApplicationModal from "../dashboards/TeacherApplicationModal";

export default function LoginForm() {

  const redirectedRef = useRef(false);

  /* ================================
     UI STATE
  ================================== */

  const [tab, setTab] = useState<"signin" | "student" | "signup">("signin");
  const [showPassword, setShowPassword] = useState(false);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");

  const [selectedRole, setSelectedRole] = useState("");

  const [authLoading, setAuthLoading] = useState(false);
  const [studentLoading, setStudentLoading] = useState(false);
  const [loading, setLoading] = useState(true);

  const [error, setError] = useState<string | null>(null);

  /* ================================
     TEACHER MODAL
  ================================== */

  const [showTeacherModal, setShowTeacherModal] = useState(false);
  const [teacherUid, setTeacherUid] = useState<string | null>(null);

  const ROLES = [
    { value: "parent", label: "Parent" },
    { value: "teacher", label: "Teacher" },
    { value: "principal", label: "Principal" },
  ];

  /* ================================
     AUTH LISTENER
  ================================== */

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user || redirectedRef.current) {
        setLoading(false);
        return;
      }

      try {
        const userRef = doc(db, "users", user.uid);
        const snap = await getDoc(userRef);

        if (!snap.exists()) {
          setLoading(false);
          return;
        }

        const data = snap.data();

        console.log("AUTH USER DATA:", data);

        // ✅ SHOW TEACHER APPLICATION MODAL
        if (
          data.role === "teacher" &&
          ["pending", "submitted"].includes(data.applicationStatus)
        ) {
          setTeacherUid(user.uid);
          setShowTeacherModal(true);
          setLoading(false);
          return; // 🚨 STOP REDIRECT
        }

        // ✅ NORMAL USERS REDIRECT
        redirectedRef.current = true;
        window.location.href = `/${data.role}-dashboard`;

      } catch (err) {
        console.error("Auth Listener Error:", err);
        setLoading(false);
      }
    });

    return () => unsub();
  }, []);

  /* ================================
     GOOGLE LOGIN
  ================================== */

  const handleGoogle = async () => {

    if (authLoading) return;

    if (tab === "signup" && !selectedRole) {
      setError("Please select a role first.");
      return;
    }

    setError(null);
    setAuthLoading(true);

    try {

      googleProvider.setCustomParameters({
        prompt: "select_account",
      });

      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;

      const userRef = doc(db, "users", user.uid);
      const snap = await getDoc(userRef);

      const roleToUse = snap.exists()
        ? snap.data().role
        : selectedRole || "parent";

      console.log("ROLE SELECTED:", roleToUse);

      /* ---------- CREATE USER RECORD ---------- */

      if (!snap.exists()) {

        await setDoc(userRef, {
          uid: user.uid,
          email: user.email,
          role: roleToUse,
          applicationStatus:
            roleToUse === "teacher" ? "pending" : "approved",
          createdAt: serverTimestamp(),
        });

      }

      /* ---------- TEACHER → OPEN MODAL ---------- */

      if (roleToUse === "teacher") {
        setTeacherUid(user.uid);

        // wait one render cycle before showing modal
        setTimeout(() => {
          setShowTeacherModal(true);
        }, 100);

        return;
      }

    } catch (err: any) {

      setError(err.message);

    } finally {

      setAuthLoading(false);

    }


  };

  /* ================================
     EMAIL LOGIN
  ================================== */

  const handleEmailLogin = async () => {

    if (authLoading) return;

    setError(null);
    setAuthLoading(true);

    try {

      await signInWithEmailAndPassword(auth, email, password);

    } catch {

      setError("Invalid credentials.");

    } finally {

      setAuthLoading(false);

    }

  };

  /* ================================
     STUDENT LOGIN
  ================================== */

  const handleStudentLogin = async () => {

    if (!username || !password) {
      setError("Please fill in all fields.");
      return;
    }

    setStudentLoading(true);

    try {

      const q = query(
        collection(db, "students"),
        where("username", "==", username.toLowerCase().trim())
      );

      const snap = await getDocs(q);

      if (snap.empty) throw new Error("Student not found.");

      const student = snap.docs[0].data();

      if (btoa(password) !== student.passwordHash)
        throw new Error("Incorrect password.");

      sessionStorage.setItem(
        "studentSession",
        JSON.stringify({
          uid: snap.docs[0].id,
          role: "student",
        })
      );

      window.location.href = `/student-dashboard/${snap.docs[0].id}`;

    } catch (err: any) {

      setError(err.message);

    } finally {

      setStudentLoading(false);

    }

  };

  /* ================================
     TEACHER APPLICATION SUBMITTED
  ================================== */

  const handleTeacherSubmitted = async () => {

    if (!teacherUid) return;

    try {

      await updateDoc(doc(db, "users", teacherUid), {
        applicationStatus: "submitted",
        profileCompleted: true,
      });

      setShowTeacherModal(false);

      window.location.href = "/teacher-dashboard";

    } catch (err) {

      console.error("Teacher submission failed:", err);

    }

  };

  /* ================================
     LOADING SCREEN
  ================================== */

  if (loading) {

    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="animate-spin text-indigo-600" size={40} />
      </div>
    );

  }

  /* ================================
     UI
  ================================== */

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">

      <Card className="w-full max-w-md rounded-[2rem] shadow-2xl overflow-hidden border-none bg-white">

        <CardHeader className="relative bg-indigo-600 text-white text-center py-10">

          <button
            onClick={() => (window.location.href = "/")}
            className="absolute top-5 right-5 p-2 rounded-full bg-white/10 hover:bg-white/20"
          >
            <X size={20} />
          </button>

          <CardTitle className="text-4xl font-black">CARE</CardTitle>
          <CardDescription className="text-indigo-100">
            Academy Portal
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

            <TabsList className="grid grid-cols-3 bg-slate-100 rounded-2xl p-1">

              <TabsTrigger value="signin">Sign In</TabsTrigger>
              <TabsTrigger value="student">Student</TabsTrigger>
              <TabsTrigger value="signup">Register</TabsTrigger>

            </TabsList>

            {/* SIGN IN */}

            <TabsContent value="signin" className="space-y-4">

              <Input
                type="email"
                placeholder="Email Address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />

              <div className="relative">

                <Input
                  type={showPassword ? "text" : "password"}
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />

                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-3"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>

              </div>

              <Button
                className="w-full"
                onClick={handleEmailLogin}
                disabled={authLoading}
              >
                {authLoading ? <Loader2 className="animate-spin" /> : "Sign In"}
              </Button>

            </TabsContent>

            {/* STUDENT */}

            <TabsContent value="student" className="space-y-4">

              <Input
                placeholder="Username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />

              <Input
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />

              <Button
                className="w-full"
                onClick={handleStudentLogin}
                disabled={studentLoading}
              >
                {studentLoading ? (
                  <Loader2 className="animate-spin" />
                ) : (
                  "Access Dashboard"
                )}
              </Button>

            </TabsContent>

            {/* REGISTER */}

            <TabsContent value="signup">

              <Select
                value={selectedRole}
                onValueChange={setSelectedRole}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Register as..." />
                </SelectTrigger>

                <SelectContent>
                  {ROLES.map((r) => (
                    <SelectItem key={r.value} value={r.value}>
                      {r.label}
                    </SelectItem>
                  ))}
                </SelectContent>

              </Select>

            </TabsContent>

          </Tabs>

          <Button
            variant="secondary"
            className="w-full"
            onClick={handleGoogle}
            disabled={authLoading}
          >
            {authLoading ? (
              <Loader2 className="animate-spin" />
            ) : (
              "Continue with Google"
            )}
          </Button>

        </CardContent>
      </Card>

      <TeacherApplicationModal
        open={showTeacherModal}
        userId={teacherUid}
        applicationId={teacherUid}
        onSubmitted={handleTeacherSubmitted}
        onClose={() => setShowTeacherModal(false)}
      />

      {/* WhatsApp button */}
      <a
        href="https://wa.me/27656564983"
        target="_blank"
        className="fixed bottom-6 right-6 bg-green-500 text-white px-5 py-3 rounded-full shadow-lg hover:bg-green-600"
      >
        WhatsApp
      </a>

    </div>
  );
}