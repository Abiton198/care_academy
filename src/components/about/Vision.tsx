"use client";

import React from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { 
  Heart, 
  Globe, 
  Compass, 
  ShieldCheck, 
  Star, 
  Anchor, 
  Zap, 
  ArrowRight 
} from "lucide-react";

const Vision: React.FC = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-100 px-6 py-12">
      <div className="max-w-6xl mx-auto space-y-16">

        {/* Hero Banner - Focus on the Future */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-indigo-900 rounded-[3rem] p-10 md:p-16 text-white shadow-2xl relative overflow-hidden text-center"
        >
          <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
            <Globe className="absolute -top-20 -right-20" size={400} />
          </div>
          
          <div className="relative z-10 space-y-6">
            <span className="bg-yellow-400 text-indigo-950 px-5 py-1.5 rounded-full text-sm font-black uppercase tracking-widest">
              The Future of Education
            </span>
            <h2 className="text-4xl md:text-6xl font-black leading-tight">
              Pioneering <span className="text-yellow-300">Hybrid Excellence</span>
            </h2>
            <p className="text-xl text-indigo-100 max-w-3xl mx-auto leading-relaxed">
               • British Curriculum • Opening <strong>26 January 2026</strong>. 
              One school, two ways to learn—giving your family the peace and mobility you deserve.
            </p>
            <div className="pt-6">
              <Link
                to="/login"
                className="inline-flex items-center gap-3 bg-white text-indigo-900 font-black px-12 py-5 rounded-2xl hover:bg-yellow-300 transition shadow-xl transform hover:scale-105"
              >
                Join the 2026 Intake <Zap size={20} className="fill-indigo-900" />
              </Link>
            </div>
          </div>
        </motion.div>

        {/* Vision Statement Section */}
        <div className="grid md:grid-cols-2 gap-12 items-center">
          <div className="space-y-8">
            <h1 className="text-4xl md:text-5xl font-black text-gray-900 leading-tight">
              Our Vision: <br />
              <span className="text-indigo-600 underline decoration-indigo-200 underline-offset-8">Nurturing Character,</span> <br /> 
              Inspiring Success.
            </h1>
            <p className="text-lg text-gray-600 leading-relaxed">
              At <strong>Care Academy</strong>, we believe education should adapt to life, 
              not the other way around. Our vision is to provide a <strong>Christian-based, 
              nurturing environment</strong> where students are empowered to excel academically 
              while enjoying the flexibility to learn from our physical campus or virtually 
              anywhere in the world.
            </p>
            <div className="flex items-center gap-4 p-6 bg-white rounded-3xl shadow-lg border-l-8 border-indigo-600">
              <Anchor size={40} className="text-indigo-600 flex-shrink-0" />
              <p className="text-gray-700 font-medium">
                Our mission is to build <strong>resilient, global citizens</strong> who carry 
                strong values and world-class qualifications (British Curriculum) into their futures.
              </p>
            </div>
          </div>
          
          {/* Visual Philosophy Card */}
          <div className="bg-gradient-to-br from-indigo-600 to-purple-700 rounded-[3rem] p-10 text-white shadow-2xl relative">
            <h3 className="text-2xl font-bold mb-8 italic">"We envision a world where every child receives the highest quality education without the stress of rigid schedules or locations."</h3>
            
            <div className="space-y-6">
              <div className="flex items-start gap-4">
                <div className="bg-white/20 p-2 rounded-lg"><Star size={20} className="text-yellow-300" /></div>
                <div>
                  <h4 className="font-bold">Spiritual Growth</h4>
                  <p className="text-sm text-indigo-100">Nurturing character through faith-based mentorship.</p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="bg-white/20 p-2 rounded-lg"><Compass size={20} className="text-emerald-300" /></div>
                <div>
                  <h4 className="font-bold">Total Mobility</h4>
                  <p className="text-sm text-indigo-100">Supporting families through work relocations or travel.</p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="bg-white/20 p-2 rounded-lg"><ShieldCheck size={20} className="text-blue-300" /></div>
                <div>
                  <h4 className="font-bold">Academic Continuity</h4>
                  <p className="text-sm text-indigo-100">The same teachers and curriculum, regardless of your mode of learning.</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Values Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <motion.div whileHover={{ y: -10 }} className="p-8 bg-white rounded-3xl shadow-xl border-b-8 border-indigo-500 text-center">
            <div className="mx-auto w-16 h-16 bg-indigo-50 flex items-center justify-center rounded-2xl text-indigo-600 mb-6">
              <Heart size={32} />
            </div>
            <h3 className="text-xl font-bold text-gray-800 mb-2">Christian Heart</h3>
            <p className="text-gray-600 text-sm">Focused on nurturing the soul and building character as much as we build grades.</p>
          </motion.div>

          <motion.div whileHover={{ y: -10 }} className="p-8 bg-white rounded-3xl shadow-xl border-b-8 border-purple-500 text-center">
            <div className="mx-auto w-16 h-16 bg-purple-50 flex items-center justify-center rounded-2xl text-purple-600 mb-6">
              <RotateCw size={32} />
            </div>
            <h3 className="text-xl font-bold text-gray-800 mb-2">Flexibility</h3>
            <p className="text-gray-600 text-sm">Switch between Virtual and Campus every term to suit your work-life commitments.</p>
          </motion.div>

          <motion.div whileHover={{ y: -10 }} className="p-8 bg-white rounded-3xl shadow-xl border-b-8 border-emerald-500 text-center">
            <div className="mx-auto w-16 h-16 bg-emerald-50 flex items-center justify-center rounded-2xl text-emerald-600 mb-6">
              <Award size={32} />
            </div>
            <h3 className="text-xl font-bold text-gray-800 mb-2">Excellence</h3>
            <p className="text-gray-600 text-sm">World-recognized British Curriculum pathways for students in Grade 1 through 12.</p>
          </motion.div>
        </div>

        {/* The Hybrid Vision Logic Diagram Callout */}
        

        {/* Trust Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-10">
          <div className="text-center p-8 bg-white rounded-[2rem] shadow-lg border border-gray-100">
            <p className="text-4xl font-black text-indigo-600 tracking-tighter">100%</p>
            <p className="text-xs text-gray-500 uppercase font-bold mt-2">Hybrid Continuity</p>
          </div>
          <div className="text-center p-8 bg-white rounded-[2rem] shadow-lg border border-gray-100">
            <p className="text-4xl font-black text-purple-600 tracking-tighter">R1,200</p>
            <p className="text-xs text-gray-500 uppercase font-bold mt-2">Affordable Monthly Tuition</p>
          </div>
          <div className="text-center p-8 bg-white rounded-[2rem] shadow-lg border border-gray-100">
            <p className="text-4xl font-black text-emerald-600 tracking-tighter">British Curriculum Primary, Lower Secondary, IGCSE and AS/A Levels</p>
            <p className="text-xs text-gray-500 uppercase font-bold mt-2">Comprehensive Pathways</p>
          </div>
        </div>

        {/* Final CTA */}
        <div className="text-center py-12">
          <p className="text-2xl font-black text-indigo-900">
            Register anytime. Switch terms. Grow together.
          </p>
          <Link
            to="/login"
            className="inline-flex items-center gap-3 mt-8 bg-indigo-600 text-white font-black text-xl px-12 py-6 rounded-2xl shadow-2xl hover:bg-emerald-600 transition-all duration-300 transform hover:scale-105"
          >
            Start the Journey Now <ArrowRight />
          </Link>
          <p className="mt-6 text-gray-400 text-sm">
            Registrations are always open. Secure your spot with a registration fee.
          </p>
        </div>

        {/* Navigation */}
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

// Helper Icon for Rotation
const RotateCw = ({ size, className }: { size: number; className?: string }) => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    width={size} 
    height={size} 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="2" 
    strokeLinecap="round" 
    strokeLinejoin="round" 
    className={className}
  >
    <path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8"/>
    <path d="M21 3v5h-5"/>
  </svg>
);

const Award = ({ size, className }: { size: number; className?: string }) => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    width={size} 
    height={size} 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="2" 
    strokeLinecap="round" 
    strokeLinejoin="round" 
    className={className}
  >
    <path d="m15.477 12.89 1.515 8.526a.5.5 0 0 1-.81.47l-3.58-2.687a1 1 0 0 0-1.197 0l-3.586 2.686a.5.5 0 0 1-.81-.469l1.514-8.526"/>
    <circle cx="12" cy="8" r="6"/>
  </svg>
);

export default Vision;