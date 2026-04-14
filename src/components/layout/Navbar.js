"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import NotificationCenter from "./NotificationCenter";

export default function Navbar({ project, onRefresh }) {
  const [showSettings, setShowSettings] = useState(false);
  const [showCode, setShowCode] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [user, setUser] = useState(null);
  const [currentMember, setCurrentMember] = useState(null);
  const router = useRouter();
  const supabase = createClient();

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

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <header className="border-b bg-white shadow-sm">
      <div className="flex items-center justify-between px-3 py-2 sm:px-4 sm:py-3">
        <div className="flex items-center gap-2 sm:gap-4 min-w-0">
          <button
            onClick={() => router.push("/")}
            className="flex h-8 w-8 sm:h-9 sm:w-9 flex-shrink-0 items-center justify-center rounded-lg bg-primary text-white font-bold text-sm hover:bg-primary-hover transition-colors"
          >
            K
          </button>
          <div className="min-w-0">
            <h1 className="text-sm sm:text-lg font-bold text-gray-900 truncate">{project.name}</h1>
            {project.description && (
              <p className="text-xs text-gray-500 truncate hidden sm:block">{project.description}</p>
            )}
          </div>
          <button
            onClick={() => setShowCode(!showCode)}
            className="rounded-md bg-gray-100 px-2 py-1 text-xs font-mono text-gray-500 hover:bg-gray-200 transition-colors hidden sm:block flex-shrink-0"
            title="Código de convite"
          >
            {project.code}
          </button>
        </div>

        {/* Desktop actions */}
        <div className="hidden md:flex items-center gap-3">
          {/* Members preview */}
          <div className="flex -space-x-2">
            {project.members.slice(0, 5).map((m) => (
              <div
                key={m.id}
                className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-white bg-gray-200 text-xs font-medium text-gray-600"
                title={`${m.user.name} (${m.role === "LEADER" ? "Líder" : "Membro"})`}
              >
                {m.user.image ? (
                  <img src={m.user.image} alt={m.user.name} className="h-full w-full rounded-full object-cover" />
                ) : (
                  m.user.name?.charAt(0).toUpperCase()
                )}
              </div>
            ))}
            {project.members.length > 5 && (
              <div className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-white bg-gray-300 text-xs font-medium text-gray-600">
                +{project.members.length - 5}
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
          </div>

          {showCode && (
            <div className="rounded-lg bg-green-50 px-3 py-1.5 text-sm text-green-700">
              Compartilhe o código <strong>{project.code}</strong> para convidar membros
            </div>
          )}

          {/* Members */}
          <div className="flex items-center gap-2">
            <div className="flex -space-x-2">
              {project.members.slice(0, 5).map((m) => (
                <div
                  key={m.id}
                  className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-white bg-gray-200 text-xs font-medium text-gray-600"
                  title={m.user.name}
                >
                  {m.user.image ? (
                    <img src={m.user.image} alt={m.user.name} className="h-full w-full rounded-full object-cover" />
                  ) : (
                    m.user.name?.charAt(0).toUpperCase()
                  )}
                </div>
              ))}
            </div>
            <span className="text-xs text-gray-400">
              {project.members.length} membro{project.members.length !== 1 ? "s" : ""}
            </span>
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
