"use client";

import React from "react";
import { Link } from "react-router-dom";

const SubjectsOffered: React.FC = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-teal-100 px-6 py-12">
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
            Register Now – Limited Spots!
          </Link>
        </div>

        {/* Heading */}
        <h1 className="text-4xl font-bold text-green-800 text-center">
          Subjects Offered – Extra Support 2026
        </h1>
        <p className="text-center text-lg text-gray-700 max-w-3xl mx-auto">
          Boost your child’s performance with <strong>goal-oriented, after-school support</strong> 
          in <strong>Science, Arts, and Commercial streams</strong> — fully aligned with 
          <strong>CAPS & Cambridge</strong> curricula.
        </p>

        {/* Stream Tabs */}
        <div className="flex justify-center space-x-4 mb-8">
          <span className="bg-blue-600 text-white px-5 py-2 rounded-full text-sm font-semibold">Science</span>
          <span className="bg-pink-600 text-white px-5 py-2 rounded-full text-sm font-semibold">Arts</span>
          <span className="bg-yellow-600 text-white px-5 py-2 rounded-full text-sm font-semibold">Commercial</span>
        </div>

        {/* Subject Cards – Grouped by Stream */}
        <div className="space-y-12">

          {/* Science Stream */}
          <div>
            <h2 className="text-2xl font-bold text-blue-700 mb-4 text-center">Science Stream</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div className="p-6 bg-white rounded-xl shadow-lg hover:shadow-xl transition border-l-4 border-blue-500">
                <h3 className="text-lg font-semibold text-blue-600 mb-2">Mathematics</h3>
                <p className="text-sm text-gray-700">Core problem-solving for engineering, finance, and data science.</p>
              </div>
              <div className="p-6 bg-white rounded-xl shadow-lg hover:shadow-xl transition border-l-4 border-blue-500">
                <h3 className="text-lg font-semibold text-blue-600 mb-2">Physical Sciences</h3>
                <p className="text-sm text-gray-700">Physics & Chemistry — gateway to medicine, engineering, and research.</p>
              </div>
              <div className="p-6 bg-white rounded-xl shadow-lg hover:shadow-xl transition border-l-4 border-blue-500">
                <h3 className="text-lg font-semibold text-blue-600 mb-2">Life Sciences</h3>
                <p className="text-sm text-gray-700">Biology & human systems — ideal for health sciences and biotech.</p>
              </div>
              <div className="p-6 bg-white rounded-xl shadow-lg hover:shadow-xl transition border-l-4 border-blue-500">
                <h3 className="text-lg font-semibold text-blue-600 mb-2">Computer Science (Cambridge)</h3>
                <p className="text-sm text-gray-700">Programming, algorithms, AI — future-proof tech careers.</p>
              </div>
            </div>
          </div>

          {/* Arts Stream */}
          <div>
            <h2 className="text-2xl font-bold text-pink-700 mb-4 text-center">Arts Stream</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div className="p-6 bg-white rounded-xl shadow-lg hover:shadow-xl transition border-l-4 border-pink-500">
                <h3 className="text-lg font-semibold text-pink-600 mb-2">English Language & Literature</h3>
                <p className="text-sm text-gray-700">Critical thinking, writing, media, law, and global communication.</p>
              </div>
              <div className="p-6 bg-white rounded-xl shadow-lg hover:shadow-xl transition border-l-4 border-pink-500">
                <h3 className="text-lg font-semibold text-pink-600 mb-2">Afrikaans FAL / SAL</h3>
                <p className="text-sm text-gray-700">Language mastery for bilingual careers and cultural fluency.</p>
              </div>
              <div className="p-6 bg-white rounded-xl shadow-lg hover:shadow-xl transition border-l-4 border-pink-500">
                <h3 className="text-lg font-semibold text-pink-600 mb-2">History</h3>
                <p className="text-sm text-gray-700">Analytical skills for law, politics, journalism, and heritage.</p>
              </div>
              <div className="p-6 bg-white rounded-xl shadow-lg hover:shadow-xl transition border-l-4 border-pink-500">
                <h3 className="text-lg font-semibold text-pink-600 mb-2">Geography</h3>
                <p className="text-sm text-gray-700">Environmental studies, urban planning, GIS, and sustainability.</p>
              </div>
              <div className="p-6 bg-white rounded-xl shadow-lg hover:shadow-xl transition border-l-4 border-pink-500">
                <h3 className="text-lg font-semibold text-pink-600 mb-2">Dramatic Arts (CAPS)</h3>
                <p className="text-sm text-gray-700">Performance, creativity, confidence — for stage, film, and media.</p>
              </div>
            </div>
          </div>

          {/* Commercial Stream */}
          <div>
            <h2 className="text-2xl font-bold text-yellow-700 mb-4 text-center">Commercial Stream</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div className="p-6 bg-white rounded-xl shadow-lg hover:shadow-xl transition border-l-4 border-yellow-500">
                <h3 className="text-lg font-semibold text-yellow-600 mb-2">Accounting</h3>
                <p className="text-sm text-gray-700">Financial literacy for CA, auditing, business, and entrepreneurship.</p>
              </div>
              <div className="p-6 bg-white rounded-xl shadow-lg hover:shadow-xl transition border-l-4 border-yellow-500">
                <h3 className="text-lg font-semibold text-yellow-600 mb-2">Business Studies</h3>
                <p className="text-sm text-gray-700">Entrepreneurship, marketing, management — build your own future.</p>
              </div>
              <div className="p-6 bg-white rounded-xl shadow-lg hover:shadow-xl transition border-l-4 border-yellow-500">
                <h3 className="text-lg font-semibold text-yellow-600 mb-2">Economics</h3>
                <p className="text-sm text-gray-700">Markets, policy, finance — for investment, banking, and policy roles.</p>
              </div>
              <div className="p-6 bg-white rounded-xl shadow-lg hover:shadow-xl transition border-l-4 border-yellow-500">
                <h3 className="text-lg font-semibold text-yellow-600 mb-2">EMS / Business (CAPS)</h3>
                <p className="text-sm text-gray-700">Foundation for commerce, startups, and financial independence.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Curriculum Note */}
        <div className="bg-teal-50 border border-teal-200 rounded-xl p-6 text-center">
          <p className="text-sm text-teal-800 font-medium">
            All subjects are <strong>100% aligned</strong> with <strong>DBE CAPS</strong> and 
            <strong>Cambridge IGCSE / AS-Level</strong> syllabi. 
            Taught by <strong>SACE-registered, highly rated teachers</strong>.
          </p>
        </div>

        {/* Call to Action */}
        <div className="text-center mt-12">
          <p className="text-xl font-bold text-green-800">
            Whether your child dreams of <span className="text-blue-600">medicine</span>, 
            <span className="text-pink-600"> media</span>, or 
            <span className="text-yellow-600"> money</span> — 
            we’ve got the <strong>extra support</strong> they need.
          </p>
          <Link
            to="/login"
            className="inline-block mt-6 bg-gradient-to-r from-green-600 to-teal-600 text-white font-bold text-lg px-8 py-4 rounded-full shadow-lg hover:shadow-xl transition transform hover:scale-105"
          >
            Enrol in Extra Lessons 2026
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

export default SubjectsOffered;