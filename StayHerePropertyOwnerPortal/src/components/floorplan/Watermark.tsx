export function Watermark() {
  return (
    <div className="sh-watermark" aria-hidden="true">
      <svg width="140" height="140" viewBox="0 0 140 140">
        <circle cx="70" cy="70" r="60" fill="none" stroke="#FF6B4A" strokeWidth="14" />
        <circle cx="70" cy="70" r="30" fill="none" stroke="#FF6B4A" strokeWidth="10" />
        <line x1="108" y1="108" x2="132" y2="132" stroke="#FF6B4A" strokeWidth="16" strokeLinecap="round" />
      </svg>
      <span>stayhere</span>
    </div>
  );
}
