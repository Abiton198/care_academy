"use client";

import React, { useEffect, useState, useRef, useMemo } from "react";
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
  getDoc,
  orderBy,
  addDoc,
  setDoc,
  deleteDoc,
} from "firebase/firestore";
import { getAuth, onAuthStateChanged, signOut, User } from "firebase/auth";
import { useNavigate } from "react-router-dom";
import MoodleCard from "./MoodleCard";

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
  Loader2, LogOut, Edit2, Save, ExternalLink, Video, Check, X, 
  Sparkles, BookOpen, Send, MessageCircle, Users, PlusCircle, Trash2, Settings, VideoOff,Mic, MicOff,
  Clock
} from "lucide-react";
/* Signaling Logic (WebRTC) */
import { Signaling } from "@/lib/signaling";
import { useAuth } from "../auth/AuthProvider";




/* =====================================================
   TYPES & INTERFACES
====================================================== */
interface TeacherProfile {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  bio?: string;
  subjects?: { name: string; curriculum: string }[];
  status?: "pending" | "approved" | "rejected";
}

interface TeacherUser {
  uid: string;
  email: string;
  personalInfo?: {
    firstName?: string;
    lastName?: string;
  };
  firstName?: string;
  lastName?: string;
}

interface TimetableSlot {
  id: string;
  day: string;
  time: string;
  subject: string;
  grade: string;
  curriculum: string;
}

interface Student {
  id: string;
  firstName: string;
  lastName: string;
  parentId: string;
  linkedParentId?: string;
  subjects: string[];
  grade?: string;
}

interface ClassLink {
  id: string;
  title: string;
  url: string;
  type: string;        // e.g., "classroom", "resource", "zoom"
  grade: string;       // e.g., "Primary", "A-Level", or "all"
  teacherId: string;   // The UID of the teacher
  teacherName: string; // The flattened name (e.g., "Adel Tops")
  createdAt: any;      // Firestore Timestamp
}

interface Conversation {
  id: string;
  participants: string[];
  subject: string;
  lastMessage: string;
  lastMessageTime: any;
  studentId: string;
}

interface Message {
  id: string;
  text: string;
  sender: string;
  timestamp: any;
}

const TeacherDashboard: React.FC = () => {
  const navigate = useNavigate();
  const auth = getAuth();

  // Core State
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<TeacherProfile | null>(null);
  const [timetable, setTimetable] = useState<TimetableSlot[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);

  // Resources / Links State
  const [resources, setResources] = useState<ClassLink[]>([]);
  const [availableGrades, setAvailableGrades] = useState<string[]>([]);
  const [selectedGradeFilter, setSelectedGradeFilter] = useState<string>("all");
  const [editingResourceId, setEditingResourceId] = useState<string | null>(null);
  const [editResourceData, setEditResourceData] = useState<any>(null);
  const [newResource, setNewResource] = useState({ 
    title: "", 
    url: "", 
    type: "classroom", 
    targetGrade: "all" 
  });

  // Profile Edit State
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [editProfile, setEditProfile] = useState<Partial<TeacherProfile>>({});

  // Chat State
  const [chatOpen, setChatOpen] = useState(false);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConvId, setActiveConvId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [totalUnread, setTotalUnread] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Derived State
  const teacherFullName = `${profile?.firstName || ""} ${profile?.lastName || ""}`.trim();
  const [status, setStatus] = useState<string | null>(null);

  // WebRTC State
  const [isMuted, setIsMuted] = useState(false);
  const [videoOff, setVideoOff] = useState(false);
  const [isSharingScreen, setIsSharingScreen] = useState(false);

// SESSION TIMER STATE
const [classDuration, setClassDuration] = useState(40); // Default 40 mins
const [timeLeft, setTimeLeft] = useState<number | null>(null);
const [endTimestamp, setEndTimestamp] = useState<number | null>(null);
const [isExtending, setIsExtending] = useState(false);

// State to track students currently in the WebRTC room
const [activeParticipants, setActiveParticipants] = useState<any[]>([]);


  /* ======================================================
     NEW: LIVE SESSION STATE
  ====================================================== */
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [isLive, setIsLive] = useState(false);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const [isTeacher, set_isTeacher] = useState(true); // dashboard is for teachers
  const [_isHandRaised, set_isHandRaised] = useState(false);

const signaling = useMemo(() => new Signaling(), []);
const [connectionStatus, setConnectionStatus] = useState<'searching' | 'connected' | 'disconnected'>('searching');

const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

const teacher = user as unknown as TeacherUser;

const firstName = teacher?.personalInfo?.firstName || teacher?.firstName || "";
const { logoutAll } = useAuth();



  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => { u ? setUser(u) : navigate("/"); });
    return () => unsub();
  }, [auth, navigate]);


  const endSession = async () => {
  try {
    // Release camera and mic immediately
    await signaling.hangUp();
    
    // Reset all UI flags
    setIsLive(false);
    setMobileMenuOpen(false);
    setChatOpen(false);
    
    // Update Firestore to let students know the teacher left
    if (activeSessionId) {
      await updateDoc(doc(db, "rooms", activeSessionId), {
        status: "ended",
        endedAt: serverTimestamp()
      });
    }
  } catch (error) {
    console.error("Error ending session:", error);
  }
};

  useEffect(() => {
    if (!user) return;
    const qProfile = query(collection(db, "teacherApplications"), where("uid", "==", user.uid));
    const unsub = onSnapshot(qProfile, (snap) => {
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
        setEditProfile({ phone: data.personalInfo?.phone || "", bio: data.personalInfo?.bio || "" });
      }
      setLoading(false);
    });
    return () => unsub();
  }, [user]);

  /* ======================================================
     2. SYNC TIMETABLE, STUDENTS & GRADES
  ===================================================== */
  useEffect(() => {
    if (!teacherFullName || !profile?.subjects) return;

    const qTime = query(collection(db, "timetable"), where("teacherName", "==", teacherFullName));
    const unsubTime = onSnapshot(qTime, (snap) => {
      setTimetable(snap.docs.map(d => ({ id: d.id, ...d.data() } as TimetableSlot)));
    });

    const subjectNames = profile.subjects.map(s => s.name);
    const qStud = query(collection(db, "students"), where("subjects", "array-contains-any", subjectNames));
    const unsubStud = onSnapshot(qStud, (snap) => {
      const studentList = snap.docs.map(d => ({ id: d.id, ...d.data() } as Student));
      setStudents(studentList);

      const grades = new Set<string>();
      studentList.forEach(s => { if (s.grade) grades.add(s.grade); });
      setAvailableGrades(Array.from(grades).sort());
    });

    return () => { unsubTime(); unsubStud(); };
  }, [teacherFullName, profile?.subjects]);

  /* ======================================================
     3. RESOURCE ENGINE (CRUD & AUDIT TRAIL)
  ===================================================== */

