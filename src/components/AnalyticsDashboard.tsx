import React, { useState, useMemo } from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";

// TypeScript Interfaces
interface StudentMetric {
  id: string;
  name: string;
  email: string;
  studentId: string;
  attendedClasses: number;
  totalClasses: number;
  percentage: number;
}

interface WeeklyAttendance {
  week: string;
  rate: number;
}

interface ArrivalTrend {
  timeOffset: string;
  students: number;
}

// Custom Tooltip component for Recharts charts to match the premium theme
const CustomChartTooltip = ({ active, payload, label, valueSuffix = "" }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-slate-950/95 border border-slate-800 p-3 rounded-xl shadow-xl backdrop-blur-md">
        <p className="text-xs font-bold text-slate-400 mb-1">{label}</p>
        {payload.map((entry: any, index: number) => (
          <p key={index} className="text-sm font-semibold text-white">
            <svg className="inline-block w-2.5 h-2.5 mr-2" viewBox="0 0 10 10">
              <circle cx="5" cy="5" r="5" fill={entry.color || entry.fill} />
            </svg>
            {entry.name}: {entry.value}
            {valueSuffix}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

export const AnalyticsDashboard: React.FC = () => {
  // --- MOCK DATABASE METRICS ---

  // 1. Weekly Historical Rate (last 8 weeks)
  const weeklyData: WeeklyAttendance[] = [
    { week: "Week 1", rate: 82.4 },
    { week: "Week 2", rate: 84.1 },
    { week: "Week 3", rate: 86.8 },
    { week: "Week 4", rate: 85.3 },
    { week: "Week 5", rate: 89.2 },
    { week: "Week 6", rate: 91.5 },
    { week: "Week 7", rate: 88.7 },
    { week: "Week 8", rate: 90.9 },
  ];

  // 2. Arrival Distribution Curve (offset minutes from session start time)
  const arrivalData: ArrivalTrend[] = [
    { timeOffset: "-10m", students: 3 },
    { timeOffset: "-5m", students: 9 },
    { timeOffset: "0m", students: 16 },
    { timeOffset: "5m", students: 12 },
    { timeOffset: "10m", students: 7 }, // Late threshold marker
    { timeOffset: "15m", students: 4 },
    { timeOffset: "20m", students: 2 },
    { timeOffset: "25m", students: 1 },
    { timeOffset: "30m", students: 1 },
  ];

  // 3. Roster of 20 students representing class status
  const [students] = useState<StudentMetric[]>([
    { id: "s-1", name: "David Kim", email: "d.kim@university.edu", studentId: "std-1004", attendedClasses: 28, totalClasses: 30, percentage: 93.3 },
    { id: "s-2", name: "Sarah Jenkins", email: "s.jenkins@university.edu", studentId: "std-1001", attendedClasses: 27, totalClasses: 30, percentage: 90.0 },
    { id: "s-3", name: "Michael Chen", email: "m.chen@university.edu", studentId: "std-1002", attendedClasses: 29, totalClasses: 30, percentage: 96.7 },
    { id: "s-4", name: "Emily Rodriguez", email: "e.rod@university.edu", studentId: "std-1003", attendedClasses: 20, totalClasses: 30, percentage: 66.7 }, // Below 75%
    { id: "s-5", name: "James Wilson", email: "j.wilson@university.edu", studentId: "std-1005", attendedClasses: 25, totalClasses: 30, percentage: 83.3 },
    { id: "s-6", name: "Jessica Taylor", email: "j.taylor@university.edu", studentId: "std-1006", attendedClasses: 19, totalClasses: 30, percentage: 63.3 }, // Below 75%
    { id: "s-7", name: "Lucas Silva", email: "l.silva@university.edu", studentId: "std-1007", attendedClasses: 26, totalClasses: 30, percentage: 86.7 },
    { id: "s-8", name: "Sophia Muller", email: "s.muller@university.edu", studentId: "std-1008", attendedClasses: 22, totalClasses: 30, percentage: 73.3 }, // Below 75%
    { id: "s-9", name: "Robert Novak", email: "r.novak@university.edu", studentId: "std-1009", attendedClasses: 27, totalClasses: 30, percentage: 90.0 },
    { id: "s-10", name: "Amanda Martinez", email: "a.martinez@university.edu", studentId: "std-1010", attendedClasses: 21, totalClasses: 30, percentage: 70.0 }, // Below 75%
    { id: "s-11", name: "William Patel", email: "w.patel@university.edu", studentId: "std-1011", attendedClasses: 28, totalClasses: 30, percentage: 93.3 },
    { id: "s-12", name: "Olivia Smith", email: "o.smith@university.edu", studentId: "std-1012", attendedClasses: 25, totalClasses: 30, percentage: 83.3 },
    { id: "s-13", name: "John Doe", email: "j.doe@university.edu", studentId: "std-1013", attendedClasses: 24, totalClasses: 30, percentage: 80.0 },
    { id: "s-14", name: "Jane Miller", email: "j.miller@university.edu", studentId: "std-1014", attendedClasses: 18, totalClasses: 30, percentage: 60.0 }, // Below 75%
    { id: "s-15", name: "Brian O'Conner", email: "b.ocon@university.edu", studentId: "std-1015", attendedClasses: 30, totalClasses: 30, percentage: 100.0 },
    { id: "s-16", name: "Clara Oswald", email: "c.oswald@university.edu", studentId: "std-1016", attendedClasses: 27, totalClasses: 30, percentage: 90.0 },
    { id: "s-17", name: "Danielle Brooks", email: "d.brooks@university.edu", studentId: "std-1017", attendedClasses: 23, totalClasses: 30, percentage: 76.7 },
    { id: "s-18", name: "Edward Elric", email: "e.elric@university.edu", studentId: "std-1018", attendedClasses: 15, totalClasses: 30, percentage: 50.0 }, // Below 75%
    { id: "s-19", name: "Fiona Gallagher", email: "f.galla@university.edu", studentId: "std-1019", attendedClasses: 21, totalClasses: 30, percentage: 70.0 }, // Below 75%
    { id: "s-20", name: "George Costanza", email: "g.costa@university.edu", studentId: "std-1020", attendedClasses: 14, totalClasses: 30, percentage: 46.7 }, // Below 75%
  ]);

  // --- STATE FOR PAGINATION AND SORTING ---
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [sortField, setSortField] = useState<"name" | "attendedClasses" | "percentage">("name");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const rowsPerPage = 6;

  // --- KPI COMPUTATIONS ---
  const kpis = useMemo(() => {
    const totalPercentage = students.reduce((acc, curr) => acc + curr.percentage, 0);
    const averageAttendance = (totalPercentage / students.length).toFixed(1);
    const atRiskCount = students.filter((s) => s.percentage < 70.0).length;

    return {
      averageAttendance,
      totalSessions: 30,
      atRiskCount,
    };
  }, [students]);

  // --- SORT AND PAGINATE LOGIC ---
  const handleSort = (field: "name" | "attendedClasses" | "percentage") => {
    if (sortField === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortOrder("asc");
    }
    setCurrentPage(1); // Reset page on sort
  };

  const processedStudents = useMemo(() => {
    const sorted = [...students].sort((a, b) => {
      let comparison = 0;
      if (sortField === "name") {
        comparison = a.name.localeCompare(b.name);
      } else {
        comparison = a[sortField] - b[sortField];
      }
      return sortOrder === "asc" ? comparison : -comparison;
    });

    // Pagination slice
    const startIndex = (currentPage - 1) * rowsPerPage;
    return {
      data: sorted.slice(startIndex, startIndex + rowsPerPage),
      totalLength: sorted.length,
      totalPages: Math.ceil(sorted.length / rowsPerPage),
    };
  }, [students, sortField, sortOrder, currentPage]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col p-4 md:p-8 font-sans space-y-8">
      {/* Title Header */}
      <div>
        <h1 className="text-3xl font-extrabold text-white tracking-tight">Analytics & Reporting</h1>
        <p className="text-sm text-slate-400 mt-1">Class status metrics and attendance logs summary</p>
      </div>

      {/* 1. METRIC GRID (KPI CARDS) */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Average Attendance Card */}
        <div className="bg-slate-900/60 backdrop-blur-xl border border-slate-800/80 rounded-3xl p-6 shadow-2xl flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-slate-500 uppercase tracking-widest block">Average Attendance</span>
            <span className="text-4xl font-extrabold text-emerald-400 mt-2 block">{kpis.averageAttendance}%</span>
            <span className="text-[10px] font-semibold text-slate-400 mt-1 block">Across all active lectures</span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
        </div>

        {/* Total Active Sessions Card */}
        <div className="bg-slate-900/60 backdrop-blur-xl border border-slate-800/80 rounded-3xl p-6 shadow-2xl flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-slate-500 uppercase tracking-widest block">Total Sessions</span>
            <span className="text-4xl font-extrabold text-indigo-400 mt-2 block">{kpis.totalSessions}</span>
            <span className="text-[10px] font-semibold text-slate-400 mt-1 block">Scheduled semester classes</span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
        </div>

        {/* Students Below Threshold Card */}
        <div className="bg-slate-900/60 backdrop-blur-xl border border-slate-800/80 rounded-3xl p-6 shadow-2xl flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-slate-500 uppercase tracking-widest block">At-Risk Students</span>
            <span className="text-4xl font-extrabold text-rose-500 mt-2 block">{kpis.atRiskCount}</span>
            <span className="text-[10px] font-semibold text-slate-400 mt-1 block">Below the 70% critical limit</span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-500">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
        </div>

      </section>

      {/* 2. CHARTS VIEW SECTION */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Historical Weekly Attendance (Bar Chart) */}
        <div className="bg-slate-900/60 backdrop-blur-xl border border-slate-800/80 rounded-3xl p-6 shadow-2xl flex flex-col">
          <div className="mb-4">
            <h3 className="text-lg font-bold text-white">Historical Weekly Attendance</h3>
            <p className="text-xs text-slate-500 mt-0.5">Average weekly attendance rate percentages</p>
          </div>
          
          <div className="w-full h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={weeklyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                <XAxis dataKey="week" stroke="#64748b" fontSize={11} tickLine={false} />
                <YAxis domain={[50, 100]} stroke="#64748b" fontSize={11} tickLine={false} />
                <Tooltip content={<CustomChartTooltip valueSuffix="%" />} cursor={{ fill: "#1e293b", opacity: 0.4 }} />
                <Bar dataKey="rate" name="Attendance Rate" fill="#6366f1" radius={[6, 6, 0, 0]} maxBarSize={38} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Student Arrival Distribution (Line Chart) */}
        <div className="bg-slate-900/60 backdrop-blur-xl border border-slate-800/80 rounded-3xl p-6 shadow-2xl flex flex-col">
          <div className="mb-4">
            <h3 className="text-lg font-bold text-white">Arrival Time Distribution</h3>
            <p className="text-xs text-slate-500 mt-0.5">Tardiness trend showing check-in timing relative to start time</p>
          </div>
          
          <div className="w-full h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={arrivalData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                <XAxis dataKey="timeOffset" stroke="#64748b" fontSize={11} tickLine={false} />
                <YAxis stroke="#64748b" fontSize={11} tickLine={false} />
                <Tooltip content={<CustomChartTooltip />} />
                <Line
                  type="monotone"
                  dataKey="students"
                  name="Students Checked-In"
                  stroke="#10b981"
                  strokeWidth={3}
                  activeDot={{ r: 6 }}
                  dot={{ strokeWidth: 2, r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

      </section>

      {/* 3. PAGINATED STUDENT ROSTER TABLE */}
      <section className="bg-slate-900/60 backdrop-blur-xl border border-slate-800/80 rounded-3xl p-6 shadow-2xl flex flex-col">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div>
            <h3 className="text-xl font-bold text-white">Academic Roster</h3>
            <p className="text-xs text-slate-500 mt-0.5">Full class list sorting and critical status warnings</p>
          </div>
          <div className="flex items-center space-x-2">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500/20 border border-rose-500/30 block" />
            <span className="text-[10px] font-bold text-rose-400 uppercase tracking-wider">Highlight indicates Critical (&lt;75%)</span>
          </div>
        </div>

        {/* Responsive Table Wrapper */}
        <div className="overflow-x-auto min-h-[360px]">
          <table className="w-full border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-slate-800 text-slate-500 text-xs font-semibold uppercase tracking-wider">
                <th
                  onClick={() => handleSort("name")}
                  className="pb-3 cursor-pointer hover:text-white select-none transition-colors"
                >
                  Student Details{" "}
                  {sortField === "name" && (sortOrder === "asc" ? "▲" : "▼")}
                </th>
                <th className="pb-3">Student ID</th>
                <th
                  onClick={() => handleSort("attendedClasses")}
                  className="pb-3 cursor-pointer hover:text-white select-none transition-colors"
                >
                  Attended{" "}
                  {sortField === "attendedClasses" && (sortOrder === "asc" ? "▲" : "▼")}
                </th>
                <th
                  onClick={() => handleSort("percentage")}
                  className="pb-3 cursor-pointer hover:text-white select-none transition-colors"
                >
                  Attendance Rate{" "}
                  {sortField === "percentage" && (sortOrder === "asc" ? "▲" : "▼")}
                </th>
                <th className="pb-3 text-right">Academic Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {processedStudents.data.map((student) => {
                const isCritical = student.percentage < 70.0;
                return (
                  <tr
                    key={student.id}
                    className={`transition-colors duration-200 ${
                      isCritical
                        ? "bg-rose-950/10 hover:bg-rose-950/20 text-rose-100"
                        : "hover:bg-slate-900/40 text-slate-200"
                    }`}
                  >
                    {/* User profile details */}
                    <td className="py-4 pr-3">
                      <div className="flex items-center space-x-3">
                        <div className={`w-9 h-9 rounded-full flex items-center justify-center border font-bold text-xs shadow-inner flex-shrink-0 ${
                          isCritical
                            ? "bg-rose-500/10 border-rose-500/20 text-rose-400"
                            : "bg-indigo-500/10 border-indigo-500/20 text-indigo-300"
                        }`}>
                          {student.name.split(" ").map((n) => n[0]).join("")}
                        </div>
                        <div>
                          <p className="font-semibold">{student.name}</p>
                          <p className="text-slate-500 text-[10px] font-medium font-mono">{student.email}</p>
                        </div>
                      </div>
                    </td>

                    {/* ID */}
                    <td className="py-4 font-mono text-xs text-slate-400">{student.studentId}</td>

                    {/* Attended Counts */}
                    <td className="py-4 font-medium">
                      {student.attendedClasses} <span className="text-slate-500 font-normal">/ {student.totalClasses}</span>
                    </td>

                    {/* Percent Rate */}
                    <td className="py-4 font-semibold">
                      <span className={isCritical ? "text-rose-400" : "text-emerald-400"}>
                        {student.percentage}%
                      </span>
                    </td>

                    {/* Flag Badges */}
                    <td className="py-4 text-right">
                      {isCritical ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/20 animate-pulse">
                          Critical Risk
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          Stable
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* 4. TABLE PAGINATION CONTROLS */}
        <div className="flex items-center justify-between pt-6 border-t border-slate-800/80 mt-4">
          <span className="text-xs text-slate-500 font-medium">
            Page {currentPage} of {processedStudents.totalPages}
          </span>
          
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="px-3.5 py-1.5 bg-slate-900 border border-slate-800 rounded-xl text-xs font-semibold text-slate-400 hover:text-white disabled:opacity-40 disabled:hover:text-slate-400 active:scale-95 transition-all"
            >
              Previous
            </button>
            <button
              onClick={() => setCurrentPage((p) => Math.min(processedStudents.totalPages, p + 1))}
              disabled={currentPage === processedStudents.totalPages}
              className="px-3.5 py-1.5 bg-slate-900 border border-slate-800 rounded-xl text-xs font-semibold text-slate-400 hover:text-white disabled:opacity-40 disabled:hover:text-slate-400 active:scale-95 transition-all"
            >
              Next
            </button>
          </div>
        </div>

      </section>
    </div>
  );
};
export default AnalyticsDashboard;
