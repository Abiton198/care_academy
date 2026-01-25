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
  deleteDoc,
  doc,
  setDoc,
  getDoc,
  serverTimestamp
} from "firebase/firestore";

/* UI Components */
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";

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
  Users,
  Send,
  Hand,
  Mic,
  MicOff,
  Sparkles,
  MessageCircle,
  LayoutDashboard,
  Clock,
  ExternalLink
} from "lucide-react";



/* Auth & Signaling */
import { useAuth } from "../auth/AuthProvider";
import { Signaling } from "@/lib/signaling";
import MoodleCard from "./MoodleCard";
import { useParams } from "react-router-dom";


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
// CONTROL BUTTON COMPONENT
// =============================================================================
function ControlBtn({ icon: Icon, label, active, onClick, danger, success }: any) {
  return (
    <div className="flex flex-col items-center gap-1.5">
      <Button 
        onClick={onClick} 
        className={`w-12 h-12 rounded-2xl transition-all shadow-lg ${
          active 
            ? (danger ? 'bg-red-600 hover:bg-red-700' : 'bg-orange-500') 
            : (success ? 'bg-emerald-500 text-white' : 'bg-slate-800 hover:bg-slate-700 text-white border border-white/10')
        }`}
      >
        <Icon size={20} />
      </Button>
      <span className="text-[8px] font-black text-white/40 uppercase tracking-widest">{label}</span>
    </div>
  );
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================
const StudentDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading, logout } = useAuth();

  /* ---------------- DATA STATE ---------------- */
  const [profile, setProfile] = useState<StudentProfile | null>(null);
  const [profileLoaded, setProfileLoaded] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [timetable, setTimetable] = useState<TimetableEntry[]>([]);
  const [classLinks, setClassLinks] = useState<ClassLink[]>([]);
  const [linksLoaded, setLinksLoaded] = useState(false);

  /* ---------------- LIVE SESSION STATE ---------------- */
  const [isLive, setIsLive] = useState(false); // Controls if the classroom overlay is visible
  const [activeSession, setActiveSession] = useState<ClassLink | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<'searching' | 'connected' | 'disconnected'>('searching');
  const activeSessionId = activeSession?.id;

  // Media Toggles
  const [isMuted, setIsMuted] = useState(false);
  const [videoOff, setVideoOff] = useState(false);
  const [isHandRaised, setIsHandRaised] = useState(false);

  // Messaging & Presence
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [onlineStudents, setOnlineStudents] = useState<any[]>([]);
  const [isClassLive, setIsClassLive] = useState(false); // Green light indicator
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [showSummary, setShowSummary] = useState(false);
    const [isTeacherLive, setIsTeacherLive] = useState(false); // 
     const [IsLiveOverlay, setIsLiveOverlay] = useState(false); // 

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const signaling = useMemo(() => new Signaling())

   const [activeTab, setActiveTab] = useState<"overview" | "timetable" | "links">(
    "overview"
  );
