interface PerformanceLogoProps {
  size?: number;
  className?: string;
}

export function PerformanceLogo({ size = 32, className }: PerformanceLogoProps) {
  const id = "logo-grad-" + size;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="40" y2="40" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#8B5CF6" />
          <stop offset="100%" stopColor="#4F46E5" />
        </linearGradient>
      </defs>

      {/* Background rounded square */}
      <rect width="40" height="40" rx="10" fill={`url(#${id})`} />

      {/* P letterform — vertical stroke */}
      <rect x="10" y="9" width="3.5" height="22" rx="1.75" fill="white" />

      {/* P letterform — top bowl */}
      <path
        d="M13.5 9H20C23.5 9 26 11.5 26 14.75C26 18 23.5 20.5 20 20.5H13.5"
        stroke="white"
        strokeWidth="3.5"
        strokeLinecap="round"
        fill="none"
      />

      {/* Sparkline / upward trend — bottom right */}
      <polyline
        points="16,33 20,27 25,30 31,22"
        stroke="rgba(255,255,255,0.65)"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      {/* Arrow head on trend */}
      <polyline
        points="28,20 31,22 29,25"
        stroke="rgba(255,255,255,0.65)"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </svg>
  );
}

export function PerformanceLogoMark({ size = 20, className }: PerformanceLogoProps) {
  return <PerformanceLogo size={size} className={className} />;
}
