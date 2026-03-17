"use client";

import React from "react";
import { useNavigate } from "react-router-dom";
import student from "../img/student.jpg";

const LandingPage: React.FC = () => {
    const navigate = useNavigate();

    return (
        <div className="bg-slate-50 text-gray-800">

            {/* HERO */}
            <section className="bg-gradient-to-r from-blue-900 to-indigo-700 text-white py-16 px-6">
                <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-10 items-center">

                    <div>
                        <h1 className="text-4xl md:text-5xl font-bold mb-4">
                            Is Your Child Struggling in Maths or Science or Literacy?
                        </h1>

                        <p className="text-lg mb-6">
                            Get expert support with a <strong> British Curriculum Homeschool Programme </strong>
                            from <strong> Primary School to High School</strong>, shaping your child’s
                            <strong> international career path</strong>.
                        </p>

                        <div className="space-y-2 mb-6">
                            <p>✔ British Curriculum</p>
                            <p>✔ Small Classes & Individual Attention</p>
                            <p>✔ Live Interactive Lessons</p>
                            <p>✔ Moodle & CARE App Learning System</p>
                        </div>

                        <div className="flex gap-4 flex-wrap">
                            <button
                                onClick={() => navigate("/login")}
                                className="bg-yellow-400 text-black px-6 py-3 rounded-xl font-semibold shadow hover:bg-yellow-300 transition"
                            >
                                Register on Platform
                            </button>


                        </div>
                    </div>

                    <div>
                        <img
                            src={student}
                            alt="Student"
                            className="rounded-2xl shadow-lg w-full"
                        />
                    </div>
                </div>
            </section>

            {/* PROGRAM */}
            <section className="py-16 px-6 bg-white text-center">
                <h2 className="text-3xl font-bold mb-6">A Complete Learning Journey</h2>

                <p className="text-lg mb-10">
                    From Primary School to High School, preparing learners for global careers.
                </p>

                <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
                    <div className="p-6 shadow rounded-xl">
                        <h3 className="font-bold text-xl mb-2">Primary School</h3>
                        <p>Strong foundations in Maths, Science, and literacy.</p>
                    </div>

                    <div className="p-6 shadow rounded-xl">
                        <h3 className="font-bold text-xl mb-2">Middle School</h3>
                        <p>Concept mastery and critical thinking skills.</p>
                    </div>

                    <div className="p-6 shadow rounded-xl">
                        <h3 className="font-bold text-xl mb-2">High School</h3>
                        <p>Exam readiness and international career preparation.</p>
                    </div>
                </div>
            </section>

            {/* FEATURES */}
            <section className="bg-slate-100 py-16 px-6">
                <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-10">

                    <div>
                        <h2 className="text-3xl font-bold mb-6">Why Choose CARE Academy?</h2>

                        <ul className="space-y-3 text-lg">
                            <li>✔ British Curriculum aligned learning</li>
                            <li>✔ Small classes for personal attention</li>
                            <li>✔ Interactive live lessons</li>
                            <li>✔ Progress tracking via Moodle & CARE App</li>
                            <li>✔ Affordable monthly plans</li>
                        </ul>
                    </div>

                    <div className="bg-white p-8 rounded-2xl shadow text-center">
                        <h3 className="text-2xl font-bold mb-4">Affordable Pricing</h3>
                        <p className="text-4xl font-bold text-indigo-700 mb-2">From R2400</p>
                        <p className="mb-4">per month (Core Subjects + 2 Electives)</p>

                        <button
                            onClick={() => navigate("/about/enrolment")}
                            className="bg-indigo-600 text-white py-3 px-6 rounded-xl font-semibold hover:bg-indigo-500 transition"
                        >
                            Enrollment Info
                        </button>
                    </div>
                </div>
            </section>

            {/* CTA */}
            <section className="bg-indigo-700 text-white py-16 px-6 text-center">
                <h2 className="text-3xl font-bold mb-4">Limited Spaces Available</h2>

                <p className="mb-6">
                    Give your child the advantage of structured online education.
                </p>

                <button
                    onClick={() => navigate("/login")}
                    className="bg-yellow-400 text-black px-8 py-4 rounded-xl font-semibold shadow hover:bg-yellow-300 transition"
                >
                    Start Learning Today
                </button>
            </section>

            {/* FOOTER */}
            <footer className="bg-slate-900 text-white py-10 text-center">
                <p className="text-lg mb-2">Contact Tanya</p>
                <p className="text-xl font-semibold mb-6 pb-6">+27 84 666 0006</p>
            </footer>

            {/* FLOATING WHATSAPP */}
            <a
                href="https://wa.me/27826449390"
                target="_blank"
                className="fixed bottom-6 right-6 bg-green-500 text-white px-5 py-3 rounded-full shadow-lg hover:bg-green-600"
            >
                WhatsApp
            </a>
        </div>
    );
};

export default LandingPage;