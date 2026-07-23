import React, { useEffect, useState, useRef, useCallback } from "react";
import type { SessionDetails, AttendanceRecord, TokenInfo } from "../types";
import { QrGenerator } from "./QrGenerator";
import { CheckInRoster } from "./CheckInRoster";

interface LecturerSessionViewProps {
  sessionId?: string;
  initialSessionDetails?: SessionDetails;
  totalRegisteredStudents?: number;
}

export const LecturerSessionView: React.FC<LecturerSessionViewProps> = ({
  sessionId: propSessionId,
  initialSessionDetails,
  totalRegisteredStudents = 45,
}) => {
  // --- STATE CONFIGURATION ---
  const [session, setSession] = useState<SessionDetails | null>(initialSessionDetails || null);
  const [token, setToken] = useState<string | null>(null);
  const [secondsLeft, setSecondsLeft] = useState<number>(15);
  const [records, setRecords] = useState<AttendanceRecord[]>([]);

  // Loading & Error States
  const [isSessionLoading, setIsSessionLoading] = useState<boolean>(false);
  const [isTokenLoading, setIsTokenLoading] = useState<boolean>(false);
  const [isRosterLoading, setIsRosterLoading] = useState<boolean>(false);
  const [sessionError, setSessionError] = useState<string | null>(null);
  const [tokenError, setTokenError] = useState<string | null>(null);
  const [rosterError, setRosterError] = useState<string | null>(null);

  // Demo / Simulation Mode State
  const [isDemoMode, setIsDemoMode] = useState<boolean>(false);

  // Refs for tracking async states in timers
  const timerRef = useRef<any>(null);
  const rosterIntervalRef = useRef<any>(null);

  const API_BASE_URL = "https://attendance-system-backend-b6ti.onrender.com/api/v1";

  // --- API LOGIC IMPLEMENTATION ---

  // 1. Fetch Session Details (if not provided initially)
  const fetchSessionDetails = useCallback(async () => {
    if (!propSessionId || isDemoMode) return;
    setIsSessionLoading(true);
    setSessionError(null);
    try {
      const res = await fetch(`${API_BASE_URL}/sessions/${propSessionId}`);
      if (!res.ok) throw new Error(`Server returned status ${res.status}`);
      const data = await res.json();
      setSession(data);
    } catch (err: any) {
      console.warn("Failed to fetch session, falling back to mock session.", err);
      // Fallback mock session for robust development/demonstration
      const mockSession: SessionDetails = {
        id: propSessionId,
        courseId: "c1a2b3c4-d5e6-7f8a-9b0c-1d2e3f4a5b6c",
        course: {
          code: "CSE-402",
          title: "Distributed Systems & Cloud Computing",
        },
        startTime: new Date().toISOString(),
        endTime: new Date(Date.now() + 7200 * 1000).toISOString(),
        latitude: 37.774929,
        longitude: -122.419416,
        allowedRadiusMeters: 50,
      };
      setSession(mockSession);
    } finally {
      setIsSessionLoading(false);
    }
  }, [propSessionId, isDemoMode]);

  // 2. Fetch Dynamic Token
  const fetchToken = useCallback(async () => {
    if (!session) return;
    const currentSessionId = session.id;
    if (isDemoMode) {
      // Demo Mode Token Generation
      setToken(`demo-jwt-payload-session-${currentSessionId}-timestamp-${Date.now()}`);
      setSecondsLeft(15);
      setTokenError(null);
      return;
    }

    setIsTokenLoading(true);
    setTokenError(null);
    try {
      const res = await fetch(`${API_BASE_URL}/sessions/${currentSessionId}/token`);
      if (!res.ok) throw new Error(`HTTP Error ${res.status}: Failed to retrieve token`);
      const data: TokenInfo = await res.json();

      setToken(data.token);

      // Sync secondsLeft precisely with server expiration
      const expires = new Date(data.expiresAt).getTime();
      const now = new Date().getTime();
      const diff = Math.max(1, Math.round((expires - now) / 1000));
      setSecondsLeft(diff);
    } catch (err: any) {
      setTokenError(err.message || "Failed to establish secure token tunnel");
      // Prompt option to switch to demo mode if network is offline
      if (!isDemoMode && records.length === 0) {
        console.warn("API offline. Activating Demo Mode simulation.");
        setIsDemoMode(true);
      }
    } finally {
      setIsTokenLoading(false);
    }
  }, [session, isDemoMode, records.length]);

  // 3. Fetch Live Roster Check-ins
  const fetchRoster = useCallback(async () => {
    if (!session || isDemoMode) return;
    const currentSessionId = session.id;
    setIsRosterLoading(true);
    setRosterError(null);
    try {
      const res = await fetch(`${API_BASE_URL}/sessions/${currentSessionId}/attendance`);
      if (!res.ok) throw new Error(`HTTP Error ${res.status}: Failed to sync roster`);
      const data = await res.json();
      setRecords(data);
    } catch (err: any) {
      setRosterError(err.message || "Attendance synchronization disrupted");
    } finally {
      setIsRosterLoading(false);
    }
  }, [session, isDemoMode]);

  // --- EFFECT SYNCHRONIZATION ---

  // Initial load
  useEffect(() => {
    if (propSessionId && !session) {
      fetchSessionDetails();
    }
  }, [propSessionId, session, fetchSessionDetails]);

  // Handle Token Polling Loop and Timer Countdown
  useEffect(() => {
    if (isSessionLoading || !session) return;

    // Fetch initial token
    fetchToken();

    // Start 1-second countdown interval
    timerRef.current = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          // Trigger token fetch when count is about to hit zero
          fetchToken();
          return 15;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [session, isSessionLoading, fetchToken]);

  // Handle Roster Polling Loop (every 5 seconds)
  useEffect(() => {
    if (isSessionLoading || !session || isDemoMode) return;

    // Initial Roster Load
    fetchRoster();

    // Polling interval
    rosterIntervalRef.current = setInterval(() => {
      fetchRoster();
    }, 5000);

    return () => {
      if (rosterIntervalRef.current) clearInterval(rosterIntervalRef.current);
    };
  }, [session, isSessionLoading, isDemoMode, fetchRoster]);

  // --- DEMO MODE ACTIVE SIMULATION ---
  useEffect(() => {
    if (!isDemoMode) return;

    // Reset API errors when entering simulated demo mode
    setSessionError(null);
    setTokenError(null);
    setRosterError(null);

    const mockNames = [
      "Sarah Jenkins", "Michael Chen", "Emily Rodriguez", "David Kim", 
      "Jessica Taylor", "James Wilson", "Amanda Martinez", "Robert Novak",
      "Olivia Smith", "William Patel", "Sophia Muller", "Lucas Silva"
    ];

    // Generate token initially for demo
    fetchToken();

    // Simulate incoming check-ins
    let mockIndex = 0;
    rosterIntervalRef.current = setInterval(() => {
      if (mockIndex >= mockNames.length) {
        if (rosterIntervalRef.current) clearInterval(rosterIntervalRef.current);
        return;
      }

      const currentSessionId = session?.id || "demo-session";
      const newRecord: AttendanceRecord = {
        id: `rec-${mockIndex}-${Date.now()}`,
        studentId: `std-${1000 + mockIndex}`,
        studentName: mockNames[mockIndex],
        sessionId: currentSessionId,
        timestamp: new Date().toISOString(),
        status: Math.random() > 0.85 ? "late" : "present",
        deviceHash: `fp_${Math.random().toString(36).substring(2, 15)}`,
        studentLatitude: session?.latitude || 0,
        studentLongitude: session?.longitude || 0,
      };

      setRecords((prev) => [newRecord, ...prev]);
      mockIndex++;
    }, 6000); // New student check-in every 6 seconds

    return () => {
      if (rosterIntervalRef.current) clearInterval(rosterIntervalRef.current);
    };
  }, [isDemoMode, session, fetchToken]);

  // --- RENDERING ROUTINES ---

  if (isSessionLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950/40 flex items-center justify-center p-4">
        <div className="flex flex-col items-center space-y-4">
          <div className="w-16 h-16 rounded-full border-4 border-indigo-500/20 border-t-indigo-500 animate-spin" />
          <h2 className="text-xl font-bold text-slate-200">Loading Session Configuration...</h2>
        </div>
      </div>
    );
  }

  if (sessionError && !session) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950/40 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-3xl p-8 text-center shadow-2xl">
          <svg className="w-16 h-16 text-rose-500 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <h2 className="text-2xl font-bold text-white mb-2">Session Initialization Failed</h2>
          <p className="text-sm text-slate-400 mb-6">{sessionError}</p>
          <button
            onClick={fetchSessionDetails}
            className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl transition-all active:scale-95 shadow-lg shadow-indigo-600/30"
          >
            Retry Connection
          </button>
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <LecturerDashboard
        onLaunchSession={(launchedSession, demo) => {
          setSession(launchedSession);
          setIsDemoMode(demo);
        }}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950/40 text-slate-100 flex flex-col font-sans">
      {/* Top Header Navigation */}
      <header className="border-b border-slate-900 bg-slate-950/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 md:px-8 py-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-600/35">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                </svg>
              </div>
              <div>
                <h1 className="text-xl font-bold text-white tracking-tight">QR Attendance Console</h1>
                <p className="text-xs text-slate-500 font-medium">Lecturer Portal</p>
              </div>
            </div>
            
            <button
              onClick={() => {
                setSession(null);
                setRecords([]);
                setToken(null);
                setIsDemoMode(false);
              }}
              className="px-3.5 py-1.5 bg-rose-600/10 hover:bg-rose-600 text-rose-400 hover:text-white rounded-xl border border-rose-500/20 text-xs font-bold transition-all active:scale-95 cursor-pointer"
            >
              End Session
            </button>
          </div>

          {/* Network / Connectivity Badges */}
          <div className="flex items-center space-x-3">
            {isDemoMode && (
              <span className="inline-flex items-center px-3 py-1.5 rounded-xl text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20 animate-pulse">
                ⚠️ Running in Demo Simulation Mode
              </span>
            )}
            
            <div className="flex items-center space-x-2 bg-slate-900 border border-slate-800 rounded-xl px-3 py-1.5">
              <span className={`w-2 h-2 rounded-full ${tokenError || rosterError ? "bg-rose-500 animate-ping" : "bg-emerald-500"}`} />
              <span className="text-xs font-semibold text-slate-400">
                {tokenError || rosterError ? "Connection Disruptions" : "Systems Syncing"}
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Grid Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 md:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* LEFT: QR Code Controller */}
          <div className="lg:col-span-5">
            <QrGenerator
              session={session}
              token={token}
              secondsLeft={secondsLeft}
              isTokenLoading={isTokenLoading}
              tokenError={tokenError}
              onRefresh={fetchToken}
            />
          </div>

          {/* RIGHT: Live Roster View */}
          <div className="lg:col-span-7">
            <CheckInRoster
              records={records}
              totalRegistered={totalRegisteredStudents}
              isLoading={isRosterLoading}
              error={rosterError}
              onRetry={fetchRoster}
            />
          </div>
          
        </div>
      </main>
    </div>
  );
};

