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
import { useNavigate } from "react-router-dom";

export default function LoginForm() {
  const redirectedRef = useRef(false);

  // ✅ FIX 1: Flag to block onAuthStateChanged from interfering during student login
  const isStudentLoginRef = useRef(false);

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

  const navigate = useNavigate();

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
      // ✅ FIX 1 APPLIED: Skip listener entirely during student login flow
      if (isStudentLoginRef.current) {
        setLoading(false);
        return;
      }

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

  setAuthLoading(true);
  setError(null);

  try {
    googleProvider.setCustomParameters({
      prompt: "select_account"
    });

    // Firebase Authentication user created here
    const result = await signInWithPopup(
      auth,
      googleProvider
    );

    const user = result.user;

    const uid = user.uid;
    const roleToUse =
      selectedRole || "parent";

    const userRef =
      doc(db,"users",uid);

    const existing =
      await getDoc(userRef);

    /* ---------------------------------
       FIRST TIME REGISTRATION
    ---------------------------------- */
    if(!existing.exists()){

      const baseProfile = {
        uid,
        email: user.email,
        firstName:
          user.displayName?.split(" ")[0] || "",
        lastName:
          user.displayName
            ?.split(" ")
            .slice(1)
            .join(" ") || "",
        fullName:
          user.displayName || "",
        photoURL:
          user.photoURL || "",
        role: roleToUse,
        profileCompleted:false,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      // MASTER USERS RECORD
      await setDoc(
        doc(db,"users",uid),
        {
          ...baseProfile,
          applicationStatus:
            roleToUse==="teacher"
             ? "pending"
             : "approved"
        }
      );

      /* -------------------------------
         ROLE COLLECTIONS
      -------------------------------- */

      if(roleToUse==="parent"){

        await setDoc(
          doc(db,"parents",uid),
          {
            ...baseProfile,
            students:[],
            address:"",
            contact:"",
            title:"",
            linkedStudents:0
          }
        );
      }

      if(roleToUse==="principal"){

        await setDoc(
          doc(db,"principals",uid),
          {
            ...baseProfile,
            schoolName:"",
            schoolCode:"",
            address:"",
            contact:"",
            verified:false
          }
        );
      }

      if(roleToUse==="teacher"){

        // teacher profile
        await setDoc(
          doc(db,"teachers",uid),
          {
            ...baseProfile,
            subjects:[],
            grades:[],
            bio:"",
            verified:false
          }
        );

        // teacher application workflow
        await setDoc(
          doc(
            db,
            "teacherApplications",
            uid
          ),
          {
            teacherId:uid,
            email:user.email,
            status:"pending",
            submitted:false,
            createdAt:
              serverTimestamp()
          }
        );
      }
    }

    /* -------------------------------
       TEACHER APPLICATION FLOW
    -------------------------------- */

    if(roleToUse==="teacher"){
      setTeacherUid(uid);
      setShowTeacherModal(true);
      return;
    }

    /* -------------------------------
       DASHBOARD REDIRECT
    -------------------------------- */

    navigate(
      `/${roleToUse}-dashboard`
    );

  } catch(err:any){
    console.error(
      "Signup failed:",
      err
    );

    setError(
      err.message ||
      "Registration failed"
    );
  } finally{
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
     STUDENT LOGIN — FIXED
  ================================== */
  const handleStudentLogin = async () => {
    if (!username.trim()) {
      setError("Please enter your username.");
      return;
    }

    setStudentLoading(true);
    setError(null);

    try {
      const normalizedUsername = username
        .trim()
        .toLowerCase()
        .replace(/\s+/g, "");

      const q = query(
        collection(db, "students"),
        where("username", "==", normalizedUsername)
      );

      const snap = await getDocs(q);

      if (snap.empty) {
        setError("Student not found. Please check your username.");
        return;
      }

      if (snap.size > 1) {
        setError("Duplicate username detected. Contact admin.");
        return;
      }

      const studentDoc = snap.docs[0];
      const student = studentDoc.data();

      if (student.loginEnabled === false) {
        setError("Student login has been disabled.");
        return;
      }

      const safeStudent = {
        studentId: studentDoc.id,
        firstName: student.firstName ?? "Student",
        lastName: student.lastName ?? "",
        grade: student.grade ?? "N/A",
        role: "student",
        loginMethod: "username-only",
        loginTime: Date.now(),
      };

      sessionStorage.setItem("studentSession", JSON.stringify(safeStudent));

      // ✅ smoother navigation
      navigate(`/student-dashboard/${studentDoc.id}`);

    } catch (err) {
      console.error("Student login error:", err);
      setError("Something went wrong. Please try again.");
    } finally {
      setStudentLoading(false);
    }
  };

  /* ================================
     TEACHER APPLICATION HANDLER
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

          <Tabs value={tab} onValueChange={(v) => { setTab(v as any); setError(null); }}>
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
                onKeyDown={(e) => e.key === "Enter" && handleEmailLogin()}
              />
              <div className="relative">
                <Input
                  type={showPassword ? "text" : "password"}
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleEmailLogin()}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-3 text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              <Button className="w-full" onClick={handleEmailLogin} disabled={authLoading}>
                {authLoading ? <Loader2 className="animate-spin mr-2" size={16} /> : "Sign In"}
              </Button>
            </TabsContent>

            {/* Student Login Tab - Username Only (Simplified) */}
            <TabsContent value="student" className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-600">Student Username</label>
                <Input
                  placeholder="Enter your username (e.g. donald (dj).van aswegen)"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleStudentLogin()}
                  autoComplete="off"
                  className="h-12"
                />
              </div>

              <Button
                className="w-full bg-indigo-600 hover:bg-indigo-700 h-12 text-base font-semibold"
                onClick={handleStudentLogin}
                disabled={studentLoading || !username.trim()}
              >
                {studentLoading ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="animate-spin" size={18} /> Accessing Dashboard...
                  </span>
                ) : (
                  "Access My Dashboard"
                )}
              </Button>

              <p className="text-center text-xs text-slate-500 mt-4">
                No password required • Just type your username
              </p>
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

          <Button
            variant="secondary"
            className="w-full"
            onClick={handleGoogle}
            disabled={authLoading}
          >
            {authLoading ? (
              <Loader2 className="animate-spin mr-2" size={16} />
            ) : (
              "Continue with Google"
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Teacher Modal */}
      <TeacherApplicationModal
        open={showTeacherModal}
        userId={teacherUid}
        applicationId={teacherUid}
        onSubmitted={handleTeacherSubmitted}
        onClose={() => setShowTeacherModal(false)}
      />

      {/* WhatsApp Button */}
      <a
        href="https://wa.me/27656564983"
        target="_blank"
        rel="noopener noreferrer"
        className="fixed bottom-6 right-6 bg-green-500 text-white px-5 py-3 rounded-full shadow-lg hover:bg-green-600 transition-colors"
      >
        WhatsApp
      </a>
    </div>
  );
}