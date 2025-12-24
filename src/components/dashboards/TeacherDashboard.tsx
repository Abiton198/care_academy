"use client";

/* ======================================================
   IMPORTS
====================================================== */
import React, { useEffect, useState } from "react";
import { db } from "@/lib/firebaseConfig";
import {
  collection,
  onSnapshot,
  query,
  where,
  doc,
  updateDoc,
  serverTimestamp,
} from "firebase/firestore";
import {
  getAuth,
  onAuthStateChanged,
  signOut,
  User,
} from "firebase/auth";
import { useNavigate } from "react-router-dom";

/* UI Components */
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

/* Icons */
import {
  Loader2,
  LogOut,
  Edit2,
  Save,
  ExternalLink,
  Calendar,
  Clock,
  Video,
  Link,
  Check,
  X,
  Sparkles,
  BookOpen,
  Users,
} from "lucide-react";

/* ======================================================
   TYPES
====================================================== */
interface TeacherProfile {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  bio?: string;
  subjects?: { name: string; curriculum: "CAPS" | "Cambridge" }[];
  status?: "pending" | "approved" | "rejected";
}

interface TimetableSlot {
  id: string;
  day: string;
  time: string;
  subject: string;
  grade: string;
  curriculum: "CAPS" | "Cambridge";
  zoomLink?: string;
  classroomLink?: string;
}

