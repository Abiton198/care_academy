"use client";

import React, { useEffect, useState } from "react";
import { db, auth, getAuth } from "@/lib/firebaseConfig";
import {
  collection,
  onSnapshot,
  doc,
  updateDoc,
  serverTimestamp,
  getDoc,
} from "firebase/firestore";
import { getStorage, ref, listAll, getDownloadURL } from "firebase/storage";

import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { useAuth } from "@/components/auth/AuthProvider";
import { useNavigate } from "react-router-dom";
import TimetableManager from "@/lib/TimetableManager";
import { LogOut, Search, Eye, Download, AlertCircle, Users, CheckCircle, DollarSign, ChevronDown, ChevronUp } from "lucide-react";

/* ---------------- Types ---------------- */
interface ParentProfile {
  id: string;
  name?: string;
  email?: string;
  phone?: string;
  address?: string;
  occupation?: string;
}

interface Student {
  id: string;
  firstName?: string;
  lastName?: string;
  grade?: string;
  parentEmail?: string;
  parentId?: string;
  subjects?: string[];
  status?: "pending" | "enrolled" | "rejected" | "suspended";
  curriculum?: "CAPS" | "Cambridge";
}

interface Teacher {
  id: string;
  uid?: string;
  personalInfo?: {
    firstName?: string;
    lastName?: string;
    email?: string;
    yearsOfExperience?: number;
    gradePhase?: "Primary" | "Secondary";
  };
  subjects?: { name: string; curriculum: "CAPS" | "Cambridge" }[];
  status?: "pending" | "approved" | "rejected";
  documents?: Record<string, string[]>;
}

interface DocumentFile {
  name: string;
  url: string;
  type: string; // e.g., "idDoc", "cv", etc.
}

