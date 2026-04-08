// /* =============================================================================
//    StudentDashboard.tsx – Secure Student Portal (React + TS + Firebase)
//    ============================================================================= */

// import React, { useEffect, useMemo, useRef, useState } from "react";
// import { useNavigate, useParams } from "react-router-dom";
// import { db } from "@/lib/firebaseConfig";
// import {
//   collection,
//   onSnapshot,
//   query,
//   where,
//   doc,
//   orderBy,
//   getDoc,
//   addDoc,
//   serverTimestamp,
//   Timestamp
// } from "firebase/firestore";

// /* UI Components */
// import { Button } from "@/components/ui/button";
// import { Badge } from "@/components/ui/badge";
// import { Input } from "@/components/ui/input";
// import { getParentInfo } from "@/lib/useParentInfo";
// import { useStudentAuth } from "../auth/StudentAuthContext";
// import NextClassCountdownCard from "@/lib/NextClassCountdownCard";
// import MoodleCard from "./MoodleCard";
// import AudioPDFReader from "@/lib/AudioPDFReader";
// import FlashCardComponent from "@/components/FlashCard";
// import { flashCards } from "@/lib/flashcards";
// import { Card, CardContent } from "@/components/ui/card";


// const now = new Date();

// const parseLessonDate = (timeStr: string) => {
//   const [clock, meridian] = timeStr.split(" ");
//   let [hours, minutes] = clock.split(":").map(Number);

//   if (meridian === "PM" && hours !== 12) hours += 12;
//   if (meridian === "AM" && hours === 12) hours = 0;

//   const lessonDate = new Date(now);
//   lessonDate.setHours(hours, minutes, 0, 0);

//   return lessonDate;
// };

// const getLessonStatus = (item: TimetableEntry, orderedTodayClasses: TimetableEntry[]) => {
//   const now = new Date();
//   const lessonDate = parseLessonDate(item.time);
//   const lessonEnd = new Date(lessonDate);
//   lessonEnd.setMinutes(lessonEnd.getMinutes() + 60);

//   if (now >= lessonDate && now <= lessonEnd) return "ongoing";
//   if (now < lessonDate) {
//     const index = orderedTodayClasses.findIndex((i) => i.id === item.id);
//     return index === 0 ? "next" : "upcoming";
//   }
//   return "done";
// };




// /* Icons */
// import {
//   Loader2,
//   LogOut,
//   ArrowRight,
//   Video,
//   BookOpen,
//   Calendar as CalendarIcon,
//   AlertCircle,
//   Users,
//   LayoutDashboard,
//   Clock,
//   ExternalLink,
// } from "lucide-react";

// /* Auth & Signaling */
// import { useAuth } from "../auth/AuthProvider";
// import logo from "@/img/care.png";

// // =============================================================================
// // TYPES
// // =============================================================================

// interface StudentProfile {
//   id: string;
//   firstName: string;
//   lastName?: string;
//   grade: string;
//   parentId?: string;
//   parentName?: string;
//   email?: string;
//   dashboardLocked?: boolean;
//   lockReason?: string;
//   subjects?: Array<{ name: string } | string>;
// }

// interface TimetableEntry {
//   id: string;
//   day: string;
//   time: string;
//   subject: string;
//   teacherName: string;
//   grade: string;
// }

// interface ClassLink {
//   id: string;
//   name: string;
//   url: string;
//   grade: string;
//   type: 'classroom' | 'external';
//   subject: string;
//   teacherUid?: string;
//   targetGrade: string;
//   teacherName: string;
//   title: string;
//   updatedAt?: Timestamp;
//   createdAt?: Timestamp;
// }

// // Simple StatCard component since it was imported but commented out
// const StatCard = ({ icon: Icon, title, value, color }: any) => {
//   const colors: any = {
//     indigo: "bg-indigo-50 text-indigo-600",
//     amber: "bg-amber-50 text-amber-600",
//     emerald: "bg-emerald-50 text-emerald-600",
//   };
//   return (
//     <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm flex items-center gap-4">
//       <div className={`p-4 rounded-2xl ${colors[color]}`}>
//         <Icon size={24} />
//       </div>
//       <div>
//         <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{title}</p>
//         <p className="text-2xl font-black text-slate-800">{value}</p>
//       </div>
//     </div>
//   );
// };

// const StudentDashboard: React.FC = () => {
//   const { logoutStudent, logoutParent, user, loading: authLoading } = useAuth();
//   const navigate = useNavigate();
//   const { studentId } = useParams<{ studentId: string }>();

//   /* ---------------- DATA STATE ---------------- */
//   const [profile, setProfile] = useState<StudentProfile | null>(null);
//   const [profileLoaded, setProfileLoaded] = useState(false);
//   const [timetable, setTimetable] = useState<TimetableEntry[]>([]);
//   const [classLinks, setClassLinks] = useState<ClassLink[]>([]);
//   const [isLive, setIsLive] = useState(false);
//   const [activeTab, setActiveTab] = useState<"overview" | "timetable" | "links" | "audio-pdf">("overview");
//   const [searchTerm, setSearchTerm] = useState("");
//   const [now, setNow] = useState(new Date());
//   const [isClassLive, setIsClassLive] = useState(false);
//   const auth = useStudentAuth();

