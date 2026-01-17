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
  doc,
  setDoc
} from "firebase/firestore";

/* UI Components */
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

/* Icons */
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
  Users,
  X,
  Send,
  Hand,
  Mic,
  MicOff,
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
// CONTROL BUTTON COMPONENT
// =============================================================================
function ControlBtn({ icon: Icon, label, active, onClick, danger, success }: any) {
  return (
    <div className="flex flex-col items-center gap-1.5">
      <Button 
        onClick={onClick} 
        className={`w-12 h-12 rounded-2xl transition-all ${
          active 
            ? (danger ? 'bg-red-600' : 'bg-orange-500') 
            : (success ? 'bg-emerald-500 text-white' : 'bg-white/10 hover:bg-white/20')
        }`}
      >
        <Icon size={20} />
      </Button>
      <span className="text-[8px] font-bold text-white/50 uppercase tracking-widest">{label}</span>
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

  /* ---------------- UI STATE ---------------- */
  const [activeTab, setActiveTab] = useState<"overview" | "timetable" | "links">("overview");

  /* ---------------- LIVE SESSION & UI STATE ---------------- */
  const [isLive, setIsLive] = useState(false);
  const [activeSession, setActiveSession] = useState<ClassLink | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<'searching' | 'connected' | 'disconnected'>('searching');
  
  // Media Toggles
  const [isMuted, setIsMuted] = useState(false);
  const [videoOff, setVideoOff] = useState(false);
  const [isHandRaised, setIsHandRaised] = useState(false);

  // Chat & Participants
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [onlineStudents, setOnlineStudents] = useState<any[]>([]);

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

// ===  timer 
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [showSummary, setShowSummary] = useState(false);
  const [isClassLive, setIsClassLive] = useState(false);

  // This stores the raw timestamp from Firestore (e.g., 1715832000000)
const [endTimestamp, setEndTimestamp] = useState<number | null>(null);





  /* ---------------- SIGNALING INSTANCE ---------------- */
  const signaling = useMemo(() => new Signaling(), []);

// prevent crush and rerouting
  useEffect(() => {
  return () => {
    stopAllMedia();
    signaling.hangUp();
  };
}, []);

// centralised reset
const resetSessionUI = () => {
  setIsLive(false);
  setShowSummary(false);
  setActiveSession(null);
  setTimeLeft(null);
  setConnectionStatus("searching");
  setIsHandRaised(false);
};



  /* ---------------- 1. LIVE SESSION EFFECT ---------------- */
  useEffect(() => {
    if (!isLive || !activeSession) return;

    let checkConnection: any;

    const startStudentStream = async () => {
      // Small delay to ensure DOM refs are ready
      await new Promise(r => setTimeout(r, 200));

      try {
        if (!localVideoRef.current || !remoteVideoRef.current) return;

        // Open Hardware
        await signaling.openUserMedia(localVideoRef.current, remoteVideoRef.current);
        
        // Join existing Firestore Room
        await signaling.joinRoom(activeSession.id);

        // Monitor Connection State
        checkConnection = setInterval(() => {
          const state = signaling.peerConnection?.iceConnectionState;
          if (state === 'connected' || state === 'completed') setConnectionStatus('connected');
          else if (state === 'failed' || state === 'closed') setConnectionStatus('disconnected');
          else setConnectionStatus('searching');
        }, 2000);

      } catch (err) {
        console.error("WebRTC Join Error:", err);
        handleLeaveMeeting();
      }
    };

    startStudentStream();

    return () => {
      if (checkConnection) clearInterval(checkConnection);
    };
  }, [isLive, activeSession, signaling]);

 /* ---------------- 2. MEDIA TOGGLE HANDLERS ---------------- */
  const toggleMute = () => {
    if (localVideoRef.current?.srcObject) {
      const stream = localVideoRef.current.srcObject as MediaStream;
      stream.getAudioTracks().forEach(track => track.enabled = isMuted);
      setIsMuted(!isMuted);
    }
  };

  const toggleVideo = () => {
    if (localVideoRef.current?.srcObject) {
      const stream = localVideoRef.current.srcObject as MediaStream;
      stream.getVideoTracks().forEach(track => track.enabled = videoOff);
      setVideoOff(!videoOff);
    }
  };

const handleLeaveMeeting = async () => {
  try {
    await signaling.hangUp();
  } catch (e) {
    console.warn("Hangup error:", e);
  }

  stopAllMedia(); // 🔥 HARD STOP camera + mic
  resetSessionUI()
};


  const handleHandRaise = () => {
    // In a production app, you'd update a 'participants' doc in Firestore
    setIsHandRaised(!isHandRaised);
  };
  
  /* ---------------- 3. CHAT LOGIC ---------------- */
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

  const sendChatMessage = async () => {
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

  /* ---------------- 4. CLASS TIMER EFFECT ---------------- */
useEffect(() => {
  if (!isLive || !activeSession?.id) return;

  const unsub = onSnapshot(doc(db, "rooms", activeSession.id), (doc) => {
    const data = doc.data();
    if (data?.endAt) {
      const timer = setInterval(() => {
        const remaining = Math.max(0, Math.floor((data.endAt - Date.now()) / 1000));
        setTimeLeft(remaining);
       if (remaining <= 0) {
          clearInterval(timer);
          setShowSummary(true);
          // Kill hardware but keep the UI overlay visible for the summary
          signaling.hangUp();
          stopAllMedia();

        }
      }, 1000);
      return () => clearInterval(timer);
    }
  });

  return () => unsub();
}, [isLive, activeSession]);


// live classes started
useEffect(() => {
  if (!activeSession?.id) return;

  const roomRef = doc(db, "rooms", activeSession.id);
  
  const unsubscribe = onSnapshot(roomRef, (snapshot) => {
    if (snapshot.exists()) {
      const data = snapshot.data();
      
      // 1. Check if class is live
      setIsClassLive(data.status === "live");
      
      // 2. Sync the endAt timestamp from the Teacher
      if (data.endAt) {
        setEndTimestamp(data.endAt); // This will now work!
      }
    } else {
      setIsClassLive(false);
      setEndTimestamp(null);
    }
  });

  return () => unsubscribe();
}, [activeSession?.id]);

// 
useEffect(() => {
  if (!endTimestamp || !isLive) return;

  const timer = setInterval(() => {
    const now = Date.now();
    const remaining = Math.max(0, Math.floor((endTimestamp - now) / 1000));
    
    setTimeLeft(remaining);

    // Auto-stop if time runs out
    if (remaining <= 0) {
      clearInterval(timer);
      setShowSummary(true); // Trigger the "Class Dismissed" UI
      signaling.hangUp();   // Kill the camera hardware
    }
  }, 1000);

  return () => clearInterval(timer);
}, [endTimestamp, isLive]);

// helper to stop all media
const stopAllMedia = () => {
  if (localVideoRef.current?.srcObject) {
    const stream = localVideoRef.current.srcObject as MediaStream;
    stream.getTracks().forEach(track => track.stop());
    localVideoRef.current.srcObject = null;
  }

  if (remoteVideoRef.current?.srcObject) {
    const stream = remoteVideoRef.current.srcObject as MediaStream;
    stream.getTracks().forEach(track => track.stop());
    remoteVideoRef.current.srcObject = null;
  }
};


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


{/* ======================================================
           LIVE CLASSROOM OVERLAY (Student View)
      ====================================================== */}
      {isClassLive ? (
  <div className="flex items-center gap-3 bg-emerald-500/10 border border-emerald-500/20 p-4 rounded-2xl">
    {/* Pulsing Green Dot */}
    <div className="relative flex h-3 w-3">
      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
      <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
    </div>
    
    <div className="flex-1">
      <h4 className="text-white font-bold text-sm">Class is Live!</h4>
      <p className="text-emerald-500/60 text-[10px] uppercase font-black">Join now to begin your session</p>
    </div>

    <Button 
      onClick={() => setIsLive(true)} // This triggers the joinRoom logic
      className="bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-xl px-6"
    >
      JOIN CLASS
    </Button>
  </div>
) : (
  <div className="text-white/20 text-xs italic">
    Waiting for teacher to start the session...
  </div>
)} 

      {isLive && (
        <div className="fixed inset-0 z-[100] bg-slate-950 flex flex-col animate-in fade-in duration-500">
          
          {/* HEADER BAR */}
          <div className="h-16 px-8 flex items-center justify-between bg-slate-900/50 border-b border-white/5">
            <div className="flex items-center gap-4">
              <div className={`w-3 h-3 rounded-full ${connectionStatus === 'connected' ? 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]' : 'bg-amber-500 animate-pulse'}`} />
              <h2 className="text-white font-black text-sm uppercase tracking-widest">
                {activeSession?.title} • {connectionStatus === 'connected' ? 'Class in Progress' : 'Connecting to Teacher...'}
              </h2>
            </div>

            <Button variant="destructive" size="sm" className="rounded-xl font-bold px-8 shadow-lg shadow-red-900/20" onClick={handleLeaveMeeting}>
              LEAVE CLASS
            </Button>
          </div>

{/* Lesson end summary */}
{showSummary && (
  <div className="absolute inset-0 z-[200] bg-slate-950/95 backdrop-blur-2xl flex flex-col items-center justify-center p-8 animate-in fade-in zoom-in duration-500">
    <div className="w-24 h-24 bg-emerald-500/20 rounded-[2.5rem] flex items-center justify-center mb-8 border border-emerald-500/30">
      <div className="w-12 h-12 bg-emerald-500 rounded-2xl flex items-center justify-center shadow-[0_0_30px_rgba(16,185,129,0.4)]">
        <BookOpen className="text-white" size={28} />
      </div>
    </div>

    <h2 className="text-4xl font-black text-white mb-2 uppercase tracking-tighter italic">Class Dismissed</h2>
    <p className="text-white/40 font-bold uppercase tracking-widest text-[10px] mb-12">Session successfully completed</p>

    <div className="grid grid-cols-2 gap-4 w-full max-w-md mb-12">
      <div className="bg-white/5 p-6 rounded-[2rem] border border-white/5 text-center">
        <p className="text-[10px] font-black text-indigo-400 uppercase mb-1">Duration</p>
        <p className="text-xl font-bold text-white">{classDuration} Mins</p>
      </div>
      <div className="bg-white/5 p-6 rounded-[2rem] border border-white/5 text-center">
        <p className="text-[10px] font-black text-indigo-400 uppercase mb-1">Subject</p>
        <p className="text-xl font-bold text-white truncate px-2">{activeSession?.title}</p>
      </div>
    </div>

    <div className="flex flex-col gap-4 w-full max-w-xs">
      <Button 
        className="h-14 rounded-[1.5rem] bg-indigo-600 hover:bg-indigo-700 text-white font-black uppercase tracking-widest text-xs shadow-xl transition-all active:scale-95"
      onClick={() => {
        stopAllMedia();
       resetSessionUI()
      }}

      >
        Return to Portal
      </Button>
      
      <Button 
        variant="ghost"
        className="text-white/40 hover:text-white text-[10px] font-black uppercase tracking-widest"
        onClick={() => {/* Function to export chat log */}}
      >
        Download Class Notes (Chat)
      </Button>
    </div>
  </div>
)}



       {/* Notification of lesson end */}
{timeLeft === 0 && (
  <div className="absolute inset-0 z-[200] bg-slate-950/90 backdrop-blur-xl flex flex-col items-center justify-center text-center p-6">
    <div className="w-20 h-20 bg-indigo-500/20 rounded-full flex items-center justify-center mb-6">
      <Video size={40} className="text-indigo-400" />
    </div>
    <h2 className="text-3xl font-black text-white mb-2 uppercase tracking-tighter">Lesson Concluded</h2>
    <p className="text-white/60 max-w-sm mb-8">The teacher has ended the session. You will be redirected to your dashboard in a moment.</p>
    <Button onClick={handleLeaveMeeting} className="bg-indigo-600 px-10 rounded-2xl font-bold">RETURN TO PORTAL</Button>
  </div>
)}

          <div className="flex-1 p-6 flex gap-6 overflow-hidden">
            
            {/* MAIN VIDEO STAGE (Teacher Feed) */}
            <div className={`flex-[3] relative bg-slate-900 rounded-[2.5rem] overflow-hidden group border-4 transition-all duration-700 ${
              connectionStatus === 'connected' ? 'border-emerald-500/20' : 'border-white/5'
            }`}>
              
              <video ref={remoteVideoRef} autoPlay playsInline className="w-full h-full object-cover" />

              {/* Status Indicator Sidebar */}
              <div className="absolute left-6 top-1/2 -translate-y-1/2 flex flex-col items-center gap-4">
                <div onClick={toggleMute} className={`p-4 rounded-2xl cursor-pointer transition-all border ${isMuted ? 'bg-red-500/20 border-red-500/40 text-red-500' : 'bg-emerald-500/20 border-emerald-500/40 text-emerald-500'}`}>
                  {isMuted ? <MicOff size={24} /> : <Mic size={24} className="animate-pulse" />}
                </div>
                <div onClick={handleHandRaise} className={`p-4 rounded-2xl cursor-pointer transition-all border ${isHandRaised ? 'bg-orange-500 text-white border-orange-400' : 'bg-white/5 text-white/40 border-white/10'}`}>
                  <Hand size={24} />
                </div>
              </div>

              {/* Waiting Overlay */}
              {connectionStatus !== 'connected' && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900/90 backdrop-blur-xl z-10">
                  <Loader2 className="w-12 h-12 text-indigo-500 animate-spin mb-4" />
                  <p className="text-white/40 font-black uppercase tracking-widest text-[10px]">Establishing Secure Connection...</p>
                </div>
              )}

              {/* BOTTOM STUDENT CONTROLS */}
              <div className="absolute bottom-10 left-1/2 -translate-x-1/2 flex items-center gap-8 bg-slate-900/90 backdrop-blur-2xl px-10 py-4 rounded-[2.5rem] border border-white/10 opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-y-4 group-hover:translate-y-0 shadow-2xl z-50">
                <ControlBtn icon={isMuted ? MicOff : Mic} label={isMuted ? "Unmute" : "Mute"} active={isMuted} onClick={toggleMute} danger />
                <ControlBtn icon={Video} label={videoOff ? "Cam On" : "Cam Off"} active={videoOff} onClick={toggleVideo} danger />
                <div className="w-px h-10 bg-white/10" />
                <ControlBtn icon={Hand} label={isHandRaised ? "Lower Hand" : "Raise Hand"} active={isHandRaised} onClick={handleHandRaise} success={isHandRaised} />
              </div>

              {/* STUDENT SELF-PREVIEW */}
              <div className="absolute top-8 right-8 w-44 h-28 bg-black rounded-3xl border-2 border-white/10 shadow-2xl overflow-hidden z-20">
                <video ref={localVideoRef} autoPlay muted playsInline className="w-full h-full object-cover scale-x-[-1]" />
                {videoOff && <div className="absolute inset-0 bg-slate-900 flex items-center justify-center text-[8px] text-white/20 font-black uppercase tracking-widest">No Video</div>}
              </div>
            </div>

            {/* SIDEBAR: CHAT & ROSTER */}
            <div className="w-96 flex flex-col gap-4">
              <div className="h-1/3 bg-white/5 rounded-[2rem] p-6 border border-white/10 flex flex-col">
                <p className="text-white/40 text-[10px] font-black uppercase tracking-widest mb-4 flex items-center justify-between">Classmates Online <Users size={12} /></p>
                <div className="flex-1 overflow-y-auto space-y-3 custom-scrollbar">
                   {/* This would be populated from a real-time participants collection */}
                   <div className="flex items-center gap-3 bg-white/5 p-3 rounded-2xl">
                     <div className="w-2 h-2 rounded-full bg-emerald-500" />
                     <span className="text-white/80 text-xs font-bold">{profile.firstName} (You)</span>
                   </div>
                </div>
              </div>

              <div className="flex-1 bg-white/5 rounded-[2rem] p-6 border border-white/10 flex flex-col overflow-hidden">
                <p className="text-white/40 text-[10px] font-black uppercase tracking-widest mb-4">Class Dialogue</p>
                <div className="flex-1 overflow-y-auto space-y-4 mb-4 pr-2 custom-scrollbar">
                  {messages.map((msg) => (
                    <div key={msg.id} className="flex flex-col">
                      <span className="text-[10px] font-bold text-indigo-400 uppercase">{msg.sender}</span>
                      <p className={`text-sm p-3 rounded-2xl mt-1 ${msg.sender === profile.firstName ? "bg-indigo-600/20 text-indigo-100 rounded-tr-none" : "bg-white/5 text-white/80 rounded-tl-none"}`}>
                        {msg.text}
                      </p>
                    </div>
                  ))}
                  <div ref={scrollRef} />
                </div>
                <div className="flex gap-2 bg-white/5 p-2 rounded-2xl border border-white/10">
                  <input type="text" value={newMessage} onChange={(e) => setNewMessage(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && sendChatMessage()} placeholder="Ask a question..." className="bg-transparent text-white text-sm flex-1 outline-none px-2" />
                  <Button size="icon" onClick={sendChatMessage} className="bg-indigo-600 rounded-xl"><Send size={16} /></Button>
                </div>
              </div>
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