import React, { useState } from "react";
import { LecturerSessionView } from "./components/LecturerSessionView";
import { StudentPortal } from "./components/StudentPortal";
import { AnalyticsDashboard } from "./components/AnalyticsDashboard";

type ViewMode = "landing" | "student" | "lecturer" | "lecturer-login" | "analytics" | "analytics-login";

export const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<ViewMode>("landing");
  const [lecturerEmail, setLecturerEmail] = useState("elizabeth.vance@university.edu");
  const [lecturerPwd, setLecturerPwd] = useState("");
  const [adminEmail, setAdminEmail] = useState("admin@university.edu");
  const [adminPwd, setAdminPwd] = useState("");

  const handleLecturerLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (lecturerEmail === "elizabeth.vance@university.edu" && lecturerPwd === "password") {
      setCurrentView("lecturer");
    } else {
      alert("Invalid lecturer credentials. Use:\nEmail: elizabeth.vance@university.edu\nPassword: password");
    }
  };

  const handleAdminLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (adminEmail === "admin@university.edu" && adminPwd === "password") {
      setCurrentView("analytics");
    } else {
      alert("Invalid administrator credentials. Use:\nEmail: admin@university.edu\nPassword: password");
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-indigo-500/30">
      {currentView === "landing" && (
        <div className="flex-1 flex flex-col items-center justify-center p-4 md:p-8 max-w-5xl mx-auto w-full space-y-12">
          {/* Institution Branding */}
          <div className="text-center space-y-3">
            <div className="inline-flex items-center space-x-2 bg-indigo-500/10 border border-indigo-500/25 px-4 py-1.5 rounded-full text-indigo-400 text-xs font-bold tracking-widest uppercase">
              🏫 Institutional Attendance Portal
            </div>
            <h1 className="text-4xl md:text-6xl font-black text-white tracking-tight leading-none bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">
              QR Attend & Verify
            </h1>
            <p className="text-sm md:text-base text-slate-400 max-w-md mx-auto">
              Secure, anti-cheating, biometric-verified check-in system for university courses.
            </p>
          </div>

          {/* Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full">
            {/* Student Card */}
            <div 
              onClick={() => setCurrentView("student")}
              className="bg-slate-900/40 backdrop-blur-xl border border-slate-800/80 hover:border-indigo-500/40 rounded-3xl p-6 shadow-2xl transition-all duration-300 hover:-translate-y-1 cursor-pointer flex flex-col justify-between group"
            >
              <div className="space-y-4">
                <div className="w-12 h-12 rounded-2xl bg-indigo-500/15 border border-indigo-500/20 flex items-center justify-center text-indigo-400 group-hover:bg-indigo-500 group-hover:text-white transition-all">
                  🎓
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white group-hover:text-indigo-400 transition-all">Student Portal</h3>
                  <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                    Scan dynamic session QR codes, register face ID biometric profiles, and view your real-time attendance logs.
                  </p>
                </div>
              </div>
              <div className="mt-6 flex items-center text-xs font-bold text-indigo-400 group-hover:text-indigo-300">
                Enter Portal &rarr;
              </div>
            </div>

            {/* Lecturer Card */}
            <div 
              onClick={() => setCurrentView("lecturer-login")}
              className="bg-slate-900/40 backdrop-blur-xl border border-slate-800/80 hover:border-emerald-500/40 rounded-3xl p-6 shadow-2xl transition-all duration-300 hover:-translate-y-1 cursor-pointer flex flex-col justify-between group"
            >
              <div className="space-y-4">
                <div className="w-12 h-12 rounded-2xl bg-emerald-500/15 border border-emerald-500/20 flex items-center justify-center text-emerald-400 group-hover:bg-emerald-500 group-hover:text-white transition-all">
                  👨‍🏫
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white group-hover:text-emerald-400 transition-all">Lecturer Console</h3>
                  <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                    Register courses, configure grace & lateness rules, generate dynamic anti-proxy QR codes, and monitor check-ins.
                  </p>
                </div>
              </div>
              <div className="mt-6 flex items-center text-xs font-bold text-emerald-400 group-hover:text-emerald-300">
                Lecturer Login &rarr;
              </div>
            </div>

            {/* Admin Card */}
            <div 
              onClick={() => setCurrentView("analytics-login")}
              className="bg-slate-900/40 backdrop-blur-xl border border-slate-800/80 hover:border-rose-500/40 rounded-3xl p-6 shadow-2xl transition-all duration-300 hover:-translate-y-1 cursor-pointer flex flex-col justify-between group"
            >
              <div className="space-y-4">
                <div className="w-12 h-12 rounded-2xl bg-rose-500/15 border border-rose-500/20 flex items-center justify-center text-rose-400 group-hover:bg-rose-500 group-hover:text-white transition-all">
                  📊
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white group-hover:text-rose-400 transition-all">Admin Analytics</h3>
                  <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                    Access institutional reporting charts, monitor attendance percentages, flag at-risk students, and audit logs.
                  </p>
                </div>
              </div>
              <div className="mt-6 flex items-center text-xs font-bold text-rose-400 group-hover:text-rose-300">
                Admin Sign In &rarr;
              </div>
            </div>
          </div>
        </div>
      )}

      {currentView === "lecturer-login" && (
        <div className="flex-1 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 max-w-md w-full shadow-2xl space-y-6">
            <div className="text-center space-y-1">
              <h2 className="text-2xl font-bold text-white">Lecturer Login</h2>
              <p className="text-xs text-slate-400">Sign in to manage your classes and QR sessions</p>
            </div>
            <form onSubmit={handleLecturerLogin} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Email Address</label>
                <input
                  type="email"
                  value={lecturerEmail}
                  onChange={(e) => setLecturerEmail(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-indigo-500 transition-all"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Password</label>
                <input
                  type="password"
                  placeholder="password"
                  value={lecturerPwd}
                  onChange={(e) => setLecturerPwd(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-indigo-500 transition-all"
                  required
                />
              </div>
              <button
                type="submit"
                className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl transition-all shadow-lg shadow-indigo-600/25 active:scale-98 cursor-pointer text-sm"
              >
                Log In
              </button>
            </form>
            <button
              onClick={() => setCurrentView("landing")}
              className="w-full text-center text-xs text-slate-500 hover:text-slate-300 font-semibold cursor-pointer"
            >
              &larr; Back to Portal Hub
            </button>
          </div>
        </div>
      )}

      {currentView === "analytics-login" && (
        <div className="flex-1 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 max-w-md w-full shadow-2xl space-y-6">
            <div className="text-center space-y-1">
              <h2 className="text-2xl font-bold text-white">Administrator Login</h2>
              <p className="text-xs text-slate-400">Sign in to access campus attendance data and metrics</p>
            </div>
            <form onSubmit={handleAdminLogin} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Admin Email</label>
                <input
                  type="email"
                  value={adminEmail}
                  onChange={(e) => setAdminEmail(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-indigo-500 transition-all"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Password</label>
                <input
                  type="password"
                  placeholder="password"
                  value={adminPwd}
                  onChange={(e) => setAdminPwd(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-indigo-500 transition-all"
                  required
                />
              </div>
              <button
                type="submit"
                className="w-full py-2.5 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-xl transition-all shadow-lg shadow-rose-600/25 active:scale-98 cursor-pointer text-sm"
              >
                Log In
              </button>
            </form>
            <button
              onClick={() => setCurrentView("landing")}
              className="w-full text-center text-xs text-slate-500 hover:text-slate-300 font-semibold cursor-pointer"
            >
              &larr; Back to Portal Hub
            </button>
          </div>
        </div>
      )}

      {/* Render Selected View */}
      <div className="flex-1 flex flex-col">
        {currentView === "lecturer" && (
          <div className="flex-1 flex flex-col relative">
            <button
              onClick={() => setCurrentView("landing")}
              className="absolute top-4 right-4 z-50 px-3 py-1.5 bg-slate-900 border border-slate-800 hover:bg-slate-850 text-slate-400 hover:text-white rounded-lg text-xs font-bold cursor-pointer transition-colors"
            >
              🚪 Exit Portal
            </button>
            <LecturerSessionView />
          </div>
        )}
        {currentView === "student" && (
          <div className="flex-1 flex flex-col relative">
            <button
              onClick={() => setCurrentView("landing")}
              className="absolute top-4 right-4 z-50 px-3 py-1.5 bg-slate-900 border border-slate-800 hover:bg-slate-850 text-slate-400 hover:text-white rounded-lg text-xs font-bold cursor-pointer transition-colors"
            >
              🚪 Exit Portal
            </button>
            <StudentPortal />
          </div>
        )}
        {currentView === "analytics" && (
          <div className="flex-1 flex flex-col relative">
            <button
              onClick={() => setCurrentView("landing")}
              className="absolute top-4 right-4 z-50 px-3 py-1.5 bg-slate-900 border border-slate-800 hover:bg-slate-850 text-slate-400 hover:text-white rounded-lg text-xs font-bold cursor-pointer transition-colors"
            >
              🚪 Exit Portal
            </button>
            <AnalyticsDashboard />
          </div>
        )}
      </div>
    </div>
  );
};
export default App;
