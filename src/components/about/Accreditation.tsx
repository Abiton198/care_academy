"use client";

import React from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { 
  ShieldCheck, 
  MapPin, 
  BookOpen, 
  GraduationCap, 
  CheckCircle, 
  Building2, 
  ArrowRight,
  ClipboardCheck
} from "lucide-react";

// Placeholder logo URLs
const logos = {
  google: "https://upload.wikimedia.org/wikipedia/commons/2/2f/Google_2015_logo.svg",
  amazon: "https://upload.wikimedia.org/wikipedia/commons/a/a9/Amazon_logo.svg",
  ibm: "https://upload.wikimedia.org/wikipedia/commons/5/51/IBM_logo.svg",
};

const Accreditation: React.FC = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 px-6 py-12">
      <div className="max-w-6xl mx-auto space-y-16">
        
        {/* Hero Section */}
        <div className="text-center space-y-4">
          <motion.h1 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-4xl md:text-6xl font-black text-slate-900 tracking-tight"
          >
            Accreditation & <span className="text-indigo-600">Exam Excellence</span>
          </motion.h1>
          <p className="text-lg text-slate-600 max-w-3xl mx-auto leading-relaxed">
            We provide a seamless pathway to internationally recognized qualifications. 
            Through our network of <strong>established Gqeberha (PE) and Johannesburg independent boards</strong>, 
            we ensure your child is registered, prepared, and ready for success.
          </p>
        </div>

        {/* Examination Strategy Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          
          {/* PE Partnership */}
          <div className="bg-white p-8 rounded-[2.5rem] shadow-xl border-l-8 border-indigo-600 relative overflow-hidden">
            <Building2 className="absolute -right-4 -bottom-4 text-indigo-50 opacity-10" size={120} />
            <h2 className="text-2xl font-bold text-slate-800 mb-4 flex items-center gap-2">
              <MapPin className="text-indigo-600" /> Established PE Links
            </h2>
            <p className="text-slate-600 leading-relaxed">
              Care Academy is currently linked to <strong>established independent institutions in Gqeberha (Port Elizabeth)</strong>. 
              This partnership allows us to facilitate student registrations for official 
              <strong> British Curriculum International</strong> examinations through registered centers.
            </p>
          </div>

          {/* Localized Exams */}
          <div className="bg-white p-8 rounded-[2.5rem] shadow-xl border-l-8 border-emerald-500 relative overflow-hidden">
            <ClipboardCheck className="absolute -right-4 -bottom-4 text-emerald-50 opacity-10" size={120} />
            <h2 className="text-2xl font-bold text-slate-800 mb-4 flex items-center gap-2">
              <ShieldCheck className="text-emerald-600" /> Local Exam Centers
            </h2>
            <p className="text-slate-600 leading-relaxed">
              We help students register at their <strong>nearest local examination center</strong>. 
              Whether you are in Johannesburg, London, or rural Eastern Cape, we guide you through 
              every step of the registration process for a seamless examination experience.
            </p>
          </div>
        </div>

        {/* Vision Note: Physical Campus */}
        <div className="bg-indigo-900 text-white rounded-[3rem] p-8 md:p-12 shadow-2xl flex flex-col md:flex-row items-center gap-8">
          <div className="bg-white/10 p-6 rounded-full">
            <Building2 size={48} className="text-yellow-300" />
          </div>
          <div className="flex-1 text-center md:text-left">
            <h3 className="text-2xl font-bold mb-2">Establishing Our Own Campus</h3>
            <p className="text-indigo-100 italic">
              "We are actively working on establishing our own dedicated physical campus center 
              very soon to further support our students with a home-base for learning and assessment."
            </p>
          </div>
        </div>

        {/* Examination Journey Map */}
        <div className="space-y-10">
          <h2 className="text-3xl font-black text-center text-slate-900">Your Roadmap to Finals</h2>
          
          

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[
              { step: "01", title: "Learning", desc: "Expert online/campus delivery of CAPS/British Curriculum syllabi." },
              { step: "02", title: "Identification", desc: "We find the nearest registered exam center to your location." },
              { step: "03", title: "Registration", desc: "Step-by-step guidance on entry fees and deadlines." },
              { step: "04", title: "Examination", desc: "Write your formal finals at a secure, accredited venue." }
            ].map((item, idx) => (
              <div key={idx} className="bg-white p-6 rounded-3xl shadow-md border border-slate-100">
                <span className="text-4xl font-black text-indigo-100 block mb-2">{item.step}</span>
                <h4 className="font-bold text-slate-800 mb-2">{item.title}</h4>
                <p className="text-xs text-slate-500 leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* University Pathways & Edge */}
        <div className="bg-white rounded-[3.5rem] p-10 shadow-2xl border border-slate-100">
          <div className="flex flex-col lg:flex-row gap-12">
            <div className="lg:w-1/2 space-y-6">
              <div className="inline-flex items-center gap-2 bg-yellow-100 text-yellow-800 px-4 py-1 rounded-full text-xs font-bold uppercase tracking-widest">
                The NextGen Edge
              </div>
              <h2 className="text-3xl font-black text-slate-900">Global University Pathways</h2>
              <p className="text-slate-600">
                Beyond school subjects, we provide a <strong>free accredited pre-university certificate</strong> 
                from global leaders. This "extra edge" strengthens applications to NMU, UCT, and 
                international institutions.
              </p>
              <ul className="space-y-3">
                {["Accredited Google/IBM/Amazon certificates", "Mock interviews & CV guidance", "University entrance prep (NBT/SAT)"].map((text, i) => (
                  <li key={i} className="flex items-center gap-3 text-sm font-semibold text-slate-700">
                    <CheckCircle className="text-indigo-600" size={18} /> {text}
                  </li>
                ))}
              </ul>
            </div>
            
            <div className="lg:w-1/2 grid grid-cols-2 gap-4">
              <div className="p-6 bg-slate-50 rounded-3xl flex items-center justify-center group hover:bg-white hover:shadow-lg transition">
                <img src={logos.google} alt="Google" className="h-8 grayscale group-hover:grayscale-0 transition" />
              </div>
              <div className="p-6 bg-slate-50 rounded-3xl flex items-center justify-center group hover:bg-white hover:shadow-lg transition">
                <img src={logos.ibm} alt="IBM" className="h-10 grayscale group-hover:grayscale-0 transition" />
              </div>
              <div className="p-6 bg-slate-50 rounded-3xl flex items-center justify-center group hover:bg-white hover:shadow-lg transition">
                <img src={logos.amazon} alt="Amazon" className="h-8 grayscale group-hover:grayscale-0 transition" />
              </div>
              <div className="p-6 bg-slate-50 rounded-3xl flex items-center justify-center group hover:bg-white hover:shadow-lg transition text-slate-400 font-bold text-xl italic">
                Coursera
              </div>
            </div>
          </div>
        </div>

        {/* Final CTA */}
        <div className="text-center py-10 space-y-8">
          <div className="space-y-2">
            <h2 className="text-3xl font-black text-slate-900 tracking-tight">Ready for a Seamless Education?</h2>
            <p className="text-slate-500">Registrations for the 2026 academic year are now open.</p>
          </div>
          
          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <Link
              to="/login"
              className="bg-indigo-600 text-white font-black text-xl px-12 py-5 rounded-2xl shadow-xl hover:bg-indigo-700 transition-all transform hover:scale-105 inline-flex items-center gap-3"
            >
              Start Registration <ArrowRight />
            </Link>
          </div>
          <p className="text-xs text-slate-400 font-medium">
            Classes start 22 Jan 2026 • Termly enrolment for total mobility
          </p>
        </div>

        {/* Back Navigation */}
        <div className="text-center">
          <Link
            to="/about"
            className="text-slate-400 font-bold hover:text-indigo-600 transition underline decoration-2 underline-offset-4"
          >
            ← Back to About Us
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Accreditation;