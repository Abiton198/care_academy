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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/components/auth/AuthProvider";
import { useNavigate } from "react-router-dom";
import TimetableManager from "@/lib/TimetableManager";
import ChatWidget from "../chat/ChatWidget";
import { Search, Clock, Users, DollarSign, CheckCircle, XCircle, AlertCircle, ChevronDown, ChevronUp, Download, Eye } from "lucide-react";

/* ---------------- Types ---------------- */
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

interface ParentAgg {
  id: string;
  name: string;
  email: string;
  photoURL?: string | null;
  children: { id: string; name: string; grade: string; status: string; paid: boolean }[];
}

interface Payment {
  id: string;
  amount?: string;
  paymentStatus?: "paid" | "pending" | "failed";
  processedAt?: any;
}

/* ---------------- Main Component ---------------- */
const PrincipalDashboard: React.FC = () => {
  const [students, setStudents] = useState<Student[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [parents, setParents] = useState<ParentAgg[]>([]);
  const [payments, setPayments] = useState<Record<string, Payment[]>>({});
  const [searchTerm, setSearchTerm] = useState("");
  const [gradeFilter, setGradeFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [curriculumFilter, setCurriculumFilter] = useState<"all" | "CAPS" | "Cambridge">("all");
  const [time, setTime] = useState(new Date());
  const [timetableExpanded, setTimetableExpanded] = useState(false);

  const principalName = auth.currentUser?.displayName || "Principal";
  const schoolName = "Nextgen Online Support School";
  const { logout } = useAuth();
  const navigate = useNavigate();

  /* ---------------- Modal State ---------------- */
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [selectedType, setSelectedType] = useState<"teacher" | "student" | "parent" | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [documents, setDocuments] = useState<Record<string, { name: string; url: string }[]>>({});
  const [activeTab, setActiveTab] = useState<"Details" | "Documents" | "Payments">("Details");

  /* ---------------- Chat State ---------------- */
  const [chatRecipient, setChatRecipient] = useState<string | null>(null);

  /* ---------------- Live Clock ---------------- */
  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  /* ---------------- Firestore Listeners ---------------- */
  useEffect(() => {
    const unsubStudents = onSnapshot(collection(db, "students"), async (snap) => {
      const list = snap.docs.map((d) => ({ id: d.id, ...(d.data() as Student) }));
      setStudents(list);

      const parentMap: Record<string, ParentAgg> = {};
      const paymentMap: Record<string, Payment[]> = {};

      for (const s of list) {
        const parentId = s.parentId;
        if (!parentId) continue;

        if (!parentMap[parentId]) {
          const pDoc = await getDoc(doc(db, "parents", parentId));
          const pData = pDoc.exists() ? pDoc.data() : {};
          parentMap[parentId] = {
            id: parentId,
            name: pData.name || "(Unknown)",
            email: pData.email || s.parentEmail || "",
            photoURL: pData.photoURL || null,
            children: [],
          };
        }

        const childName = `${s.firstName || ""} ${s.lastName || ""}`.trim() || "(Unnamed)";
        const childStatus = s.status || "pending";
        const hasPaid = payments[s.id]?.some(p => p.paymentStatus === "paid") || false;

        parentMap[parentId].children.push({
          id: s.id,
          name: childName,
          grade: s.grade || "-",
          status: childStatus,
          paid: hasPaid,
        });

        const payRef = collection(db, "registrations", s.id, "payments");
        const paySnap = await getDocs(fsQuery(payRef, orderBy("processedAt", "desc")));
        paymentMap[s.id] = paySnap.docs.map(d => ({ id: d.id, ...(d.data() as any) }));
      }

      setPayments(paymentMap);
      setParents(Object.values(parentMap));
    });

    const unsubTeachers = onSnapshot(collection(db, "teacherApplications"), (snap) => {
      setTeachers(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Teacher) })));
    });

    return () => {
      unsubStudents();
      unsubTeachers();
    };
  }, []);

  /* ---------------- Firestore Actions ---------------- */
  const updateStatus = async (
    col: "students" | "teacherApplications",
    id: string,
    updates: Record<string, any>
  ) => updateDoc(doc(db, col, id), updates);

  const approve = async (col: "students" | "teacherApplications", item: any) => {
    const id = item.id;

    if (col === "students") {
      await updateStatus(col, id, {
        status: "enrolled",
        principalReviewed: true,
        reviewedAt: serverTimestamp(),
      });
    }

    if (col === "teacherApplications") {
      const uid = item.uid || id;
      await updateStatus(col, id, {
        status: "approved",
        principalReviewed: true,
        reviewedAt: serverTimestamp(),
        classActivated: true,
      });

      await setDoc(doc(db, "teachers", uid), { ...item, uid, status: "approved" }, { merge: true });
      await setDoc(doc(db, "users", uid), { uid, role: "teacher" }, { merge: true });
    }

    closeModal();
  };

  const reject = async (col: "students" | "teacherApplications", id: string) => {
    await updateStatus(col, id, { status: "rejected", principalReviewed: true, reviewedAt: serverTimestamp() });
    closeModal();
  };

  const suspend = (col: "students" | "teacherApplications", id: string) =>
    updateStatus(col, id, { status: "suspended", suspendedAt: serverTimestamp() });

  const toggleClassActivation = async (item: any, col: "students" | "teacherApplications") => {
    const next = !item.classActivated;
    await updateStatus(col, item.id, { classActivated: next });
  };

  /* ---------------- Fetch Documents ---------------- */
  const fetchDocuments = async (col: "registrations" | "teacherApplications", id: string, uid?: string) => {
    const storage = getStorage();
    const rootRef = col === "teacherApplications" && uid
      ? ref(storage, `teacherApplications/${id}/${uid}/documents`)
      : ref(storage, `${col}/${id}/documents`);

    const result = await listAll(rootRef);
    const files: { name: string; url: string }[] = [];

    for (const item of result.items) {
      const url = await getDownloadURL(item);
      files.push({ name: item.name, url });
    }

    return { "Documents": files };
  };

  /* ---------------- Filters & Stats ---------------- */
  const filteredStudents = students.filter(s => {
    const name = `${s.firstName} ${s.lastName}`.toLowerCase();
    const email = (s.parentEmail || "").toLowerCase();
    const matchesSearch = name.includes(searchTerm.toLowerCase()) || email.includes(searchTerm.toLowerCase());
    const matchesGrade = gradeFilter === "all" || s.grade === gradeFilter;
    const matchesStatus = statusFilter === "all" || s.status === statusFilter;
    const matchesCurriculum = curriculumFilter === "all" || s.curriculum === curriculumFilter;
    return matchesSearch && matchesGrade && matchesStatus && matchesCurriculum;
  });

  const filteredTeachers = teachers.filter(t => {
    const name = `${t.firstName} ${t.lastName}`.toLowerCase();
    const email = (t.email || "").toLowerCase();
    return name.includes(searchTerm.toLowerCase()) || email.includes(searchTerm.toLowerCase());
  });

  const capsCount = students.filter(s => s.curriculum === "CAPS").length;
  const cambridgeCount = students.filter(s => s.curriculum === "Cambridge").length;

  const subjectCount = students.reduce((acc, s) => {
    s.subjects?.forEach(sub => {
      acc[sub] = (acc[sub] || 0) + 1;
    });
    return acc;
  }, {} as Record<string, number>);

  /* ---------------- UI Helpers ---------------- */
  const getStatusBadge = (status?: string, paid?: boolean) => {
    if (paid) return <Badge className="bg-green-100 text-green-800">Paid</Badge>;
    switch (status) {
      case "enrolled": return <Badge className="bg-green-100 text-green-800">Enrolled</Badge>;
      case "pending": return <Badge className="bg-yellow-100 text-yellow-800">Pending</Badge>;
      case "rejected": return <Badge className="bg-red-100 text-red-800">Rejected</Badge>;
      case "suspended": return <Badge className="bg-orange-100 text-orange-800">Suspended</Badge>;
      default: return <Badge className="bg-gray-100 text-gray-800">Unknown</Badge>;
    }
  };

  /* ---------------- Modal ---------------- */
  const openModal = async (item: any, type: "teacher" | "student" | "parent") => {
    setSelectedItem(item);
    setSelectedType(type);
    setShowModal(true);
    setActiveTab("Details");

    if (type === "teacher") {
      const docs = await fetchDocuments("teacherApplications", item.id, item.uid);
      setDocuments(docs);
    } else if (type === "student") {
      const docs = await fetchDocuments("registrations", item.id);
      setDocuments(docs);
    } else {
      setDocuments({});
    }
  };

  const closeModal = () => {
    setSelectedItem(null);
    setSelectedType(null);
    setShowModal(false);
    setDocuments({});
  };

  const handleLogout = async () => {
    await logout();
    navigate("/");
  };

  /* ---------------- Render ---------------- */
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-indigo-900">Welcome, {principalName}</h1>
          <p className="text-indigo-600 flex items-center gap-2 mt-1">
            <Clock className="w-4 h-4" />
            {schoolName} | {time.toLocaleDateString("en-ZA")} {time.toLocaleTimeString("en-ZA", { hour: "2-digit", minute: "2-digit" })}
          </p>
        </div>
        <Button variant="destructive" size="sm" onClick={handleLogout}>
          Logout
        </Button>
      </div>

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
        <DialogContent className="max-w-4xl max-h-screen overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {selectedType === "teacher" && `${selectedItem?.firstName} ${selectedItem?.lastName} - Application Review`}
              {selectedType === "student" && `${selectedItem?.firstName} ${selectedItem?.lastName} - Student Details`}
            </DialogTitle>
          </DialogHeader>

          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="Details">Details</TabsTrigger>
              <TabsTrigger value="Documents">Documents</TabsTrigger>
              <TabsTrigger value="Payments" disabled={selectedType !== "student"}>Payments</TabsTrigger>
            </TabsList>

            {/* Details Tab */}
            <TabsContent value="Details" className="space-y-4">
              {selectedType === "teacher" && selectedItem && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div><strong>Email:</strong> {selectedItem.email}</div>
                  <div><strong>Contact:</strong> {selectedItem.contact}</div>
                  <div><strong>Address:</strong> {selectedItem.address}</div>
                  <div><strong>Province:</strong> {selectedItem.province}</div>
                  <div><strong>Country:</strong> {selectedItem.country}</div>
                  <div><strong>Postal Code:</strong> {selectedItem.postalCode}</div>
                  <div><strong>Experience:</strong> {selectedItem.experience || "N/A"}</div>
                  <div><strong>Previous School:</strong> {selectedItem.previousSchool || "N/A"}</div>

                  <div className="md:col-span-2">
                    <strong>Subjects:</strong>
                    <div className="flex flex-wrap gap-2 mt-1">
                      {selectedItem.subjects?.map((sub: any, i: number) => (
                        <Badge
                          key={i}
                          variant="secondary"
                          className={sub.curriculum === "CAPS" ? "bg-green-100 text-green-800" : "bg-purple-100 text-purple-800"}
                        >
                          {sub.name} ({sub.curriculum})
                        </Badge>
                      ))}
                    </div>
                  </div>

                  <div className="md:col-span-2">
                    <strong>References:</strong>
                    <ul className="list-disc pl-5 mt-1 space-y-1">
                      {selectedItem.references?.map((ref: any, i: number) => (
                        <li key={i}>{ref.name} - {ref.contact}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}
            </TabsContent>

            {/* Documents Tab */}
            <TabsContent value="Documents">
              {documents["Documents"]?.length ? (
                <div className="space-y-3">
                  {documents["Documents"].map((file, i) => (
                    <div key={i} className="flex items-center justify-between p-3 border rounded-lg bg-gray-50">
                      <span className="text-sm font-medium">{file.name}</span>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => window.open(file.url, "_blank")}
                      >
                        <Download className="w-4 h-4 mr-1" /> Download
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500">No documents uploaded.</p>
              )}
            </TabsContent>

            {/* Payments Tab */}
            <TabsContent value="Payments">
              {/* Add payment logic if needed */}
            </TabsContent>
          </Tabs>

          {/* Action Buttons */}
          {selectedType === "teacher" && selectedItem?.status === "pending" && (
            <DialogFooter className="flex gap-2">
              <Button
                className="bg-green-600 hover:bg-green-700 text-white"
                onClick={() => approve("teacherApplications", selectedItem)}
              >
                Approve
              </Button>
              <Button
                variant="destructive"
                onClick={() => reject("teacherApplications", selectedItem.id)}
              >
                Reject
              </Button>
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>

      {/* Chat Widget */}
      {auth.currentUser && chatRecipient && (
        <div className="fixed bottom-6 right-6 z-50">
          <ChatWidget
            uid={auth.currentUser.uid}
            role="principal"
            initialRecipient={chatRecipient}
            forceOpen={true}
            onClose={() => setChatRecipient(null)}
          />
        </div>
      )}
    </div>
  );
};

export default PrincipalDashboard;