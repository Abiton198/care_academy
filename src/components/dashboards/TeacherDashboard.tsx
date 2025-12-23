"use client";

import React, { useEffect, useState } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { db } from "@/lib/firebaseConfig";
import {
  collection,
  onSnapshot,
  query,
  where,
  doc,
  updateDoc,
  serverTimestamp,
  getDocs,
} from "firebase/firestore";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Loader2,
  LogOut,
  Edit2,
  Save,
  ExternalLink,
  Calendar,
  Users,
  Video,
  Link,
  Check,
  X,
  Sparkles,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

interface TeacherProfile {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  bio?: string;
  subjects?: { name: string; curriculum: "CAPS" | "Cambridge" }[];
  status?: "pending" | "approved" | "rejected";
}

interface AssignedClass {
  id: string;
  grade: string;
  subject: string;
  curriculum: "CAPS" | "Cambridge";
  studentCount: number;
  zoomLink?: string;
  classroomLink?: string;
}

interface TimetableSlot {
  day: string;
  period: string;
  subject: string;
  grade: string;
  room?: string;
}

const TeacherDashboard: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [profile, setProfile] = useState<TeacherProfile | null>(null);
  const [classes, setClasses] = useState<AssignedClass[]>([]);
  const [timetable, setTimetable] = useState<TimetableSlot[]>([]);
  const [loading, setLoading] = useState(true);

  // Editing states
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [editProfile, setEditProfile] = useState<Partial<TeacherProfile>>({});
  const [editingClassId, setEditingClassId] = useState<string | null>(null);
  const [editLinks, setEditLinks] = useState<{ zoomLink?: string; classroomLink?: string }>({});

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    const profileQuery = query(collection(db, "teacherApplications"), where("uid", "==", user.uid));

    const unsubProfile = onSnapshot(profileQuery, (snap) => {
      if (!snap.empty) {
        const data = snap.docs[0].data();
        setProfile({
          firstName: data.personalInfo?.firstName,
          lastName: data.personalInfo?.lastName,
          email: data.personalInfo?.email,
          phone: data.personalInfo?.phone,
          bio: data.personalInfo?.bio,
          subjects: data.subjects,
          status: data.status,
        });
        setEditProfile({
          phone: data.personalInfo?.phone || "",
          bio: data.personalInfo?.bio || "",
        });
      }
      setLoading(false);
    });

    const classesQuery = query(collection(db, "teacherClasses"), where("teacherUid", "==", user.uid));
    const unsubClasses = onSnapshot(classesQuery, (snap) => {
      setClasses(snap.docs.map((d) => ({ id: d.id, ...(d.data() as AssignedClass) })));
    });

    const timetableDoc = doc(db, "timetables", user.uid);
    const unsubTimetable = onSnapshot(timetableDoc, (snap) => {
      setTimetable(snap.exists() ? snap.data()?.slots || [] : []);
    });

    return () => {
      unsubProfile();
      unsubClasses();
      unsubTimetable();
    };
  }, [user]);

  const handleSaveProfile = async () => {
    if (!user) return;
    const q = query(collection(db, "teacherApplications"), where("uid", "==", user.uid));
    const snap = await getDocs(q);
    if (!snap.empty) {
      await updateDoc(doc(db, "teacherApplications", snap.docs[0].id), {
        "personalInfo.phone": editProfile.phone,
        "personalInfo.bio": editProfile.bio,
        updatedAt: serverTimestamp(),
      });
      setIsEditingProfile(false);
    }
  };

  const startEditingLinks = (cls: AssignedClass) => {
    setEditingClassId(cls.id);
    setEditLinks({
      zoomLink: cls.zoomLink || "",
      classroomLink: cls.classroomLink || "",
    });
  };

  const cancelEditingLinks = () => {
    setEditingClassId(null);
    setEditLinks({});
  };

  const saveLinks = async () => {
    if (!editingClassId) return;
    await updateDoc(doc(db, "teacherClasses", editingClassId), {
      zoomLink: editLinks.zoomLink?.trim() || null,
      classroomLink: editLinks.classroomLink?.trim() || null,
      updatedAt: serverTimestamp(),
    });
    cancelEditingLinks();
  };

  const handleLogout = async () => {
    await logout();
    navigate("/");
  };

  if (!user || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-100 to-purple-100">
        <Loader2 className="w-16 h-16 animate-spin text-indigo-600" />
      </div>
    );
  }

  if (profile?.status !== "approved") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-100 via-pink-50 to-indigo-100 flex items-center justify-center p-6">
        <Card className="max-w-2xl w-full p-12 text-center shadow-2xl bg-white/90 backdrop-blur">
          <Sparkles className="w-16 h-16 text-yellow-500 mx-auto mb-6" />
          <CardTitle className="text-4xl font-bold text-indigo-800 mb-6">
            {profile?.status === "pending" ? "Application Under Review" : "Welcome! Complete Your Profile"}
          </CardTitle>
          <p className="text-xl text-gray-700 mb-10">
            {profile?.status === "pending"
              ? "Great job submitting your application! The principal is reviewing it now. You'll get full access soon."
              : "You're one step away from your teacher dashboard. Please complete your application."}
          </p>
          <Button size="lg" variant="outline" onClick={handleLogout}>
            Logout
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50">
      {/* Vibrant Header */}
      <div className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 text-white shadow-2xl">
        <div className="max-w-7xl mx-auto px-6 py-10 flex justify-between items-center">
          <div>
            <h1 className="text-5xl font-extrabold flex items-center gap-4">
              <Sparkles className="w-12 h-12 text-yellow-300" />
              Teacher Dashboard
            </h1>
            <p className="mt-3 text-xl text-indigo-100">
              Welcome back, <span className="font-bold text-white">{profile?.firstName} {profile?.lastName}</span>!
            </p>
          </div>
          <Button variant="secondary" size="lg" onClick={handleLogout}>
            <LogOut className="w-6 h-6 mr-3" /> Logout
          </Button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-8">
        <Tabs defaultValue="overview" className="space-y-8">
          <TabsList className="grid grid-cols-5 w-full max-w-5xl mx-auto bg-white/80 backdrop-blur shadow-lg rounded-xl p-2">
            <TabsTrigger value="overview" className="text-lg font-medium">Overview</TabsTrigger>
            <TabsTrigger value="profile" className="text-lg font-medium">Profile</TabsTrigger>
            <TabsTrigger value="classes" className="text-lg font-medium">My Classes</TabsTrigger>
            <TabsTrigger value="links" className="text-lg font-medium">Links</TabsTrigger>
            <TabsTrigger value="timetable" className="text-lg font-medium">Timetable</TabsTrigger>
          </TabsList>

          {/* Overview */}
          <TabsContent value="overview" className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <Card className="bg-gradient-to-br from-blue-500 to-cyan-500 text-white shadow-xl hover:scale-105 transition">
                <CardHeader>
                  <CardTitle className="flex items-center gap-4 text-2xl">
                    <Users className="w-10 h-10" /> My Classes
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-5xl font-bold">{classes.length}</p>
                  <p className="mt-3 text-blue-100">Active teaching assignments</p>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-green-500 to-emerald-500 text-white shadow-xl hover:scale-105 transition">
                <CardHeader>
                  <CardTitle className="flex items-center gap-4 text-2xl">
                    <Calendar className="w-10 h-10" /> Weekly Periods
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-5xl font-bold">{timetable.length}</p>
                  <p className="mt-3 text-green-100">Scheduled teaching hours</p>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-purple-500 to-pink-500 text-white shadow-xl hover:scale-105 transition">
                <CardHeader>
                  <CardTitle className="flex items-center gap-4 text-2xl">
                    <Video className="w-10 h-10" /> Live Classes
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-5xl font-bold">{classes.filter(c => c.zoomLink).length}</p>
                  <p className="mt-3 text-purple-100">With active Zoom links</p>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          
           {/* My Classes */}
          <TabsContent value="classes">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {classes.length > 0 ? (
                classes.map((cls) => (
                  <Card key={cls.id} className="shadow-xl hover:shadow-2xl transition-all duration-300 border-0 overflow-hidden">
                    <div className={`h-3 ${cls.curriculum === "CAPS" ? "bg-gradient-to-r from-green-400 to-emerald-600" : "bg-gradient-to-r from-purple-400 to-pink-600"}`} />
                    <CardHeader className="bg-gradient-to-b from-gray-50 to-white">
                      <CardTitle className="text-2xl">{cls.subject}</CardTitle>
                      <Badge variant="outline" className="mt-2 text-lg">{cls.grade}</Badge>
                    </CardHeader>
                    <CardContent className="space-y-5">
                      <div className="flex items-center gap-3 text-gray-700">
                        <Users className="w-6 h-6 text-indigo-600" />
                        <span className="text-lg">{cls.studentCount} students</span>
                      </div>

                      {editingClassId === cls.id ? (
                        <div className="space-y-4 p-4 bg-indigo-50 rounded-xl">
                          <div>
                            <Label>Zoom Link</Label>
                            <Input
                              value={editLinks.zoomLink}
                              onChange={(e) => setEditLinks({ ...editLinks, zoomLink: e.target.value })}
                              placeholder="https://zoom.us/j/..."
                            />
                          </div>
                          <div>
                            <Label>Classroom Link</Label>
                            <Input
                              value={editLinks.classroomLink}
                              onChange={(e) => setEditLinks({ ...editLinks, classroomLink: e.target.value })}
                              placeholder="Google Classroom / Teams / etc."
                            />
                          </div>
                          <div className="flex gap-3">
                            <Button size="sm" onClick={saveLinks}><Check className="w-4 h-4 mr-1" />Save</Button>
                            <Button size="sm" variant="outline" onClick={cancelEditingLinks}><X className="w-4 h-4 mr-1" />Cancel</Button>
                          </div>
                        </div>
                      ) : (
                        <>
                          {cls.zoomLink && (
                            <Button asChild className="w-full bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600">
                              <a href={cls.zoomLink} target="_blank" rel="noopener noreferrer">
                                <Video className="w-5 h-5 mr-2" /> Join Live Class
                              </a>
                            </Button>
                          )}
                          {cls.classroomLink && (
                            <Button asChild variant="outline" className="w-full">
                              <a href={cls.classroomLink} target="_blank" rel="noopener noreferrer">
                                <Link className="w-5 h-5 mr-2" /> Open Classroom
                              </a>
                            </Button>
                          )}
                          <Button variant="secondary" className="w-full" onClick={() => startEditingLinks(cls)}>
                            <Edit2 className="w-5 h-5 mr-2" /> Update Links
                          </Button>
                        </>
                      )}
                    </CardContent>
                  </Card>
                ))
              ) : (
                <Card className="col-span-full p-16 text-center bg-gradient-to-br from-gray-100 to-gray-200">
                  <Users className="w-20 h-20 text-gray-400 mx-auto mb-6" />
                  <p className="text-2xl text-gray-600">No classes assigned yet</p>
                  <p className="text-gray-500 mt-3">Your principal will assign subjects and classes soon.</p>
                </Card>
              )}
            </div>
          </TabsContent>

          {/* Links Tab */}
          <TabsContent value="links">
            <Card className="shadow-2xl">
              <CardHeader className="bg-gradient-to-r from-teal-500 to-cyan-500 text-white">
                <CardTitle className="text-3xl">Manage Class Links</CardTitle>
              </CardHeader>
              <CardContent className="p-8 space-y-6">
                {classes.map((cls) => (
                  <div key={cls.id} className="p-6 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-2xl shadow-md">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <p className="text-2xl font-bold text-indigo-800">{cls.subject}</p>
                        <p className="text-lg text-purple-700">{cls.grade} • {cls.curriculum}</p>
                      </div>
                      <Button onClick={() => startEditingLinks(cls)} variant="outline">
                        <Edit2 className="w-5 h-5 mr-2" /> Edit
                      </Button>
                    </div>

                    <div className="grid md:grid-cols-2 gap-6 mt-6">
                      <div className="space-y-2">
                        <Label className="text-lg flex items-center gap-2"><Video className="w-5 h-5" /> Zoom Link</Label>
                        {cls.zoomLink ? (
                          <a href={cls.zoomLink} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline flex items-center gap-2">
                            {cls.zoomLink} <ExternalLink className="w-4 h-4" />
                          </a>
                        ) : <p className="text-gray-500 italic">Not set</p>}
                      </div>
                      <div className="space-y-2">
                        <Label className="text-lg flex items-center gap-2"><Link className="w-5 h-5" /> Classroom Link</Label>
                        {cls.classroomLink ? (
                          <a href={cls.classroomLink} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline flex items-center gap-2">
                            {cls.classroomLink} <ExternalLink className="w-4 h-4" />
                          </a>
                        ) : <p className="text-gray-500 italic">Not set</p>}
                      </div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Timetable */}
          <TabsContent value="timetable">
            <Card className="shadow-2xl overflow-hidden">
              <CardHeader className="bg-gradient-to-r from-orange-500 to-red-500 text-white">
                <CardTitle className="text-3xl flex items-center gap-4">
                  <Calendar className="w-10 h-10" /> Weekly Timetable
                </CardTitle>
              </CardHeader>
              <CardContent className="p-8">
                {timetable.length > 0 ? (
                  <div className="overflow-x-auto rounded-xl shadow-inner">
                    <table className="w-full">
                      <thead className="bg-gradient-to-r from-indigo-100 to-purple-100">
                        <tr>
                          <th className="p-5 text-left text-indigo-800 font-bold">Day</th>
                          <th className="p-5 text-left text-indigo-800 font-bold">Period</th>
                          <th className="p-5 text-left text-indigo-800 font-bold">Subject</th>
                          <th className="p-5 text-left text-indigo-800 font-bold">Grade</th>
                          <th className="p-5 text-left text-indigo-800 font-bold">Room</th>
                        </tr>
                      </thead>
                      <tbody>
                        {timetable.map((slot, i) => (
                          <tr key={i} className="hover:bg-indigo-50 transition">
                            <td className="p-5 font-semibold text-indigo-700">{slot.day}</td>
                            <td className="p-5">{slot.period}</td>
                            <td className="p-5 font-medium">{slot.subject}</td>
                            <td className="p-5">{slot.grade}</td>
                            <td className="p-5 text-gray-600">{slot.room || "—"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="text-center py-20">
                    <Calendar className="w-20 h-20 text-gray-300 mx-auto mb-6" />
                    <p className="text-2xl text-gray-600">Your timetable hasn't been set yet</p>
                    <p className="text-gray-500 mt-3">Contact the principal for your schedule.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

{/* Profile */}
          <TabsContent value="profile">
            <Card className="shadow-2xl border-0">
              <CardHeader className="bg-gradient-to-r from-indigo-500 to-purple-500 text-white rounded-t-xl">
                <CardTitle className="text-3xl flex justify-between items-center">
                  My Profile
                  {!isEditingProfile ? (
                    <Button onClick={() => setIsEditingProfile(true)} variant="secondary">
                      <Edit2 className="w-5 h-5 mr-2" /> Edit Profile
                    </Button>
                  ) : (
                    <div className="flex gap-3">
                      <Button onClick={handleSaveProfile}>
                        <Save className="w-5 h-5 mr-2" /> Save Changes
                      </Button>
                      <Button variant="secondary" onClick={() => setIsEditingProfile(false)}>
                        <X className="w-5 h-5 mr-2" /> Cancel
                      </Button>
                    </div>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-8 space-y-8">
                <div className="grid md:grid-cols-2 gap-8">
                  <div><Label className="text-lg">First Name</Label><Input value={profile?.firstName} disabled className="text-lg" /></div>
                  <div><Label className="text-lg">Last Name</Label><Input value={profile?.lastName} disabled className="text-lg" /></div>
                  <div><Label className="text-lg">Email</Label><Input value={profile?.email} disabled className="text-lg" /></div>
                  <div>
                    <Label className="text-lg">Phone Number</Label>
                    <Input
                      value={isEditingProfile ? editProfile.phone : profile?.phone || "Not set"}
                      onChange={(e) => setEditProfile({ ...editProfile, phone: e.target.value })}
                      disabled={!isEditingProfile}
                      placeholder="Add your contact number"
                    />
                  </div>
                </div>

                <div>
                  <Label className="text-lg">Bio / About Me</Label>
                  <Textarea
                    rows={6}
                    value={isEditingProfile ? editProfile.bio : profile?.bio || "No bio yet — add one to connect with students!"}
                    onChange={(e) => setEditProfile({ ...editProfile, bio: e.target.value })}
                    disabled={!isEditingProfile}
                    className="text-base"
                  />
                </div>

                <div>
                  <Label className="text-lg">Subjects I Teach</Label>
                  <div className="flex flex-wrap gap-3 mt-4">
                    {profile?.subjects?.map((sub, i) => (
                      <Badge key={i} variant="secondary" className="text-lg py-2 px-4">
                        {sub.name} <span className="ml-1 opacity-75">({sub.curriculum})</span>
                      </Badge>
                    )) || <p className="text-gray-500">No subjects assigned yet.</p>}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>


        </Tabs>
      </div>
    </div>
  );
};

export default TeacherDashboard;