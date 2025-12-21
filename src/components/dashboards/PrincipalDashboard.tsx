"use client";

import React, { useEffect, useState } from "react";
import { db, auth } from "@/lib/firebaseConfig";
import {
  collection,
  onSnapshot,
  doc,
  setDoc,
  updateDoc,
  serverTimestamp,
  query as fsQuery,
  orderBy,
  getDocs,
  getDoc,
  where
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
import ChatWidget from "../chat/ChatWidget";
import { LogOut } from "lucide-react";

import {
  Search,
  Clock,
  Users,
  DollarSign,
  CheckCircle,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Download,
  Eye,
} from "lucide-react";

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
  principalReviewed?: boolean;
  createdAt?: any;
  reviewedAt?: any;
  classActivated?: boolean;
  curriculum?: "CAPS" | "Cambridge";
}

interface Teacher {
  id: string;
  uid?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  contact?: string;
  subjects?: { name: string; curriculum: "CAPS" | "Cambridge" }[];
  status?: "pending" | "approved" | "rejected";
  classActivated?: boolean;
  address?: string;
  province?: string;
  country?: string;
  postalCode?: string;
  experience?: string;
  previousSchool?: string;
  references?: { name: string; contact: string }[];
}

interface Payment {
  id: string;
  amount?: string;
  paymentStatus?: "paid" | "pending" | "failed";
  processedAt?: any;
}

/* ---------------- Component ---------------- */
const PrincipalDashboard: React.FC = () => {
  const [students, setStudents] = useState<Student[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [payments, setPayments] = useState<Record<string, Payment[]>>({});
  const [documents, setDocuments] = useState<
    Record<string, { name: string; url: string }[]>
  >({});

  const [searchTerm, setSearchTerm] = useState("");
  const [gradeFilter, setGradeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [curriculumFilter, setCurriculumFilter] =
    useState<"all" | "CAPS" | "Cambridge">("all");

  const [time, setTime] = useState(new Date());
  const [timetableExpanded, setTimetableExpanded] = useState(false);

  const [selectedItem, setSelectedItem] = useState<Student | Teacher | null>(
    null
  );
  const [selectedType, setSelectedType] =
    useState<"student" | "teacher" | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [activeTab, setActiveTab] =
    useState<"Details" | "Documents" | "Payments">("Details");

  const [parentProfile, setParentProfile] =
    useState<ParentProfile | null>(null);

  const principalName = auth.currentUser?.displayName || "Principal";
  const schoolName = "Care Academy";

  const { logout } = useAuth();
  const navigate = useNavigate();

  /* ---------------- Clock ---------------- */
  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  /* ---------------- Firestore listeners ---------------- */
useEffect(() => {
  // ---------------- Students ----------------
  let studentsQuery: any = collection(db, "students");

  if (auth.currentUser) {
    studentsQuery = fsQuery(
      collection(db, "students"),
      where("status", "==", "pending")
    );
  }

  const unsubStudents = onSnapshot(studentsQuery, async (snap) => {
    const list: Student[] = snap.docs.map((d) => ({
      id: d.id,
      ...(d.data() as Student),
    }));
    setStudents(list);

    // Fetch payments for each student
    const paymentMap: Record<string, Payment[]> = {};
    for (const s of list) {
      const paymentsRef = collection(db, "registrations", s.id, "payments");
      const ps = await getDocs(fsQuery(paymentsRef, orderBy("processedAt", "desc")));
      paymentMap[s.id] = ps.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Payment),
      }));
    }
    setPayments(paymentMap);
  });

  // ---------------- Teachers ----------------
  const unsubTeachers = onSnapshot(
    collection(db, "teacherApplications"),
    (snap) => {
      setTeachers(
        snap.docs.map((d) => ({
          id: d.id,
          ...(d.data() as Teacher),
        }))
      );
    }
  );

  // Cleanup function for both listeners
  return () => {
    unsubStudents();
    unsubTeachers();
  };
}, []);


/* ---------------- Approve / Reject ---------------- */

const approveStudent = async (student: Student) => {
  await updateDoc(doc(db, "students", student.id), {
    status: "enrolled",
    principalReviewed: true,
    reviewedAt: serverTimestamp(),
  });
  closeModal();
};

