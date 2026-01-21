"use client";

import React, { useState, useEffect } from "react";
import { db, storage } from "@/lib/firebaseConfig";
import {
  addDoc,
  collection,
  serverTimestamp,
  updateDoc,
  doc,
} from "firebase/firestore";
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { useAuth } from "@/components/auth/AuthProvider";

import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge"; // Ensure this is installed via shadcn
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { X, GraduationCap, FileText, User, Loader2, CheckCircle2 } from "lucide-react";

/* ======================================================
   TYPES & CONSTANTS
====================================================== */
interface Subject {
  name: string;
  curriculum: "British Curriculum";
}

interface FormData {
  firstName: string;
  lastName: string;
  email: string;
  yearsOfExperience: number;
  gradePhase: "Primary" | "Secondary";
  subjects: Subject[];
}

interface Documents {
  idDoc?: FileList | null;
  qualification?: FileList | null;
  cv?: FileList | null;
}

interface TeacherApplicationFormProps {
  applicationId?: string | null; // Used if editing an existing draft
  onClose: () => void;           // Closes modal (triggers Sign Out in your Modal logic)
  onSubmitted?: () => void;      // Triggers the transition to the Dashboard
}

const British_Curriculum_SUBJECTS = [
  /* =========================
     Primary Curriculum
     ========================= */
  "English (Primary)",
  "Mathematics (Primary)",
  "Science (Primary)",
  "Computing (Primary)",
  "Geography (Primary)",
  "History (Primary)",
  "Art & Design (Primary)",
  "Design & Technology (Primary)",
  "Music (Primary)",
  "Physical Education (Primary)",
  "Religious Education (Primary)",
  "PSHE (Primary)",

  /* =========================
     IGCSE
     ========================= */
  "Mathematics (IGCSE)",
  "Physics (IGCSE)",
  "Chemistry (IGCSE)",
  "Biology (IGCSE)",
  "Computer Science (IGCSE)",
  "English Language (IGCSE)",
  "Business Studies (IGCSE)",
  "Economics (IGCSE)",
  "Geography (IGCSE)",
  "History (IGCSE)",
  "Coding (IGCSE)",

  /* =========================
     A-Level
     ========================= */
  "Mathematics (A-Level)",
  "Further Mathematics (A-Level)",
  "Physics (A-Level)",
  "Chemistry (A-Level)",
  "Biology (A-Level)",
  "Computer Science (A-Level)",
  "English Literature (A-Level)",
  "Business Studies (A-Level)",
  "Economics (A-Level)",
  "Geography (A-Level)",
  "History (A-Level)",
];


