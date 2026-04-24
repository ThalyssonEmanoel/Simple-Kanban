"use client";

import { useState } from "react";

export default function AddCard({ columnId, projectId, project, setProject, onRefresh }) {
  const [adding, setAdding] = useState(false);
  const [title, setTitle] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    const trimmed = title.trim();
    if (!trimmed) return;

    // Optimistic insert: push a temp card into the target column immediately
    const tempId = `temp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const previousProject = project;

    if (setProject && project) {
      const optimisticCard = {
        id: tempId,
        title: trimmed,
        description: null,
        priority: "MEDIUM",
        dueDate: null,
        reminderDate: null,
        archived: false,
        columnId,
        assignees: [],
        _count: { comments: 0, attachments: 0 },
        _optimistic: true,
      };

      const newColumns = project.columns.map((col) =>
        col.id === columnId ? { ...col, cards: [...col.cards, optimisticCard] } : col
      );
      setProject({ ...project, columns: newColumns });
    }

    setTitle("");
    setAdding(false);

    try {
      const res = await fetch("/api/cards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: trimmed,
          columnId,
          projectId,
        }),
      });

      if (!res.ok) throw new Error("create failed");
      const created = await res.json();

      // Replace the temp card with the real one returned by the server
      if (setProject) {
        setProject((prev) => {
          if (!prev) return prev;
          const nextColumns = prev.columns.map((col) =>
            col.id === columnId
              ? {
                  ...col,
                  cards: col.cards.map((c) => (c.id === tempId ? created : c)),
                }
              : col
          );
          return { ...prev, columns: nextColumns };
        });
      }
    } catch {
      // Rollback: remove the temp card and surface an error
      if (setProject) {
        setProject(previousProject);
      } else if (onRefresh) {
        onRefresh();
      }
      alert("Não foi possível criar o cartão. Tente novamente.");
    }
  }

  if (adding) {
    return (
      <div className="px-3 pb-3">
        <form onSubmit={handleSubmit}>
          <textarea
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            autoFocus
            rows={2}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm resize-none focus:border-primary focus:outline-none"
            placeholder="Título do cartão..."
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSubmit(e);
              }
            }}
          />
          <div className="mt-2 flex gap-2">
            <button
              type="submit"
              className="rounded-lg bg-primary px-3 py-1.5 text-sm text-white hover:bg-primary-hover"
            >
              Adicionar
            </button>
            <button
              type="button"
              onClick={() => {
                setAdding(false);
                setTitle("");
              }}
              className="rounded-lg px-3 py-1.5 text-sm text-gray-500 hover:bg-gray-200"
            >
              Cancelar
            </button>
          </div>
        </form>
      </div>
    );
  }

  return (
    <div className="px-3 pb-3">
      <button
        onClick={() => setAdding(true)}
        className="flex w-full items-center gap-1 rounded-lg px-2 py-1.5 text-sm text-gray-500 hover:bg-gray-200/50 transition-colors"
      >
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
        Adicionar cartão
      </button>
    </div>
  );
}