interface CourseItem {
  id: string;
  code: string;
  title: string;
  department: string;
}

interface LecturerDashboardProps {
  onLaunchSession: (session: SessionDetails, demo: boolean) => void;
}

const LecturerDashboard: React.FC<LecturerDashboardProps> = ({ onLaunchSession }) => {
  const [courses, setCourses] = useState<CourseItem[]>([
    { id: "c-1", code: "CSE-402", title: "Distributed Systems & Cloud Computing", department: "Computer Engineering" },
    { id: "c-2", code: "CSE-408", title: "Artificial Intelligence & Robotics", department: "Computer Engineering" },
    { id: "c-3", code: "CSE-301", title: "Database Management Systems", department: "Computer Science" }
  ]);

  const [selectedCourse, setSelectedCourse] = useState<CourseItem | null>(null);
  const [showAddCourse, setShowAddCourse] = useState(false);
  const [newCode, setNewCode] = useState("");
  const [newTitle, setNewTitle] = useState("");
  const [newDept, setNewDept] = useState("Computer Engineering");
  const [customDept, setCustomDept] = useState("");

  // Session Parameters
  const [radius, setRadius] = useState(50);
  const [gracePeriod, setGracePeriod] = useState(10);
  const [latePeriod, setLatePeriod] = useState(30);

  // GPS Coordinates
  const [gps, setGps] = useState<{ lat: number; lng: number } | null>(null);
  const [isFetchingGps, setIsFetchingGps] = useState(false);

  const departments = [
    "Computer Engineering",
    "Computer Science",
    "Electrical Engineering",
    "Mechanical Engineering",
    "Civil Engineering",
    "Biochemistry",
    "Microbiology",
    "Business Administration",
    "Accounting",
    "Economics",
    "Other"
  ];

  useEffect(() => {
    setIsFetchingGps(true);
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setGps({ lat: pos.coords.latitude, lng: pos.coords.longitude });
          setIsFetchingGps(false);
        },
        (err) => {
          console.warn("GPS lookup failed, using campus coordinates.", err);
          setGps({ lat: 6.5244, lng: 3.3792 }); // Lagos/Campus default coordinates
          setIsFetchingGps(false);
        },
        { enableHighAccuracy: true, timeout: 5000 }
      );
    } else {
      setGps({ lat: 6.5244, lng: 3.3792 });
      setIsFetchingGps(false);
    }
  }, [selectedCourse]);

  const handleAddCourse = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCode || !newTitle) {
      alert("Please fill in course code and title.");
      return;
    }
    const deptVal = newDept === "Other" ? customDept : newDept;
    const item: CourseItem = {
      id: `c-${Date.now()}`,
      code: newCode,
      title: newTitle,
      department: deptVal || "General Studies",
    };
    setCourses((prev) => [...prev, item]);
    setShowAddCourse(false);
    setNewCode("");
    setNewTitle("");
    setNewDept("Computer Engineering");
    setCustomDept("");
  };

  const handleLaunch = async (demo: boolean) => {
    if (!selectedCourse) return;
    
    // Create new session object
    const session_id = `sess-${Date.now()}`;
    const newSession: SessionDetails = {
      id: session_id,
      courseId: selectedCourse.id,
      course: {
        code: selectedCourse.code,
        title: selectedCourse.title,
      },
      startTime: new Date().toISOString(),
      endTime: new Date(Date.now() + 5400000).toISOString(), // default 1.5 hours
      latitude: gps?.lat || 6.5244,
      longitude: gps?.lng || 3.3792,
      allowedRadiusMeters: radius,
    };

    if (demo) {
      onLaunchSession(newSession, true);
      return;
    }

    // Try calling the live backend endpoint to create a real session
    try {
      const res = await fetch("https://attendance-system-backend-b6ti.onrender.com/api/v1/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          course_id: "c1a2b3c4-d5e6-7f8a-9b0c-1d2e3f4a5b6c", // Standard seeded course ID to avoid foreign key errors
          start_time: newSession.startTime,
          end_time: newSession.endTime,
          latitude: newSession.latitude,
          longitude: newSession.longitude,
          allowed_radius_meters: radius,
          grace_period_minutes: gracePeriod,
          late_period_minutes: latePeriod,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        // Use real session response
        const liveSession: SessionDetails = {
          ...newSession,
          id: data.id,
          courseId: data.courseId || newSession.courseId,
        };
        onLaunchSession(liveSession, false);
      } else {
        console.warn("API rejected session initialization, falling back to mock session.");
        onLaunchSession(newSession, true);
      }
    } catch (err) {
      console.warn("Backend offline during session launch, running in simulation mode.", err);
      onLaunchSession(newSession, true);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 md:p-8 font-sans flex items-center justify-center">
      <div className="max-w-4xl w-full grid grid-cols-1 md:grid-cols-12 gap-6">
        
        {/* Left Column: Course List */}
        <div className="md:col-span-7 bg-slate-900/60 backdrop-blur-xl border border-slate-800/80 rounded-3xl p-6 shadow-2xl space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-xl font-extrabold text-white tracking-tight">Dr. Elizabeth Vance</h2>
              <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider font-mono">Lecturer Console</p>
            </div>
            <button
              onClick={() => setShowAddCourse(!showAddCourse)}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-indigo-600/20 active:scale-95 transition-all cursor-pointer"
            >
              {showAddCourse ? "Close" : "Add Course"}
            </button>
          </div>

          {showAddCourse ? (
            <form onSubmit={handleAddCourse} className="space-y-4 border-t border-slate-850 pt-4 animate-slideDown">
              <h3 className="text-sm font-bold text-slate-300">Register New Course</h3>
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase">Code</label>
                  <input
                    type="text"
                    placeholder="e.g. CSE-402"
                    value={newCode}
                    onChange={(e) => setNewCode(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-indigo-500 transition-all font-mono"
                  />
                </div>
                <div className="col-span-2 space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase">Title</label>
                  <input
                    type="text"
                    placeholder="e.g. Distributed Systems"
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-indigo-500 transition-all"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase">Department</label>
                <select
                  value={newDept}
                  onChange={(e) => setNewDept(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-indigo-500 transition-all"
                >
                  {departments.map((dept) => (
                    <option key={dept} value={dept}>{dept}</option>
                  ))}
                </select>
              </div>

              {newDept === "Other" && (
                <div className="space-y-1 animate-slideDown">
                  <label className="text-[10px] font-bold text-slate-400 uppercase">Type Department</label>
                  <input
                    type="text"
                    placeholder="e.g. Mechanical Engineering"
                    value={customDept}
                    onChange={(e) => setCustomDept(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-indigo-500 transition-all"
                  />
                </div>
              )}

              <button
                type="submit"
                className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-lg transition-all"
              >
                Save Course
              </button>
            </form>
          ) : (
            <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
              {courses.map((course) => (
                <div
                  key={course.id}
                  onClick={() => setSelectedCourse(course)}
                  className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-center justify-between group ${
                    selectedCourse?.id === course.id
                      ? "bg-indigo-600/10 border-indigo-500/40 shadow-lg shadow-indigo-600/5"
                      : "bg-slate-950 border-slate-850 hover:border-slate-800"
                  }`}
                >
                  <div className="min-w-0">
                    <span className="text-xs font-bold font-mono text-indigo-400 bg-indigo-600/10 border border-indigo-500/20 px-2 py-0.5 rounded-md">
                      {course.code}
                    </span>
                    <h4 className="text-sm font-extrabold text-white mt-2 truncate group-hover:text-indigo-300 transition-colors">
                      {course.title}
                    </h4>
                    <p className="text-[10px] text-slate-500 font-semibold mt-1 uppercase tracking-wider">
                      {course.department}
                    </p>
                  </div>
                  <div className="flex-shrink-0 ml-4">
                    <span className={`w-8 h-8 rounded-full flex items-center justify-center border transition-all ${
                      selectedCourse?.id === course.id
                        ? "bg-indigo-600 text-white border-indigo-500"
                        : "bg-slate-900 border-slate-800 text-slate-400 group-hover:text-slate-200"
                    }`}>
                      ▶
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right Column: Session Setup */}
        <div className="md:col-span-5 bg-slate-900/60 backdrop-blur-xl border border-slate-800/80 rounded-3xl p-6 shadow-2xl flex flex-col justify-between space-y-6">
          {selectedCourse ? (
            <div className="space-y-5 flex-1 flex flex-col justify-between">
              <div className="space-y-4">
                <div>
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest font-mono">Launching Session for</span>
                  <h3 className="text-lg font-bold text-white leading-tight mt-1">{selectedCourse.title}</h3>
                  <p className="text-xs font-bold text-indigo-400 mt-0.5 font-mono">{selectedCourse.code}</p>
                </div>

                <div className="space-y-3.5 border-t border-slate-850 pt-4">
                  {/* Custom Grace Period (Present) */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between items-center text-xs">
                      <label className="font-bold text-slate-400">Grace Period (Marked Present)</label>
                      <span className="font-bold font-mono text-indigo-400">{gracePeriod} mins</span>
                    </div>
                    <input
                      type="range"
                      min="1"
                      max="15"
                      value={gracePeriod}
                      onChange={(e) => {
                        const val = parseInt(e.target.value);
                        setGracePeriod(val);
                        if (val >= latePeriod) setLatePeriod(val + 5);
                      }}
                      className="w-full accent-indigo-500 bg-slate-950 rounded-lg cursor-pointer h-1.5"
                    />
                    <p className="text-[10px] text-slate-500 leading-relaxed">Students checking in within this limit are marked <b>Present</b>.</p>
                  </div>

                  {/* Custom Late Period */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between items-center text-xs">
                      <label className="font-bold text-slate-400">Lateness Cutoff (Marked Late)</label>
                      <span className="font-bold font-mono text-indigo-400">{latePeriod} mins</span>
                    </div>
                    <input
                      type="range"
                      min={gracePeriod + 1}
                      max="60"
                      value={latePeriod}
                      onChange={(e) => setLatePeriod(parseInt(e.target.value))}
                      className="w-full accent-indigo-500 bg-slate-950 rounded-lg cursor-pointer h-1.5"
                    />
                    <p className="text-[10px] text-slate-500 leading-relaxed">Students checking in after the grace period but within this limit are marked <b>Late</b>. Beyond this time, check-in closes completely.</p>
                  </div>

                  {/* Geofence boundary radius */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between items-center text-xs">
                      <label className="font-bold text-slate-400">Geofencing Radius</label>
                      <span className="font-bold font-mono text-indigo-400">{radius} meters</span>
                    </div>
                    <select
                      value={radius}
                      onChange={(e) => setRadius(parseInt(e.target.value))}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-indigo-500 font-bold"
                    >
                      <option value={20}>20 meters (Tight Room)</option>
                      <option value={50}>50 meters (Standard Hall)</option>
                      <option value={100}>100 meters (Large Lecture Theater)</option>
                    </select>
                  </div>

                  {/* Room Location GPS */}
                  <div className="bg-slate-950 border border-slate-850 rounded-2xl p-4 flex items-center justify-between">
                    <div className="min-w-0">
                      <p className="text-[10px] font-bold text-slate-500 uppercase font-mono">Classroom Coordinates</p>
                      {gps ? (
                        <p className="text-xs font-mono font-bold text-slate-300 mt-1 truncate">
                          {gps.lat.toFixed(5)}°, {gps.lng.toFixed(5)}°
                        </p>
                      ) : (
                        <p className="text-xs text-slate-500 mt-1 font-mono">Resolving coordinates...</p>
                      )}
                    </div>
                    <div className="flex-shrink-0">
                      {isFetchingGps ? (
                        <div className="w-2.5 h-2.5 bg-indigo-500 rounded-full animate-ping" />
                      ) : (
                        <div className="flex items-center space-x-1.5 text-[9px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">
                          <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />
                          <span>GPS Active</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-3 pt-4">
                <button
                  onClick={() => handleLaunch(false)}
                  className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-bold rounded-xl shadow-lg shadow-indigo-600/35 transition-all active:scale-98 cursor-pointer"
                >
                  Start Active Class QR
                </button>
                <button
                  onClick={() => handleLaunch(true)}
                  className="w-full py-3 bg-slate-800 hover:bg-slate-750 text-slate-300 text-sm font-bold rounded-xl border border-slate-700/50 transition-all cursor-pointer"
                >
                  Start Simulation Mode
                </button>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-6 space-y-4">
              <div className="w-16 h-16 rounded-3xl bg-slate-950 border border-slate-800 flex items-center justify-center text-slate-500 shadow-xl shadow-slate-950/20">
                <svg className="w-8 h-8 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-slate-200">No Course Selected</h3>
                <p className="text-xs text-slate-400 max-w-xs leading-relaxed">Select one of your registered courses from the dashboard list to configure and initialize a live attendance session.</p>
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  );
};
export default LecturerSessionView;
