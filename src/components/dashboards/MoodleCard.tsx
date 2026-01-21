import { ExternalLink, BookOpen } from "lucide-react";

export default function MoodleCard() {
  const MOODLE_URL = "https://classroom.bateleureducation.co.za/login/index.php";

  return (
    <a
      href={MOODLE_URL}
      target="_blank"
      rel="noopener noreferrer"
      className="group block"
    >
      <div className="bg-white border border-slate-100 rounded-[2rem] p-6 shadow-sm hover:shadow-xl transition-all cursor-pointer">
        <div className="flex items-center justify-between mb-4">
          <div className="bg-indigo-50 text-indigo-600 p-3 rounded-xl">
            <BookOpen size={22} />
          </div>
          <ExternalLink className="text-slate-300 group-hover:text-indigo-500 transition" size={18} />
        </div>

        <p className="font-black text-sm text-slate-800 mb-1 uppercase tracking-wide">
          Moodle
        </p>

        <p className="text-xs text-slate-500 font-medium">
          Access teaching resources, lesson plans, assessments, and digital content.
        </p>
      </div>
    </a>
  );
}