/* ---------------- Component ---------------- */
const PrincipalDashboard: React.FC = () => {
  const [students, setStudents] = useState<Student[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [documents, setDocuments] = useState<DocumentFile[]>([]);
  const [loadingDocs, setLoadingDocs] = useState(false);

  const [searchTerm, setSearchTerm] = useState("");
  const [gradeFilter, setGradeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [curriculumFilter, setCurriculumFilter] = useState<"all" | "CAPS" | "Cambridge">("all");

  const [timetableExpanded, setTimetableExpanded] = useState(false);

  const [selectedItem, setSelectedItem] = useState<Student | Teacher | null>(null);
  const [selectedType, setSelectedType] = useState<"student" | "teacher" | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [activeTab, setActiveTab] = useState<"Details" | "Documents">("Details");

  const [parentProfile, setParentProfile] = useState<ParentProfile | null>(null);
  
  const auth = getAuth();
  const principalName = auth.currentUser?.displayName || "Principal";
  
  const { logout } = useAuth();
  const navigate = useNavigate();
  auth.currentUser?.getIdToken(true); // Forces refresh
  
  /* ---------------- Firestore Listeners ---------------- */
  useEffect(() => {
    // Students
    const unsubStudents = onSnapshot(collection(db, "students"), (snap) => {
      setStudents(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Student) })));
    });
    
    // Teacher Applications
    const unsubTeachers = onSnapshot(collection(db, "teacherApplications"), (snap) => {
      setTeachers(
        snap.docs.map((d) => ({
          id: d.id,
          ...(d.data() as Teacher),
        }))
      );
    });
    
    return () => {
      unsubStudents();
      unsubTeachers();
    };
  }, []);

  /* ---------------- Approve / Reject ---------------- */
  const approveStudent = async (studentId: string) => {
    await updateDoc(doc(db, "students", studentId), {
      status: "enrolled",
      reviewedAt: serverTimestamp(),
    });
    closeModal();
  };

  const approveTeacher = async (teacherId: string) => {
    await updateDoc(doc(db, "teacherApplications", teacherId), {
      status: "approved",
      reviewedAt: serverTimestamp(),
    });
    closeModal();
  };

  const reject = async (collectionName: "students" | "teacherApplications", id: string) => {
    await updateDoc(doc(db, collectionName, id), {
      status: "rejected",
      reviewedAt: serverTimestamp(),
    });
    closeModal();
  };

  /* ---------------- Fetch Documents (Fixed for Teachers) ---------------- */
  const fetchDocuments = async (type: "student" | "teacher", item: Student | Teacher) => {
  setLoadingDocs(true);
  setDocuments([]);

  try {
    const storage = getStorage();

    if (type === "student") {
      // Existing student path
      const pathRef = ref(storage, `registrations/${item.id}/documents`);
      const result = await listAll(pathRef);
      const files = await Promise.all(
        result.items.map(async (itemRef) => ({
          name: itemRef.name,
          url: await getDownloadURL(itemRef),
          type: "general",
        }))
      );
      setDocuments(files);
    }

    if (type === "teacher" && "uid" in item && item.uid) {
      const teacher = item as Teacher;
      const basePath = `teacherApplications/${teacher.uid}/${teacher.id}`; // uid first, then appId

      // Known document types from your form
      const docTypes = ["idDoc", "qualification", "cv", "ceta", "proofOfAddress", "policeClearance"];

      const allFiles: DocumentFile[] = [];

      for (const docType of docTypes) {
        try {
          const folderRef = ref(storage, `${basePath}/${docType}`);
          const listResult = await listAll(folderRef);

          if (listResult.items.length === 0) continue;

          for (const fileRef of listResult.items) {
            allFiles.push({
              name: fileRef.name,
              url: await getDownloadURL(fileRef),
              type: docType,
            });
          }
        } catch (err: any) {
          // Folder empty or doesn't exist (optional doc) — safe to ignore
          if (err.code !== 'storage/object-not-found') {
            console.warn(`No files in ${docType} or access issue:`, err);
          }
        }
      }

      setDocuments(allFiles);
    }
  } catch (err) {
    console.error("Failed to load documents:", err);
    setDocuments([]);
  } finally {
    setLoadingDocs(false);
  }
};

  /* ---------------- Open Modal ---------------- */
  const openModal = async (item: Student | Teacher, type: "student" | "teacher") => {
    setSelectedItem(item);
    setSelectedType(type);
    setShowModal(true);
    setActiveTab("Details");
    setDocuments([]);
    setParentProfile(null);

    if (type === "student") {
      await fetchDocuments("student", item);
      if ((item as Student).parentId) {
        const parentSnap = await getDoc(doc(db, "parents", (item as Student).parentId!));
        if (parentSnap.exists()) {
          setParentProfile({ id: parentSnap.id, ...(parentSnap.data() as ParentProfile) });
        }
      }
    }

    if (type === "teacher") {
      await fetchDocuments("teacher", item);
    }
  };

  const closeModal = () => {
    setShowModal(false);
    setSelectedItem(null);
    setSelectedType(null);
    setDocuments([]);
    setParentProfile(null);
  };

  const handleLogout = async () => {
    await logout();
    navigate("/");
  };

  /* ---------------- Filters ---------------- */
  const filteredStudents = students.filter((s) => {
    const name = `${s.firstName ?? ""} ${s.lastName ?? ""}`.toLowerCase();
    const matchesSearch = name.includes(searchTerm.toLowerCase());
    const matchesGrade = gradeFilter === "all" || s.grade === gradeFilter;
    const matchesStatus = statusFilter === "all" || s.status === statusFilter;
    const matchesCurriculum = curriculumFilter === "all" || s.curriculum === curriculumFilter;
    return matchesSearch && matchesGrade && matchesStatus && matchesCurriculum;
  });

  const filteredTeachers = teachers.filter((t) => {
    const name = `${t.personalInfo?.firstName ?? ""} ${t.personalInfo?.lastName ?? ""}`.toLowerCase();
    const email = (t.personalInfo?.email ?? "").toLowerCase();
    return name.includes(searchTerm.toLowerCase()) || email.includes(searchTerm.toLowerCase());
  });

  /* ---------------- Render ---------------- */
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-4xl font-bold text-indigo-800">Principal Dashboard</h1>
          <Button variant="destructive" onClick={handleLogout}>
            <LogOut className="w-4 h-4 mr-2" /> Logout
          </Button>
        </div>

        {/* Search & Filters */}
        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                <Input
                  placeholder="Search students or teachers..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={gradeFilter} onValueChange={setGradeFilter}>
                <SelectTrigger className="w-48"><SelectValue placeholder="Grade" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Grades</SelectItem>
                  {["Grade 1","Grade 2","Grade 3","Grade 4","Grade 5","Grade 6","Grade 7","Grade 8","Grade 9","Grade 10","Grade 11","Grade 12"].map(g => (
                    <SelectItem key={g} value={g}>{g}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-48"><SelectValue placeholder="Status" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="enrolled">Enrolled</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card className="bg-orange-500 text-white">
            <CardContent className="p-6 flex items-center justify-between">
              <div>
                <p className="text-lg">Pending Reviews</p>
                <p className="text-3xl font-bold">
                  {students.filter(s => s.status === "pending").length + teachers.filter(t => t.status === "pending").length}
                </p>
              </div>
              <AlertCircle className="w-10 h-10 opacity-80" />
            </CardContent>
          </Card>
          <Card className="bg-green-600 text-white">
            <CardContent className="p-6 flex items-center justify-between">
              <div>
                <p className="text-lg">Total Students</p>
                <p className="text-3xl font-bold">{students.length}</p>
              </div>
              <Users className="w-10 h-10 opacity-80" />
            </CardContent>
          </Card>
          <Card className="bg-blue-600 text-white">
            <CardContent className="p-6 flex items-center justify-between">
              <div>
                <p className="text-lg">Active Teachers</p>
                <p className="text-3xl font-bold">{teachers.filter(t => t.status === "approved").length}</p>
              </div>
              <CheckCircle className="w-10 h-10 opacity-80" />
            </CardContent>
          </Card>
          <Card className="bg-purple-600 text-white">
            <CardContent className="p-6 flex items-center justify-between">
              <div>
                <p className="text-lg">Total Applications</p>
                <p className="text-3xl font-bold">{teachers.length}</p>
              </div>
              <DollarSign className="w-10 h-10 opacity-80" />
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Students List */}
          <Card>
            <CardHeader>
              <CardTitle>Student Registrations</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4 max-h-96 overflow-y-auto">
                {filteredStudents.map((s) => (
                  <div key={s.id} className={`p-4 rounded-lg border ${s.status === "pending" ? "bg-yellow-50 border-yellow-400" : "bg-white"}`}>
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-semibold text-lg">{s.firstName} {s.lastName}</p>
                        <p className="text-sm text-gray-600">Grade {s.grade} • {s.curriculum}</p>
                        <div className="mt-2 flex gap-2 flex-wrap">
                          <Badge variant={s.status === "enrolled" ? "default" : s.status === "pending" ? "secondary" : "destructive"}>
                            {s.status}
                          </Badge>
                        </div>
                      </div>
                      <Button size="sm" variant="ghost" onClick={() => openModal(s, "student")}>
                        <Eye className="w-5 h-5" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Teachers List */}
          <Card>
            <CardHeader>
              <CardTitle>Teacher Applications</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4 max-h-96 overflow-y-auto">
                {filteredTeachers.map((t) => (
                  <div key={t.id} className={`p-4 rounded-lg border ${t.status === "pending" ? "bg-yellow-50 border-yellow-400" : "bg-white"}`}>
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-semibold text-lg">
                          {t.personalInfo?.firstName} {t.personalInfo?.lastName}
                        </p>
                        <p className="text-sm text-gray-600">{t.personalInfo?.email}</p>
                        <p className="text-sm text-gray-500">
                          {t.subjects?.length || 0} subject{t.subjects?.length !== 1 ? "s" : ""} • {t.personalInfo?.yearsOfExperience} years exp.
                        </p>
                        <div className="mt-2 flex gap-2 flex-wrap">
                          <Badge variant={t.status === "approved" ? "default" : t.status === "pending" ? "secondary" : "destructive"}>
                            {t.status || "pending"}
                          </Badge>
                        </div>
                      </div>
                      <Button size="sm" variant="ghost" onClick={() => openModal(t, "teacher")}>
                        <Eye className="w-5 h-5" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Timetable */}
        <Card className="mt-8">
          <CardHeader className="cursor-pointer" onClick={() => setTimetableExpanded(!timetableExpanded)}>
            <CardTitle className="flex justify-between items-center">
              School Timetable
              {timetableExpanded ? <ChevronUp /> : <ChevronDown />}
            </CardTitle>
          </CardHeader>
          {timetableExpanded && (
            <CardContent>
              <TimetableManager />
            </CardContent>
          )}
        </Card>
      </div>

      {/* Review Modal */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {selectedType === "teacher" ? "Teacher Application Review" : "Student Registration Review"}
            </DialogTitle>
          </DialogHeader>

          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
            <TabsList className="grid grid-cols-2">
              <TabsTrigger value="Details">Details</TabsTrigger>
              <TabsTrigger value="Documents">Documents ({documents.length})</TabsTrigger>
            </TabsList>

            <TabsContent value="Details" className="mt-6 space-y-6">
              {selectedType === "student" && selectedItem && (
                <>
                  <div>
                    <h3 className="font-bold text-lg mb-3">Student Information</h3>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <p><strong>Name:</strong> {(selectedItem as Student).firstName} {(selectedItem as Student).lastName}</p>
                      <p><strong>Grade:</strong> {(selectedItem as Student).grade}</p>
                      <p><strong>Curriculum:</strong> {(selectedItem as Student).curriculum || "N/A"}</p>
                      <p><strong>Status:</strong> <Badge>{(selectedItem as Student).status}</Badge></p>
                    </div>
                  </div>

                  {parentProfile && (
                    <div>
                      <h3 className="font-bold text-lg mb-3">Parent/Guardian</h3>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <p><strong>Name:</strong> {parentProfile.name}</p>
                        <p><strong>Email:</strong> {parentProfile.email}</p>
                        <p><strong>Phone:</strong> {parentProfile.phone}</p>
                        <p><strong>Occupation:</strong> {parentProfile.occupation}</p>
                      </div>
                    </div>
                  )}
                </>
              )}

              {selectedType === "teacher" && selectedItem && (
                <div>
                  <h3 className="font-bold text-lg mb-4">Teacher Application Details</h3>
                  <div className="space-y-4 text-sm">
                    <div className="grid grid-cols-2 gap-4">
                      <p><strong>Name:</strong> {selectedItem.personalInfo?.firstName} {selectedItem.personalInfo?.lastName}</p>
                      <p><strong>Email:</strong> {selectedItem.personalInfo?.email}</p>
                      <p><strong>Experience:</strong> {selectedItem.personalInfo?.yearsOfExperience} years</p>
                      <p><strong>Phase:</strong> {selectedItem.personalInfo?.gradePhase}</p>
                      <p><strong>Status:</strong> <Badge>{selectedItem.status || "pending"}</Badge></p>
                    </div>

                    <div>
                      <strong>Subjects Taught:</strong>
                      <div className="flex flex-wrap gap-2 mt-2">
                        {selectedItem.subjects?.map((sub, i) => (
                          <Badge key={i} variant="secondary">
                            {sub.name} ({sub.curriculum})
                          </Badge>
                        )) || <span className="text-gray-500">None listed</span>}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </TabsContent>

            <TabsContent value="Documents" className="mt-6">
              {loadingDocs ? (
                <p className="text-center text-gray-500">Loading documents...</p>
              ) : documents.length > 0 ? (
                <div className="space-y-3">
                  {documents.map((file, i) => (
                    <div key={i} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border">
                      <div>
                        <p className="font-medium">{file.name}</p>
                        <p className="text-xs text-gray-500 capitalize">{file.type.replace(/([A-Z])/g, ' $1').trim()}</p>
                      </div>
                      <Button size="sm" variant="outline" asChild>
                        <a href={file.url} target="_blank" rel="noopener noreferrer">
                          <Download className="w-4 h-4 mr-2" /> Open
                        </a>
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-gray-500 py-8">No documents uploaded yet.</p>
              )}
            </TabsContent>
          </Tabs>

          {(selectedItem?.status === "pending") && (
            <DialogFooter className="mt-8">
              <Button
                variant="destructive"
                onClick={() => reject(selectedType === "teacher" ? "teacherApplications" : "students", selectedItem.id)}
              >
                Reject
              </Button>
              <Button
                onClick={() => {
                  if (selectedType === "student") approveStudent(selectedItem.id);
                  else approveTeacher(selectedItem.id);
                }}
              >
                Approve
              </Button>
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PrincipalDashboard;