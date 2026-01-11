"use client";

import React, { useEffect, useState } from "react";
import { db } from "@/lib/firebaseConfig";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { useAuth } from "@/components/auth/AuthProvider";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Link, useNavigate } from "react-router-dom";
import { 
  CheckCircle, 
  Clock, 
  MapPin, 
  Laptop, 
  AlertCircle,
  ShieldCheck,
  GraduationCap
} from "lucide-react";

interface Student {
  id: string;
  firstName: string;
  lastName: string;
  grade: string;
  curriculum: "Cambridge"; // Strictly Cambridge
  subjects: string[];
  status: "pending" | "enrolled";
  principalReviewed?: boolean;
  paymentReceived?: boolean;
  learningMode?: "Campus" | "Virtual";
}

export default function StatusSection() {
  const { user } = useAuth();
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);

  // ──────────────────────────────────────────────────────────
  // REAL-TIME FETCH & INVOICE SYNC
  // ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!user?.uid) return;

    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();

    // Listen to students (filtered by Cambridge for safety)
    const qStudents = query(
      collection(db, "students"), 
      where("parentId", "==", user.uid)
    );
    
    // Listen to all invoices for this parent
    const qInvoices = query(collection(db, "invoices"), where("parentId", "==", user.uid));

    const unsubscribeStudents = onSnapshot(qStudents, (studentSnap) => {
      const studentList = studentSnap.docs.map(d => ({ 
        id: d.id, 
        ...d.data(),
        curriculum: "Cambridge" // Force visual state to Cambridge
      } as Student));

      const unsubscribeInvoices = onSnapshot(qInvoices, (invoiceSnap) => {
        const allInvoices = invoiceSnap.docs.map(d => ({ id: d.id, ...d.data() }));

        const finalData = studentList.map(student => {
          const hasPendingInvoice = allInvoices.some(inv => 
            (inv as any).status === "pending" &&
            (inv as any).createdAt?.toDate().getMonth() === currentMonth &&
            (inv as any).createdAt?.toDate().getFullYear() === currentYear &&
            ((inv as any).studentId === student.id || (inv as any).studentNames?.includes(student.firstName))
          );

          return {
            ...student,
            paymentReceived: !hasPendingInvoice
          };
        });

        setStudents(finalData);
        setLoading(false);
      });

      return () => unsubscribeInvoices();
    }, (err) => {
      console.error("Fetch error:", err);
      setLoading(false);
    });

    return () => unsubscribeStudents();
  }, [user?.uid]);

  // ──────────────────────────────────────────────────────────
  // STATUS BADGE COLOR
  // ──────────────────────────────────────────────────────────
  const getStatusBadge = (student: Student) => {
    if (student.status === "enrolled" && student.paymentReceived) {
      return (
        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-700 border border-emerald-200 uppercase">
          <ShieldCheck size={12} /> Enrollment Active
        </span>
      );
    }

    if (!student.paymentReceived) {
      return (
        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-[10px] font-black bg-rose-100 text-rose-700 border border-rose-200 animate-pulse uppercase">
          <AlertCircle size={12} /> Payment Overdue
        </span>
      );
    }

    return (
      <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-[10px] font-black bg-indigo-100 text-indigo-700 uppercase border border-indigo-200">
        <Clock size={12} /> Verification in Progress
      </span>
    );
  };

  // ──────────────────────────────────────────────────────────
  // ACTION BUTTONS
  // ──────────────────────────────────────────────────────────
  const getActionButton = (student: Student) => {
    if (student.status === "enrolled") {
      return (
        <Button size="sm" className="bg-indigo-600 hover:bg-indigo-700 rounded-xl font-bold shadow-md shadow-indigo-100 transition-all active:scale-95" asChild>
          <Link to={`/student-dashboard/${student.id}`}>Open Cambridge Portal</Link>
        </Button>
      );
    }
    
    if (!student.paymentReceived) {
      return (
        <div className="flex flex-col gap-2">
          <Button size="sm" className="bg-rose-600 hover:bg-rose-700 rounded-xl font-bold animate-bounce shadow-md shadow-rose-100" asChild>
            <Link to={`/payments?studentId=${student.id}`}>Settle Account</Link>
          </Button>
          <p className="text-[9px] text-center text-rose-500 font-black uppercase">Blocked by Invoice</p>
        </div>
      );
    }

    return (
      <Button size="sm" disabled className="bg-slate-50 text-slate-400 rounded-xl font-bold border border-slate-200">
        Review Pending
      </Button>
    );
  };

  const renderTimeline = (student: Student) => {
    const steps = [
      { label: "Cambridge Application", done: true, icon: <CheckCircle className="w-5 h-5 text-emerald-600" /> },
      { label: "Financial Clearance", done: student.paymentReceived, active: !student.paymentReceived, icon: student.paymentReceived ? <CheckCircle className="w-5 h-5 text-emerald-600" /> : <Clock className="w-5 h-5 text-rose-500 animate-pulse" /> },
      { label: "Academic Board Review", done: student.principalReviewed, active: student.paymentReceived && !student.principalReviewed, icon: student.principalReviewed ? <CheckCircle className="w-5 h-5 text-emerald-600" /> : <Clock className="w-5 h-5 text-indigo-400" /> },
      { label: "Portal Credentials Issued", done: student.status === "enrolled", icon: student.status === "enrolled" ? <CheckCircle className="w-5 h-5 text-emerald-600" /> : <div className="w-5 h-5 rounded-full border-2 border-slate-200"></div> },
    ];

    return (
      <ol className="mt-3 space-y-3">
        {steps.map((step, idx) => (
          <li key={idx} className={`flex items-center gap-3 text-xs tracking-tight ${step.done ? "text-emerald-700 font-bold" : step.active ? "text-indigo-700 font-black" : "text-slate-400 font-medium"}`}>
            {step.icon}
            <span>{step.label}</span>
          </li>
        ))}
      </ol>
    );
  };

  if (loading) return (
    <div className="p-20 text-center">
      <div className="animate-spin w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full mx-auto mb-4"></div>
      <p className="text-slate-500 font-bold uppercase text-[10px] tracking-widest">Validating Credentials...</p>
    </div>
  );

  return (
    <div className="p-4 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-3 mb-8">
        <div className="bg-indigo-600 p-2 rounded-lg text-white">
          <GraduationCap size={24} />
        </div>
        <h2 className="text-3xl font-black text-slate-900 tracking-tighter">Academic Status</h2>
      </div>

      {students.length === 0 ? (
        <Card className="p-16 text-center border-2 border-dashed border-slate-200 bg-slate-50/50 rounded-[2rem]">
          <p className="text-slate-400 font-bold uppercase text-xs tracking-widest">No active Cambridge enrollments</p>
          <Button className="mt-6 bg-indigo-600 rounded-xl px-8" asChild><Link to="/register">Apply Now</Link></Button>
        </Card>
      ) : (
        <div className="space-y-6">
          {students.map((student) => {
            const isCampus = student.learningMode === "Campus";
            
            return (
              <Card key={student.id} className="p-8 border-none shadow-xl shadow-slate-200/50 relative overflow-hidden rounded-[2rem] bg-white group transition-all hover:shadow-2xl">
                {/* Visual Indicator */}
                <div className={`absolute top-0 left-0 w-2.5 h-full ${isCampus ? "bg-emerald-500" : "bg-indigo-600"}`}></div>
                
                <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-6">
                  <div className="space-y-4">
                    <div className="flex items-center gap-2">
                      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest text-white ${isCampus ? "bg-emerald-600" : "bg-indigo-600"}`}>
                        {isCampus ? <MapPin size={10} /> : <Laptop size={10} />}
                        {student.learningMode}
                      </span>
                      <span className="inline-flex items-center gap-1 px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest bg-slate-900 text-white shadow-sm">
                        CAMBRIDGE Focus
                      </span>
                    </div>

                    <div>
                      <h3 className="text-2xl font-black text-slate-900 leading-tight tracking-tight uppercase">
                        {student.firstName} {student.lastName}
                      </h3>
                      <p className="text-xs font-bold text-slate-400 mt-1 uppercase tracking-widest">
                        Grade {student.grade} <span className="mx-2 text-slate-200">|</span> Ref: {student.id.slice(-6).toUpperCase()}
                      </p>
                    </div>

                    <div>{getStatusBadge(student)}</div>
                  </div>

                  <div className="flex flex-col gap-2 md:pt-4">
                    {getActionButton(student)}
                  </div>
                </div>

                <div className="mt-8 pt-6 border-t border-slate-100 bg-slate-50/30 -mx-8 px-8 pb-8 rounded-b-[2rem]">
                   <p className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.2em] mb-4">Board Review Timeline</p>
                  {renderTimeline(student)}
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}