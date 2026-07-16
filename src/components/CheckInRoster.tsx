import React from "react";
import type { AttendanceRecord } from "../types";

interface CheckInRosterProps {
  records: AttendanceRecord[];
  totalRegistered: number;
  isLoading: boolean;
  error: string | null;
  onRetry: () => void;
}

export const CheckInRoster: React.FC<CheckInRosterProps> = ({
  records,
  totalRegistered,
  isLoading,
  error,
  onRetry,
}) => {
  const presentCount = records.length;

  const formatTimestamp = (isoStr: string) => {
    return new Date(isoStr).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    });
  };

  const getStatusBadge = (status: AttendanceRecord["status"]) => {
    switch (status) {
      case "present":
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            Present
          </span>
        );
      case "late":
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
            Late
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-500/10 text-slate-400 border border-slate-500/20">
            Absent
          </span>
        );
    }
  };

  return (
    <div className="flex flex-col bg-slate-900/60 backdrop-blur-xl border border-slate-800/80 rounded-3xl p-8 shadow-2xl h-full min-h-[500px] transition-all duration-300 hover:border-indigo-500/30">
      {/* Roster Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between pb-6 border-b border-slate-800/60 gap-4 mb-6">
        <div>
          <h3 className="text-2xl font-bold text-white tracking-tight">Roster Status</h3>
          <p className="text-sm text-slate-400 mt-1">Real-time attendance log</p>
        </div>
        
        {/* Count Stats Badge */}
        <div className="flex items-center space-x-3 bg-slate-950/60 border border-slate-800 rounded-2xl px-5 py-3 shadow-inner">
          <div className="text-center">
            <span className="block text-2xl font-extrabold text-indigo-400">{presentCount}</span>
            <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Present</span>
          </div>
          <div className="h-8 w-[1px] bg-slate-800" />
          <div className="text-center">
            <span className="block text-2xl font-extrabold text-slate-300">{totalRegistered}</span>
            <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Total</span>
          </div>
        </div>
      </div>

      {/* Roster State Content */}
      <div className="flex-1 flex flex-col min-h-0 overflow-y-auto">
        {isLoading && records.length === 0 && (
          <div className="flex-1 flex flex-col justify-center items-center py-12 space-y-4">
            <div className="w-10 h-10 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin" />
            <p className="text-sm text-slate-400">Syncing live roster...</p>
          </div>
        )}

        {error && (
          <div className="bg-rose-950/20 border border-rose-900/50 rounded-2xl p-6 text-center mb-6">
            <svg className="w-10 h-10 text-rose-500 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <p className="text-sm font-semibold text-rose-400">Roster connection disrupted</p>
            <p className="text-xs text-slate-500 mt-1">{error}</p>
            <button
              onClick={onRetry}
              className="mt-4 px-4 py-2 bg-rose-600/30 hover:bg-rose-600/40 text-rose-300 text-xs font-semibold rounded-lg border border-rose-500/30 active:scale-95 transition-all"
            >
              Reconnect
            </button>
          </div>
        )}

        {!isLoading && !error && records.length === 0 && (
          <div className="flex-1 flex flex-col justify-center items-center py-16 text-center">
            <div className="w-16 h-16 rounded-full bg-slate-950 flex items-center justify-center border border-slate-900 mb-4 animate-pulse">
              <svg className="w-8 h-8 text-indigo-400/80" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            </div>
            <h4 className="text-base font-semibold text-slate-200">No Check-ins Yet</h4>
            <p className="text-xs text-slate-500 mt-1 max-w-xs leading-relaxed">
              Attendance records will dynamically render here in real-time as students scan the QR code.
            </p>
          </div>
        )}

        {records.length > 0 && (
          <div className="space-y-3 pr-2">
            {records.map((student) => (
              <div
                key={student.id}
                className="flex items-center justify-between p-4 bg-slate-950/40 border border-slate-900 rounded-2xl hover:border-slate-800 transition-all duration-300 animate-fadeIn"
              >
                {/* Student Identity */}
                <div className="flex items-center space-x-3.5 min-w-0">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500/10 to-indigo-600/30 flex items-center justify-center border border-indigo-500/20 shadow-inner flex-shrink-0">
                    <span className="text-xs font-bold text-indigo-300">
                      {student.studentName
                        ? student.studentName.slice(0, 2).toUpperCase()
                        : "ST"}
                    </span>
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-white truncate">
                      {student.studentName || `Student ID: ${student.studentId.slice(0, 8)}...`}
                    </p>
                    <p className="text-[10px] font-medium text-slate-500 font-mono mt-0.5 truncate">
                      Device: {student.deviceHash.slice(0, 12)}...
                    </p>
                  </div>
                </div>

                {/* Badge & Timestamp info */}
                <div className="flex items-center space-x-4 pl-4 flex-shrink-0">
                  {getStatusBadge(student.status)}
                  <span className="text-xs font-mono font-semibold text-slate-400 bg-slate-950 border border-slate-900 rounded-md px-2 py-1">
                    {formatTimestamp(student.timestamp)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
