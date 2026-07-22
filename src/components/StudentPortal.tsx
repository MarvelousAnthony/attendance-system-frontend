import React, { useState, useEffect, useRef } from "react";
import { Html5Qrcode } from "html5-qrcode";

interface StudentProfile {
  name: string;
  email: string;
  studentId: string;
  attendancePercentage: number;
  attendedSessions: number;
  totalSessions: number;
}

interface RecentCheckIn {
  id: string;
  courseCode: string;
  courseTitle: string;
  timestamp: string;
  status: "present" | "late";
}

export const StudentPortal: React.FC = () => {
  // --- MOCK USER PROFILE DATA ---
  const [profile] = useState<StudentProfile>({
    name: "David Kim",
    email: "d.kim@university.edu",
    studentId: "std-1004",
    attendancePercentage: 91.3,
    attendedSessions: 21,
    totalSessions: 23,
  });

  const [recentHistory, setRecentHistory] = useState<RecentCheckIn[]>([
    {
      id: "hist-1",
      courseCode: "CSE-402",
      courseTitle: "Distributed Systems & Cloud Computing",
      timestamp: "2026-07-14T09:05:12Z",
      status: "present",
    },
    {
      id: "hist-2",
      courseCode: "CSE-408",
      courseTitle: "Artificial Intelligence & Robotics",
      timestamp: "2026-07-11T13:12:04Z",
      status: "late",
    },
    {
      id: "hist-3",
      courseCode: "CSE-402",
      courseTitle: "Distributed Systems & Cloud Computing",
      timestamp: "2026-07-09T09:01:45Z",
      status: "present",
    },
  ]);

  // --- STATE CONFIGURATION ---
  const [showScanner, setShowScanner] = useState<boolean>(false);
  const [isCameraLoading, setIsCameraLoading] = useState<boolean>(false);
  const [scannerError, setScannerError] = useState<string | null>(null);

  // Submission Pipeline states
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [submissionStep, setSubmissionStep] = useState<string>("");
  const [successResult, setSuccessResult] = useState<{
    status: string;
    timestamp: string;
    courseCode?: string;
  } | null>(null);
  const [errorResult, setErrorResult] = useState<string | null>(null);

  // Scanner Reference for cleanup
  const scannerInstanceRef = useRef<Html5Qrcode | null>(null);

  // --- COMPATIBILITY CHECKS ---
  const [isCompatible, setIsCompatible] = useState<{
    camera: boolean;
    gps: boolean;
  }>({ camera: true, gps: true });

  useEffect(() => {
    setIsCompatible({
      camera: !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia),
      gps: !!navigator.geolocation,
    });
  }, []);

  // --- CORE PIPELINE ROUTINES ---

  // 1. Browser-derived Device Fingerprint Hashing
  const getDeviceFingerprint = (): string => {
    try {
      const attributes = [
        navigator.userAgent,
        navigator.language,
        screen.colorDepth,
        `${screen.width}x${screen.height}`,
        new Date().getTimezoneOffset().toString(),
      ];
      const dataString = attributes.join("|");
      
      // Simple custom hashing logic to generate unique hex fingerprint
      let hash = 0;
      for (let i = 0; i < dataString.length; i++) {
        const char = dataString.charCodeAt(i);
        hash = (hash << 5) - hash + char;
        hash |= 0; // Convert to 32bit integer
      }
      return `dev_${Math.abs(hash).toString(16)}`;
    } catch {
      return "dev_fallback_fingerprint_safari_sandbox";
    }
  };

  // 2. High-Accuracy Geolocation Retrieval
  const getCoordinates = (): Promise<{ latitude: number; longitude: number }> => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error("Geolocation is not supported by your device's browser"));
        return;
      }

      const options: PositionOptions = {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      };

      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          });
        },
        (error) => {
          switch (error.code) {
            case error.PERMISSION_DENIED:
              reject(new Error("GPS Access Denied. Please enable location services in your settings."));
              break;
            case error.POSITION_UNAVAILABLE:
              reject(new Error("Location information is currently unavailable."));
              break;
            case error.TIMEOUT:
              reject(new Error("GPS signal timed out. Try moving near a window or check connection."));
              break;
            default:
              reject(new Error("An unknown error occurred while verifying GPS."));
          }
        },
        options
      );
    });
  };

  // 3. QR Camera Life Cycle
  useEffect(() => {
    if (!showScanner) {
      cleanupScanner();
      return;
    }

    const scannerElementId = "qr-reader";
    const html5QrCode = new Html5Qrcode(scannerElementId);
    scannerInstanceRef.current = html5QrCode;

    const startScanner = async () => {
      setIsCameraLoading(true);
      setScannerError(null);
      setErrorResult(null);
      setSuccessResult(null);

      try {
        await html5QrCode.start(
          { facingMode: "environment" },
          {
            fps: 10,
            qrbox: (width, height) => {
              const boxSize = Math.min(width, height) * 0.7;
              return { width: boxSize, height: boxSize };
            },
          },
          async (decodedText) => {
            // Success Scan callback
            await handleSuccessfulScan(decodedText);
          },
          () => {} // Mute error logs during continuous video scanning
        );
      } catch (err: any) {
        setScannerError(err.message || "Failed to initialize camera feedback.");
        setShowScanner(false);
      } finally {
        setIsCameraLoading(false);
      }
    };

    startScanner();

    return () => {
      cleanupScanner();
    };
  }, [showScanner]);

  const cleanupScanner = () => {
    if (scannerInstanceRef.current && scannerInstanceRef.current.isScanning) {
      scannerInstanceRef.current.stop().catch((err) => {
        console.error("Scanner stop failed during cleanup", err);
      });
    }
  };

  // 4. Processing QR Code Data + Location + Fingerprint
  const handleSuccessfulScan = async (scannedToken: string) => {
    // Hide scanner view once token is captured
    setShowScanner(false);
    cleanupScanner();

    setIsSubmitting(true);
    setErrorResult(null);
    setSuccessResult(null);

    try {
      // Step A: Request high-accuracy GPS coordinates
      setSubmissionStep("Acquiring high-precision GPS coordinates...");
      const coords = await getCoordinates();

      // Step B: Collect device fingerprint
      setSubmissionStep("Generating device validation signature...");
      const deviceHash = getDeviceFingerprint();

      // Step C: POST check-in data to API endpoint
      setSubmissionStep("Submitting verification to university server...");
      const response = await fetch("https://attendance-system-backend-b6ti.onrender.com/api/v1/attendance/submit", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          token: scannedToken,
          student_id: profile.studentId,
          student_latitude: coords.latitude,
          student_longitude: coords.longitude,
          device_hash: deviceHash,
        }),
      });

      const responseData = await response.json();

      if (!response.ok) {
        throw new Error(responseData.detail || "Attendance reporting failed");
      }

      // Success Callback
      setSuccessResult({
        status: responseData.status,
        timestamp: responseData.timestamp,
        courseCode: "CSE-402", // Presumed active session code
      });

      // Update mock history list with new record
      const newHistoryItem: RecentCheckIn = {
        id: `hist-${Date.now()}`,
        courseCode: "CSE-402",
        courseTitle: "Distributed Systems & Cloud Computing",
        timestamp: responseData.timestamp,
        status: responseData.status === "late" ? "late" : "present",
      };
      setRecentHistory((prev) => [newHistoryItem, ...prev]);

    } catch (err: any) {
      console.error("Submission failed", err);
      setErrorResult(err.message || "An unexpected error occurred during check-in.");
    } finally {
      setIsSubmitting(false);
      setSubmissionStep("");
    }
  };

  // --- RENDERING ROUTINES ---

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-start p-4 md:p-6 font-sans">
      <div className="max-w-md w-full flex flex-col space-y-6">
        
        {/* DASHBOARD HEADER */}
        <header className="bg-slate-900/60 backdrop-blur-xl border border-slate-800/80 rounded-3xl p-6 shadow-2xl flex items-center justify-between">
          <div className="flex items-center space-x-4 min-w-0">
            {/* Student Initials Avatar */}
            <div className="w-14 h-14 rounded-full bg-gradient-to-tr from-indigo-500/20 to-indigo-600/40 flex items-center justify-center border border-indigo-500/30 flex-shrink-0 shadow-lg shadow-indigo-500/10">
              <span className="text-lg font-bold text-indigo-300">
                {profile.name.split(" ").map((n) => n[0]).join("")}
              </span>
            </div>
            <div className="min-w-0">
              <h2 className="text-xl font-extrabold text-white truncate tracking-tight">{profile.name}</h2>
              <p className="text-xs font-semibold text-slate-500 font-mono mt-0.5 truncate">{profile.studentId}</p>
            </div>
          </div>

          {/* Stats Badge */}
          <div className="flex flex-col items-end flex-shrink-0">
            <span className="text-3xl font-extrabold text-indigo-400 leading-none">
              {profile.attendancePercentage}%
            </span>
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">
              Attendance
            </span>
          </div>
        </header>

        {/* BROWSER COMPATIBILITY CHECKS */}
        {(!isCompatible.camera || !isCompatible.gps) && (
          <div className="bg-rose-950/20 border border-rose-900/40 rounded-2xl p-4 flex items-start space-x-3">
            <svg className="w-5 h-5 text-rose-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <div className="text-xs">
              <p className="font-bold text-rose-400">System Capability Warning</p>
              <p className="text-slate-400 mt-0.5 leading-relaxed">
                {!isCompatible.camera && "• Camera hardware or permissions missing. "}
                {!isCompatible.gps && "• Geolocation permissions or hardware disabled. "}
                Please resolve in your device settings to register attendance.
              </p>
            </div>
          </div>
        )}

        {/* FEEDBACK STATUS ALERTS */}
        {successResult && (
          <div className="bg-emerald-950/20 border border-emerald-900/50 rounded-2xl p-5 shadow-lg shadow-emerald-950/10 flex items-start space-x-4 animate-slideDown">
            <div className="w-10 h-10 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center flex-shrink-0">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-emerald-400">Check-In Successful</p>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                Your presence was verified for <strong>{successResult.courseCode}</strong>. Status:{" "}
                <span className="capitalize font-semibold text-emerald-300">{successResult.status}</span>.
              </p>
              <p className="text-[10px] font-mono text-slate-500 mt-1.5">
                Saved: {new Date(successResult.timestamp).toLocaleString()}
              </p>
            </div>
          </div>
        )}

        {errorResult && (
          <div className="bg-rose-950/20 border border-rose-900/50 rounded-2xl p-5 shadow-lg shadow-rose-950/10 flex items-start space-x-4 animate-slideDown">
            <div className="w-10 h-10 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20 flex items-center justify-center flex-shrink-0">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-rose-400">Verification Rejected</p>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">{errorResult}</p>
              <button
                onClick={() => setShowScanner(true)}
                className="mt-3 px-3 py-1.5 bg-rose-500/10 border border-rose-500/20 rounded-lg text-[10px] font-semibold text-rose-300 hover:bg-rose-500/20 transition-all active:scale-95"
              >
                Scan Token Again
              </button>
            </div>
          </div>
        )}

        {/* SUBMISSION LOADING VIEW */}
        {isSubmitting && (
          <div className="bg-slate-900 border border-indigo-500/20 rounded-3xl p-8 flex flex-col items-center justify-center text-center shadow-xl space-y-4 animate-pulse">
            <div className="w-12 h-12 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin" />
            <div>
              <p className="text-sm font-bold text-slate-200">Verifying Presence</p>
              <p className="text-xs text-slate-400 mt-1">{submissionStep}</p>
            </div>
          </div>
        )}

        {/* SCANNER ACTIVE VIEW */}
        {showScanner && (
          <div className="flex flex-col bg-slate-900/90 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl relative">
            <div className="p-4 border-b border-slate-800/60 flex items-center justify-between bg-slate-950/60">
              <h3 className="text-sm font-bold text-white tracking-wide">Dynamic QR Scanner</h3>
              <button
                onClick={() => setShowScanner(false)}
                className="text-xs font-semibold text-slate-400 hover:text-white bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-xl active:scale-95 transition-all"
              >
                Cancel
              </button>
            </div>

            {/* Video Render Frame */}
            <div className="relative bg-black aspect-square flex items-center justify-center p-2">
              {isCameraLoading && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950/90 space-y-3 z-10">
                  <div className="w-10 h-10 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin" />
                  <p className="text-xs text-slate-400">Activating camera lense...</p>
                </div>
              )}

              {scannerError && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950/95 p-4 text-center z-10 animate-fadeIn">
                  <svg className="w-10 h-10 text-rose-500 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <p className="text-xs font-bold text-rose-400">Camera Access Blocked</p>
                  <p className="text-[10px] text-slate-500 mt-1 leading-relaxed">{scannerError}</p>
                </div>
              )}
              
              {/* Target bounding container for html5-qrcode */}
              <div id="qr-reader" className="w-full h-full rounded-2xl overflow-hidden" />
            </div>

            <div className="p-4 text-center bg-slate-950/60 border-t border-slate-800/60">
              <p className="text-xs text-slate-400">Position the QR code inside the box to capture token</p>
            </div>
          </div>
        )}

        {/* DASHBOARD ACTIONS */}
        {!showScanner && !isSubmitting && (
          <section className="bg-slate-900/60 backdrop-blur-xl border border-slate-800/80 rounded-3xl p-6 shadow-2xl flex flex-col space-y-4">
            <h3 className="text-base font-bold text-white tracking-tight">Register Presence</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Scan the dynamic QR code displayed on the lecturer's projector screen. Geolocation bounds and hardware signature locks will verify attendance.
            </p>
            
            <button
              onClick={() => setShowScanner(true)}
              disabled={!isCompatible.camera || !isCompatible.gps}
              className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 disabled:text-slate-500 disabled:border-slate-800/20 text-white font-bold rounded-2xl transition-all duration-300 active:scale-95 shadow-lg shadow-indigo-600/35 border border-indigo-500/30 flex items-center justify-center space-x-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m0 11v1m4-6h1m-11 0h1m2-2a2 2 0 11.001 3.999A2 2 0 0112 10z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 10a8 8 0 11-16 0 8 8 0 0116 0z" />
              </svg>
              <span>Scan Session QR Code</span>
            </button>
          </section>
        )}

        {/* HISTORICAL CHECK-INS */}
        {!showScanner && !isSubmitting && (
          <section className="bg-slate-900/60 backdrop-blur-xl border border-slate-800/80 rounded-3xl p-6 shadow-2xl flex flex-col space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-white tracking-tight">Recent Attendance</h3>
              <span className="text-[10px] font-bold text-slate-500 tracking-wider">
                {profile.attendedSessions} / {profile.totalSessions} Sessions
              </span>
            </div>

            <div className="space-y-3">
              {recentHistory.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between p-3.5 bg-slate-950/40 border border-slate-900 rounded-2xl hover:border-slate-800 transition-all duration-300"
                >
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-white truncate">{item.courseTitle}</p>
                    <p className="text-[10px] text-slate-500 mt-0.5 font-mono">{item.courseCode}</p>
                  </div>
                  <div className="flex items-center space-x-3 flex-shrink-0 pl-3">
                    <span className="text-[10px] font-mono text-slate-400">
                      {new Date(item.timestamp).toLocaleDateString([], {
                        month: "short",
                        day: "numeric",
                      })}
                    </span>
                    {item.status === "present" ? (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        Present
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                        Late
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}
        
      </div>
    </div>
  );
};
export default StudentPortal;
