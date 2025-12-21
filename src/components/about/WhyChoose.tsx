"use client";

import React from "react";
import { Link } from "react-router-dom";

const WhyChoose: React.FC = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 px-6 py-12">
      <div className="max-w-5xl mx-auto space-y-10">

        {/* Hero Banner */}
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white p-8 rounded-2xl shadow-lg text-center">
          <h2 className="text-3xl font-bold mb-3">
            Online Extra Lessons 2026 – Registrations Open!
          </h2>
          <p className="text-lg mb-4 max-w-4xl mx-auto">
            <strong>Grade 10–12 (CAPS) & Cambridge Form 3–6</strong> • 
            <strong className="text-yellow-300">Science • Arts • Commercial</strong> • 
            Starts <strong>5 January 2026</strong>
          </p>
          <Link
            to="/enrol/extra-lessons"
            className="inline-block bg-yellow-400 text-indigo-900 font-bold px-8 py-3 rounded-full hover:bg-yellow-300 transition shadow-md transform hover:scale-105"
          >
            Register Now – Limited Spots!
          </Link>
        </div>

        {/* Heading */}
        <h1 className="text-4xl font-bold text-blue-800 text-center">
          Why Choose NextGen Extra Lessons?
        </h1>
        <p className="text-center text-lg text-gray-700 max-w-3xl mx-auto">
          Because your child deserves <strong>more than just homework help</strong> — 
          they deserve <strong>exam mastery, confidence, and a clear path to university</strong>.
        </p>

        {/* Feature Cards – Updated for Extra Support */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

          {/* 1. Highly Rated Teachers */}
          <div className="p-6 bg-white rounded-xl shadow-lg hover:shadow-xl transition border-l-4 border-indigo-500">
            <h2 className="text-xl font-bold text-indigo-700 mb-2">Top-Rated Teachers</h2>
            <p className="text-gray-700">
              <strong>SACE-registered experts</strong> with <strong>12+ years experience</strong> — 
              <strong>4.9/5 parent rating</strong>. They’ve helped hundreds go from C to A.
            </p>
            <div className="flex mt-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <span key={i} className="text-yellow-500 text-lg">★</span>
              ))}
              <span className="text-sm text-gray-500 ml-1">(4.9/5)</span>
            </div>
          </div>

          {/* 2. Affordable & Flexible */}
          <div className="p-6 bg-white rounded-xl shadow-lg hover:shadow-xl transition border-l-4 border-green-500">
            <h2 className="text-xl font-bold text-green-700 mb-2">Affordable Excellence</h2>
            <p className="text-gray-700">
              Only <strong>R350/month per subject</strong>. Bundle 3+ and save up to <strong>28.6%</strong>. 
              Pay via <strong>PayFast</strong> — cancel or switch anytime.
            </p>
            <p className="text-xs text-green-600 font-bold mt-2">More subjects = bigger savings</p>
          </div>

          {/* 3. Goal-Oriented Support */}
          <div className="p-6 bg-white rounded-xl shadow-lg hover:shadow-xl transition border-l-4 border-purple-500">
            <h2 className="text-xl font-bold text-purple-700 mb-2">Exam-Focused Results</h2>
            <p className="text-gray-700">
              <strong>Weekly live classes</strong>, <strong>monthly mocks</strong>, 
              <strong>past paper drills</strong>, and <strong>1-on-1 feedback</strong> — 
              <strong>85% of students improve by 1–2 letter grades</strong>.
            </p>
          </div>

          {/* 4. Parent Dashboard */}
          <div className="p-6 bg-white rounded-xl shadow-lg hover:shadow-xl transition border-l-4 border-teal-500">
            <h2 className="text-xl font-bold text-teal-700 mb-2">Real-Time Progress</h2>
            <p className="text-gray-700">
              Parents get <strong>instant reports</strong> on attendance, test scores, 
              and teacher notes. <strong>Know exactly how your child is doing — anytime.</strong>
            </p>
            <p className="text-xs text-teal-600 font-medium mt-2">No more surprises in Term 4</p>
          </div>

          {/* 5. Small Groups */}
          <div className="p-6 bg-white rounded-xl shadow-lg hover:shadow-xl transition border-l-4 border-pink-500">
            <h2 className="text-xl font-bold text-pink-700 mb-2">Personal Attention</h2>
            <p className="text-gray-700">
              <strong>Max 20 students per class</strong> — your child isn’t lost in the crowd. 
              Teachers know their strengths, weaknesses, and goals.
            </p>
          </div>

          {/* 6. University Pathways */}
          <div className="p-6 bg-white rounded-xl shadow-lg hover:shadow-xl transition border-l-4 border-yellow-500">
            <h2 className="text-xl font-bold text-yellow-700 mb-2">University Ready</h2>
            <p className="text-gray-700">
              Free <strong>pre-university course</strong> (Google, IBM, Coursera) + 
              <strong>mock interviews</strong> and <strong>CV guidance</strong> — 
              for <strong>NMU, UCT, Wits, and global offers</strong>.
            </p>
          </div>

        </div>

        {/* Trust Badges */}
        <div className="flex justify-center space-x-8 mt-10 flex-wrap">
          <div className="text-center">
            <p className="text-3xl font-bold text-indigo-600">85%</p>
            <p className="text-xs text-gray-600">Grade Improvement</p>
          </div>
          <div className="text-center">
            <p className="text-3xl font-bold text-green-600">R350</p>
            <p className="text-xs text-gray-600">Per Subject/Month</p>
          </div>
          <div className="text-center">
            <p className="text-3xl font-bold text-purple-600">4.9/5</p>
            <p className="text-xs text-gray-600">Parent Rating</p>
          </div>
          <div className="text-center">
            <p className="text-3xl font-bold text-teal-600">20</p>
            <p className="text-xs text-gray-600">Max Students/Class</p>
          </div>
        </div>

        {/* Final CTA */}
        <div className="text-center mt-12">
          <p className="text-xl font-bold text-blue-900">
            Don’t settle for average support.  
            <span className="block text-indigo-700 text-2xl mt-2">
              Give your child the <strong>NextGen Edge</strong> in 2026.
            </span>
          </p>
          <Link
            to="/login"
            className="inline-block mt-6 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold text-lg px-10 py-4 rounded-full shadow-xl hover:shadow-2xl transition transform hover:scale-105"
          >
            Enrol Now – Classes Start 5 Jan 2026
          </Link>
        </div>

        {/* Back Navigation */}
        <div className="text-center mt-8">
          <Link
            to="/about"
            className="inline-block bg-gray-200 text-gray-800 px-6 py-2 rounded-lg shadow hover:bg-gray-300 transition"
          >
            ← Back to About Us
          </Link>
        </div>
      </div>
    </div>
  );
};

export default WhyChoose;