// components/teacher/TeacherApplicationForm.tsx
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { X } from "lucide-react";

interface Subject {
  name: string;
  curriculum: "CAPS" | "Cambridge";
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
  ceta?: FileList | null;
  proofOfAddress?: FileList | null;
  policeClearance?: FileList | null;
}

interface TeacherApplicationFormProps {
  applicationId?: string | null;
  onClose: () => void;
  onSubmitted?: () => void;
}

const CAPS_SUBJECTS = [
  "Mathematics",
  "Physical Sciences",
  "Life Sciences",
  "Accounting",
  "Business Studies",
  "Economics",
  "Geography",
  "History",
  "English Home Language",
  "Afrikaans First Additional Language",
];

const CAMBRIDGE_SUBJECTS = [
  "Mathematics",
  "Physics",
  "Chemistry",
  "Biology",
  "Computer Science",
  "Information Technology",
  "Business",
  "Economics",
  "Geography",
  "History",
  "English Language",
];

export default function TeacherApplicationForm({
  applicationId,
  onClose,
  onSubmitted,
}: TeacherApplicationFormProps) {
  const { user } = useAuth();

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

  useEffect(() => {
    if (user?.email) {
      setForm((prev) => ({ ...prev, email: user.email || "" }));
    }
  }, [user]);

  const handleChange = (key: keyof FormData, value: any) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const handleFileChange = (key: keyof Documents, files: FileList | null) =>
    setDocuments((prev) => ({ ...prev, [key]: files }));

  const addSubject = (subject: string, curriculum: "CAPS" | "Cambridge") => {
    if (!form.subjects.some((s) => s.name === subject && s.curriculum === curriculum)) {
      setForm((prev) => ({
        ...prev,
        subjects: [...prev.subjects, { name: subject, curriculum }],
      }));
    }
  };

  const removeSubject = (name: string, curriculum: "CAPS" | "Cambridge") => {
    setForm((prev) => ({
      ...prev,
      subjects: prev.subjects.filter(
        (s) => !(s.name === name && s.curriculum === curriculum)
      ),
    }));
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!user) return;

    setError("");
    setLoading(true);

    try {
      let appRef: any;

      if (applicationId) {
        appRef = doc(db, "teacherApplications", applicationId);
        await updateDoc(appRef, {
          personalInfo: form,
          subjects: form.subjects,
          updatedAt: serverTimestamp(),
        });
      } else {
        appRef = await addDoc(collection(db, "teacherApplications"), {
          uid: user.uid,
          email: user.email,
          personalInfo: form,
          subjects: form.subjects,
          status: "pending",
          createdAt: serverTimestamp(),
        });
      }

      // Upload documents
      const uploadedDocs: Record<string, string[]> = {};
      for (const [key, fileList] of Object.entries(documents)) {
        if (!fileList || fileList.length === 0) continue;
        uploadedDocs[key] = [];

        for (const file of Array.from(fileList)) {
          const fileRef = ref(
            storage,
            `teacherApplications/${user.uid}/${appRef.id}/${key}/${file.name}`
          );
          const uploadTask = uploadBytesResumable(fileRef, file);

          await new Promise<void>((resolve, reject) => {
            uploadTask.on(
              "state_changed",
              () => {},
              reject,
              async () => {
                const url = await getDownloadURL(uploadTask.snapshot.ref);
                uploadedDocs[key].push(url);
                resolve();
              }
            );
          });
        }
      }

      if (Object.keys(uploadedDocs).length > 0) {
        await updateDoc(appRef, { documents: uploadedDocs });
      }

      setSuccess(true);
      onSubmitted?.();
    } catch (err: any) {
      setError(err.message || "Submission failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-4xl max-h-[90vh] overflow-y-auto bg-white">
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle className="text-2xl text-indigo-700">
            Teacher Application Form
          </CardTitle>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="w-5 h-5" />
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {success ? (
          <div className="text-center py-10 bg-green-50 rounded-lg">
            <h3 className="text-2xl font-bold text-green-700">
              Application Submitted Successfully!
            </h3>
            <p className="mt-4 text-gray-600">
              Thank you! Your application is now under review.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Personal Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>First Name *</Label>
                <Input
                  value={form.firstName}
                  onChange={(e) => handleChange("firstName", e.target.value)}
                  required
                />
              </div>
              <div>
                <Label>Last Name *</Label>
                <Input
                  value={form.lastName}
                  onChange={(e) => handleChange("lastName", e.target.value)}
                  required
                />
              </div>
            </div>

            <div>
              <Label>Email</Label>
              <Input value={form.email} disabled />
            </div>

            <div>
              <Label>Years of Experience *</Label>
              <Input
                type="number"
                min="0"
                value={form.yearsOfExperience || ""}
                onChange={(e) =>
                  handleChange("yearsOfExperience", parseInt(e.target.value) || 0)
                }
                required
              />
            </div>

            <div>
              <Label>Grade Phase *</Label>
              <Select
                value={form.gradePhase}
                onValueChange={(v: "Primary" | "Secondary") =>
                  handleChange("gradePhase", v)
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select phase" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Primary">Primary</SelectItem>
                  <SelectItem value="Secondary">Secondary</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Subjects */}
            <div className="space-y-4">
              <div>
                <Label>Add CAPS Subject</Label>
                <Select onValueChange={(v) => addSubject(v, "CAPS")}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select CAPS subject" />
                  </SelectTrigger>
                  <SelectContent>
                    {CAPS_SUBJECTS.map((sub) => (
                      <SelectItem key={sub} value={sub}>
                        {sub}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Add Cambridge Subject</Label>
                <Select onValueChange={(v) => addSubject(v, "Cambridge")}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select Cambridge subject" />
                  </SelectTrigger>
                  <SelectContent>
                    {CAMBRIDGE_SUBJECTS.map((sub) => (
                      <SelectItem key={sub} value={sub}>
                        {sub}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {form.subjects.length > 0 && (
                <div>
                  <Label>Selected Subjects</Label>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {form.subjects.map((s) => (
                      <span
                        key={`${s.name}-${s.curriculum}`}
                        className="inline-flex items-center gap-2 bg-indigo-100 text-indigo-800 px-3 py-1 rounded-full text-sm"
                      >
                        {s.name} ({s.curriculum})
                        <button
                          type="button"
                          onClick={() => removeSubject(s.name, s.curriculum)}
                          className="hover:text-indigo-900"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Documents */}
            <div className="space-y-4">
              <div>
                <Label>ID Document (PDF/Image)</Label>
                <Input
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png"
                  onChange={(e) => handleFileChange("idDoc", e.target.files)}
                />
              </div>
              <div>
                <Label>Qualification Certificate</Label>
                <Input
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png"
                  onChange={(e) => handleFileChange("qualification", e.target.files)}
                />
              </div>
              <div>
                <Label>CV/Resume</Label>
                <Input
                  type="file"
                  accept=".pdf,.doc,.docx"
                  onChange={(e) => handleFileChange("cv", e.target.files)}
                />
              </div>
              {/* Add more optional docs as needed */}
            </div>

            <div className="flex gap-4 pt-4">
              <Button type="submit" disabled={loading} className="flex-1">
                {loading ? "Submitting..." : "Submit Application"}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => handleSubmit()}
                disabled={loading}
                className="flex-1"
              >
                Save Draft
              </Button>
            </div>
          </form>
        )}
      </CardContent>
    </Card>
  );
}