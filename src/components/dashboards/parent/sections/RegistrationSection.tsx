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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { motion, AnimatePresence } from "framer-motion";

// Firestore & Storage
import { db, storage } from "@/lib/firebaseConfig";

// ──────────────────────────────────────────────────────────────
// TYPES
// ──────────────────────────────────────────────────────────────
interface Student {
  id?: string;
  firstName: string;
  lastName: string;
  grade: string;
  curriculum: "CAPS" | "Cambridge";
  subjects?: string[];
  status?: string;
}

// ──────────────────────────────────────────────────────────────
// SUBJECTS BY CURRICULUM
// ──────────────────────────────────────────────────────────────
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
    "Afrikaans Eerste Addisionele Taal",
    "Afrikaans Tweede Addisionele Taal",
    "Geography",
    "History",
    "Dramatic Arts",
  ],
  Cambridge: [
    "Mathematics (IGCSE)",
    "Physics (IGCSE)",
    "Chemistry (IGCSE)",
    "Biology (IGCSE)",
    "Computer Science (IGCSE)",
    "English Language (IGCSE)",
    "English Literature (IGCSE)",
    "Business Studies (IGCSE)",
    "Economics (IGCSE)",
    "Accounting (IGCSE)",
    "Geography (IGCSE)",
    "History (IGCSE)",
    "Drama (IGCSE)",
  ],
} as const;

