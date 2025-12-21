"use client";

import React from "react";
import { Link } from "react-router-dom";

const AboutUs: React.FC = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 px-6 py-12 relative">
      {/* Navigation Controls */}
      <div className="absolute top-4 left-4">
        <Link
          to="/"
          className="flex items-center space-x-1 text-gray-600 hover:text-gray-800 transition"
        >
          <span className="text-xl">Back</span>
          <span className="font-medium">Home</span>
        </Link>
      </div>
      <div className="absolute top-4 right-4">
        <Link
          to="/"
          className="text-gray-600 hover:text-red-600 text-2xl font-bold transition"
        >
          Close
        </Link>
      </div>

      <div className="max-w-6xl mx-auto space-y-12">
        {/* Heading */}
        <h1 className="text-4xl font-bold text-gray-800 text-center">
          Discover NextGen Online Support School
        </h1>
        <p className="text-center text-lg text-gray-600 max-w-3xl mx-auto">
          We’re here to support. We’re building{" "}
          <strong>future-ready innovators</strong> across South Africa and beyond.
        </p>

        {/* Hero Banner for Extra Lessons */}
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white p-8 rounded-2xl shadow-lg text-center">
          <h2 className="text-3xl font-bold mb-3">
            Online Support Learning 2026 – Registrations Open!
          </h2>
          <p className="text-lg mb-4 max-w-4xl mx-auto">
            <strong>Affordable, reliable, goal-oriented extra lessons</strong> for Grade 10–12 (CAPS) and Cambridge Form 3–6. 
            Classes start <strong>5 January 2026</strong>. Give your child the edge with experienced teachers who follow the prescribed curriculum.
          </p>
          <Link
            to="/login"
            className="inline-block bg-yellow-400 text-indigo-900 font-bold px-6 py-3 rounded-full hover:bg-yellow-300 transition shadow-md"
          >
            Secure Your Spot Now
          </Link>
        </div>

        {/* Sections Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Why Choose */}
          <div className="p-6 bg-white rounded-xl shadow hover:shadow-md transition">
            <h2 className="text-2xl font-semibold text-indigo-500 mb-2">Why Choose Us?</h2>
            <p className="text-gray-700 mb-4">
              <strong>Affordable excellence</strong> with experienced teachers in CAPS & Cambridge. 
              After-school online support designed to boost grades, build confidence, and secure university pathways.
            </p>
            <Link
              to="/about/why-choose"
              className="inline-block bg-indigo-500 text-white px-4 py-2 rounded-lg shadow hover:bg-indigo-600 transition"
            >
              Read More
            </Link>
          </div>

          {/* Learning Platform */}
          <div className="p-6 bg-white rounded-xl shadow hover:shadow-md transition">
            <h2 className="text-2xl font-semibold text-blue-500 mb-2">Learning Platform</h2>
            <p className="text-gray-700 mb-4">
              Live interactive classes via Google Classroom + Zoom. Real-time progress tracking, recorded sessions, 
              and 24/7 access to materials — all in one parent-friendly dashboard.
            </p>
            <Link
              to="/about/learning-platform"
              className="inline-block bg-blue-500 text-white px-4 py-2 rounded-lg shadow hover:bg-blue-600 transition"
            >
              Read More
            </Link>
          </div>

          {/* Subjects Offered */}
          <div className="p-6 bg-white rounded-xl shadow hover:shadow-md transition">
            <h2 className="text-2xl font-semibold text-green-500 mb-2">Subjects Offered</h2>
            <p className="text-gray-700 mb-4">
              <strong>Grade 10–12 (CAPS):</strong> Mathematics, Physical Sciences, Life Sciences, Accounting, Business Studies, English, Afrikaans, Geography, History<br />
              <strong>Cambridge Form 3–6 (IGCSE & AS/A-Level):</strong> Maths, Physics, Chemistry, Biology, Economics, Business, English, Computer Science
            </p>
            <Link
              to="/about/subjects"
              className="inline-block bg-green-500 text-white px-4 py-2 rounded-lg shadow hover:bg-green-600 transition"
            >
              View Full List
            </Link>
          </div>

          {/* Enrolment */}
          <div className="p-6 bg-white rounded-xl shadow hover:shadow-md transition">
            <h2 className="text-2xl font-semibold text-yellow-500 mb-2">Enrolment</h2>
            <p className="text-gray-700 mb-4">
              <strong>100% online, instant confirmation.</strong> Register today with PayFast. 
              Limited spots for 2026 — first 50 students get <strong>10% early-bird discount</strong>.
            </p>
            <Link
              to="/about/enrolment"
              className="inline-block bg-yellow-500 text-white px-4 py-2 rounded-lg shadow hover:bg-yellow-600 transition"
            >
              Enrol Now
            </Link>
          </div>

          {/* Vision */}
          <div className="p-6 bg-white rounded-xl shadow hover:shadow-md transition">
            <h2 className="text-2xl font-semibold text-purple-500 mb-2">Our Vision</h2>
            <p className="text-gray-700 mb-4">
              To empower every South African learner with world-class extra support — 
              turning potential into <strong>top matric results and global university offers</strong>.
            </p>
            <Link
              to="/about/vision"
              className="inline-block bg-purple-500 text-white px-4 py-2 rounded-lg shadow hover:bg-purple-600 transition"
            >
              Read More
            </Link>
          </div>

          {/* Fees Structure */}
          <div className="p-6 bg-white rounded-xl shadow hover:shadow-md transition">
            <h2 className="text-2xl font-semibold text-red-500 mb-2">Fees Structure</h2>
            <p className="text-gray-700 mb-4">
              <strong>From R350/month per subject.</strong> Pay per subject or bundle for savings. 
              No hidden fees. Flexible monthly plans — cancel anytime.
            </p>
            <Link
              to="/about/fees"
              className="inline-block bg-red-500 text-white px-4 py-2 rounded-lg shadow hover:bg-red-600 transition"
            >
              View Pricing
            </Link>
          </div>

          {/* Teaching Staff */}
          <div className="p-6 bg-white rounded-xl shadow hover:shadow-md transition">
            <h2 className="text-2xl font-semibold text-pink-500 mb-2">Our Teaching Staff</h2>
            <p className="text-gray-700 mb-4">
              <strong>SACE-registered experts</strong> with 10+ years in CAPS & Cambridge. 
              Passionate mentors who’ve helped hundreds achieve distinctions.
            </p>
            <Link
              to="/about/teaching-staff"
              className="inline-block bg-pink-500 text-white px-4 py-2 rounded-lg shadow hover:bg-pink-600 transition"
            >
              Meet the Team
            </Link>
          </div>

          {/* Accreditation */}
          <div className="p-6 bg-white rounded-xl shadow hover:shadow-md transition">
            <h2 className="text-2xl font-semibold text-teal-500 mb-2">Accreditation</h2>
            <p className="text-gray-700 mb-4">
              Aligned with <strong>DBE CAPS</strong> and <strong>Cambridge Assessment International Education</strong>. 
              Partnerships with NMU & top universities ensure seamless progression.
            </p>
            <Link
              to="/about/accreditation"
              className="inline-block bg-teal-500 text-white px-4 py-2 rounded-lg shadow hover:bg-teal-600 transition"
            >
              Read More
            </Link>
          </div>
        </div>

        {/* Final CTA */}
        <div className="text-center py-8">
          <p className="text-xl font-semibold text-gray-700 mb-4">
            Don’t let 2026 be another year of stress. 
            <span className="text-indigo-600"> Give your child the support they deserve.</span>
          </p>
          <Link
            to="/login"
            className="inline-block bg-gradient-to-r from-green-500 to-teal-500 text-white font-bold text-lg px-8 py-4 rounded-full shadow-lg hover:shadow-xl transition transform hover:scale-105"
          >
            Register for Online Extra Lessons 2026
          </Link>
        </div>
      </div>
    </div>
  );
};

export default AboutUs;