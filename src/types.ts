export interface CourseDetails {
  code: string;
  title: string;
}

export interface SessionDetails {
  id: string;
  courseId: string;
  course: CourseDetails;
  startTime: string; // ISO String
  endTime: string;   // ISO String
  latitude: number;
  longitude: number;
  allowedRadiusMeters: number;
  requireDoubleSigning?: boolean;
  isCheckoutOpen?: boolean;
}

export type AttendanceStatus = 'present' | 'late' | 'absent' | 'incomplete';

export interface AttendanceRecord {
  id: string;
  studentId: string;
  studentName?: string; // Opt name field for display
  sessionId: string;
  timestamp: string; // ISO String
  status: AttendanceStatus;
  deviceHash: string;
  studentLatitude: number;
  studentLongitude: number;
}

export interface TokenInfo {
  token: string;
  expiresAt: string; // ISO String
}