const reject = async (col: "students" | "teacherApplications", id: string) => {
  await updateDoc(doc(db, col, id), {
    status: "rejected",
    principalReviewed: true,
    reviewedAt: serverTimestamp(),
  });
  closeModal();
};

 
  /* ---------------- Documents ---------------- */
  const fetchDocuments = async (
  col: "registrations" | "teacherApplications",
  id: string,
  uid?: string
) => {
  try {
    const storage = getStorage();
    const path =
      col === "teacherApplications" && uid
        ? `teacherApplications/${id}/${uid}/documents`
        : `${col}/${id}/documents`;

    const result = await listAll(ref(storage, path));

    const files = await Promise.all(
      result.items.map(async (item) => ({
        name: item.name,
        url: await getDownloadURL(item),
      }))
    );

    setDocuments({ Documents: files });
  } catch (err) {
    console.error("Document fetch failed:", err);
    setDocuments({ Documents: [] }); // ✅ prevents crash
  }
};

  /* ---------------- Modal ---------------- */
 const openModal = (item: Student | Teacher, type: "student" | "teacher") => {
  setSelectedItem(item);
  setSelectedType(type);
  setShowModal(true);
  setActiveTab("Details");
  setDocuments({}); // reset documents
  setParentProfile(null); // reset parent profile

  if (type === "student") {
    fetchDocuments("registrations", item.id);

    if ((item as Student).parentId) {
      getDoc(doc(db, "parents", (item as Student).parentId!)).then(snap => {
        if (snap.exists()) {
          setParentProfile({ id: snap.id, ...(snap.data() as ParentProfile) });
        }
      });
    }
  }

  if (type === "teacher") {
    fetchDocuments("teacherApplications", item.id, item.uid);
  }
};

  const closeModal = () => {
    setSelectedItem(null);
    setSelectedType(null);
    setParentProfile(null);
    setDocuments({});
    setShowModal(false);
  };

  const handleLogout = async () => {
    await logout();
    navigate("/");
  };

  /* ---------------- Stats ---------------- */
const capsCount = students.filter(
  (s) => s.curriculum === "CAPS"
).length;

const cambridgeCount = students.filter(
  (s) => s.curriculum === "Cambridge"
).length;

/* ---------------- Subject Breakdown ---------------- */
const subjectCount = students.reduce<Record<string, number>>((acc, s) => {
  if (!s.subjects) return acc;

  s.subjects.forEach((subject) => {
    acc[subject] = (acc[subject] || 0) + 1;
  });

  return acc;
}, {});

/* ---------------- Filters ---------------- */
const filteredStudents = students.filter((s) => {
  const name = `${s.firstName ?? ""} ${s.lastName ?? ""}`.toLowerCase();
  const email = (s.parentEmail ?? "").toLowerCase();

  const matchesSearch =
    name.includes(searchTerm.toLowerCase()) ||
    email.includes(searchTerm.toLowerCase());

  const matchesGrade =
    gradeFilter === "all" || s.grade === gradeFilter;

  const matchesStatus =
    statusFilter === "all" || s.status === statusFilter;

  const matchesCurriculum =
    curriculumFilter === "all" ||
    s.curriculum === curriculumFilter;

  return (
    matchesSearch &&
    matchesGrade &&
    matchesStatus &&
    matchesCurriculum
  );
});

/* ---------------- Filtered Teachers ---------------- */
const filteredTeachers = teachers.filter((t) => {
  const name = `${t.firstName ?? ""} ${t.lastName ?? ""}`.toLowerCase();
  const email = (t.email ?? "").toLowerCase();

  return (
    name.includes(searchTerm.toLowerCase()) ||
    email.includes(searchTerm.toLowerCase())
  );
});