//   /* ---------------- HELPERS ---------------- */
//   const parseLessonDate = (timeStr: string) => {
//     const [clock, meridian] = timeStr.split(" ");
//     let [hours, minutes] = clock.split(":").map(Number);
//     if (meridian === "PM" && hours !== 12) hours += 12;
//     if (meridian === "AM" && hours === 12) hours = 0;
//     const lessonDate = new Date(now);
//     lessonDate.setHours(hours, minutes, 0, 0);
//     return lessonDate;
//   };

//   const computeLessonsWithDynamicEnd = (lessons: any[]) => {
//     const sorted = [...lessons].sort((a, b) => a.time.localeCompare(b.time));
//     return sorted.map((lesson, index) => {
//       const start = parseLessonDate(lesson.time);
//       let end = index < sorted.length - 1
//         ? parseLessonDate(sorted[index + 1].time)
//         : new Date(start.getTime() + 40 * 60000);
//       return { ...lesson, start, end };
//     });
//   };

//   const logLinkAccess = async (link: any) => {
//     // Use user.uid (from Firebase Auth) to ensure it matches request.auth.uid in rules
//     if (!user?.uid || !profile) return;

//     try {
//       await addDoc(collection(db, "class_links", link.id, "auditTrail"), {
//         studentId: user.uid, // This MUST match request.auth.uid
//         studentName: profile.firstName,
//         grade: profile.grade,
//         subject: link.subject || "general",
//         action: "opened_link",
//         clickedAt: serverTimestamp(),
//       });
//     } catch (e) {
//       console.error("Audit Log Failed:", e);
//     }
//   };

//   /* ---------------- EFFECTS ---------------- */
//   useEffect(() => {
//     const interval = setInterval(() => setNow(new Date()), 60000);
//     return () => clearInterval(interval);
//   }, []);

//   useEffect(() => {
//     if (!studentId) return;
//     const loadProfile = async () => {
//       const snap = await getDoc(doc(db, "students", studentId));
//       if (snap.exists()) setProfile({ id: snap.id, ...snap.data() } as StudentProfile);
//       setProfileLoaded(true);
//     };
//     loadProfile();
//   }, [studentId]);


//   // Fetch timetable based on student grade
//   useEffect(() => {
//     if (!profile?.grade) return;

//     const q = query(
//       collection(db, "timetable"),
//       where("grade", "==", profile.grade)
//     );

//     const unsub = onSnapshot(q, (snap) => {
//       const docs = snap.docs.map(d => ({ id: d.id, ...d.data() })) as TimetableEntry[];
//       setTimetable(docs);
//     }, (err) => {
//       console.error("Timetable fetch failed:", err);
//     });

//     return () => unsub();
//   }, [profile?.grade]);

//   // ---------------- FIRESTORE LINKS FETCH & FILTER ----------------
//   // Inside StudentDashboard.tsx -> useEffect for class_links
//   useEffect(() => {
//     if (!profile?.grade) return;

//     // 1. Create the query with Ordering
//     // Note: "desc" puts the newest (largest timestamp) at the top
//     const qLinks = query(
//       collection(db, "class_links"),
//       where("status", "==", "active"),
//       orderBy("createdAt", "desc")
//     );

//     const unsubLinks = onSnapshot(qLinks, (snap) => {
//       const links = snap.docs.map(d => ({ id: d.id, ...d.data() })) as ClassLink[];

//       // 2. Keep your existing subject filtering logic here
//       const studentGrade = (profile.grade || "").trim().toLowerCase();
//       const studentSubjects = (profile.subjects || []).map(s =>
//         (typeof s === "string" ? s : s?.name || "").trim().toLowerCase()
//       );

//       const filtered = links.filter(link => {
//         const targetGrade = (link.targetGrade || "").trim().toLowerCase();
//         const linkSubject = (link.subject || "").trim().toLowerCase();

//         const gradeMatch = targetGrade === "all" || targetGrade === studentGrade;
//         const subjectMatch =
//           !linkSubject ||
//           linkSubject === "all" ||
//           linkSubject === "general" ||
//           studentSubjects.includes(linkSubject);

//         return gradeMatch && subjectMatch;
//       });

//       setClassLinks(filtered);
//     }, (error) => {
//       console.error("Snapshot failed:", error);
//     });

//     return () => unsubLinks();
//   }, [profile]);

//   /* =====================================================
//      TODAY LESSONS SORT & DATA
//   ===================================================== */
//   const today = new Date().toLocaleDateString("en-US", { weekday: "long" });

//   const todayClasses = useMemo(() => {
//     return timetable.filter(t => t.day === today);
//   }, [timetable, today]);

//   const orderedTodayClasses = useMemo(() => {
//     return [...todayClasses]
//       .map(item => ({
//         ...item,
//         lessonDate: parseLessonDate(item.time)
//       }))
//       .sort((a, b) => {
//         const aStart = a.lessonDate.getTime();
//         const bStart = b.lessonDate.getTime();
//         const nowTime = now.getTime();

//         const aDiff = aStart - nowTime;
//         const bDiff = bStart - nowTime;