// UPDATE: Refined handleUpdateResource
const handleAddResource = async () => {
  if (!newResource.title || !newResource.url) return alert("Title and URL are required");

  // 1. Identify exactly where the name is stored. 
  // We check 'personalInfo' first, then the top-level 'displayName'
  const firstName = user?.personalInfo?.firstName || user?.firstName || "";
  const lastName = user?.personalInfo?.lastName || user?.lastName || "";
  
  // 2. Combine and verify
  const fullName = `${firstName} ${lastName}`.trim();
  
  // 3. Final Fallback: If name is still empty, use email or "Teacher" 
  // instead of just "Educator" to make it look more professional
  const finalName = fullName || user?.email?.split('@')[0] || "Teacher";

  try {
    await addDoc(collection(db, "class_links"), {
      title: newResource.title,
      url: newResource.url,
      type: newResource.type,
      targetGrade: newResource.targetGrade,
      teacherId: user?.uid,
      teacherName: finalName, // Use the verified name here
      createdAt: serverTimestamp(),
      status: "active"
    });

    setNewResource({ ...newResource, title: "", url: "" });
  } catch (err) {
    console.error("Error adding resource:", err);
  }
};

// DELETE: Permanent removal
const handleDeleteResource = async (id: string) => {
  if (window.confirm("Permanently remove this link from student dashboards and audit history?")) {
    try {
      await deleteDoc(doc(db, "class_links", id));
    } catch (err) {
      console.error("Delete failed:", err);
    }
  }
};

// FILTER: Ensure the filter uses 'targetGrade' to match the database
const filteredResources = resources.filter(r => 
  selectedGradeFilter === "all" ? true : r.targetGrade === selectedGradeFilter
);

useEffect(() => {
  if (!user?.uid) return;

  // This is the specific query for the Audit Trail
  const q = query(
    collection(db, "class_links"),
    where("teacherId", "==", user.uid), // This matches the ID you saved in handleAddResource
    orderBy("createdAt", "desc")
  );

  const unsub = onSnapshot(q, (snap) => {
    const fetchedLinks = snap.docs.map(d => ({ 
      id: d.id, 
      ...d.data() 
    }));
    
    // This fills the 'resources' state which 'filteredResources' uses
    setResources(fetchedLinks); 
  }, (error) => {
    // If you see an error here about "indexes", click the link in the console
    console.error("Audit Trail Fetch Error:", error);
  });

  return () => unsub();
}, [user?.uid]);

  /* ======================================================
     4. CHAT & MESSAGING LOGIC
  ===================================================== */
  useEffect(() => {
    if (!user) return;
    const qConv = query(collection(db, "conversations"), where("participants", "array-contains", user.uid));
    const unsubConv = onSnapshot(qConv, (snap) => {
      setConversations(snap.docs.map(d => ({ id: d.id, ...d.data() } as Conversation)));
      setTotalUnread(snap.docs.length); 
    });
    return () => unsubConv();
  }, [user]);

  useEffect(() => {
    if (!activeConvId || !user) return;
    const qMsgs = query(collection(db, "conversations", activeConvId, "messages"), orderBy("timestamp", "asc"));
    return onSnapshot(qMsgs, (snap) => {
      setMessages(snap.docs.map(d => ({ id: d.id, ...d.data() } as Message)));
    });
  }, [activeConvId, user]);

  const startConversation = async (student: Student, subject: string) => {
    if (!user) return;
    const parentId = student.parentId || student.linkedParentId;
    if (!parentId) return alert("Parent not found for this student.");

    const convId = `${parentId}_${user.uid}_${student.id}`;
    const existing = conversations.find(c => c.id === convId);

    if (!existing) {
      try {
        await setDoc(doc(db, "conversations", convId), {
          participants: [parentId, user.uid],
          subject,
          studentId: student.id,
          createdAt: serverTimestamp(),
          lastMessage: "Conversation initiated",
          lastMessageTime: serverTimestamp(),
        }, { merge: true });
      } catch (err) {
        console.error("Error starting conversation:", err);
      }
    }
    setActiveConvId(convId);
    setChatOpen(true);
  };

  const sendChatMessage = async () => {
    if (!newMessage.trim() || !activeConvId || !user) return;
    const text = newMessage.trim();
    setNewMessage("");
    const activeConv = conversations.find(c => c.id === activeConvId);
    if (!activeConv) return;
    const convRef = doc(db, "conversations", activeConvId);
    await addDoc(collection(convRef, "messages"), {
      text, sender: user.uid, timestamp: serverTimestamp()
    });
    await updateDoc(convRef, { lastMessage: text, lastMessageTime: serverTimestamp() });
  };

  /* ======================================================
     5. PROFILE UPDATES
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

  useEffect(() => {
    if (!user) return;

    // Real-time listener to the user's status
    const unsub = onSnapshot(doc(db, "users", user.uid), (snap) => {
      if (snap.exists()) {
        setStatus(snap.data().applicationStatus);
      }
      setLoading(false);
    });

    return () => unsub();
  }, [user]);

/* ======================================================
     NEW: WEBRTC BRIDGE (EFFECT)
  ====================================================== */
  const toggleHandRaise = async () => {
    if (!activeSessionId || !user) return;
    
    // In our signaling logic, the participant ID is stored
    const participantRef = doc(db, "rooms", activeSessionId, "participants", user.uid);
    
    await updateDoc(participantRef, {
      isHandRaised: !_isHandRaised, // Toggle local state
      lastUpdated: serverTimestamp()
    });
    
    set_isHandRaised(!_isHandRaised);
  };

 

