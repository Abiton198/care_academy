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
  CheckCircle
} from "lucide-react";

const SubjectsOffered: React.FC = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-blue-100 px-6 py-12">
      <div className="max-w-6xl mx-auto space-y-16">
        
        {/* Hero Banner */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-indigo-900 rounded-[2.5rem] p-8 md:p-12 text-white shadow-2xl text-center"
        >
          <div className="space-y-4">
            <span className="bg-emerald-500 px-4 py-1 rounded-full text-xs font-black tracking-widest">
              Cambridge International
            </span>
            <h2 className="text-3xl md:text-5xl font-black leading-tight">
              Grade 1 to 12 <br />
              <span className="text-yellow-300">Cambridge Pathway</span>
            </h2>
            <p className="text-lg text-indigo-100 max-w-3xl mx-auto">
              Cambridge Primary, Lower Secondary, IGCSE and AS/A Levels —  
              delivered through our world-class hybrid learning platform.
            </p>
            <div className="pt-4">
              <Link
                to="/login"
                className="inline-block bg-white text-indigo-900 font-black px-10 py-4 rounded-2xl hover:bg-yellow-300 transition shadow-xl"
              >
                Register Online Today
              </Link>
            </div>
          </div>
        </motion.div>

        {/* Introduction */}
        <div className="text-center space-y-4">
          <h1 className="text-4xl md:text-6xl font-black text-gray-900">
            Cambridge Subjects Offered
          </h1>
          <p className="text-lg text-gray-600 max-w-3xl mx-auto">
            A structured international curriculum designed for academic excellence,
            global mobility and university readiness.
          </p>
        </div>

        {/* Primary (Cambridge Primary 1–7) */}
        <div className="bg-white rounded-[3rem] p-8 md:p-12 shadow-xl border border-emerald-100">
          <div className="flex flex-col md:flex-row gap-10 items-center">
            <div className="flex-1 space-y-6">
              <div className="inline-flex items-center gap-2 bg-emerald-100 text-emerald-700 px-4 py-1 rounded-full font-bold text-sm">
                <Heart size={16} /> Cambridge Primary
              </div>
              <h2 className="text-3xl font-bold text-gray-800">
                Strong Academic Foundations
              </h2>
              <p className="text-gray-600">
                Cambridge Primary builds confidence in core skills while developing
                curiosity, creativity and independent thinking.
              </p>
              <div className="grid grid-cols-2 gap-4">
                {[
                  "English",
                  "Mathematics",
                  "Science",
                  "Global Perspectives",
                  "ICT Skills",
                  "Wellbeing & Life Skills"
                ].map((sub, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm font-medium text-gray-700">
                    <CheckCircle size={14} className="text-emerald-500" /> {sub}
                  </div>
                ))}
              </div>
            </div>
            <div className="w-full md:w-1/3 bg-emerald-50 p-6 rounded-3xl border-2 border-dashed border-emerald-200 text-center">
              <BookOpen size={48} className="mx-auto text-emerald-600 mb-4" />
              <h4 className="font-bold text-emerald-900">Grades 1 – 7</h4>
              <p className="text-xs text-emerald-700 mt-2 italic">
                Cambridge Primary Programme
              </p>
            </div>
          </div>
        </div>

        {/* High School (Lower Secondary + IGCSE + A Levels) */}
        <div className="space-y-12">
          <div className="text-center">
            <h2 className="text-3xl font-bold text-gray-900 italic">
              Cambridge Secondary & IGCSE Streams
            </h2>
            <p className="text-gray-500 mt-2">
              Preparing students for top South African and international universities.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            
            {/* Science Stream */}
            <motion.div whileHover={{ y: -10 }} className="p-8 bg-white rounded-3xl shadow-xl border-t-8 border-blue-500">
              <Atom size={40} className="text-blue-500 mb-6" />
              <h3 className="text-2xl font-bold text-gray-800 mb-4">
                Science & Technology
              </h3>
              <ul className="space-y-3 text-sm text-gray-600">
                <li>• Mathematics</li>
                <li>• Additional Mathematics</li>
                <li>• Physics</li>
                <li>• Chemistry</li>
                <li>• Biology</li>
                <li>• Computer Science</li>
              </ul>
              <div className="mt-6 pt-4 border-t text-[10px] font-bold tracking-widest text-gray-400">
                Medicine · Engineering · Technology
              </div>
            </motion.div>

            {/* Humanities */}
            <motion.div whileHover={{ y: -10 }} className="p-8 bg-white rounded-3xl shadow-xl border-t-8 border-pink-500">
              <Palette size={40} className="text-pink-500 mb-6" />
              <h3 className="text-2xl font-bold text-gray-800 mb-4">
                Humanities & Arts
              </h3>
              <ul className="space-y-3 text-sm text-gray-600">
                <li>• English Language</li>
                <li>• English Literature</li>
                <li>• History</li>
                <li>• Geography</li>
                <li>• Global Perspectives</li>
                <li>• Art & Design</li>
              </ul>
              <div className="mt-6 pt-4 border-t text-[10px] font-bold tracking-widest text-gray-400">
                Law · Media · Education · International Studies
              </div>
            </motion.div>

            {/* Commerce */}
            <motion.div whileHover={{ y: -10 }} className="p-8 bg-white rounded-3xl shadow-xl border-t-8 border-yellow-500">
              <TrendingUp size={40} className="text-yellow-600 mb-6" />
              <h3 className="text-2xl font-bold text-gray-800 mb-4">
                Commerce & Economics
              </h3>
              <ul className="space-y-3 text-sm text-gray-600">
                <li>• Economics</li>
                <li>• Business Studies</li>
                <li>• Accounting</li>
                <li>• Enterprise</li>
                <li>• Mathematics</li>
              </ul>
              <div className="mt-6 pt-4 border-t text-[10px] font-bold tracking-widest text-gray-400">
                Finance · Entrepreneurship · Management
              </div>
            </motion.div>
          </div>
        </div>

        {/* Hybrid Note */}
        <div className="bg-gradient-to-r from-indigo-600 to-purple-700 rounded-[3rem] p-10 text-white flex items-center gap-8 shadow-2xl">
          <Globe size={60} className="text-yellow-300 animate-pulse" />
          <div>
            <h3 className="text-2xl font-bold">Cambridge Hybrid Learning</h3>
            <p className="text-indigo-100 max-w-2xl">
              All Cambridge subjects are available on-campus or online through
              live interactive lessons and a structured LMS.
            </p>
          </div>
        </div>

        {/* Final CTA */}
        <div className="text-center py-1 space-y-6">
          <h2 className="text-3xl font-black text-gray-900 ">
            Begin Your Cambridge Journey
          </h2>
          </div>
          
          <div className="flex justify-center">
          <Link
            to="/login"
            className="bg-indigo-600 text-green-500 font-black text-xl px-12 py-5 rounded-2xl shadow-xl hover:bg-indigo-700"
          >
            Enrol Now <Award className="inline ml-2" />
          </Link>
          </div>

        {/* Back */}
        <div className="text-center">
          <Link to="/about" className="text-gray-400 font-bold hover:text-indigo-600 underline">
            ← Back to About Us
          </Link>
        </div>

      </div>
    </div>
  );
};

export default SubjectsOffered;
