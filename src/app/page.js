"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { getInitials } from "@/lib/utils";
import InstallPWA from "@/components/pwa/InstallPWA";

export default function HomePage() {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [showJoin, setShowJoin] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [error, setError] = useState("");
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [profileName, setProfileName] = useState("");
  const [profileSaving, setProfileSaving] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  const loadProjects = useCallback(async () => {
    const res = await fetch("/api/projects");
    if (res.ok) {
      const data = await res.json();
      setProjects(data);
    }
    setLoading(false);
  }, []);

  const loadProfile = useCallback(async () => {
    const res = await fetch("/api/user/profile");
    if (res.ok) {
      const data = await res.json();
      setProfile(data);
      setProfileName(data.name);
    }
  }, []);

  useEffect(() => {
    async function init() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      setUser(user);
      loadProjects();
      loadProfile();
    }
    init();
  }, [supabase.auth, loadProjects, loadProfile]);

  async function handleCreate(e) {
    e.preventDefault();
    setError("");

    const res = await fetch("/api/projects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, description }),
    });

    if (res.ok) {
      const project = await res.json();
      router.push(`/project/${project.id}`);
    } else {
      const data = await res.json();
      setError(data.error);
    }
  }

  async function handleJoin(e) {
    e.preventDefault();
    setError("");

    const res = await fetch("/api/projects/join", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code: joinCode }),
    });

    const data = await res.json();
    if (res.ok) {
      router.push(`/project/${data.projectId}`);
    } else {
      setError(data.error);
    }
  }

  async function handleProfileSave() {
    setProfileSaving(true);
    await fetch("/api/user/profile", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: profileName }),
    });
    await loadProfile();
    setProfileSaving(false);
  }

  async function handleImageUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      setError("A imagem deve ter no máximo 2MB.");
      return;
    }

    const reader = new FileReader();
    reader.onload = async () => {
      const base64 = reader.result;
      await fetch("/api/user/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: base64 }),
      });
      await loadProfile();
    };
    reader.readAsDataURL(file);
  }

  async function handleRemoveImage() {
    await fetch("/api/user/profile", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ image: null }),
    });
    await loadProfile();
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="border-b bg-white shadow-sm">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6 sm:py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-lg bg-primary text-white font-bold text-base sm:text-lg">
              K
            </div>
            <h1 className="text-lg sm:text-xl font-bold text-gray-900">Kanban</h1>
          </div>
          <div className="flex items-center gap-2 sm:gap-4">
            <InstallPWA variant="navbar" />
            <button
              onClick={() => setShowProfile(true)}
              className="flex items-center gap-2 rounded-lg px-2 py-1 hover:bg-gray-100 transition-colors"
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-xs font-medium text-primary overflow-hidden">
                {profile?.image ? (
                  <img src={profile.image} alt="" className="h-full w-full object-cover" />
                ) : (
                  getInitials(profile?.name || user?.user_metadata?.name || "")
                )}
              </div>
              <span className="text-sm text-gray-600 hidden sm:inline">
                {profile?.name || user?.user_metadata?.name || user?.email}
              </span>
            </button>
            <button
              onClick={handleLogout}
              className="rounded-lg border border-gray-300 px-3 py-1.5 sm:px-4 sm:py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Sair
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-10">
        <div className="mb-6 sm:mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Meus Projetos</h2>
            <p className="mt-1 text-sm sm:text-base text-gray-600">Gerencie seus quadros Kanban</p>
          </div>
          <div className="flex gap-2 sm:gap-3">
            <button
              onClick={() => {
                setShowJoin(true);
                setShowCreate(false);
              }}
              className="flex-1 sm:flex-none rounded-lg border border-gray-300 px-3 sm:px-4 py-2 sm:py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Entrar em projeto
            </button>
            <button
              onClick={() => {
                setShowCreate(true);
                setShowJoin(false);
              }}
              className="flex-1 sm:flex-none rounded-lg bg-primary px-3 sm:px-4 py-2 sm:py-2.5 text-sm font-medium text-white hover:bg-primary-hover transition-colors"
            >
              + Novo Projeto
            </button>
          </div>
        </div>

        {error && (
          <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-600">{error}</div>
        )}

        {/* Create Project Form */}
        {showCreate && (
          <div className="mb-8 rounded-xl bg-white p-6 shadow-sm border border-gray-200">
            <h3 className="mb-4 text-lg font-semibold text-gray-900">Criar Novo Projeto</h3>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nome do projeto
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-gray-900 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                  placeholder="Ex: Sprint 2024-Q1"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Descrição (opcional)
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-gray-900 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                  placeholder="Descreva o objetivo do projeto..."
                />
              </div>
              <div className="flex gap-3">
                <button
                  type="submit"
                  className="rounded-lg bg-primary px-6 py-2.5 text-sm font-medium text-white hover:bg-primary-hover transition-colors"
                >
                  Criar projeto
                </button>
                <button
                  type="button"
                  onClick={() => setShowCreate(false)}
                  className="rounded-lg border border-gray-300 px-6 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Join Project Form */}
        {showJoin && (
          <div className="mb-8 rounded-xl bg-white p-6 shadow-sm border border-gray-200">
            <h3 className="mb-4 text-lg font-semibold text-gray-900">Entrar em Projeto</h3>
            <form onSubmit={handleJoin} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Código do projeto
                </label>
                <input
                  type="text"
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                  required
                  maxLength={8}
                  className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-gray-900 uppercase tracking-widest font-mono text-lg focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                  placeholder="EX: ABC12345"
                />
              </div>
              <div className="flex gap-3">
                <button
                  type="submit"
                  className="rounded-lg bg-primary px-6 py-2.5 text-sm font-medium text-white hover:bg-primary-hover transition-colors"
                >
                  Entrar
                </button>
                <button
                  type="button"
                  onClick={() => setShowJoin(false)}
                  className="rounded-lg border border-gray-300 px-6 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Projects Grid */}
        {projects.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-300 py-16">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gray-100">
              <svg className="h-8 w-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
              </svg>
            </div>
            <p className="text-lg font-medium text-gray-900">Nenhum projeto ainda</p>
            <p className="mt-1 text-gray-500">Crie um novo projeto ou entre com um código</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {projects.map((project) => (
              <button
                key={project.id}
                onClick={() => router.push(`/project/${project.id}`)}
                className="group rounded-xl bg-white p-6 text-left shadow-sm border border-gray-200 hover:shadow-md hover:border-primary/30 transition-all"
              >
                <div className="mb-3 flex items-center justify-between">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary font-bold text-sm">
                    {project.name.substring(0, 2).toUpperCase()}
                  </div>
                  <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-mono text-gray-500">
                    {project.code}
                  </span>
                </div>
                <h3 className="text-lg font-semibold text-gray-900 group-hover:text-primary transition-colors">
                  {project.name}
                </h3>
                {project.description && (
                  <p className="mt-1 text-sm text-gray-500 line-clamp-2">
                    {project.description}
                  </p>
                )}
                <div className="mt-4 flex items-center gap-2">
                  <div className="flex -space-x-2">
                    {project.members.slice(0, 5).map((m) => (
                      <div
                        key={m.id}
                        className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-white bg-gray-200 text-xs font-medium text-gray-600"
                        title={m.user.name}
                      >
                        {m.user.image ? (
                          <img
                            src={m.user.image}
                            alt={m.user.name}
                            className="h-full w-full rounded-full object-cover"
                          />
                        ) : (
                          getInitials(m.user.name)
                        )}
                      </div>
                    ))}
                  </div>
                  <span className="text-xs text-gray-400">
                    {project.members.length} membro{project.members.length !== 1 ? "s" : ""}
                  </span>
                </div>
              </button>
            ))}
          </div>
        )}
      </main>

      {/* Profile Modal */}
      {showProfile && profile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-gray-900">Meu Perfil</h3>
              <button
                onClick={() => setShowProfile(false)}
                className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="flex flex-col items-center mb-6">
              <div className="relative mb-4">
                <div className="flex h-24 w-24 items-center justify-center rounded-full bg-primary/10 text-2xl font-bold text-primary overflow-hidden border-4 border-gray-100">
                  {profile.image ? (
                    <img src={profile.image} alt="" className="h-full w-full object-cover" />
                  ) : (
                    getInitials(profile.name)
                  )}
                </div>
                <label className="absolute bottom-0 right-0 flex h-8 w-8 cursor-pointer items-center justify-center rounded-full bg-primary text-white shadow-md hover:bg-primary-hover transition-colors">
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                  />
                </label>
              </div>
              {profile.image && (
                <button
                  onClick={handleRemoveImage}
                  className="text-xs text-red-500 hover:underline"
                >
                  Remover foto
                </button>
              )}
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nome</label>
                <input
                  type="text"
                  value={profileName}
                  onChange={(e) => setProfileName(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-gray-900 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input
                  type="email"
                  value={profile.email}
                  disabled
                  className="w-full rounded-lg border border-gray-200 bg-gray-50 px-4 py-2.5 text-gray-500"
                />
              </div>
              <button
                onClick={handleProfileSave}
                disabled={profileSaving}
                className="w-full rounded-lg bg-primary px-4 py-2.5 text-white font-medium hover:bg-primary-hover disabled:opacity-50 transition-colors"
              >
                {profileSaving ? "Salvando..." : "Salvar alterações"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
