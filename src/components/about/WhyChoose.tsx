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
  ArrowRight,
  MapPin
} from "lucide-react";

const WhyChoose: React.FC = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-blue-100 px-6 py-12">
      <div className="max-w-6xl mx-auto space-y-12">

        {/* Hero Banner */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-indigo-900 rounded-[2.5rem] p-8 md:p-12 text-white shadow-2xl relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -mr-20 -mt-20 blur-3xl"></div>
          <div className="relative z-10 text-center space-y-4">
            <span className="bg-yellow-400 text-indigo-950 px-4 py-1 rounded-full text-xs font-black uppercase tracking-widest">
              British Curriculum  • Hybrid
            </span>
            <h2 className="text-3xl md:text-5xl font-black leading-tight">
              A School That <br /> <span className="text-yellow-300">Adapts to Your Life</span>
            </h2>
            <p className="text-lg md:text-xl text-indigo-100 max-w-3xl mx-auto leading-relaxed">
              Care Academy is built for modern families. Whether you choose 
              <strong> British Curriculum International</strong>, your child receives 
              a stable, recognised education — <strong>anywhere in the world</strong>.
            </p>
            <div className="pt-4">
              <Link
                to="/login"
                className="inline-flex items-center gap-2 bg-white text-indigo-900 font-black px-10 py-4 rounded-2xl hover:bg-yellow-300 transition shadow-xl transform hover:scale-105"
              >
                Apply for 2026 <Zap size={18} className="fill-indigo-900"/>
              </Link>
            </div>
          </div>
        </motion.div>

        {/* Heading */}
        <div className="text-center space-y-4">
          <h1 className="text-4xl md:text-6xl font-black text-gray-900">
            Why Parents Choose Care Academy
          </h1>
          <p className="text-lg text-gray-600 max-w-3xl mx-auto italic">
            "World-class academics, Christian values, and a structure that works for real life."
          </p>
        </div>

        {/* Feature Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">

          {/* Mobility */}
          <div className="p-8 bg-white rounded-3xl shadow-xl border-t-8 border-indigo-500">
            <RotateCw className="text-indigo-600 mb-6" size={36} />
            <h2 className="text-xl font-bold mb-3">True Hybrid Flexibility</h2>
            <p className="text-gray-600 text-sm leading-relaxed">
              Move between <strong>Campus and Virtual</strong> learning on a term-by-term basis. 
              Ideal for relocating families, travelling professionals, or students who thrive online.
            </p>
          </div>

          {/* British Curriculum Logic */}
          <div className="p-8 bg-white rounded-3xl shadow-xl border-t-8 border-blue-500">
            <Globe className="text-blue-600 mb-6" size={36} />
            <h2 className="text-xl font-bold mb-3">British Curriculum, Done Properly</h2>
            <p className="text-gray-600 text-sm leading-relaxed">
              British Curriculum students follow the full international curriculum, while writing 
              exams at <strong>approved local exam centres</strong> near their home — 
              no overseas travel, no disruption.
            </p>
          </div>

          {/* Local Exam Centres */}
          <div className="p-8 bg-white rounded-3xl shadow-xl border-t-8 border-emerald-500">
            <MapPin className="text-emerald-600 mb-6" size={36} />
            <h2 className="text-xl font-bold mb-3">Local Exams, Global Recognition</h2>
            <p className="text-gray-600 text-sm leading-relaxed">
              We guide parents through registration with the <strong>nearest accredited centre</strong>. 
              Results are internationally recognised and accepted by universities worldwide.
            </p>
          </div>

          {/* Christian Values */}
          <div className="p-8 bg-white rounded-3xl shadow-xl border-t-8 border-pink-500">
            <Heart className="text-pink-600 mb-6" size={36} />
            <h2 className="text-xl font-bold mb-3">Faith-Centered Education</h2>
            <p className="text-gray-600 text-sm leading-relaxed">
              Academic excellence is paired with <strong>Christian values</strong>, character development, 
              discipline, and compassion — preparing students for life, not just exams.
            </p>
          </div>

          {/* Affordable */}
          <div className="p-8 bg-white rounded-3xl shadow-xl border-t-8 border-yellow-500">
            <Award className="text-yellow-600 mb-6" size={36} />
            <h2 className="text-xl font-bold mb-3">Accessible Private Education</h2>
            <p className="text-gray-600 text-sm leading-relaxed">
              High-quality private schooling from <strong>R1,200 per month</strong>. 
              Transparent pricing with no hidden surprises.
            </p>
          </div>

          {/* Technology */}
          <div className="p-8 bg-white rounded-3xl shadow-xl border-t-8 border-purple-500">
            <UserCheck className="text-purple-600 mb-6" size={36} />
            <h2 className="text-xl font-bold mb-3">Smart Learning Platform</h2>
            <p className="text-gray-600 text-sm leading-relaxed">
              Real-time dashboards, assessments, teacher feedback, and parent visibility — 
              whether your child learns on campus or online.
            </p>
          </div>

        </div>

        {/* Reassurance Section */}
        <div className="bg-indigo-800 rounded-[3rem] p-10 text-white shadow-2xl">
          <h3 className="text-2xl font-black mb-4">Peace of Mind for Parents</h3>
          <p className="text-indigo-100 max-w-3xl leading-relaxed">
            Your child stays in the <strong>same curriculum, same structure, same academic pathway</strong>, 
            even if your location changes. We handle the complexity — you enjoy stability.
          </p>
        </div>

        {/* Final CTA */}
        <div className="text-center py-12">
          <p className="text-2xl font-black text-indigo-900 mb-8">
            One School. <span className="text-blue-600 underline decoration-yellow-400">Anywhere.</span>
          </p>
          <Link
            to="/login"
            className="inline-flex items-center gap-3 bg-indigo-600 text-white font-black text-xl px-12 py-6 rounded-2xl shadow-xl hover:bg-emerald-600 transition"
          >
            Enrol for 2026 <ArrowRight />
          </Link>
          <p className="mt-6 text-gray-500 text-sm">
            British Curriculum • All levels • Registration Open
          </p>
        </div>

        {/* Back */}
        <div className="text-center">
          <Link
            to="/about"
            className="text-gray-400 font-bold hover:text-indigo-600 underline underline-offset-4"
          >
            ← Back to About Us
          </Link>
        </div>

      </div>
    </div>
  );
};

export default WhyChoose;