const { studentId } = useParams<{ studentId: string }>();



  /* ---------------- 1. LOAD PROFILE & DATA ---------------- */
  useEffect(() => {
  if (authLoading || !user || !studentId) return;

  const loadProfile = async () => {
    try {
      const studentRef = doc(db, "students", studentId);
      const snap = await getDoc(studentRef);

      if (!snap.exists()) {
        setProfileError("Student not found.");
        return;
      }

      const data = snap.data();

      // 🔐 Security check: ensure this child belongs to this parent
      if (data.parentId !== user.uid) {
        setProfileError("Unauthorized access.");
        return;
      }

      setProfile({
        id: snap.id,
        firstName: data.firstName,
        grade: data.grade,
        email: data.email,
      });

    } catch (err) {
      console.error(err);
      setProfileError("Failed to load student profile.");
    } finally {
      setProfileLoaded(true);
    }
  };

  loadProfile();
}, [user, authLoading, studentId]);


  useEffect(() => {
    if (!profile?.grade) return;

    // Load Timetable
    const qTime = query(collection(db, "timetable"), where("grade", "==", profile.grade));
    const unsubTime = onSnapshot(qTime, (snap) => {
      setTimetable(snap.docs.map(d => ({ id: d.id, ...d.data() } as TimetableEntry)));
    });

    // Load Links & Watch for "Live" status
    const qLinks = query(collection(db, "class_links"), where("grade", "in", [profile.grade, "all"]));
    const unsubLinks = onSnapshot(qLinks, (snap) => {
      const links = snap.docs.map(d => ({ id: d.id, ...d.data() } as ClassLink));
      setClassLinks(links);
      
      // Look for any classroom link that is currently active in the 'rooms' collection
      links.forEach(link => {
        if (link.type === 'classroom') {
          onSnapshot(doc(db, "rooms", link.id), (roomSnap) => {
            if (roomSnap.exists() && roomSnap.data().status === "live") {
              setIsTeacherLive(true);
            } else {
              setIsTeacherLive(false);
            }
          });
        }
      });
    });

    return () => { unsubTime(); unsubLinks(); };
  }, [profile?.grade]);

  /* ---------------- 2. JOIN LIVE CLASSROOM ---------------- */
  const joinClass = async (link: ClassLink) => {
    setActiveSession(link);
    setIsLiveOverlay(true);
    // Logic for joinRoom(link.id, user.uid, profile.firstName) would trigger here
  };

  /* ---------------- UI HELPERS ---------------- */
  const today = new Intl.DateTimeFormat("en-US", { weekday: "long" }).format(new Date());
  const todayClasses = timetable.filter(t => t.day === today);


  const handleLogout = async () => {
  try {
    await logout();           // Firebase sign out
    navigate("/parent-dashboard");      // or "/parent/dashboard"
  } catch (err) {
    console.error("Logout failed", err);
  }
};


  /* ---------------- 1. DASHBOARD SYNC (OVERVIEW) ---------------- */
  

 const handleExit = async () => {
  console.log("Initiating exit sequence...");
  
  try {
    // 1. STOP HARDWARE TRACKS (Crucial for the camera light to turn off)
    // We check the ref directly before we nullify it
    if (localVideoRef.current && localVideoRef.current.srcObject) {
      const stream = localVideoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => {
        track.stop();
        console.log(`Hardware stopped: ${track.kind}`);
      });
    }

    // 2. SIGNALING CLEANUP
    // This closes the PeerConnection and stops internal tracks in your Signaling class
    await signaling.hangUp();

    // 3. FIRESTORE CLEANUP
    // Remove the student from the "Online List" so the teacher sees them leave
    if (activeSession?.id && user?.uid) {
      const participantRef = doc(db, "rooms", activeSession.id, "participants", user.uid);
      await deleteDoc(participantRef);
      console.log("Removed from participant list");
    }

  } catch (err) {
    // We catch errors here so the UI still closes even if the internet drops
    console.error("Cleanup error (non-fatal):", err);
  } finally {
    // 4. UI RESET (Always happens regardless of success or failure)
    if (localVideoRef.current) localVideoRef.current.srcObject = null;
    if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;
    
    setIsLiveOverlay(false);
    setActiveSession(null);
    console.log("Student Dashboard: Exit complete.");
  }
};


  const handleJoinClass = async (link: any) => {
  // 1. Set the session info first
  setActiveSession(link);
  setIsLiveOverlay(true);

  // 2. Use a timeout to ensure the DOM has rendered the <video> tags
  // before signaling tries to attach streams to them.
  setTimeout(async () => {
    try {
      if (localVideoRef.current && remoteVideoRef.current) {
        console.log("Initializing Media...");
        await signaling.openUserMedia(localVideoRef.current, remoteVideoRef.current);
        
        console.log("Joining Room...");
        await signaling.joinRoom(link.id, user!.uid, profile.firstName);
      }
    } catch (err) {
      console.error("Critical Connection Error:", err);
      alert("Could not access camera. Please check permissions.");
      setIsLiveOverlay(false);
    }
  }, 100); 
};

  useEffect(() => {
  // 1. Guard clause: If profile or grade is missing, don't run the query
  if (!profile?.grade) return;

  // 2. Use 'profile.grade' directly in the query
  const qLinks = query(
    collection(db, "class_links"),
    where("targetGrade", "in", ["all", profile.grade]), // FIX: Use profile.grade here
    orderBy("createdAt", "desc")
  );

  const unsub = onSnapshot(qLinks, (snap) => {
    setClassLinks(snap.docs.map(d => ({ id: d.id, ...d.data() } as ClassLink)));
    setLinksLoaded(true);
  }, (err) => {
    console.error("Link Subscription Error:", err);
  });

  return () => unsub();
}, [profile?.grade]); // 3. This ensures it re-runs if the grade changes

  /* ---------------- 2. LIVE STATUS WATCHER (GREEN LIGHT) ---------------- */
  useEffect(() => {
    // We watch ALL classroom links to see if any are currently 'live'
    const classroomLinks = classLinks.filter(l => l.type === "classroom");
    if (classroomLinks.length === 0) return;

    const unsubscribes = classroomLinks.map(link => {
      return onSnapshot(doc(db, "rooms", link.id), (snap) => {
        if (snap.exists() && snap.data().status === "live") {
          setIsClassLive(true);
        }
      });
    });

    return () => unsubscribes.forEach(unsub => unsub());
  }, [classLinks]);

  /* ---------------- 3. WEBRTC & PRESENCE LOGIC ---------------- */
  useEffect(() => {
    if (!isLive || !activeSessionId || !user) return;

    const startStream = async () => {
      try {
        await signaling.openUserMedia(localVideoRef.current!, remoteVideoRef.current!);
        
        // Register in Online List (Updates Teacher Dashboard)
        const pRef = doc(db, "rooms", activeSessionId, "participants", user.uid);
        await setDoc(pRef, {
          name: profile?.firstName || "Student",
          role: 'student',
          joinedAt: serverTimestamp(),
          isHandRaised: false
        });

        await signaling.joinRoom(
          activeSessionId, 
          user.uid, 
          profile?.firstName || "Student"
        );

        // Track ICE connection state
        const monitor = setInterval(() => {
          const state = signaling.peerConnection?.iceConnectionState;
          if (state === 'connected' || state === 'completed') setConnectionStatus('connected');
          else if (state === 'failed' || state === 'closed') setConnectionStatus('disconnected');
        }, 2000);

        return () => clearInterval(monitor);
      } catch (err) {
        console.error("Connection failed:", err);
      }
    };

    startStream();
  }, [isLive, activeSessionId, user, profile, signaling]);

  /* ---------------- 4. CHAT & ROSTER SYNC ---------------- */
  useEffect(() => {
    if (!isLive || !activeSessionId) return;

    const qChat = query(collection(db, "rooms", activeSessionId, "chat"), orderBy("timestamp", "asc"));
    const unsubChat = onSnapshot(qChat, (snap) => {
      setMessages(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      scrollRef.current?.scrollIntoView({ behavior: "smooth" });
    });

    const unsubRoster = onSnapshot(collection(db, "rooms", activeSessionId, "participants"), (snap) => {
      setOnlineStudents(snap.docs.map(d => d.data()).filter((p: any) => p.role === 'student'));
    });

    return () => { unsubChat(); unsubRoster(); };
  }, [isLive, activeSessionId]);

  /* ---------------- 5. TIMER & AUTO-DISMISS ---------------- */
  useEffect(() => {
    if (!isLive || !activeSessionId) return;

    const unsub = onSnapshot(doc(db, "rooms", activeSessionId), (snap) => {
      const data = snap.data();
      if (data?.endAt) {
        const interval = setInterval(() => {
          const remaining = Math.max(0, Math.floor((data.endAt - Date.now()) / 1000));
          setTimeLeft(remaining);
          if (remaining <= 0) {
            clearInterval(interval);
            handleEndSession();
          }
        }, 1000);
        return () => clearInterval(interval);
      }
    });

    return () => unsub();
  }, [isLive, activeSessionId]);

  useEffect(() => {
  if (!activeSessionId) return;

  // 1. Listen to Room
  const unsubRoom = onSnapshot(doc(db, "rooms", activeSessionId), (snap) => {
    // logic
  }, (err) => console.error("Room Listener Error:", err));

  // 2. Listen to Chat
  const unsubChat = onSnapshot(collection(db, "rooms", activeSessionId, "chat"), (snap) => {
    // logic
  }, (err) => console.error("Chat Listener Error:", err));

  // CLEANUP: This is the most important part!
  return () => {
    unsubRoom();
    unsubChat();
  };
}, [activeSessionId]); // If activeSessionId becomes null, these stop.

  /* ---------------- HANDLERS ---------------- */
  const handleEndSession = () => {
    setShowSummary(true);
    stopMedia();
  };

  const stopMedia = () => {
    signaling.hangUp();
    if (localVideoRef.current?.srcObject) {
      (localVideoRef.current.srcObject as MediaStream).getTracks().forEach(t => t.stop());
      localVideoRef.current.srcObject = null;
    }
  };

  const handleLeaveMeeting = async () => {
    if (activeSessionId && user) {
      await deleteDoc(doc(db, "rooms", activeSessionId, "participants", user.uid));
    }
    stopMedia();
    setIsLive(false);
    setShowSummary(false);
  };

  const sendChatMessage = async () => {
    if (!newMessage.trim() || !activeSessionId) return;
    await signaling.sendMessage(activeSessionId, profile?.firstName || "Student", newMessage);
    setNewMessage("");
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (authLoading || !profileLoaded) return <LoadingScreen />;

  if (authLoading) return <div className="p-10 text-center">Loading Portal...</div>;

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
      
      {/* TOP NAV */}
        <div className="min-h-screen bg-[#F8FAFC]">
      {/* HEADER */}
      <header className="bg-white border-b sticky top-0 z-40">
       <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
  <div>
    <h1 className="font-black">
      {profile?.firstName
        ? `${profile.firstName}'s Portal`
        : "Student Portal"}
    </h1>

    <p className="text-xs text-slate-400">
      {profile?.grade
        ? `Grade ${profile.grade}`
        : "Loading student profile..."}
    </p>
  </div>

  <Button variant="ghost" onClick={handleLogout}>
    <LogOut size={16} className="mr-2" />
    Logout
  </Button>
</div>

        <nav className="max-w-7xl mx-auto px-6 flex gap-8">
          {[
            { id: "overview", icon: LayoutDashboard, label: "Overview" },
            { id: "timetable", icon: Clock, label: "Schedule" },
            { id: "links", icon: Video, label: "Resources" },
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id as any)}
              className={`py-4 text-xs font-black uppercase ${
                activeTab === t.id
                  ? "border-b-2 border-indigo-600 text-indigo-600"
                  : "text-slate-400"
              }`}
            >
              <t.icon size={14} className="inline mr-2" />
              {t.label}
            </button>
          ))}
        </nav>
      </header>

       <MoodleCard/>

      <main className="max-w-7xl mx-auto p-6 md:p-10">
        
        {/* 1. OVERVIEW TAB */}
        {activeTab === "overview" && (
          <div className="space-y-10 animate-in fade-in duration-500">
            {/* STAT CARDS */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <StatCard icon={CalendarIcon} title="Today's Lessons" value={todayClasses.length} color="indigo" />
              <StatCard icon={BookOpen} title="Weekly Total" value={timetable.length} color="amber" />
              <StatCard icon={Video} title="Available Links" value={classLinks.length} color="emerald" />
            </div>

            {/* LIVE NOTIFICATION BOX */}
            {/* {isTeacherLive && (
              <div className="bg-slate-900 rounded-[2.5rem] p-8 flex flex-col md:flex-row items-center justify-between gap-6 border-4 border-emerald-500/20 shadow-2xl">
                <div className="flex items-center gap-6">
                  <div className="w-16 h-16 bg-emerald-500 rounded-2xl flex items-center justify-center text-white animate-pulse shadow-lg shadow-emerald-500/20">
                    <Video size={32} />
                  </div>
                  <div>
                    <h3 className="text-white text-2xl font-black italic tracking-tighter uppercase">Class is in Progress!</h3>
                    <p className="text-emerald-400 font-bold text-[10px] uppercase tracking-widest">Join now to start your live session</p>
                  </div>
                </div>
                <Button 
                  onClick={() => setActiveTab('links')}
                  className="bg-emerald-500 hover:bg-emerald-600 text-white font-black px-10 h-14 rounded-2xl shadow-xl shadow-emerald-500/20"
                >
                  GO TO CLASSROOM
                </Button>
              </div>
            )} */}

            {/* UPCOMING TODAY LIST */}
            <div className="bg-white rounded-[2.5rem] p-8 border border-slate-100 shadow-sm">
              <h2 className="text-sm font-black text-slate-400 uppercase tracking-widest mb-6">Today's Schedule ({today})</h2>
              <div className="space-y-4">
                {todayClasses.length > 0 ? todayClasses.map((item) => (
                  <div key={item.id} className="flex items-center justify-between p-5 bg-slate-50 rounded-3xl border border-slate-100">
                    <div className="flex items-center gap-5">
                      <div className="w-12 h-12 bg-white rounded-2xl flex flex-col items-center justify-center shadow-sm">
                        <span className="text-[10px] font-black text-indigo-600 leading-none">{item.time.split(' ')[1]}</span>
                        <span className="text-[12px] font-black text-slate-800">{item.time.split(' ')[0]}</span>
                      </div>
                      <div>
                        <h4 className="font-black text-slate-800 text-sm uppercase">{item.subject}</h4>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{item.teacherName}</p>
                      </div>
                    </div>
                    <Badge className="bg-white text-slate-500 border-slate-200">Upcoming</Badge>
                  </div>
                )) : <p className="text-slate-400 italic text-sm">No lessons scheduled for today.</p>}
              </div>
            </div>
          </div>
        )}

        {/* 2. TIMETABLE TAB */}
        {activeTab === "timetable" && (
          <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden animate-in slide-in-from-bottom-4 duration-500">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100">
                    {["Day", "Time", "Subject", "Teacher"].map(h => (
                      <th key={h} className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {timetable.sort((a,b) => a.day.localeCompare(b.day)).map((entry) => (
                    <tr key={entry.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="p-6 font-black text-slate-800 text-xs uppercase">{entry.day}</td>
                      <td className="p-6 font-bold text-slate-500 text-xs">{entry.time}</td>
                      <td className="p-6">
                        <span className="px-3 py-1 bg-indigo-50 text-indigo-600 rounded-lg font-black text-[10px] uppercase">
                          {entry.subject}
                        </span>
                      </td>
                      <td className="p-6 text-xs font-bold text-slate-400">{entry.teacherName}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* 3. LINKS TAB */}
        {activeTab === "links" && (
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 animate-in zoom-in-95 duration-500">
    {classLinks.map((link) => (
      <Card 
        key={link.id} 
        className="group border-0 shadow-xl rounded-[2.5rem] overflow-hidden hover:scale-[1.03] transition-all cursor-pointer bg-white"
        onClick={() => {
          // Logic: Check if the link is external or if we should use internal joinClass
          const isExternal = link.url?.startsWith('http') || link.url?.includes('.') ;
          
          if (isExternal) {
            // Ensure the URL has a protocol
            const destination = link.url.startsWith('http') ? link.url : `https://${link.url}`;
            window.open(destination, '_blank');
          } else {
            // Fallback to internal logic if it's just a room ID
            joinClass(link);
          }
        }}
      >
        <CardContent className="p-8">
          <div className="flex items-center gap-5 mb-6">
            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all shadow-sm ${
              link.type === 'classroom' 
                ? 'bg-indigo-50 text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white' 
                : 'bg-amber-50 text-amber-600 group-hover:bg-amber-600 group-hover:text-white'
            }`}>
              {link.type === 'classroom' ? <Video size={24} /> : <FileText size={24} />}
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="font-black text-slate-800 uppercase text-sm truncate tracking-tight group-hover:text-indigo-600 transition-colors">
                {link.title}
              </h4>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-0.5">
                Authored by: <span className="text-slate-600">{link.teacherName}</span>
              </p>
            </div>
          </div>

          {/* URL PREVIEW AREA */}
          <div className="mb-6 p-3 bg-slate-50 rounded-xl border border-slate-100 group-hover:bg-indigo-50/50 transition-colors">
            <p className="text-[10px] font-mono text-indigo-400 truncate">
              {link.url}
            </p>
          </div>
          
          <div className="flex items-center justify-between pt-6 border-t border-slate-100">
            <Badge className={`border-none font-black text-[9px] uppercase tracking-widest px-4 py-1.5 rounded-xl ${
              link.type === 'classroom' ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-500'
            }`}>
              {link.type === 'classroom' ? '● Live Session' : 'Resource Material'}
            </Badge>
            <div className="flex items-center gap-2 text-[10px] font-black text-slate-300 group-hover:text-indigo-600 transition-all">
              <span className="opacity-0 group-hover:opacity-100 transition-opacity">OPEN LINK</span>
              <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center text-slate-300 group-hover:bg-indigo-600 group-hover:text-white transition-all shadow-sm">
                <ExternalLink size={18} />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    ))}
  </div>
)}
      </main>
    </div>

      <main className="max-w-7xl mx-auto p-6 md:p-10">
        
        {/* LIVE ALERT BANNER */}
        {isClassLive && !isLive && (
          <div className="mb-10 bg-emerald-500 p-1 rounded-[2rem] shadow-2xl shadow-emerald-200 animate-bounce">
            <div className="bg-slate-900 rounded-[1.9rem] p-6 flex flex-col md:flex-row items-center justify-between gap-6">
              <div className="flex items-center gap-6">
                <div className="relative flex h-4 w-4">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-4 w-4 bg-emerald-500"></span>
                </div>
                <div>
                  <h3 className="text-white font-black text-xl italic tracking-tighter uppercase">Live Session Detected</h3>
                  <p className="text-white/40 text-[10px] font-bold uppercase tracking-widest">Your teacher is currently in the classroom</p>
                </div>
              </div>
              <Button onClick={() => {
                const liveLink = classLinks.find(l => l.type === "classroom");
                if (liveLink) { setActiveSession(liveLink); setIsLive(true); }
              }} className="bg-emerald-500 hover:bg-emerald-600 text-white font-black px-10 h-14 rounded-2xl shadow-xl shadow-emerald-500/20">
                JOIN CLASSROOM NOW
              </Button>
            </div>
          </div>
        )}

       {/* RESOURCE GRID */}
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
  {classLinks.map((link) => (
    <Card 
      key={link.id} 
      className="group border-0 shadow-xl rounded-[2.5rem] overflow-hidden hover:scale-[1.02] transition-all cursor-pointer bg-white" 
      onClick={() => {
        // logic: If it's a classroom type but has a valid external URL, go to the URL.
        // If you still want the OPTION for internal WebRTC, you can check if the URL includes 'internal'
        if (link.url && (link.url.startsWith('http') || link.url.includes('zoom.us') || link.url.includes('meet.google'))) {
          window.open(link.url.startsWith('http') ? link.url : `https://${link.url}`, '_blank');
        } else if (link.type === 'classroom') {
          // Fallback for internal WebRTC if no external URL is provided
          setActiveSession(link); 
          setIsLive(true); 
        } else {
          window.open(link.url, '_blank');
        }
      }}
    >
      <CardContent className="p-8">
        <div className="flex items-center gap-5 mb-6">
          <div className={`w-14 h-14 rounded-[1.2rem] flex items-center justify-center ${link.type === 'classroom' ? 'bg-indigo-50 text-indigo-600' : 'bg-amber-50 text-amber-600'}`}>
            {link.type === 'classroom' ? <Video size={24} /> : <FileText size={24} />}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
               <h4 className="font-black text-slate-800 uppercase text-sm truncate">{link.title}</h4>
               {link.type === 'classroom' && (
                 <span className="flex h-2 w-2 rounded-full bg-rose-500 animate-pulse" />
               )}
            </div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
              {link.teacherName}
            </p>
          </div>
        </div>

        <div className="space-y-3">
          <p className="text-[11px] text-slate-500 font-medium line-clamp-1 italic bg-slate-50 p-2 rounded-lg border border-slate-100">
            {link.url}
          </p>
          
          <div className="flex items-center justify-between pt-4 border-t border-slate-50">
             <Badge className={`border-none font-black text-[9px] px-3 py-1 rounded-full ${
               link.type === 'classroom' ? 'bg-indigo-100 text-indigo-600' : 'bg-amber-100 text-amber-600'
             }`}>
               {link.type === 'classroom' ? 'LIVE SESSION' : 'STUDY MATERIAL'}
             </Badge>
             <div className="w-10 h-10 bg-slate-900 rounded-xl flex items-center justify-center text-white group-hover:bg-indigo-600 transition-all shadow-lg">
               <ExternalLink size={18} />
             </div>
          </div>
        </div>
      </CardContent>
    </Card>
  ))}

</div>
      </main>
 

      {/* ======================================================
                 LIVE CLASSROOM FULL-SCREEN OVERLAY
      ====================================================== */}
      {isLive && (
        <div className="fixed inset-0 z-[100] bg-slate-950 flex flex-col animate-in fade-in duration-500">
          
          {/* OVERLAY HEADER */}
          <div className="h-20 px-8 border-b border-white/5 flex items-center justify-between bg-slate-900/40 backdrop-blur-xl">
             <div className="flex items-center gap-6">
                <div className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest flex items-center gap-2 ${connectionStatus === 'connected' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-amber-500/10 text-amber-500'}`}>
                  <div className={`w-2 h-2 rounded-full ${connectionStatus === 'connected' ? 'bg-emerald-500 shadow-[0_0_8px_#10b981]' : 'bg-amber-500 animate-pulse'}`} />
                  {connectionStatus === 'connected' ? 'Secure Link Active' : 'Connecting...'}
                </div>
                {timeLeft !== null && (
                  <div className="flex items-center gap-2 text-white/40 font-mono text-sm">
                    <ClockIcon size={14} /> {formatTime(timeLeft)}
                  </div>
                )}
             </div>
             <Button variant="destructive" className="rounded-2xl font-black text-xs uppercase tracking-widest px-8 h-12" onClick={handleLeaveMeeting}>
               Exit Session
             </Button>
          </div>

          <div className="flex-1 p-4 md:p-8 flex flex-col lg:flex-row gap-8 overflow-hidden">
            
            {/* STAGE AREA (Responsive Stack) */}
            <div className="flex-[3] relative bg-slate-900 rounded-[3rem] overflow-hidden border border-white/5 shadow-inner">
               <video ref={remoteVideoRef} autoPlay playsInline className="w-full h-full object-cover" />
               
               {/* Loading Guard */}
               {connectionStatus !== 'connected' && (
                 <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-2xl flex flex-col items-center justify-center text-center">
                    <Loader2 className="w-12 h-12 text-indigo-500 animate-spin mb-6" />
                    <h2 className="text-white font-black text-2xl tracking-tighter italic uppercase">Synchronizing...</h2>
                    <p className="text-white/30 text-[10px] font-bold uppercase tracking-widest mt-2">Waiting for teacher media stream</p>
                 </div>
               )}

               {/* STUDENT MINI-PREVIEW (Draggable Logic omitted for brevity) */}
               <div className="absolute top-8 right-8 w-48 h-32 bg-black rounded-3xl border-2 border-white/10 shadow-2xl overflow-hidden ring-4 ring-black/50 z-20">
                  <video ref={localVideoRef} autoPlay muted playsInline className="w-full h-full object-cover scale-x-[-1]" />
                  {videoOff && <div className="absolute inset-0 bg-slate-900 flex items-center justify-center text-white/20 font-black text-[8px] uppercase">Cam Off</div>}
               </div>

               {/* FLOATING CONTROLS */}
               <div className="absolute bottom-10 left-1/2 -translate-x-1/2 bg-slate-900/90 backdrop-blur-3xl border border-white/10 rounded-[2.5rem] p-4 flex items-center gap-6 shadow-2xl z-30 group hover:scale-105 transition-transform">
                  <ControlBtn icon={isMuted ? MicOff : Mic} label="Audio" active={isMuted} danger onClick={() => setIsMuted(!isMuted)} />
                  <ControlBtn icon={Video} label="Video" active={videoOff} danger onClick={() => setVideoOff(!videoOff)} />
                  <div className="w-px h-8 bg-white/10 mx-2" />
                  <ControlBtn icon={Hand} label="Raise Hand" active={isHandRaised} success={isHandRaised} onClick={() => setIsHandRaised(!isHandRaised)} />
               </div>
            </div>

            {/* SIDEBAR (Stacked on Mobile) */}
            <div className="w-full lg:w-[400px] flex flex-col gap-6 h-full">
               
               {/* ROSTER */}
               <div className="bg-white/5 border border-white/5 rounded-[2.5rem] p-8 flex flex-col h-1/3">
                  <div className="flex items-center justify-between mb-6">
                    <h5 className="text-white/40 text-[10px] font-black uppercase tracking-widest">In Attendance</h5>
                    <Badge className="bg-indigo-500 text-white border-none text-[10px] px-3">{onlineStudents.length}</Badge>
                  </div>
                  <div className="flex-1 overflow-y-auto space-y-3 custom-scrollbar">
                    {onlineStudents.map((s, i) => (
                      <div key={i} className="flex items-center gap-3 bg-white/5 p-3 rounded-2xl border border-white/5">
                        <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_#10b981]" />
                        <span className="text-white/80 text-xs font-bold">{s.name} {s.id === user?.uid && "(You)"}</span>
                      </div>
                    ))}
                  </div>
               </div>

               {/* CHAT */}
               <div className="bg-white/5 border border-white/5 rounded-[2.5rem] p-8 flex flex-col flex-1 min-h-[400px]">
                  <h5 className="text-white/40 text-[10px] font-black uppercase tracking-widest mb-6 flex items-center gap-2">
                    <MessageCircle size={12} /> Discussion
                  </h5>
                  <div className="flex-1 overflow-y-auto space-y-4 mb-6 pr-2 custom-scrollbar">
                    {messages.map((m, i) => (
                      <div key={i} className={`flex flex-col ${m.sender === profile?.firstName ? 'items-end' : 'items-start'}`}>
                        <span className="text-[9px] font-black text-indigo-400 uppercase mb-1">{m.sender}</span>
                        <div className={`p-4 rounded-2xl text-sm max-w-[85%] ${m.sender === profile?.firstName ? 'bg-indigo-600 text-white rounded-tr-none' : 'bg-white/10 text-white/90 rounded-tl-none'}`}>
                          {m.text}
                        </div>
                      </div>
                    ))}
                    <div ref={scrollRef} />
                  </div>
                  <div className="flex gap-2 bg-slate-900 border border-white/10 p-2 rounded-2xl focus-within:border-indigo-500 transition-colors">
                    <input 
                      type="text" 
                      value={newMessage} 
                      onChange={(e) => setNewMessage(e.target.value)} 
                      onKeyDown={(e) => e.key === 'Enter' && sendChatMessage()}
                      placeholder="Type a message..." 
                      className="bg-transparent text-white text-xs flex-1 px-4 outline-none font-medium"
                    />
                    <Button onClick={sendChatMessage} className="bg-indigo-600 rounded-xl hover:bg-indigo-500 transition-colors h-10 w-10 p-0">
                      <Send size={16} />
                    </Button>
                  </div>
               </div>
            </div>
          </div>

          {/* SUMMARY MODAL */}
          {showSummary && (
            <div className="absolute inset-0 z-[200] bg-slate-950/95 backdrop-blur-3xl flex items-center justify-center p-8 animate-in zoom-in-95 duration-500">
               <div className="max-w-md w-full text-center">
                  <div className="w-24 h-24 bg-emerald-500/20 rounded-[2.5rem] mx-auto flex items-center justify-center mb-10 border border-emerald-500/20 shadow-2xl">
                    <div className="w-12 h-12 bg-emerald-500 rounded-2xl flex items-center justify-center shadow-[0_0_30px_rgba(16,185,129,0.5)]">
                      <Sparkles className="text-white" size={24} />
                    </div>
                  </div>
                  <h2 className="text-4xl font-black text-white italic uppercase tracking-tighter mb-4 leading-none">Class Completed</h2>
                  <p className="text-white/40 text-[10px] font-black uppercase tracking-widest mb-12">Lesson has concluded on schedule</p>
                  
                  <div className="bg-white/5 rounded-[2.5rem] border border-white/5 p-8 mb-10 flex flex-col gap-4">
                     <div className="flex justify-between items-center text-sm font-bold border-b border-white/5 pb-4">
                        <span className="text-white/40">Subject</span>
                        <span className="text-white">{activeSession?.title}</span>
                     </div>
                     <div className="flex justify-between items-center text-sm font-bold">
                        <span className="text-white/40">Educator</span>
                        <span className="text-white">{activeSession?.teacherName}</span>
                     </div>
                  </div>

                  <Button onClick={handleLeaveMeeting} className="w-full h-16 rounded-[1.8rem] bg-indigo-600 hover:bg-indigo-700 text-white font-black uppercase tracking-widest text-xs shadow-2xl transition-all active:scale-95">
                    Return to Portal
                  </Button>
               </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// ... (Sub-components like LoadingScreen/ClockIcon omitted for space)
const LoadingScreen = () => (
  <div className="h-screen bg-slate-50 flex flex-col items-center justify-center">
    <Loader2 className="w-10 h-10 text-indigo-600 animate-spin mb-4" />
    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Synchronizing Portal...</p>
  </div>
);

const ClockIcon = ({ size }: { size: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
);

  
/* =============================================================================
   SUB-COMPONENTS
   ============================================================================= */

const StatCard = ({ icon: Icon, title, value, color }: any) => {
  const colorMap: any = {
    indigo: "bg-indigo-50 text-indigo-600",
    amber: "bg-amber-50 text-amber-600",
    emerald: "bg-emerald-50 text-emerald-600",
  };

  return (
    <Card className="border-0 shadow-sm rounded-[2rem] overflow-hidden">
      <CardContent className="p-8 flex items-center gap-6">
        <div className={`w-16 h-16 rounded-[1.5rem] flex items-center justify-center ${colorMap[color]}`}>
          <Icon size={28} />
        </div>
        <div>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{title}</p>
          <p className="text-3xl font-black text-slate-800 tracking-tighter italic">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}

export default StudentDashboard;