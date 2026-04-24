"use client";

import { useState } from "react";
import { Draggable, Droppable } from "@hello-pangea/dnd";
import Card from "./Card";
import AddCard from "./AddCard";

export default function Column({ column, cards, index, project, setProject, onCardClick, onRefresh, userRole }) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(column.name);
  const [showMenu, setShowMenu] = useState(false);

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

  const columnColors = {
    "A fazer": "bg-amber-500",
    "Finalizadas": "bg-green-600",
    "To Do": "bg-amber-500",
    "Done": "bg-green-600",
  };

  const dotColor = columnColors[column.name] || "bg-emerald-400";

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

            {!column.isDefault && userRole === "LEADER" && (
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
                  <div className="absolute right-0 top-full z-10 mt-1 w-36 rounded-lg bg-white shadow-lg border border-gray-200">
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
