"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import NotificationCenter from "./NotificationCenter";

export default function Navbar({ project, onRefresh }) {
  const [showSettings, setShowSettings] = useState(false);
  const [showCode, setShowCode] = useState(false);
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
    <header className="flex items-center justify-between border-b bg-white px-4 py-3 shadow-sm">
      <div className="flex items-center gap-4">
        <button
          onClick={() => router.push("/")}
          className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-white font-bold text-sm hover:bg-primary-hover transition-colors"
        >
          K
        </button>
        <div>
          <h1 className="text-lg font-bold text-gray-900">{project.name}</h1>
          {project.description && (
            <p className="text-xs text-gray-500">{project.description}</p>
          )}
        </div>
        <button
          onClick={() => setShowCode(!showCode)}
          className="rounded-md bg-gray-100 px-2 py-1 text-xs font-mono text-gray-500 hover:bg-gray-200 transition-colors"
          title="Código de convite"
        >
          {project.code}
        </button>
        {showCode && (
          <div className="rounded-lg bg-green-50 px-3 py-1.5 text-sm text-green-700">
            Compartilhe o código <strong>{project.code}</strong> para convidar membros
          </div>
        )}
      </div>

      <div className="flex items-center gap-3">
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
    </header>
  );
}