//         // 1. Current lesson first
//         if (aDiff <= 0 && nowTime <= aStart + 3600000) return -1;
//         if (bDiff <= 0 && nowTime <= bStart + 3600000) return 1;

//         // 2. Future lessons sorted ascending
//         if (aDiff >= 0 && bDiff >= 0) return aDiff - bDiff;

//         // 3. Past lessons last
//         return aDiff - bDiff;
//       });
//   }, [todayClasses, now]);

//   // Also ensure this helper is defined to avoid further errors:
//   const getLessonStatus = (lesson: any, todayLessons: any[]) => {
//     const lessonDate = parseLessonDate(lesson.time);
//     const lessonEnd = new Date(lessonDate.getTime() + 60 * 60000); // 1 hour default

//     if (now > lessonEnd) return "done";
//     if (now >= lessonDate && now <= lessonEnd) return "ongoing";

//     // Check if it's the next one
//     const future = todayLessons.filter(l => parseLessonDate(l.time) > now);
//     if (future.length > 0 && future[0].id === lesson.id) return "next";

//     return "upcoming";
//   };


//   /* =====================================================
//      BADGE STYLES
//   ===================================================== */
//   const statusStyles: Record<string, string> = {

//     done:
//       "bg-slate-100 text-slate-400 border-slate-200",

//     ongoing:
//       "bg-green-500 text-white border-green-500 animate-pulse",

//     next:
//       "bg-indigo-500 text-white border-indigo-500",

//     upcoming:
//       "bg-yellow-100 text-yellow-700 border-yellow-200"
//   };

//   const statusLabel: Record<string, string> = {

//     done: "Done",

//     ongoing: "Current",

//     next: "Next",

//     upcoming: "Upcoming"
//   };

//   // ---------------- FILTER LINKS FOR SEARCH ----------------
//   const filteredLinks = useMemo(() => {
//     const term = searchTerm.trim().toLowerCase();
//     return classLinks.filter(link => {
//       const titleMatch = (link.title || link.name || "").toLowerCase().includes(term);
//       const subjectMatch = (link.subject || "").toLowerCase().includes(term);
//       return term === "" || titleMatch || subjectMatch;

//     });
//   }, [classLinks, searchTerm]);


//   // logout
//   const handleLogout = () => {
//     if (logoutStudent) {
//       logoutStudent();
//     } else {
//       navigate("/");
//     }
//   };

//   const getStatusBadge = (lesson: any, todayLessons: any[]) => {
//     const status = getLessonStatus(lesson, todayLessons);
//     return (
//       <Badge
//         className={`
//           ${statusStyles[status]}
//           border-2
//           font-bold
//           text-xs
//           uppercase
//           tracking-wider
//           shadow-sm
//         `}
//       >
//         {statusLabel[status]}
//       </Badge>
//     );
//   };

//   if (!profileLoaded || authLoading) {
//     return (
//       <div className="h-screen w-full flex flex-col items-center justify-center bg-slate-50">
//         <Loader2 className="animate-spin text-indigo-600 mb-4" size={40} />
//         <p className="font-black text-slate-400 uppercase tracking-widest text-xs">Synchronizing Portal...</p>
//       </div>
//     );
//   }

//   if (profile?.dashboardLocked) {
//     return (
//       <div className="h-screen flex items-center justify-center bg-slate-50 p-6">
//         <div className="max-w-md bg-white p-10 rounded-3xl shadow-xl text-center">
//           <AlertCircle className="mx-auto text-rose-500 mb-4" size={48} />
//           <h2 className="text-xl font-black mb-2">Access Restricted</h2>
//           <p className="text-sm text-slate-500 mb-6">{profile.lockReason || "Please settle pending invoices."}</p>
//           <Button onClick={handleLogout} variant="outline">Logout</Button>
//         </div>
//       </div>
//     );
//   }

//   return (
//     <div className="min-h-screen bg-[#F8FAFC] font-sans text-slate-900">
//       <header className="bg-white border-b sticky top-0 z-40">
//         <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
//           <div className="flex items-center gap-4">
//             <img src={logo} alt="Logo" className="w-12 h-12 object-contain" />
//             <div className="flex flex-col">
//               <h1 className="text-lg font-black leading-tight">
//                 {profile?.firstName} {profile?.lastName}
//               </h1>
//               <Badge className="w-fit bg-indigo-50 text-indigo-600 text-[10px] border-none">Grade {profile?.grade}</Badge>
//             </div>
//           </div>
//           <Button variant="ghost" size="sm" onClick={handleLogout} className="text-slate-400 hover:text-rose-500">
//             <LogOut size={16} className="mr-2" /> Logout
//           </Button>
//         </div>

//         <nav className="max-w-7xl mx-auto px-6 flex gap-8">
//           {[
//             { id: "overview", icon: LayoutDashboard, label: "Overview" },
//             { id: "timetable", icon: Clock, label: "Schedule" },
//             { id: "links", icon: Video, label: "Resources" },
//             { id: "audio-pdf", icon: BookOpen, label: "Audio PDF" },
//           ].map((t) => (
//             <button
//               key={t.id}
//               onClick={() => setActiveTab(t.id as any)}
//               className={`py-4 text-xs font-black uppercase transition-all border-b-2 ${activeTab === t.id ? "border-indigo-600 text-indigo-600" : "border-transparent text-slate-400 hover:text-slate-600"
//                 }`}
//             >
//               <t.icon size={14} className="inline mr-2" />
//               {t.label}
//             </button>
//           ))}
//         </nav>
//       </header>

