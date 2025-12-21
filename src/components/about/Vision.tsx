"use client";

import React from "react";
import { Link } from "react-router-dom";

const Vision: React.FC = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-100 px-6 py-12">
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
            to="/login"
            className="inline-block bg-yellow-400 text-indigo-900 font-bold px-8 py-3 rounded-full hover:bg-yellow-300 transition shadow-md transform hover:scale-105"
          >
            Register Now – Secure Your Spot!
          </Link>
        </div>

        {/* Heading */}
        <h1 className="text-4xl font-bold text-indigo-800 text-center">
          Our Vision for Your Child’s Future
        </h1>
        <p className="text-center text-lg text-gray-700 max-w-3xl mx-auto">
          At <strong>NextGen Independent Online School</strong>, we don’t just offer extra lessons — 
          we <strong>unlock potential</strong> and <strong>build tomorrow’s leaders</strong> in 
          <strong>Science, Arts, and Commerce</strong>.
        </p>

        {/* Vision Statement */}
        <div className="p-8 bg-white rounded-2xl shadow-xl space-y-6 border-l-8 border-indigo-600">
          <h2 className="text-2xl font-bold text-indigo-700 flex items-center">
            Building Confident, Exam-Ready, University-Bound Learners
          </h2>
          <p className="text-gray-700 text-lg leading-relaxed">
            Our vision is to be <strong>South Africa’s #1 after-school support program</strong> — 
            delivering <strong>goal-oriented, affordable, and results-driven extra lessons</strong> 
            that transform <strong>average grades into distinctions</strong>, and 
            <strong>uncertainty into university offers</strong>.
          </p>
          <p className="text-gray-700 text-lg leading-relaxed">
            Whether your child dreams of <strong>medicine</strong>, <strong>media</strong>, or <strong>money</strong> — 
            we provide the <strong>expert guidance, structure, and confidence</strong> they need to succeed.
          </p>
        </div>

        {/* Manifesto Cards – Updated for Extra Lessons */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

          {/* Card 1 */}
          <div className="p-6 bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-xl shadow-lg hover:shadow-xl transition transform hover:-translate-y-1">
            <h3 className="text-xl font-bold mb-2">Exam Mastery</h3>
            <p className="text-sm">
              Every lesson, test, and mock exam is designed to <strong>mirror CAPS & Cambridge</strong> — 
              ensuring your child is <strong>100% exam-ready</strong>.
            </p>
          </div>

          {/* Card 2 */}
          <div className="p-6 bg-gradient-to-br from-purple-500 to-purple-600 text-white rounded-xl shadow-lg hover:shadow-xl transition transform hover:-translate-y-1">
            <h3 className="text-xl font-bold mb-2">Personal Growth</h3>
            <p className="text-sm">
              Small groups, 1-on-1 feedback, and progress tracking build <strong>confidence, discipline, and study habits</strong> 
              that last a lifetime.
            </p>
          </div>

          {/* Card 3 */}
          <div className="p-6 bg-gradient-to-br from-green-500 to-teal-600 text-white rounded-xl shadow-lg hover:shadow-xl transition transform hover:-translate-y-1">
            <h3 className="text-xl font-bold mb-2">Future Pathways</h3>
            <p className="text-sm">
              From <strong>distinctions</strong> to <strong>university bursaries</strong> — 
              we guide learners toward <strong>NMU, UCT, Wits, Oxford, and beyond</strong>.
            </p>
          </div>

        </div>

        {/* Impact Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-10">
          <div className="text-center p-6 bg-indigo-50 rounded-xl shadow">
            <p className="text-4xl font-extrabold text-indigo-600">85%</p>
            <p className="text-sm text-gray-700 mt-1">Students improve by 1–2 letter grades</p>
          </div>
          <div className="text-center p-6 bg-purple-50 rounded-xl shadow">
            <p className="text-4xl font-extrabold text-purple-600">4.9/5</p>
            <p className="text-sm text-gray-700 mt-1">Parent satisfaction rating</p>
          </div>
          <div className="text-center p-6 bg-green-50 rounded-xl shadow">
            <p className="text-4xl font-extrabold text-green-600">R350</p>
            <p className="text-sm text-gray-700 mt-1">Per subject/month — affordable excellence</p>
          </div>
        </div>

        {/* Final CTA */}
        <div className="text-center mt-12">
          <p className="text-xl font-bold text-indigo-900">
            This isn’t just extra lessons.  
            <span className="block text-purple-700 text-2xl mt-2">
              It’s your child’s <strong>launchpad to success</strong>.
            </span>
          </p>
          <Link
            to="/login"
            className="inline-block mt-6 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-bold text-lg px-10 py-4 rounded-full shadow-xl hover:shadow-2xl transition transform hover:scale-105"
          >
            Enrol Now for 2026 – Classes Start 5 Jan
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

export default Vision;