export function UavMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" aria-hidden="true">
      <circle cx="5" cy="5" r="2.15" stroke="currentColor" strokeWidth="1.6" />
      <circle cx="19" cy="5" r="2.15" stroke="currentColor" strokeWidth="1.6" />
      <circle cx="5" cy="19" r="2.15" stroke="currentColor" strokeWidth="1.6" />
      <circle cx="19" cy="19" r="2.15" stroke="currentColor" strokeWidth="1.6" />
      <path
        d="M6.6 6.6 9.8 9.8M17.4 6.6 14.2 9.8M6.6 17.4 9.8 14.2M17.4 17.4 14.2 14.2"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
      <rect x="9.15" y="9.15" width="5.7" height="5.7" rx="1.2" fill="currentColor" />
    </svg>
  );
}