//       <main className="max-w-7xl mx-auto p-6 md:p-10 space-y-10">

//         {/* SHARED LIVE ALERT - Shows on any tab if class is live */}
//         {isClassLive && !isLive && (
//           <div className="bg-emerald-500 p-1 rounded-[2rem] shadow-xl animate-in slide-in-from-top-4">
//             <div className="bg-slate-900 rounded-[1.9rem] p-6 flex flex-col md:flex-row items-center justify-between gap-6">
//               <div className="flex items-center gap-4">
//                 <span className="relative flex h-3 w-3">abigail.clark
//                   <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
//                   <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
//                 </span>
//                 <h3 className="text-white font-black uppercase italic tracking-tight">Live Session Active</h3>
//               </div>
//               <Button size="sm" className="bg-emerald-500 hover:bg-emerald-600 text-white font-black px-8 rounded-xl">JOIN NOW</Button>
//             </div>
//           </div>
//         )}


//         {/* 1. OVERVIEW TAB */}
//         {activeTab === "overview" && (
//           <div className="space-y-10 animate-in fade-in duration-500">
//             {/* Top Row: Flashcards & Moodle */}
//             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
//               {flashCards.slice(0, 1).map((card) => (
//                 <FlashCardComponent key={card.id} card={card} />
//               ))}
//               <MoodleCard />
//             </div>

//             {/* Countdown Card */}
//             {profile && (
//               <NextClassCountdownCard
//                 userUid={profile.id}
//                 role="student"
//                 grade={profile.grade}
//               />
//             )}

//             {/* Stats Row */}
//             <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
//               <StatCard icon={CalendarIcon} title="Today's Lessons" value={todayClasses.length} color="indigo" />
//               <StatCard icon={BookOpen} title="Weekly Lessons" value={timetable.length} color="amber" />
//               <StatCard icon={Video} title="Resources" value={classLinks.length} color="emerald" />
//             </div>

//             {/* TODAY'S SCHEDULE LIST */}
//             <div className="bg-white rounded-[2.5rem] p-8 border border-slate-100 shadow-sm">
//               <h2 className="text-sm font-black text-slate-400 uppercase tracking-widest mb-6">
//                 Today's Schedule ({today})
//               </h2>
//               <div className="space-y-4">
//                 {orderedTodayClasses.length > 0 ? (
//                   orderedTodayClasses.map((item) => {
//                     const status = getLessonStatus(item, orderedTodayClasses);

//                     // Local style mapping for the badges
//                     const statusStyles: Record<string, string> = {
//                       done: "bg-slate-100 text-slate-400 border-none",
//                       ongoing: "bg-green-500 text-white animate-pulse border-none",
//                       next: "bg-indigo-600 text-white border-none",
//                       upcoming: "bg-amber-50 text-amber-600 border-none",
//                     };

//                     return (
//                       <div
//                         key={item.id}
//                         className="flex items-center justify-between p-5 bg-slate-50 rounded-3xl border border-slate-100 hover:bg-white transition-colors"
//                       >
//                         <div className="flex items-center gap-5">
//                           <div className="w-14 h-14 bg-white rounded-2xl flex flex-col items-center justify-center shadow-sm border border-slate-100">
//                             <span className="text-[10px] font-black text-indigo-600 leading-none">
//                               {item.time.split(" ")[1]} {/* AM/PM */}
//                             </span>
//                             <span className="text-[14px] font-black text-slate-800">
//                               {item.time.split(" ")[0]} {/* 09:00 */}
//                             </span>
//                           </div>
//                           <div>
//                             <h4 className="font-black text-slate-800 text-sm uppercase leading-tight">
//                               {item.subject}
//                             </h4>
//                             <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
//                               {item.teacherName}
//                             </p>
//                           </div>
//                         </div>
//                         <Badge className={`${statusStyles[status]} px-4 py-1.5 rounded-xl uppercase text-[9px] font-black tracking-tighter`}>
//                           {status === 'ongoing' ? 'Live Now' : status}
//                         </Badge>
//                       </div>
//                     );
//                   })
//                 ) : (
//                   <div className="text-center py-10">
//                     <p className="text-slate-400 italic text-sm">No lessons scheduled for today.</p>
//                   </div>
//                 )}
//               </div>
//             </div>
//           </div>
//         )}

//         {/* 2. TIMETABLE TAB */}
//         {activeTab === "timetable" && (
//           <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden animate-in fade-in">
//             <table className="w-full text-left">
//               <thead>
//                 <tr className="bg-slate-50 border-b border-slate-100">
//                   {["Day", "Time", "Subject", "Teacher"].map((h) => (
//                     <th key={h} className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">{h}</th>
//                   ))}
//                 </tr>
//               </thead>
//               <tbody className="divide-y divide-slate-50">
//                 {timetable.map((entry) => (
//                   <tr key={entry.id} className="hover:bg-slate-50/50 transition-colors">
//                     <td className="p-6 font-black text-slate-800 text-xs uppercase">{entry.day}</td>
//                     <td className="p-6 font-bold text-slate-500 text-xs">{entry.time}</td>
//                     <td className="p-6"><Badge className="bg-indigo-50 text-indigo-600 border-none uppercase text-[9px]">{entry.subject}</Badge></td>
//                     <td className="p-6 text-xs font-bold text-slate-400">{entry.teacherName}</td>
//                   </tr>
//                 ))}
//               </tbody>
//             </table>
//           </div>
//         )}

