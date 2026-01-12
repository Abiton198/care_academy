"use client";

import React, { useState, useEffect } from "react";
import {
  collection,
  query,
  where,
  onSnapshot,
  doc,
  setDoc,
  serverTimestamp,
  updateDoc,
  getDoc,
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { useAuth } from "@/components/auth/AuthProvider";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, X, Check, Globe, BookOpen, Loader2, PlusCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { motion, AnimatePresence } from "framer-motion";
import { db, storage } from "@/lib/firebaseConfig";

/* ───────────────────────── TYPES ───────────────────────── */
interface Student {
  id?: string;
  firstName: string;
  lastName: string;
  grade: string;
  curriculum: "British Curriculum";
  subjects: string[];
  status?: string;
}

/* ───────────────────────── CONSTANTS ───────────────────────── */
const GRADES = [
  "Stage 1", "Stage 2", "Stage 3", "Stage 4", "Stage 5", "Stage 6",
  "Checkpoint (Yr 7-9)", "IGCSE 1 (Yr 10)", "IGCSE 2 (Yr 11)", "AS Level", "A Level"
];

// Split subjects by stage to ensure age-appropriate registration
const British_Curriculum_SUBJECTS = {
  Primary: [
    "British Curriculum Primary English",
    "British Curriculum Primary Mathematics",
    "British Curriculum Primary Science",
    "British Curriculum Primary Global Perspectives",
    "British Curriculum Primary Digital Literacy",
    "British Curriculum Primary Art & Design",
    "Coding"
  ],
  Secondary: [
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
    "Mathematics (A-Level)",
    "Physics (A-Level)",
    "Chemistry (A-Level)",
    "Biology (A-Level)",
    "Computer Science (A-Level)",
    "English Literature (A-Level)",
    "Business Studies (A-Level)",
    "Economics (A-Level)",
    "Geography (A-Level)",
    "History (A-Level)",
    "Further Mathematics (A-Level)",
    "Coding (IGCSE)"
  ]
};

/* ───────────────────────── COMPONENT ───────────────────────── */
export default function RegistrationSection() {
  const { user } = useAuth();
  const navigate = useNavigate();

  /* =========================
     STATE MANAGEMENT
  ========================= */
  const [loading, setLoading] = useState(true);
  const [students, setStudents] = useState<Student[]>([]);
  const [docs, setDocs] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);

  // Form State
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [grade, setGrade] = useState("");
  // FIXED: Default to "British Curriculum" to match CURRICULUM_SUBJECTS key
  const [curriculum] = useState<"British Curriculum">("British Curriculum");
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  /* =========================
     DATA SYNCHRONIZATION
  ========================= */
  useEffect(() => {
    if (!user?.uid) return;

    let unsub: () => void;

    const loadData = async () => {
      try {
        // Fetch Parent Compliance Documents
        const parentSnap = await getDoc(doc(db, "parents", user.uid));
        if (parentSnap.exists()) {
          setDocs(parentSnap.data().complianceDocs || []);
        }

        // Real-time listener for Students linked to this Parent
        const q = query(
          collection(db, "students"),
          where("parentId", "==", user.uid)
        );

        unsub = onSnapshot(q, (snap) => {
          setStudents(
            snap.docs.map((d) => ({ id: d.id, ...(d.data() as Student) }))
          );
          setLoading(false);
        });
      } catch (err) {
        console.error("Fetch Error:", err);
        setLoading(false);
      }
    };

    loadData();
    return () => unsub && unsub();
  }, [user]);

  /* =========================
     LOGIC HANDLERS
  ========================= */
  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!user?.uid || !e.target.files) return;
    setUploading(true);

    try {
      const urls: string[] = [];
      for (const file of Array.from(e.target.files)) {
        const storageRef = ref(storage, `parents/${user.uid}/docs/${file.name}`);
        await uploadBytes(storageRef, file);
        const url = await getDownloadURL(storageRef);
        urls.push(url);
      }

      const updatedDocs = [...docs, ...urls];
      await updateDoc(doc(db, "parents", user.uid), {
        complianceDocs: updatedDocs,
      });
      setDocs(updatedDocs);
    } catch (err) {
      alert("Upload failed. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!grade || selectedSubjects.length === 0) {
      alert("Please ensure Grade and Subjects are selected.");
      return;
    }

    const studentData = {
      firstName,
      lastName,
      grade,
      curriculum,
      subjects: selectedSubjects,
      updatedAt: serverTimestamp(),
    };

    try {
      if (editingId) {
        await updateDoc(doc(db, "students", editingId), studentData);
      } else {
        const newStudentId = `std_${Date.now()}`;
        await setDoc(doc(db, "students", newStudentId), {
          ...studentData,
          parentId: user?.uid,
          parentEmail: user?.email,
          status: "pending",
          createdAt: serverTimestamp(),
        });
      }
      resetForm();
    } catch (err) {
      console.error("Save error:", err);
    }
  };

  const handleEdit = (s: Student) => {
    setFirstName(s.firstName);
    setLastName(s.lastName);
    setGrade(s.grade);
    setSelectedSubjects(s.subjects);
    setEditingId(s.id || null);
    setIsOpen(true);
  };

  const toggleSubject = (sub: string) => {
    setSelectedSubjects((prev) =>
      prev.includes(sub) ? prev.filter((s) => s !== sub) : [...prev, sub]
    );
  };

  const resetForm = () => {
    setFirstName("");
    setLastName("");
    setGrade("");
    setSelectedSubjects([]);
    setEditingId(null);
    setIsOpen(false);
  };

  // Helper to determine if we show Primary or Secondary subjects
  const getSubjectList = () => {
    if (grade.startsWith("Stage")) return British_Curriculum_SUBJECTS.Primary;
    return British_Curriculum_SUBJECTS.Secondary;
  };

  if (loading) return (
    <div className="flex flex-col items-center justify-center min-h-[400px] gap-2">
      <Loader2 className="animate-spin text-indigo-600" />
      <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">Accessing Student Registry...</p>
    </div>
  );

  /* =========================
     UI RENDER
  ========================= */
  return (
    <div className="max-w-5xl mx-auto p-6 space-y-8 pb-20">
      {/* Navigation Header */}
      <div className="flex justify-between items-center bg-white p-4 rounded-2xl shadow-sm border border-slate-100">
        <Button variant="ghost" onClick={() => navigate(-1)} className="gap-2">
          <ArrowLeft size={16} /> Back
        </Button>
        <div className="text-center">
          <h2 className="text-lg font-black text-slate-800 uppercase tracking-tight">British Curriculum Student Registry</h2>
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Academic Year 2026</p>
        </div>
        <Button variant="ghost" size="icon" onClick={() => navigate("/parent-dashboard")}>
          <X size={20} />
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Column: Registered List */}
        <div className="lg:col-span-1 space-y-4">
          <h3 className="text-xs font-black text-indigo-600 uppercase tracking-[0.2em] px-2">Registered Students</h3>
          {students.length === 0 ? (
            <div className="bg-slate-50 border-2 border-dashed border-slate-200 rounded-3xl p-8 text-center">
              <p className="text-xs font-bold text-slate-400 uppercase">No students found</p>
            </div>
          ) : (
            students.map((s) => (
              <motion.div 
                layout
                key={s.id} 
                className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow relative group"
              >
                <Badge className="absolute top-4 right-4 bg-emerald-50 text-emerald-600 border-emerald-100 uppercase text-[9px]">
                  {s.status}
                </Badge>
                <p className="font-black text-slate-800 uppercase tracking-tight leading-none">
                  {s.firstName} {s.lastName}
                </p>
                <p className="text-[10px] font-bold text-indigo-500 mt-1 uppercase tracking-widest">{s.grade}</p>
                
                <div className="flex flex-wrap gap-1.5 mt-4">
                  {s.subjects.map((sub) => (
                    <span key={sub} className="text-[9px] font-bold bg-slate-50 text-slate-500 px-2 py-1 rounded-md border border-slate-100">
                      {sub}
                    </span>
                  ))}
                </div>
                
                <Button 
                  className="w-full mt-5 bg-slate-900 hover:bg-black text-white text-xs font-bold rounded-xl"
                  onClick={() => handleEdit(s)}
                >
                  Modify Enrollment
                </Button>
              </motion.div>
            ))
          )}
        </div>

        {/* Right Column: Registration Form */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white border border-slate-100 rounded-3xl shadow-xl overflow-hidden">
            <div className="bg-indigo-600 p-4 text-white flex justify-between items-center">
              <span className="text-xs font-black uppercase tracking-widest">
                {editingId ? "Update Student Profile" : "New Student Enrollment"}
              </span>
              {!isOpen && (
                <Button size="sm" variant="secondary" onClick={() => setIsOpen(true)} className="rounded-lg h-8 px-4 font-bold text-[10px]">
                  START REGISTRATION
                </Button>
              )}
            </div>

            <AnimatePresence>
              {isOpen && (
                <motion.form
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  onSubmit={handleSubmit}
                  className="p-8 space-y-6"
                >
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label className="text-[10px] font-black uppercase text-slate-400 ml-1">Student First Name</Label>
                      <Input className="rounded-xl border-slate-200" placeholder="Legal Name" value={firstName} onChange={(e) => setFirstName(e.target.value)} required />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-[10px] font-black uppercase text-slate-400 ml-1">Student Last Name</Label>
                      <Input className="rounded-xl border-slate-200" placeholder="Surname" value={lastName} onChange={(e) => setLastName(e.target.value)} required />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label className="text-[10px] font-black uppercase text-slate-400 ml-1">Academic Grade</Label>
                      <Select value={grade} onValueChange={(v) => { setGrade(v); setSelectedSubjects([]); }}>
                        <SelectTrigger className="rounded-xl border-slate-200"><SelectValue placeholder="Select Grade" /></SelectTrigger>
                        <SelectContent>
                          {GRADES.map((g) => <SelectItem key={g} value={g}>{g}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-[10px] font-black uppercase text-slate-400 ml-1">Curriculum</Label>
                      <Input className="rounded-xl bg-slate-50 font-bold" value="British Curriculum International" disabled />
                    </div>
                  </div>

                  {/* Dynamic Subjects based on Grade */}
                  {grade && (
                    <div className="space-y-3 pt-4 border-t border-slate-50">
                      <Label className="text-[10px] font-black uppercase text-indigo-600 tracking-[0.15em]">
                        Select Subjects for {grade}
                      </Label>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {getSubjectList().map((sub) => (
                          <label key={sub} className={`flex items-center gap-3 p-3 rounded-xl border-2 transition-all cursor-pointer ${selectedSubjects.includes(sub) ? 'bg-indigo-50 border-indigo-200' : 'bg-white border-slate-50'}`}>
                            <Checkbox 
                              checked={selectedSubjects.includes(sub)} 
                              onCheckedChange={() => toggleSubject(sub)} 
                              className="border-slate-300"
                            />
                            <span className="text-xs font-bold text-slate-600">{sub}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="flex gap-3 pt-6 border-t border-slate-50">
                    <Button type="submit" className="flex-1 h-12 bg-indigo-600 hover:bg-indigo-700 rounded-xl font-black text-xs tracking-widest shadow-lg shadow-indigo-100">
                      {editingId ? "SAVE CHANGES" : "CONFIRM ENROLLMENT"}
                    </Button>
                    <Button type="button" variant="outline" onClick={resetForm} className="h-12 rounded-xl px-6 font-black text-xs text-slate-400 border-2">
                      CANCEL
                    </Button>
                  </div>
                </motion.form>
              )}
            </AnimatePresence>
          </div>

          {/* Compliance Upload Section */}
          <div className="bg-slate-900 rounded-3xl p-8 text-white shadow-xl">
            <h4 className="text-xs font-black uppercase tracking-[0.25em] text-indigo-400 mb-4">Verification Documents</h4>
            <p className="text-xs text-slate-400 mb-6 font-medium">Please upload Student ID/Birth Certificate and most recent Academic Report for verification.</p>
            
            <div className="flex items-center gap-4">
              <Input 
                type="file" 
                multiple 
                onChange={handleUpload} 
                className="bg-slate-800 border-slate-700 text-slate-400 text-xs rounded-xl h-12 pt-3" 
              />
              {uploading && <Loader2 className="animate-spin text-indigo-400" />}
            </div>

            <div className="mt-6 flex flex-wrap gap-2">
              {docs.map((url, i) => (
                <a key={i} href={url} target="_blank" rel="noreferrer" className="flex items-center gap-2 bg-slate-800 px-3 py-2 rounded-lg text-[9px] font-bold text-indigo-300 border border-slate-700 hover:bg-slate-700 transition-colors">
                  <BookOpen size={12} /> VIEW DOCUMENT {i + 1}
                </a>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}