"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Wraps a horizontally-scrollable admin table (min-w-[...] + overflow-x-auto)
 * with a right-edge fade so a narrower viewport doesn't just look like the
 * table got cut off mid-column — it's a visible cue there's more to swipe to.
 * The fade disappears once scrolled to the end, and never renders at all if
 * the table already fits (no overflow), so it's a no-op on desktop.
 */
export function ScrollFadeX({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const [showFade, setShowFade] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    function update() {
      if (!el) return;
      setShowFade(el.scrollWidth - el.clientWidth - el.scrollLeft > 4);
    }

    update();
    el.addEventListener("scroll", update);
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => {
      el.removeEventListener("scroll", update);
      observer.disconnect();
    };
  }, []);

  return (
    <div className="relative">
      <div ref={ref} className="overflow-x-auto">
        {children}
      </div>
      {showFade && (
        <div className="pointer-events-none absolute inset-y-0 right-0 w-10 bg-gradient-to-l from-slate-950 to-transparent" />
      )}
    </div>
  );
}
