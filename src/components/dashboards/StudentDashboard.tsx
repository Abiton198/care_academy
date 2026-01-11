/* =============================================================================
   StudentDashboard.tsx – Secure Student Portal (React + TS + Firebase)
   Features:
   • Real-time Firestore sync for timetable & class links
   • Personalized overview with stats
   • Tabbed navigation: Overview, Timetable, Links
   • Robust loading states & error handling
   • Clean, responsive UI with ShadCN components
   • Full auth integration via AuthProvider
   ============================================================================= */

import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { db } from "@/lib/firebaseConfig"; // ← Make sure this file exists and exports db
import {
  collection,
  getDocs,
  onSnapshot,
  query,
  where,
  orderBy,
} from "firebase/firestore";

/* UI Components (ShadCN – assume you have these installed) */
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
// import { LinkCard } from "../cards/LinkCard";



/* Icons */
import {
  Loader2,
  Users,
  LogOut,
  ArrowRight,
  Video,
  BookOpen,
  Calendar as CalendarIcon,
  AlertCircle,
  FileText,
  User,
  ExternalLink,
} from "lucide-react";

/* Auth */
import { useAuth } from "../auth/AuthProvider";

// =============================================================================
// TYPES
// =============================================================================
interface StudentProfile {
  id: string;
  firstName: string;
  grade: string;
  email?: string;
  linkedParentEmail?: string;
}

interface TimetableEntry {
  id: string;
  day: string;
  time: string;
  subject: string;
  teacherName: string;
  grade: string;
  curriculum: "Cambridge";
}

interface ClassLink {
  id: string;
  title: string;
  url: string;
  type: "classroom" | "resource";
  teacherName: string;
  grade: string;
  createdAt: any;
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================
const StudentDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading, logout } = useAuth();

  /* ---------------- PROFILE ---------------- */
  const [profile, setProfile] = useState<StudentProfile | null>(null);
  const [profileLoaded, setProfileLoaded] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);

  /* ---------------- DATA ---------------- */
  const [timetable, setTimetable] = useState<TimetableEntry[]>([]);
  const [classLinks, setClassLinks] = useState<ClassLink[]>([]);

  const [timetableLoaded, setTimetableLoaded] = useState(false);
  const [linksLoaded, setLinksLoaded] = useState(false);

  /* ---------------- UI ---------------- */
  const [activeTab, setActiveTab] = useState<"overview" | "timetable" | "links">("overview");