//         {/* 3. LINKS TAB */}
//         {activeTab === "links" && (
//           <div className="space-y-8 animate-in fade-in">
//             {/* Search & count */}
//             <div className="flex flex-col md:flex-row gap-4 justify-between items-center">
//               <div className="relative w-full max-w-md">
//                 <Users className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
//                 <Input
//                   placeholder="Search resources..."
//                   className="pl-12 h-14 rounded-2xl border-slate-100"
//                   value={searchTerm}
//                   onChange={(e) => setSearchTerm(e.target.value)}
//                 />
//               </div>
//               <p className="text-[10px] font-black text-slate-400 uppercase">
//                 {classLinks.filter(link =>
//                   (link.title || link.name).toLowerCase().includes(searchTerm.toLowerCase())
//                 ).length} items found
//               </p>
//             </div>

//             {/* Resource cards */}
//             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
//               {classLinks
//                 .filter(link => {
//                   const grade = (profile?.grade || "").toLowerCase();
//                   // const isNew = link.createdAt ? (Date.now() - link.createdAt.toMillis()) < (24 * 60 * 60 * 1000) : false;
//                   const targetGrade = (link.targetGrade || "").toLowerCase();
//                   const subject = (link.subject || "").trim().toLowerCase();

//                   // Grade match: 'all' OR matches student's grade
//                   const gradeMatch = targetGrade === "all" || targetGrade.includes(grade);

//                   // Subject match: 'all', 'general', or student's subjects
//                   const normalizedSubs = (profile?.subjects || []).map((s: any) =>
//                     (typeof s === "string" ? s : s?.name || "").trim().toLowerCase()
//                   );
//                   const subjectMatch = !subject || subject === "all" || subject === "general" || normalizedSubs.includes(subject);

//                   return gradeMatch && subjectMatch;
//                 })
//                 .filter(link =>
//                   (link.title || link.name).toLowerCase().includes(searchTerm.toLowerCase())
//                 )
//                 .map(link =>
//                 (
//                   <div key={link.id} className="group bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm hover:shadow-xl transition-all">

//                     {/* 🔥 THE NEW BADGE */}
//                     {/* {isNew && (
//                       <div className="absolute top-0 right-0">
//                         <div className="bg-emerald-500 text-white text-[8px] font-black px-3 py-1 rounded-bl-xl uppercase tracking-widest shadow-sm animate-pulse">
//                           New Resource
//                         </div>
//                       </div>
//                     )} */}


//                     <div className="flex justify-between items-start mb-6">
//                       <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl group-hover:bg-indigo-600 group-hover:text-white transition-colors">
//                         {link.type === 'classroom' ? <Video size={20} /> : <ExternalLink size={20} />}
//                       </div>
//                       <Badge variant="outline" className="text-[9px] uppercase">{link.subject || "General"}</Badge>
//                     </div>
//                     <h3 className="font-black text-slate-800 mb-1">{link.title || link.name}</h3>
//                     <p className="text-[10px] font-bold text-slate-400 uppercase mb-6">{link.teacherName || "Unknown"}</p>
//                     <Button
//                       onClick={() => {
//                         // 1. Call the helper function (this fixes the "never read" error)
//                         logLinkAccess(link);

//                         // 2. Open the URL
//                         window.open(link.url, "_blank");
//                       }}
//                       className="w-full bg-slate-50 hover:bg-indigo-600 text-slate-600 hover:text-white font-black rounded-xl h-12"
//                     >
//                       Open <ArrowRight size={14} className="ml-2" />
//                     </Button>
//                   </div>
//                 ))}
//             </div>
//           </div>
//         )}

//         {/* 4. AUDIO PDF TAB */}
//         {activeTab === "audio-pdf" && (
//           <div className="animate-in fade-in">
//             <AudioPDFReader />
//           </div>
//         )}

//       </main>
//     </div>
//   )
// };


// // ... (Sub-components like LoadingScreen/ClockIcon omitted for space)
// const LoadingScreen = () => (
//   <div className="h-screen bg-slate-50 flex flex-col items-center justify-center">
//     <Loader2 className="w-10 h-10 text-indigo-600 animate-spin mb-4" />
//     <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Synchronizing Portal...</p>
//   </div>
// );

// const ClockIcon = ({ size }: { size: number }) => (
//   <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>
// );



// export default StudentDashboard;

// StudentDashboard.tsx – Clean & Secure Student Portal (React + TS + Firebase)
// StudentDashboard.tsx – Clean & Secure Student Portal

import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { db } from "@/lib/firebaseConfig";
import {
  collection,
  onSnapshot,
  query,
  where,
  doc,
  getDoc,
  addDoc,
  serverTimestamp,
  orderBy,
} from "firebase/firestore";

