/**
 * Decorative iPhone mockup for the splash hero: a camera viewfinder framed on
 * a book's barcode mid-scan, with an "Added to library" confirmation. Pure
 * inline SVG + CSS (see .scanphone-* rules) so it needs no external image.
 */

// A plausible EAN-13 bar pattern (bar widths in SVG units, alternating
// bar/gap starting with a bar). Deterministic so the render is stable.
const BARS = [
  2, 1, 1, 2, 3, 1, 1, 1, 2, 2, 1, 3, 1, 1, 2, 1, 1, 2, 3, 1, 2, 1, 1, 1, 2, 1,
  3, 1, 1, 2, 1, 2, 1, 1, 3, 2, 1, 1, 2, 1,
];

function Barcode() {
  const x0 = 104;
  const y0 = 372;
  const h = 52;
  const unit = 2.2;
  let x = x0;
  const rects: React.ReactNode[] = [];
  BARS.forEach((w, i) => {
    const width = w * unit;
    if (i % 2 === 0) {
      rects.push(
        <rect key={i} x={x} y={y0} width={width} height={h} fill="#17140f" />
      );
    }
    x += width;
  });
  return <g>{rects}</g>;
}

export default function ScanPhone() {
  return (
    <svg
      className="scanphone"
      viewBox="0 0 300 610"
      role="img"
      aria-label="An iPhone scanning a book's barcode and adding it to the library"
    >
      <defs>
        <linearGradient id="sp-view" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#2b2620" />
          <stop offset="1" stopColor="#413a30" />
        </linearGradient>
        <linearGradient id="sp-cover" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#3f6d55" />
          <stop offset="1" stopColor="#2c5140" />
        </linearGradient>
        <linearGradient id="sp-scan" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#a7d17f" stopOpacity="0" />
          <stop offset="0.5" stopColor="#a7d17f" stopOpacity="1" />
          <stop offset="1" stopColor="#a7d17f" stopOpacity="0" />
        </linearGradient>
        <clipPath id="sp-screen">
          <rect x="22" y="22" width="256" height="566" rx="34" />
        </clipPath>
      </defs>

      {/* phone body */}
      <rect
        x="8"
        y="8"
        width="284"
        height="594"
        rx="48"
        fill="#151310"
        stroke="#2c281f"
        strokeWidth="2"
      />
      {/* side buttons */}
      <rect x="4" y="150" width="4" height="46" rx="2" fill="#2c281f" />
      <rect x="4" y="210" width="4" height="46" rx="2" fill="#2c281f" />
      <rect x="292" y="180" width="4" height="70" rx="2" fill="#2c281f" />

      {/* screen / camera viewfinder */}
      <g clipPath="url(#sp-screen)">
        <rect x="22" y="22" width="256" height="566" fill="url(#sp-view)" />

        {/* soft vignette */}
        <rect x="22" y="22" width="256" height="566" fill="#000" opacity="0.12" />

        {/* the book being scanned (tilted) */}
        <g transform="rotate(-5 150 400)">
          <rect
            x="60"
            y="250"
            width="180"
            height="300"
            rx="8"
            fill="url(#sp-cover)"
          />
          <rect
            x="60"
            y="250"
            width="14"
            height="300"
            rx="4"
            fill="#20493a"
          />
          {/* white barcode label */}
          <rect x="92" y="356" width="116" height="96" rx="5" fill="#fbf7ee" />
          <Barcode />
          <text
            x="150"
            y="440"
            textAnchor="middle"
            fontFamily="ui-monospace, Menlo, monospace"
            fontSize="9"
            fill="#17140f"
            letterSpacing="1"
          >
            9 780007 461219
          </text>
        </g>

        {/* scanning reticle */}
        <g className="scanphone-reticle">
          <rect
            x="78"
            y="338"
            width="144"
            height="132"
            rx="14"
            fill="none"
            stroke="#a7d17f"
            strokeOpacity="0.5"
            strokeWidth="2"
          />
          {/* corner brackets */}
          <path
            d="M88 350 v-8 a6 6 0 0 1 6 -6 h8"
            fill="none"
            stroke="#a7d17f"
            strokeWidth="3.5"
            strokeLinecap="round"
          />
          <path
            d="M212 350 v-8 a6 6 0 0 0 -6 -6 h-8"
            fill="none"
            stroke="#a7d17f"
            strokeWidth="3.5"
            strokeLinecap="round"
          />
          <path
            d="M88 458 v8 a6 6 0 0 0 6 6 h8"
            fill="none"
            stroke="#a7d17f"
            strokeWidth="3.5"
            strokeLinecap="round"
          />
          <path
            d="M212 458 v8 a6 6 0 0 1 -6 6 h-8"
            fill="none"
            stroke="#a7d17f"
            strokeWidth="3.5"
            strokeLinecap="round"
          />
          {/* animated scan line */}
          <rect
            className="scanphone-line"
            x="86"
            y="340"
            width="128"
            height="3"
            rx="1.5"
            fill="url(#sp-scan)"
          />
        </g>

        {/* top status chip */}
        <g>
          <rect
            x="40"
            y="42"
            width="118"
            height="30"
            rx="15"
            fill="#17140f"
            opacity="0.62"
          />
          <circle className="scanphone-dot" cx="58" cy="57" r="5" fill="#e05a4a" />
          <text
            x="72"
            y="61"
            fontFamily="system-ui, sans-serif"
            fontSize="13"
            fontWeight="600"
            fill="#fbf7ee"
          >
            Scanning…
          </text>
        </g>

        {/* bottom "added" toast */}
        <g>
          <rect
            x="46"
            y="512"
            width="208"
            height="46"
            rx="23"
            fill="#688d43"
          />
          <circle cx="72" cy="535" r="12" fill="#fbf7ee" />
          <path
            d="M66 535 l4 4 l8 -8"
            fill="none"
            stroke="#688d43"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <text
            x="92"
            y="531"
            fontFamily="system-ui, sans-serif"
            fontSize="13"
            fontWeight="700"
            fill="#fbf7ee"
          >
            Added to library
          </text>
          <text
            x="92"
            y="547"
            fontFamily="system-ui, sans-serif"
            fontSize="11"
            fill="#e7efd9"
          >
            Mere Christianity
          </text>
        </g>
      </g>

      {/* dynamic island */}
      <rect x="116" y="34" width="68" height="20" rx="10" fill="#050403" />
    </svg>
  );
}