// 2. The LOGIC to start the call
useEffect(() => {
  let monitorInterval: any;
  let isMounted = true;

  const startLiveClass = async () => {
    // 1. Wait for DOM refs to attach (Critical for WebRTC)
    let retries = 0;
    while (!localVideoRef.current || !remoteVideoRef.current) {
      if (retries > 10) return; // Slightly more retries for slower devices
      await new Promise(r => setTimeout(r, 100));
      retries++;
    }

    // Safety check: ensure we are still live and in a session
    if (!isLive || !activeSessionId || !isMounted) return;

    try {
      // 2. Hardware Initialization (Turns on Camera/Mic)
      console.log("Initializing Hardware...");
      await signaling.openUserMedia(localVideoRef.current, remoteVideoRef.current);
      
      // 3. Calculate Timer & Create Room
      const durationMs = classDuration * 60 * 1000;
      const endTimestamp = Date.now() + durationMs;
      
      // Update local state so UI shows the timer immediately
      setEndTimestamp(endTimestamp);

      // 4. Create Firestore Room (Satisfies rules & notifies students)
      await signaling.createRoom(activeSessionId, { 
        endAt: endTimestamp,
        status: 'live',
        teacherId: user?.uid,
        startedAt: Date.now()
      });

      // 5. Start Monitoring Interval
      monitorInterval = setInterval(() => {
        if (!signaling.peerConnection || !isMounted) return;
        
        // A. Connection Status
        const state = signaling.peerConnection.iceConnectionState;
        if (state === 'connected' || state === 'completed') {
          setConnectionStatus('connected');
        } else if (state === 'failed' || state === 'closed') {
          setConnectionStatus('disconnected');
        }
        
        // B. Timer Calculation
        const remaining = Math.max(0, Math.floor((endTimestamp - Date.now()) / 1000));
        setTimeLeft(remaining);

        // C. 10-Minute System Alert (600 seconds)
        if (remaining === 600) {
          signaling.sendMessage(activeSessionId, "SYSTEM", "⚠️ 10 minutes remaining in class.");
          // Visual toast or alert
          console.warn("Class ending in 10 minutes.");
        }

        // D. Automatic Hardware Shutdown at 0
        if (remaining <= 0) {
          console.log("Time expired. Ending session.");
          handleLeaveMeeting(); // This should trigger setIsLive(false)
        }
      }, 1000);

    } catch (error) {
      console.error("Failed to start class:", error);
      if (isMounted) {
        setIsLive(false);
        setConnectionStatus('disconnected');
      }
    }
  };

  // Trigger start
  if (isLive && activeSessionId) {
    startLiveClass();
  }

  // 6. Consolidated Cleanup (THE CAMERA KILLER)
  return () => {
    isMounted = false;
    if (monitorInterval) clearInterval(monitorInterval);
    
    // This is the safety guard: If the effect unmounts or isLive becomes false, 
    // we MUST release the camera and microphone hardware.
    console.log("Releasing hardware and closing signaling...");
    signaling.hangUp(); 
  };
}, [isLive, activeSessionId, signaling, classDuration, user?.uid]); // Removed signaling.peerConnection from deps


useEffect(() => {
  // Only clean up if the component ACTUALLY unmounts 
  // or if the user explicitly stops being live.
  return () => {
    if (!isLive) { 
       console.log("Cleaning up...");
       signaling.hangUp();
    }
  };
}, [isLive]); // Don't put 'signaling' in here if it changes every render


// Update online students list
useEffect(() => {
  if (!isLive || !activeSessionId) {
    setActiveParticipants([]);
    return;
  }

  // Listen to the participants sub-collection inside the active room
  const participantsRef = collection(db, "rooms", activeSessionId, "participants");
  
  const unsub = onSnapshot(participantsRef, (snap) => {
    const list = snap.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    // Filter out the teacher so we only show students
    const studentList = list.filter(p => p.role === 'student');
    setActiveParticipants(studentList);
  });

  return () => unsub();
}, [isLive, activeSessionId]);

  /* ======================================================   
// TOGGLE HELPERS - MUTE & VIDEO
*====================================================== */

const toggleMute = () => {
  const audioTrack = localVideoRef.current?.srcObject as MediaStream;
  audioTrack.getAudioTracks()[0].enabled = !isMuted;
  setIsMuted(!isMuted);
};

const toggleVideo = () => {
  const videoTrack = localVideoRef.current?.srcObject as MediaStream;
  videoTrack.getVideoTracks()[0].enabled = videoOff;
  setVideoOff(!videoOff);
};

const handleScreenShare = async () => {
  if (!isSharingScreen) {
    await signaling.startScreenShare(localVideoRef.current!);
    setIsSharingScreen(true);
  } else {
    // Revert back to camera
    await signaling.openUserMedia(localVideoRef.current!, remoteVideoRef.current!);
    setIsSharingScreen(false);
  }
};

/* ====================================================== 
    7. SESSION TIMER & AUTO-END
====================================================== */

useEffect(() => {
  if (!isLive || !activeSessionId) return;

  // Listen for the 'endAt' value from Firestore
  const unsub = onSnapshot(doc(db, "rooms", activeSessionId), (doc) => {
    if (doc.exists() && doc.data().endAt) {
      setEndTimestamp(doc.data().endAt);
    }
  });

  const timer = setInterval(() => {
    if (!endTimestamp) return;

    const now = Date.now();
    const distance = endTimestamp - now;
    const remainingSeconds = Math.max(0, Math.floor(distance / 1000));

    setTimeLeft(remainingSeconds);

    // 10 Minute Alert (600 seconds)
    if (remainingSeconds === 600) {
      alert("⚠️ 10 minutes remaining! Wrap up the session or add more time.");
    }

    // Auto-End
    if (remainingSeconds <= 0) {
      clearInterval(timer);
      handleLeaveMeeting(); // Automatically turns off camera
    }
  }, 1000);

  return () => {
    unsub();
    clearInterval(timer);
  };
}, [isLive, activeSessionId, endTimestamp]);

