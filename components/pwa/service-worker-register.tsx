"use client";

import { useEffect } from "react";

/** Registers the offline/caching service worker (public/sw.js) once the page has loaded. */
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        // Offline support is a nice-to-have — a failed registration
        // (unsupported browser, blocked storage) shouldn't affect the page.
      });
    });
  }, []);

  return null;
}
