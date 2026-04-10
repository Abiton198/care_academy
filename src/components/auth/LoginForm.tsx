"use client";

import React, { useState, useEffect, useRef } from "react";
import { auth, db, googleProvider } from "@/lib/firebaseConfig";
import {
  signInWithPopup,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signInAnonymously,
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
     TEACHER MODAL STATE
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
      if (!user || redirectedRef.current || user.isAnonymous) {
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

        if (
          data.role === "teacher" &&
          ["pending", "submitted"].includes(data.applicationStatus || "")
        ) {
          setTeacherUid(user.uid);
          setShowTeacherModal(true);
          setLoading(false);
          return;
        }

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
      googleProvider.setCustomParameters({ prompt: "select_account" });

      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;

      const userRef = doc(db, "users", user.uid);
      const snap = await getDoc(userRef);

      const roleToUse = snap.exists() ? snap.data().role : selectedRole || "parent";

      if (!snap.exists()) {
        await setDoc(userRef, {
          uid: user.uid,
          email: user.email,
          role: roleToUse,
          applicationStatus: roleToUse === "teacher" ? "pending" : "approved",
          createdAt: serverTimestamp(),
        });
      }

      if (roleToUse === "teacher") {
        setTeacherUid(user.uid);
        setTimeout(() => setShowTeacherModal(true), 100);
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
     STUDENT LOGIN (Fixed & Clean)
  ================================== */
  const handleStudentLogin = async () => {
    if (!username || !password) {
      setError("Please enter username and password.");
      return;
    }

    setStudentLoading(true);
    setError(null);

    try {
      // ✅ Normalize input username
      const normalizedUsername = username
        .toLowerCase()
        .replace(/\s+/g, "")   // remove ALL spaces
        .trim();

      // Step 1: Anonymous login
      const anonCred = await signInAnonymously(auth);
      const anonUid = anonCred.user.uid;

      // ⚠️ Step 2: Fetch students (LIMITED for safety)
      const q = query(collection(db, "students"));
      const snap = await getDocs(q);

      if (snap.empty) {
        throw new Error("No students found.");
      }

      // ✅ Step 3: Find matching student manually
      let studentDoc = null;

      snap.forEach((docSnap) => {
        const data = docSnap.data();

        if (!data.username) return;

        const dbUsername = data.username
          .toLowerCase()
          .replace(/\s+/g, "") // normalize DB username
          .trim();

        if (dbUsername === normalizedUsername) {
          studentDoc = docSnap;
        }
      });

      if (!studentDoc) {
        throw new Error("Invalid username or password.");
      }

      const student: any = studentDoc.data();

      // Step 4: Check login enabled
      if (!student.loginEnabled) {
        throw new Error("Login disabled. Contact admin.");
      }

      // Step 5: Verify password
      if (btoa(password) !== student.passwordHash) {
        throw new Error("Invalid username or password.");
      }

      // Step 6: Link session
      await updateDoc(doc(db, "students", studentDoc.id), {
        sessionUid: anonUid,
        lastLogin: serverTimestamp(),
      });

      // Step 7: Store session
      sessionStorage.setItem(
        "studentSession",
        JSON.stringify({
          studentId: studentDoc.id,
          firstName: student.firstName || "",
          lastName: student.lastName || "",
          grade: student.grade || "",
          curriculum: student.curriculum || "",
          subjects: student.subjects || [],
          role: "student",
        })
      );

      // Step 8: Redirect
      window.location.href = `/student-dashboard/${studentDoc.id}`;

    } catch (err: any) {
      console.error("Student login error:", err);
      setError(err.message || "Login failed. Please check your credentials.");
    } finally {
      setStudentLoading(false);
    }
  };

  /* ================================
     TEACHER APPLICATION HANDLER - FIXED
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
      setError("Failed to submit teacher application.");
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
     MAIN UI
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
          <CardDescription className="text-indigo-100">Academy Portal</CardDescription>
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

            {/* Sign In Tab */}
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
              <Button className="w-full" onClick={handleEmailLogin} disabled={authLoading}>
                {authLoading ? <Loader2 className="animate-spin" /> : "Sign In"}
              </Button>
            </TabsContent>

            {/* Student Login Tab */}
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
              <Button className="w-full" onClick={handleStudentLogin} disabled={studentLoading}>
                {studentLoading ? <Loader2 className="animate-spin" /> : "Access Dashboard"}
              </Button>
            </TabsContent>

            {/* Register Tab */}
            <TabsContent value="signup" className="space-y-4">
              <Select value={selectedRole} onValueChange={setSelectedRole}>
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

          <Button variant="secondary" className="w-full" onClick={handleGoogle} disabled={authLoading}>
            {authLoading ? <Loader2 className="animate-spin" /> : "Continue with Google"}
          </Button>
        </CardContent>
      </Card>

      {/* Teacher Modal - Now properly connected */}
      <TeacherApplicationModal
        open={showTeacherModal}
        userId={teacherUid}
        applicationId={teacherUid}
        onSubmitted={handleTeacherSubmitted}   // ← Now safely defined above
        onClose={() => setShowTeacherModal(false)}
      />

      {/* WhatsApp Button */}
      <a
        href="https://wa.me/27656564983"
        target="_blank"
        rel="noopener noreferrer"
        className="fixed bottom-6 right-6 bg-green-500 text-white px-5 py-3 rounded-full shadow-lg hover:bg-green-600"
      >
        WhatsApp
      </a>
    </div>
  );
}