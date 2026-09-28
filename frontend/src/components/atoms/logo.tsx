export function Logo({ className = "h-6 w-5" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 200 240"
      fill="none"
      className={className}
    >
      <g fill="currentColor" stroke="currentColor">
        <circle cx="100" cy="28" r="14" strokeWidth="8" fill="none" />
        <circle cx="100" cy="8" r="5" />
        <line x1="100" y1="42" x2="100" y2="195" strokeWidth="8" strokeLinecap="round" />
        <line x1="55" y1="82" x2="145" y2="82" strokeWidth="8" strokeLinecap="round" />
        <circle cx="55" cy="82" r="7" />
        <circle cx="145" cy="82" r="7" />
        <line x1="70" y1="95" x2="100" y2="130" strokeWidth="7" strokeLinecap="round" />
        <line x1="130" y1="95" x2="100" y2="130" strokeWidth="7" strokeLinecap="round" />
        <circle cx="70" cy="95" r="6" />
        <circle cx="130" cy="95" r="6" />
        <circle cx="100" cy="130" r="6" />
        <line x1="100" y1="195" x2="55" y2="215" strokeWidth="8" strokeLinecap="round" />
        <line x1="100" y1="195" x2="145" y2="215" strokeWidth="8" strokeLinecap="round" />
        <circle cx="55" cy="215" r="6" />
        <circle cx="145" cy="215" r="6" />
        <path d="M 52 188 C 20 188 20 235 52 235" strokeWidth="8" strokeLinecap="round" fill="none" />
        <path d="M 148 188 C 180 188 180 235 148 235" strokeWidth="8" strokeLinecap="round" fill="none" />
        <line x1="148" y1="188" x2="148" y2="235" strokeWidth="8" strokeLinecap="round" />
      </g>
    </svg>
  );
}
