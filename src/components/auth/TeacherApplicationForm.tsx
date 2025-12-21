"use client";

import React, { useState, useEffect } from "react";
import { db, storage, auth } from "@/lib/firebaseConfig";
import {
  addDoc,
  collection,
  serverTimestamp,
  updateDoc,
  doc,
} from "firebase/firestore";
import {
  ref,
  uploadBytesResumable,
  getDownloadURL,
} from "firebase/storage";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { useAuth } from "@/components/auth/AuthProvider";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, X } from "lucide-react";
import { useNavigate } from "react-router-dom";

/* ============================================================
   Types
   ============================================================ */
interface Subject {
  name: string;
  curriculum: "CAPS" | "Cambridge";
}

interface FormData {
  firstName: string;
  lastName: string;
  gender: string;
  email: string;
  password: string;
  contact: string;
  address: string;
  province: string;
  country: string;
  postalCode: string;
  subjects: Subject[]; // Array of { name, curriculum }
  experience: string;
  previousSchool: string;
  ref1Name: string;
  ref1Contact: string;
  ref2Name: string;
  ref2Contact: string;
}

interface Documents {
  idDoc?: FileList | null;
  qualification?: FileList | null;
  cv?: FileList | null;
  ceta?: FileList | null;
  proofOfAddress?: FileList | null;
  policeClearance?: FileList | null;
}

/* ============================================================
   Subject Lists
   ============================================================ */
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

/* ============================================================
   Dropdown Options
   ============================================================ */
const PROVINCES = [
  "Eastern Cape",
  "Free State",
  "Gauteng",
  "KwaZulu-Natal",
  "Limpopo",
  "Mpumalanga",
  "Northern Cape",
  "North West",
  "Western Cape",
];

const COUNTRIES = ["South Africa", "Zimbabwe", "Namibia", "Botswana", "Lesotho", "Swaziland"];

/* ============================================================
   Main Component
   ============================================================ */
