"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import NotificationCenter from "./NotificationCenter";
import InstallPWA from "../pwa/InstallPWA";
import { getInitials } from "@/lib/utils";

export default function Navbar({ project, onRefresh, onlineMembers = [] }) {
  const [showCode, setShowCode] = useState(false);
  const [codeCopied, setCodeCopied] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [showOnlineList, setShowOnlineList] = useState(false);
  const [user, setUser] = useState(null);
  const [currentMember, setCurrentMember] = useState(null);
  const router = useRouter();
  const supabase = createClient();
  const onlineListRef = useRef(null);

  useEffect(() => {
    async function getUser() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      setUser(user);

      if (user && project) {
        const member = project.members.find(
          (m) => m.user.email === user.email
        );
        setCurrentMember(member);
      }
    }
    getUser();
  }, [supabase.auth, project]);

  useEffect(() => {
    if (!showOnlineList) return;
    function handleClickOutside(e) {
      if (onlineListRef.current && !onlineListRef.current.contains(e.target)) {
        setShowOnlineList(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showOnlineList]);

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  async function handleCopyCode() {
    try {
      await navigator.clipboard.writeText(project.code);
      setCodeCopied(true);
      setTimeout(() => setCodeCopied(false), 2000);
    } catch {
      // Fallback for older browsers / insecure contexts
      const ta = document.createElement("textarea");
      ta.value = project.code;
      document.body.appendChild(ta);
      ta.select();
      try {
        document.execCommand("copy");
        setCodeCopied(true);
        setTimeout(() => setCodeCopied(false), 2000);
      } catch {
        // ignore
      }
      document.body.removeChild(ta);
    }
  }

  const MAX_AVATARS = 3;
  const visibleOnline = onlineMembers.slice(0, MAX_AVATARS);
  const overflowOnline = Math.max(0, onlineMembers.length - MAX_AVATARS);

  return (
    <header className="border-b bg-white shadow-sm">
      <div className="flex items-center justify-between px-3 py-2 sm:px-4 sm:py-3">
        <div className="flex items-center gap-2 sm:gap-4 min-w-0">
          <button
            onClick={() => router.push("/")}
            className="flex h-8 w-8 sm:h-9 sm:w-9 shrink-0 items-center justify-center rounded-lg bg-primary text-white font-bold text-sm hover:bg-primary-hover transition-colors"
          >
            K
          </button>
          <div className="min-w-0">
            <h1 className="text-sm sm:text-lg font-bold text-gray-900 truncate">{project.name}</h1>
            {project.description && (
              <p className="text-xs text-gray-500 truncate hidden sm:block">{project.description}</p>
            )}
          </div>

          {/* Invite code + copy button */}
          <div className="hidden sm:flex items-center gap-1 shrink-0">
            <button
              onClick={() => setShowCode(!showCode)}
              className="rounded-md bg-gray-100 px-2 py-1 text-xs font-mono text-gray-500 hover:bg-gray-200 transition-colors"
              title="Código de convite"
            >
              {project.code}
            </button>
            <button
              onClick={handleCopyCode}
              className="rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
              title={codeCopied ? "Copiado!" : "Copiar código"}
              aria-label="Copiar código do projeto"
            >
              {codeCopied ? (
                <svg className="h-4 w-4 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              )}
            </button>
          </div>
        </div>

        {/* Desktop actions */}
        <div className="hidden md:flex items-center gap-3">
          {/* Online members preview (max 3 + overflow). Clickable to see full list. */}
          <div className="relative" ref={onlineListRef}>
            {onlineMembers.length > 0 ? (
              <button
                onClick={() => setShowOnlineList((v) => !v)}
                className="flex items-center gap-2 rounded-lg px-1 py-1 hover:bg-gray-100 transition-colors"
                title="Ver membros online"
              >
                <div className="flex -space-x-2">
                  {visibleOnline.map((m) => (
                    <div
                      key={m.id}
                      className="relative flex h-8 w-8 items-center justify-center rounded-full border-2 border-white bg-gray-200 text-xs font-medium text-gray-600"
                      title={m.user.name}
                    >
                      {m.user.image ? (
                        <img src={m.user.image} alt={m.user.name} className="h-full w-full rounded-full object-cover" />
                      ) : (
                        getInitials(m.user.name)
                      )}
                      <span className="absolute bottom-0 right-0 block h-2.5 w-2.5 rounded-full bg-green-500 border-2 border-white" />
                    </div>
                  ))}
                  {overflowOnline > 0 && (
                    <div className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-white bg-gray-300 text-xs font-medium text-gray-700">
                      +{overflowOnline}
                    </div>
                  )}
                </div>
              </button>
            ) : (
              <span className="text-xs text-gray-400 px-2">Nenhum online</span>
            )}

            {showOnlineList && onlineMembers.length > 0 && (
              <div className="absolute right-0 top-full z-20 mt-2 w-64 rounded-lg border border-gray-200 bg-white shadow-lg">
                <div className="border-b border-gray-100 px-3 py-2">
                  <p className="text-xs font-semibold text-gray-500">
                    Online agora ({onlineMembers.length})
                  </p>
                </div>
                <ul className="max-h-72 overflow-y-auto py-1">
                  {onlineMembers.map((m) => (
                    <li key={m.id} className="flex items-center gap-2 px-3 py-2">
                      <div className="relative flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-medium text-primary">
                        {m.user.image ? (
                          <img src={m.user.image} alt="" className="h-full w-full rounded-full object-cover" />
                        ) : (
                          getInitials(m.user.name)
                        )}
                        <span className="absolute bottom-0 right-0 block h-2 w-2 rounded-full bg-green-500 border border-white" />
                      </div>
                      <span className="truncate text-sm text-gray-700">{m.user.name}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          <NotificationCenter />

          {currentMember?.role === "LEADER" && (
            <button
              onClick={() => router.push(`/project/${project.id}/settings`)}
              className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50 transition-colors"
            >
              Configurar
            </button>
          )}

          <button
            onClick={() => router.push(`/project/${project.id}/metrics`)}
            className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50 transition-colors"
          >
            Métricas
          </button>

          <button
            onClick={handleLogout}
            className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50 transition-colors"
          >
            Sair
          </button>
        </div>

        {/* Mobile actions */}
        <div className="flex md:hidden items-center gap-2">
          <InstallPWA variant="navbar" />
          <NotificationCenter />
          <button
            onClick={() => setShowMobileMenu(!showMobileMenu)}
            className="rounded-lg border border-gray-300 p-2 text-gray-600 hover:bg-gray-50 transition-colors"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              {showMobileMenu ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {showMobileMenu && (
        <div className="md:hidden border-t bg-white px-4 py-3 space-y-3">
          {/* Invite code */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500">Código:</span>
            <button
              onClick={() => setShowCode(!showCode)}
              className="rounded-md bg-gray-100 px-2 py-1 text-xs font-mono text-gray-500 hover:bg-gray-200"
            >
              {project.code}
            </button>
            <button
              onClick={handleCopyCode}
              className="rounded-md p-1 text-gray-500 hover:bg-gray-100 transition-colors"
              title={codeCopied ? "Copiado!" : "Copiar código"}
              aria-label="Copiar código do projeto"
            >
              {codeCopied ? (
                <svg className="h-4 w-4 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              )}
            </button>
          </div>

          {showCode && (
            <div className="rounded-lg bg-green-50 px-3 py-1.5 text-sm text-green-700">
              Compartilhe o código <strong>{project.code}</strong> para convidar membros
            </div>
          )}

          {/* Online members */}
          <div>
            <p className="text-xs font-semibold text-gray-500 mb-1">
              Online ({onlineMembers.length})
            </p>
            {onlineMembers.length === 0 ? (
              <p className="text-xs text-gray-400">Nenhum membro online</p>
            ) : (
              <div className="flex items-center gap-2">
                <div className="flex -space-x-2">
                  {visibleOnline.map((m) => (
                    <div
                      key={m.id}
                      className="relative flex h-7 w-7 items-center justify-center rounded-full border-2 border-white bg-gray-200 text-xs font-medium text-gray-600"
                      title={m.user.name}
                    >
                      {m.user.image ? (
                        <img src={m.user.image} alt={m.user.name} className="h-full w-full rounded-full object-cover" />
                      ) : (
                        getInitials(m.user.name)
                      )}
                      <span className="absolute bottom-0 right-0 block h-2 w-2 rounded-full bg-green-500 border border-white" />
                    </div>
                  ))}
                  {overflowOnline > 0 && (
                    <div className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-white bg-gray-300 text-xs font-medium text-gray-700">
                      +{overflowOnline}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Action buttons */}
          <div className="flex flex-col gap-2">
            {currentMember?.role === "LEADER" && (
              <button
                onClick={() => {
                  setShowMobileMenu(false);
                  router.push(`/project/${project.id}/settings`);
                }}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 text-left"
              >
                Configurar
              </button>
            )}
            <button
              onClick={() => {
                setShowMobileMenu(false);
                router.push(`/project/${project.id}/metrics`);
              }}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 text-left"
            >
              Métricas
            </button>
            <button
              onClick={handleLogout}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 text-left"
            >
              Sair
            </button>
          </div>
        </div>
      )}
    </header>
  );
}
