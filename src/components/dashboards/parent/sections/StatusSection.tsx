"use client";

import React, { useEffect, useState } from "react";
import { db } from "@/lib/firebaseConfig";
import { collection, query, where, onSnapshot } from "firebase/firestore"; // Added onSnapshot for real-time updates
import { useAuth } from "@/components/auth/AuthProvider";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Link, useNavigate } from "react-router-dom";
import { 
  ArrowLeft, 
  X, 
  CheckCircle, 
  Clock, 
  BookOpen, 
  Globe, 
  MapPin, 
  Laptop, 
  AlertCircle
} from "lucide-react";

interface Student {
  id: string;
  firstName: string;
  lastName: string;
  grade: string;
  curriculum: "CAPS" | "Cambridge";
  subjects: string[];
  status: "pending" | "enrolled";
  principalReviewed?: boolean;
  paymentReceived?: boolean;
  learningMode?: "Campus" | "Virtual"; // Added learningMode to interface
}

export default function StatusSection() {
  const { user } = useAuth();
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  // ──────────────────────────────────────────────────────────
  // REAL-TIME FETCH (onSnapshot)
  // ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!user?.uid) return;

    // Use onSnapshot instead of getDocs so the UI updates 
    // immediately when the Parent toggles the mode in Overview
    const q = query(
      collection(db, "students"),
      where("parentId", "==", user.uid)
    );

    const unsubscribe = onSnapshot(q, (snap) => {
      const list: Student[] = snap.docs.map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          firstName: data.firstName || "",
          lastName: data.lastName || "",
          grade: data.grade || "",
          curriculum: data.curriculum || "CAPS",
          subjects: data.subjects || [],
          status: data.status || "pending",
          principalReviewed: data.principalReviewed || false,
          paymentReceived: data.paymentReceived || false,
          learningMode: data.learningMode || "Virtual", // Default to Virtual
        };
      });
      setStudents(list);
      setLoading(false);
    }, (err) => {
      console.error("Error listening to student status:", err);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user?.uid]);

