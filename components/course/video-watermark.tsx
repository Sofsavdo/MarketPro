"use client";

import { useEffect, useState } from "react";

const MOVE_INTERVAL_MS = 5000;

/**
 * A low-opacity phone+id tag that repositions every 5 seconds over the
 * video. Doesn't stop someone from screen-recording the class, but it makes
 * any recording traceable back to the account that leaked it — the same
 * deterrent VdoCipher-style DRM watermarking uses, without needing a paid
 * video host. `pointer-events-none` keeps it from blocking the player's own
 * controls.
 */
interface Position {
  top: number;
  side: "left" | "right";
  offset: number;
}

export function VideoWatermark({ text }: { text: string }) {
  const [position, setPosition] = useState<Position>({ top: 10, side: "left", offset: 5 });

  useEffect(() => {
    function randomize() {
      // Anchoring from whichever edge is nearer (instead of always `left`)
      // means the text grows away from that edge, so it can never run past
      // the opposite side regardless of how long the phone number + id is —
      // a fixed `left: %` with nowrap text risks clipping near the right
      // edge on narrow players. Stay within a safe inner margin top/bottom
      // too, so the tag never sits under the player's own control bar.
      setPosition({
        top: 8 + Math.random() * 78,
        side: Math.random() < 0.5 ? "left" : "right",
        offset: 5 + Math.random() * 40,
      });
    }
    randomize();
    const id = setInterval(randomize, MOVE_INTERVAL_MS);
    return () => clearInterval(id);
  }, []);

  if (!text) return null;

  return (
    <div
      aria-hidden
      className="pointer-events-none absolute z-10 select-none whitespace-nowrap rounded bg-black/30 px-2 py-1 text-xs font-medium text-white opacity-40 transition-[top,left,right] duration-1000 ease-in-out"
      style={{
        top: `${position.top}%`,
        [position.side]: `${position.offset}%`,
      }}
    >
      {text}
    </div>
  );
}