export default function TeacherApplicationForm() {
  const { user } = useAuth();
  const navigate = useNavigate();

  /* ---------------- State ---------------- */
  const [form, setForm] = useState<FormData>({
    firstName: "",
    lastName: "",
    gender: "",
    email: "",
    password: "",
    contact: "",
    address: "",
    province: "",
    country: "South Africa",
    postalCode: "",
    subjects: [],
    experience: "",
    previousSchool: "",
    ref1Name: "",
    ref1Contact: "",
    ref2Name: "",
    ref2Contact: "",
  });

  const [documents, setDocuments] = useState<Documents>({});
  const [progress, setProgress] = useState<Record<string, number>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [successId, setSuccessId] = useState<string | null>(null);

  /* ---------------- Auto-fill from user profile ---------------- */
  useEffect(() => {
    if (user?.displayName) {
      const [first, ...last] = user.displayName.split(" ");
      setForm((prev) => ({
        ...prev,
        firstName: first || "",
        lastName: last?.join(" ") || "",
        email: user.email || "",
      }));
    }
  }, [user]);

  /* ---------------- Handlers ---------------- */
  const handleChange = (field: keyof FormData, value: any) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const handleFileChange = (key: keyof Documents, files: FileList | null) =>
    setDocuments((prev) => ({ ...prev, [key]: files }));

  const addSubject = (name: string, curriculum: "CAPS" | "Cambridge") => {
    const exists = form.subjects.some((s) => s.name === name && s.curriculum === curriculum);
    if (name && !exists) {
      setForm((prev) => ({
        ...prev,
        subjects: [...prev.subjects, { name, curriculum }],
      }));
    }
  };

  const removeSubject = (name: string, curriculum: "CAPS" | "Cambridge") => {
    setForm((prev) => ({
      ...prev,
      subjects: prev.subjects.filter((s) => !(s.name === name && s.curriculum === curriculum)),
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      let uid = user?.uid;

      // Create account if new user
      if (!uid) {
        if (!form.email || !form.password) {
          throw new Error("Email and password are required.");
        }
        const cred = await createUserWithEmailAndPassword(auth, form.email, form.password);
        uid = cred.user.uid;
      }

      // Validate
      if (!documents.idDoc || !documents.qualification || !documents.cv || !documents.ceta) {
        throw new Error("ID, Qualification, CV, and CETA are required.");
      }
      if (form.subjects.length === 0) {
        throw new Error("Please select at least one subject.");
      }

      // Create application
      const docRef = await addDoc(collection(db, "teacherApplications"), {
        uid,
        ...form,
        references: [
          { name: form.ref1Name, contact: form.ref1Contact },
          { name: form.ref2Name, contact: form.ref2Contact },
        ],
        complianceDocs: {},
        status: "pending",
        principalReviewed: false,
        classActivated: false,
        createdAt: serverTimestamp(),
      });

      // Upload documents
      const docUrls: Record<string, string[]> = {};
      for (const [key, fileList] of Object.entries(documents)) {
        if (fileList) {
          docUrls[key] = [];
          for (const file of Array.from(fileList)) {
            const storageRef = ref(
              storage,
              `teacherApplications/${uid}/${docRef.id}/documents/${key}/${file.name}`
            );
            const uploadTask = uploadBytesResumable(storageRef, file);

            await new Promise<void>((resolve, reject) => {
              uploadTask.on(
                "state_changed",
                (snapshot) => {
                  const percent = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                  setProgress((prev) => ({ ...prev, [key]: percent }));
                },
                reject,
                async () => {
                  const url = await getDownloadURL(uploadTask.snapshot.ref);
                  docUrls[key].push(url);
                  resolve();
                }
              );
            });
          }
        }
      }

      // Update with URLs
      await updateDoc(doc(db, "teacherApplications", docRef.id), {
        complianceDocs: docUrls,
      });

      setSuccessId(docRef.id);
    } catch (err: any) {
      setError(err.message || "Submission failed.");
    } finally {
      setIsLoading(false);
    }
  };

  /* ---------------- Render ---------------- */
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-3xl shadow-xl">
        <CardHeader className="flex items-center justify-between">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/")}
            className="flex items-center gap-1"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </Button>
          <CardTitle className="text-2xl font-bold text-indigo-800">
            Teacher Application
          </CardTitle>
          <div className="w-10" />
        </CardHeader>

        <CardContent className="space-y-6">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {!successId ? (
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Personal Info */}
              <Section title="Personal Information">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <InputField label="First Name *" value={form.firstName} onChange={(v) => handleChange("firstName", v)} />
                  <InputField label="Last Name *" value={form.lastName} onChange={(v) => handleChange("lastName", v)} />
                  <SelectField
                    label="Gender"
                    value={form.gender}
                    onChange={(v) => handleChange("gender", v)}
                    options={["Male", "Female", "Other", "Prefer not to say"]}
                  />
                  <InputField label="Email *" type="email" value={form.email} onChange={(v) => handleChange("email", v)} disabled={!!user} />
                  {!user && (
                    <InputField label="Password *" type="password" value={form.password} onChange={(v) => handleChange("password", v)} />
                  )}
                  <InputField label="Contact Number *" type="tel" value={form.contact} onChange={(v) => handleChange("contact", v)} placeholder="e.g. 0821234567" />
                </div>
              </Section>

              {/* Address */}
              <Section title="Address">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <InputField label="Full Address *" value={form.address} onChange={(v) => handleChange("address", v)} />
                  <SelectField
                    label="Province *"
                    value={form.province}
                    onChange={(v) => handleChange("province", v)}
                    options={PROVINCES}
                  />
                  <SelectField
                    label="Country *"
                    value={form.country}
                    onChange={(v) => handleChange("country", v)}
                    options={COUNTRIES}
                  />
                  <InputField label="Postal Code" value={form.postalCode} onChange={(v) => handleChange("postalCode", v)} />
                </div>
              </Section>

              {/* Teaching Info */}
              <Section title="Teaching Information">
                <div className="space-y-4">
                  {/* Multi-Subject Selector */}
                  <div>
                    <Label>Subjects to Teach *</Label>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {/* CAPS Selector */}
                      <div>
                        <Select onValueChange={(name) => addSubject(name, "CAPS")}>
                          <SelectTrigger>
                            <SelectValue placeholder="Add CAPS Subject" />
                          </SelectTrigger>
                          <SelectContent>
                            {CAPS_SUBJECTS
                              .filter((s) => !form.subjects.some((sub) => sub.name === s && sub.curriculum === "CAPS"))
                              .map((subject) => (
                                <SelectItem key={subject} value={subject}>
                                  {subject} (CAPS)
                                </SelectItem>
                              ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Cambridge Selector */}
                      <div>
                        <Select onValueChange={(name) => addSubject(name, "Cambridge")}>
                          <SelectTrigger>
                            <SelectValue placeholder="Add Cambridge Subject" />
                          </SelectTrigger>
                          <SelectContent>
                            {CAMBRIDGE_SUBJECTS
                              .filter((s) => !form.subjects.some((sub) => sub.name === s && sub.curriculum === "Cambridge"))
                              .map((subject) => (
                                <SelectItem key={subject} value={subject}>
                                  {subject} (Cambridge)
                                </SelectItem>
                              ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    {/* Selected Subjects */}
                    <div className="flex flex-wrap gap-2 mt-3">
                      {form.subjects.map((sub) => (
                        <span
                          key={`${sub.name}-${sub.curriculum}`}
                          className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium ${
                            sub.curriculum === "CAPS"
                              ? "bg-green-100 text-green-800"
                              : "bg-purple-100 text-purple-800"
                          }`}
                        >
                          {sub.name}
                          <span className="text-xs opacity-75">({sub.curriculum})</span>
                          <button
                            type="button"
                            onClick={() => removeSubject(sub.name, sub.curriculum)}
                            className="ml-1"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </span>
                      ))}
                      {form.subjects.length === 0 && (
                        <p className="text-sm text-gray-500">No subjects selected</p>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <InputField label="Years of Experience" value={form.experience} onChange={(v) => handleChange("experience", v)} placeholder="e.g. 5" />
                    <InputField label="Previous School" value={form.previousSchool} onChange={(v) => handleChange("previousSchool", v)} />
                  </div>
                </div>
              </Section>

              {/* References */}
              <Section title="References">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <InputField label="Reference 1 Name" value={form.ref1Name} onChange={(v) => handleChange("ref1Name", v)} />
                  <InputField label="Reference 1 Contact" type="tel" value={form.ref1Contact} onChange={(v) => handleChange("ref1Contact", v)} />
                  <InputField label="Reference 2 Name" value={form.ref2Name} onChange={(v) => handleChange("ref2Name", v)} />
                  <InputField label="Reference 2 Contact" type="tel" value={form.ref2Contact} onChange={(v) => handleChange("ref2Contact", v)} />
                </div>
              </Section>

              {/* Documents */}
              <Section title="Required Documents">
                <div className="space-y-4 p-4 bg-blue-50 rounded-lg">
                  <FileInput label="ID / Passport *" files={documents.idDoc} onChange={(f) => handleFileChange("idDoc", f)} progress={progress.idDoc} />
                  <FileInput label="Teaching Qualification *" files={documents.qualification} onChange={(f) => handleFileChange("qualification", f)} progress={progress.qualification} />
                  <FileInput label="CV *" files={documents.cv} onChange={(f) => handleFileChange("cv", f)} progress={progress.cv} />
                  <FileInput label="CETA Certification *" files={documents.ceta} onChange={(f) => handleFileChange("ceta", f)} progress={progress.ceta} />

                  <div className="pt-4 border-t">
                    <p className="text-sm font-medium text-gray-700 mb-2">Optional</p>
                    <FileInput label="Proof of Address" files={documents.proofOfAddress} onChange={(f) => handleFileChange("proofOfAddress", f)} progress={progress.proofOfAddress} />
                    <FileInput label="Police Clearance" files={documents.policeClearance} onChange={(f) => handleFileChange("policeClearance", f)} progress={progress.policeClearance} />
                  </div>
                </div>
              </Section>

              <Button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold" disabled={isLoading}>
                {isLoading ? "Submitting Application..." : "Submit Application"}
              </Button>
            </form>
          ) : (
            <div className="p-8 bg-green-50 border-2 border-green-200 rounded-lg text-center">
              <h3 className="text-2xl font-bold text-green-800">Application Submitted!</h3>
              <p className="mt-3 text-gray-700">
                Your application ID: <strong className="text-indigo-700">{successId}</strong>
              </p>
              <p className="mt-2 text-sm text-gray-600">
                The principal will review your documents. You’ll get an email once approved.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

/* ============================================================
   Reusable Components
   ============================================================ */

/** Section wrapper */
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="text-lg font-semibold text-indigo-800 mb-3">{title}</h3>
      {children}
    </div>
  );
}

/** Input field */
function InputField({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
  disabled,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
  disabled?: boolean;
}) {
  return (
    <div>
      <Label>{label}</Label>
      <Input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        required={label.includes("*")}
      />
    </div>
  );
}

/** Select dropdown */
function SelectField({
  label,
  value,
  onChange,
  options,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: string[];
  placeholder?: string;
}) {
  return (
    <div>
      <Label>{label}</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger>
          <SelectValue placeholder={placeholder || `Select ${label.replace("*", "")}`} />
        </SelectTrigger>
        <SelectContent>
          {options.map((opt) => (
            <SelectItem key={opt} value={opt}>
              {opt}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

/** File input with progress */
function FileInput({
  label,
  files,
  onChange,
  progress,
}: {
  label: string;
  files?: FileList | null;
  onChange: (files: FileList | null) => void;
  progress?: number;
}) {
  return (
    <div>
      <Label>{label}</Label>
      <Input type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={(e) => onChange(e.target.files)} />
      {files && (
        <p className="text-xs text-gray-600 mt-1">
          {Array.from(files).map((f) => f.name).join(", ")}
        </p>
      )}
      {progress !== undefined && progress > 0 && progress < 100 && (
        <p className="text-xs text-blue-600 mt-1">Uploading... {progress.toFixed(0)}%</p>
      )}
      {progress === 100 && <p className="text-xs text-green-600 mt-1">Upload complete</p>}
    </div>
  );
}