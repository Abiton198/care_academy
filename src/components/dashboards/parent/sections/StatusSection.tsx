"use client";

import React, { useEffect, useState } from "react";
import { db } from "@/lib/firebaseConfig";
import { collection, query, where, getDocs } from "firebase/firestore";
import { useAuth } from "@/components/auth/AuthProvider";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, X, CheckCircle, XCircle, Clock, BookOpen, Globe } from "lucide-react";

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
}

export default function StatusSection() {
  const { user } = useAuth();
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  // ──────────────────────────────────────────────────────────
  // FETCH STUDENTS FROM `students` COLLECTION
  // ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!user?.uid) return;

    const fetchStudents = async () => {
      try {
        const q = query(
          collection(db, "students"),
          where("parentId", "==", user.uid)
        );
        const snap = await getDocs(q);

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
          };
        });

        setStudents(list);
      } catch (err) {
        console.error("Error fetching students:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchStudents();
  }, [user]);

  // ──────────────────────────────────────────────────────────
  // STATUS BADGE COLOR
  // ──────────────────────────────────────────────────────────
  const getStatusBadge = (student: Student) => {
    const { status, principalReviewed, paymentReceived } = student;

    if (status === "enrolled") {
      return (
        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-green-100 text-green-800">
          <CheckCircle size={14} /> Enrolled
        </span>
      );
    }

    if (!paymentReceived) {
      return (
        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-orange-100 text-orange-800">
          <Clock size={14} /> Payment Pending
        </span>
      );
    }

    if (!principalReviewed) {
      return (
        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-800">
          <Clock size={14} /> Awaiting Approval
        </span>
      );
    }

    if (principalReviewed && paymentReceived && status !== "enrolled") {
      return (
        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-yellow-100 text-yellow-800">
          <Clock size={14} /> Processing
        </span>
      );
    }

    return (
      <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-gray-100 text-gray-800">
        Pending
      </span>
    );
  };

  // ──────────────────────────────────────────────────────────
  // ACTION BUTTON
  // ──────────────────────────────────────────────────────────
  const getActionButton = (student: Student) => {
    if (student.status === "enrolled") {
      return (
        <Button size="sm" className="bg-green-600 hover:bg-green-700">
          <Link to={`/student-dashboard/${student.id}`}>Access Portal</Link>
        </Button>
      );
    }

    if (!student.paymentReceived) {
      return (
        <Button size="sm" className="bg-orange-600 hover:bg-orange-700">
          <Link to={`/payments?studentId=${student.id}`}>Pay Now</Link>
        </Button>
      );
    }

    if (!student.principalReviewed) {
      return (
        <Button size="sm" disabled className="bg-blue-500 text-white cursor-not-allowed">
          Awaiting Principal Review
        </Button>
      );
    }

    return (
      <Button size="sm" disabled className="bg-gray-400 text-white cursor-not-allowed">
        In Progress
      </Button>
    );
  };

  // ──────────────────────────────────────────────────────────
  // TIMELINE STEPS (Updated Flow)
  // ──────────────────────────────────────────────────────────
  const renderTimeline = (student: Student) => {
    const steps = [
      {
        label: "Registration Submitted",
        done: true,
        icon: <CheckCircle className="w-5 h-5 text-green-600" />,
      },
      {
        label: "Payment",
        done: student.paymentReceived,
        active: !student.paymentReceived,
        icon: student.paymentReceived ? (
          <CheckCircle className="w-5 h-5 text-green-600" />
        ) : (
          <Clock className="w-5 h-5 text-yellow-600 animate-pulse" />
        ),
      },
      {
        label: "Principal Review",
        done: student.principalReviewed,
        active: student.paymentReceived && !student.principalReviewed,
        rejected: false,
        icon: student.principalReviewed ? (
          <CheckCircle className="w-5 h-5 text-green-600" />
        ) : student.paymentReceived ? (
          <Clock className="w-5 h-5 text-yellow-600 animate-pulse" />
        ) : (
          <div className="w-5 h-5 rounded-full border border-gray-400"></div>
        ),
      },
      {
        label: "Enrollment Complete",
        done: student.status === "enrolled",
        active: student.principalReviewed && !student.paymentReceived
          ? false
          : student.principalReviewed && student.paymentReceived && student.status !== "enrolled",
        icon: student.status === "enrolled" ? (
          <CheckCircle className="w-5 h-5 text-green-600" />
        ) : student.principalReviewed && student.paymentReceived ? (
          <Clock className="w-5 h-5 text-yellow-600 animate-pulse" />
        ) : (
          <div className="w-5 h-5 rounded-full border border-gray-400"></div>
        ),
      },
    ];

    return (
      <ol className="mt-3 space-y-2 text-sm">
        {steps.map((step, idx) => (
          <li
            key={idx}
            className={`flex items-center gap-2 ${
              step.done
                ? "text-green-700"
                : step.active
                ? "text-yellow-700 font-medium"
                : "text-gray-500"
            }`}
          >
            {step.icon}
            <span>{step.label}</span>
          </li>
        ))}
      </ol>
    );
  };

  // ──────────────────────────────────────────────────────────
  // LOADING STATE
  // ──────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="p-6 text-center">
        <p className="text-gray-600">Loading enrollment status...</p>
      </div>
    );
  }

  // ──────────────────────────────────────────────────────────
  // MAIN RENDER
  // ──────────────────────────────────────────────────────────
  return (
    <div className="p-4 max-w-4xl mx-auto space-y-6">
      {/* ── Navigation ── */}
      <div className="sticky top-0 z-10 bg-white border-b flex justify-between items-center px-2 py-3 mb-4">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-1 text-gray-600 hover:text-black"
        >
          <ArrowLeft size={18} /> Back
        </button>
        <button
          onClick={() => navigate("/parent-dashboard")}
          className="text-gray-600 hover:text-red-600"
        >
          <X size={20} />
        </button>
      </div>

      {/* ── Header ── */}
      <h2 className="text-xl font-bold text-gray-800">
        Enrollment Status
      </h2>

      {/* ── No Students ── */}
      {students.length === 0 ? (
        <Card className="p-6 text-center text-gray-600">
          <p>No students registered yet.</p>
          <Button className="mt-4" asChild>
            <Link to="/register">Register Now</Link>
          </Button>
        </Card>
      ) : (
        <div className="space-y-5">
          {students.map((student) => (
            <Card
              key={student.id}
              className="p-5 border rounded-lg shadow-sm hover:shadow-md transition-shadow"
            >
              {/* Student Header */}
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    {/* Curriculum Badge */}
                    <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-bold text-white bg-gradient-to-r from-indigo-600 to-purple-600 rounded-full">
                      {student.curriculum === "CAPS" ? (
                        <BookOpen size={12} />
                      ) : (
                        <Globe size={12} />
                      )}
                      {student.curriculum}
                    </span>

                    {/* Name & Grade */}
                    <p className="font-semibold text-lg">
                      {student.firstName} {student.lastName}
                      <span className="text-sm font-normal text-gray-600 ml-2">
                        – {student.grade}
                      </span>
                    </p>
                  </div>

                  {/* Status Badge */}
                  <div className="mt-2">{getStatusBadge(student)}</div>
                </div>

                {/* Action Button */}
                <div>{getActionButton(student)}</div>
              </div>

              {/* Subjects */}
              {student.subjects && student.subjects.length > 0 && (
                <div className="mt-3">
                  <p className="text-sm font-medium text-gray-700 mb-1">Selected Subjects:</p>
                  <div className="flex flex-wrap gap-1">
                    {student.subjects.map((sub) => (
                      <span
                        key={sub}
                        className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-indigo-700 bg-indigo-100 rounded-full"
                      >
                        {sub}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Timeline */}
              <div className="mt-4 border-t pt-3">
                {renderTimeline(student)}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}