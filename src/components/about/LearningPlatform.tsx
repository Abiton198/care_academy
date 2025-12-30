"use client";

import React from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { 
  Globe, 
  MapPin, 
  MessageSquare, 
  LayoutDashboard, 
  Heart, 
  Zap, 
  MousePointerClick,
  ShieldCheck,
  RefreshCcw
} from "lucide-react";

const LearningPlatform: React.FC = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 px-6 py-12">
      <div className="max-w-6xl mx-auto space-y-16">
        
        {/* Hero Section */}
        <div className="text-center space-y-6">
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="inline-flex items-center gap-2 bg-purple-100 text-purple-700 px-5 py-2 rounded-full text-sm font-bold tracking-wide"
          >
            <Zap size={16} className="fill-purple-700" />
            Modern Hybrid Learning for 2026
          </motion.div>
          <h1 className="text-5xl md:text-7xl font-black text-transparent bg-clip-text bg-gradient-to-r from-indigo-900 to-purple-700 leading-tight">
            One Academy. <br className="hidden md:block" /> 
            Two Ways to Learn.
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
            Care Academy Grade 1 – 12: A nurturing <strong>Christian environment</strong> offering 
            both <strong>Cambridge and CAPS</strong> pathways through a seamless digital ecosystem.
          </p>
        </div>

        {/* The Hybrid Freedom Section */}
        <div className="bg-white rounded-[3rem] shadow-2xl p-8 md:p-12 border border-purple-50 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-8 opacity-5">
            <Globe size={200} />
          </div>
          
          <div className="relative z-10 grid md:grid-cols-2 gap-12 items-center">
            <div className="space-y-6">
              <h2 className="text-3xl font-bold text-gray-900">Education without Borders</h2>
              <p className="text-gray-600 leading-relaxed">
                Whether you are traveling, relocating, or simply prefer the comfort of home, 
                our platform ensures <strong>academic continuity</strong>. Students have the 
                unique opportunity to choose their mode of learning <strong>every term</strong>.
              </p>
              
              <div className="space-y-4">
                <div className="flex items-center gap-4 p-4 bg-indigo-50 rounded-2xl border border-indigo-100">
                  <div className="bg-indigo-600 text-white p-2 rounded-lg"><MapPin size={24}/></div>
                  <div>
                    <h4 className="font-bold text-indigo-900">Physical Campus</h4>
                    <p className="text-xs text-indigo-700">In-person mentorship & social interaction</p>
                  </div>
                </div>
                <div className="flex items-center gap-4 p-4 bg-purple-50 rounded-2xl border border-purple-100">
                  <div className="bg-purple-600 text-white p-2 rounded-lg"><Globe size={24}/></div>
                  <div>
                    <h4 className="font-bold text-purple-900">Virtual Classroom</h4>
                    <p className="text-xs text-purple-700">Learn from anywhere in the world</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-indigo-600 to-purple-700 rounded-[2rem] p-8 text-white space-y-6 shadow-xl">
              <div className="flex items-center gap-2 text-yellow-300 font-bold uppercase tracking-widest text-xs">
                <RefreshCcw size={16} /> Termly Flexibility
              </div>
              <h3 className="text-2xl font-bold italic text-white leading-snug">
                "Relocating mid-year? No problem. Simply switch to Virtual and keep your teachers, 
                your curriculum, and your friends."
              </h3>
              <div className="flex items-center gap-3 pt-4 border-t border-white/20">
                <div className="h-10 w-10 rounded-full bg-white/20 flex items-center justify-center">
                  <Heart className="fill-white" size={20} />
                </div>
                <p className="text-sm font-medium">Nurturing Excellence in a Christian Environment</p>
              </div>
            </div>
          </div>
        </div>

        {/* The Digital Core (LMS) */}
        <div className="space-y-10">
          <div className="text-center">
            <h2 className="text-3xl font-bold text-gray-900">Powerful, Simple, Integrated</h2>
            <p className="text-gray-500">Everything you need in one seamless portal.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Dashboard Card 1 */}
            <motion.div whileHover={{ y: -10 }} className="bg-white p-8 rounded-[2rem] shadow-xl border-t-4 border-blue-500">
              <LayoutDashboard size={40} className="text-blue-500 mb-6" />
              <h3 className="text-xl font-bold text-gray-800 mb-3">Seamless Portal</h3>
              <p className="text-sm text-gray-600 leading-relaxed mb-4">
                A modern LMS designed for ease of use. No complicated menus—just one-click 
                access to live lessons, recorded archives, and study resources.
              </p>
              <ul className="text-xs space-y-2 text-gray-500 font-medium">
                <li className="flex items-center gap-2"><ShieldCheck size={14} className="text-green-500"/> Single Sign-On Access</li>
                <li className="flex items-center gap-2"><ShieldCheck size={14} className="text-green-500"/> Personalized Timetables</li>
              </ul>
            </motion.div>

            {/* Dashboard Card 2 */}
            <motion.div whileHover={{ y: -10 }} className="bg-white p-8 rounded-[2rem] shadow-xl border-t-4 border-purple-500">
              <MessageSquare size={40} className="text-purple-500 mb-6" />
              <h3 className="text-xl font-bold text-gray-800 mb-3">In-App Communication</h3>
              <p className="text-sm text-gray-600 leading-relaxed mb-4">
                Built-in chat connects students directly with subject specialists. Get instant 
                help and stay engaged through our collaborative community forums.
              </p>
              <ul className="text-xs space-y-2 text-gray-500 font-medium">
                <li className="flex items-center gap-2"><ShieldCheck size={14} className="text-green-500"/> Direct Teacher Chat</li>
                <li className="flex items-center gap-2"><ShieldCheck size={14} className="text-green-500"/> Peer Study Groups</li>
              </ul>
            </motion.div>

            {/* Dashboard Card 3 */}
            <motion.div whileHover={{ y: -10 }} className="bg-white p-8 rounded-[2rem] shadow-xl border-t-4 border-orange-500">
              <MousePointerClick size={40} className="text-orange-500 mb-6" />
              <h3 className="text-xl font-bold text-gray-800 mb-3">Smart Dashboards</h3>
              <p className="text-sm text-gray-600 leading-relaxed mb-4">
                Real-time tracking for parents and students. Monitor grades, attendance, 
                and spiritual growth goals through a visually intuitive interface.
              </p>
              <ul className="text-xs space-y-2 text-gray-500 font-medium">
                <li className="flex items-center gap-2"><ShieldCheck size={14} className="text-green-500"/> Real-time Gradebook</li>
                <li className="flex items-center gap-2"><ShieldCheck size={14} className="text-green-500"/> Attendance Insights</li>
              </ul>
            </motion.div>
          </div>
        </div>

        {/* Final Registration CTA */}
        <div className="text-center py-12">
          <div className="bg-indigo-900 rounded-[3rem] p-10 md:p-16 text-white shadow-2xl relative overflow-hidden">
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-purple-500/20 rounded-full -ml-32 -mb-32 blur-3xl"></div>
            
            <h2 className="text-3xl md:text-5xl font-black mb-6 relative z-10">
              Registrations Always Open
            </h2>
            <p className="text-indigo-100 text-lg max-w-2xl mx-auto mb-10 relative z-10">
              Secure your child's place in our 2026 intake. Choose between 
              <strong> Cambridge</strong> or <strong>CAPS</strong> and start your hybrid 
              educational journey on <strong>22 January 2026</strong>.
            </p>
            
            <Link
              to="/login"
              className="inline-flex items-center gap-3 bg-yellow-400 text-indigo-950 font-black text-xl px-12 py-5 rounded-2xl hover:bg-white hover:scale-105 transition-all duration-300 shadow-xl relative z-10"
            >
              Enrol Your Child Today <Zap size={20} className="fill-indigo-950" />
            </Link>
            
            <p className="mt-8 text-indigo-300 text-sm italic relative z-10">
              Easy navigation. Seamless onboarding. Nurturing character.
            </p>
          </div>
        </div>

        {/* Back Link */}
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

export default LearningPlatform;