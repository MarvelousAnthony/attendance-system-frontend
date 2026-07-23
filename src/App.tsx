import React, { useState } from "react";
import { LecturerSessionView } from "./components/LecturerSessionView";
import { StudentPortal } from "./components/StudentPortal";
import { AnalyticsDashboard } from "./components/AnalyticsDashboard";

type ViewMode = "lecturer" | "student" | "analytics";

export const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<ViewMode>("lecturer");

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col">
      {/* Universal Demo Switcher Header */}
      <div className="bg-indigo-950/40 border-b border-indigo-900/30 px-4 py-2 flex items-center justify-between text-xs">
        <span className="font-mono text-indigo-300 font-semibold uppercase tracking-wider">
          Demo Navigation Console
        </span>
        
        <div className="flex bg-slate-900 border border-slate-800 rounded-lg p-0.5 space-x-1">
          <button
            onClick={() => setCurrentView("lecturer")}
            className={`px-3 py-1 rounded-md font-bold transition-all ${
              currentView === "lecturer"
                ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/20"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            Lecturer View
          </button>
          <button
            onClick={() => setCurrentView("student")}
            className={`px-3 py-1 rounded-md font-bold transition-all ${
              currentView === "student"
                ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/20"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            Student Portal
          </button>
          <button
            onClick={() => setCurrentView("analytics")}
            className={`px-3 py-1 rounded-md font-bold transition-all ${
              currentView === "analytics"
                ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/20"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            Analytics Dashboard
          </button>
        </div>
      </div>

      {/* Render Selected View */}
      <div className="flex-1">
        {currentView === "lecturer" && (
          <LecturerSessionView />
        )}
        {currentView === "student" && (
          <StudentPortal />
        )}
        {currentView === "analytics" && (
          <AnalyticsDashboard />
        )}
      </div>
    </div>
  );
};
export default App;
