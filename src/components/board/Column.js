"use client";

import { useState } from "react";
import { Draggable, Droppable } from "@hello-pangea/dnd";
import Card from "./Card";
import AddCard from "./AddCard";

const ARCHIVED_COLUMN_ID = "__archived__";

export default function Column({ column, cards, index, project, setProject, onCardClick, onRefresh, userRole }) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(column.name);
  const [showMenu, setShowMenu] = useState(false);
  const [archivingAll, setArchivingAll] = useState(false);

  const isArchiveColumn = column.id === ARCHIVED_COLUMN_ID || column.isArchive === true;
  const isFinalized = column.name === "Finalizadas" || column.name === "Done";

  async function handleRename(e) {
    e.preventDefault();
    if (!name.trim() || name === column.name) {
      setEditing(false);
      return;
    }

    await fetch("/api/columns", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: column.id, name: name.trim(), projectId: project.id }),
    });

    setEditing(false);
    onRefresh();
  }

  async function handleDelete() {
    if (!confirm(`Excluir coluna "${column.name}" e todos os cartões?`)) return;

    await fetch("/api/columns", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: column.id, projectId: project.id }),
    });

    setShowMenu(false);
    onRefresh();
  }

  async function handleArchiveAll() {
    if (cards.length === 0) {
      setShowMenu(false);
      return;
    }
    if (!confirm(`Arquivar todas as ${cards.length} tarefa(s) da coluna "${column.name}"?`)) {
      return;
    }
    setArchivingAll(true);
    setShowMenu(false);
    try {
      const res = await fetch(`/api/columns/${column.id}/archive-all`, { method: "PUT" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        alert(data.error || "Não foi possível arquivar as tarefas.");
      }
    } finally {
      setArchivingAll(false);
      onRefresh();
    }
  }

  const columnColors = {
    "A fazer": "bg-amber-500",
    "Finalizadas": "bg-green-600",
    "To Do": "bg-amber-500",
    "Done": "bg-green-600",
    "Arquivadas": "bg-gray-500",
  };

  const dotColor = columnColors[column.name] || "bg-emerald-400";

  // The archived column is read-only (drag-only). It has no AddCard footer,
  // can't be renamed, and is rendered as a non-draggable shell so Leaders cannot
  // accidentally reorder it among the real columns.
  if (isArchiveColumn) {
    return (
      <div className="flex w-[260px] sm:w-72 shrink-0 flex-col rounded-xl bg-gray-200/70 border border-gray-300">
        <div className="flex items-center justify-between px-3 py-3">
          <div className="flex items-center gap-2">
            <div className={`h-2.5 w-2.5 rounded-full ${dotColor}`}></div>
            <h3 className="text-sm font-semibold text-gray-700">{column.name}</h3>
            <span className="rounded-full bg-gray-300 px-2 py-0.5 text-xs font-medium text-gray-600">
              {cards.length}
            </span>
          </div>
          <span
            title="Após 7 dias sem movimentação a tarefa sai do board. Continua acessível em Exportar Arquivadas."
            className="text-[10px] uppercase tracking-wide text-gray-500"
          >
            7 dias
          </span>
        </div>

        <Droppable droppableId={column.id} type="CARD">
          {(provided, snapshot) => (
            <div
              ref={provided.innerRef}
              {...provided.droppableProps}
              className={`flex-1 space-y-2 overflow-y-auto px-3 pb-3 min-h-[60px] rounded-b-xl transition-colors ${
                snapshot.isDraggingOver ? "bg-blue-50/60" : ""
              }`}
            >
              {cards.length === 0 && (
                <p className="px-1 py-3 text-center text-xs text-gray-500">
                  Nenhuma tarefa arquivada nos últimos 7 dias.
                </p>
              )}
              {cards.map((card, cardIndex) => (
                <Card
                  key={card.id}
                  card={card}
                  index={cardIndex}
                  onClick={() => onCardClick(card.id)}
                />
              ))}
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      </div>
    );
  }

  return (
    <Draggable draggableId={column.id} index={index}>
      {(provided) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          className="flex w-[260px] sm:w-72 shrink-0 flex-col rounded-xl bg-gray-100/80 border border-gray-200"
        >
          {/* Column Header */}
          <div
            {...provided.dragHandleProps}
            className="flex items-center justify-between px-3 py-3"
          >
            <div className="flex items-center gap-2">
              <div className={`h-2.5 w-2.5 rounded-full ${dotColor}`}></div>
              {editing ? (
                <form onSubmit={handleRename} className="flex-1">
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    onBlur={handleRename}
                    autoFocus
                    className="w-full rounded border px-2 py-0.5 text-sm font-semibold focus:outline-none focus:border-primary"
                  />
                </form>
              ) : (
                <h3 className="text-sm font-semibold text-gray-700">{column.name}</h3>
              )}
              <span className="rounded-full bg-gray-200 px-2 py-0.5 text-xs font-medium text-gray-500">
                {cards.length}
              </span>
            </div>

            {userRole === "LEADER" && (!column.isDefault || isFinalized) && (
              <div className="relative">
                <button
                  onClick={() => setShowMenu(!showMenu)}
                  className="rounded p-1 text-gray-400 hover:bg-gray-200 hover:text-gray-600"
                >
                  <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
                  </svg>
                </button>
                {showMenu && (
                  <div className="absolute right-0 top-full z-10 mt-1 w-44 rounded-lg bg-white shadow-lg border border-gray-200">
                    {!column.isDefault && (
                      <>
                        <button
                          onClick={() => {
                            setEditing(true);
                            setShowMenu(false);
                          }}
                          className="w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50"
                        >
                          Renomear
                        </button>
                        <button
                          onClick={handleDelete}
                          className="w-full px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50"
                        >
                          Excluir
                        </button>
                      </>
                    )}
                    {isFinalized && (
                      <button
                        onClick={handleArchiveAll}
                        disabled={archivingAll || cards.length === 0}
                        className="w-full px-3 py-2 text-left text-sm text-amber-700 hover:bg-amber-50 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Arquivar todas ({cards.length})
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Cards */}
          <Droppable droppableId={column.id} type="CARD">
            {(provided, snapshot) => (
              <div
                ref={provided.innerRef}
                {...provided.droppableProps}
                className={`flex-1 space-y-2 overflow-y-auto px-3 pb-3 min-h-[60px] rounded-b-xl transition-colors ${
                  snapshot.isDraggingOver ? "bg-green-50/50" : ""
                }`}
              >
                {cards.map((card, cardIndex) => (
                  <Card
                    key={card.id}
                    card={card}
                    index={cardIndex}
                    onClick={() => onCardClick(card.id)}
                  />
                ))}
                {provided.placeholder}
              </div>
            )}
          </Droppable>

          <AddCard
            columnId={column.id}
            projectId={project.id}
            members={project.members}
            project={project}
            setProject={setProject}
            onRefresh={onRefresh}
          />
        </div>
      )}
    </Draggable>
  );
}
