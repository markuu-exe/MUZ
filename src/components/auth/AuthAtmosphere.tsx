/** Subtle staff + note backdrop used across AUTH FLOW screens. */
export default function AuthAtmosphere() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(139,108,255,0.14),transparent_55%)]" />
      <svg
        className="absolute left-[-6%] top-[8%] h-[52%] w-[72%] text-white/[0.045]"
        viewBox="0 0 900 420"
        fill="none"
      >
        {[90, 130, 170, 210, 250].map((y) => (
          <line key={y} x1="40" y1={y} x2="860" y2={y} stroke="currentColor" strokeWidth="2" />
        ))}
        <path
          d="M210 250c0-48 28-88 70-110v168c-18 14-42 22-70 22-38 0-70-24-70-54s32-54 70-54c10 0 20 2 28 5V140c-8-2-16-3-24-3-62 0-112 42-112 98 0 58 54 102 118 102 28 0 54-8 74-22V88h28v230c-26 20-60 32-98 32-72 0-130-48-130-110z"
          fill="currentColor"
        />
        <path
          d="M620 240c0-44 26-80 64-100v152c-16 12-38 20-64 20-34 0-64-22-64-50s30-50 64-50c9 0 18 2 26 5V132c-7-2-14-3-22-3-56 0-102 38-102 90 0 54 50 94 108 94 26 0 50-8 68-20V88h26v210c-24 18-54 28-90 28-66 0-118-44-118-100z"
          fill="currentColor"
          opacity="0.7"
        />
      </svg>
    </div>
  );
}
