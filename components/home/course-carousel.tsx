"use client";

import { useRef } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

/**
 * Horizontal scroll-snap strip for the home page's course cards — CSS does
 * the actual scrolling/snapping, this only wires the two arrow buttons to
 * scrollBy() since that needs a ref to the scroll container.
 */
export function CourseCarousel({ children }: { children: React.ReactNode }) {
  const trackRef = useRef<HTMLDivElement>(null);

  function scroll(direction: 1 | -1) {
    trackRef.current?.scrollBy({ left: direction * 320, behavior: "smooth" });
  }

  return (
    <div className="relative mt-12">
      <div
        ref={trackRef}
        className="scrollbar-hide -mx-1 flex snap-x snap-mandatory gap-5 overflow-x-auto px-1 pb-2"
      >
        {children}
      </div>
      <div className="mt-2 flex justify-end gap-2">
        <button
          type="button"
          onClick={() => scroll(-1)}
          aria-label="Oldingi"
          className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 transition-colors hover:border-amber-400 hover:text-amber-700"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={() => scroll(1)}
          aria-label="Keyingi"
          className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 transition-colors hover:border-amber-400 hover:text-amber-700"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
