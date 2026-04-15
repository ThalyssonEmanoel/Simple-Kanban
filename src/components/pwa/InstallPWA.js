"use client";

import { useState, useEffect, useCallback } from "react";

function isIOS() {
  if (typeof window === "undefined") return false;
  return (
    /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.userAgent.includes("Mac") && "ontouchend" in document)
  );
}

function isInStandaloneMode() {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    window.navigator.standalone === true
  );
}

export default function InstallPWA({ variant = "navbar" }) {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showIOSGuide, setShowIOSGuide] = useState(false);
  const [installed, setInstalled] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [showSuccessMsg, setShowSuccessMsg] = useState(false);

  useEffect(() => {
    setIsStandalone(isInStandaloneMode());

    const handleBeforeInstall = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    const handleAppInstalled = () => {
      setDeferredPrompt(null);
      setInstalled(true);
      setShowSuccessMsg(true);
      setTimeout(() => setShowSuccessMsg(false), 4000);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstall);
    window.addEventListener("appinstalled", handleAppInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstall);
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  const handleInstallClick = useCallback(async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === "accepted") {
        setDeferredPrompt(null);
      }
    } else if (isIOS()) {
      setShowIOSGuide(true);
    }
  }, [deferredPrompt]);

  // Don't show if already installed/standalone
  if (isStandalone || installed) {
    if (showSuccessMsg) {
      return (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 rounded-lg bg-green-600 px-4 py-3 text-white text-sm font-medium shadow-lg flex items-center gap-2 animate-fade-in">
          <svg className="h-5 w-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          App instalado com sucesso!
        </div>
      );
    }
    return null;
  }

  // Show button only if installable (Android/Chrome) or iOS
  const canShow = deferredPrompt || isIOS();
  if (!canShow) return null;

  return (
    <>
      {/* Install Button */}
      {variant === "navbar" ? (
        <button
          onClick={handleInstallClick}
          className="flex items-center gap-1.5 rounded-lg border border-primary/30 bg-primary/5 px-3 py-1.5 text-sm font-medium text-primary hover:bg-primary/10 transition-colors"
          title="Instalar aplicativo"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          <span className="hidden sm:inline">Instalar App</span>
        </button>
      ) : (
        <button
          onClick={handleInstallClick}
          className="flex items-center gap-2 rounded-lg border border-primary/30 bg-primary/5 px-3 py-2 text-sm font-medium text-primary hover:bg-primary/10 transition-colors"
          title="Instalar aplicativo"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          Instalar App
        </button>
      )}

      {/* iOS Installation Guide Modal */}
      {showIOSGuide && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl animate-slide-up">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">
                Instalar Kanban
              </h3>
              <button
                onClick={() => setShowIOSGuide(false)}
                className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <p className="text-sm text-gray-600 mb-5">
              No Safari do iOS, siga os passos abaixo para instalar o app:
            </p>

            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                  1
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    Toque no botão Compartilhar
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    O ícone{" "}
                    <svg className="inline h-4 w-4 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                    </svg>{" "}
                    na barra inferior do Safari
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                  2
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    Adicionar à Tela de Início
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Role para baixo e toque em &quot;Adicionar à Tela de Início&quot;
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                  3
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    Confirme tocando em &quot;Adicionar&quot;
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    O app aparecerá na sua tela inicial
                  </p>
                </div>
              </div>
            </div>

            <button
              onClick={() => setShowIOSGuide(false)}
              className="mt-6 w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-white hover:bg-primary-hover transition-colors"
            >
              Entendi
            </button>
          </div>
        </div>
      )}
    </>
  );
}
