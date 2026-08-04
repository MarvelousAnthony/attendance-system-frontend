import React, { useState, useEffect, useRef, useCallback } from "react";
import { Html5Qrcode } from "html5-qrcode";

interface StudentProfile {
  name: string;
  email: string;
  studentId: string;
  dbId: string;
  department?: string;
  attendancePercentage: number;
  attendedSessions: number;
  totalSessions: number;
  faceEncoding?: string;
}

const DEPARTMENTS = [
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

interface RecentCheckIn {
  id: string;
  courseCode: string;
  courseTitle: string;
  timestamp: string;
  status: "present" | "late";
}
export const StudentPortal: React.FC = () => {
  // Edit Profile States
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [editName, setEditName] = useState("");
  const [editStudentId, setEditStudentId] = useState("");
  const [editDept, setEditDept] = useState("");
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [editProfileError, setEditProfileError] = useState<string | null>(null);

  const [profile, setProfile] = useState<StudentProfile | null>(() => {
    const saved = localStorage.getItem("student_profile");
    return saved ? JSON.parse(saved) : null;
  });

  // Verify in background if student profile still exists in database (e.g. self-healing after db resets)
  useEffect(() => {
    const identifier = profile?.studentId || (profile as any)?.student_id || profile?.email;
    if (profile && identifier) {
      fetch("https://attendance-system-backend-b6ti.onrender.com/api/v1/students/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier }),
      })
      .then(res => {
        if (!res.ok) {
          localStorage.removeItem("student_profile");
          setProfile(null);
        }
      })
      .catch(err => {
        console.error("Background student verification failed:", err);
      });
    }
  }, [profile?.studentId, (profile as any)?.student_id, profile?.email]);

  const [recentHistory, setRecentHistory] = useState<RecentCheckIn[]>([]);

  // Calculate course-by-course attendance rates dynamically from database
  const [coursesAttendance, setCoursesAttendance] = useState<any[]>([
    { code: "CSE-402", title: "Distributed Systems & Cloud Computing", attended: 0, total: 0, percentage: 100 },
    { code: "CSE-408", title: "Artificial Intelligence & Robotics", attended: 0, total: 0, percentage: 100 },
    { code: "CSE-301", title: "Database Management Systems", attended: 0, total: 0, percentage: 100 }
  ]);
  const fetchAttendanceSummary = useCallback(async () => {
    if (!profile || !profile.dbId) return;
    try {
      const res = await fetch(`https://attendance-system-backend-b6ti.onrender.com/api/v1/students/${profile.dbId}/attendance-summary`);
      if (res.ok) {
        const data = await res.json();
        const mapped = data.map((item: any) => ({
          code: item.course_code,
          title: item.course_title,
          attended: item.attended,
          total: item.total,
          percentage: item.percentage
        }));
        setCoursesAttendance(mapped);
      }
    } catch (err) {
      console.error("Failed to fetch attendance summary:", err);
    }
  }, [profile?.dbId]);

  useEffect(() => {
    fetchAttendanceSummary();
  }, [recentHistory, fetchAttendanceSummary]);

  const fetchCheckInHistory = useCallback(async () => {
    if (!profile || !profile.dbId) return;
    try {
      const res = await fetch(`https://attendance-system-backend-b6ti.onrender.com/api/v1/students/${profile.dbId}/attendance`);
      if (res.ok) {
        const data = await res.json();
        const mapped = data.map((item: any) => ({
          id: item.id,
          timestamp: item.timestamp,
          status: item.status,
          courseCode: item.courseCode || item.course_code,
          courseTitle: item.courseTitle || item.course_title,
        }));
        setRecentHistory(mapped);
      }
    } catch (err) {
      console.error("Failed to fetch check-in history:", err);
    }
  }, [profile?.dbId]);

  useEffect(() => {
    fetchCheckInHistory();
  }, [profile?.dbId, fetchCheckInHistory]);

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
            fps: 30,
            qrbox: (width, height) => {
              const boxSize = Math.min(width, height) * 0.85;
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
        console.warn("Rear camera not found or blocked. Retrying with front camera/default webcam...", err);
        try {
          // Fallback: Retry using front-facing camera (optimal for laptop testing)
          await html5QrCode.start(
            { facingMode: "user" },
            {
              fps: 30,
              qrbox: (width, height) => {
                const boxSize = Math.min(width, height) * 0.85;
                return { width: boxSize, height: boxSize };
              },
            },
            async (decodedText) => {
              await handleSuccessfulScan(decodedText);
            },
            () => {}
          );
        } catch (innerErr: any) {
          setScannerError(
            "Camera initialization failed. Please ensure camera permissions are allowed in your browser address bar and that no other application is using your camera."
          );
          setShowScanner(false);
        }
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
    if (!profile) return;
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
          student_id: profile.dbId,
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
        status: responseData.status,
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

  const handleSaveEditProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;
    if (!editName || !editStudentId) {
      alert("Please fill in all fields.");
      return;
    }

    // Matric format check: 00/0000
    const matricRegex = /^\d{2}\/\d{4}$/;
    if (!matricRegex.test(editStudentId)) {
      alert("Matric Number must be in the format: 00/0000 (e.g., 20/4321)");
      return;
    }

    setIsSavingProfile(true);
    setEditProfileError(null);

    try {
      const res = await fetch("https://attendance-system-backend-b6ti.onrender.com/api/v1/students/onboard", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editName,
          email: profile.email,
          student_id: editStudentId,
          department: editDept,
          face_encoding: profile.faceEncoding || "[]",
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail || "Failed to update profile.");
      }

      const updatedProfile: StudentProfile = {
        ...profile,
        name: editName,
        studentId: editStudentId,
        department: editDept,
        faceEncoding: data.face_encoding || profile.faceEncoding,
      };

      localStorage.setItem("student_profile", JSON.stringify(updatedProfile));
      setProfile(updatedProfile);
      setShowEditProfile(false);
      alert("Profile updated successfully!");
    } catch (err: any) {
      setEditProfileError(err.message || "Failed to save profile. Please check your internet connection.");
    } finally {
      setIsSavingProfile(false);
    }
  };

  // Student Login States
  const [isRegisterMode, setIsRegisterMode] = useState(false);
  const [loginIdentifier, setLoginIdentifier] = useState("");
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  const handleStudentLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginIdentifier) return;
    setIsLoggingIn(true);
    setLoginError(null);
    try {
      const res = await fetch("https://attendance-system-backend-b6ti.onrender.com/api/v1/students/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier: loginIdentifier }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail || "Student profile not found.");
      }
      
      const newProfile: StudentProfile = {
        name: data.name,
        email: data.email,
        studentId: data.student_id,
        dbId: data.id,
        department: data.department || "Computer Engineering",
        attendancePercentage: 100, // starting default
        attendedSessions: 0,
        totalSessions: 0,
        faceEncoding: data.face_encoding,
      };
      
      localStorage.setItem("student_profile", JSON.stringify(newProfile));
      setProfile(newProfile);
    } catch (err: any) {
      setLoginError(err.message || "Failed to log in.");
    } finally {
      setIsLoggingIn(false);
    }
  };

  // --- RENDERING ROUTINES ---
  
  if (!profile) {
    if (isRegisterMode) {
      return (
        <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-4 md:p-6 font-sans">
          <StudentOnboarding
            onComplete={(newProfile) => {
              localStorage.setItem("student_profile", JSON.stringify(newProfile));
              setProfile(newProfile);
            }}
          />
          <button
            onClick={() => setIsRegisterMode(false)}
            className="text-xs font-semibold text-slate-500 dark:text-slate-500 hover:text-slate-600 dark:text-slate-400 cursor-pointer mt-4 underline"
          >
            Already have a profile? Log In
          </button>
        </div>
      );
    }

    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-4 md:p-6 font-sans">
        <div className="max-w-md w-full bg-white dark:bg-slate-900/60 backdrop-blur-xl border border-slate-200 dark:border-slate-800/80 rounded-3xl p-6 shadow-md dark:shadow-2xl space-y-6">
          <div className="text-center space-y-1.5 animate-fadeIn">
            <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">Student Attendance Hub</h2>
            <p className="text-xs text-slate-600 dark:text-slate-400">Access your attendance records and check-in scanner</p>
          </div>

          {loginError && (
            <div className="p-3.5 bg-rose-500/10 border border-rose-500/20 text-rose-450 rounded-xl text-xs font-semibold animate-pulse">
              {loginError}
            </div>
          )}

          <form onSubmit={handleStudentLogin} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Email or Matric Number</label>
              <input
                type="text"
                placeholder="e.g. anthony@gmail.com or 24/0858"
                value={loginIdentifier}
                onChange={(e) => setLoginIdentifier(e.target.value)}
                className="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl px-4 py-2.5 text-slate-900 dark:text-white text-sm text-slate-100 focus:outline-none focus:border-indigo-500 transition-all font-semibold"
                required
              />
            </div>

            <button
              type="submit"
              disabled={isLoggingIn}
              className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-800/60 disabled:text-indigo-300 text-white font-bold rounded-xl transition-all shadow-lg shadow-indigo-600/25 active:scale-98 cursor-pointer text-sm animate-fadeIn flex items-center justify-center space-x-2"
            >
              {isLoggingIn ? (
                <>
                  <div className="w-4 h-4 border-2 border-indigo-400 border-t-white rounded-full animate-spin" />
                  <span>Logging in...</span>
                </>
              ) : (
                <span>Log In</span>
              )}
            </button>
          </form>

          <div className="text-center text-xs text-slate-500 dark:text-slate-500">
            First time using the system?{" "}
            <button
              onClick={() => setIsRegisterMode(true)}
              className="font-bold text-indigo-400 hover:text-indigo-300 cursor-pointer underline"
            >
              Register Profile
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 flex flex-col items-center justify-start p-4 md:p-6 font-sans transition-colors duration-300">
      <div className="max-w-md w-full flex flex-col space-y-6">
        
        {/* DASHBOARD HEADER */}
        <header className="bg-white dark:bg-slate-900/60 backdrop-blur-xl border border-slate-200 dark:border-slate-800/80 rounded-3xl p-6 shadow-md dark:shadow-2xl flex items-center justify-between">
          <div className="flex items-center space-x-4 min-w-0">
            {/* Student Initials Avatar */}
            <div className="w-14 h-14 rounded-full bg-gradient-to-tr from-indigo-500/20 to-indigo-600/40 flex items-center justify-center border border-indigo-500/30 flex-shrink-0 shadow-lg shadow-indigo-500/10">
              <span className="text-lg font-bold text-indigo-300">
                {profile.name.split(" ").map((n) => n[0]).join("")}
              </span>
            </div>
            <div className="min-w-0">
              <h2 className="text-xl font-extrabold text-slate-900 dark:text-white truncate tracking-tight">{profile.name}</h2>
              <div className="flex items-center space-x-2 mt-0.5">
                <p className="text-xs font-semibold text-slate-500 dark:text-slate-500 font-mono truncate">{profile.studentId}</p>
                <span className="text-slate-700 font-mono text-xs">•</span>
                <button
                  onClick={() => {
                    setEditName(profile.name);
                    setEditStudentId(profile.studentId);
                    setEditDept(profile.department || "Computer Engineering");
                    setShowEditProfile(true);
                  }}
                  className="text-[10px] font-bold text-indigo-400 hover:text-indigo-300 uppercase tracking-wider cursor-pointer transition-colors"
                >
                  Edit Profile
                </button>
                <span className="text-slate-700 font-mono text-xs">•</span>
                <button
                  onClick={() => {
                    localStorage.removeItem("student_profile");
                    setProfile(null);
                  }}
                  className="text-[10px] font-bold text-rose-450 hover:text-rose-400 uppercase tracking-wider cursor-pointer transition-colors"
                >
                  Reset Profile
                </button>
              </div>
            </div>
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
              <p className="text-slate-600 dark:text-slate-400 mt-0.5 leading-relaxed">
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
              <p className="text-sm font-bold text-emerald-400">
                {successResult.status === "incomplete" ? "Check-In Registered" : "Attendance Verified"}
              </p>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 leading-relaxed">
                {successResult.status === "incomplete" ? (
                  <>
                    Your check-in was successfully logged for <strong>{successResult.courseCode}</strong>.
                    <span className="block mt-1 font-bold text-indigo-400">Please scan again at the end of class to complete your check-out.</span>
                  </>
                ) : (
                  <>
                    Your presence was verified for <strong>{successResult.courseCode}</strong>. Status:{" "}
                    <span className="capitalize font-semibold text-emerald-300">{successResult.status}</span>.
                  </>
                )}
              </p>
              <p className="text-[10px] font-mono text-slate-500 dark:text-slate-500 mt-1.5">
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
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 leading-relaxed">{errorResult}</p>
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
              <p className="text-sm font-bold text-slate-800 dark:text-slate-200">Verifying Presence</p>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">{submissionStep}</p>
            </div>
          </div>
        )}

        {/* SCANNER ACTIVE VIEW */}
        {showScanner && (
          <div className="flex flex-col bg-slate-900/90 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl relative">
            <div className="p-4 border-b border-slate-800/60 flex items-center justify-between bg-slate-950/60">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white tracking-wide">Dynamic QR Scanner</h3>
              <button
                onClick={() => setShowScanner(false)}
                className="text-xs font-semibold text-slate-600 dark:text-slate-650 hover:text-slate-950 dark:text-slate-400 dark:hover:text-white bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-xl active:scale-95 transition-all"
              >
                Cancel
              </button>
            </div>

            {/* Video Render Frame */}
            <div className="relative bg-black aspect-square flex items-center justify-center p-2">
              {isCameraLoading && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950/90 space-y-3 z-10">
                  <div className="w-10 h-10 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin" />
                  <p className="text-xs text-slate-600 dark:text-slate-400">Activating camera lense...</p>
                </div>
              )}

              {scannerError && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950/95 p-4 text-center z-10 animate-fadeIn">
                  <svg className="w-10 h-10 text-rose-500 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <p className="text-xs font-bold text-rose-400">Camera Access Blocked</p>
                  <p className="text-[10px] text-slate-500 dark:text-slate-500 mt-1 leading-relaxed">{scannerError}</p>
                </div>
              )}
              
              {/* Target bounding container for html5-qrcode */}
              <div id="qr-reader" className="w-full h-full rounded-2xl overflow-hidden" />
            </div>

            <div className="p-4 text-center bg-slate-950/60 border-t border-slate-800/60">
              <p className="text-xs text-slate-600 dark:text-slate-400">Position the QR code inside the box to capture token</p>
            </div>
          </div>
        )}

        {/* DASHBOARD ACTIONS */}
        {!showScanner && !isSubmitting && (
          <section className="bg-white dark:bg-slate-900/60 backdrop-blur-xl border border-slate-200 dark:border-slate-800/80 rounded-3xl p-6 shadow-md dark:shadow-2xl flex flex-col space-y-4">
            <h3 className="text-base font-bold text-slate-900 dark:text-white tracking-tight">Register Presence</h3>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              Scan the dynamic QR code displayed on the lecturer's projector screen. Geolocation bounds and hardware signature locks will verify attendance.
            </p>
            
            <button
              onClick={() => setShowScanner(true)}
              disabled={!isCompatible.camera || !isCompatible.gps}
              className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 disabled:text-slate-500 dark:text-slate-500 disabled:border-slate-800/20 text-white font-bold rounded-2xl transition-all duration-300 active:scale-95 shadow-lg shadow-indigo-600/35 border border-indigo-500/30 flex items-center justify-center space-x-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m0 11v1m4-6h1m-11 0h1m2-2a2 2 0 11.001 3.999A2 2 0 0112 10z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 10a8 8 0 11-16 0 8 8 0 0116 0z" />
              </svg>
              <span>Scan Session QR Code</span>
            </button>
          </section>
        )}

        {/* COURSE ATTENDANCE TRACKER */}
        {!showScanner && !isSubmitting && (
          <section className="bg-white dark:bg-slate-900/60 backdrop-blur-xl border border-slate-200 dark:border-slate-800/80 rounded-3xl p-6 shadow-md dark:shadow-2xl flex flex-col space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800/60 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white tracking-tight">Course Attendance Status</h3>
                <p className="text-xs text-slate-500 dark:text-slate-500 mt-0.5">Overall compliance per course (Requirement: 70% attendance)</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {coursesAttendance.map((course: any) => {
                const isUnderThreshold = course.percentage < 70;
                return (
                  <div
                    key={course.code}
                    className="p-4 bg-slate-100 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-200 dark:border-slate-900 rounded-2xl flex flex-col justify-between space-y-3"
                  >
                    <div>
                      <span className="text-[10px] font-mono font-bold text-indigo-400">{course.code}</span>
                      <h4 className="text-xs font-bold text-slate-900 dark:text-white mt-1 leading-snug truncate" title={course.title}>
                        {course.title}
                      </h4>
                    </div>
                    
                    <div className="flex items-center justify-between pt-2 border-t border-slate-200 dark:border-slate-900">
                      <div>
                        <span className="text-base font-extrabold text-slate-900 dark:text-white">{course.attended}</span>
                        <span className="text-[10px] text-slate-500 dark:text-slate-500 font-semibold"> / {course.total} classes</span>
                      </div>
                      <div className="text-right">
                        <span className={`text-sm font-extrabold block ${isUnderThreshold ? "text-rose-450" : "text-emerald-400"}`}>
                          {course.percentage}%
                        </span>
                        <span className="text-[9px] font-bold text-slate-500 dark:text-slate-500 uppercase tracking-widest block mt-0.5">
                          {isUnderThreshold ? "At Risk" : "Good"}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* HISTORICAL CHECK-INS */}
        {!showScanner && !isSubmitting && (
          <section className="bg-white dark:bg-slate-900/60 backdrop-blur-xl border border-slate-200 dark:border-slate-800/80 rounded-3xl p-6 shadow-md dark:shadow-2xl flex flex-col space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900 dark:text-white tracking-tight">Recent Attendance</h3>
              <span className="text-[10px] font-bold text-slate-500 dark:text-slate-500 tracking-wider">
                {coursesAttendance.reduce((acc: number, c: any) => acc + c.attended, 0)} / {coursesAttendance.reduce((acc: number, c: any) => acc + c.total, 0)} Sessions
              </span>
            </div>

            <div className="space-y-3">
              {recentHistory.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between p-3.5 bg-slate-100 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-200 dark:border-slate-900 rounded-2xl hover:border-slate-800 transition-all duration-300"
                >
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-white truncate">{item.courseTitle}</p>
                    <p className="text-[10px] text-slate-500 dark:text-slate-500 mt-0.5 font-mono">{item.courseCode}</p>
                  </div>
                  <div className="flex items-center space-x-3 flex-shrink-0 pl-3">
                    <span className="text-[10px] font-mono text-slate-600 dark:text-slate-400">
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

      {/* EDIT PROFILE MODAL OVERLAY */}
      {showEditProfile && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn text-left">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 w-full max-w-sm space-y-6 shadow-2xl relative">
            <div className="space-y-1">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">Edit Profile Details</h3>
              <p className="text-xs text-slate-600 dark:text-slate-400">Update your registration details. Face data will remain preserved.</p>
            </div>

            {editProfileError && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-450 rounded-xl text-xs font-semibold">
                {editProfileError}
              </div>
            )}

            <form onSubmit={handleSaveEditProfile} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-widest">Full Name</label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-100 focus:outline-none focus:border-indigo-500 transition-all font-semibold"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-widest">Matric Number</label>
                <input
                  type="text"
                  value={editStudentId}
                  placeholder="e.g. 24/0858"
                  onChange={(e) => setEditStudentId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-100 focus:outline-none focus:border-indigo-500 transition-all font-mono font-semibold"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-widest">Department</label>
                <select
                  value={editDept}
                  onChange={(e) => setEditDept(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800/80 rounded-xl px-4 py-2.5 text-xs text-slate-100 focus:outline-none focus:border-indigo-500 transition-all font-semibold cursor-pointer"
                >
                  {DEPARTMENTS.map((dept) => (
                    <option key={dept} value={dept} className="bg-slate-950 text-slate-100">
                      {dept}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowEditProfile(false)}
                  disabled={isSavingProfile}
                  className="w-1/2 py-2.5 bg-slate-950 border border-slate-850 hover:bg-slate-900 text-slate-750 dark:text-slate-300 font-bold rounded-xl transition-all cursor-pointer text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingProfile}
                  className="w-1/2 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl transition-all shadow-lg shadow-indigo-600/20 active:scale-98 cursor-pointer disabled:opacity-50 text-xs"
                >
                  {isSavingProfile ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      </div>
    </div>
  );
};

interface StudentOnboardingProps {
  onComplete: (profile: StudentProfile) => void;
}

const StudentOnboarding: React.FC<StudentOnboardingProps> = ({ onComplete }) => {
  const [step, setStep] = useState<"details" | "academic" | "face" | "ready">("details");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [studentId, setStudentId] = useState("");
  const [department, setDepartment] = useState("Computer Engineering");
  const [customDepartment, setCustomDepartment] = useState("");
  const [isScanning, setIsScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const [isSubmittingOnboard, setIsSubmittingOnboard] = useState(false);
  const [onboardError, setOnboardError] = useState<string | null>(null);
  const [webcamStream, setWebcamStream] = useState<MediaStream | null>(null);
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    let activeStream: MediaStream | null = null;
    if (step === "face") {
      navigator.mediaDevices.getUserMedia({ video: { width: 300, height: 300, facingMode: "user" } })
        .then((stream) => {
          activeStream = stream;
          setWebcamStream(stream);
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
          }
        })
        .catch((err) => {
          console.error("Camera access failed:", err);
        });
    }
    return () => {
      if (activeStream) {
        activeStream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [step]);


  const handleNext = () => {
    if (step === "details") {
      if (!name || !email || !studentId) {
        alert("Please fill in all fields.");
        return;
      }
      
      // Matric format check: 00/0000
      const matricRegex = /^\d{2}\/\d{4}$/;
      if (!matricRegex.test(studentId)) {
        alert("Matric Number must be in the format: 00/0000 (e.g., 20/4321)");
        return;
      }
      
      setStep("academic");
    } else if (step === "academic") {
      setStep("face");
    }
  };

  const startFaceScan = () => {
    setIsScanning(true);
    setScanProgress(0);
    const interval = setInterval(() => {
      setScanProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          setIsScanning(false);

          // Capture frame from video stream
          if (videoRef.current) {
            try {
              const canvas = document.createElement("canvas");
              canvas.width = 320;
              canvas.height = 320;
              const ctx = canvas.getContext("2d");
              if (ctx) {
                // Mirror horizontally to match preview styling
                ctx.translate(320, 0);
                ctx.scale(-1, 1);
                ctx.drawImage(videoRef.current, 0, 0, 320, 320);
                const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
                setCapturedPhoto(dataUrl);
              }
            } catch (err) {
              console.error("Failed to capture frame:", err);
            }
          }

          setStep("ready");
          return 100;
        }
        return prev + 10;
      });
    }, 200);
  };

  const handleFinish = async () => {
    setIsSubmittingOnboard(true);
    setOnboardError(null);
    const finalDept = department === "Other" ? customDepartment : department;
    
    // Generate a mock 128 float array face encoding JSON string
    const mockVector = Array.from({ length: 128 }, () => Math.random()).toString();
    const faceEncodingStr = `[${mockVector}]`;

    try {
      const res = await fetch("https://attendance-system-backend-b6ti.onrender.com/api/v1/students/onboard", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          email,
          student_id: studentId,
          department: finalDept,
          face_encoding: faceEncodingStr,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail || "Student onboarding failed.");
      }

      onComplete({
        name,
        email,
        studentId,
        dbId: data.id,
        department: finalDept,
        attendancePercentage: 100,
        attendedSessions: 0,
        totalSessions: 0,
        faceEncoding: data.face_encoding || faceEncodingStr,
      });
    } catch (err: any) {
      console.error(err);
      setOnboardError(err.message || "Failed to sync profile with database. Please check your internet connection.");
    } finally {
      setIsSubmittingOnboard(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-4 md:p-6 font-sans">
      <div className="max-w-md w-full bg-white dark:bg-slate-900/60 backdrop-blur-xl border border-slate-200 dark:border-slate-800/80 rounded-3xl p-6 shadow-md dark:shadow-2xl space-y-6">
        
        {/* Header */}
        <div className="text-center space-y-1.5">
          <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">Student Registration</h2>
          <p className="text-xs text-slate-600 dark:text-slate-400">Onboard your profile to register attendance school-wide</p>
        </div>

        {/* Step Indicator */}
        <div className="flex items-center justify-between px-4">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${step === "details" ? "bg-indigo-600 text-white" : "bg-slate-800 text-slate-600 dark:text-slate-400"}`}>1</div>
          <div className="flex-1 h-0.5 bg-slate-800 mx-2" />
          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${step === "academic" ? "bg-indigo-600 text-white" : "bg-slate-800 text-slate-600 dark:text-slate-400"}`}>2</div>
          <div className="flex-1 h-0.5 bg-slate-800 mx-2" />
          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${step === "face" ? "bg-indigo-600 text-white" : "bg-slate-800 text-slate-600 dark:text-slate-400"}`}>3</div>
          <div className="flex-1 h-0.5 bg-slate-800 mx-2" />
          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${step === "ready" ? "bg-emerald-600 text-white" : "bg-slate-800 text-slate-600 dark:text-slate-400"}`}>✓</div>
        </div>

        {/* Step 1: Personal Details */}
        {step === "details" && (
          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Full Name</label>
              <input
                type="text"
                placeholder="e.g. David Kim"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl px-4 py-2.5 text-slate-900 dark:text-white text-sm focus:outline-none focus:border-indigo-500 transition-all"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Matric / Student ID</label>
              <input
                type="text"
                placeholder="e.g. 23/0987"
                value={studentId}
                onChange={(e) => setStudentId(e.target.value)}
                className="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl px-4 py-2.5 text-slate-900 dark:text-white text-sm focus:outline-none focus:border-indigo-500 transition-all font-mono"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Email Address</label>
              <input
                type="email"
                placeholder="e.g. d.kim@university.edu"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl px-4 py-2.5 text-slate-900 dark:text-white text-sm focus:outline-none focus:border-indigo-500 transition-all"
              />
            </div>
            <button
              onClick={handleNext}
              className="w-full bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-bold py-2.5 rounded-xl transition-all shadow-lg shadow-indigo-600/20 active:scale-98 cursor-pointer"
            >
              Continue
            </button>
          </div>
        )}

        {/* Step 2: Academic Details */}
        {step === "academic" && (
          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Department</label>
              <select
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800/80 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-indigo-500 transition-all"
              >
                {DEPARTMENTS.map((dept) => (
                  <option key={dept} value={dept}>{dept}</option>
                ))}
              </select>
            </div>

            {department === "Other" && (
              <div className="space-y-1.5 animate-slideDown">
                <label className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Type Your Department</label>
                <input
                  type="text"
                  placeholder="e.g. Civil Engineering"
                  value={customDepartment}
                  onChange={(e) => setCustomDepartment(e.target.value)}
                  className="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl px-4 py-2.5 text-slate-900 dark:text-white text-sm focus:outline-none focus:border-indigo-500 transition-all"
                />
              </div>
            )}

            <div className="flex space-x-3 pt-2">
              <button
                onClick={() => setStep("details")}
                className="w-1/3 bg-slate-850 hover:bg-slate-800 text-slate-750 dark:text-slate-300 text-sm font-bold py-2.5 rounded-xl transition-all cursor-pointer"
              >
                Back
              </button>
              <button
                onClick={handleNext}
                className="w-2/3 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-bold py-2.5 rounded-xl transition-all shadow-lg shadow-indigo-600/20 active:scale-98 cursor-pointer"
              >
                Continue
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Biometric Enrolment */}
        {step === "face" && (
          <div className="space-y-5 text-center">
            <div className="space-y-1.5">
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">Face Recognition Scan</h3>
              <p className="text-[11px] text-slate-600 dark:text-slate-400">Map your facial profile for secure checking-in validation</p>
            </div>

            {/* Circular Camera Scan View */}
            <div className="w-40 h-40 rounded-full border-2 border-dashed border-indigo-500/40 mx-auto flex items-center justify-center p-2 relative overflow-hidden bg-slate-950">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover rounded-full absolute inset-0"
                style={{ transform: "scaleX(-1)" }}
              />

              {isScanning ? (
                <div className="absolute inset-0 bg-indigo-600/10 flex items-center justify-center">
                  {/* Scanner horizontal sweep line */}
                  <div className="absolute top-0 left-0 w-full h-0.5 bg-indigo-400 shadow-md shadow-indigo-400/50 animate-bounce" style={{ animationDuration: "2s" }} />
                  <span className="text-xs font-mono font-bold text-indigo-400 bg-slate-950/80 px-2 py-0.5 rounded-md animate-pulse">{scanProgress}%</span>
                </div>
              ) : (
                !webcamStream && (
                  <div className="text-slate-500 dark:text-slate-500 flex flex-col items-center space-y-1.5 absolute z-10 bg-slate-950/90 inset-0 justify-center">
                    <svg className="w-10 h-10 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.121 17.804A13.937 13.937 0 0112 16c2.5 0 4.847.655 6.879 1.804M15 10a3 3 0 11-6 0 3 3 0 016 0zm6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">Requesting Camera...</span>
                  </div>
                )
              )}
            </div>

            {isScanning ? (
              <p className="text-[10px] text-indigo-400 animate-pulse">Extracting biometric features, hold still...</p>
            ) : (
              <button
                onClick={startFaceScan}
                className="w-full bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-bold py-2.5 rounded-xl transition-all shadow-lg shadow-indigo-600/20 cursor-pointer"
              >
                Scan Face
              </button>
            )}

            <button
              onClick={() => setStep("academic")}
              disabled={isScanning}
              className="text-xs font-semibold text-slate-500 dark:text-slate-500 hover:text-slate-750 dark:text-slate-300 disabled:opacity-50 cursor-pointer"
            >
              Go Back
            </button>
          </div>
        )}

        {/* Step 4: Ready */}
        {step === "ready" && (
          <div className="space-y-5 text-center">
            {onboardError ? (
              <>
                <div className="w-16 h-16 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center mx-auto shadow-lg shadow-rose-500/5 animate-pulse">
                  ⚠️
                </div>
                <div className="space-y-1.5">
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white">Database Sync Failed</h3>
                  <p className="text-xs text-rose-400 leading-relaxed">{onboardError}</p>
                </div>
                <button
                  onClick={handleFinish}
                  className="w-full bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-bold py-2.5 rounded-xl transition-all shadow-lg shadow-indigo-600/20 cursor-pointer"
                >
                  Retry Sync
                </button>
              </>
            ) : (
              <>
                {capturedPhoto ? (
                  <div className="w-24 h-24 rounded-full border-2 border-emerald-500/40 mx-auto relative overflow-hidden bg-slate-950 shadow-xl shadow-emerald-500/10">
                    <img src={capturedPhoto} alt="Captured Face" className="w-full h-full object-cover" />
                    <div className="absolute bottom-1 right-1 w-6 h-6 rounded-full bg-emerald-500 border border-emerald-400 text-white flex items-center justify-center shadow">
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                  </div>
                ) : (
                  <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/5 animate-bounce">
                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                )}

                <div className="space-y-1.5">
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white">Registration Ready!</h3>
                  <p className="text-xs text-slate-600 dark:text-slate-400 font-medium">Verify your captured biometric profile photo. If it is blurry or misaligned, you can retake the scan before saving.</p>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      setStep("face");
                      setCapturedPhoto(null);
                    }}
                    disabled={isSubmittingOnboard}
                    className="w-1/3 py-2.5 bg-slate-900 border border-slate-800 hover:bg-slate-850 text-slate-750 dark:text-slate-300 font-bold rounded-xl transition-all cursor-pointer disabled:opacity-50 text-sm"
                  >
                    Retake
                  </button>
                  <button
                    onClick={handleFinish}
                    disabled={isSubmittingOnboard}
                    className="w-2/3 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl transition-all shadow-lg shadow-emerald-600/20 active:scale-98 cursor-pointer disabled:opacity-50 text-sm"
                  >
                    {isSubmittingOnboard ? "Saving..." : "Go to Dashboard"}
                  </button>
                </div>
              </>
            )}
          </div>
        )}

    </div>
  </div>
  );
};
export default StudentPortal;