// Function to add more time
const handleExtendTime = async () => {
  if (isExtending || !activeSessionId) return;
  
  setIsExtending(true); // Start loading state
  try {
    const roomRef = doc(db, "rooms", activeSessionId);
    
    // 1. Get fresh data from Firestore to prevent "math lag"
    const roomSnap = await getDoc(roomRef);
    if (!roomSnap.exists()) return;

    const currentEndAt = roomSnap.data().endAt || Date.now();
    const extraTime = 15 * 60 * 1000; // 15 minutes in ms
    const newEndAt = currentEndAt + extraTime;

    // 2. Update Firestore
    await updateDoc(roomRef, {
      endAt: newEndAt
    });

    // 3. Update local state so the UI updates immediately
    setEndTimestamp(newEndAt);
    
  } catch (error) {
    console.error("Failed to extend time:", error);
  } finally {
    setIsExtending(false); // End loading state
  }
};

// 1. Manage Mobile UI State and Connection Monitoring
useEffect(() => {
  if (!isLive) {
    setMobileMenuOpen(false);
    setChatOpen(false);
    return;
  }

  // Monitor WebRTC Connection State for the pulsing UI dot
  const interval = setInterval(() => {
    if (signaling.peerConnection) {
      const state = signaling.peerConnection.connectionState;
      setConnectionStatus(state === 'connected' ? 'connected' : 'connecting');
    }
  }, 2000);

  // Auto-hide mobile menu after 5 seconds of inactivity to clear the screen
  let menuTimer: NodeJS.Timeout;
  if (mobileMenuOpen) {
    menuTimer = setTimeout(() => {
      setMobileMenuOpen(false);
    }, 5000);
  }

  return () => {
    clearInterval(interval);
    clearTimeout(menuTimer);
  };
}, [isLive, mobileMenuOpen, signaling.peerConnection]);

  if (loading) return <div className="h-screen flex items-center justify-center"><Loader2 className="animate-spin text-indigo-600" /></div>;

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-50 pb-20 font-sans">
      
      {/* HEADER SECTION */}
      <div className="bg-indigo-600 text-white shadow-xl">
        <div className="max-w-7xl mx-auto px-6 py-8 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-black flex items-center gap-2 tracking-tight">
              <Sparkles className="text-amber-400" /> TEACHER CENTRAL
            </h1>
            <p className="opacity-80 font-medium">Educator: {teacherFullName}</p>
          </div>
         <Button
  variant="secondary"
  className="font-bold shadow-lg"
  onClick={logoutAll}
>
  <LogOut className="mr-2" /> Logout
</Button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-8">
        <Tabs defaultValue="overview" className="space-y-8">
          <TabsList className="bg-white p-1 rounded-2xl shadow-md border inline-flex overflow-hidden">
            <TabsTrigger value="overview" className="px-8 py-3 font-bold">Overview</TabsTrigger>
            <TabsTrigger value="students" className="px-8 py-3 font-bold">Students</TabsTrigger>
            <TabsTrigger value="links" className="px-8 py-3 font-bold">Link Engine</TabsTrigger>
            <TabsTrigger value="timetable" className="px-8 py-3 font-bold">Timetable</TabsTrigger>
            <TabsTrigger value="profile" className="px-8 py-3 font-bold">My Profile</TabsTrigger>
                        
          </TabsList>

