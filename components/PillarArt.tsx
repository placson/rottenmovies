/**
 * Small inline-SVG illustrations for the three "how it works" cards:
 *   - simply:        an iPhone scanning a book's barcode
 *   - systematically: book spines standing in color-coded genre groups
 *   - visually:      a little isometric 3D bookcase
 * Pure SVG so the cards need no image assets and stay crisp at any size.
 */

type Kind = "simply" | "systematically" | "visually";

// Barcode bars for the phone viewfinder (bar widths; alternates bar/gap).
const BARS = [2, 1, 1, 2, 1, 3, 1, 1, 2, 1, 2, 1, 1, 2, 1, 3, 1, 1, 2, 1];

function Simply() {
  const x0 = 145;
  const y0 = 96;
  const h = 20;
  const unit = 1.5;
  let x = x0;
  const bars: React.ReactNode[] = [];
  BARS.forEach((w, i) => {
    const width = w * unit;
    if (i % 2 === 0)
      bars.push(
        <rect key={i} x={x} y={y0} width={width} height={h} fill="#17140f" />
      );
    x += width;
  });

  return (
    <svg viewBox="0 0 320 180" className="pillar-svg" role="img" aria-label="A phone scanning a book barcode">
      <defs>
        <linearGradient id="pa-view" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#2b2620" />
          <stop offset="1" stopColor="#413a30" />
        </linearGradient>
        <linearGradient id="pa-cover" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#3f6d55" />
          <stop offset="1" stopColor="#2c5140" />
        </linearGradient>
        <linearGradient id="pa-scan" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#a7d17f" stopOpacity="0" />
          <stop offset="0.5" stopColor="#a7d17f" />
          <stop offset="1" stopColor="#a7d17f" stopOpacity="0" />
        </linearGradient>
        <clipPath id="pa-screen">
          <rect x="127" y="20" width="66" height="140" rx="11" />
        </clipPath>
      </defs>
      <rect x="0" y="0" width="320" height="180" fill="#e9efdf" />
      {/* phone */}
      <rect x="120" y="12" width="80" height="156" rx="17" fill="#151310" />
      <g clipPath="url(#pa-screen)">
        <rect x="127" y="20" width="66" height="140" fill="url(#pa-view)" />
        {/* book cover in view */}
        <g transform="rotate(-4 160 110)">
          <rect x="134" y="66" width="52" height="92" rx="4" fill="url(#pa-cover)" />
          <rect x="139" y="88" width="42" height="34" rx="3" fill="#fbf7ee" />
          {bars}
        </g>
        {/* reticle */}
        <rect x="132" y="80" width="56" height="50" rx="7" fill="none" stroke="#a7d17f" strokeOpacity="0.55" strokeWidth="1.5" />
        <path d="M138 88 v-4 a4 4 0 0 1 4 -4 h4" fill="none" stroke="#a7d17f" strokeWidth="2.4" strokeLinecap="round" />
        <path d="M182 88 v-4 a4 4 0 0 0 -4 -4 h-4" fill="none" stroke="#a7d17f" strokeWidth="2.4" strokeLinecap="round" />
        <path d="M138 122 v4 a4 4 0 0 0 4 4 h4" fill="none" stroke="#a7d17f" strokeWidth="2.4" strokeLinecap="round" />
        <path d="M182 122 v4 a4 4 0 0 1 -4 4 h-4" fill="none" stroke="#a7d17f" strokeWidth="2.4" strokeLinecap="round" />
        <rect className="pillar-scanline" x="136" y="82" width="48" height="2.5" rx="1.25" fill="url(#pa-scan)" />
      </g>
      {/* dynamic island */}
      <rect x="150" y="24" width="20" height="7" rx="3.5" fill="#050403" />
    </svg>
  );
}

const GROUPS: { hue: number; spines: number }[] = [
  { hue: 265, spines: 5 }, // theology — purple
  { hue: 205, spines: 4 }, // biblical — blue
  { hue: 25, spines: 4 }, // history — orange
  { hue: 100, spines: 4 }, // general — green
];

