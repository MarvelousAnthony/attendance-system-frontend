import React, { useEffect, useState, useRef, useCallback } from "react";
import { SessionDetails, AttendanceRecord, TokenInfo } from "../types";
import { QrGenerator } from "./QrGenerator";
import { CheckInRoster } from "./CheckInRoster";

interface LecturerSessionViewProps {
  sessionId: string;
  initialSessionDetails?: SessionDetails;
  totalRegisteredStudents?: number;
}

export const LecturerSessionView: React.FC<LecturerSessionViewProps> = ({
  sessionId,
  initialSessionDetails,
  totalRegisteredStudents = 45,
}) => {
  // --- STATE CONFIGURATION ---
  const [session, setSession] = useState<SessionDetails | null>(initialSessionDetails || null);
  const [token, setToken] = useState<string | null>(null);
  const [secondsLeft, setSecondsLeft] = useState<number>(15);
  const [records, setRecords] = useState<AttendanceRecord[]>([]);

  // Loading & Error States
  const [isSessionLoading, setIsSessionLoading] = useState<boolean>(!initialSessionDetails);
  const [isTokenLoading, setIsTokenLoading] = useState<boolean>(false);
  const [isRosterLoading, setIsRosterLoading] = useState<boolean>(false);
  const [sessionError, setSessionError] = useState<string | null>(null);
  const [tokenError, setTokenError] = useState<string | null>(null);
  const [rosterError, setRosterError] = useState<string | null>(null);

  // Demo / Simulation Mode State
  const [isDemoMode, setIsDemoMode] = useState<boolean>(false);

  // Refs for tracking async states in timers
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const rosterIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const simulatedCheckInRef = useRef<NodeJS.Timeout | null>(null);

  const API_BASE_URL = "https://attendance-system-backend-b6ti.onrender.com/api/v1";

  // --- API LOGIC IMPLEMENTATION ---

  // 1. Fetch Session Details (if not provided initially)
  const fetchSessionDetails = useCallback(async () => {
    if (isDemoMode) return;
    setIsSessionLoading(true);
    setSessionError(null);
    try {
      const res = await fetch(`${API_BASE_URL}/sessions/${sessionId}`);
      if (!res.ok) throw new Error(`Server returned status ${res.status}`);
      const data = await res.json();
      setSession(data);
    } catch (err: any) {
      console.warn("Failed to fetch session, falling back to mock session.", err);
      // Fallback mock session for robust development/demonstration
      const mockSession: SessionDetails = {
        id: sessionId,
        courseId: "c1a2b3c4-d5e6-7f8a-9b0c-1d2e3f4a5b6c",
        course: {
          code: "CS-402",
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
  }, [sessionId, isDemoMode]);

  // 2. Fetch Dynamic Token
  const fetchToken = useCallback(async () => {
    if (isDemoMode) {
      // Demo Mode Token Generation
      setToken(`demo-jwt-payload-session-${sessionId}-timestamp-${Date.now()}`);
      setSecondsLeft(15);
      setTokenError(null);
      return;
    }

    setIsTokenLoading(true);
    setTokenError(null);
    try {
      const res = await fetch(`${API_BASE_URL}/sessions/${sessionId}/token`);
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
  }, [sessionId, isDemoMode, records.length]);

  // 3. Fetch Live Roster Check-ins
  const fetchRoster = useCallback(async () => {
    if (isDemoMode) return;
    setIsRosterLoading(true);
    setRosterError(null);
    try {
      const res = await fetch(`${API_BASE_URL}/sessions/${sessionId}/attendance`);
      if (!res.ok) throw new Error(`HTTP Error ${res.status}: Failed to sync roster`);
      const data = await res.json();
      setRecords(data);
    } catch (err: any) {
      setRosterError(err.message || "Attendance synchronization disrupted");
    } finally {
      setIsRosterLoading(false);
    }
  }, [sessionId, isDemoMode]);

  // --- EFFECT SYNCHRONIZATION ---

  // Initial load
  useEffect(() => {
    fetchSessionDetails();
  }, [fetchSessionDetails]);

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

      const newRecord: AttendanceRecord = {
        id: `rec-${mockIndex}-${Date.now()}`,
        studentId: `std-${1000 + mockIndex}`,
        studentName: mockNames[mockIndex],
        sessionId: sessionId,
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
  }, [isDemoMode, sessionId, session, fetchToken]);

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

  if (!session) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950/40 text-slate-100 flex flex-col font-sans">
      {/* Top Header Navigation */}
      <header className="border-b border-slate-900 bg-slate-950/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 md:px-8 py-4 flex flex-col sm:flex-row items-center justify-between gap-4">
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
export default LecturerSessionView;