/* UI Components */
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
  Users,
  LayoutDashboard,
  Clock,
  ExternalLink,
} from "lucide-react";

/* Context & Custom */
import { useAuth } from "../auth/AuthProvider";
import NextClassCountdownCard from "@/lib/NextClassCountdownCard";
import MoodleCard from "./MoodleCard";
import AudioPDFReader from "@/lib/AudioPDFReader";
import FlashCardComponent from "@/components/FlashCard";
import { flashCards } from "@/lib/flashcards";

import logo from "@/img/care.png";

// =============================================================================
// TYPES
// =============================================================================

interface StudentProfile {
  id: string;
  firstName: string;
  lastName?: string;
  grade: string;
  parentId?: string;
  parentName?: string;
  email?: string;
  dashboardLocked?: boolean;
  lockReason?: string;
  subjects?: Array<{ name: string } | string>;
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
  name?: string;
  title?: string;
  url: string;
  targetGrade?: string;
  type: "classroom" | "external";
  subject?: string;
  teacherName?: string;
  createdAt?: any;
  status?: string;
}

// =============================================================================
// HELPERS
// =============================================================================

const parseLessonDate = (timeStr: string, baseDate: Date): Date => {
  const [clock, meridian] = timeStr.split(" ");
  let [hours, minutes] = clock.split(":").map(Number);

  if (meridian === "PM" && hours !== 12) hours += 12;
  if (meridian === "AM" && hours === 12) hours = 0;

  const lessonDate = new Date(baseDate);
  lessonDate.setHours(hours, minutes, 0, 0);
  return lessonDate;
};

const getLessonStatus = (
  lesson: TimetableEntry,
  now: Date,
  orderedTodayClasses: TimetableEntry[]
): "done" | "ongoing" | "next" | "upcoming" => {
  const lessonDate = parseLessonDate(lesson.time, now);
  const lessonEnd = new Date(lessonDate.getTime() + 60 * 60 * 1000);

  if (now > lessonEnd) return "done";
  if (now >= lessonDate && now <= lessonEnd) return "ongoing";

  const futureLessons = orderedTodayClasses.filter(
    (l) => parseLessonDate(l.time, now) > now
  );

  if (futureLessons.length > 0 && futureLessons[0].id === lesson.id) return "next";
  return "upcoming";
};

const StatCard = ({
  icon: Icon,
  title,
  value,
  color = "indigo",
}: {
  icon: React.ElementType;
  title: string;
  value: number | string;
  color?: "indigo" | "amber" | "emerald";
}) => {
  const colors = {
    indigo: "bg-indigo-50 text-indigo-600",
    amber: "bg-amber-50 text-amber-600",
    emerald: "bg-emerald-50 text-emerald-600",
  };

  return (
    <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm flex items-center gap-4">
      <div className={`p-4 rounded-2xl ${colors[color]}`}>
        <Icon size={24} />
      </div>
      <div>
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{title}</p>
        <p className="text-2xl font-black text-slate-800">{value}</p>
      </div>
    </div>
  );
};

// =============================================================================
// MAIN COMPONENT
// =============================================================================

