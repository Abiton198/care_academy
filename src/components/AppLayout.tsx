"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AuthProvider, useAuth } from "./auth/AuthProvider";
import LoginForm from "./auth/LoginForm";
import ParentDashboard from "./dashboards/parent/ParentDashboard";
import TeacherDashboard from "./dashboards/TeacherDashboard";
import PrincipalDashboard from "./dashboards/PrincipalDashboard";
import AdminDashboard from "./dashboards/AdminDashboard";

// Icons & UI
import { Info, ArrowRight, ExternalLink, Sparkles } from "lucide-react";

// Logos
import logo from "../img/logo.png";
import ZoomableImage from "@/lib/ZoomableImage";

const logos = [
  { src: logo, alt: "School Logo" },
 
];

const AppContent: React.FC = () => {
  const { user, loading } = useAuth();
  const [showLoginModal, setShowLoginModal] = useState(false);

  /* -------------------- LOADING -------------------- */
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-700 via-purple-700 to-indigo-900 text-white">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4" />
          <p className="font-medium tracking-wide">Syncing School Portal...</p>
        </div>
      </div>
    );
  }

  /* -------------------- LANDING PAGE -------------------- */
  if (!user) {
    return (
      <div className="relative min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-indigo-950 overflow-hidden">
        {/* Background Image */}
        <div
          className="absolute inset-0 bg-cover bg-center opacity-30 scale-105"
          style={{
            backgroundImage:
              "url(https://images.unsplash.com/photo-1523050854058-8df90110c9f1)",
          }}
        />
        <div className="absolute inset-0 bg-black/40" />

        {/* Top Logos Section (Uniform & Responsive) */}
        <div className="absolute top-4 left-0 right-0 px-6 z-20">
          <div className="hidden md:flex justify-between items-center max-w-7xl mx-auto">
            {logos.map((item, index) => (
              <div key={index} className="flex justify-center items-center w-40 h-20">
                <ZoomableImage
                  src={item.src}
                  alt={item.alt}
                  className="h-full w-full object-contain cursor-zoom-in transition-transform duration-300 hover:scale-110"
                />
              </div>
            ))}
          </div>

          <div className="md:hidden">
            <div className="flex overflow-x-auto snap-x snap-mandatory no-scrollbar gap-4 items-center">
              {logos.map((item, index) => (
                <div key={index} className="min-w-full flex justify-center items-center snap-center py-2">
                  <div className="w-48 h-24">
                    <ZoomableImage src={item.src} alt={item.alt} className="h-full w-full object-contain" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="relative z-10 flex flex-col items-center justify-center min-h-screen text-center px-6 text-white pt-28">
          
          <motion.div 
            initial={{ opacity: 0, y: -20 }} 
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-md px-4 py-1.5 rounded-full border border-white/20 text-yellow-300 text-sm mb-6"
          >
            <Sparkles size={16} />
            <span className="font-medium tracking-wide">Excellence in Christian Education</span>
          </motion.div>

          <h1 className="text-4xl md:text-7xl font-extrabold mb-6 leading-tight tracking-tight">
            Christian Academy <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-yellow-200 to-yellow-500">
              Reformed Education
            </span>
          </h1>

          <p className="text-lg md:text-xl max-w-3xl mb-10 text-blue-100 leading-relaxed font-light">
            A <strong>premier hybrid academy</strong> offering Cambridge International education. 
            We blend world-class academic support with character-building 
            instruction for ALL phases.
          </p>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 mb-12">
            <motion.button
              whileHover={{ scale: 1.05, boxShadow: "0 0 20px rgba(255,255,255,0.2)" }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setShowLoginModal(true)}
              className="bg-white text-blue-900 font-bold py-4 px-10 rounded-full shadow-xl flex items-center justify-center gap-2"
            >
              Access Academy Portal <ArrowRight size={20} />
            </motion.button>

            <motion.a
              href="/about"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="bg-blue-600/30 backdrop-blur-md border border-white/30 text-white font-bold py-4 px-10 rounded-full flex items-center justify-center gap-2 hover:bg-blue-600/50 transition"
            >
              <Info size={20} /> Explore Our Academy
            </motion.a>
          </div>

          {/* Highlights Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-w-5xl text-left text-blue-50/80 mb-12">
            {[
              "Cambridge-aligned Curriculum",
              "Christian Core Values",
              "Experienced Subject Specialists",
              "Individualized Mentoring",
              "Hybrid Learning Flexibility",
              "Safe Learning Environment"
            ].map((text, i) => (
              <div key={i} className="flex items-center gap-2 bg-white/5 p-3 rounded-lg border border-white/10">
                <div className="h-2 w-2 rounded-full bg-yellow-400" />
                <span className="text-sm font-medium">{text}</span>
              </div>
            ))}
          </div>

          {/* Attractive Secondary Discovery Link */}
          <motion.a
            href="/about"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1 }}
            className="group flex items-center gap-3 text-yellow-300 hover:text-yellow-100 transition-all duration-300 bg-white/5 px-6 py-3 rounded-2xl border border-yellow-500/20"
          >
            <div className="bg-yellow-400 text-blue-900 p-1.5 rounded-full group-hover:rotate-12 transition-transform">
              <ExternalLink size={14} />
            </div>
            <span className="text-sm font-bold uppercase tracking-widest">
              Curious about our teaching model? Discover More
            </span>
          </motion.a>

          {/* Main CTA */}
          <motion.div
            className="mt-16"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
          >
            <motion.a
              href="/enrol"
              whileHover={{ scale: 1.05 }}
              className="inline-block bg-gradient-to-r from-red-600 to-orange-500 px-10 py-5 rounded-2xl font-black text-white shadow-2xl tracking-wide uppercase text-sm"
            >
              Enrolments Open – 2026 Academic Year
            </motion.a>
          </motion.div>
        </div>

        {/* Login Modal */}
        <AnimatePresence>
          {showLoginModal && (
            <motion.div
              className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <motion.div
                initial={{ scale: 0.9, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.9, y: 20 }}
                className="bg-white rounded-3xl shadow-2xl p-8 w-[95%] max-w-md relative overflow-hidden"
              >
                <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-blue-600 to-indigo-600" />
                
                <button
                  onClick={() => setShowLoginModal(false)}
                  className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition"
                >
                  ✕
                </button>

                <div className="text-center mb-6">
                  <h2 className="text-2xl font-bold text-gray-900">Portal Access</h2>
                  <p className="text-sm text-gray-500">Welcome back to Christian Academy</p>
                </div>

                <LoginForm />

                <div className="mt-6 pt-6 border-t text-center">
                  <a href="/about" className="text-xs font-bold text-blue-600 hover:underline flex items-center justify-center gap-1">
                    New here? Learn about our vision <ExternalLink size={12} />
                  </a>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  /* -------------------- DASHBOARDS -------------------- */
  switch (user.role) {
    case "parent": return <ParentDashboard />;
    case "teacher": return <TeacherDashboard />;
    case "principal": return <PrincipalDashboard />;
    case "admin": return <AdminDashboard />;
    default: return <LoginForm />;
  }
};

/* -------------------- APP LAYOUT -------------------- */
const AppLayout: React.FC = () => {
  return (
    <AuthProvider>
      <div className="min-h-screen flex flex-col font-sans antialiased">
        <AppContent />
        <footer className="bg-gray-950 text-white/40 text-center py-6 text-[10px] tracking-widest uppercase border-t border-white/5">
          © {new Date().getFullYear()} Cambridge Hybrid Christian Academy • Excellence Reformed
        </footer>
      </div>
    </AuthProvider>
  );
};

export default AppLayout;