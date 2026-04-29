"use client";

import { useState, useEffect, useCallback } from "react";
import useSWR from "swr";
import {
  formatDate,
  formatDateTime,
  getPriorityColor,
  getPriorityLabel,
  isOverdue,
  getInitials,
  toDateOnlyString,
  parseChecklist,
  localTodayString,
} from "@/lib/utils";

export default function CardModal({ cardId, project, onClose, onRefresh, currentUserId, userRole }) {
  const {
    data: card,
    isLoading: cardLoading,
    mutate: mutateCard,
  } = useSWR(cardId ? `/api/cards/${cardId}` : null);
  const loading = cardLoading && !card;
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState("MEDIUM");
  const [dueDate, setDueDate] = useState("");
  const [reminderDate, setReminderDate] = useState("");
  const [assigneeIds, setAssigneeIds] = useState([]);
  const [comment, setComment] = useState("");
  const [tab, setTab] = useState("details");
  const [reminderError, setReminderError] = useState("");
  const [editingCommentId, setEditingCommentId] = useState(null);
  const [editingCommentText, setEditingCommentText] = useState("");
  const [togglingChecklist, setTogglingChecklist] = useState(null);

  const loadCard = useCallback(() => mutateCard(), [mutateCard]);

  // Hydrate the editable form fields whenever a fresh card payload arrives.
  useEffect(() => {
    if (!card) return;
    setTitle(card.title);
    setDescription(card.description || "");
    setPriority(card.priority);
    setDueDate(toDateOnlyString(card.dueDate));
    setReminderDate(toDateOnlyString(card.reminderDate));
    const ids = Array.isArray(card.assignees) && card.assignees.length > 0
      ? card.assignees.map((a) => a.user.id)
      : card.assigneeId
        ? [card.assigneeId]
        : [];
    setAssigneeIds(ids);
  }, [card]);

  const canManageAssignees =
    userRole === "LEADER" || (card && currentUserId && card.creatorId === currentUserId);

  const isAssignedToMe =
    !!card &&
    !!currentUserId &&
    (card.assigneeId === currentUserId ||
      (Array.isArray(card.assignees) && card.assignees.some((a) => a.user?.id === currentUserId || a.userId === currentUserId)));

  const canArchive = userRole === "LEADER" || isAssignedToMe;
  const canDelete = userRole === "LEADER";

  async function handleSave() {
    if (reminderDate) {
      const today = localTodayString();
      if (reminderDate < today) {
        setReminderError("A data do lembrete não pode ser anterior à data atual.");
        return;
      }
    }
    setReminderError("");

    const body = {
      title,
      description,
      priority,
      dueDate: dueDate || null,
      reminderDate: reminderDate || null,
    };
    if (canManageAssignees) {
      body.assigneeIds = assigneeIds;
    }

    const res = await fetch(`/api/cards/${cardId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      alert(data.error || "Não foi possível salvar as alterações.");
      return;
    }

    setEditing(false);
    loadCard();
    onRefresh();
  }

  function toggleAssignee(userId) {
    setAssigneeIds((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  }

  function handleReminderChange(value) {
    setReminderDate(value);
    if (value && value < localTodayString()) {
      setReminderError("A data do lembrete não pode ser anterior à data atual.");
    } else {
      setReminderError("");
    }
  }

  async function handleArchive() {
    if (!confirm("Arquivar esta tarefa?")) return;
    const res = await fetch(`/api/cards/${cardId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ archived: true }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      alert(data.error || "Não foi possível arquivar a tarefa.");
      return;
    }
    onClose();
    onRefresh();
  }

  async function handleDeleteCard() {
    if (!confirm(`Excluir permanentemente a tarefa "${card.title}"? Esta ação é irreversível.`)) {
      return;
    }
    const res = await fetch(`/api/cards/${cardId}`, { method: "DELETE" });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      alert(data.error || "Não foi possível excluir a tarefa.");
      return;
    }
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

  async function handleSaveComment(commentId) {
    if (!editingCommentText.trim()) return;
    const res = await fetch(`/api/comments/${commentId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: editingCommentText.trim() }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      alert(data.error || "Não foi possível editar o comentário.");
      return;
    }
    setEditingCommentId(null);
    setEditingCommentText("");
    loadCard();
  }

  async function handleDeleteComment(commentId) {
    if (!confirm("Excluir este comentário?")) return;
    const res = await fetch(`/api/comments/${commentId}`, { method: "DELETE" });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      alert(data.error || "Não foi possível excluir o comentário.");
      return;
    }
    loadCard();
  }

  async function handleToggleChecklist(lineIndex) {
    if (togglingChecklist !== null) return;
    setTogglingChecklist(lineIndex);
    try {
      const res = await fetch(`/api/cards/${cardId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ toggleChecklistIndex: lineIndex }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        alert(data.error || "Não foi possível atualizar a lista.");
        return;
      }
      await loadCard();
      onRefresh();
    } finally {
      setTogglingChecklist(null);
    }
  }

  function insertChecklistTemplate() {
    const template = "- [ ] Item 1\n- [ ] Item 2\n- [ ] Item 3";
    setDescription((prev) => (prev ? `${prev}\n${template}` : template));
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
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-2 pt-4 sm:p-4 sm:pt-10">
      <div className="w-full max-w-3xl rounded-2xl bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-start justify-between border-b px-4 py-3 sm:px-6 sm:py-4">
          <div className="flex-1 min-w-0">
            {editing ? (
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full text-lg sm:text-xl font-bold text-gray-900 border-b-2 border-primary focus:outline-none"
              />
            ) : (
              <h2 className="text-lg sm:text-xl font-bold text-gray-900 break-words">{card.title}</h2>
            )}
            <p className="mt-1 text-xs sm:text-sm text-gray-500">
              em <strong>{card.column.name || "—"}</strong> | criado por{" "}
              <strong>{card.creator.name}</strong>
              {card.archived && (
                <span className="ml-2 inline-flex items-center rounded-full bg-gray-200 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-gray-600">
                  Arquivada
                </span>
              )}
            </p>
          </div>
          <div className="flex items-center gap-1 sm:gap-2 ml-2 sm:ml-4 shrink-0">
            {!editing ? (
              <button
                onClick={() => setEditing(true)}
                className="rounded-lg border border-gray-300 px-2 sm:px-3 py-1.5 text-xs sm:text-sm text-gray-600 hover:bg-gray-50"
              >
                Editar
              </button>
            ) : (
              <>
                <button
                  onClick={handleSave}
                  className="rounded-lg bg-primary px-2 sm:px-3 py-1.5 text-xs sm:text-sm text-white hover:bg-primary-hover"
                >
                  Salvar
                </button>
                <button
                  onClick={() => setEditing(false)}
                  className="rounded-lg border border-gray-300 px-2 sm:px-3 py-1.5 text-xs sm:text-sm text-gray-600 hover:bg-gray-50"
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
        <div className="flex flex-col md:flex-row">
          {/* Main content */}
          <div className="flex-1 md:border-r p-4 sm:p-6">
            {/* Tabs */}
            <div className="mb-4 flex gap-1 rounded-lg bg-gray-100 p-1">
              {["details", "comments", "history"].map((t) => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className={`flex-1 rounded-md px-2 sm:px-3 py-1.5 text-xs sm:text-sm font-medium transition-colors ${
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
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-sm font-medium text-gray-700">
                      Descrição
                    </label>
                    {editing && (
                      <button
                        type="button"
                        onClick={insertChecklistTemplate}
                        className="text-xs text-primary hover:underline"
                      >
                        + Inserir check-list
                      </button>
                    )}
                  </div>
                  {editing ? (
                    <>
                      <textarea
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        rows={6}
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:outline-none font-mono"
                        placeholder={"Adicionar descrição...\nUse - [ ] Item para criar uma lista de marcação."}
                      />
                      <p className="mt-1 text-xs text-gray-400">
                        Sintaxe de lista: <code>- [ ] item pendente</code> e <code>- [x] item concluído</code>.
                      </p>
                    </>
                  ) : (
                    <DescriptionView
                      description={card.description}
                      onToggle={handleToggleChecklist}
                      togglingIndex={togglingChecklist}
                      disabled={card.archived}
                    />
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
                  {card.comments.map((c) => {
                    const isAuthor = currentUserId && c.author?.id === currentUserId;
                    const canModify = isAuthor || userRole === "LEADER";
                    const isEditing = editingCommentId === c.id;
                    return (
                      <div key={c.id} className="rounded-lg bg-gray-50 p-3">
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <div className="flex items-center gap-2 min-w-0">
                            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-xs font-medium text-primary">
                              {c.author.image ? (
                                <img src={c.author.image} alt="" className="h-full w-full rounded-full object-cover" />
                              ) : (
                                getInitials(c.author.name)
                              )}
                            </div>
                            <span className="text-sm font-medium text-gray-900 truncate">
                              {c.author.name}
                            </span>
                            <span className="text-xs text-gray-400 shrink-0">
                              {formatDateTime(c.createdAt)}
                              {c.editedAt && (
                                <span className="ml-1 italic" title={`Editado em ${formatDateTime(c.editedAt)}`}>
                                  (editado)
                                </span>
                              )}
                            </span>
                          </div>
                          {canModify && !isEditing && (
                            <div className="flex gap-1 shrink-0">
                              <button
                                onClick={() => {
                                  setEditingCommentId(c.id);
                                  setEditingCommentText(c.content);
                                }}
                                className="rounded px-2 py-0.5 text-xs text-gray-500 hover:bg-gray-200"
                              >
                                Editar
                              </button>
                              <button
                                onClick={() => handleDeleteComment(c.id)}
                                className="rounded px-2 py-0.5 text-xs text-red-600 hover:bg-red-50"
                              >
                                Excluir
                              </button>
                            </div>
                          )}
                        </div>
                        {isEditing ? (
                          <div>
                            <textarea
                              value={editingCommentText}
                              onChange={(e) => setEditingCommentText(e.target.value)}
                              rows={3}
                              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:outline-none"
                            />
                            <div className="mt-2 flex gap-2">
                              <button
                                onClick={() => handleSaveComment(c.id)}
                                disabled={!editingCommentText.trim()}
                                className="rounded-lg bg-primary px-3 py-1 text-xs text-white hover:bg-primary-hover disabled:opacity-50"
                              >
                                Salvar
                              </button>
                              <button
                                onClick={() => {
                                  setEditingCommentId(null);
                                  setEditingCommentText("");
                                }}
                                className="rounded-lg border border-gray-300 px-3 py-1 text-xs text-gray-600 hover:bg-gray-50"
                              >
                                Cancelar
                              </button>
                            </div>
                          </div>
                        ) : (
                          <p className="text-sm text-gray-700 whitespace-pre-wrap">{c.content}</p>
                        )}
                      </div>
                    );
                  })}
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
                    <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gray-200 text-xs">
                      {getInitials(log.user.name)}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm text-gray-700 break-words">
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
          <div className="w-full md:w-64 p-4 space-y-4 border-t md:border-t-0">
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
                  {card.dueDate ? formatDate(card.dueDate) : "Sem prazo"}
                  {overdue && " (atrasado)"}
                </span>
              )}
            </div>

            {/* Reminder date */}
            {(dueDate || card.dueDate) && (
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">
                  Lembrete
                </label>
                {editing ? (
                  <>
                    <input
                      type="date"
                      value={reminderDate}
                      onChange={(e) => handleReminderChange(e.target.value)}
                      min={localTodayString()}
                      max={dueDate || toDateOnlyString(card.dueDate) || undefined}
                      className={`w-full rounded-lg border px-2 py-1.5 text-sm focus:outline-none ${
                        reminderError
                          ? "border-red-400 focus:border-red-500"
                          : "border-gray-300 focus:border-primary"
                      }`}
                    />
                    {reminderError && (
                      <p className="mt-1 text-xs text-red-500">{reminderError}</p>
                    )}
                  </>
                ) : (
                  <span className="text-sm text-gray-700">
                    {card.reminderDate ? formatDate(card.reminderDate) : "Sem lembrete"}
                  </span>
                )}
                <p className="mt-1 text-xs text-gray-400">
                  Data para receber notificação de lembrete
                </p>
              </div>
            )}

            {/* Assignees (multi) */}
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">
                Responsáveis
              </label>
              {editing && canManageAssignees ? (
                <div className="space-y-1 max-h-44 overflow-y-auto rounded-lg border border-gray-200 p-2">
                  {project.members.length === 0 && (
                    <p className="text-xs text-gray-400">Nenhum membro disponível</p>
                  )}
                  {project.members.map((m) => {
                    const checked = assigneeIds.includes(m.user.id);
                    return (
                      <label
                        key={m.user.id}
                        className="flex cursor-pointer items-center gap-2 rounded-md px-1 py-1 hover:bg-gray-50"
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleAssignee(m.user.id)}
                          className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary/40"
                        />
                        <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-[10px] font-medium text-primary">
                          {m.user.image ? (
                            <img src={m.user.image} alt="" className="h-full w-full rounded-full object-cover" />
                          ) : (
                            getInitials(m.user.name)
                          )}
                        </div>
                        <span className="truncate text-sm text-gray-700">{m.user.name}</span>
                      </label>
                    );
                  })}
                </div>
              ) : editing && !canManageAssignees ? (
                <p className="text-xs text-gray-400">
                  Apenas líderes ou o criador do cartão podem alterar os responsáveis.
                </p>
              ) : null}

              {!editing && (
                <AssigneeListDisplay card={card} />
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

            {/* Archive + Delete actions */}
            <div className="pt-4 border-t space-y-2">
              {!card.archived && canArchive && (
                <button
                  onClick={handleArchive}
                  className="w-full rounded-lg bg-yellow-400 px-3 py-2 text-sm font-semibold text-yellow-900 hover:bg-yellow-500 transition-colors"
                >
                  Arquivar tarefa
                </button>
              )}
              {canDelete && (
                <button
                  onClick={handleDeleteCard}
                  className="w-full rounded-lg bg-red-600 px-3 py-2 text-sm font-medium text-white hover:bg-red-700 transition-colors"
                >
                  Excluir tarefa
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function DescriptionView({ description, onToggle, togglingIndex, disabled }) {
  if (!description) {
    return (
      <div className="rounded-lg bg-gray-50 p-3 text-sm text-gray-400 min-h-[60px]">
        Sem descrição
      </div>
    );
  }

  const items = parseChecklist(description);
  if (items.length === 0) {
    return (
      <div className="rounded-lg bg-gray-50 p-3 text-sm text-gray-700 min-h-[60px] whitespace-pre-wrap">
        {description}
      </div>
    );
  }

  // Render mixed content: plain lines as text, checklist lines as toggleable rows.
  const lines = description.split(/\r?\n/);
  const itemByIndex = new Map(items.map((it) => [it.index, it]));

  return (
    <div className="rounded-lg bg-gray-50 p-3 text-sm text-gray-700 min-h-[60px] space-y-1">
      {lines.map((line, idx) => {
        const item = itemByIndex.get(idx);
        if (item) {
          const busy = togglingIndex === idx;
          return (
            <label
              key={idx}
              className={`flex items-start gap-2 rounded px-1 py-0.5 ${
                disabled ? "opacity-60 cursor-not-allowed" : "cursor-pointer hover:bg-gray-100"
              }`}
            >
              <input
                type="checkbox"
                checked={item.checked}
                disabled={busy || disabled}
                onChange={() => !disabled && onToggle(idx)}
                className="mt-0.5 h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary/40"
              />
              <span className={item.checked ? "line-through text-gray-500" : ""}>
                {item.text || <span className="text-gray-400">(sem texto)</span>}
              </span>
            </label>
          );
        }
        // Preserve blank lines as small spacer for readability.
        if (line.trim() === "") {
          return <div key={idx} className="h-2" />;
        }
        return (
          <p key={idx} className="whitespace-pre-wrap">
            {line}
          </p>
        );
      })}
    </div>
  );
}

function AssigneeListDisplay({ card }) {
  const users =
    Array.isArray(card.assignees) && card.assignees.length > 0
      ? card.assignees.map((a) => a.user)
      : card.assignee
        ? [card.assignee]
        : [];

  if (users.length === 0) {
    return <span className="text-sm text-gray-400">Não atribuído</span>;
  }

  return (
    <ul className="space-y-1.5">
      {users.map((u) => (
        <li key={u.id} className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-xs font-medium text-primary">
            {u.image ? (
              <img src={u.image} alt="" className="h-full w-full rounded-full object-cover" />
            ) : (
              getInitials(u.name)
            )}
          </div>
          <span className="truncate text-sm text-gray-700">{u.name}</span>
        </li>
      ))}
    </ul>
  );
}