/* ======================================================
   MAIN COMPONENT
====================================================== */
export default function TeacherApplicationForm({
  applicationId,
  userId, // Destructure here
  onClose,
  onSubmitted,
}: TeacherApplicationFormProps) {
  
  const { user, loading: authLoading } = useAuth();
  const [form, setForm] = useState<FormData>({
    firstName: "",
    lastName: "",
    email: user?.email || "",
    yearsOfExperience: 0,
    gradePhase: "Primary",
    subjects: [],
  });

  const [documents, setDocuments] = useState<Documents>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  // Sync email from Auth if it changes
  useEffect(() => {
    if (user?.email) {
      setForm((prev) => ({ ...prev, email: user.email || "" }));
    }
  }, [user]);

  const handleChange = (key: keyof FormData, value: any) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const handleFileChange = (key: keyof Documents, files: FileList | null) =>
    setDocuments((prev) => ({ ...prev, [key]: files }));

  const addSubject = (subjectName: string) => {
    if (!form.subjects.some((s) => s.name === subjectName)) {
      setForm((prev) => ({
        ...prev,
        subjects: [...prev.subjects, { name: subjectName, curriculum: "British Curriculum" }],
      }));
    }
  };

  const removeSubject = (name: string) => {
    setForm((prev) => ({
      ...prev,
      subjects: prev.subjects.filter((s) => s.name !== name),
    }));
  };

  /* ======================================================
     SUBMISSION LOGIC (CORE FIX FOR FLICKERING)
  ====================================================== */
 const handleSubmit = async (e?: React.FormEvent) => {
  if (e) e.preventDefault();
  
  // 1. Determine the UID using the fallback prop
  const activeUid = user?.uid || userId;
  const activeEmail = user?.email || form.email; // Use form email as fallback

  if (!activeUid) {
    setError("Session not detected. Please wait a moment and try again.");
    return;
  }

  if (form.subjects.length === 0) {
    setError("Please select at least one British Curriculum subject.");
    return;
  }

  setError("");
  setLoading(true);

  try {
    const applicationPayload = {
      uid: activeUid,
      email: activeEmail,
      personalInfo: { ...form, email: activeEmail, curriculum: "British Curriculum" },
      subjects: form.subjects,
      status: "pending",
      updatedAt: serverTimestamp(),
    };

    // 2. Save/Update Application
    let applicationIdToUse: string;
    if (applicationId && applicationId !== activeUid) { 
      // check if applicationId is a separate doc ID or the UID
      const appRef = doc(db, "teacherApplications", applicationId);
      await updateDoc(appRef, applicationPayload);
      applicationIdToUse = applicationId;
    } else {
      const appRef = await addDoc(collection(db, "teacherApplications"), {
        ...applicationPayload,
        createdAt: serverTimestamp(),
      });
      applicationIdToUse = appRef.id;
    }

    // 3. Update User Status using activeUid
    const userRef = doc(db, "users", activeUid);
    await updateDoc(userRef, {
      applicationStatus: "submitted", 
      profileCompleted: true,
      lastSubmissionId: applicationIdToUse,
      updatedAt: serverTimestamp(),
    });

    // 4. File Uploads using activeUid
    const uploadedDocs: Record<string, string[]> = {};
    const docKeys = Object.keys(documents) as Array<keyof Documents>;

    for (const key of docKeys) {
      const fileList = documents[key];
      if (!fileList || fileList.length === 0) continue;

      uploadedDocs[key] = [];
      for (const file of Array.from(fileList)) {
        const fileRef = ref(storage, `teacherDocs/${activeUid}/${key}_${Date.now()}_${file.name}`);
        
        await new Promise<void>((resolve, reject) => {
          const uploadTask = uploadBytesResumable(fileRef, file);
          uploadTask.on("state_changed", null, reject, async () => {
            const url = await getDownloadURL(uploadTask.snapshot.ref);
            uploadedDocs[key].push(url);
            resolve();
          });
        });
      }
    }

    // 5. Update Application with File URLs
    if (Object.keys(uploadedDocs).length > 0) {
      const appDocRef = doc(db, "teacherApplications", applicationIdToUse);
      await updateDoc(appDocRef, { documents: uploadedDocs });
    }

    setSuccess(true);
    console.log("Submission successful!");

    // 6. Trigger Navigation
    setTimeout(() => {
      if (onSubmitted) {
        onSubmitted();
      } else {
        console.warn("onSubmitted prop is missing!");
        onClose(); // Fallback
      }
    }, 2000);

  } catch (err: any) {
    console.error("Full Submission Error:", err);
    setError(err.message || "Failed to submit application.");
  } finally {
    setLoading(false);
  }
};

  return (
    <Card className="w-full max-w-4xl max-h-[85vh] overflow-hidden flex flex-col bg-white shadow-2xl rounded-3xl border-0">
      <CardHeader className="border-b bg-slate-50/50 p-6">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-4">
            <div className="bg-indigo-600 p-2.5 rounded-xl text-white shadow-lg shadow-indigo-100">
              <GraduationCap size={28} />
            </div>
            <div>
              <CardTitle className="text-xl font-black text-slate-800 uppercase tracking-tight">
                British Curriculum Academic Registry
              </CardTitle>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Teacher Application</p>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full hover:bg-rose-50 hover:text-rose-500 transition-colors">
            <X size={20} />
          </Button>
        </div>
      </CardHeader>

      <CardContent className="p-0 overflow-y-auto">
        {success ? (
          <div className="flex flex-col items-center justify-center py-20 px-8 text-center animate-in fade-in zoom-in duration-500">
            <div className="w-24 h-24 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center mb-6 shadow-inner">
              <CheckCircle2 size={48} />
            </div>
            <h3 className="text-3xl font-black text-slate-900">Application Filed</h3>
            <p className="mt-4 text-slate-500 max-w-md mx-auto leading-relaxed">
              Your British Curriculum teaching credentials have been securely transmitted. 
              The Principal will review your status and subjects within 48 hours.
            </p>
            <Loader2 className="mt-8 animate-spin text-indigo-600" />
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter mt-2">Redirecting to Staff Portal...</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-8 space-y-10">
            {error && (
              <Alert variant="destructive" className="rounded-2xl border-2">
                <AlertDescription className="font-bold">{error}</AlertDescription>
              </Alert>
            )}

            {/* SECTION: PERSONAL */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-4">
                <h4 className="text-[10px] font-black text-indigo-600 uppercase tracking-[0.2em] mb-4">01. Identity Profile</h4>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-bold text-slate-500 ml-1">First Name</Label>
                      <Input className="rounded-xl border-slate-200" value={form.firstName} onChange={(e) => handleChange("firstName", e.target.value)} required />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-bold text-slate-500 ml-1">Last Name</Label>
                      <Input className="rounded-xl border-slate-200" value={form.lastName} onChange={(e) => handleChange("lastName", e.target.value)} required />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-slate-500 ml-1">British Curriculum Teaching Experience (Years)</Label>
                    <Input type="number" className="rounded-xl border-slate-200" value={form.yearsOfExperience || ""} onChange={(e) => handleChange("yearsOfExperience", parseInt(e.target.value) || 0)} required />
                  </div>
                </div>
              </div>

              {/* SECTION: ACADEMIC */}
              <div className="space-y-4">
                <h4 className="text-[10px] font-black text-indigo-600 uppercase tracking-[0.2em] mb-4">02. Academic Focus</h4>
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-slate-500 ml-1">Grade Phase</Label>
                    <Select value={form.gradePhase} onValueChange={(v: any) => handleChange("gradePhase", v)}>
                      <SelectTrigger className="rounded-xl border-slate-200"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Primary">Primary (Checkpoint)</SelectItem>
                        <SelectItem value="Secondary">Secondary (IGCSE / A-Level)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-slate-500 ml-1">Add British Curriculum Subjects</Label>
                    <Select onValueChange={addSubject}>
                      <SelectTrigger className="rounded-xl border-slate-200"><SelectValue placeholder="Search subjects..." /></SelectTrigger>
                      <SelectContent>
                        {British_Curriculum_SUBJECTS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            </div>

            {/* SUBJECT CHIPS */}
            {form.subjects.length > 0 && (
              <div className="bg-slate-50 p-4 rounded-2xl border-2 border-dashed border-slate-200">
                <div className="flex flex-wrap gap-2">
                  {form.subjects.map(s => (
                    <Badge key={s.name} className="bg-white text-slate-700 border-slate-200 hover:bg-rose-50 hover:text-rose-500 hover:border-rose-100 transition-all px-3 py-1.5 rounded-lg flex items-center gap-2 cursor-default">
                      {s.name}
                      <X size={12} className="cursor-pointer" onClick={() => removeSubject(s.name)} />
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* SECTION: DOCS */}
            <div className="space-y-4">
              <h4 className="text-[10px] font-black text-indigo-600 uppercase tracking-[0.2em]">03. Required Documentation (PDF/JPG)</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <DocInput label="Qualifications" onChange={(f) => handleFileChange("qualification", f)} />
                <DocInput label="Professional CV" onChange={(f) => handleFileChange("cv", f)} />
                <DocInput label="Identity Document" onChange={(f) => handleFileChange("idDoc", f)} />
              </div>
            </div>

            {/* FOOTER ACTIONS */}
            <div className="flex gap-4 pt-6 border-t border-slate-100">
              <Button type="submit" disabled={loading} className="flex-[2] h-14 rounded-2xl bg-indigo-600 hover:bg-indigo-700 font-black text-sm tracking-widest shadow-xl shadow-indigo-100">
                {loading ? <Loader2 className="animate-spin" /> : "FINALIZE APPLICATION"}
              </Button>
              <Button type="button" variant="outline" onClick={onClose} className="flex-1 h-14 rounded-2xl font-black text-xs tracking-widest text-slate-400 border-2">
                SAVE DRAFT
              </Button>
            </div>
          </form>
        )}
      </CardContent>
    </Card>
  );
}

/* Sub-component for File Inputs */
function DocInput({ label, onChange }: { label: string; onChange: (f: FileList | null) => void }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-[10px] font-bold text-slate-400 uppercase ml-1 tracking-tight">{label}</Label>
      <div className="relative group">
        <Input 
          type="file" 
          className="rounded-xl border-slate-200 text-[10px] h-12 pt-3.5 group-hover:border-indigo-300 transition-colors" 
          onChange={(e) => onChange(e.target.files)} 
        />
        <FileText size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300" />
      </div>
    </div>
  );
}