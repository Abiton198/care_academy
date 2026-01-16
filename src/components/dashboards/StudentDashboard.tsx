/* =============================================================================
   StudentDashboard.tsx – Secure Student Portal (React + TS + Firebase)
   ============================================================================= */

import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { db } from "@/lib/firebaseConfig";
import {
  collection,
  getDocs,
  onSnapshot,
  query,
  where,
  orderBy,
} from "firebase/firestore";

/* UI Components */
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

/* Icons */
import {
  Loader2,
  LogOut,
  ArrowRight,
  Video,
  BookOpen,
  Calendar as CalendarIcon,
  AlertCircle,
  FileText,
  User,
} from "lucide-react";

/* Auth & Signaling */
import { useAuth } from "../auth/AuthProvider";
import { Signaling } from "@/lib/signaling";

// =============================================================================
// TYPES
// =============================================================================
interface StudentProfile {
  id: string;
  firstName: string;
  grade: string;
  email?: string;
}

interface TimetableEntry {
  id: string;
  day: string;
  time: string;
  subject: string;
  teacherName: string;
  grade: string;
  curriculum: string;
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

  /* ---------------- PROFILE & DATA STATE ---------------- */
  const [profile, setProfile] = useState<StudentProfile | null>(null);
  const [profileLoaded, setProfileLoaded] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [timetable, setTimetable] = useState<TimetableEntry[]>([]);
  const [classLinks, setClassLinks] = useState<ClassLink[]>([]);
  const [linksLoaded, setLinksLoaded] = useState(false);

  /* ---------------- UI STATE ---------------- */
  const [activeTab, setActiveTab] = useState<"overview" | "timetable" | "links">("overview");

  /* ---------------- LIVE SESSION & CHAT STATE ---------------- */
  const [isLive, setIsLive] = useState(false);
  const [activeSession, setActiveSession] = useState<ClassLink | null>(null);
  const [isHandRaised, setIsHandRaised] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'searching' | 'connected' | 'disconnected'>('searching');
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState("");

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const signaling = useMemo(() => new Signaling(), []);

  // ---------------- LIVE SESSION EFFECT ----------------
  useEffect(() => {
    if (!isLive || !activeSession) return;

    let checkConnection: any;

    const startStudentStream = async () => {
      try {
        await signaling.openUserMedia(localVideoRef.current!, remoteVideoRef.current!);
        await signaling.joinRoom(activeSession.id);

        checkConnection = setInterval(() => {
          const state = signaling.peerConnection?.iceConnectionState;
          if (state === 'connected' || state === 'completed') setConnectionStatus('connected');
          else if (state === 'failed') setConnectionStatus('disconnected');
        }, 2000);
      } catch (err) {
        console.error("Connection error:", err);
        setIsLive(false);
      }
    };

    startStudentStream();

    return () => {
      if (checkConnection) clearInterval(checkConnection);
      signaling.hangUp();
    };
  }, [isLive, activeSession, signaling]);

