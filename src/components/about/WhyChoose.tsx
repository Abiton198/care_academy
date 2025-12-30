"use client";

import React from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { 
  Heart, 
  Globe, 
  RotateCw, 
  ShieldCheck, 
  UserCheck, 
  Award, 
  Briefcase,
  Zap,
  ArrowRight
} from "lucide-react";

const WhyChoose: React.FC = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-blue-100 px-6 py-12">
      <div className="max-w-6xl mx-auto space-y-12">

        {/* Hero Banner - Focus on Mobility & Peace */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-indigo-900 rounded-[2.5rem] p-8 md:p-12 text-white shadow-2xl relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -mr-20 -mt-20 blur-3xl"></div>
          <div className="relative z-10 text-center space-y-4">
            <span className="bg-yellow-400 text-indigo-950 px-4 py-1 rounded-full text-xs font-black uppercase tracking-widest">
              A First-of-its-Kind Model
            </span>
            <h2 className="text-3xl md:text-5xl font-black leading-tight">
              Education That Moves <br /> <span className="text-yellow-300">With Your Life</span>
            </h2>
            <p className="text-lg md:text-xl text-indigo-100 max-w-3xl mx-auto leading-relaxed">
              Registrations are <strong>always open</strong>. Enroll termly and choose between 
              <strong> Campus or Virtual</strong> learning. Experience total peace of mind for your 
              family and work commitments.
            </p>
            <div className="pt-4">
              <Link
                to="/login"
                className="inline-flex items-center gap-2 bg-white text-indigo-900 font-black px-10 py-4 rounded-2xl hover:bg-yellow-300 transition shadow-xl transform hover:scale-105"
              >
                Secure Your Spot for 2026 <Zap size={18} className="fill-indigo-900"/>
              </Link>
            </div>
          </div>
        </motion.div>

        {/* Heading */}
        <div className="text-center space-y-4">
          <h1 className="text-4xl md:text-6xl font-black text-gray-900">
            Why Care Academy?
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto italic">
            "Nurturing Excellence, Nurturing Character — Grade 1 to 12"
          </p>
        </div>

        {/* Feature Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">

          {/* 1. Flexibility & Mobility */}
          <div className="p-8 bg-white rounded-3xl shadow-xl hover:shadow-2xl transition border-t-8 border-indigo-500 group">
            <div className="bg-indigo-100 w-14 h-14 rounded-2xl flex items-center justify-center text-indigo-600 mb-6 group-hover:rotate-12 transition-transform">
              <RotateCw size={30} />
            </div>
            <h2 className="text-xl font-bold text-gray-800 mb-3">Total Mobility</h2>
            <p className="text-gray-600 text-sm leading-relaxed">
              Relocating for work? Traveling? Our model allows you to switch between 
              <strong> Physical Campus and Virtual</strong> every term. Your child's education 
              never skips a beat.
            </p>
          </div>

          {/* 2. Global Curricula Choice */}
          <div className="p-8 bg-white rounded-3xl shadow-xl hover:shadow-2xl transition border-t-8 border-blue-500 group">
            <div className="bg-blue-100 w-14 h-14 rounded-2xl flex items-center justify-center text-blue-600 mb-6 group-hover:rotate-12 transition-transform">
              <Globe size={30} />
            </div>
            <h2 className="text-xl font-bold text-gray-800 mb-3">Cambridge or CAPS</h2>
            <p className="text-gray-600 text-sm leading-relaxed">
              We offer both <strong>Cambridge International</strong> and <strong>CAPS</strong> pathways 
              from Grade 1 to 12. Choose the standard that best fits your child's future.
            </p>
          </div>

          {/* 3. Nurturing Christian Values */}
          <div className="p-8 bg-white rounded-3xl shadow-xl hover:shadow-2xl transition border-t-8 border-pink-500 group">
            <div className="bg-pink-100 w-14 h-14 rounded-2xl flex items-center justify-center text-pink-600 mb-6 group-hover:rotate-12 transition-transform">
              <Heart size={30} />
            </div>
            <h2 className="text-xl font-bold text-gray-800 mb-3">Christian Environment</h2>
            <p className="text-gray-600 text-sm leading-relaxed">
              We don't just teach; we nurture. Our environment is rooted in 
              <strong> Christian values</strong>, focusing on character building and spiritual growth.
            </p>
          </div>

          {/* 4. Affordable Quality */}
          <div className="p-8 bg-white rounded-3xl shadow-xl hover:shadow-2xl transition border-t-8 border-emerald-500 group">
            <div className="bg-emerald-100 w-14 h-14 rounded-2xl flex items-center justify-center text-emerald-600 mb-6 group-hover:rotate-12 transition-transform">
              <Award size={30} />
            </div>
            <h2 className="text-xl font-bold text-gray-800 mb-3">Affordable Excellence</h2>
            <p className="text-gray-600 text-sm leading-relaxed">
              Quality education shouldn't be a luxury. At <strong>R1,000 tuition</strong> per month, 
              we bring subject-specialist teachers within reach of every family.
            </p>
          </div>

          {/* 5. Work-Family Peace */}
          <div className="p-8 bg-white rounded-3xl shadow-xl hover:shadow-2xl transition border-t-8 border-yellow-500 group">
            <div className="bg-yellow-100 w-14 h-14 rounded-2xl flex items-center justify-center text-yellow-700 mb-6 group-hover:rotate-12 transition-transform">
              <Briefcase size={30} />
            </div>
            <h2 className="text-xl font-bold text-gray-800 mb-3">Family Harmony</h2>
            <p className="text-gray-600 text-sm leading-relaxed">
              Our flexible model removes the stress of fixed locations. Adjust your child's 
              schooling to your <strong>work commitments</strong>—not the other way around.
            </p>
          </div>

          {/* 6. Smart Technology */}
          <div className="p-8 bg-white rounded-3xl shadow-xl hover:shadow-2xl transition border-t-8 border-purple-500 group">
            <div className="bg-purple-100 w-14 h-14 rounded-2xl flex items-center justify-center text-purple-600 mb-6 group-hover:rotate-12 transition-transform">
              <UserCheck size={30} />
            </div>
            <h2 className="text-xl font-bold text-gray-800 mb-3">Integrated Dashboards</h2>
            <p className="text-gray-600 text-sm leading-relaxed">
              Stay connected through our <strong>seamless LMS</strong>. In-app chat, 
              real-time progress tracking, and instant teacher communication at your fingertips.
            </p>
          </div>

        </div>

        {/* Mobility Diagram/Visual Callout */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-[3rem] p-10 text-white flex flex-col md:flex-row items-center gap-8 shadow-2xl">
          <div className="flex-1 space-y-4">
            <h3 className="text-2xl font-bold">Why Termly Enrolment?</h3>
            <p className="text-blue-100 leading-relaxed">
              Life changes fast. By allowing termly choices between virtual and campus, we provide 
              a safety net for families who value mobility. Your child remains in the same 
              curriculum with the same teachers, regardless of where you are.
            </p>
            <div className="flex gap-4 pt-2">
              <span className="flex items-center gap-1 text-xs font-bold bg-white/10 px-3 py-1 rounded-full"><ShieldCheck size={14}/> Secure</span>
              <span className="flex items-center gap-1 text-xs font-bold bg-white/10 px-3 py-1 rounded-full"><RotateCw size={14}/> Seamless</span>
            </div>
          </div>
          <div className="bg-white/10 backdrop-blur-md p-6 rounded-3xl border border-white/20 w-full md:w-auto">
            <p className="text-sm font-bold uppercase tracking-widest text-yellow-300 mb-4">Registration Always Open</p>
            <ul className="space-y-3">
              <li className="flex items-center gap-2 text-sm"><CheckCircle /> Secure online registration</li>
              <li className="flex items-center gap-2 text-sm"><CheckCircle /> Pay registration fee online</li>
              <li className="flex items-center gap-2 text-sm"><CheckCircle /> Choose path: Virtual or Campus</li>
            </ul>
          </div>
        </div>

        {/* Final CTA */}
        <div className="text-center py-12">
          <p className="text-2xl font-black text-indigo-900 mb-8">
            The Future of Education is <span className="text-blue-600 underline decoration-yellow-400">Flexible</span>.
          </p>
          <div className="inline-block p-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 rounded-2xl">
            <Link
              to="/login"
              className="flex items-center gap-3 bg-white text-gray-900 font-black text-xl px-12 py-6 rounded-xl hover:bg-transparent hover:text-white transition-all duration-300"
            >
              Enrol for 2026 Intake <ArrowRight />
            </Link>
          </div>
          <p className="mt-6 text-gray-500 text-sm font-medium">
            Classes start 22 January 2026 • Registration fee secures your spot.
          </p>
        </div>

        {/* Back Navigation */}
        <div className="text-center mt-8">
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

// Helper Component for the list
const CheckCircle = () => (
  <div className="bg-green-400 rounded-full p-1"><ShieldCheck size={12} className="text-indigo-900" /></div>
);

export default WhyChoose;