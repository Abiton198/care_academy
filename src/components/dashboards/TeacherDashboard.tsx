// app/teacher/TeacherDashboard.tsx or pages/TeacherDashboard.tsx
"use client";

import React, { useEffect, useState } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { db, auth } from "@/lib/firebaseConfig";
import {
  collection,
  onSnapshot,
  query,
  where,
} from "firebase/firestore";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";

// Import the standalone form
import TeacherApplicationForm from "../auth/TeacherApplicationForm";

interface TeacherProfile {
  firstName?: string;
  lastName?: string;
  applicationStatus?: "not_submitted" | "pending" | "approved";
}

const TeacherDashboard: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [profile, setProfile] = useState<TeacherProfile | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [showApplicationForm, setShowApplicationForm] = useState(false);
  const [applicationId, setApplicationId] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      setLoadingProfile(false);
      return;
    }

    const q = query(
      collection(db, "teacherApplications"),
      where("uid", "==", user.uid)
    );

    const unsub = onSnapshot(q, (snap) => {
      if (snap.empty) {
        setProfile({ applicationStatus: "not_submitted" });
        setApplicationId(null);
      } else {
        const docSnap = snap.docs[0];
        const data = docSnap.data();

        setApplicationId(docSnap.id);
        setProfile({
          firstName: data.personalInfo?.firstName,
          lastName: data.personalInfo?.lastName,
          applicationStatus: data.status || "pending",
        });
      }
      setLoadingProfile(false);
    });

    return () => unsub();
  }, [user]);

  const handleLogout = async () => {
    await logout();
    navigate("/");
  };

  const handleFormSubmitted = () => {
    setShowApplicationForm(false);
    // Optional: refresh profile
  };

  // Guards
  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-lg">Please sign in to continue.</p>
      </div>
    );
  }

  if (loadingProfile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="w-10 h-10 animate-spin text-indigo-600" />
      </div>
    );
  }

  // Not submitted or pending → show form inline as modal
  if (profile?.applicationStatus !== "approved") {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        {/* Status Card */}
        <div className="flex-1 flex items-center justify-center p-4">
          <Card className="max-w-md w-full text-center p-8">
            <CardTitle className="text-2xl text-indigo-700 mb-4">
              {profile?.applicationStatus === "not_submitted"
                ? "Complete Your Application"
                : "Application Under Review"}
            </CardTitle>
            <p className="text-gray-600 mb-6">
              {profile?.applicationStatus === "not_submitted"
                ? "Please fill out the form to apply as a teacher."
                : "Thank you for applying. We are reviewing your application."}
            </p>
            <p className="text-sm font-medium text-amber-600 mb-8">
              Status: {profile?.applicationStatus || "not_submitted"}
            </p>

            <div className="flex flex-col sm:flex-row gap-4">
              <Button
                onClick={() => setShowApplicationForm(true)}
                className="flex-1"
              >
                {profile?.applicationStatus === "not_submitted"
                  ? "Start Application"
                  : "Edit Application"}
              </Button>
              <Button variant="outline" onClick={handleLogout}>
                Logout
              </Button>
            </div>
          </Card>
        </div>

        {/* Inline Modal Form */}
        {showApplicationForm && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 overflow-y-auto">
            <div className="w-full max-w-5xl">
              <TeacherApplicationForm
                applicationId={applicationId}
                onClose={() => setShowApplicationForm(false)}
                onSubmitted={handleFormSubmitted}
              />
            </div>
          </div>
        )}
      </div>
    );
  }

  // Approved Dashboard
  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle className="text-3xl text-indigo-700">
              Welcome back, {profile.firstName} {profile.lastName}!
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <p className="text-lg text-gray-700">
              Your teacher account has been approved. You now have full access to the platform.
            </p>

            {/* Placeholder for future dashboard features */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8">
              <Card className="p-4 text-center">
                <h3 className="font-semibold">Classes</h3>
                <p className="text-3xl font-bold text-indigo-600 mt-2">0</p>
              </Card>
              <Card className="p-4 text-center">
                <h3 className="font-semibold">Students</h3>
                <p className="text-3xl font-bold text-indigo-600 mt-2">0</p>
              </Card>
              <Card className="p-4 text-center">
                <h3 className="font-semibold">Resources</h3>
                <p className="text-3xl font-bold text-indigo-600 mt-2">12</p>
              </Card>
            </div>

            <Button onClick={handleLogout} className="mt-8 bg-red-600 hover:bg-red-700">
              Logout
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default TeacherDashboard;