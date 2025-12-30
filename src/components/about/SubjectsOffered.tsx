"use client";

import React from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { 
  BookOpen, 
  Atom, 
  Palette, 
  TrendingUp, 
  Globe, 
  Heart, 
  Award,
  Zap,
  CheckCircle
} from "lucide-react";

const SubjectsOffered: React.FC = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-blue-100 px-6 py-12">
      <div className="max-w-6xl mx-auto space-y-16">
        
        {/* Hero Banner - Academic Excellence */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-indigo-900 rounded-[2.5rem] p-8 md:p-12 text-white shadow-2xl relative overflow-hidden text-center"
        >
          <div className="relative z-10 space-y-4">
            <span className="bg-emerald-500 text-white px-4 py-1 rounded-full text-xs font-black uppercase tracking-widest">
              Academic Excellence 2026
            </span>
            <h2 className="text-3xl md:text-5xl font-black leading-tight">
              Grade 1 to 12 <br /> <span className="text-yellow-300">Dual-Curriculum Pathways</span>
            </h2>
            <p className="text-lg text-indigo-100 max-w-3xl mx-auto">
              Choose between <strong>Cambridge International</strong> or <strong>CAPS</strong>. 
              Nurtured in a Christian environment, delivered via our world-class hybrid platform.
            </p>
            <div className="pt-4">
              <Link
                to="/login"
                className="inline-block bg-white text-indigo-900 font-black px-10 py-4 rounded-2xl hover:bg-yellow-300 transition shadow-xl transform hover:scale-105"
              >
                Register Online Today
              </Link>
            </div>
          </div>
        </motion.div>

        {/* Introduction */}
        <div className="text-center space-y-4">
          <h1 className="text-4xl md:text-6xl font-black text-gray-900">Our Subjects & Streams</h1>
          <p className="text-lg text-gray-600 max-w-3xl mx-auto">
            From foundational literacy in Primary school to specialized university-entrance subjects 
            in High School, we provide a <strong>goal-oriented path</strong> for every learner.
          </p>
        </div>

        {/* Primary Phase (Grade 1 - 7) */}
        <div className="bg-white rounded-[3rem] p-8 md:p-12 shadow-xl border border-emerald-100">
          <div className="flex flex-col md:flex-row gap-10 items-center">
            <div className="flex-1 space-y-6">
              <div className="inline-flex items-center gap-2 bg-emerald-100 text-emerald-700 px-4 py-1 rounded-full font-bold text-sm">
                <Heart size={16} /> Foundation Phase & Primary
              </div>
              <h2 className="text-3xl font-bold text-gray-800">Building Nurtured Foundations</h2>
              <p className="text-gray-600">
                Our Primary curriculum focuses on the "Whole Child." We blend academic rigor 
                with Christian values to ensure children are confident and curious learners.
              </p>
              <div className="grid grid-cols-2 gap-4">
                {["English Literacy", "Numeracy / Maths", "Natural Sciences", "Social Sciences", "Life Skills", "Bible Education"].map((sub, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm font-medium text-gray-700">
                    <CheckCircle size={14} className="text-emerald-500" /> {sub}
                  </div>
                ))}
              </div>
            </div>
            <div className="w-full md:w-1/3 bg-emerald-50 p-6 rounded-3xl border-2 border-dashed border-emerald-200 text-center">
              <BookOpen size={48} className="mx-auto text-emerald-600 mb-4" />
              <h4 className="font-bold text-emerald-900">Grade 1 – 7</h4>
              <p className="text-xs text-emerald-700 mt-2 italic">Available in both CAPS and Cambridge Primary frameworks.</p>
            </div>
          </div>
        </div>

        {/* High School Streams (Grade 8 - 12) */}
        <div className="space-y-12">
          <div className="text-center">
            <h2 className="text-3xl font-bold text-gray-900 italic">Specialized High School Streams</h2>
            <p className="text-gray-500 mt-2">Preparing students for NMU, UCT, Wits, and Global Universities.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Science Stream */}
            <motion.div whileHover={{ y: -10 }} className="p-8 bg-white rounded-3xl shadow-xl border-t-8 border-blue-500">
              <Atom size={40} className="text-blue-500 mb-6" />
              <h3 className="text-2xl font-bold text-gray-800 mb-4">Science & Tech</h3>
              <ul className="space-y-3 text-sm text-gray-600">
                <li className="font-bold text-blue-900">• Mathematics (Core)</li>
                <li className="font-bold text-blue-900">• Physical Sciences</li>
                <li className="font-bold text-blue-900">• Life Sciences (Biology)</li>
                <li>• Computer Science (Cambridge)</li>
                <li>• Information Technology (CAPS)</li>
                <li>• Geography</li>
              </ul>
              <div className="mt-6 pt-4 border-t border-gray-100 text-[10px] uppercase font-bold tracking-widest text-gray-400">
                Path: Medicine, Engineering, Tech
              </div>
            </motion.div>

            {/* Arts Stream */}
            <motion.div whileHover={{ y: -10 }} className="p-8 bg-white rounded-3xl shadow-xl border-t-8 border-pink-500">
              <Palette size={40} className="text-pink-500 mb-6" />
              <h3 className="text-2xl font-bold text-gray-800 mb-4">Humanities & Arts</h3>
              <ul className="space-y-3 text-sm text-gray-600">
                <li className="font-bold text-pink-900">• English Home Language</li>
                <li className="font-bold text-pink-900">• Afrikaans FAL</li>
                <li className="font-bold text-pink-900">• History</li>
                <li>• Mathematical Literacy (CAPS)</li>
                <li>• Dramatic Arts</li>
                <li>• Sociology / Global Perspectives</li>
              </ul>
              <div className="mt-6 pt-4 border-t border-gray-100 text-[10px] uppercase font-bold tracking-widest text-gray-400">
                Path: Law, Media, Politics, Education
              </div>
            </motion.div>

            {/* Commercial Stream */}
            <motion.div whileHover={{ y: -10 }} className="p-8 bg-white rounded-3xl shadow-xl border-t-8 border-yellow-500">
              <TrendingUp size={40} className="text-yellow-600 mb-6" />
              <h3 className="text-2xl font-bold text-gray-800 mb-4">Commerce & Biz</h3>
              <ul className="space-y-3 text-sm text-gray-600">
                <li className="font-bold text-yellow-800">• Accounting</li>
                <li className="font-bold text-yellow-800">• Business Studies</li>
                <li className="font-bold text-yellow-800">• Economics</li>
                <li>• EMS (Grade 8-9)</li>
                <li>• Travel & Tourism</li>
                <li>• Entrepreneurship</li>
              </ul>
              <div className="mt-6 pt-4 border-t border-gray-100 text-[10px] uppercase font-bold tracking-widest text-gray-400">
                Path: CA, Marketing, Finance, CEO
              </div>
            </motion.div>
          </div>
        </div>

        {/* Mobility & Hybrid Note */}
        <div className="bg-gradient-to-r from-indigo-600 to-purple-700 rounded-[3rem] p-10 text-white flex flex-col md:flex-row items-center gap-8 shadow-2xl">
          <div className="bg-white/20 p-6 rounded-full">
            <Globe size={60} className="text-yellow-300 animate-pulse" />
          </div>
          <div className="space-y-3">
            <h3 className="text-2xl font-bold">Hybrid Flexibility for All Subjects</h3>
            <p className="text-indigo-100 leading-relaxed max-w-2xl">
              Every subject listed above is fully integrated into our <strong>Modern LMS</strong>. 
              Students can choose to attend these classes on our physical campus or through 
              interactive virtual lessons—allowing for <strong>total family mobility</strong> and 
              work-life peace.
            </p>
          </div>
        </div>

        {/* Final CTA */}
        <div className="text-center py-10 space-y-8">
          <div className="space-y-2">
            <h2 className="text-3xl font-black text-gray-900">Start Your 2026 Journey</h2>
            <p className="text-gray-500">Registrations are always open. School starts 22 Jan 2026.</p>
          </div>
          
          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <Link
              to="/login"
              className="bg-indigo-600 text-white font-black text-xl px-12 py-5 rounded-2xl shadow-xl hover:bg-indigo-700 transition-all transform hover:scale-105"
            >
              Enrol Now <Award className="inline ml-2" />
            </Link>
          </div>
          
          <div className="flex items-center justify-center gap-8 pt-4">
            <div className="text-center">
              <p className="text-xl font-bold text-indigo-600 underline">Cambridge</p>
              <p className="text-[10px] uppercase tracking-tighter text-gray-400">International Std</p>
            </div>
            <div className="h-8 w-px bg-gray-200"></div>
            <div className="text-center">
              <p className="text-xl font-bold text-emerald-600 underline">CAPS</p>
              <p className="text-[10px] uppercase tracking-tighter text-gray-400">National Std</p>
            </div>
          </div>
        </div>

        {/* Back Navigation */}
        <div className="text-center">
          <Link
            to="/about"
            className="text-gray-400 font-bold hover:text-indigo-600 transition underline decoration-2 underline-offset-4"
          >
            ← Back to About Us
          </Link>
        </div>
      </div>
    </div>
  );
};

export default SubjectsOffered;