/* ======================================================
   COMPONENT
====================================================== */
const TeacherDashboard: React.FC = () => {
  const navigate = useNavigate();
  const auth = getAuth();

  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<TeacherProfile | null>(null);
  const [timetable, setTimetable] = useState<TimetableSlot[]>([]);
  const [loading, setLoading] = useState(true);

  // Editing
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [editProfile, setEditProfile] = useState<Partial<TeacherProfile>>({});
  const [editingSlotId, setEditingSlotId] = useState<string | null>(null);
  const [editLinks, setEditLinks] = useState<{ zoomLink?: string; classroomLink?: string }>({});

  const teacherFullName = `${profile?.firstName || ""} ${profile?.lastName || ""}`.trim();

  /* ======================================================
     AUTH LISTENER
  ===================================================== */
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (firebaseUser) => {
      if (!firebaseUser) {
        navigate("/login");
      } else {
        setUser(firebaseUser);
      }
    });
    return () => unsub();
  }, [auth, navigate]);

  /* ======================================================
     PROFILE LISTENER
  ===================================================== */
  useEffect(() => {
    if (!user) return;

    const profileQuery = query(
      collection(db, "teacherApplications"),
      where("uid", "==", user.uid)
    );

    const unsub = onSnapshot(profileQuery, (snap) => {
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

    return () => unsub();
  }, [user]);

  /* ======================================================
     TIMETABLE LISTENER (with links)
  ===================================================== */
  useEffect(() => {
    if (!teacherFullName) return;

    const q = query(
      collection(db, "timetable"),
      where("teacherName", "==", teacherFullName)
    );

    const unsub = onSnapshot(q, (snap) => {
      const slots = snap.docs.map((d) => ({
        id: d.id,
        ...(d.data() as TimetableSlot),
      }));
      setTimetable(slots);
    });

    return () => unsub();
  }, [teacherFullName]);

  /* ======================================================
     ACTIONS
  ===================================================== */
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

  const startEditingLinks = (slot: TimetableSlot) => {
    setEditingSlotId(slot.id);
    setEditLinks({
      zoomLink: slot.zoomLink || "",
      classroomLink: slot.classroomLink || "",
    });
  };

  const cancelEditingLinks = () => {
    setEditingSlotId(null);
    setEditLinks({});
  };

  const saveLinks = async () => {
    if (!editingSlotId) return;
    await updateDoc(doc(db, "timetable", editingSlotId), {
      zoomLink: editLinks.zoomLink?.trim() || null,
      classroomLink: editLinks.classroomLink?.trim() || null,
      updatedAt: serverTimestamp(),
    });
    cancelEditingLinks();
  };

  const handleLogout = async () => {
    await signOut(auth);
    navigate("/");
  };

  /* ======================================================
     OVERVIEW STATS
  ===================================================== */
  const today = new Date().toLocaleString("en-us", { weekday: "long" });
  const todayLessons = timetable.filter((s) => s.day === today);
  const upcomingClassToday = todayLessons.sort((a, b) => a.time.localeCompare(b.time))[0];

  /* ======================================================
     GUARDS
  ===================================================== */
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
            Application Under Review
          </CardTitle>
          <p className="text-xl text-gray-700 mb-8">
            Your application is being reviewed. You'll get access once approved.
          </p>
          <Button size="lg" variant="outline" onClick={handleLogout}>
            Logout
          </Button>
        </Card>
      </div>
    );
  }

  /* ======================================================
     MAIN UI
  ===================================================== */
  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 text-white shadow-2xl">
        <div className="max-w-7xl mx-auto px-6 py-10 flex justify-between items-center">
          <div>
            <h1 className="text-5xl font-extrabold flex items-center gap-4">
              <Sparkles className="w-12 h-12 text-yellow-300" />
              Teacher Dashboard
            </h1>
            <p className="mt-3 text-2xl text-indigo-100">
              Welcome back, <span className="font-bold text-white">{teacherFullName}</span>!
            </p>
          </div>
          <Button variant="secondary" size="lg" onClick={handleLogout}>
            <LogOut className="w-6 h-6 mr-3" /> Logout
          </Button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-8">
        <Tabs defaultValue="overview" className="space-y-8">
          <TabsList className="grid grid-cols-4 w-full max-w-4xl mx-auto bg-white/80 backdrop-blur shadow-xl rounded-2xl p-3">
            <TabsTrigger value="overview" className="text-lg font-semibold">Overview</TabsTrigger>
            <TabsTrigger value="links" className="text-lg font-semibold">Manage Links</TabsTrigger>
            <TabsTrigger value="timetable" className="text-lg font-semibold">Timetable</TabsTrigger>
            <TabsTrigger value="profile" className="text-lg font-semibold">Profile</TabsTrigger>
          </TabsList>

          {/* Overview */}
          <TabsContent value="overview" className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {/* Current Week Lessons */}
              <Card className="bg-gradient-to-br from-teal-500 to-cyan-600 text-white shadow-2xl hover:scale-105 transition">
                <CardHeader>
                  <CardTitle className="flex items-center gap-4 text-2xl">
                    <BookOpen className="w-10 h-10" /> Current Week Lessons
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-6xl font-extrabold">{timetable.length}</p>
                  <p className="mt-3 text-teal-100 text-lg">Total scheduled classes</p>
                </CardContent>
              </Card>

              {/* Upcoming Class Today */}
              <Card className="bg-gradient-to-br from-orange-500 to-red-600 text-white shadow-2xl hover:scale-105 transition">
                <CardHeader>
                  <CardTitle className="flex items-center gap-4 text-2xl">
                    <Clock className="w-10 h-10" /> Next Class Today
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {upcomingClassToday ? (
                    <>
                      <p className="text-4xl font-bold">{upcomingClassToday.time}</p>
                      <p className="mt-2 text-orange-100">
                        {upcomingClassToday.subject} • {upcomingClassToday.grade}
                      </p>
                    </>
                  ) : (
                    <p className="text-2xl text-orange-100">No classes today</p>
                  )}
                </CardContent>
              </Card>

              {/* Total Lessons Count */}
              <Card className="bg-gradient-to-br from-purple-500 to-pink-600 text-white shadow-2xl hover:scale-105 transition">
                <CardHeader>
                  <CardTitle className="flex items-center gap-4 text-2xl">
                    <Calendar className="w-10 h-10" /> Total Lessons This Week
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-6xl font-extrabold">{timetable.length}</p>
                  <p className="mt-3 text-purple-100 text-lg">Across all days</p>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Manage Links */}
          <TabsContent value="links">
            <Card className="shadow-2xl border-0">
              <CardHeader className="bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-t-2xl">
                <CardTitle className="text-4xl font-bold flex items-center gap-4">
                  <Link className="w-12 h-12" /> Manage Class Links
                </CardTitle>
                <p className="text-lg text-teal-100 mt-2">
                  Set Zoom and Classroom links for your scheduled classes
                </p>
              </CardHeader>
              <CardContent className="p-10">
                {timetable.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {timetable.map((slot) => (
                      <div
                        key={slot.id}
                        className="p-8 bg-gradient-to-br from-indigo-50 to-purple-50 rounded-2xl shadow-lg hover:shadow-2xl transition"
                      >
                        <div className="flex justify-between items-start mb-6">
                          <div>
                            <h3 className="text-2xl font-bold text-indigo-900">
                              {slot.subject}
                            </h3>
                            <p className="text-lg text-purple-800">
                              {slot.grade} • {slot.curriculum} • {slot.day} {slot.time}
                            </p>
                          </div>
                          <Button
                            onClick={() => startEditingLinks(slot)}
                            variant="secondary"
                            size="lg"
                          >
                            <Edit2 className="w-6 h-6 mr-2" /> Edit Links
                          </Button>
                        </div>

                        {editingSlotId === slot.id ? (
                          <div className="space-y-5 p-5 bg-white/70 rounded-xl">
                            <div>
                              <Label className="text-lg font-medium flex items-center gap-2">
                                <Video className="w-6 h-6 text-indigo-600" /> Zoom Meeting Link
                              </Label>
                              <Input
                                value={editLinks.zoomLink}
                                onChange={(e) => setEditLinks({ ...editLinks, zoomLink: e.target.value })}
                                placeholder="https://zoom.us/j/..."
                                className="mt-2"
                              />
                            </div>
                            <div>
                              <Label className="text-lg font-medium flex items-center gap-2">
                                <Link className="w-6 h-6 text-purple-600" /> Classroom / LMS Link
                              </Label>
                              <Input
                                value={editLinks.classroomLink}
                                onChange={(e) => setEditLinks({ ...editLinks, classroomLink: e.target.value })}
                                placeholder="Google Classroom, Teams, Moodle..."
                                className="mt-2"
                              />
                            </div>
                            <div className="flex gap-4">
                              <Button onClick={saveLinks} className="flex-1 bg-gradient-to-r from-green-500 to-emerald-600">
                                <Check className="w-5 h-5 mr-2" /> Save Links
                              </Button>
                              <Button variant="outline" onClick={cancelEditingLinks} className="flex-1">
                                <X className="w-5 h-5 mr-2" /> Cancel
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <div className="space-y-5">
                            <div>
                              <Label className="text-lg flex items-center gap-2">
                                <Video className="w-5 h-5" /> Zoom Link
                              </Label>
                              {slot.zoomLink ? (
                                <a
                                  href={slot.zoomLink}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="block mt-2 text-blue-600 underline hover:text-blue-800 flex items-center gap-2"
                                >
                                  {slot.zoomLink} <ExternalLink className="w-4 h-4" />
                                </a>
                              ) : (
                                <p className="mt-2 text-gray-500 italic">Not set</p>
                              )}
                            </div>
                            <div>
                              <Label className="text-lg flex items-center gap-2">
                                <Link className="w-5 h-5" /> Classroom Link
                              </Label>
                              {slot.classroomLink ? (
                                <a
                                  href={slot.classroomLink}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="block mt-2 text-blue-600 underline hover:text-blue-800 flex items-center gap-2"
                                >
                                  {slot.classroomLink} <ExternalLink className="w-4 h-4" />
                                </a>
                              ) : (
                                <p className="mt-2 text-gray-500 italic">Not set</p>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-20">
                    <Calendar className="w-24 h-24 text-gray-300 mx-auto mb-8" />
                    <h3 className="text-3xl font-bold text-gray-700 mb-4">No Classes Scheduled Yet</h3>
                    <p className="text-xl text-gray-600 max-w-2xl mx-auto">
                      Your timetable is empty. Once the principal assigns your classes, 
                      you'll be able to set Zoom and classroom links here.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
            
          </TabsContent>

          {/* Timetable */}
          <TabsContent value="timetable">
            <Card className="shadow-2xl overflow-hidden border-0">
              <CardHeader className="bg-gradient-to-r from-rose-500 to-pink-600 text-white">
                <CardTitle className="text-4xl font-bold flex items-center gap-5">
                  <Calendar className="w-12 h-12" /> My Weekly Timetable
                </CardTitle>
              </CardHeader>
              <CardContent className="p-10">
                {timetable.length > 0 ? (
                  <div className="overflow-x-auto rounded-2xl shadow-inner bg-white">
                    <table className="w-full">
                      <thead className="bg-gradient-to-r from-indigo-100 to-purple-100">
                        <tr>
                          <th className="p-6 text-left text-indigo-900 font-bold text-lg">Day</th>
                          <th className="p-6 text-left text-indigo-900 font-bold text-lg">Time</th>
                          <th className="p-6 text-left text-indigo-900 font-bold text-lg">Subject</th>
                          <th className="p-6 text-left text-indigo-900 font-bold text-lg">Grade</th>
                          <th className="p-6 text-left text-indigo-900 font-bold text-lg">Curriculum</th>
                        </tr>
                      </thead>
                      <tbody>
                        {timetable.map((slot) => (
                          <tr key={slot.id} className="hover:bg-gradient-to-r hover:from-indigo-50 hover:to-purple-50 transition">
                            <td className="p-6 font-semibold text-indigo-800 text-lg">{slot.day}</td>
                            <td className="p-6 text-gray-700">{slot.time}</td>
                            <td className="p-6 font-medium text-indigo-900">{slot.subject}</td>
                            <td className="p-6">{slot.grade}</td>
                            <td className="p-6">
                              <Badge variant={slot.curriculum === "CAPS" ? "default" : "secondary"}>
                                {slot.curriculum}
                              </Badge>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="text-center py-24">
                    <Calendar className="w-28 h-28 text-gray-300 mx-auto mb-8" />
                    <h3 className="text-3xl font-bold text-gray-700 mb-4">Timetable Not Set</h3>
                    <p className="text-xl text-gray-600">Please contact the principal to schedule your classes.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Profile */}
          <TabsContent value="profile">
            <Card className="shadow-2xl border-0">
              <CardHeader className="bg-gradient-to-r from-indigo-600 to-purple-700 text-white rounded-t-2xl">
                <CardTitle className="text-4xl font-bold flex justify-between items-center">
                  My Profile
                  {!isEditingProfile ? (
                    <Button onClick={() => setIsEditingProfile(true)} variant="secondary" size="lg">
                      <Edit2 className="w-6 h-6 mr-3" /> Edit Profile
                    </Button>
                  ) : (
                    <div className="flex gap-4">
                      <Button onClick={handleSaveProfile} size="lg">
                        <Save className="w-6 h-6 mr-3" /> Save Changes
                      </Button>
                      <Button variant="secondary" size="lg" onClick={() => setIsEditingProfile(false)}>
                        <X className="w-6 h-6 mr-3" /> Cancel
                      </Button>
                    </div>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-10 space-y-10">
                <div className="grid md:grid-cols-2 gap-10">
                  <div><Label className="text-xl">First Name</Label><Input value={profile?.firstName} disabled className="text-xl mt-2" /></div>
                  <div><Label className="text-xl">Last Name</Label><Input value={profile?.lastName} disabled className="text-xl mt-2" /></div>
                  <div><Label className="text-xl">Email</Label><Input value={profile?.email} disabled className="text-xl mt-2" /></div>
                  <div>
                    <Label className="text-xl">Phone Number</Label>
                    <Input
                      value={isEditingProfile ? editProfile.phone : profile?.phone || "Not set"}
                      onChange={(e) => setEditProfile({ ...editProfile, phone: e.target.value })}
                      disabled={!isEditingProfile}
                      className="text-xl mt-2"
                    />
                  </div>
                </div>

                <div>
                  <Label className="text-xl">Bio / About Me</Label>
                  <Textarea
                    rows={8}
                    value={isEditingProfile ? editProfile.bio : profile?.bio || "Add a bio to help students know you better!"}
                    onChange={(e) => setEditProfile({ ...editProfile, bio: e.target.value })}
                    disabled={!isEditingProfile}
                    className="text-lg mt-3"
                  />
                </div>

                <div>
                  <Label className="text-xl">Subjects I Teach</Label>
                  <div className="flex flex-wrap gap-4 mt-5">
                    {profile?.subjects?.map((sub, i) => (
                      <Badge key={i} variant="secondary" className="text-xl py-3 px-6">
                        {sub.name} <span className="ml-2 opacity-80">({sub.curriculum})</span>
                      </Badge>
                    )) || <p className="text-gray-600 text-lg">No subjects listed yet.</p>}
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