/* ---------------- Updated useEffect with Invoice Listener ---------------- */
/* ---------------- Updated useEffect for Parent Status Section ---------------- */
useEffect(() => {
  if (!user?.uid) return;

  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();

  // Listen to students
  const qStudents = query(collection(db, "students"), where("parentId", "==", user.uid));
  // Listen to all invoices for this parent
  const qInvoices = query(collection(db, "invoices"), where("parentId", "==", user.uid));

  const unsubscribeStudents = onSnapshot(qStudents, (studentSnap) => {
    const studentList = studentSnap.docs.map(d => ({ id: d.id, ...d.data() } as Student));

    const unsubscribeInvoices = onSnapshot(qInvoices, (invoiceSnap) => {
      const allInvoices = invoiceSnap.docs.map(d => ({ id: d.id, ...d.data() }));

      const finalData = studentList.map(student => {
        // Find any pending invoice for this specific student for the current month
        const hasPendingInvoice = allInvoices.some(inv => 
          inv.status === "pending" &&
          inv.createdAt?.toDate().getMonth() === currentMonth &&
          inv.createdAt?.toDate().getFullYear() === currentYear &&
          (inv.studentId === student.id || inv.studentNames?.includes(student.firstName))
        );

        return {
          ...student,
          // Force status to pending if an invoice exists for the 1st of the month
          paymentReceived: !hasPendingInvoice
        };
      });

      setStudents(finalData);
    });

    return () => unsubscribeInvoices();
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
        <CheckCircle size={12} /> Account Clear
      </span>
    );
  }

  // Monthly Invoice Pending (Red/Orange Pulse)
  if (!student.paymentReceived) {
    return (
      <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-[10px] font-black bg-rose-100 text-rose-700 border border-rose-200 animate-pulse uppercase">
        <AlertCircle size={12} /> Monthly Invoice Pending
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-[10px] font-black bg-blue-100 text-blue-700 uppercase">
      <Clock size={12} /> Awaiting Principal Review
    </span>
  );
};


  // ──────────────────────────────────────────────────────────
  // ACTION BUTTONS
  // ──────────────────────────────────────────────────────────

  const getActionButton = (student: Student) => {
  if (student.status === "enrolled") {
    return (
      <Button size="sm" className="bg-green-600 hover:bg-green-700 rounded-xl font-bold">
        <Link to={`/student-dashboard/${student.id}`}>Access Portal</Link>
      </Button>
    );
  }
  
  // If paymentReceived is false (meaning at least one invoice is pending)
  if (!student.paymentReceived) {
    return (
      <div className="flex flex-col gap-2">
        <Button size="sm" className="bg-orange-600 hover:bg-orange-700 rounded-xl font-bold animate-pulse">
          <Link to={`/payments?studentId=${student.id}`}>Settle Outstanding</Link>
        </Button>
        <p className="text-[9px] text-center text-orange-500 font-bold uppercase">Action Required</p>
      </div>
    );
  }

  return (
    <Button size="sm" disabled className="bg-slate-100 text-slate-400 rounded-xl font-bold border border-slate-200">
      Awaiting Review
    </Button>
  );
};
  const renderTimeline = (student: Student) => {
    const steps = [
      { label: "Registration Submitted", done: true, icon: <CheckCircle className="w-5 h-5 text-green-600" /> },
      { label: "Payment Received", done: student.paymentReceived, active: !student.paymentReceived, icon: student.paymentReceived ? <CheckCircle className="w-5 h-5 text-green-600" /> : <Clock className="w-5 h-5 text-yellow-600 animate-pulse" /> },
      { label: "Principal Review", done: student.principalReviewed, active: student.paymentReceived && !student.principalReviewed, icon: student.principalReviewed ? <CheckCircle className="w-5 h-5 text-green-600" /> : <Clock className="w-5 h-5 text-yellow-600" /> },
      { label: "Onboarding Complete", done: student.status === "enrolled", icon: student.status === "enrolled" ? <CheckCircle className="w-5 h-5 text-green-600" /> : <div className="w-5 h-5 rounded-full border border-gray-400"></div> },
    ];

    return (
      <ol className="mt-3 space-y-2 text-sm">
        {steps.map((step, idx) => (
          <li key={idx} className={`flex items-center gap-2 ${step.done ? "text-green-700" : step.active ? "text-yellow-700 font-medium" : "text-gray-500"}`}>
            {step.icon}
            <span>{step.label}</span>
          </li>
        ))}
      </ol>
    );
  };

  if (loading) return <div className="p-10 text-center text-gray-500">Loading enrollment status...</div>;

  return (
    <div className="p-4 max-w-4xl mx-auto space-y-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-black text-slate-900">Enrollment Status</h2>
      </div>

      {students.length === 0 ? (
        <Card className="p-10 text-center">
          <p className="text-gray-500">No students registered yet.</p>
          <Button className="mt-4 bg-indigo-600" asChild><Link to="/register">Enroll a Child</Link></Button>
        </Card>
      ) : (
        <div className="space-y-6">
          {students.map((student) => {
            const isCampus = student.learningMode === "Campus";
            
            return (
              <Card key={student.id} className="p-6 border-2 border-slate-100 shadow-sm relative overflow-hidden">
                {/* Visual Indicator of Mode */}
                <div className={`absolute top-0 left-0 w-2 h-full ${isCampus ? "bg-emerald-500" : "bg-indigo-500"}`}></div>
                
                <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                  <div className="space-y-3">
                    {/* Learning Mode & Curriculum Row */}
                    <div className="flex items-center gap-2">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-widest text-white ${isCampus ? "bg-emerald-600" : "bg-indigo-600"}`}>
                        {isCampus ? <MapPin size={10} /> : <Laptop size={10} />}
                        {student.learningMode}
                      </span>
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-widest bg-slate-200 text-slate-700">
                        {student.curriculum}
                      </span>
                    </div>

                    {/* Student Identity */}
                    <div>
                      <h3 className="text-xl font-bold text-slate-900 leading-tight">
                        {student.firstName} {student.lastName}
                      </h3>
                      <p className="text-sm text-slate-500">Grade {student.grade} • ID: {student.id.slice(-6).toUpperCase()}</p>
                    </div>

                    {/* Status Badge */}
                    <div>{getStatusBadge(student)}</div>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-col gap-2">
                    {getActionButton(student)}
                  </div>
                </div>

                {/* Timeline */}
                <div className="mt-6 pt-4 border-t border-slate-50">
                   <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">Onboarding Roadmap</p>
                  {renderTimeline(student)}
                </div>
                
                {/* Fine Print Footer */}
                <div className="mt-4 text-[10px] text-slate-400 italic">
                  * Learning mode can be switched termly in the parent dashboard overview.
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}