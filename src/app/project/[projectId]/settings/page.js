"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { getInitials } from "@/lib/utils";

export default function SettingsPage() {
  const { projectId } = useParams();
  const router = useRouter();
  const [project, setProject] = useState(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [currentUserId, setCurrentUserId] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  const loadProject = useCallback(async () => {
    const [projectRes, profileRes] = await Promise.all([
      fetch(`/api/projects/${projectId}`),
      fetch("/api/user/profile"),
    ]);
    if (projectRes.ok) {
      const data = await projectRes.json();
      setProject(data);
      setName(data.name);
      setDescription(data.description || "");
    }
    if (profileRes.ok) {
      const profile = await profileRes.json();
      setCurrentUserId(profile.id);
    }
    setLoading(false);
  }, [projectId]);

  useEffect(() => {
    loadProject();
  }, [loadProject]);

  async function handleDeleteProject() {
    setDeleteError("");
    setDeleting(true);
    const res = await fetch(`/api/projects/${projectId}`, { method: "DELETE" });
    if (res.ok) {
      router.push("/");
    } else {
      const data = await res.json().catch(() => ({}));
      setDeleteError(data.error || "Erro ao excluir o projeto");
      setDeleting(false);
    }
  }

  async function handleSave(e) {
    e.preventDefault();
    setSaving(true);

    await fetch(`/api/projects/${projectId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, description }),
    });

    setSaving(false);
    loadProject();
  }

  async function handleRoleChange(memberId, role) {
    await fetch(`/api/projects/${projectId}/members`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ memberId, role }),
    });
    loadProject();
  }

  async function handleRemoveMember(memberId, memberName) {
    if (!confirm(`Remover ${memberName} do projeto?`)) return;

    await fetch(`/api/projects/${projectId}/members`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ memberId }),
    });
    loadProject();
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
      </div>
    );
  }

  if (!project) return null;

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="border-b bg-white shadow-sm">
        <div className="mx-auto flex max-w-4xl items-center gap-3 sm:gap-4 px-4 py-3 sm:px-6 sm:py-4">
          <button
            onClick={() => router.push(`/project/${projectId}`)}
            className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50"
          >
            Voltar
          </button>
          <h1 className="text-base sm:text-xl font-bold text-gray-900">Configurações</h1>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-6 sm:px-6 sm:py-8 space-y-6 sm:space-y-8">
        {/* Project Info */}
        <section className="rounded-xl bg-white p-6 shadow-sm border border-gray-200">
          <h2 className="mb-4 text-lg font-semibold text-gray-900">Informações</h2>
          <form onSubmit={handleSave} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nome</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-4 py-2.5 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Descrição</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                className="w-full rounded-lg border border-gray-300 px-4 py-2.5 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
            <div className="flex items-center gap-4">
              <button
                type="submit"
                disabled={saving}
                className="rounded-lg bg-primary px-6 py-2.5 text-sm font-medium text-white hover:bg-primary-hover disabled:opacity-50"
              >
                {saving ? "Salvando..." : "Salvar"}
              </button>
              <div className="rounded-lg bg-gray-100 px-3 py-2 text-sm">
                Código de convite: <strong className="font-mono">{project.code}</strong>
              </div>
            </div>
          </form>
        </section>

        {/* Members */}
        <section className="rounded-xl bg-white p-6 shadow-sm border border-gray-200">
          <h2 className="mb-4 text-lg font-semibold text-gray-900">
            Membros ({project.members.length})
          </h2>
          <div className="space-y-3">
            {project.members.map((m) => (
              <div
                key={m.id}
                className="flex flex-col sm:flex-row sm:items-center justify-between rounded-lg bg-gray-50 p-3 gap-2"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-medium text-primary">
                    {m.user.image ? (
                      <img src={m.user.image} alt="" className="h-full w-full rounded-full object-cover" />
                    ) : (
                      getInitials(m.user.name)
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{m.user.name}</p>
                    <p className="text-xs text-gray-500 truncate">{m.user.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 ml-13 sm:ml-0 shrink-0">
                  <select
                    value={m.role}
                    onChange={(e) => handleRoleChange(m.id, e.target.value)}
                    className="rounded-lg border border-gray-300 px-2 py-1 text-sm"
                    disabled={m.userId === project.ownerId}
                  >
                    <option value="LEADER">Líder</option>
                    <option value="MEMBER">Membro</option>
                  </select>
                  {m.userId !== project.ownerId && (
                    <button
                      onClick={() => handleRemoveMember(m.id, m.user.name)}
                      className="rounded-lg p-1.5 text-red-400 hover:bg-red-50 hover:text-red-600"
                    >
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Danger Zone */}
        {currentUserId === project.ownerId && (
          <section className="rounded-xl bg-white p-6 shadow-sm border border-red-200">
            <h2 className="mb-2 text-lg font-semibold text-red-600">Zona de perigo</h2>
            <p className="mb-4 text-sm text-gray-600">
              Excluir o projeto remove permanentemente colunas, cartões, comentários e anexos. Essa ação não pode ser desfeita.
            </p>
            <button
              onClick={() => {
                setShowDeleteModal(true);
                setDeleteConfirm("");
                setDeleteError("");
              }}
              className="rounded-lg border border-red-300 bg-white px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50"
            >
              Excluir projeto
            </button>
          </section>
        )}
      </main>

      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 overflow-y-auto">
          <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl">
            <div className="flex items-start gap-4 border-b border-gray-200 p-6">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-red-100">
                <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M5.07 19h13.86c1.54 0 2.5-1.67 1.73-3L13.73 4a2 2 0 00-3.46 0L3.34 16c-.77 1.33.19 3 1.73 3z" />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-lg font-semibold text-gray-900">Excluir projeto</h3>
                <p className="mt-1 text-sm text-gray-600">
                  Essa ação é <strong>permanente</strong> e não pode ser desfeita. Todos os cartões, colunas, comentários e anexos serão removidos.
                </p>
              </div>
            </div>

            <div className="p-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Digite <span className="font-mono font-semibold text-gray-900">{project.name}</span> para confirmar
              </label>
              <input
                type="text"
                value={deleteConfirm}
                onChange={(e) => setDeleteConfirm(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-gray-900 placeholder-gray-400 focus:border-red-500 focus:outline-none focus:ring-2 focus:ring-red-500/20"
                placeholder={project.name}
                autoFocus
              />
              {deleteError && (
                <p className="mt-3 rounded-lg bg-red-50 p-3 text-sm text-red-600">{deleteError}</p>
              )}
            </div>

            <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 sm:gap-3 border-t border-gray-200 p-4 bg-gray-50 rounded-b-2xl">
              <button
                onClick={() => setShowDeleteModal(false)}
                disabled={deleting}
                className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleDeleteProject}
                disabled={deleteConfirm !== project.name || deleting}
                className="rounded-lg px-4 py-2 text-sm font-semibold text-white transition-colors enabled:bg-red-600 enabled:hover:bg-red-700 disabled:bg-gray-300 disabled:text-gray-500 disabled:cursor-not-allowed"
              >
                {deleting ? "Excluindo..." : "Excluir definitivamente"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
