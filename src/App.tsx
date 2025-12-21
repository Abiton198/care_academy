"use client";

import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import { ThemeProvider } from "./components/theme-provider";
import { TooltipProvider } from "./components/ui/tooltip";
import { Toaster } from "./components/ui/toaster";
import { Toaster as Sonner } from "./components/ui/sonner";

import { AuthProvider } from "@/components/auth/AuthProvider";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";

// Auth Pages
import LoginForm from "@/components/auth/LoginForm";
import AdminLoginForm from "@/components/auth/AdminLoginForm";
import SuspendedScreen from "@/components/auth/SuspendedScreen";
import TeacherApplicationForm from "@/components/auth/TeacherApplicationForm";

// Dashboards
import AdminDashboard from "@/components/dashboards/AdminDashboard";
import TeacherDashboard from "@/components/dashboards/TeacherDashboard";
import StudentDashboard from "@/components/dashboards/StudentDashboard";
import ParentDashboard from "@/components/dashboards/parent/ParentDashboard";
import PrincipalDashboard from "@/components/dashboards/PrincipalDashboard";

// Parent Sections
import PaymentsSection from "@/components/dashboards/parent/sections/PaymentSection";
import StatusSection from "@/components/dashboards/parent/sections/StatusSection";
import ParentDashboardLayout from "./components/ParentDashboardLayout";

// Public Pages
import AboutUs from "@/components/AboutUs";
import NotFound from "@/pages/NotFound";
import AppLayout from "@/components/AppLayout";

// Marketing Pages
import WhyChoose from "./components/about/WhyChoose";
import LearningPlatform from "./components/about/LearningPlatform";
import SubjectsOffered from "./components/about/SubjectsOffered";
import Enrolment from "./components/about/Enrolment";
import Vision from "./components/about/Vision";
import FeesStructure from "./components/about/FeesStructure";
import TeachingStaff from "./components/about/TeachingStaff";
import Accreditation from "./components/about/Accreditation";

const queryClient = new QueryClient();

const App: React.FC = () => {
  return (
    <ThemeProvider defaultTheme="light">
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Toaster />
          <Sonner />

          <AuthProvider>
            <BrowserRouter>
              <Routes>
                {/* Default Home/Landing Page */}
                <Route path="/" element={<AppLayout />} />

                {/* Public Pages */}
                <Route path="/about" element={<AboutUs />} />

                {/* About Detail Pages */}
                <Route path="/about/why-choose" element={<WhyChoose />} />
                <Route path="/about/learning-platform" element={<LearningPlatform />} />
                <Route path="/about/subjects" element={<SubjectsOffered />} />
                <Route path="/about/enrolment" element={<Enrolment />} />
                <Route path="/about/vision" element={<Vision />} />
                <Route path="/about/fees" element={<FeesStructure />} />
                <Route path="/about/teaching-staff" element={<TeachingStaff />} />
                <Route path="/about/accreditation" element={<Accreditation />} />

                {/* Parent Dashboard Layout */}
                <Route path="/parent" element={<ParentDashboardLayout />}>
                  <Route path="payments" element={<PaymentsSection />} />
                  <Route path="status" element={<StatusSection />} />
                </Route>

                {/* Authentication Pages */}
                <Route path="/login" element={<LoginForm />} />
                <Route path="/admin-login" element={<AdminLoginForm />} />
                <Route path="/suspended" element={<SuspendedScreen />} />
                <Route path="/teacher-application" element={<TeacherApplicationForm />} />

                {/* Protected Dashboards */}
                <Route
                  path="/admin-dashboard"
                  element={
                    <ProtectedRoute allowedRoles={["admin"]}>
                      <AdminDashboard />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/teacher-dashboard"
                  element={
                    <ProtectedRoute allowedRoles={["teacher"]}>
                      <TeacherDashboard />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/parent-dashboard"
                  element={
                    <ProtectedRoute allowedRoles={["parent"]}>
                      <ParentDashboard />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/principal-dashboard"
                  element={
                    <ProtectedRoute allowedRoles={["principal"]}>
                      <PrincipalDashboard />
                    </ProtectedRoute>
                  }
                />

                {/* Student Dashboard — PUBLIC via Parent Portal */}
                <Route
                  path="/student-dashboard/:studentId"
                  element={<StudentDashboard />}
                />

                {/* Redirect /student-dashboard (no ID) */}
                <Route
                  path="/student-dashboard"
                  element={<Navigate to="/" replace />}
                />

                {/* Redirect /home */}
                <Route path="/home" element={<Navigate to="/" replace />} />

                {/* 404 */}
                <Route path="*" element={<NotFound />} />
              </Routes>
            </BrowserRouter>
          </AuthProvider>
        </TooltipProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
};

export default App;