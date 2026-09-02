"use client";

import { useMemo } from "react";
import nextDynamic from "next/dynamic";
import { DEMO_ROOM, demoShelvesByBay } from "@/lib/demoRoom";
import { SECTIONS, sectionColor } from "@/lib/shelf";

const Room3D = nextDynamic(() => import("@/components/Room3D"), {
  ssr: false,
  loading: () => (
    <div className="demo3d-loading">Building the room&hellip;</div>
  ),
});

export default function DemoRoom3D() {
  const shelvesByBay = useMemo(() => demoShelvesByBay(), []);

  return (
    <div className="demo3d">
      <div className="demo3d-stage">
        <Room3D room={DEMO_ROOM} shelvesByBay={shelvesByBay} />
        <span className="demo3d-hint">Drag to orbit · scroll to zoom</span>
      </div>
      <ul className="demo3d-legend" aria-label="Shelf color key">
        {SECTIONS.map((s) => (
          <li key={s.key}>
            <span
              className="demo3d-swatch"
              style={{ background: sectionColor(s) }}
              aria-hidden
            />
            {s.title}
          </li>
        ))}
      </ul>
    </div>
  );
}
