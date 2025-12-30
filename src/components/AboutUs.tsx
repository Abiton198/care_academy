"use client";

import React from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { 
  ChevronLeft, 
  X, 
  Globe, 
  BookOpen, 
  ShieldCheck, 
  Users, 
  CreditCard, 
  Target, 
  Trophy, 
  MapPin, 
  Zap,
  Heart
} from "lucide-react";

const AboutUs: React.FC = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 px-6 py-12 relative overflow-hidden">
      
      {/* Navigation Controls */}
      <div className="absolute top-6 left-6 z-20">
        <Link
          to="/"
          className="group flex items-center space-x-2 bg-white/80 backdrop-blur-md px-4 py-2 rounded-2xl shadow-sm border border-slate-200 text-slate-600 hover:text-indigo-600 transition"
        >
          <ChevronLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
          <span className="font-bold">Home</span>
        </Link>
      </div>
      <div className="absolute top-6 right-6 z-20">
        <Link
          to="/"
          className="flex items-center justify-center w-10 h-10 bg-white/80 backdrop-blur-md rounded-full shadow-sm border border-slate-200 text-slate-400 hover:text-red-500 transition"
        >
          <X size={24} />
        </Link>
      </div>

      <div className="max-w-6xl mx-auto space-y-16 relative z-10">
        
        {/* Main Heading */}
        <div className="text-center space-y-4">
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-4xl md:text-6xl font-black text-slate-900 tracking-tight"
          >
            Care Academy <span className="text-indigo-600">Hybrid School</span>
          </motion.h1>
          <p className="text-lg text-slate-600 max-w-2xl mx-auto">
            A Christian-based academy for <strong>Grade 1 to 12</strong>. We blend world-class 
            academics with total family mobility through our PE-linked hybrid model.
          </p>
        </div>

        {/* Major Hero Banner: The Hybrid Promise */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-indigo-900 rounded-[3rem] p-8 md:p-12 text-white shadow-2xl relative overflow-hidden"
        >
          <div className="absolute -right-20 -bottom-20 w-80 h-80 bg-indigo-500/20 rounded-full blur-3xl"></div>
          <div className="relative z-10 flex flex-col md:flex-row items-center gap-10">
            <div className="flex-1 space-y-6 text-center md:text-left">
              <span className="bg-yellow-400 text-indigo-950 px-4 py-1 rounded-full text-xs font-black uppercase tracking-widest">
                2026 Academic Year
              </span>
              <h2 className="text-3xl md:text-4xl font-black leading-tight">
                One School. <span className="text-yellow-300">Anywhere.</span>
              </h2>
              <p className="text-indigo-100 text-lg">
                Choose between our <strong>Gqeberha Campus</strong> or our <strong>Interactive Virtual Classroom</strong>. 
                Switch termly to suit your family’s work and travel commitments.
              </p>
              <Link
                to="/login"
                className="inline-flex items-center gap-3 bg-white text-indigo-900 font-black px-8 py-4 rounded-2xl hover:bg-yellow-300 transition shadow-xl transform hover:scale-105"
              >
                Register Online Today <Zap size={20} className="fill-indigo-900" />
              </Link>
            </div>
            <div className="hidden lg:block w-1/3">
              
            </div>
          </div>
        </motion.div>

        {/* Section Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          
          {/* Why Choose Care Academy */}
          <div className="p-8 bg-white rounded-[2.5rem] shadow-xl border border-slate-100 group hover:border-indigo-200 transition">
            <Heart className="text-red-500 mb-6 group-hover:scale-110 transition-transform" size={40} />
            <h2 className="text-2xl font-bold text-slate-800 mb-3">The Care Edge</h2>
            <p className="text-sm text-slate-500 mb-6 leading-relaxed">
              Nurturing Christian values, small class sizes, and a "whole child" approach from Grade 1 through Matric.
            </p>
            <Link to="/about/why-choose" className="text-indigo-600 font-bold flex items-center gap-2 hover:gap-4 transition-all">
              Discover Why <ChevronLeft className="rotate-180" size={16} />
            </Link>
          </div>

          {/* Subjects: Dual Pathway */}
          <div className="p-8 bg-white rounded-[2.5rem] shadow-xl border border-slate-100 group hover:border-indigo-200 transition">
            <BookOpen className="text-indigo-600 mb-6 group-hover:scale-110 transition-transform" size={40} />
            <h2 className="text-2xl font-bold text-slate-800 mb-3">Curriculum</h2>
            <p className="text-sm text-slate-500 mb-6 leading-relaxed">
              Grade 1–12 pathways for both <strong>Cambridge International</strong> and <strong>DBE CAPS</strong>.
            </p>
            <Link to="/about/subjects" className="text-indigo-600 font-bold flex items-center gap-2 hover:gap-4 transition-all">
              View Subjects <ChevronLeft className="rotate-180" size={16} />
            </Link>
          </div>

          {/* Local Examinations Logic */}
          <div className="p-8 bg-white rounded-[2.5rem] shadow-xl border border-slate-100 group hover:border-indigo-200 transition">
            <MapPin className="text-emerald-500 mb-6 group-hover:scale-110 transition-transform" size={40} />
            <h2 className="text-2xl font-bold text-slate-800 mb-3">Examinations</h2>
            <p className="text-sm text-slate-500 mb-6 leading-relaxed">
              Linked to PE independent schools. We guide registration at your <strong>nearest local center</strong> for seamless finals.
            </p>
            <Link to="/about/accreditation" className="text-indigo-600 font-bold flex items-center gap-2 hover:gap-4 transition-all">
              How it works <ChevronLeft className="rotate-180" size={16} />
            </Link>
          </div>

          {/* Teaching Staff */}
          <div className="p-8 bg-white rounded-[2.5rem] shadow-xl border border-slate-100 group hover:border-indigo-200 transition">
            <Users className="text-blue-500 mb-6 group-hover:scale-110 transition-transform" size={40} />
            <h2 className="text-2xl font-bold text-slate-800 mb-3">Our Staff</h2>
            <p className="text-sm text-slate-500 mb-6 leading-relaxed">
              SACE-registered experts and Cambridge-certified mentors with a heart for student growth.
            </p>
            <Link to="/about/teaching-staff" className="text-indigo-600 font-bold flex items-center gap-2 hover:gap-4 transition-all">
              Meet Teachers <ChevronLeft className="rotate-180" size={16} />
            </Link>
          </div>

          {/* Enrollment */}
          <div className="p-8 bg-white rounded-[2.5rem] shadow-xl border border-slate-100 group hover:border-indigo-200 transition">
            <Target className="text-yellow-500 mb-6 group-hover:scale-110 transition-transform" size={40} />
            <h2 className="text-2xl font-bold text-slate-800 mb-3">Enrolment</h2>
            <p className="text-sm text-slate-500 mb-6 leading-relaxed">
              100% online registration. Secure your spot in the Virtual or Physical Campus for Jan 2026.
            </p>
            <Link to="/about/enrolment" className="text-indigo-600 font-bold flex items-center gap-2 hover:gap-4 transition-all">
              Start Enrolment <ChevronLeft className="rotate-180" size={16} />
            </Link>
          </div>

          {/* Fees */}
          <div className="p-8 bg-white rounded-[2.5rem] shadow-xl border border-slate-100 group hover:border-indigo-200 transition">
            <CreditCard className="text-purple-500 mb-6 group-hover:scale-110 transition-transform" size={40} />
            <h2 className="text-2xl font-bold text-slate-800 mb-3">Pricing</h2>
            <p className="text-sm text-slate-500 mb-6 leading-relaxed">
              Affordable private education starting from <strong>R1,000/month</strong>. Flexible plans for every family.
            </p>
            <Link to="/about/fees" className="text-indigo-600 font-bold flex items-center gap-2 hover:gap-4 transition-all">
              View Structure <ChevronLeft className="rotate-180" size={16} />
            </Link>
          </div>
        </div>

        {/* Mobility Diagram Callout */}
        <div className="bg-slate-100 rounded-[3rem] p-10 flex flex-col md:flex-row items-center gap-12 border border-slate-200 shadow-inner">
          <div className="w-full md:w-1/2">
            
          </div>
          <div className="flex-1 space-y-4">
            <h3 className="text-2xl font-black text-slate-800">Designed for Mobile Families</h3>
            <p className="text-slate-600">
              Our <strong>Mobility-First</strong> logic means your child's education is never interrupted by work 
              relocations or travel. Carry your classroom in your pocket and your campus in your heart.
            </p>
          </div>
        </div>

        {/* Vision & Accreditation Recap */}
        <div className="grid md:grid-cols-2 gap-8">
          <Link to="/about/vision" className="p-8 bg-gradient-to-br from-indigo-500 to-indigo-700 rounded-[2.5rem] text-white shadow-lg hover:shadow-2xl transition group">
            <Trophy className="mb-4" size={32} />
            <h3 className="text-xl font-bold">Our Vision</h3>
            <p className="text-sm text-indigo-100 mt-2">To be the #1 Hybrid Academy in Africa, bridging the gap between physical nurture and digital excellence.</p>
          </Link>
          <Link to="/about/learning-platform" className="p-8 bg-gradient-to-br from-slate-800 to-slate-900 rounded-[2.5rem] text-white shadow-lg hover:shadow-2xl transition group">
            <Globe className="mb-4 text-indigo-400" size={32} />
            <h3 className="text-xl font-bold">Hybrid Platform</h3>
            <p className="text-sm text-slate-400 mt-2">Explore the tech that powers our interactive virtual classrooms and student dashboards.</p>
          </Link>
        </div>

        {/* Final Registration Footer */}
        <div className="text-center py-10 space-y-6">
          <p className="text-2xl font-black text-slate-800 italic">
            "Your child's success, <span className="text-indigo-600 underline underline-offset-4">anywhere in the world.</span>"
          </p>
          <Link
            to="/login"
            className="inline-block bg-indigo-600 text-white font-black text-xl px-12 py-5 rounded-2xl shadow-xl hover:bg-emerald-600 transition-all transform hover:scale-105"
          >
            Enrol for 2026 Now
          </Link>
        </div>

      </div>
    </div>
  );
};

export default AboutUs;