// ──────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ──────────────────────────────────────────────────────────────
export default function RegistrationSection() {
  const { user } = useAuth();
  const navigate = useNavigate();

  // ──────────────────────────────────────────────────────────
  // STATE
  // ──────────────────────────────────────────────────────────
  const [loading, setLoading] = useState(true);
  const [students, setStudents] = useState<Student[]>([]);
  const [docs, setDocs] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);

  // Form state
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [grade, setGrade] = useState("");
  const [curriculum, setCurriculum] = useState<"CAPS" | "Cambridge">("CAPS");
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  // ──────────────────────────────────────────────────────────
  // FETCH DATA: Students + Parent Docs (real-time)
  // ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!user?.uid) return;

    let unsubscribe: () => void;

    const fetchData = async () => {
      try {
        // Fetch parent compliance documents (one-time)
        const parentDoc = await getDoc(doc(db, "parents", user.uid));
        if (parentDoc.exists()) {
          setDocs(parentDoc.data().complianceDocs || []);
        }

        // Real-time listener for students
        const q = query(collection(db, "students"), where("parentId", "==", user.uid));
        unsubscribe = onSnapshot(q, (snap) => {
          const list: Student[] = snap.docs.map((d) => ({
            id: d.id,
            ...(d.data() as Student),
          }));
          setStudents(list);
          setLoading(false);
        });
      } catch (err) {
        console.error("Error fetching data:", err);
        setLoading(false);
      }
    };

    fetchData();

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [user]);

  // ──────────────────────────────────────────────────────────
  // UPLOAD COMPLIANCE DOCUMENTS
  // ──────────────────────────────────────────────────────────
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!user?.uid || !e.target.files) return;
    setUploading(true);

    try {
      const newUrls: string[] = [];
      for (const file of Array.from(e.target.files)) {
        const storageRef = ref(storage, `parents/${user.uid}/documents/${file.name}`);
        await uploadBytes(storageRef, file);
        const url = await getDownloadURL(storageRef);
        newUrls.push(url);
      }

      const updated = [...docs, ...newUrls];
      await updateDoc(doc(db, "parents", user.uid), { complianceDocs: updated });
      setDocs(updated);
    } catch (err) {
      console.error("Upload failed:", err);
      alert("Upload failed. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  // ──────────────────────────────────────────────────────────
  // DELETE DOCUMENT
  // ──────────────────────────────────────────────────────────
  const handleDeleteDoc = async (url: string) => {
    if (!user?.uid) return;
    try {
      const pathStart = url.indexOf("/o/") + 3;
      const pathEnd = url.indexOf("?");
      const fullPath = decodeURIComponent(url.substring(pathStart, pathEnd));
      await deleteObject(ref(storage, fullPath));

      const updated = docs.filter((d) => d !== url);
      await updateDoc(doc(db, "parents", user.uid), { complianceDocs: updated });
      setDocs(updated);
    } catch (err) {
      console.error("Delete failed:", err);
      alert("Delete failed. Please try again.");
    }
  };

  // ──────────────────────────────────────────────────────────
  // SAVE / UPDATE STUDENT
  // ──────────────────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.uid || selectedSubjects.length === 0) {
      alert("Please select a curriculum and at least one subject.");
      return;
    }

    try {
      const studentData = {
        firstName,
        lastName,
        grade,
        curriculum,
        subjects: selectedSubjects,
        updatedAt: serverTimestamp(),
      };

      if (editingId) {
        // Update existing student
        await setDoc(doc(db, "students", editingId), studentData, { merge: true });
      } else {
        // Create new student
        const studentId = `student-${Date.now()}`;
        await setDoc(doc(db, "students", studentId), {
          ...studentData,
          parentId: user.uid,
          parentEmail: user.email,
          status: "pending",
          principalReviewed: false,
          createdAt: serverTimestamp(),
        });
      }

      // Reset form
      resetForm();
    } catch (err) {
      console.error("Save failed:", err);
      alert("Save failed. Please try again.");
    }
  };

  // ──────────────────────────────────────────────────────────
  // EDIT STUDENT
  // ──────────────────────────────────────────────────────────
  const handleEdit = (s: Student) => {
    setFirstName(s.firstName);
    setLastName(s.lastName);
    setGrade(s.grade);
    setCurriculum(s.curriculum || "CAPS"); // fallback
    setSelectedSubjects(s.subjects || []);
    setEditingId(s.id || null);
    setIsOpen(true);
  };

  // ──────────────────────────────────────────────────────────
  // TOGGLE SUBJECT SELECTION
  // ──────────────────────────────────────────────────────────
  const toggleSubject = (value: string) => {
    setSelectedSubjects((prev) =>
      prev.includes(value) ? prev.filter((s) => s !== value) : [...prev, value]
    );
  };

  // ──────────────────────────────────────────────────────────
  // RESET FORM
  // ──────────────────────────────────────────────────────────
  const resetForm = () => {
    setFirstName("");
    setLastName("");
    setGrade("");
    setCurriculum("CAPS");
    setSelectedSubjects([]);
    setEditingId(null);
    setIsOpen(false);
  };

  // ──────────────────────────────────────────────────────────
  // LOADING STATE
  // ──────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="p-4 text-center">
        <p className="text-gray-600">Loading registration...</p>
      </div>
    );
  }

  // ──────────────────────────────────────────────────────────
  // RENDER
  // ──────────────────────────────────────────────────────────
  return (
    <div className="p-4 space-y-6 max-w-4xl mx-auto">
      {/* ── Navigation ── */}
      <div className="sticky top-0 z-10 bg-white border-b flex justify-between items-center px-2 py-2 mb-4">
        <button onClick={() => navigate(-1)} className="flex items-center gap-1 text-gray-600 hover:text-black">
          <ArrowLeft size={18} /> Back
        </button>
        <button onClick={() => navigate("/parent-dashboard")} className="text-gray-600 hover:text-red-600">
          <X size={20} />
        </button>
      </div>

      {/* ── Registered Students List ── */}
      <div>
        <h3 className="text-lg font-semibold mb-3">Registered Students</h3>
        {students.length === 0 ? (
          <p className="text-gray-600 italic">No students registered yet.</p>
        ) : (
          <ul className="space-y-4">
            {students.map((s) => (
              <motion.li
                key={s.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className="border rounded-lg p-4 bg-gradient-to-r from-blue-50 to-indigo-50 shadow-sm"
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    {/* Student Name + Curriculum Badge */}
                    <p className="font-semibold text-lg">
                      <span className="inline-flex items-center gap-1 text-xs font-bold text-white bg-gradient-to-r from-purple-600 to-indigo-600 px-2 py-1 rounded-full mr-2">
                        {s.curriculum === "CAPS" ? <BookOpen size={12} /> : <Globe size={12} />}
                        {s.curriculum}
                      </span>
                      {s.firstName} {s.lastName}
                      <span className="text-sm font-normal text-gray-600 ml-2">– {s.grade}</span>
                    </p>

                    {/* Status */}
                    <p className="text-xs text-gray-500 italic">Status: {s.status || "pending"}</p>

                    {/* Selected Subjects */}
                    {s.subjects && s.subjects.length > 0 ? (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {s.subjects.map((sub) => (
                          <span
                            key={sub}
                            className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-indigo-700 bg-indigo-100 rounded-full"
                          >
                            <Check size={12} />
                            {sub}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-gray-500 mt-1">No subjects selected</p>
                    )}
                  </div>

                  {/* Edit Button */}
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleEdit(s)}
                    className="border-indigo-300 text-indigo-700 hover:bg-indigo-50"
                  >
                    Edit
                  </Button>
                </div>
              </motion.li>
            ))}
          </ul>
        )}
      </div>

      {/* ── Registration Form ── */}
      <div className="border rounded-lg p-4 bg-white shadow">
        {/* Toggle Header */}
        <div
          className="flex items-center justify-between cursor-pointer select-none"
          onClick={() => setIsOpen(!isOpen)}
        >
          <h3 className="text-lg font-semibold">
            {editingId ? "Edit Student" : "Register New Student"}
          </h3>
          <Button type="button" variant="outline" className="text-sm" onClick={() => setIsOpen(!isOpen)}>
            {isOpen ? "− Close Form" : "+ Open Form"}
          </Button>
        </div>

        {/* Collapsible Form */}
        <AnimatePresence initial={false}>
          {isOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="overflow-hidden mt-4"
            >
              <form onSubmit={handleSubmit} className="space-y-5">
                {/* Name Fields */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label>First Name</Label>
                    <Input value={firstName} onChange={(e) => setFirstName(e.target.value)} required />
                  </div>
                  <div>
                    <Label>Last Name</Label>
                    <Input value={lastName} onChange={(e) => setLastName(e.target.value)} required />
                  </div>
                </div>

                {/* Grade */}
                <div>
                  <Label>Grade / Form</Label>
                  <Input
                    value={grade}
                    onChange={(e) => setGrade(e.target.value)}
                    placeholder="e.g., Grade 10, Form 4"
                    required
                  />
                </div>

                {/* Curriculum Selector */}
                <div>
                  <Label>Curriculum <span className="text-red-500">*</span></Label>
                  <Select
                    value={curriculum}
                    onValueChange={(v) => {
                      const newCurr = v as "CAPS" | "Cambridge";
                      setCurriculum(newCurr);
                      setSelectedSubjects([]); // Reset subjects on change
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Choose curriculum" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="CAPS">
                        <div className="flex items-center gap-2">
                          <BookOpen size={16} /> CAPS (South Africa)
                        </div>
                      </SelectItem>
                      <SelectItem value="Cambridge">
                        <div className="flex items-center gap-2">
                          <Globe size={16} /> Cambridge IGCSE / AS-Level
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Dynamic Subjects List */}
                <div>
                  <Label className="mb-2 block">
                    Select Subjects <span className="text-red-500">*</span>
                  </Label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-64 overflow-y-auto p-3 bg-gray-50 rounded-lg border">
                    {/* SAFE RENDER: fallback to empty array */}
                    {(CURRICULUM_SUBJECTS[curriculum] || []).map((sub) => (
                      <label
                        key={sub}
                        className="flex items-center space-x-2 cursor-pointer p-2 rounded hover:bg-white transition"
                      >
                        <Checkbox
                          checked={selectedSubjects.includes(sub)}
                          onCheckedChange={() => toggleSubject(sub)}
                        />
                        <span className="text-sm font-medium">{sub}</span>
                      </label>
                    ))}
                  </div>
                  {selectedSubjects.length === 0 && (
                    <p className="text-xs text-red-600 mt-1">Please select at least one subject</p>
                  )}
                </div>

                {/* Submit / Cancel */}
                <div className="flex gap-3">
                  <Button
                    type="submit"
                    className="bg-green-600 hover:bg-green-700"
                    disabled={selectedSubjects.length === 0}
                  >
                    {editingId ? "Update Student" : "Register Student"}
                  </Button>
                  {editingId && (
                    <Button type="button" variant="outline" onClick={resetForm}>
                      Cancel
                    </Button>
                  )}
                </div>
              </form>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── Compliance Documents ── */}
      <div className="mt-6">
        <h3 className="text-lg font-semibold mb-3">Compliance Documents</h3>
        {docs.length === 0 ? (
          <p className="text-sm text-gray-500">No documents uploaded.</p>
        ) : (
          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {docs.map((url, i) => {
              const isImage = url.match(/\.(jpg|jpeg|png|gif)$/i);
              return (
                <li key={i} className="p-2 border rounded bg-gray-50 flex flex-col items-center relative">
                  {isImage ? (
                    <img src={url} alt={`Document ${i + 1}`} className="max-h-32 object-cover rounded" />
                  ) : (
                    <div className="text-gray-600 text-sm">Document {i + 1}</div>
                  )}
                  <a
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 text-sm mt-1 hover:underline"
                  >
                    View / Download
                  </a>
                  <button
                    onClick={() => handleDeleteDoc(url)}
                    className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded hover:bg-red-600"
                  >
                    <Trash2 size={14} />
                  </button>
                </li>
              );
            })}
          </ul>
        )}

        {/* Upload New */}
        <div className="mt-4">
          <label className="block font-semibold mb-2">Upload New Documents</label>
          <input
            type="file"
            multiple
            onChange={handleFileUpload}
            disabled={uploading}
            className="block w-full border p-2 rounded text-sm"
          />
          {uploading && <p className="text-sm text-gray-500 mt-1">Uploading...</p>}
        </div>
      </div>
    </div>
  );
}