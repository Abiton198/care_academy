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
import { ref, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";
import { useAuth } from "@/components/auth/AuthProvider";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, X, Trash2, Check, Globe, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
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
  curriculum: "CAPS" | "Cambridge";
  subjects: string[];
  status?: string;
}

/* ───────────────────────── CONSTANTS ───────────────────────── */
const GRADES = [
  "Grade 1",
  "Grade 2",
  "Grade 3",
  "Grade 4",
  "Grade 5",
  "Grade 6",
  "Grade 7",
  "Grade 8",
  "Grade 9",
  "Grade 10",
  "Grade 11",
  "Grade 12",
];

const CURRICULUM_SUBJECTS = {
  CAPS: [
    "Mathematics",
    "Physical Sciences",
    "Life Sciences",
    "Accounting",
    "Business Studies",
    "Economics",
    "English Home Language",
    "English First Additional Language",
    "Afrikaans First Additional Language",
    "Geography",
    "History",
  ],
  Cambridge: [
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
  ],
} as const;

/* ───────────────────────── COMPONENT ───────────────────────── */
export default function RegistrationSection() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [students, setStudents] = useState<Student[]>([]);
  const [docs, setDocs] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [grade, setGrade] = useState("");
  const [curriculum, setCurriculum] = useState<"CAPS" | "Cambridge">("CAPS");
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  /* ───────────────────────── FETCH DATA ───────────────────────── */
  useEffect(() => {
    if (!user?.uid) return;

    let unsub: () => void;

    const load = async () => {
      const parentSnap = await getDoc(doc(db, "parents", user.uid));
      if (parentSnap.exists()) {
        setDocs(parentSnap.data().complianceDocs || []);
      }

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
    };

    load();
    return () => unsub && unsub();
  }, [user]);

  /* ───────────────────────── FILE UPLOAD ───────────────────────── */
  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!user?.uid || !e.target.files) return;
    setUploading(true);

    const urls: string[] = [];
    for (const file of Array.from(e.target.files)) {
      const storageRef = ref(
        storage,
        `parents/${user.uid}/docs/${file.name}`
      );
      await uploadBytes(storageRef, file);
      urls.push(await getDownloadURL(storageRef));
    }

    const updated = [...docs, ...urls];
    await updateDoc(doc(db, "parents", user.uid), {
      complianceDocs: updated,
    });
    setDocs(updated);
    setUploading(false);
  };

  /* ───────────────────────── SAVE STUDENT ───────────────────────── */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!grade || selectedSubjects.length === 0) {
      alert("Please select grade and at least one subject.");
      return;
    }

    const data = {
      firstName,
      lastName,
      grade,
      curriculum,
      subjects: selectedSubjects,
      updatedAt: serverTimestamp(),
    };

    if (editingId) {
      await setDoc(doc(db, "students", editingId), data, { merge: true });
    } else {
      const id = `student-${Date.now()}`;
      await setDoc(doc(db, "students", id), {
        ...data,
        parentId: user?.uid,
        parentEmail: user?.email,
        status: "pending",
        createdAt: serverTimestamp(),
      });
    }

    resetForm();
  };

  /* ───────────────────────── EDIT ───────────────────────── */
  const handleEdit = (s: Student) => {
    setFirstName(s.firstName);
    setLastName(s.lastName);
    setGrade(s.grade);
    setCurriculum(s.curriculum);
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
    setCurriculum("CAPS");
    setSelectedSubjects([]);
    setEditingId(null);
    setIsOpen(false);
  };

  if (loading) return <p className="text-center p-4">Loading…</p>;

  /* ───────────────────────── RENDER ───────────────────────── */
  return (
    <div className="max-w-4xl mx-auto p-4 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center border-b pb-2">
        <button onClick={() => navigate(-1)} className="flex gap-1">
          <ArrowLeft size={18} /> Back
        </button>
        <button onClick={() => navigate("/parent-dashboard")}>
          <X size={20} />
        </button>
      </div>

      {/* Students */}
      <div>
        <h3 className="font-semibold mb-2">Registered Students</h3>
        {students.map((s) => (
          <div key={s.id} className="border rounded p-3 mb-3 bg-gray-50">
            <p className="font-semibold">
              {s.firstName} {s.lastName} – {s.grade}
            </p>
            <p className="text-xs">{s.curriculum}</p>
            <div className="flex flex-wrap gap-1 mt-1">
              {s.subjects.map((sub) => (
                <span key={sub} className="text-xs bg-indigo-100 px-2 rounded">
                  {sub}
                </span>
              ))}
            </div>
            <Button
              size="sm"
              variant="outline"
              className="mt-2"
              onClick={() => handleEdit(s)}
            >
              Edit
            </Button>
          </div>
        ))}
      </div>

      {/* Form */}
      <div className="border rounded p-4 bg-white">
        <Button variant="outline" onClick={() => setIsOpen(!isOpen)}>
          {isOpen ? "Close" : "Register Student"}
        </Button>

        <AnimatePresence>
          {isOpen && (
            <motion.form
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onSubmit={handleSubmit}
              className="space-y-4 mt-4"
            >
              <Input
                placeholder="First Name"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                required
              />
              <Input
                placeholder="Last Name"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                required
              />

              {/* Grade */}
              <Select value={grade} onValueChange={setGrade}>
                <SelectTrigger>
                  <SelectValue placeholder="Select Grade" />
                </SelectTrigger>
                <SelectContent>
                  {GRADES.map((g) => (
                    <SelectItem key={g} value={g}>
                      {g}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Curriculum */}
              <Select
                value={curriculum}
                onValueChange={(v) => {
                  setCurriculum(v as "CAPS" | "Cambridge");
                  setSelectedSubjects([]);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select Curriculum" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="CAPS">CAPS</SelectItem>
                  <SelectItem value="Cambridge">Cambridge</SelectItem>
                </SelectContent>
              </Select>

              {/* Subjects */}
              <div className="grid grid-cols-2 gap-2">
                {CURRICULUM_SUBJECTS[curriculum].map((sub) => (
                  <label key={sub} className="flex items-center gap-2">
                    <Checkbox
                      checked={selectedSubjects.includes(sub)}
                      onCheckedChange={() => toggleSubject(sub)}
                    />
                    <span className="text-sm">{sub}</span>
                  </label>
                ))}
              </div>

              <Button type="submit">
                {editingId ? "Update Student" : "Save Student"}
              </Button>
            </motion.form>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
