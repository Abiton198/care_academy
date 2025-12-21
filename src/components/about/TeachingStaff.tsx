"use client";

import React from "react";
import { Link } from "react-router-dom";

const TeachingStaff: React.FC = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 to-purple-100 px-6 py-12">
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
        <h1 className="text-4xl font-bold text-pink-800 text-center">
          Meet Our Highly Rated Teaching Staff
        </h1>
        <p className="text-center text-lg text-gray-700 max-w-3xl mx-auto">
          Your child learns from <strong>SACE-registered, top-rated educators</strong> with 
          <strong>12+ years of experience</strong> in <strong>CAPS and Cambridge</strong> — 
          passionate mentors who’ve helped hundreds achieve distinctions.
        </p>

        {/* Teacher Highlights */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">

          {/* Teacher 1 */}
          <div className="p-6 bg-white rounded-xl shadow-lg hover:shadow-xl transition border-t-4 border-pink-500">
            <div className="flex items-center mb-4">
              <div className="bg-pink-200 border-2 border-dashed rounded-xl w-16 h-16 mr-4" />
              <div>
                <h3 className="font-bold text-pink-700">Mr. Chibwe</h3>
                <p className="text-sm text-gray-600">Physical Sciences & Chemistry</p>
              </div>
            </div>
            <p className="text-sm text-gray-700">
              18 years exp • 92% A-symbol rate • BA in Chemistry (UZ)
            </p>
            <div className="flex mt-2">
              {[1, 2, 3, 4, 5].map((i) => (
                <span key={i} className="text-yellow-500 text-lg">★</span>
              ))}
              <span className="text-sm text-gray-500 ml-1">(4.9/5)</span>
            </div>
          </div>

          {/* Teacher 2 */}
          <div className="p-6 bg-white rounded-xl shadow-lg hover:shadow-xl transition border-t-4 border-blue-500">
            <div className="flex items-center mb-4">
              <div className="bg-blue-200 border-2 border-dashed rounded-xl w-16 h-16 mr-4" />
              <div>
                <h3 className="font-bold text-blue-700">Mr. Liam van der Merwe</h3>
                <p className="text-sm text-gray-600">Mathematics & AP Maths</p>
              </div>
            </div>
            <p className="text-sm text-gray-700">
              15 years exp • 87% distinctions • Cambridge IGCSE Examiner
            </p>
            <div className="flex mt-2">
              {[1, 2, 3, 4, 5].map((i) => (
                <span key={i} className="text-yellow-500 text-lg">★</span>
              ))}
              <span className="text-sm text-gray-500 ml-1">(4.8/5)</span>
            </div>
          </div>

          {/* Teacher 3 */}
          <div className="p-6 bg-white rounded-xl shadow-lg hover:shadow-xl transition border-t-4 border-yellow-500">
            <div className="flex items-center mb-4">
              <div className="bg-yellow-200 border-2 border-dashed rounded-xl w-16 h-16 mr-4" />
              <div>
                <h3 className="font-bold text-yellow-700">Ms. Priya Naidoo</h3>
                <p className="text-sm text-gray-600">Accounting & Business Studies</p>
              </div>
            </div>
            <p className="text-sm text-gray-700">
              14 years exp • CA(SA) • 90% pass rate in final exams
            </p>
            <div className="flex mt-2">
              {[1, 2, 3, 4, 5].map((i) => (
                <span key={i} className="text-yellow-500 text-lg">★</span>
              ))}
              <span className="text-sm text-gray-500 ml-1">(5.0/5)</span>
            </div>
          </div>

          {/* Teacher 4 */}
          <div className="p-6 bg-white rounded-xl shadow-lg hover:shadow-xl transition border-t-4 border-purple-500">
            <div className="flex items-center mb-4">
              <div className="bg-purple-200 border-2 border-dashed rounded-xl w-16 h-16 mr-4" />
              <div>
                <h3 className="font-bold text-purple-700">Mrs. Fatima Abrahams</h3>
                <p className="text-sm text-gray-600">English & Dramatic Arts</p>
              </div>
            </div>
            <p className="text-sm text-gray-700">
              16 years exp • Published poet • 95% A/B symbols
            </p>
            <div className="flex mt-2">
              {[1, 2, 3, 4, 5].map((i) => (
                <span key={i} className="text-yellow-500 text-lg">★</span>
              ))}
              <span className="text-sm text-gray-500 ml-1">(4.9/5)</span>
            </div>
          </div>

          {/* Teacher 5 */}
          <div className="p-6 bg-white rounded-xl shadow-lg hover:shadow-xl transition border-t-4 border-green-500">
            <div className="flex items-center mb-4">
              <div className="bg-green-200 border-2 border-dashed rounded-xl w-16 h-16 mr-4" />
              <div>
                <h3 className="font-bold text-green-700">Mr. David Okafor</h3>
                <p className="text-sm text-gray-600">Life Sciences & Geography</p>
              </div>
            </div>
            <p className="text-sm text-gray-700">
              13 years exp • MSc Biology • 88% university acceptance
            </p>
            <div className="flex mt-2">
              {[1, 2, 3, 4, 5].map((i) => (
                <span key={i} className="text-yellow-500 text-lg">★</span>
              ))}
              <span className="text-sm text-gray-500 ml-1">(4.7/5)</span>
            </div>
          </div>

          {/* Teacher 6 */}
          <div className="p-6 bg-white rounded-xl shadow-lg hover:shadow-xl transition border-t-4 border-teal-500">
            <div className="flex items-center mb-4">
              <div className="bg-teal-200 border-2 border-dashed rounded-xl w-16 h-16 mr-4" />
              <div>
                <h3 className="font-bold text-teal-700">Mr. A </h3>
                <p className="text-sm text-gray-600">Computer Science & Coding</p>
              </div>
            </div>
            <p className="text-sm text-gray-700">
              5 years exp • Google Certified • 100+ apps built with students
            </p>
            <div className="flex mt-2">
              {[1, 2, 3, 4, 5].map((i) => (
                <span key={i} className="text-yellow-500 text-lg">★</span>
              ))}
              <span className="text-sm text-gray-500 ml-1">(5.0/5)</span>
            </div>
          </div>

        </div>

        {/* Core Values – Updated */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-10">
          <div className="p-6 bg-gradient-to-br from-pink-500 to-purple-600 text-white rounded-xl shadow-lg">
            <h2 className="text-xl font-bold mb-2">Excellence</h2>
            <p className="text-sm">Only the best — SACE-registered, proven results, parent-approved.</p>
          </div>
          <div className="p-6 bg-gradient-to-br from-purple-500 to-indigo-600 text-white rounded-xl shadow-lg">
            <h2 className="text-xl font-bold mb-2">Diversity</h2>
            <p className="text-sm">Teachers from all backgrounds, united by passion and expertise.</p>
          </div>
          <div className="p-6 bg-gradient-to-br from-indigo-500 to-blue-600 text-white rounded-xl shadow-lg">
            <h2 className="text-xl font-bold mb-2">Empowerment</h2>
            <p className="text-sm">We uplift women, support communities, and inspire every learner.</p>
          </div>
        </div>

        {/* Parent Testimonial */}
        <div className="bg-yellow-50 border border-yellow-300 rounded-xl p-6 text-center mt-10">
          <p className="text-lg italic text-gray-800">
            “My son went from 58% to 84% in Maths in one term. 
            <strong>Best decision we made.</strong>” 
            <br />— <strong>Mrs. Govender, Parent</strong>
          </p>
        </div>

        {/* CTA */}
        <div className="text-center mt-12">
          <p className="text-xl font-bold text-pink-800">
            Give your child the <strong>best teachers in South Africa</strong> — 
            <span className="block text-purple-700">starting 5 January 2026.</span>
          </p>
          <Link
            to="/login"
            className="inline-block mt-6 bg-gradient-to-r from-pink-600 to-purple-600 text-white font-bold text-lg px-8 py-4 rounded-full shadow-lg hover:shadow-xl transition transform hover:scale-105"
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

export default TeachingStaff;