const LinkCard = ({ link }: { link: ClassLink }) => (
  <a 
    href={link.url} 
    target="_blank" 
    rel="noopener noreferrer"
    className="group bg-white border-2 border-slate-100 hover:border-indigo-200 hover:shadow-xl hover:shadow-indigo-50/50 transition-all duration-300 rounded-[2rem] p-6 flex items-center justify-between"
  >
    <div className="flex items-center gap-5">
      <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
        {link.type === 'classroom' ? <Video size={20} /> : <FileText size={20} />}
      </div>
      <div>
        <h4 className="font-black text-slate-800 uppercase text-sm tracking-tight group-hover:text-indigo-600 transition-colors">
          {link.title}
        </h4>
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
          <User size={10} /> {link.teacherName}
        </p>
      </div>
    </div>
    <div className="bg-slate-50 p-2 rounded-xl text-slate-400 group-hover:bg-indigo-600 group-hover:text-white transition-all">
      <ExternalLink size={16} />
    </div>
  </a>
);

  // ===========================================================================
  // 1. LOAD STUDENT PROFILE (ONCE AUTH IS RESOLVED)
  // ===========================================================================
 useEffect(() => {
  if (authLoading || !user) return;

  const loadStudentProfile = async () => {
    try {
      // 1. Query by parentId (This matches your Firestore structure)
      const q = query(
        collection(db, "students"), 
        where("parentId", "==", user.uid),
        where("status", "==", "enrolled") // Only show if they are approved
      );

      const snap = await getDocs(q);
      
      if (!snap.empty) {
        // Taking the first student found for this parent
        const docSnap = snap.docs[0];
        const data = docSnap.data();
        
        setProfile({
          id: docSnap.id,
          firstName: data.firstName,
          grade: data.grade,
          email: data.parentEmail, // Using parent email as a fallback
        });
      } else {
        setProfileError("No enrolled student found for this account.");
      }
    } catch (err: any) {
      console.error("Profile load error:", err);
      setProfileError("Failed to sync with the Student Registry.");
    } finally {
      setProfileLoaded(true);
    }
  };

  loadStudentProfile();
}, [user, authLoading]);

  // ===========================================================================
  // 2. REAL-TIME TIMETABLE (ONCE PROFILE LOADS)
  // ===========================================================================
  useEffect(() => {
    if (!profile?.grade) return;

    setTimetableLoaded(false);

    const q = query(
      collection(db, "timetable"),
      where("grade", "==", profile.grade),
      where("curriculum", "==", "Cambridge")
    );

    const unsub = onSnapshot(
      q,
      (snap) => {
        const entries = snap.docs.map((d) => ({ id: d.id, ...d.data() } as TimetableEntry));
        setTimetable(entries);
        setTimetableLoaded(true);
      },
      (err) => {
        console.error("Timetable error:", err);
        setTimetableLoaded(true);
      }
    );

    return () => unsub();
  }, [profile?.grade]);

  // ===========================================================================
  // 3. REAL-TIME CLASS LINKS (ONCE PROFILE LOADS)
  // ===========================================================================
  useEffect(() => {
    // If profile.grade is missing, the query won't run. 
    // Log it to make sure it's what you expect (e.g., "Primary")
    console.log("Fetching links for grade:", profile?.grade);
    
    if (!profile?.grade) return;

    setLinksLoaded(false);

    const q = query(
      collection(db, "class_links"),
      where("grade", "in", [profile.grade, "all"]),
      orderBy("createdAt", "desc")
    );

    const unsub = onSnapshot(
      q,
      (snap) => {
        const links = snap.docs.map((d) => ({ 
          id: d.id, 
          ...d.data() 
        } as ClassLink));
        
        console.log(`Found ${links.length} links for student.`);
        setClassLinks(links);
        setLinksLoaded(true);
      },
      (err) => {
        // Look here for the "Missing Index" link!
        console.error("Class links error:", err);
        setLinksLoaded(true);
      }
    );

    return () => unsub();
  }, [profile?.grade]);

  // ===========================================================================
  // 4. DERIVED DATA (GROUPING + STATS)
  // ===========================================================================
  const groupedTimetable = useMemo(() => {
    const daysOrder = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
    const grouped = timetable.reduce((acc, entry) => {
      if (!acc[entry.day]) acc[entry.day] = [];
      acc[entry.day].push(entry);
      return acc;
    }, {} as Record<string, TimetableEntry[]>);

    return daysOrder
      .filter((day) => grouped[day])
      .map((day) => ({ day, slots: grouped[day].sort((a, b) => a.time.localeCompare(b.time)) }));
  }, [timetable]);

  const stats = useMemo(() => {
    const todayDay = new Intl.DateTimeFormat("en-US", { weekday: "long" }).format(new Date());
    return {
      todayClasses: timetable.filter((entry) => entry.day === todayDay).length,
      weeklyClasses: timetable.length,
      totalLinks: classLinks.length,
    };
  }, [timetable, classLinks]);

  // ===========================================================================
  // 5. LOADING + ERROR STATES (PREVENT BLANK SCREEN)
  // ===========================================================================
  if (authLoading || !profileLoaded) {
    return <LoadingScreen message="Loading your portal..." />;
  }

  if (profileError) {
    return <ErrorScreen message={profileError} onRetry={() => window.location.reload()} />;
  }

  if (!profile) {
    return <ErrorScreen message="No profile found. Contact admin." onRetry={() => window.location.reload()} />;
  }

  // ===========================================================================
  // 6. RENDER DASHBOARD
  // ===========================================================================
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-5 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold text-2xl">
              {profile.firstName[0]}
            </div>
            <div>
              <h1 className="text-2xl font-bold">Welcome, {profile.firstName}</h1>
              <p className="text-sm text-gray-500">Grade {profile.grade} • Cambridge</p>
            </div>
          </div>
          <Button variant="ghost" onClick={async () => { await logout(); navigate("/login"); }}>
            <LogOut className="mr-2 h-4 w-4" /> Logout
          </Button>
        </div>

        {/* Tabs */}
        <nav className="border-t">
          <div className="max-w-7xl mx-auto px-6 flex gap-8">
            {["overview", "timetable", "links"].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab as typeof activeTab)}
                className={`py-4 text-sm font-medium ${
                  activeTab === tab
                    ? "border-b-2 border-indigo-600 text-indigo-600"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </div>
        </nav>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-10">
        {activeTab === "overview" && (
          <div className="grid md:grid-cols-3 gap-6 mb-10">
            <StatCard icon={CalendarIcon} title="Today's Classes" value={stats.todayClasses} />
            <StatCard icon={BookOpen} title="Weekly Lessons" value={stats.weeklyClasses} />
            <StatCard icon={Video} title="Class Links" value={stats.totalLinks} />
          </div>
        )}

        {activeTab === "timetable" && (
          <div className="space-y-8">
            {groupedTimetable.length > 0 ? (
              groupedTimetable.map(({ day, slots }) => (
                <Card key={day} className="overflow-hidden">
                  <CardHeader className="bg-slate-900 text-white">
                    <CardTitle className="text-white">{day}</CardTitle>
                  </CardHeader>
                  <CardContent className="p-6 space-y-4">
                    {slots.map((slot) => (
                      <div
                        key={slot.id}
                        className="flex justify-between items-center p-4 bg-gray-50 rounded-lg"
                      >
                        <div>
                          <p className="font-medium">{slot.subject}</p>
                          <p className="text-sm text-gray-500">{slot.teacherName}</p>
                           <p className="text-sm text-gray-500">{slot.day}</p>
                        </div>
                        <Badge variant="outline">{slot.time}</Badge>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              ))
            ) : (
              <div className="text-center py-12 text-gray-500">
                No timetable entries found for your grade yet.
              </div>
            )}
          </div>
        )}

        {activeTab === "links" && (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
           {!linksLoaded ? (
  <div className="animate-pulse flex gap-4">
    <div className="h-20 w-full bg-slate-100 rounded-3xl" />
  </div>
) : classLinks.length === 0 ? (
  <div className="p-8 border-2 border-dashed border-slate-100 rounded-[2rem] text-center">
    <p className="text-slate-400 font-bold text-xs uppercase tracking-widest">
      No active links for {profile?.grade} yet
    </p>
  </div>
) : (
  <div className="grid gap-4">
    {classLinks.map(link => (
      <LinkCard key={link.id} link={link} />
    ))}
  </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
};

// =============================================================================
// Helper Components
// =============================================================================
const LoadingScreen = ({ message }: { message: string }) => (
  <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50">
    <Loader2 className="h-12 w-12 animate-spin text-indigo-600" />
    <p className="mt-4 text-gray-600 font-medium">{message}</p>
  </div>
);

const ErrorScreen = ({ message, onRetry }: { message: string; onRetry: () => void }) => (
  <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50">
    <AlertCircle className="h-12 w-12 text-red-500" />
    <p className="mt-4 text-gray-600 text-center max-w-md">{message}</p>
    <Button onClick={onRetry} className="mt-6">
      Try Again
    </Button>
  </div>
);

const StatCard = ({ icon: Icon, title, value }: { icon: React.ElementType; title: string; value: number }) => (
  <Card className="border-none shadow-md">
    <CardContent className="p-6 flex items-center gap-4">
      <div className="p-4 rounded-full bg-indigo-100">
        <Icon className="h-6 w-6 text-indigo-600" />
      </div>
      <div>
        <p className="text-sm text-gray-500 font-medium">{title}</p>
        <p className="text-3xl font-bold">{value}</p>
      </div>
    </CardContent>
  </Card>
);

export default StudentDashboard;