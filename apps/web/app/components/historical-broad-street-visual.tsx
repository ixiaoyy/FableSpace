export function HistoricalBroadStreetVisual({ className = "", compact = false }: { className?: string; compact?: boolean }) {
  const suffix = compact ? "compact" : "wide"

  return (
    <svg
      viewBox="0 0 720 420"
      role="img"
      aria-label="1854 年伦敦宽街，一个小女孩抱着缺口陶罐站在水泵旁"
      className={className}
      preserveAspectRatio="xMidYMid slice"
    >
      <defs>
        <linearGradient id={`broad-street-sky-${suffix}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#11162c" />
          <stop offset="0.58" stopColor="#25294b" />
          <stop offset="1" stopColor="#4a4561" />
        </linearGradient>
        <linearGradient id={`broad-street-road-${suffix}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#292d4a" />
          <stop offset="1" stopColor="#11152a" />
        </linearGradient>
        <radialGradient id={`broad-street-lamp-${suffix}`}>
          <stop offset="0" stopColor="#f3d99b" stopOpacity="0.72" />
          <stop offset="1" stopColor="#f3d99b" stopOpacity="0" />
        </radialGradient>
        <filter id={`broad-street-blur-${suffix}`}>
          <feGaussianBlur stdDeviation="12" />
        </filter>
        <pattern id={`broad-street-rain-${suffix}`} width="34" height="34" patternUnits="userSpaceOnUse" patternTransform="rotate(18)">
          <line x1="4" y1="0" x2="4" y2="13" stroke="#c9d4e8" strokeOpacity="0.18" strokeWidth="1.4" />
          <line x1="22" y1="16" x2="22" y2="25" stroke="#c9d4e8" strokeOpacity="0.11" strokeWidth="1" />
        </pattern>
      </defs>

      <rect width="720" height="420" fill={`url(#broad-street-sky-${suffix})`} />
      <circle cx="535" cy="104" r="92" fill={`url(#broad-street-lamp-${suffix})`} filter={`url(#broad-street-blur-${suffix})`} />

      <g fill="#101426" opacity="0.9">
        <path d="M0 112 78 72l78 39v174H0Z" />
        <path d="m110 101 88-52 85 49v187H110Z" />
        <path d="m520 95 82-45 118 55v180H520Z" />
      </g>
      <g fill="#d6b978" opacity="0.34">
        <rect x="34" y="142" width="24" height="39" rx="2" />
        <rect x="82" y="142" width="24" height="39" rx="2" />
        <rect x="153" y="126" width="25" height="42" rx="2" />
        <rect x="205" y="126" width="25" height="42" rx="2" />
        <rect x="570" y="128" width="27" height="43" rx="2" />
        <rect x="626" y="128" width="27" height="43" rx="2" />
      </g>

      <path d="M0 278 720 241v179H0Z" fill={`url(#broad-street-road-${suffix})`} />
      <g stroke="#9198ad" strokeOpacity="0.16" strokeWidth="2">
        <path d="m0 328 720-49" />
        <path d="m0 381 720-61" />
        <path d="m122 269 40 151" />
        <path d="m287 260 16 160" />
        <path d="m468 251-10 169" />
        <path d="m632 244-40 176" />
      </g>

      <g transform="translate(458 138)" fill="#111526" stroke="#8e86a8" strokeWidth="4">
        <path d="M48 45h31c22 0 36 13 36 34v16h-13V80c0-14-8-21-23-21H48Z" />
        <path d="M40 46h22v168H40Z" />
        <path d="M27 31h48v22H27Z" />
        <path d="M31 211h41l13 25H18Z" />
        <path d="M112 88h45v12h-45Z" />
        <path d="M149 96h14v25h-14Z" />
        <path d="m54 30 47-22 7 13-42 24Z" />
      </g>
      <ellipse cx="512" cy="381" rx="98" ry="17" fill="#090c18" opacity="0.45" />

      <g transform="translate(236 126)">
        <ellipse cx="84" cy="245" rx="76" ry="14" fill="#090c18" opacity="0.48" />
        <path
          d="M42 75c6-31 24-48 49-48 27 0 45 19 48 50l-10 17H53Z"
          fill="#171a2d"
          stroke="#77738f"
          strokeWidth="4"
        />
        <circle cx="91" cy="66" r="29" fill="#b79b88" />
        <path
          d="M63 63c2-25 14-38 30-38 21 0 34 15 35 42-15-7-26-18-31-31-7 15-18 24-34 27Z"
          fill="#26283d"
        />
        <path d="M79 68h3M104 68h3" stroke="#282435" strokeWidth="5" strokeLinecap="round" />
        <path d="M85 83c5 3 10 3 15 0" fill="none" stroke="#705f60" strokeWidth="3" strokeLinecap="round" />
        <path
          d="M52 94c20-13 58-13 78 0l17 118H35Z"
          fill="#292d4a"
          stroke="#77738f"
          strokeWidth="4"
          strokeLinejoin="round"
        />
        <path d="M52 104 26 165l22 11 31-54M129 104l24 58-21 12-31-53" fill="#292d4a" stroke="#77738f" strokeWidth="4" strokeLinejoin="round" />
        <path d="M58 209 51 247M123 209l8 38" stroke="#171a2d" strokeWidth="14" strokeLinecap="round" />
        <path d="M38 248h30M116 248h31" stroke="#77738f" strokeWidth="8" strokeLinecap="round" />
        <g transform="translate(68 125)">
          <path
            d="M8 13h48l8 18-5 58H5L0 31Z"
            fill="#665462"
            stroke="#c6aa8b"
            strokeWidth="4"
            strokeLinejoin="round"
          />
          <path d="M9 13 20 3l8 10L38 2l10 11" fill="none" stroke="#c6aa8b" strokeWidth="4" strokeLinejoin="round" />
          <path d="M57 31c20 0 22 38 3 39" fill="none" stroke="#c6aa8b" strokeWidth="5" />
          <path d="M13 42h40" stroke="#8f7480" strokeWidth="3" opacity="0.7" />
        </g>
        <path d="M45 166c17 11 34 15 52 12M136 166c-16 10-32 14-49 12" fill="none" stroke="#b79b88" strokeWidth="9" strokeLinecap="round" />
      </g>

      <rect width="720" height="420" fill={`url(#broad-street-rain-${suffix})`} />
      <path d="M0 225c151-39 241 24 368-3s216-78 352-31v84H0Z" fill="#b7bfd0" opacity="0.07" />
    </svg>
  )
}
