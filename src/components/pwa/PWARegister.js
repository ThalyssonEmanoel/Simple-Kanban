"use client";

import { useEffect } from "react";

export default function PWARegister() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/sw.js")
        .then((registration) => {
          registration.addEventListener("updatefound", () => {
            const newWorker = registration.installing;
            if (newWorker) {
              newWorker.addEventListener("statechange", () => {
                if (
                  newWorker.state === "activated" &&
                  navigator.serviceWorker.controller
                ) {
                  // New version available — could notify user to refresh
                  console.log("[PWA] Nova versão disponível");
                }
              });
            }
          });
        })
        .catch((err) => {
          console.error("[PWA] Falha ao registrar service worker:", err);
        });
    }
  }, []);

  return null;
}
