"use client";

import React from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ShieldCheck, Lock, EyeOff, Mail } from "lucide-react";

const PrivacyPolicy = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-slate-50 py-12 px-6 lg:px-8 font-sans">
      <div className="max-w-3xl mx-auto bg-white shadow-xl rounded-[2.5rem] overflow-hidden border border-slate-100">
        
        {/* Header Section */}
        <div className="bg-slate-950 p-10 text-white relative overflow-hidden">
          <div className="relative z-10">
            <Button 
              variant="ghost" 
              onClick={() => navigate(-1)} 
              className="mb-6 text-white/60 hover:text-white hover:bg-white/10 rounded-xl"
            >
              <ArrowLeft className="mr-2 h-4 w-4" /> Back
            </Button>
            <h1 className="text-3xl font-black uppercase tracking-tighter italic">
              Care Academy <span className="text-indigo-500">Privacy Policy</span>
            </h1>
            <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mt-2">
              Last updated: 24 January 2026
            </p>
          </div>
          {/* Subtle background icon */}
          <ShieldCheck size={180} className="absolute -right-10 -bottom-10 text-white/5 rotate-12" />
        </div>

        {/* Content Section */}
        <div className="p-10 space-y-10 text-slate-700">
          
          <section className="space-y-4">
            <h2 className="flex items-center gap-3 text-sm font-black text-slate-900 uppercase tracking-widest">
              <span className="p-2 bg-indigo-50 text-indigo-600 rounded-lg"><Lock size={16} /></span>
              Information We Collect
            </h2>
            <ul className="grid grid-cols-1 md:grid-cols-2 gap-3 list-none">
              {["Name and email for accounts", "Class and lesson activity", "App usage analytics (Firebase)"].map((item, i) => (
                <li key={i} className="flex items-center p-4 bg-slate-50 rounded-2xl text-sm font-medium border border-slate-100">
                  <div className="w-2 h-2 bg-indigo-400 rounded-full mr-3" /> {item}
                </li>
              ))}
            </ul>
          </section>

          <section className="space-y-4">
            <h2 className="text-sm font-black text-slate-900 uppercase tracking-widest">How We Use Information</h2>
            <div className="space-y-3">
              <p className="text-sm leading-relaxed">
                We use the data collected to provide personalized educational services, facilitate 
                communication between parents and teachers, and improve the overall learning experience.
              </p>
              <div className="bg-slate-50 p-4 rounded-2xl border-l-4 border-indigo-500 italic text-xs text-slate-500">
                Notifications and updates are sent via Firebase to keep you informed of student progress.
              </div>
            </div>
          </section>

          <section className="space-y-4">
            <h2 className="flex items-center gap-3 text-sm font-black text-slate-900 uppercase tracking-widest">
              <span className="p-2 bg-rose-50 text-rose-600 rounded-lg"><EyeOff size={16} /></span>
              Data Sharing
            </h2>
            <p className="text-sm leading-relaxed">
              We strictly <strong>do not share personal data</strong> with third-party advertisers. 
              Any analytics data shared with service providers is fully anonymized to improve app performance.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-sm font-black text-slate-900 uppercase tracking-widest">Children’s Privacy</h2>
            <div className="p-6 bg-emerald-50 rounded-[2rem] border border-emerald-100">
              <p className="text-sm text-emerald-900 font-medium">
                Our app is designed for learners aged 10-16. We comply fully with <strong>COPPA</strong> 
                and the <strong>Google Play Families Policy</strong> to ensure a safe environment for students.
              </p>
            </div>
          </section>

          <div className="pt-8 border-t border-slate-100 flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-slate-100 rounded-xl text-slate-400"><Mail size={20} /></div>
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Contact Support</p>
                <a href="mailto:abitonp@gmail.com" className="text-sm font-bold text-slate-900 hover:text-indigo-600 transition-colors">
                  abitonp@gmail.com
                </a>
              </div>
            </div>
            <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest">
              Care Academy Compliance Team
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PrivacyPolicy;