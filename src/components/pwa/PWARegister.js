"use client";

import { useEffect } from "react";
import {
  clearInstallPromptEvent,
  setInstallPromptEvent,
} from "@/lib/pwa/installPrompt";

export default function PWARegister() {
  useEffect(() => {
    const handleBeforeInstallPrompt = (event) => {
      event.preventDefault();
      setInstallPromptEvent(event);
    };

    const handleAppInstalled = () => {
      clearInstallPromptEvent();
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);

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

    return () => {
      window.removeEventListener(
        "beforeinstallprompt",
        handleBeforeInstallPrompt
      );
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  return null;
}
