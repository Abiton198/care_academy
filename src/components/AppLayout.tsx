"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AuthProvider, useAuth } from "./auth/AuthProvider";
import LoginForm from "./auth/LoginForm";
import ParentDashboard from "./dashboards/parent/ParentDashboard";
import TeacherDashboard from "./dashboards/TeacherDashboard";
import PrincipalDashboard from "./dashboards/PrincipalDashboard";
import AdminDashboard from "./dashboards/AdminDashboard";

// Logos
import logo from "../img/logo.png";
import dbeLogo from "../img/dbe.png";
import cambridgeLogo from "../img/cambridge.png";
import ZoomableImage from "@/lib/ZoomableImage";

const AppContent: React.FC = () => {
  const { user, loading } = useAuth();
  const [showLoginModal, setShowLoginModal] = useState(false);

  /* -------------------- LOADING -------------------- */
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-700 via-purple-700 to-indigo-900 text-white">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4" />
          <p>Loading School Portal...</p>
        </div>
      </div>
    );
  }

  /* -------------------- LANDING PAGE -------------------- */
  if (!user) {
    return (
      <div className="relative min-h-screen bg-gradient-to-br from-blue-700 via-purple-700 to-indigo-900 overflow-hidden">

        {/* Background Image */}
        <div
          className="absolute inset-0 bg-cover bg-center opacity-35"
          style={{
            backgroundImage:
              "url(https://images.unsplash.com/photo-1523050854058-8df90110c9f1)",
          }}
        />
        <div className="absolute inset-0 bg-black/50" />

        {/* Top Logos */}
        <div className="absolute top-4 left-0 right-0 flex justify-between items-center px-6 z-20">
          <ZoomableImage src={logo} alt="School Logo" className="h-14 w-auto" />

          <div className="absolute left-1/2 -translate-x-1/2">
            <ZoomableImage
              src={cambridgeLogo}
              alt="Cambridge International"
              className="h-16 w-auto"
            />
          </div>

          <ZoomableImage src={dbeLogo} alt="DBE" className="h-14 w-auto" />
        </div>

        {/* Main Content */}
        <div className="relative z-10 flex flex-col items-center justify-center min-h-screen text-center px-6 text-white pt-24">
          <h1 className="text-4xl md:text-6xl font-bold mb-6 leading-tight">
            Cambridge Hybrid Learning
            <span className="block text-yellow-300">
              Grade 1 – Grade 12
            </span>
          </h1>

          <p className="text-lg md:text-xl max-w-3xl mb-10 text-blue-100">
            A <strong>Christian-based hybrid school</strong> offering
            Cambridge International education through a balanced model of
            <strong> online learning, guided instruction, and academic support</strong>.
            Our highly experienced educators nurture character, excellence,
            and lifelong learning.
          </p>

          {/* Login Button */}
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setShowLoginModal(true)}
            className="bg-white text-blue-700 font-semibold py-3 px-8 rounded-full shadow-lg hover:bg-yellow-300 transition"
          >
            Access School Portal
          </motion.button>

          {/* Key Highlights */}
          <div className="mt-10 max-w-2xl text-sm md:text-base text-blue-100">
            <ul className="space-y-2">
              <li>✔ Cambridge-aligned curriculum (Primary to A Levels)</li>
              <li>✔ Christian values and safe learning environment</li>
              <li>✔ Highly experienced, subject-specialist teachers</li>
              <li>✔ Continuous progress tracking and academic mentoring</li>
              <li>✔ Flexible hybrid learning for modern families</li>
            </ul>
          </div>

          {/* CTA */}
          <motion.div
            className="mt-12"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <motion.a
              href="/login"
              whileHover={{ scale: 1.08 }}
              className="inline-block bg-gradient-to-r from-red-600 to-orange-500 px-8 py-4 rounded-lg font-bold text-white shadow-xl"
            >
              Enrolments Open – 2026 →
            </motion.a>
          </motion.div>
        </div>

        {/* Login Modal */}
        <AnimatePresence>
          {showLoginModal && (
            <motion.div
              className="fixed inset-0 bg-black/60 flex items-center justify-center z-50"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <motion.div
                initial={{ scale: 0.9 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0.9 }}
                className="bg-white rounded-2xl shadow-2xl p-6 w-[95%] max-w-md relative"
              >
                <button
                  onClick={() => setShowLoginModal(false)}
                  className="absolute top-3 right-3 text-gray-500 text-xl"
                >
                  ✕
                </button>

                <h2 className="text-2xl font-semibold text-center mb-4 text-blue-700">
                  School Portal Login
                </h2>

                <LoginForm />
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  /* -------------------- DASHBOARDS -------------------- */
  switch (user.role) {
    case "parent":
      return <ParentDashboard />;
    case "teacher":
      return <TeacherDashboard />;
    case "principal":
      return <PrincipalDashboard />;
    case "admin":
      return <AdminDashboard />;
    default:
      return <LoginForm />;
  }
};

/* -------------------- APP LAYOUT -------------------- */
const AppLayout: React.FC = () => {
  return (
    <AuthProvider>
      <div className="min-h-screen flex flex-col">
        <AppContent />

        <footer className="bg-gray-100 text-center py-4 text-sm text-gray-500">
          © {new Date().getFullYear()} Cambridge Hybrid Christian School
        </footer>
      </div>
    </AuthProvider>
  );
};

export default AppLayout;