function Systematically() {
  const baseY = 150;
  const spineW = 12;
  const spineGap = 3;
  const groupGap = 16;
  const startX = 30;

  const spines: React.ReactNode[] = [];
  const underlines: React.ReactNode[] = [];
  let x = startX;
  GROUPS.forEach((g, gi) => {
    const gStart = x;
    for (let i = 0; i < g.spines; i++) {
      // Deterministic height/shade variation per spine.
      const seed = gi * 7 + i;
      const hgt = 84 + ((seed * 37) % 34);
      const light = 44 + ((seed * 13) % 20);
      spines.push(
        <rect
          key={`${gi}-${i}`}
          x={x}
          y={baseY - hgt}
          width={spineW}
          height={hgt}
          rx={2.5}
          fill={`hsl(${g.hue} 55% ${light}%)`}
        />
      );
      x += spineW + spineGap;
    }
    const gEnd = x - spineGap;
    underlines.push(
      <rect
        key={`u-${gi}`}
        x={gStart}
        y={baseY + 8}
        width={gEnd - gStart}
        height={4}
        rx={2}
        fill={`hsl(${g.hue} 55% 50%)`}
      />
    );
    x += groupGap;
  });

  return (
    <svg viewBox="0 0 320 180" className="pillar-svg" role="img" aria-label="Book spines arranged in color-coded groups">
      <rect x="0" y="0" width="320" height="180" fill="#f2eee4" />
      {spines}
      {/* shelf plank */}
      <rect x="22" y="150" width="276" height="9" rx="2.5" fill="#6b4a2f" />
      <rect x="22" y="159" width="276" height="4" rx="2" fill="#4f3722" />
      {underlines}
    </svg>
  );
}

// One row of colored spines on the bookcase front face.
function shelfBooks(y: number, rowSeed: number) {
  const items: React.ReactNode[] = [];
  const hues = [265, 205, 25, 100, 330, 155, 45];
  let x = 98;
  let i = 0;
  while (x < 222) {
    const seed = rowSeed * 5 + i;
    const w = 6 + ((seed * 11) % 8);
    const hue = hues[(rowSeed + i) % hues.length];
    const hgt = 20 + ((seed * 7) % 6);
    items.push(
      <rect
        key={`${rowSeed}-${i}`}
        x={x}
        y={y - hgt}
        width={w}
        height={hgt}
        fill={`hsl(${hue} 52% ${46 + ((seed * 9) % 16)}%)`}
      />
    );
    x += w + 1.5;
    i++;
  }
  return items;
}

function Visually() {
  const rows = [70, 100, 130];
  return (
    <svg viewBox="0 0 320 180" className="pillar-svg" role="img" aria-label="A small 3D bookcase model">
      <rect x="0" y="0" width="320" height="180" fill="#0f1115" />
      {/* soft floor */}
      <ellipse cx="160" cy="158" rx="120" ry="18" fill="#1a1e26" />
      {/* top face */}
      <polygon points="90,40 230,40 262,22 122,22" fill="#8a5a34" />
      {/* right side face */}
      <polygon points="230,40 262,22 262,132 230,150" fill="#553a25" />
      {/* front face */}
      <rect x="90" y="40" width="140" height="110" fill="#6b4a2f" />
      {/* shelves + books on the front face */}
      {rows.map((y, r) => (
        <g key={r}>
          {shelfBooks(y, r)}
          <rect x="92" y={y} width="136" height="5" fill="#7a5a3a" />
        </g>
      ))}
      {/* bottom plank */}
      <rect x="92" y="144" width="136" height="6" fill="#7a5a3a" />
    </svg>
  );
}

export default function PillarArt({ kind }: { kind: Kind }) {
  if (kind === "simply") return <Simply />;
  if (kind === "systematically") return <Systematically />;
  return <Visually />;
}
