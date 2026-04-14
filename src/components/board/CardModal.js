"use client";

import { useState, useEffect, useCallback } from "react";
import {
  formatDateTime,
  getPriorityColor,
  getPriorityLabel,
  isOverdue,
  getInitials,
} from "@/lib/utils";

export default function CardModal({ cardId, project, onClose, onRefresh }) {
  const [card, setCard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState("MEDIUM");
  const [dueDate, setDueDate] = useState("");
  const [assigneeId, setAssigneeId] = useState("");
  const [comment, setComment] = useState("");
  const [tab, setTab] = useState("details");

  const loadCard = useCallback(async () => {
    const res = await fetch(`/api/cards/${cardId}`);
    if (res.ok) {
      const data = await res.json();
      setCard(data);
      setTitle(data.title);
      setDescription(data.description || "");
      setPriority(data.priority);
      setDueDate(data.dueDate ? data.dueDate.split("T")[0] : "");
      setAssigneeId(data.assigneeId || "");
    }
    setLoading(false);
  }, [cardId]);

  useEffect(() => {
    loadCard();
  }, [loadCard]);

  async function handleSave() {
    await fetch(`/api/cards/${cardId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title,
        description,
        priority,
        dueDate: dueDate || null,
        assigneeId: assigneeId || null,
      }),
    });

    setEditing(false);
    loadCard();
    onRefresh();
  }

  async function handleArchive() {
    await fetch(`/api/cards/${cardId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ archived: true }),
    });
    onClose();
    onRefresh();
  }

  async function handleComment(e) {
    e.preventDefault();
    if (!comment.trim()) return;

    await fetch("/api/comments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cardId, content: comment }),
    });

    setComment("");
    loadCard();
  }

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-white border-t-transparent"></div>
      </div>
    );
  }

  if (!card) return null;

  const overdue = isOverdue(card.dueDate);

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-4 pt-10" onClick={onClose}>
      <div
        className="w-full max-w-3xl rounded-2xl bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between border-b px-6 py-4">
          <div className="flex-1">
            {editing ? (
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full text-xl font-bold text-gray-900 border-b-2 border-primary focus:outline-none"
              />
            ) : (
              <h2 className="text-xl font-bold text-gray-900">{card.title}</h2>
            )}
            <p className="mt-1 text-sm text-gray-500">
              em <strong>{card.column.name || "—"}</strong> | criado por{" "}
              <strong>{card.creator.name}</strong>
            </p>
          </div>
          <div className="flex items-center gap-2 ml-4">
            {!editing ? (
              <button
                onClick={() => setEditing(true)}
                className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50"
              >
                Editar
              </button>
            ) : (
              <>
                <button
                  onClick={handleSave}
                  className="rounded-lg bg-primary px-3 py-1.5 text-sm text-white hover:bg-primary-hover"
                >
                  Salvar
                </button>
                <button
                  onClick={() => setEditing(false)}
                  className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50"
                >
                  Cancelar
                </button>
              </>
            )}
            <button
              onClick={onClose}
              className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex">
          {/* Main content */}
          <div className="flex-1 border-r p-6">
            {/* Tabs */}
            <div className="mb-4 flex gap-1 rounded-lg bg-gray-100 p-1">
              {["details", "comments", "history"].map((t) => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className={`flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                    tab === t
                      ? "bg-white text-gray-900 shadow-sm"
                      : "text-gray-500 hover:text-gray-700"
                  }`}
                >
                  {t === "details" && "Detalhes"}
                  {t === "comments" && `Comentários (${card.comments.length})`}
                  {t === "history" && "Histórico"}
                </button>
              ))}
            </div>

            {/* Details tab */}
            {tab === "details" && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Descrição
                  </label>
                  {editing ? (
                    <textarea
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      rows={4}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:outline-none"
                      placeholder="Adicionar descrição..."
                    />
                  ) : (
                    <div className="rounded-lg bg-gray-50 p-3 text-sm text-gray-700 min-h-[60px] whitespace-pre-wrap">
                      {card.description || "Sem descrição"}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Comments tab */}
            {tab === "comments" && (
              <div>
                <form onSubmit={handleComment} className="mb-4">
                  <textarea
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    rows={3}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:outline-none"
                    placeholder="Escrever comentário... Use @nome para mencionar"
                  />
                  <button
                    type="submit"
                    disabled={!comment.trim()}
                    className="mt-2 rounded-lg bg-primary px-4 py-1.5 text-sm text-white hover:bg-primary-hover disabled:opacity-50"
                  >
                    Comentar
                  </button>
                </form>

                <div className="space-y-3">
                  {card.comments.map((c) => (
                    <div key={c.id} className="rounded-lg bg-gray-50 p-3">
                      <div className="flex items-center gap-2 mb-1">
                        <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-xs font-medium text-primary">
                          {c.author.image ? (
                            <img src={c.author.image} alt="" className="h-full w-full rounded-full object-cover" />
                          ) : (
                            getInitials(c.author.name)
                          )}
                        </div>
                        <span className="text-sm font-medium text-gray-900">
                          {c.author.name}
                        </span>
                        <span className="text-xs text-gray-400">
                          {formatDateTime(c.createdAt)}
                        </span>
                      </div>
                      <p className="text-sm text-gray-700 whitespace-pre-wrap">{c.content}</p>
                    </div>
                  ))}
                  {card.comments.length === 0 && (
                    <p className="text-center text-sm text-gray-400 py-4">
                      Nenhum comentário ainda
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* History tab */}
            {tab === "history" && (
              <div className="space-y-3">
                {card.activityLogs.map((log) => (
                  <div key={log.id} className="flex gap-3">
                    <div className="flex h-6 w-6 items-center justify-center rounded-full bg-gray-200 text-xs">
                      {getInitials(log.user.name)}
                    </div>
                    <div>
                      <p className="text-sm text-gray-700">
                        <strong>{log.user.name}</strong> — {log.details}
                      </p>
                      <p className="text-xs text-gray-400">
                        {formatDateTime(log.createdAt)}
                      </p>
                    </div>
                  </div>
                ))}
                {card.activityLogs.length === 0 && (
                  <p className="text-center text-sm text-gray-400 py-4">
                    Nenhuma atividade registrada
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="w-64 p-4 space-y-4">
            {/* Priority */}
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">
                Prioridade
              </label>
              {editing ? (
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-2 py-1.5 text-sm focus:border-primary focus:outline-none"
                >
                  <option value="LOW">Baixa</option>
                  <option value="MEDIUM">Média</option>
                  <option value="HIGH">Alta</option>
                  <option value="CRITICAL">Crítica</option>
                </select>
              ) : (
                <span
                  className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${getPriorityColor(
                    card.priority
                  )}`}
                >
                  {getPriorityLabel(card.priority)}
                </span>
              )}
            </div>

            {/* Due date */}
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">
                Prazo
              </label>
              {editing ? (
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-2 py-1.5 text-sm focus:border-primary focus:outline-none"
                />
              ) : (
                <span
                  className={`text-sm ${
                    overdue ? "font-medium text-red-500" : "text-gray-700"
                  }`}
                >
                  {card.dueDate
                    ? new Date(card.dueDate).toLocaleDateString("pt-BR")
                    : "Sem prazo"}
                  {overdue && " (atrasado)"}
                </span>
              )}
            </div>

            {/* Assignee */}
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">
                Responsável
              </label>
              {editing ? (
                <select
                  value={assigneeId}
                  onChange={(e) => setAssigneeId(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-2 py-1.5 text-sm focus:border-primary focus:outline-none"
                >
                  <option value="">Sem responsável</option>
                  {project.members.map((m) => (
                    <option key={m.user.id} value={m.user.id}>
                      {m.user.name}
                    </option>
                  ))}
                </select>
              ) : card.assignee ? (
                <div className="flex items-center gap-2">
                  <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-xs font-medium text-primary">
                    {card.assignee.image ? (
                      <img src={card.assignee.image} alt="" className="h-full w-full rounded-full object-cover" />
                    ) : (
                      getInitials(card.assignee.name)
                    )}
                  </div>
                  <span className="text-sm text-gray-700">{card.assignee.name}</span>
                </div>
              ) : (
                <span className="text-sm text-gray-400">Não atribuído</span>
              )}
            </div>

            {/* Creator */}
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">
                Criador
              </label>
              <div className="flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-gray-200 text-xs font-medium text-gray-600">
                  {card.creator.image ? (
                    <img src={card.creator.image} alt="" className="h-full w-full rounded-full object-cover" />
                  ) : (
                    getInitials(card.creator.name)
                  )}
                </div>
                <span className="text-sm text-gray-700">{card.creator.name}</span>
              </div>
            </div>

            {/* Created at */}
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">
                Criado em
              </label>
              <span className="text-sm text-gray-700">
                {formatDateTime(card.createdAt)}
              </span>
            </div>

            {/* Archive */}
            <div className="pt-4 border-t">
              <button
                onClick={handleArchive}
                className="w-full rounded-lg border border-red-200 px-3 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
              >
                Arquivar cartão
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