{/* STATUS BANNER */}
        {status === "submitted" && (
          <div className="bg-amber-50 border-2 border-amber-200 p-6 rounded-[2rem] flex items-center gap-6 mb-8 animate-in slide-in-from-top-4">
            <div className="w-12 h-12 bg-amber-500 rounded-2xl flex items-center justify-center text-white shadow-lg">
              <Clock size={24} />
            </div>
            <div>
              <h2 className="text-lg font-black text-amber-900 uppercase tracking-tight">Application Under Review</h2>
              <p className="text-sm text-amber-700 font-medium">The Principal is currently verifying your credentials. Full portal access will unlock upon approval.</p>
            </div>
          </div>
        )}

          {/* DASHBOARD OVERVIEW */}
          <TabsContent value="overview">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <Card className="bg-gradient-to-br from-indigo-500 to-purple-600 text-white border-0 shadow-2xl rounded-3xl overflow-hidden">
                <CardHeader><CardTitle className="uppercase tracking-widest text-[10px] opacity-70">Schedule</CardTitle></CardHeader>
                <CardContent>
                   <p className="text-5xl font-black">{timetable.length}</p>
                   <p className="text-sm mt-2 opacity-80">Classes assigned this week</p>
                </CardContent>
              </Card>
              <Card className="bg-gradient-to-br from-emerald-500 to-teal-600 text-white border-0 shadow-2xl rounded-3xl overflow-hidden">
                <CardHeader><CardTitle className="uppercase tracking-widest text-[10px] opacity-70">Enrolment</CardTitle></CardHeader>
                <CardContent>
                  <p className="text-5xl font-black">{students.length}</p>
                  <p className="text-sm mt-2 opacity-80">Students across your subjects</p>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* STUDENT LIST */}
          <TabsContent value="students">
            <Card className="shadow-2xl border-0 rounded-[2rem] overflow-hidden">
              <CardHeader className="bg-slate-900 text-white p-8">
                <CardTitle className="flex items-center gap-3 text-2xl font-black">
                  <Users className="text-indigo-400" /> STUDENT ROSTER
                </CardTitle>
              </CardHeader>
              <CardContent className="p-8">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {students.map(s => (
                    <div key={s.id} className="group p-6 border-2 rounded-3xl bg-white shadow-sm hover:border-indigo-500 hover:shadow-xl transition-all duration-300">
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <p className="font-black text-xl text-slate-800 leading-tight">{s.firstName} {s.lastName}</p>
                          <Badge className="mt-2 bg-indigo-50 text-indigo-600 border-none font-bold">GRADE {s.grade}</Badge>
                        </div>
                        <Button size="icon" className="rounded-full bg-slate-100 text-slate-600 hover:bg-indigo-600 hover:text-white" onClick={() => startConversation(s, s.subjects[0])}>
                          <MessageCircle size={20} />
                        </Button>
                      </div>
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-tighter">Subjects: {s.subjects.join(", ")}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <MoodleCard/>

          {/* LINK ENGINE TAB */}
         <TabsContent value="links">
  <div className="space-y-6">
    
    {/* PUBLISHING ENGINE */}
    <Card className="border-0 shadow-2xl bg-indigo-900 text-white rounded-[2rem] overflow-hidden">
      <div className="p-8 border-b border-white/10 bg-white/5 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
         <div>
           <h2 className="text-2xl font-black italic tracking-tighter">LINK PUBLISHING ENGINE</h2>
           <p className="text-xs text-indigo-300 font-bold uppercase tracking-widest mt-1">Updates Student Dashboards instantly</p>
         </div>
         <div className="bg-white/10 p-2 rounded-xl border border-white/20">
           <Label className="text-[10px] font-black uppercase text-indigo-200 block mb-1">Filter Audit Trail</Label>
           <select 
              className="bg-transparent text-xs font-bold outline-none cursor-pointer text-white"
              value={selectedGradeFilter}
              onChange={(e) => setSelectedGradeFilter(e.target.value)}
            >
              <option className="text-black" value="all">View All Grades</option>
              {availableGrades.map(g => <option className="text-black" key={g} value={g}>{g}</option>)}
            </select>
         </div>
      </div>
      <CardContent className="p-8">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-6 items-end">
          <div className="space-y-2">
            <Label className="text-[10px] uppercase font-black text-indigo-200">Target Grade</Label>
            <select 
              className="w-full h-12 px-4 rounded-xl bg-white/10 border-2 border-white/10 text-white text-sm font-bold focus:border-white/40 transition-all outline-none"
              value={newResource.targetGrade}
              onChange={e => setNewResource({...newResource, targetGrade: e.target.value})}
            >
              <option className="text-black" value="all">All Grades</option>
              {availableGrades.map(g => <option className="text-black" key={g} value={g}>{g}</option>)}
            </select>
          </div>
          <div className="space-y-2">
            <Label className="text-[10px] uppercase font-black text-indigo-200">Link Title</Label>
            <Input className="h-12 bg-white/10 border-2 border-white/10 text-white placeholder:text-white/30 rounded-xl focus:border-white/40 font-bold" placeholder="e.g. Maths Live Session" value={newResource.title} onChange={e => setNewResource({...newResource, title: e.target.value})} />
          </div>
          <div className="space-y-2">
            <Label className="text-[10px] uppercase font-black text-indigo-200">URL / Zoom Link</Label>
            <Input className="h-12 bg-white/10 border-2 border-white/10 text-white placeholder:text-white/30 rounded-xl focus:border-white/40 font-mono text-xs" placeholder="https://zoom.us/..." value={newResource.url} onChange={e => setNewResource({...newResource, url: e.target.value})} />
          </div>
          <div className="space-y-2">
            <Label className="text-[10px] uppercase font-black text-indigo-200">Category</Label>
            <select 
              className="w-full h-12 px-4 rounded-xl bg-white/10 border-2 border-white/10 text-white text-sm font-bold focus:border-white/40 outline-none"
              value={newResource.type} 
              onChange={e => setNewResource({...newResource, type: e.target.value})}
            >
              <option className="text-black" value="classroom">Classroom / Live</option>
              <option className="text-black" value="resource">Study Material</option>
            </select>
          </div>
          <Button onClick={handleAddResource} className="h-12 bg-amber-400 hover:bg-amber-500 text-black font-black rounded-xl shadow-xl transition-transform active:scale-95">
            <PlusCircle className="mr-2 h-5 w-5" /> PUBLISH LINK
          </Button>
        </div>
      </CardContent>
    </Card>

    {/* AUDIT TRAIL / MANAGEMENT TABLE */}
    <div className="bg-white rounded-[2rem] shadow-2xl border-0 overflow-hidden">
      <div className="p-8 border-b bg-slate-50 flex justify-between items-center">
        <h3 className="font-black text-slate-800 text-xl tracking-tight uppercase">Audit Trail & Record Management</h3>
        <Badge className="px-4 py-1 rounded-full font-black bg-indigo-100 text-indigo-600 border-none">{filteredResources.length} RECORDS ACTIVE</Badge>
      </div>
      
      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="bg-slate-100/50 text-[10px] uppercase font-black text-slate-400 tracking-widest">
              <th className="px-8 py-5">Audience</th>
              <th className="px-8 py-5">Content Details</th>
              <th className="px-8 py-5">Navigation</th>
              <th className="px-8 py-5 text-right">Settings</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredResources.map((item) => {
              const isEditing = editingResourceId === item.id;
              return (
                <tr key={item.id} className="hover:bg-slate-50/50 transition-colors group">                      
                  <td className="px-8 py-6">
                    <Badge variant="outline" className="font-black text-[10px] border-slate-200 text-slate-500 uppercase">
                      Grade {item.targetGrade}
                    </Badge>
                  </td>
                  <td className="px-8 py-6">
                    {isEditing ? (
                      <Input className="h-9 text-sm font-bold" value={editResourceData.title} onChange={e => setEditResourceData({...editResourceData, title: e.target.value})} />
                    ) : (
                      <div>
                        <p className="font-black text-slate-800 text-base flex items-center gap-2">
                          {item.title}
                          {item.type === "classroom" && <span className="w-2 h-2 bg-rose-500 rounded-full animate-pulse" />}
                        </p>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{item.type === 'classroom' ? 'Live Session' : 'Downloadable Resource'}</span>
                      </div>
                    )}
                  </td>
                  <td className="px-8 py-6">
                    {isEditing ? (
                      <Input className="h-9 text-xs font-mono" value={editResourceData.url} onChange={e => setEditResourceData({...editResourceData, url: e.target.value})} />
                    ) : (
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2 bg-slate-100 px-3 py-2 rounded-xl group-hover:bg-indigo-50 transition-colors">
                          <p className="text-[11px] text-indigo-600 font-mono truncate max-w-[150px]">{item.url}</p>
                        </div>
                        <a 
                          href={item.url.startsWith('http') ? item.url : `https://${item.url}`} 
                          target="_blank" 
                          rel="noreferrer" 
                          className="bg-slate-900 text-white p-2 rounded-xl hover:bg-indigo-600 transition-all shadow-md"
                        >
                          <ExternalLink size={14}/>
                        </a>
                      </div>
                    )}
                  </td>
                  <td className="px-8 py-6 text-right">
                    <div className="flex justify-end gap-2">
                      {isEditing ? (
                        <>
                          <Button size="sm" className="bg-emerald-500 hover:bg-emerald-600" onClick={() => handleUpdateResource(item.id)}>
                            <Check size={16} />
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => setEditingResourceId(null)}>
                            <X size={16} />
                          </Button>
                        </>
                      ) : (
                        <>
                          <button onClick={() => { setEditingResourceId(item.id); setEditResourceData(item); }} className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"><Edit2 size={16}/></button>
                          <button onClick={() => handleDeleteResource(item.id)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"><Trash2 size={16}/></button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {filteredResources.length === 0 && (
          <div className="py-20 text-center flex flex-col items-center">
             <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
                <BookOpen className="text-slate-300 w-8 h-8" />
             </div>
             <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">No link records found in audit trail</p>
          </div>
        )}
      </div>
    </div>
  </div>
</TabsContent>

          {/* TIMETABLE VIEW */}
          <TabsContent value="timetable">
            <Card className="shadow-2xl overflow-hidden border-0 rounded-[2rem]">
              <table className="w-full text-left">
                <thead className="bg-slate-900 text-white">
                  <tr className="uppercase text-[10px] tracking-widest font-black">
                    <th className="px-8 py-6">Day</th>
                    <th className="px-8 py-6">Time Slot</th>
                    <th className="px-8 py-6">Subject Area</th>
                    <th className="px-8 py-6">Student Grade</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {timetable.map(t => (
                    <tr key={t.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-8 py-6 font-black text-slate-700">{t.day}</td>
                      <td className="px-8 py-6 font-medium text-slate-500">{t.time}</td>
                      <td className="px-8 py-6"><Badge className="bg-indigo-100 text-indigo-700 border-none font-black">{t.subject}</Badge></td>
                      <td className="px-8 py-6 font-bold text-slate-400">GRADE {t.grade}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          </TabsContent>

          {/* TEACHER PROFILE */}
          <TabsContent value="profile">
            <Card className="shadow-2xl border-0 rounded-[2rem] overflow-hidden">
              <CardHeader className="flex flex-row justify-between items-center bg-indigo-50 p-8">
                <CardTitle className="text-2xl font-black text-indigo-900">IDENTITY PROFILE</CardTitle>
                {!isEditingProfile ? (
                  <Button onClick={() => setIsEditingProfile(true)} className="rounded-xl shadow-lg font-bold"><Edit2 size={16} className="mr-2" /> EDIT BIO</Button>
                ) : (
                  <div className="flex gap-2">
                    <Button onClick={handleSaveProfile} className="bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-lg font-bold"><Save size={16} className="mr-2" /> SAVE CHANGES</Button>
                    <Button onClick={() => setIsEditingProfile(false)} variant="ghost" className="font-bold">CANCEL</Button>
                  </div>
                )}
              </CardHeader>
              <CardContent className="p-10 space-y-10">
                <div className="grid md:grid-cols-2 gap-8">
                  <div className="space-y-2"><Label className="font-black text-[10px] text-slate-400 uppercase">First Name</Label><Input className="h-12 rounded-xl bg-slate-50 border-none font-bold text-slate-900" value={profile?.firstName} disabled /></div>
                  <div className="space-y-2"><Label className="font-black text-[10px] text-slate-400 uppercase">Last Name</Label><Input className="h-12 rounded-xl bg-slate-50 border-none font-bold text-slate-900" value={profile?.lastName} disabled /></div>
                  <div className="space-y-2"><Label className="font-black text-[10px] text-slate-400 uppercase">Registered Email</Label><Input className="h-12 rounded-xl bg-slate-50 border-none font-bold text-slate-900" value={profile?.email} disabled /></div>
                  <div className="space-y-2">
                    <Label className="font-black text-[10px] text-slate-400 uppercase">Contact Number</Label>
                    <Input className={`h-12 rounded-xl border-2 font-bold ${isEditingProfile ? 'border-indigo-200' : 'bg-slate-50 border-none text-slate-900'}`} value={isEditingProfile ? editProfile.phone : profile?.phone} disabled={!isEditingProfile} onChange={e => setEditProfile({...editProfile, phone: e.target.value})} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="font-black text-[10px] text-slate-400 uppercase">Professional Biography</Label>
                  <Textarea className={`rounded-2xl border-2 font-medium leading-relaxed ${isEditingProfile ? 'border-indigo-200' : 'bg-slate-50 border-none text-slate-900'}`} rows={5} value={isEditingProfile ? editProfile.bio : profile?.bio} disabled={!isEditingProfile} onChange={e => setEditProfile({...editProfile, bio: e.target.value})} />
                </div>
                <div className="pt-6 border-t">
                   <Label className="font-black text-[10px] text-slate-400 uppercase mb-4 block">Specializations</Label>
                   <div className="flex flex-wrap gap-3">
                    {profile?.subjects?.map((sub, i) => (
                      <Badge key={i} className="py-2 px-6 rounded-full bg-slate-900 text-white font-bold">{sub.name} • {sub.curriculum}</Badge>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* CHAT WIDGET (DYNAMIC OVERLAY) */}
      <div className="fixed bottom-8 right-8 z-50 flex flex-col items-end">
        {chatOpen && (
          <div className="mb-6 w-[400px] h-[600px] bg-white rounded-[2rem] shadow-[0_35px_60px_-15px_rgba(0,0,0,0.3)] border-0 flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 bg-slate-900 text-white flex justify-between items-center">
              <div>
                <span className="font-black uppercase tracking-widest text-[10px] block opacity-50">Communication</span>
                <span className="text-lg font-bold">{activeConvId ? "Active Message" : "Inbox"}</span>
              </div>
              <button className="bg-white/10 p-2 rounded-full hover:bg-white/20 transition" onClick={() => { setChatOpen(false); setActiveConvId(null); }}><X size={20} /></button>
            </div>
            
            <div className="flex-1 overflow-y-auto bg-slate-50 p-6 space-y-4">
              {activeConvId ? (
                messages.map(m => (
                  <div key={m.id} className={`flex ${m.sender === user?.uid ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-[85%] p-4 rounded-3xl text-sm font-medium shadow-sm ${m.sender === user?.uid ? "bg-indigo-600 text-white rounded-br-none" : "bg-white text-slate-800 rounded-bl-none border border-slate-100"}`}>
                      {m.text}
                    </div>
                  </div>
                ))
              ) : (
                conversations.map(c => (
                  <div key={c.id} onClick={() => setActiveConvId(c.id)} className="p-5 border-2 rounded-3xl bg-white cursor-pointer hover:border-indigo-500 transition shadow-sm group">
                    <p className="font-black text-slate-800 group-hover:text-indigo-600 transition-colors">{c.subject}</p>
                    <p className="text-xs text-slate-400 mt-1 truncate font-bold uppercase">{c.lastMessage}</p>
                  </div>
                ))
              )}
              <div ref={scrollRef} />
            </div>

            {activeConvId && (
              <div className="p-6 border-t bg-white flex gap-3">
                <Input className="h-12 bg-slate-50 border-none rounded-xl font-medium" placeholder="Message parent..." value={newMessage} onChange={e => setNewMessage(e.target.value)} onKeyDown={e => e.key === 'Enter' && sendChatMessage()} />
                <Button className="h-12 w-12 rounded-xl bg-indigo-600 shadow-lg" onClick={sendChatMessage}><Send size={20} /></Button>
              </div>
            )}
          </div>
        )}
        <button onClick={() => setChatOpen(!chatOpen)} className="bg-indigo-600 text-white p-6 rounded-[2rem] shadow-2xl relative hover:scale-105 active:scale-95 transition-all duration-300">
          <MessageCircle size={32} />
          {totalUnread > 0 && <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] w-7 h-7 rounded-full flex items-center justify-center border-4 border-white font-black">{totalUnread}</span>}
        </button>
      </div>

{/* ======================================================
     LIVE CLASSROOM OVERLAY (Adaptive Mobile/Desktop)
====================================================== */}
{isLive && (
  <div className="fixed inset-0 z-[100] bg-slate-950 flex flex-col animate-in fade-in duration-300">
    
    {/* ADAPTIVE HEADER */}
    <div className="h-14 md:h-16 px-4 md:px-8 flex items-center justify-between bg-slate-900/80 backdrop-blur-md border-b border-white/5 sticky top-0 z-[110]">
      <div className="flex items-center gap-3">
        {/* Connection Status Dot - Pulsing */}
        <div className="relative flex items-center justify-center">
            <div className={`w-3 h-3 rounded-full ${connectionStatus === 'connected' ? 'bg-emerald-500 shadow-[0_0_12px_rgba(16,185,129,0.8)]' : 'bg-red-500 animate-pulse'}`} />
            {connectionStatus === 'connected' && <div className="absolute w-3 h-3 bg-emerald-500 rounded-full animate-ping opacity-75" />}
        </div>
        <h2 className="text-white font-black text-[10px] md:text-sm uppercase tracking-widest truncate max-w-[100px] md:max-w-none">
          {resources.find(r => r.id === activeSessionId)?.title || "Classroom"}
        </h2>
      </div>

      {/* Persistent Timer (Centered on Mobile) */}
      <div className="flex flex-col items-center bg-slate-800/80 px-4 py-1.5 rounded-2xl border border-white/10 shadow-inner">
        <span className="text-[7px] md:text-[8px] font-black text-white/40 uppercase tracking-widest">Time Remaining</span>
        <span className={`font-mono font-bold text-sm md:text-base ${timeLeft && timeLeft < 300 ? 'text-red-500 animate-pulse' : 'text-emerald-500'}`}>
          {timeLeft ? `${Math.floor(timeLeft / 60)}:${String(timeLeft % 60).padStart(2, '0')}` : "00:00"}
        </span>
      </div>

      <Button 
        variant="destructive" 
        size="sm" 
        className="rounded-xl font-black text-[10px] px-3 md:px-6 h-9 md:h-10 uppercase shadow-lg shadow-red-900/20"
        onClick={() => {
          signaling.hangUp();
          setIsLive(false);
          setActiveSessionId(null);
        }}
      >
        END SESSION
      </Button>
    </div>

    {/* MAIN STAGE */}
    <div className="flex-1 relative flex overflow-hidden">
      
      {/* Video Content Area */}
      <div className="flex-1 relative bg-slate-900 overflow-hidden">
        
        {/* Remote Student Video (Main View) */}
        <video ref={remoteVideoRef} autoPlay playsInline className="w-full h-full object-cover" />

        {/* TOP CORNER SELF-PREVIEW (Mobile Optimized) */}
        <div className="absolute top-4 right-4 w-28 h-40 md:w-44 md:h-28 bg-black rounded-2xl border-2 border-white/20 shadow-2xl overflow-hidden z-20">
          <video ref={localVideoRef} autoPlay muted playsInline className="w-full h-full object-cover scale-x-[-1]" />
          {videoOff && <div className="absolute inset-0 bg-slate-900/90 flex items-center justify-center text-[8px] text-white/40 font-black uppercase text-center p-2">Camera Off</div>}
        </div>

        {/* MOBILE OVERLAY TOGGLE (Floating Action Button) */}
        <div className="md:hidden absolute bottom-6 right-6 z-50">
            <Button 
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="w-14 h-14 rounded-full bg-indigo-600 shadow-2xl border-2 border-white/20"
            >
                {mobileMenuOpen ? <X size={24} /> : <Settings size={24} />}
            </Button>
        </div>

        {/* MOBILE FLOATING CONTROLS (Only visible when toggled) */}
        {mobileMenuOpen && (
            <div className="md:hidden absolute bottom-24 right-6 flex flex-col gap-4 animate-in slide-in-from-bottom-5 duration-300">
                <Button onClick={toggleMute} className={`w-12 h-12 rounded-full ${isMuted ? 'bg-red-500' : 'bg-slate-800'}`}><MicOff size={20} /></Button>
                <Button onClick={toggleVideo} className={`w-12 h-12 rounded-full ${videoOff ? 'bg-red-500' : 'bg-slate-800'}`}><VideoOff size={20} /></Button>
                <Button onClick={() => setChatOpen(!chatOpen)} className="w-12 h-12 rounded-full bg-slate-800"><MessageSquare size={20} /></Button>
            </div>
        )}

        {/* DESKTOP BOTTOM DOCK (Hidden on Mobile) */}
        <div className="hidden md:flex absolute bottom-10 left-1/2 -translate-x-1/2 items-center gap-8 bg-slate-900/90 backdrop-blur-2xl px-10 py-4 rounded-[2.5rem] border border-white/10 shadow-2xl z-50">
          <div className="flex flex-col items-center gap-1.5 cursor-pointer" onClick={toggleMute}>
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all ${isMuted ? 'bg-red-600' : 'bg-white/10'}`}>
                {isMuted ? <MicOff size={20} /> : <Mic size={20} />}
            </div>
            <span className="text-[8px] font-bold text-white/50 uppercase tracking-widest">Mic</span>
          </div>
          
          <div className="flex flex-col items-center gap-1.5 cursor-pointer" onClick={toggleVideo}>
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all ${videoOff ? 'bg-red-600' : 'bg-white/10'}`}>
                {videoOff ? <VideoOff size={20} /> : <Video size={20} />}
            </div>
            <span className="text-[8px] font-bold text-white/50 uppercase tracking-widest">Camera</span>
          </div>

          <div className="w-px h-10 bg-white/10" />

          <div className="flex flex-col items-center gap-1.5 cursor-pointer" onClick={handleScreenShare}>
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all ${isSharingScreen ? 'bg-emerald-500' : 'bg-white/10'}`}>
                <ExternalLink size={20} />
            </div>
            <span className="text-[8px] font-bold text-white/50 uppercase tracking-widest">Share</span>
          </div>
        </div>
      </div>


      {/* B. SIDEBAR: Participants & Chat */}
      {/* <div className="w-96 flex flex-col gap-4"> */}
         <div className="hidden lg:flex w-96 flex-col gap-4 p-6 bg-slate-900/30 border-l border-white/5">

        
        {/* Participant Roster: Tracks students in the room */}
        <div className="h-1/3 bg-white/5 rounded-[2rem] p-6 border border-white/10 flex flex-col overflow-hidden">
          <p className="text-white/40 text-[10px] font-black uppercase tracking-widest mb-4 flex items-center justify-between">
            Online Students <Users size={12} />
          </p>
          <div className="flex-1 overflow-y-auto space-y-3 custom-scrollbar">
             {students.slice(0, 5).map(s => (
               <div key={s.id} className="flex items-center justify-between bg-white/5 p-3 rounded-2xl border border-white/5">
                 <div className="flex items-center gap-3">
                   <div className="w-2 h-2 rounded-full bg-emerald-500" />
                   <span className="text-white/80 text-xs font-bold">{s.firstName}</span>
                 </div>
                 {/* This badge would ideally be driven by a 'handRaised' property in Firestore */}
                 <Badge className="bg-orange-500 text-[8px] animate-bounce">✋ HAND RAISED</Badge>
               </div>
             ))}
          </div>
        </div>

        {/* Live Chat: Teacher/Student messaging */}
        <div className="flex-1 bg-white/5 rounded-[2rem] p-6 border border-white/10 flex flex-col overflow-hidden">
          <p className="text-white/40 text-[10px] font-black uppercase tracking-widest mb-4">Class Dialogue</p>
          <div className="flex-1 overflow-y-auto space-y-4 mb-4 pr-2 custom-scrollbar">
            {messages.map((msg) => (
              <div key={msg.id} className="flex flex-col">
                <span className="text-[10px] font-bold text-indigo-400 uppercase">
                  {msg.sender === user?.uid ? "You (Teacher)" : "Student"}
                </span>
                <p className={`text-sm p-3 rounded-2xl mt-1 ${
                  msg.sender === user?.uid 
                    ? "bg-indigo-600/20 text-indigo-100 rounded-tr-none" 
                    : "bg-white/5 text-white/80 rounded-tl-none"
                }`}>
                  {msg.text}
                </p>
              </div>
            ))}
            <div ref={scrollRef} />
          </div>

          {/* Chat Input Area */}
          <div className="flex gap-2 bg-white/5 p-2 rounded-2xl border border-white/10 focus-within:border-indigo-500/50 transition-all">
            <input 
              type="text" 
              value={newMessage} 
              onChange={(e) => setNewMessage(e.target.value)} 
              onKeyDown={(e) => e.key === 'Enter' && sendChatMessage()}
              placeholder="Type message..." 
              className="bg-transparent text-white text-sm flex-1 outline-none px-2" 
            />
            <Button size="icon" onClick={sendChatMessage} className="bg-indigo-600 hover:bg-indigo-700 rounded-xl">
              <Send size={16} />
            </Button>
          </div>
        </div>


{/* Floating Active Students List */}
<div className="absolute top-20 right-6 w-64 space-y-3 z-[100]">
  <div className="bg-slate-900/80 backdrop-blur-md border border-white/10 rounded-2xl p-4 shadow-2xl">
    <div className="flex justify-between items-center mb-4">
      <h3 className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">Active Students</h3>
      <Badge className="bg-emerald-500 text-white border-none text-[10px]">{activeParticipants.length}</Badge>
    </div>
    
    <div className="space-y-2 max-h-60 overflow-y-auto custom-scrollbar">
      {activeParticipants.length === 0 ? (
        <p className="text-white/30 text-[10px] italic text-center py-2">Waiting for students...</p>
      ) : (
        activeParticipants.map((student) => (
          <div key={student.id} className="flex items-center gap-3 bg-white/5 p-2 rounded-xl border border-white/5 group">
            <div className="relative">
               <div className="w-8 h-8 bg-indigo-500 rounded-lg flex items-center justify-center text-xs font-bold text-white uppercase">
                 {student.name.charAt(0)}
               </div>
               <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-emerald-500 border-2 border-slate-900 rounded-full"></div>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-white truncate">{student.name}</p>
              <p className="text-[9px] text-white/40 uppercase font-black">Connected</p>
            </div>
            {student.isHandRaised && (
              <div className="animate-bounce">
                <Sparkles size={14} className="text-amber-400" />
              </div>
            )}
          </div>
        ))
      )}
    </div>
  </div>
</div>

      </div>  
    </div>
  </div>
)}
    </div>
  );
};
export default TeacherDashboard;