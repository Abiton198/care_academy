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

import { Loader2, AlertCircle, Chrome, X, Eye, EyeOff } from "lucide-react";
import TeacherApplicationModal from "../dashboards/TeacherApplicationModal";

const ROLES = [
  { value: "parent", label: "Parent" },
  { value: "teacher", label: "Teacher" },
  { value: "principal", label: "Principal" },
];

export default function LoginForm() {
  const navigate = useNavigate();
  const redirectedRef = useRef(false);

  const [tab, setTab] = useState<"signin" | "student" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [selectedRole, setSelectedRole] = useState("");
  const [username, setUsername] = useState("");

  const [loading, setLoading] = useState(true);
  const [authLoading, setAuthLoading] = useState(false);
  const [studentAuthLoading, setStudentAuthLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [showTeacherModal, setShowTeacherModal] = useState(false);
  const [newTeacherUid, setNewTeacherUid] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  /* =====================================================
   AUTH STATE LISTENER (WITH RETRY GUARD)
   ===================================================== */
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user || redirectedRef.current) {
        setLoading(false);
        return;
      }

      try {
        const userRef = doc(db, "users", user.uid);
        let snap = await getDoc(userRef);

        // 🛡️ RETRY GUARD: If doc doesn't exist, wait for Firestore to catch up with Google Auth
        if (!snap.exists()) {
          console.log("Profile not found, retrying in 2 seconds...");
          await new Promise((resolve) => setTimeout(resolve, 2000));
          snap = await getDoc(userRef);
        }

        if (!snap.exists()) {
          await auth.signOut();
          setError("Account profile not found. Please register first.");
          setLoading(false);
          return;
        }

        const data = snap.data();
        const role = data.role?.toLowerCase();

        if (!role) {
          await auth.signOut();
          setError("Account role is missing. Contact support.");
          setLoading(false);
          return;
        }

        redirectedRef.current = true;

        switch (role) {
          case "principal":
            window.location.href = "/principal-dashboard";
            break;
          case "teacher":
            if (data.applicationStatus === "pending") {
              setNewTeacherUid(user.uid);
              setShowTeacherModal(true);
              setLoading(false);
              return;
            }
            window.location.href = "/teacher-dashboard";
            break;
          case "parent":
            window.location.href = "/parent-dashboard";
            break;
          default:
            await auth.signOut();
            setError("Unauthorized role.");
            setLoading(false);
            break;
        }
      } catch (err) {
        console.error("Auth redirect failed:", err);
        setLoading(false);
      }
    });

    return () => unsub();
  }, []);

  /* =====================================================
     GOOGLE AUTH (SIGN IN & REGISTER)
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
      googleProvider.setCustomParameters({ prompt: "select_account" });
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;

      const ref = doc(db, "users", user.uid);
      const snap = await getDoc(ref);

      // Create profile if it doesn't exist
      if (!snap.exists()) {
        const finalRole = selectedRole || "parent";
        await setDoc(ref, {
          uid: user.uid,
          email: user.email,
          role: finalRole,
          applicationStatus: finalRole === "teacher" ? "pending" : "approved",
          createdAt: serverTimestamp(),
        });
      }
    } catch (err: any) {
      setError(err.message || "Google sign-in failed");
      setAuthLoading(false);
    }
  };

  /* =====================================================
     STUDENT LOGIN (CUSTOM LOCAL STORAGE SESSION)
     ===================================================== */
  const handleStudentLogin = async () => {
    if (!username || !password) {
      setError("Please enter both username and password.");
      return;
    }
    setStudentAuthLoading(true);
    setError(null);

    try {
      const q = query(
        collection(db, "students"),
        where("username", "==", username.toLowerCase().trim())
      );
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) throw new Error("Student account not found.");

      const studentDoc = querySnapshot.docs[0];
      const studentData = studentDoc.data();
      const encodedInput = btoa(password);

      if (encodedInput !== studentData.passwordHash) throw new Error("Invalid credentials.");
      if (studentData.loginEnabled === false) throw new Error("Account disabled by parent.");

      const studentSession = {
        uid: studentDoc.id,
        firstName: studentData.firstName,
        role: "student",
        parentId: studentData.parentId,
        loginTime: Date.now(),
      };

      localStorage.setItem("studentSession", JSON.stringify(studentSession));
      window.location.href = `/student-dashboard/${studentDoc.id}`;
    } catch (err: any) {
      setError(err.message);
    } finally {
      setStudentAuthLoading(false);
    }
  };

  /* =====================================================
     EMAIL SIGN IN (STAFF/PARENTS)
     ===================================================== */
  const handleEmailPasswordSignIn = async () => {
    if (authLoading) return;
    setError(null);
    setAuthLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (err: any) {
      setError("Invalid email or password.");
      setAuthLoading(false);
    }
  };

  const handleTeacherSubmitted = async () => {
    if (!newTeacherUid) return;
    try {
      await updateDoc(doc(db, "users", newTeacherUid), {
        applicationStatus: "submitted",
        profileCompleted: true,
        submittedAt: serverTimestamp(),
      });
      setShowTeacherModal(false);
      navigate("/teacher-dashboard", { replace: true });
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) return null;

  return (
    <>
      <div className="relative min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 to-blue-50 p-4">
        <Card className="w-full max-w-md rounded-3xl shadow-xl overflow-hidden">
          <CardHeader className="relative bg-gradient-to-r from-indigo-600 to-purple-600 text-white text-center py-8">
            <button
              type="button"
              onClick={() => (window.location.href = "/")}
              className="absolute top-4 right-4 rounded-full bg-white/20 p-2 hover:bg-white/40 transition"
            >
              <X size={20} />
            </button>
            <CardTitle className="text-3xl font-bold">Care Academy</CardTitle>
            <CardDescription className="text-indigo-100">Portal Access</CardDescription>
          </CardHeader>

          <CardContent className="p-8 space-y-6">
            {error && (
              <Alert variant="destructive" className="rounded-xl">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <Tabs value={tab} onValueChange={(v) => setTab(v as any)}>
              <TabsList className="grid grid-cols-3 bg-indigo-50 rounded-xl p-1">
                <TabsTrigger value="signin">Sign In</TabsTrigger>
                <TabsTrigger value="student">Student</TabsTrigger>
                <TabsTrigger value="signup">Register</TabsTrigger>
              </TabsList>

              {/* STAFF/PARENT SIGN IN */}
              <TabsContent value="signin" className="space-y-4 mt-6">
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input
                    type="email"
                    placeholder="name@school.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
                <div className="space-y-2 relative">
                  <Label>Password</Label>
                  <Input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-9 text-slate-400"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
                <Button className="w-full" disabled={authLoading} onClick={handleEmailPasswordSignIn}>
                  {authLoading ? <Loader2 className="animate-spin" /> : "Sign In"}
                </Button>
              </TabsContent>

              {/* STUDENT LOGIN */}
              <TabsContent value="student" className="space-y-4 mt-6">
                <div className="space-y-2">
                  <Label>Username</Label>
                  <Input value={username} onChange={(e) => setUsername(e.target.value)} placeholder="firstname.lastname" />
                </div>
                <div className="space-y-2 relative">
                  <Label>Password</Label>
                  <Input type={showPassword ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-9 text-slate-400">
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
                <Button className="w-full bg-indigo-600" disabled={studentAuthLoading} onClick={handleStudentLogin}>
                  {studentAuthLoading ? <Loader2 className="animate-spin" /> : "Access Portal"}
                </Button>
              </TabsContent>

              {/* REGISTER (GOOGLE ONLY) */}
              <TabsContent value="signup" className="space-y-4 mt-6">
                <div className="p-4 bg-indigo-50 rounded-2xl border border-indigo-100 space-y-3">
                  <Label className="text-[10px] font-black uppercase text-indigo-600">Select Your Role</Label>
                  <Select value={selectedRole} onValueChange={setSelectedRole}>
                    <SelectTrigger className="rounded-xl border-none">
                      <SelectValue placeholder="I am a..." />
                    </SelectTrigger>
                    <SelectContent>
                      {ROLES.map((r) => (
                        <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button
                  variant="outline"
                  className="w-full h-12 rounded-xl border-2 border-indigo-600 text-indigo-600 font-bold"
                  onClick={handleGoogle}
                  disabled={!selectedRole || authLoading}
                >
                  {authLoading ? <Loader2 className="animate-spin" /> : <Chrome className="mr-2" size={18} />}
                  Register with Google
                </Button>
              </TabsContent>
            </Tabs>

            <div className="relative py-2">
              <div className="absolute inset-0 flex items-center"><span className="w-full border-t" /></div>
              <div className="relative flex justify-center text-[10px] uppercase"><span className="bg-white px-2 text-slate-400">Social Login</span></div>
            </div>

            <Button variant="outline" className="w-full rounded-xl h-12" onClick={handleGoogle} disabled={authLoading}>
              <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" className="mr-3 h-4 w-4" alt="G" />
              Google Sign In
            </Button>
          </CardContent>
        </Card>
      </div>

      <TeacherApplicationModal open={showTeacherModal} applicationId={newTeacherUid} onSubmitted={handleTeacherSubmitted} onClose={() => setShowTeacherModal(false)} />
    </>
  );
}