const StudentDashboard: React.FC = () => {
  const { logoutStudent, user, loading: authLoading } = useAuth();
  const { studentId } = useParams<{ studentId: string }>();
  const navigate = useNavigate();

  const [profile, setProfile] = useState<StudentProfile | null>(null);
  const [profileLoaded, setProfileLoaded] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);

  const [timetable, setTimetable] = useState<TimetableEntry[]>([]);
  const [classLinks, setClassLinks] = useState<ClassLink[]>([]);
  const [activeTab, setActiveTab] = useState<"overview" | "timetable" | "links" | "audio-pdf">("overview");
  const [searchTerm, setSearchTerm] = useState("");
  const [now, setNow] = useState(new Date());

  // Live clock
  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(interval);
  }, []);

  // Load student profile
  useEffect(() => {
    if (!studentId) {
      setProfileError("No student ID found in URL.");
      setProfileLoaded(true);
      return;
    }

    const loadProfile = async () => {
      try {
        // Log to console so you can see if the ID matches Firestore exactly
        console.log("Attempting to load student ID:", studentId);

        const docRef = doc(db, "students", studentId.trim());
        const snap = await getDoc(docRef);

        if (snap.exists()) {
          setProfile({ id: snap.id, ...snap.data() } as StudentProfile);
          setProfileError(null);
        } else {
          setProfileError(`Student ${studentId} does not exist in the database.`);
        }
      } catch (err: any) {
        console.error("Firestore Error:", err);
        setProfileError("Database connection failed. Check your internet.");
      } finally {
        setProfileLoaded(true);
      }
    };

    loadProfile();
  }, [studentId]);

  // Fetch timetable
  useEffect(() => {
    if (!profile?.grade) return;

    const q = query(collection(db, "timetable"), where("grade", "==", profile.grade));

    const unsub = onSnapshot(
      q,
      (snap) => setTimetable(snap.docs.map((d) => ({ id: d.id, ...d.data() })) as TimetableEntry[]),
      (err) => console.error("Timetable error:", err)
    );

    return () => unsub();
  }, [profile?.grade]);

  // Fetch class links
  useEffect(() => {
    if (!profile?.grade) return;

    const qLinks = query(
      collection(db, "class_links"),
      where("status", "==", "active"),
      orderBy("createdAt", "desc")
    );

    const unsub = onSnapshot(
      qLinks,
      (snap) => {
        let links = snap.docs.map((d) => ({ id: d.id, ...d.data() })) as ClassLink[];

        const studentGrade = profile.grade.trim().toLowerCase();
        const studentSubjects = (profile.subjects || []).map((s) =>
          (typeof s === "string" ? s : s?.name || "").trim().toLowerCase()
        );

        links = links.filter((link) => {
          const targetGrade = (link.targetGrade || link.grade || "").trim().toLowerCase();
          const linkSubject = (link.subject || "").trim().toLowerCase();

          const gradeMatch = targetGrade === "all" || targetGrade === studentGrade;
          const subjectMatch =
            !linkSubject || linkSubject === "all" || linkSubject === "general" || studentSubjects.includes(linkSubject);

          return gradeMatch && subjectMatch;
        });

        setClassLinks(links);
      },
      (err) => console.error("Class links error:", err)
    );

    return () => unsub();
  }, [profile]);

  // Computed values
  const today = now.toLocaleDateString("en-US", { weekday: "long" });

  const todayClasses = useMemo(() => timetable.filter((t) => t.day === today), [timetable, today]);

  const orderedTodayClasses = useMemo(() => {
    return [...todayClasses]
      .map((item) => ({ ...item, lessonDate: parseLessonDate(item.time, now) }))
      .sort((a, b) => a.lessonDate.getTime() - b.lessonDate.getTime());
  }, [todayClasses, now]);

  const filteredLinks = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return classLinks;
    return classLinks.filter((link) => {
      const title = (link.title || link.name || "").toLowerCase();
      const subject = (link.subject || "").toLowerCase();
      return title.includes(term) || subject.includes(term);
    });
  }, [classLinks, searchTerm]);

  const logLinkAccess = async (link: ClassLink) => {
    if (!user?.uid || !profile) return;
    try {
      await addDoc(collection(db, "class_links", link.id, "auditTrail"), {
        studentId: user.uid,
        studentName: profile.firstName,
        grade: profile.grade,
        subject: link.subject || "general",
        action: "opened_link",
        clickedAt: serverTimestamp(),
      });
    } catch (e) {
      console.error("Audit log failed:", e);
    }
  };

  const handleLogout = () => {
    logoutStudent?.();
    navigate("/");
  };

  const statusStyles: Record<string, string> = {
    done: "bg-slate-100 text-slate-400",
    ongoing: "bg-green-500 text-white animate-pulse",
    next: "bg-indigo-500 text-white",
    upcoming: "bg-yellow-100 text-yellow-700",
  };

  const statusLabel: Record<string, string> = {
    done: "Done",
    ongoing: "Live Now",
    next: "Next",
    upcoming: "Upcoming",
  };

  // Loading / Error states
  if (!profileLoaded || authLoading) {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-slate-50">
        <Loader2 className="animate-spin text-indigo-600 mb-4" size={40} />
        <p className="font-black text-slate-400 uppercase tracking-widest text-xs">Synchronizing Portal...</p>
      </div>
    );
  }

  if (profileError || !profile) {
    return (
      <div className="h-screen flex items-center justify-center bg-slate-50 p-6">
        <div className="max-w-md bg-white p-10 rounded-3xl shadow-xl text-center">
          <AlertCircle className="mx-auto text-rose-500 mb-4" size={48} />
          <h2 className="text-xl font-black mb-2">Access Error</h2>
          <p className="text-sm text-slate-500 mb-6">{profileError || "Unable to load your profile"}</p>
          <Button onClick={handleLogout} variant="outline">Return to Login</Button>
        </div>
      </div>
    );
  }

  if (profile.dashboardLocked) {
    return (
      <div className="h-screen flex items-center justify-center bg-slate-50 p-6">
        <div className="max-w-md bg-white p-10 rounded-3xl shadow-xl text-center">
          <AlertCircle className="mx-auto text-rose-500 mb-4" size={48} />
          <h2 className="text-xl font-black mb-2">Access Restricted</h2>
          <p className="text-sm text-slate-500 mb-6">{profile.lockReason || "Please settle pending invoices."}</p>
          <Button onClick={handleLogout} variant="outline">Logout</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] font-sans text-slate-900">
      <header className="bg-white border-b sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <img src={logo} alt="Logo" className="w-12 h-12 object-contain" />
            <div>
              <h1 className="text-lg font-black leading-tight">
                {profile.firstName} {profile.lastName}
              </h1>
              <Badge className="w-fit bg-indigo-50 text-indigo-600 text-[10px] border-none">
                Grade {profile.grade}
              </Badge>
            </div>
          </div>

          <Button variant="ghost" size="sm" onClick={handleLogout} className="text-slate-400 hover:text-rose-500">
            <LogOut size={16} className="mr-2" /> Logout
          </Button>
        </div>

        <nav className="max-w-7xl mx-auto px-6 flex gap-8 border-t">
          {[
            { id: "overview", icon: LayoutDashboard, label: "Overview" },
            { id: "timetable", icon: Clock, label: "Schedule" },
            { id: "links", icon: Video, label: "Resources" },
            { id: "audio-pdf", icon: BookOpen, label: "Audio PDF" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`py-4 text-xs font-black uppercase transition-all border-b-2 flex items-center gap-2 ${activeTab === tab.id
                ? "border-indigo-600 text-indigo-600"
                : "border-transparent text-slate-400 hover:text-slate-600"
                }`}
            >
              <tab.icon size={14} />
              {tab.label}
            </button>
          ))}
        </nav>
      </header>

      <main className="max-w-7xl mx-auto p-6 md:p-10 space-y-10">
        {activeTab === "overview" && (
          <div className="space-y-10">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {flashCards.slice(0, 1).map((card) => (
                <FlashCardComponent key={card.id} card={card} />
              ))}
              <MoodleCard />
            </div>

            {profile && (
              <NextClassCountdownCard userUid={profile.id} role="student" grade={profile.grade} />
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <StatCard icon={CalendarIcon} title="Today's Lessons" value={todayClasses.length} color="indigo" />
              <StatCard icon={BookOpen} title="Weekly Lessons" value={timetable.length} color="amber" />
              <StatCard icon={Video} title="Resources" value={classLinks.length} color="emerald" />
            </div>

            <div className="bg-white rounded-[2.5rem] p-8 border border-slate-100 shadow-sm">
              <h2 className="text-sm font-black text-slate-400 uppercase tracking-widest mb-6">
                Today's Schedule ({today})
              </h2>
              <div className="space-y-4">
                {orderedTodayClasses.length > 0 ? (
                  orderedTodayClasses.map((item) => {
                    const status = getLessonStatus(item, now, orderedTodayClasses);
                    return (
                      <div
                        key={item.id}
                        className="flex items-center justify-between p-5 bg-slate-50 rounded-3xl border border-slate-100 hover:bg-white transition-colors"
                      >
                        <div className="flex items-center gap-5">
                          <div className="w-14 h-14 bg-white rounded-2xl flex flex-col items-center justify-center shadow-sm border border-slate-100">
                            <span className="text-[10px] font-black text-indigo-600 leading-none">
                              {item.time.split(" ")[1]}
                            </span>
                            <span className="text-[14px] font-black text-slate-800">
                              {item.time.split(" ")[0]}
                            </span>
                          </div>
                          <div>
                            <h4 className="font-black text-slate-800 text-sm uppercase">{item.subject}</h4>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                              {item.teacherName}
                            </p>
                          </div>
                        </div>
                        <Badge
                          className={`${statusStyles[status]} px-4 py-1.5 rounded-xl uppercase text-xs font-black tracking-wider`}
                        >
                          {statusLabel[status]}
                        </Badge>
                      </div>
                    );
                  })
                ) : (
                  <div className="text-center py-12 text-slate-400">No lessons scheduled for today.</div>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === "timetable" && (
          <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50 border-b">
                  {["Day", "Time", "Subject", "Teacher"].map((h) => (
                    <th key={h} className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {timetable.map((entry) => (
                  <tr key={entry.id} className="hover:bg-slate-50/70">
                    <td className="p-6 font-black text-slate-800 text-xs uppercase">{entry.day}</td>
                    <td className="p-6 font-bold text-slate-500 text-xs">{entry.time}</td>
                    <td className="p-6">
                      <Badge className="bg-indigo-50 text-indigo-600 border-none uppercase text-[9px]">
                        {entry.subject}
                      </Badge>
                    </td>
                    <td className="p-6 text-xs font-bold text-slate-400">{entry.teacherName}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === "links" && (
          <div className="space-y-8">
            <div className="flex flex-col md:flex-row gap-4 justify-between items-center">
              <div className="relative w-full max-w-md">
                <Users className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <Input
                  placeholder="Search resources..."
                  className="pl-12 h-14 rounded-2xl border-slate-100"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                {filteredLinks.length} resources found
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredLinks.map((link) => (
                <div
                  key={link.id}
                  className="group bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm hover:shadow-xl transition-all"
                >
                  <div className="flex justify-between items-start mb-6">
                    <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                      {link.type === "classroom" ? <Video size={20} /> : <ExternalLink size={20} />}
                    </div>
                    <Badge variant="outline" className="text-[9px] uppercase">
                      {link.subject || "General"}
                    </Badge>
                  </div>
                  <h3 className="font-black text-slate-800 mb-1">{link.title || link.name}</h3>
                  <p className="text-[10px] font-bold text-slate-400 uppercase mb-6">
                    {link.teacherName || "Unknown Teacher"}
                  </p>
                  <Button
                    onClick={() => {
                      logLinkAccess(link);
                      window.open(link.url, "_blank", "noopener,noreferrer");
                    }}
                    className="w-full bg-slate-50 hover:bg-indigo-600 text-slate-600 hover:text-white font-black rounded-xl h-12"
                  >
                    Open Resource <ArrowRight size={14} className="ml-2" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === "audio-pdf" && <AudioPDFReader />}
      </main>
    </div>
  );
};

export default StudentDashboard;