  // ---------------- CHAT MESSAGES EFFECT ----------------
  useEffect(() => {
    if (!isLive || !activeSession) return;

    const chatQuery = query(
      collection(db, "rooms", activeSession.id, "chat"),
      orderBy("timestamp", "asc")
    );

    const unsub = onSnapshot(chatQuery, (snapshot) => {
      const msgs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setMessages(msgs);
      setTimeout(() => scrollRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
    });

    return () => unsub();
  }, [isLive, activeSession]);

  const handleSend = async () => {
    if (!newMessage.trim() || !activeSession) return;
    await signaling.sendMessage(activeSession.id, profile?.firstName || "Student", newMessage);
    setNewMessage("");
  };

  // ---------------- PROFILE & DATA LOADERS ----------------
  useEffect(() => {
    if (authLoading || !user) return;
    const loadProfile = async () => {
      try {
        const q = query(collection(db, "students"), where("parentId", "==", user.uid), where("status", "==", "enrolled"));
        const snap = await getDocs(q);
        if (!snap.empty) {
          const data = snap.docs[0].data();
          setProfile({ id: snap.docs[0].id, firstName: data.firstName, grade: data.grade, email: data.parentEmail });
        } else {
          setProfileError("No enrolled student found.");
        }
      } catch (err) {
        setProfileError("Registry sync failed.");
      } finally {
        setProfileLoaded(true);
      }
    };
    loadProfile();
  }, [user, authLoading]);

  useEffect(() => {
    if (!profile?.grade) return;
    const qTimetable = query(collection(db, "timetable"), where("grade", "==", profile.grade));
    const qLinks = query(collection(db, "class_links"), where("grade", "in", [profile.grade, "all"]), orderBy("createdAt", "desc"));

    const unsubTimetable = onSnapshot(qTimetable, (snap) => {
      setTimetable(snap.docs.map(d => ({ id: d.id, ...d.data() } as TimetableEntry)));
    });
    const unsubLinks = onSnapshot(qLinks, (snap) => {
      setClassLinks(snap.docs.map(d => ({ id: d.id, ...d.data() } as ClassLink)));
      setLinksLoaded(true);
    });

    return () => { unsubTimetable(); unsubLinks(); };
  }, [profile?.grade]);

  // ---------------- STATS ----------------
  const stats = useMemo(() => {
    const today = new Intl.DateTimeFormat("en-US", { weekday: "long" }).format(new Date());
    return {
      todayClasses: timetable.filter(e => e.day === today).length,
      weeklyClasses: timetable.length,
      totalLinks: classLinks.length,
    };
  }, [timetable, classLinks]);

  // ---------------- UI HANDLERS ----------------
  if (authLoading || !profileLoaded) return <LoadingScreen message="Loading portal..." />;
  if (profileError || !profile) return <ErrorScreen message={profileError || "Profile not found"} onRetry={() => window.location.reload()} />;

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-5 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold text-2xl">{profile.firstName[0]}</div>
            <div>
              <h1 className="text-2xl font-bold">Welcome, {profile.firstName}</h1>
              <p className="text-sm text-gray-500">Grade {profile.grade} • British Curriculum</p>
            </div>
          </div>
          <Button variant="ghost" onClick={async () => { await logout(); navigate("/"); }}><LogOut className="mr-2 h-4 w-4" /> Logout</Button>
        </div>
        <nav className="border-t flex max-w-7xl mx-auto px-6 gap-8">
          {["overview", "timetable", "links"].map((tab) => (
            <button key={tab} onClick={() => setActiveTab(tab as any)} className={`py-4 text-sm font-medium ${activeTab === tab ? "border-b-2 border-indigo-600 text-indigo-600" : "text-gray-500"}`}>
              {tab.toUpperCase()}
            </button>
          ))}
        </nav>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-10">
        {activeTab === "overview" && (
          <div className="grid md:grid-cols-3 gap-6 mb-10">
            <StatCard icon={CalendarIcon} title="Today's Classes" value={stats.todayClasses} />
            <StatCard icon={BookOpen} title="Weekly Lessons" value={stats.weeklyClasses} />
            <StatCard icon={Video} title="Class Links" value={stats.totalLinks} />
          </div>
        )}

        {activeTab === "links" && (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {!linksLoaded ? <Loader2 className="animate-spin" /> : classLinks.map(link => (
              <LinkCard key={link.id} link={link} onJoin={() => { setActiveSession(link); setIsLive(true); }} />
            ))}
          </div>
        )}
      </main>

      {/* CLASSROOM OVERLAY */}
      {isLive && (
        <div className="fixed inset-0 z-[100] bg-slate-950 flex flex-col">
          <div className="h-16 px-8 flex items-center justify-between bg-slate-900/50 border-b border-white/5">
            <div className="flex items-center gap-4">
              <div className="w-3 h-3 bg-red-500 rounded-full animate-ping" />
              <h2 className="text-white font-black text-sm uppercase tracking-widest">{activeSession?.title}</h2>
            </div>
            <Button variant="destructive" size="sm" onClick={() => setIsLive(false)}>LEAVE CLASS</Button>
          </div>

          <div className="flex-1 p-6 flex gap-6 overflow-hidden">
            <div className={`flex-[3] relative bg-black rounded-[2.5rem] overflow-hidden border-4 transition-all ${connectionStatus === 'connected' ? 'border-emerald-500' : 'border-red-500 animate-pulse'}`}>
              <video ref={remoteVideoRef} autoPlay playsInline className="w-full h-full object-cover" />
              <div className="absolute bottom-8 right-8 w-64 h-40 bg-slate-800 rounded-3xl border-2 border-white/20 overflow-hidden">
                <video ref={localVideoRef} autoPlay muted playsInline className="w-full h-full object-cover scale-x-[-1]" />
              </div>
            </div>

            <div className="flex-1 flex flex-col gap-4">
              <div className="bg-white/5 rounded-[2rem] p-6 border border-white/10 flex-1 flex flex-col overflow-hidden">
                <p className="text-white/40 text-[10px] font-black uppercase mb-4">Class Chat</p>
                <div className="flex-1 overflow-y-auto space-y-4 mb-4 pr-2">
                  {messages.map((msg) => (
                    <div key={msg.id} className="flex flex-col">
                      <span className="text-[10px] font-bold text-indigo-400">{msg.senderName}</span>
                      <p className="text-white/80 text-sm bg-white/5 p-3 rounded-2xl rounded-tl-none">{msg.text}</p>
                    </div>
                  ))}
                  <div ref={scrollRef} />
                </div>
                <div className="flex gap-2 bg-white/5 p-2 rounded-2xl border border-white/10">
                  <input type="text" value={newMessage} onChange={(e) => setNewMessage(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSend()} placeholder="Type..." className="bg-transparent text-white text-sm flex-1 outline-none px-2" />
                  <Button onClick={handleSend} size="sm"><ArrowRight size={16} /></Button>
                </div>
              </div>
              <Button onClick={() => setIsHandRaised(!isHandRaised)} className={`w-full py-8 rounded-2xl font-black ${isHandRaised ? "bg-orange-500" : "bg-indigo-600"}`}>
                {isHandRaised ? "✋ LOWER HAND" : "🙋‍♂️ RAISE HAND"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// =============================================================================
// HELPERS
// =============================================================================
const LinkCard = ({ link, onJoin }: { link: ClassLink; onJoin: () => void }) => (
  <div className="group bg-white border-2 p-6 rounded-[2rem] flex items-center justify-between cursor-pointer transition-all hover:border-indigo-200" onClick={link.type === 'classroom' ? onJoin : () => window.open(link.url, '_blank')}>
    <div className="flex items-center gap-5">
      <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center">
        {link.type === 'classroom' ? <Video size={20} /> : <FileText size={20} />}
      </div>
      <div>
        <h4 className="font-black text-slate-800 text-sm uppercase">{link.title}</h4>
        <p className="text-[10px] font-bold text-slate-400 uppercase">{link.teacherName}</p>
      </div>
    </div>
    <div className="bg-slate-50 p-2 rounded-xl text-slate-400 group-hover:bg-indigo-600 group-hover:text-white"><ArrowRight size={16} /></div>
  </div>
);

const StatCard = ({ icon: Icon, title, value }: any) => (
  <Card className="border-none shadow-md">
    <CardContent className="p-6 flex items-center gap-4">
      <div className="p-4 rounded-full bg-indigo-100"><Icon className="h-6 w-6 text-indigo-600" /></div>
      <div><p className="text-sm text-gray-500 font-medium">{title}</p><p className="text-3xl font-bold">{value}</p></div>
    </CardContent>
  </Card>
);

const LoadingScreen = ({ message }: { message: string }) => (
  <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50">
    <Loader2 className="h-12 w-12 animate-spin text-indigo-600" />
    <p className="mt-4 text-gray-600">{message}</p>
  </div>
);

const ErrorScreen = ({ message, onRetry }: any) => (
  <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 px-4 text-center">
    <AlertCircle className="h-12 w-12 text-red-500" />
    <p className="mt-4 text-gray-600 max-w-md">{message}</p>
    <Button onClick={onRetry} className="mt-6">Try Again</Button>
  </div>
);

export default StudentDashboard;