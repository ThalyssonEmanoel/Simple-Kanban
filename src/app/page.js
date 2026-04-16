"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { getInitials } from "@/lib/utils";

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
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordError, setPasswordError] = useState("");
  const [passwordSuccess, setPasswordSuccess] = useState(false);
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

  function resetPasswordForm() {
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setShowCurrent(false);
    setShowNew(false);
    setShowConfirm(false);
    setPasswordError("");
    setPasswordSuccess(false);
  }

  function closePasswordModal() {
    setShowPasswordModal(false);
    resetPasswordForm();
  }

  async function handleChangePassword(e) {
    e.preventDefault();
    if (!profile?.email) return;
    setPasswordError("");

    if (newPassword.length < 8) {
      setPasswordError("A nova senha deve ter pelo menos 8 caracteres.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError("As senhas não coincidem.");
      return;
    }
    if (newPassword === currentPassword) {
      setPasswordError("A nova senha deve ser diferente da atual.");
      return;
    }

    setPasswordLoading(true);

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: profile.email,
      password: currentPassword,
    });

    if (signInError) {
      setPasswordError("Senha atual incorreta.");
      setPasswordLoading(false);
      return;
    }

    const { error: updateError } = await supabase.auth.updateUser({
      password: newPassword,
    });

    if (updateError) {
      setPasswordError("Não foi possível atualizar a senha. Tente novamente.");
      setPasswordLoading(false);
      return;
    }

    setPasswordSuccess(true);
    setPasswordLoading(false);
  }

  function closeProfile() {
    setShowProfile(false);
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
        <div className="fixed inset-0 z-50 flex items-start sm:items-center justify-center bg-black/50 p-4 overflow-y-auto">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl my-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-gray-900">Meu Perfil</h3>
              <button
                onClick={closeProfile}
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

            <div className="mt-6 border-t border-gray-200 pt-6">
              <h4 className="text-sm font-semibold text-gray-900">Segurança</h4>
              <p className="mt-1 text-xs text-gray-600">
                Altere sua senha de acesso à conta.
              </p>
              <button
                onClick={() => {
                  resetPasswordForm();
                  setShowPasswordModal(true);
                }}
                className="mt-3 w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Alterar senha
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Change Password Modal */}
      {showPasswordModal && (
        <div style={{ zIndex: 60 }} className="fixed inset-0 flex items-start sm:items-center justify-center bg-black/50 p-4 overflow-y-auto">
          <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl my-auto">
            <div className="flex items-center justify-between border-b border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900">Alterar senha</h3>
              <button
                onClick={closePasswordModal}
                className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {passwordSuccess ? (
              <div className="p-6 text-center">
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-green-100">
                  <svg className="h-7 w-7 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h4 className="text-lg font-semibold text-gray-900">Senha atualizada!</h4>
                <p className="mt-2 text-sm text-gray-600">
                  Sua senha foi alterada com sucesso.
                </p>
                <button
                  onClick={closePasswordModal}
                  className="mt-6 w-full rounded-lg bg-primary px-4 py-2.5 text-white font-medium hover:bg-primary-hover transition-colors"
                >
                  Fechar
                </button>
              </div>
            ) : (
              <form onSubmit={handleChangePassword} className="p-6 space-y-4">
                <PasswordField
                  label="Senha atual"
                  value={currentPassword}
                  onChange={setCurrentPassword}
                  show={showCurrent}
                  onToggle={() => setShowCurrent((v) => !v)}
                  placeholder="Sua senha atual"
                  autoFocus
                />
                <PasswordField
                  label="Nova senha"
                  value={newPassword}
                  onChange={setNewPassword}
                  show={showNew}
                  onToggle={() => setShowNew((v) => !v)}
                  placeholder="Mínimo 8 caracteres"
                  minLength={8}
                />
                <PasswordField
                  label="Confirmar nova senha"
                  value={confirmPassword}
                  onChange={setConfirmPassword}
                  show={showConfirm}
                  onToggle={() => setShowConfirm((v) => !v)}
                  placeholder="Repita a nova senha"
                />

                {passwordError && (
                  <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600">
                    {passwordError}
                  </div>
                )}

                <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 sm:gap-3 pt-2">
                  <button
                    type="button"
                    onClick={closePasswordModal}
                    disabled={passwordLoading}
                    className="rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={passwordLoading || !currentPassword || !newPassword || !confirmPassword}
                    className="rounded-lg px-4 py-2.5 text-sm font-semibold text-white transition-colors enabled:bg-primary enabled:hover:bg-primary-hover disabled:bg-gray-300 disabled:cursor-not-allowed"
                  >
                    {passwordLoading ? "Salvando..." : "Atualizar senha"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function PasswordField({ label, value, onChange, show, onToggle, placeholder, minLength, autoFocus }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <div className="relative">
        <input
          type={show ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          required
          minLength={minLength}
          autoFocus={autoFocus}
          className="w-full rounded-lg border border-gray-300 px-4 py-2.5 pr-11 text-gray-900 placeholder-gray-400 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
          placeholder={placeholder}
        />
        <button
          type="button"
          onClick={onToggle}
          tabIndex={-1}
          aria-label={show ? "Ocultar senha" : "Mostrar senha"}
          className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-600"
        >
          {show ? (
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
            </svg>
          ) : (
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
          )}
        </button>
      </div>
    </div>
  );
}
