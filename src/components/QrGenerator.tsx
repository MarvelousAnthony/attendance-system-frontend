import React from "react";
import { QRCodeSVG } from "qrcode.react";
import { SessionDetails } from "../types";

interface QrGeneratorProps {
  session: SessionDetails;
  token: string | null;
  secondsLeft: number;
  isTokenLoading: boolean;
  tokenError: string | null;
  onRefresh: () => void;
}

export const QrGenerator: React.FC<QrGeneratorProps> = ({
  session,
  token,
  secondsLeft,
  isTokenLoading,
  tokenError,
  onRefresh,
}) => {
  // SVG Progress Ring calculations
  const radius = 36;
  const stroke = 6;
  const normalizedRadius = radius - stroke * 2;
  const circumference = normalizedRadius * 2 * Math.PI; // ~150.8
  const strokeDashoffset = circumference - (secondsLeft / 15) * circumference;

  // Determine progress color indicator based on remaining time
  const getProgressColor = () => {
    if (secondsLeft > 10) return "stroke-emerald-400";
    if (secondsLeft > 4) return "stroke-amber-400";
    return "stroke-rose-500 animate-pulse";
  };

  // Format session date range nicely
  const formatSessionTime = (startStr: string, endStr: string) => {
    const options: Intl.DateTimeFormatOptions = {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    };
    const start = new Date(startStr).toLocaleTimeString([], options);
    const end = new Date(endStr).toLocaleTimeString([], options);
    return `${start} - ${end}`;
  };

  const formattedDate = new Date(session.startTime).toLocaleDateString([], {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="flex flex-col bg-slate-900/60 backdrop-blur-xl border border-slate-800/80 rounded-3xl p-8 shadow-2xl transition-all duration-300 hover:border-indigo-500/30">
      {/* Course & Session Info */}
      <div className="mb-8 space-y-4">
        <div>
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
            Active Session
          </span>
        </div>
        <div>
          <h2 className="text-3xl font-extrabold text-white tracking-tight leading-tight">
            {session.course.title}
          </h2>
          <p className="text-lg font-medium text-indigo-400/90 mt-1">
            {session.course.code}
          </p>
        </div>
        
        <div className="pt-4 border-t border-slate-800/60 grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Date</p>
            <p className="text-sm font-medium text-slate-300 mt-1">{formattedDate}</p>
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Session Time</p>
            <p className="text-sm font-medium text-slate-300 mt-1">
              {formatSessionTime(session.startTime, session.endTime)}
            </p>
          </div>
        </div>
      </div>

      {/* QR Code Presentation Display */}
      <div className="relative flex flex-col items-center justify-center bg-slate-950/80 rounded-2xl p-8 border border-slate-900 shadow-inner min-h-[340px]">
        {isTokenLoading && !token && (
          <div className="flex flex-col items-center justify-center space-y-3">
            <div className="w-12 h-12 rounded-full border-4 border-indigo-500/20 border-t-indigo-500 animate-spin" />
            <p className="text-sm text-slate-400">Syncing dynamic token...</p>
          </div>
        )}

        {tokenError && (
          <div className="flex flex-col items-center justify-center text-center p-4">
            <svg
              className="w-12 h-12 text-rose-500 mb-3"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
            <p className="text-sm font-semibold text-rose-400">Token Sync Failed</p>
            <p className="text-xs text-slate-500 mt-1 max-w-xs">{tokenError}</p>
            <button
              onClick={onRefresh}
              className="mt-4 px-4 py-2 bg-indigo-600 text-white text-xs font-semibold rounded-lg hover:bg-indigo-500 active:scale-95 transition-all shadow-md shadow-indigo-600/25"
            >
              Retry Connection
            </button>
          </div>
        )}

        {token && !tokenError && (
          <div className="flex flex-col items-center space-y-6">
            <div className="bg-white p-4 rounded-xl shadow-lg border border-slate-200">
              <QRCodeSVG
                value={token}
                size={220}
                level="H"
                includeMargin={false}
                imageSettings={{
                  src: "https://raw.githubusercontent.com/simple-icons/simple-icons/develop/icons/fastapi.svg",
                  x: undefined,
                  y: undefined,
                  height: 35,
                  width: 35,
                  excavate: true,
                }}
              />
            </div>
            
            <p className="text-xs font-medium text-slate-400 text-center tracking-wide">
              Scan this dynamic QR code to log attendance
            </p>
          </div>
        )}

        {/* Floating Ring Countdown */}
        {token && !tokenError && (
          <div className="absolute top-4 right-4 flex items-center justify-center">
            <svg className="w-16 h-16 transform -rotate-90">
              <circle
                className="text-slate-800"
                strokeWidth={stroke}
                stroke="currentColor"
                fill="transparent"
                r={normalizedRadius}
                cx="32"
                cy="32"
              />
              <circle
                className={`transition-all duration-1000 ease-linear ${getProgressColor()}`}
                strokeWidth={stroke}
                strokeDasharray={`${circumference} ${circumference}`}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                fill="transparent"
                r={normalizedRadius}
                cx="32"
                cy="32"
              />
            </svg>
            <span className="absolute text-sm font-bold text-white tracking-tighter">
              {secondsLeft}s
            </span>
          </div>
        )}
      </div>
      
      {/* Geofence Metadata Footer */}
      <div className="mt-6 flex items-center space-x-2 text-slate-500 text-xs font-medium bg-slate-950/30 border border-slate-900 rounded-xl p-3">
        <svg className="w-4 h-4 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
        <span>
          Geofence center: {session.latitude.toFixed(6)}, {session.longitude.toFixed(6)} (±{session.allowedRadiusMeters}m)
        </span>
      </div>
    </div>
  );
};
