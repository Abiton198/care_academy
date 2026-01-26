"use client";

import React from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { 
  UserCheck, 
  Heart, 
  Globe, 
  ShieldCheck, 
  Star, 
  Zap, 
  Users,
  Award,
  ArrowRight
} from "lucide-react";

const TeachingStaff: React.FC = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-100 px-6 py-12">
      <div className="max-w-6xl mx-auto space-y-16">

        {/* Hero Banner - Hybrid Excellence */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-indigo-900 rounded-[2.5rem] p-8 md:p-12 text-white shadow-2xl relative overflow-hidden text-center"
        >
          <div className="relative z-10 space-y-4">
            <span className="bg-yellow-400 text-indigo-950 px-4 py-1 rounded-full text-xs font-black uppercase tracking-widest">
              Expert Mentors for 2026
            </span>
            <h2 className="text-3xl md:text-5xl font-black leading-tight">
              A World-Class Faculty <br /> <span className="text-yellow-300">For a Borderless Education</span>
            </h2>
            <p className="text-lg text-indigo-100 max-w-3xl mx-auto">
              Our SACE-registered educators are specialists in <strong>Hybrid Pedagogy</strong>, 
              ensuring your child receives the same nurturing excellence whether they are in 
              the <strong>classroom or across the globe</strong>.
            </p>
            <div className="pt-4">
              <Link
                to="/login"
                className="inline-flex items-center gap-2 bg-white text-indigo-900 font-black px-10 py-4 rounded-2xl hover:bg-yellow-300 transition shadow-xl transform hover:scale-105"
              >
                Register for 2026 Intake <Zap size={18} className="fill-indigo-900"/>
              </Link>
            </div>
          </div>
        </motion.div>

        {/* Heading */}
        <div className="text-center space-y-4">
          <h1 className="text-4xl md:text-6xl font-black text-gray-900 tracking-tight">Meet Our Specialist Educators</h1>
          <p className="text-lg text-gray-600 max-w-3xl mx-auto italic">
            "Experts with 12+ years of experience in British Curriculum, 
            united by a mission to nurture character and academic brilliance."
          </p>
        </div>

        {/* Teacher Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">

          {/* Teacher 1 - High School Science */}
          <motion.div whileHover={{ y: -5 }} className="bg-white p-8 rounded-[2.5rem] shadow-xl border-t-8 border-indigo-600 group">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-20 h-20 bg-indigo-100 rounded-2xl flex items-center justify-center text-indigo-600 border-2 border-dashed border-indigo-200">
                <UserCheck size={40} />
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900 leading-tight">Trevor Ryan</h3>
                <p className="text-sm text-indigo-600 font-bold">Physics and Mathematics</p>
                <div className="flex mt-1">
                  {[1, 2, 3, 4, 5].map((i) => <Star key={i} size={12} className="fill-yellow-400 text-yellow-400" />)}
                </div>
              </div>
            </div>
            <p className="text-sm text-gray-600 mb-4 leading-relaxed">
              30 years of experience. Specialist in <strong>British Curriculum IGCSE & AS-Level</strong> Chemistry
            </p>
            <ul className="text-xs space-y-2 text-gray-500 font-medium border-t pt-4">
              <li className="flex items-center gap-2 italic">BA in Chemistry (NMU)</li>
              <li className="flex items-center gap-2 italic">92% Distinction Rate in 2024</li>
            </ul>
          </motion.div>

          {/* Teacher 2 - High School Maths */}
          <motion.div whileHover={{ y: -5 }} className="bg-white p-8 rounded-[2.5rem] shadow-xl border-t-8 border-blue-600 group">
            <div className="flex items-center gap-4 mb-6">
               {/* Tutor Image */}
    <div className="w-20 h-20 rounded-2xl overflow-hidden border-2 border-emerald-200 shadow-sm">
      <img
        src="/logos/pauline.png" 
        alt="Pauline"
        className="w-full h-full object-cover"
        onError={(e) => {
          e.currentTarget.src = "/placeholder-avatar.png";
        }}
      />
    </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900 leading-tight">Pauline Slater</h3>
                <p className="text-sm text-blue-600 font-bold">Mathematics </p>
                <div className="flex mt-1">
                  {[1, 2, 3, 4, 5].map((i) => <Star key={i} size={12} className="fill-yellow-400 text-yellow-400" />)}
                </div>
              </div>
            </div>
            <p className="text-sm text-gray-600 mb-4 leading-relaxed">
              <strong>British Curriculum Examiner</strong> . Expert in building mathematical confidence in senior phases.
            </p>
            <ul className="text-xs space-y-2 text-gray-500 font-medium border-t pt-4">
              <li className="flex items-center gap-2 italic">15+ Years Experience</li>
            
            </ul>
          </motion.div>

          {/* Teacher 3 - Primary Phase */}
          <motion.div whileHover={{ y: -5 }} className="bg-white p-8 rounded-[2.5rem] shadow-xl border-t-8 border-emerald-600 group">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-20 h-20 bg-emerald-100 rounded-2xl flex items-center justify-center text-emerald-600 border-2 border-dashed border-emerald-200">
                <Heart size={40} className="fill-emerald-600" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900 leading-tight">Jason Oosthuizen</h3>
                <p className="text-sm text-emerald-600 font-bold">Mathematics & Coding</p>
                <div className="flex mt-1">
                  {[1, 2, 3, 4, 5].map((i) => <Star key={i} size={12} className="fill-yellow-400 text-yellow-400" />)}
                </div>
              </div>
            </div>
            <p className="text-sm text-gray-600 mb-4 leading-relaxed">
              Grade 1–7 literacy and numeracy specialist. Nurturing the foundations through a <strong>Christian-based approach</strong>.
            </p>
            <ul className="text-xs space-y-2 text-gray-500 font-medium border-t pt-4">
              <li className="flex items-center gap-2 italic">Mathematics guru</li>
              <li className="flex items-center gap-2 italic">Specialist in Software</li>
            </ul>
          </motion.div>

            {/* Teacher 4 - Primary Phase */}
          <motion.div whileHover={{ y: -5 }} className="bg-white p-8 rounded-[2.5rem] shadow-xl border-t-8 border-emerald-600 group">
            <div className="flex items-center gap-4 mb-6">
                {/* Tutor Image */}
    <div className="w-20 h-20 rounded-2xl overflow-hidden border-2 border-emerald-200 shadow-sm">
      <img
        src="/logos/abiton.png" 
        alt="Abiton"
        className="w-full h-full object-cover"
        onError={(e) => {
          e.currentTarget.src = "/placeholder-avatar.png";
        }}
      />
    </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900 leading-tight">Abiton Padera</h3>
                <p className="text-sm text-emerald-600 font-bold">Programming & Coding</p>
                <div className="flex mt-1">
                  {[1, 2, 3, 4, 5].map((i) => <Star key={i} size={12} className="fill-yellow-400 text-yellow-400" />)}
                </div>
              </div>
            </div>
            <p className="text-sm text-gray-600 mb-4 leading-relaxed">
              Specialist in software development. Nurturing the foundations through a <strong>programming-based approach</strong>.
            </p>
            <ul className="text-xs space-y-2 text-gray-500 font-medium border-t pt-4">
              <li className="flex items-center gap-2 italic">AI Specialist</li>
              <li className="flex items-center gap-2 italic">Specialist in Software Development</li>
            </ul>
          </motion.div>

            {/* Teacher 5 - Bible Study */}
         <motion.div
  whileHover={{ y: -5 }}
  className="bg-white p-8 rounded-[2.5rem] shadow-xl border-t-8 border-emerald-600 group"
>
  <div className="flex items-center gap-4 mb-6">
    {/* Tutor Image */}
    <div className="w-20 h-20 rounded-2xl overflow-hidden border-2 border-emerald-200 shadow-sm">
      <img
        src="/logos/tanya.png" 
        alt="Tanya Prinloo"
        className="w-full h-full object-cover"
        onError={(e) => {
          e.currentTarget.src = "/placeholder-avatar.png";
        }}
      />
    </div>

    <div>
      <h3 className="text-xl font-bold text-gray-900 leading-tight">
        Tanya Prinloo
      </h3>
      <p className="text-sm text-emerald-600 font-bold">
        Bible Studies
      </p>
      <div className="flex mt-1">
        {[1, 2, 3, 4, 5].map((i) => (
          <Star
            key={i}
            size={12}
            className="fill-yellow-400 text-yellow-400"
          />
        ))}
      </div>
    </div>
  </div>

  <p className="text-sm text-gray-600 mb-4 leading-relaxed">
    Dedicated <strong>Bible Studies Educator</strong> focused on developing
    ethical awareness, critical thinking, and global citizenship through
    thoughtful exploration of biblical principles and real-world application.
  </p>

  <ul className="text-xs space-y-2 text-gray-500 font-medium border-t pt-4">
    <li className="italic">
      Cambridge Learner Values & Ethics
    </li>
    <li className="italic">
      Critical Thinking & Moral Reasoning
    </li>
    <li className="italic">
      Character Formation & Student Mentorship
    </li>
  </ul>
</motion.div>

        </div>

        {/* The Continuity logic visual */}
        <div className="bg-white rounded-[3rem] p-10 shadow-2xl border border-indigo-50">
          <div className="flex flex-col md:flex-row items-center gap-12">
            <div className="flex-1 space-y-6">
              <h2 className="text-3xl font-black text-gray-900 leading-tight">
                Teachers Who Travel <br /> <span className="text-indigo-600 underline decoration-yellow-400">With Your Child</span>
              </h2>
              <p className="text-gray-600 leading-relaxed">
                Relocating? Traveling for work? Our teachers stay the same. By using our 
                <strong> integrated app and virtual portal</strong>, your child maintains their 
                mentors, curriculum, and classmates regardless of where your family is based.
              </p>
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center gap-2 text-sm font-bold text-indigo-900">
                  <ShieldCheck size={20} className="text-emerald-500" /> Same Mentorship
                </div>
                <div className="flex items-center gap-2 text-sm font-bold text-indigo-900">
                  <Globe size={20} className="text-emerald-500" /> Seamless Transition
                </div>
              </div>
            </div>
            
          </div>
        </div>

        {/* Core Values Section */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
          <div className="p-8 bg-indigo-50 rounded-[2.5rem]">
            <Award size={48} className="mx-auto text-indigo-600 mb-4" />
            <h3 className="font-black text-indigo-900 mb-2">Excellence</h3>
            <p className="text-sm text-indigo-700">Only British Curriculum experts with proven academic records.</p>
          </div>
          <div className="p-8 bg-purple-50 rounded-[2.5rem]">
            <Heart size={48} className="mx-auto text-purple-600 mb-4" />
            <h3 className="font-black text-purple-900 mb-2">Nurture</h3>
            <p className="text-sm text-purple-700">Mentorship rooted in Christian values and character building.</p>
          </div>
          <div className="p-8 bg-blue-50 rounded-[2.5rem]">
            <Users size={48} className="mx-auto text-blue-600 mb-4" />
            <h3 className="font-black text-blue-900 mb-2">Diversity</h3>
            <p className="text-sm text-blue-700">A global-minded faculty serving students from Grade 1 to 12.</p>
          </div>
        </div>

        {/* Final Registration CTA */}
        <div className="text-center py-12">
          <p className="text-2xl font-black text-indigo-900">
            Secure Your Child’s Spot with the Best Educators.
          </p>
          <div className="mt-8">
            <Link
              to="/login"
              className="inline-flex items-center gap-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-black text-xl px-12 py-6 rounded-2xl shadow-2xl hover:scale-105 transition-all duration-300"
            >
              Start Registration for 2026 <ArrowRight />
            </Link>
          </div>
          <p className="mt-6 text-gray-500 text-sm italic">
            Registrations are always open. Termly enrolment allows for total family peace of mind.
          </p>
        </div>

        {/* Navigation */}
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

export default TeachingStaff;