/* ---------------- Status Badge Helper ---------------- */
const getStatusBadge = (
  status?: Student["status"],
  paid?: boolean
) => {
  if (paid) {
    return (
      <Badge className="bg-green-100 text-green-800">
        Paid
      </Badge>
    );
  }

  switch (status) {
    case "enrolled":
      return (
        <Badge className="bg-green-100 text-green-800">
          Enrolled
        </Badge>
      );
    case "pending":
      return (
        <Badge className="bg-yellow-100 text-yellow-800">
          Pending
        </Badge>
      );
    case "rejected":
      return (
        <Badge className="bg-red-100 text-red-800">
          Rejected
        </Badge>
      );
    case "suspended":
      return (
        <Badge className="bg-orange-100 text-orange-800">
          Suspended
        </Badge>
      );
    default:
      return (
        <Badge className="bg-gray-100 text-gray-800">
          Unknown
        </Badge>
      );
  }
};



  /* ---------------- Render ---------------- */
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
      <h1 className="text-3xl font-bold mb-4">
        Welcome, {principalName}
      </h1>

      <Button variant="destructive" onClick={handleLogout}>
        Logout
      </Button>

      {/* Search & Filters */}
      <Card className="bg-white shadow-md">
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Search students, teachers, parents..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={gradeFilter} onValueChange={setGradeFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Grade" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Grades</SelectItem>
                {["Form 3","Form 4", "Form 5","Form 6","Grade 10", "Grade 11", "Grade 12"].map(g => (
                  <SelectItem key={g} value={g}>{g}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="enrolled">Enrolled</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
                <SelectItem value="suspended">Suspended</SelectItem>
              </SelectContent>
            </Select>
            <Select value={curriculumFilter} onValueChange={(v) => setCurriculumFilter(v as any)}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Curriculum" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Curricula</SelectItem>
                <SelectItem value="CAPS">CAPS</SelectItem>
                <SelectItem value="Cambridge">Cambridge</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-r from-green-500 to-emerald-600 text-white">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-sm opacity-90">Total Students</p>
              <p className="text-2xl font-bold">{students.length}</p>
            </div>
            <Users className="w-8 h-8 opacity-70" />
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-sm opacity-90">CAPS Students</p>
              <p className="text-2xl font-bold">{capsCount}</p>
            </div>
            <CheckCircle className="w-8 h-8 opacity-70" />
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-r from-purple-500 to-pink-600 text-white">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-sm opacity-90">Cambridge Students</p>
              <p className="text-2xl font-bold">{cambridgeCount}</p>
            </div>
            <AlertCircle className="w-8 h-8 opacity-70" />
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-r from-yellow-500 to-amber-600 text-white">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-sm opacity-90">Active Teachers</p>
              <p className="text-2xl font-bold">{teachers.filter(t => t.status === "approved").length}</p>
            </div>
            <DollarSign className="w-8 h-8 opacity-70" />
          </CardContent>
        </Card>
      </div>

      {/* Subject Breakdown */}
      <Card className="bg-white shadow-md">
        <CardHeader>
          <CardTitle>Subjects Enrolled (Count)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {Object.entries(subjectCount).map(([subject, count]) => (
              <Badge key={subject} variant="secondary" className="text-sm px-3 py-1">
                {subject} ({count})
              </Badge>
            ))}
            {Object.keys(subjectCount).length === 0 && (
              <p className="text-gray-500 text-sm">No subjects enrolled yet.</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Students */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              Students
              <Badge variant="secondary">{filteredStudents.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {filteredStudents.map(s => {
                const paid = payments[s.id]?.some(p => p.paymentStatus === "paid") || false;
                return (
                  <div key={s.id} className="p-3 border rounded-lg bg-gray-50 hover:bg-gray-100 transition">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-medium">{s.firstName} {s.lastName}</p>
                        <p className="text-sm text-gray-600">
                          Grade {s.grade} • {s.curriculum || "N/A"}
                        </p>
                        <div className="flex gap-2 mt-1">
                          {getStatusBadge(s.status, paid)}
                          {s.subjects && s.subjects.map(sub => (
                            <Badge key={sub} variant="outline" className="text-xs">{sub}</Badge>
                          ))}
                        </div>
                      </div>

                      {/* student reg details view */}
                      <Button size="sm" variant="ghost" onClick={() => openModal(s, "student")}>
                        <Eye className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
        {/* Teachers */}
        <Card>
          <CardHeader>
            <CardTitle>Teachers</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {filteredTeachers.map(t => (
                <div key={t.id} className="p-3 border rounded-lg bg-blue-50 hover:bg-blue-100 transition">
                  {/* Name + Subject Count */}
                  <div className="flex items-center justify-between">
                    <p className="font-medium">{t.firstName} {t.lastName}</p>
                    <span className="text-xs text-gray-500">
                      {t.subjects?.length || 0} subject{t.subjects?.length !== 1 ? "s" : ""}
                    </span>
                  </div>

                  {/* Email & Contact */}
                  <p className="text-sm text-gray-600">{t.email}</p>
                  {t.contact && (
                    <p className="text-sm text-gray-500">{t.contact}</p>
                  )}

                  {/* Subjects Badges */}
                  <div className="flex gap-1 mt-2 flex-wrap">
                    {t.subjects?.map((sub, i) => (
                      <Badge
                        key={i}
                        variant="secondary"
                        className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                          sub.curriculum === "CAPS"
                            ? "bg-green-100 text-green-800 border border-green-300"
                            : "bg-purple-100 text-purple-800 border border-purple-300"
                        }`}
                      >
                        {sub.name}
                        <span className="ml-1 opacity-75">({sub.curriculum})</span>
                      </Badge>
                    ))}
                    {(!t.subjects || t.subjects.length === 0) && (
                      <span className="text-xs text-gray-400">No subjects assigned</span>
                    )}
                  </div>

                  {/* Action Button */}
                  <div className="flex gap-2 mt-3">
                    {t.status === "pending" && (
                      <Button size="sm" variant="outline" onClick={() => openModal(t, "teacher")}>
                        <Eye className="w-4 h-4 mr-1" /> Review
                      </Button>
                    )}
                    {t.status === "approved" && (
                      <Badge className="bg-green-100 text-green-800 text-xs">Approved</Badge>
                    )}
                    {t.status === "rejected" && (
                      <Badge className="bg-red-100 text-red-800 text-xs">Rejected</Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Collapsible Timetable */}
      <Card className="bg-white shadow-md">
        <CardHeader
          className="cursor-pointer flex items-center justify-between"
          onClick={() => setTimetableExpanded(!timetableExpanded)}
        >
          <CardTitle className="flex items-center gap-2">
            Weekly Timetable
            {timetableExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
          </CardTitle>
        </CardHeader>
        {timetableExpanded && (
          <CardContent>
            <TimetableManager />
          </CardContent>
        )}
      </Card>

      {/* Review Modal */}

 <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>
              {selectedType === "teacher"
                ? "Teacher Application"
                : "Student Details"}
            </DialogTitle>
          </DialogHeader>

          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
            <TabsList className="grid grid-cols-3">
              <TabsTrigger value="Details">Details</TabsTrigger>
              <TabsTrigger value="Documents">Documents</TabsTrigger>
              <TabsTrigger value="Payments" disabled={selectedType !== "student"}>
                Payments
              </TabsTrigger>
            </TabsList>

            <TabsContent value="Documents">
                          {documents?.Documents?.length ? (
                documents.Documents.map((file, i) => (
                  <div key={i}>
                    {file.name}
                  </div>
                ))
              ) : (
                <p className="text-gray-500">No documents uploaded.</p>
              )}

            </TabsContent>
         

                  {selectedType === "teacher" &&
          selectedItem &&
          selectedItem.status === "pending" && (
            <DialogFooter>
              <Button
                onClick={() => approveTeacher(selectedItem as Teacher)}
              >
                Approve
              </Button>

              <Button
                variant="destructive"
                onClick={() =>
                  reject("teacherApplications", selectedItem.id)
                }
              >
                Reject
              </Button>
            </DialogFooter>
        )}


{/* Student Approval Section */}
        {selectedType === "student" && selectedItem?.status === "pending" && (
  <DialogFooter>
    <Button onClick={() => approveStudent(selectedItem as Student)}>
      Approve
    </Button>
    <Button
      variant="destructive"
      onClick={() => reject("students", selectedItem.id)}
    >
      Reject
    </Button>
  </DialogFooter>
)}

<TabsContent value="Details">
  {selectedItem ? (
    <div className="space-y-2">
      <p><strong>Name:</strong> {selectedItem.firstName} {selectedItem.lastName}</p>
      <p><strong>Grade:</strong> {selectedItem.grade}</p>
      <p><strong>Status:</strong> {selectedItem.status}</p>
      {parentProfile ? (
        <p><strong>Parent:</strong> {parentProfile.name} ({parentProfile.email})</p>
      ) : (
        <p>Loading parent info...</p>
      )}
    </div>
  ) : (
    <p>Loading student info...</p>
  )}
</TabsContent>
 </Tabs>



        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PrincipalDashboard;