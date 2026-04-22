"use client";

import { useState } from "react";
import { DragDropContext, Droppable } from "@hello-pangea/dnd";
import Column from "./Column";

export default function Board({ project, filters, onCardClick, onRefresh, userRole }) {
  const [addingColumn, setAddingColumn] = useState(false);
  const [newColumnName, setNewColumnName] = useState("");

  async function handleDragEnd(result) {
    const { destination, source, draggableId, type } = result;

    if (!destination) return;
    if (
      destination.droppableId === source.droppableId &&
      destination.index === source.index
    )
      return;

    if (type === "COLUMN") {
      const newColumns = Array.from(project.columns);
      const [moved] = newColumns.splice(source.index, 1);
      newColumns.splice(destination.index, 0, moved);

      await fetch("/api/columns/reorder", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId: project.id,
          columns: newColumns.map((c) => ({ id: c.id })),
        }),
      });

      onRefresh();
      return;
    }

    // Card drag
    await fetch("/api/cards/move", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        cardId: draggableId,
        sourceColumnId: source.droppableId,
        destinationColumnId: destination.droppableId,
        newPosition: destination.index,
        projectId: project.id,
      }),
    });

    onRefresh();
  }

  async function handleAddColumn(e) {
    e.preventDefault();
    if (!newColumnName.trim()) return;

    await fetch("/api/columns", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        projectId: project.id,
        name: newColumnName.trim(),
      }),
    });

    setNewColumnName("");
    setAddingColumn(false);
    onRefresh();
  }

  // Apply filters to cards
  function filterCards(cards) {
    return cards.filter((card) => {
      if (
        filters.search &&
        !card.title.toLowerCase().includes(filters.search.toLowerCase())
      )
        return false;
      if (filters.assignee) {
        const assigneeIds = Array.isArray(card.assignees) && card.assignees.length > 0
          ? card.assignees.map((a) => a.user?.id || a.userId)
          : card.assigneeId
            ? [card.assigneeId]
            : [];
        if (!assigneeIds.includes(filters.assignee)) return false;
      }
      if (filters.priority && card.priority !== filters.priority) return false;
      return true;
    });
  }

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <Droppable droppableId="board" type="COLUMN" direction="horizontal">
        {(provided) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className="flex h-full gap-3 sm:gap-4 overflow-x-auto p-3 sm:p-4"
          >
            {project.columns.map((column, index) => (
              <Column
                key={column.id}
                column={column}
                cards={filterCards(column.cards)}
                index={index}
                project={project}
                onCardClick={onCardClick}
                onRefresh={onRefresh}
                userRole={userRole}
              />
            ))}
            {provided.placeholder}

            {/* Add Column */}
            <div className="flex-shrink-0 w-72">
              {addingColumn ? (
                <form
                  onSubmit={handleAddColumn}
                  className="rounded-xl bg-white p-3 shadow-sm border border-gray-200"
                >
                  <input
                    type="text"
                    value={newColumnName}
                    onChange={(e) => setNewColumnName(e.target.value)}
                    autoFocus
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:outline-none"
                    placeholder="Nome da coluna..."
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
                      onClick={() => setAddingColumn(false)}
                      className="rounded-lg px-3 py-1.5 text-sm text-gray-500 hover:bg-gray-100"
                    >
                      Cancelar
                    </button>
                  </div>
                </form>
              ) : (
                <button
                  onClick={() => setAddingColumn(true)}
                  className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-gray-300 p-4 text-sm text-gray-500 hover:border-primary hover:text-primary transition-colors"
                >
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Adicionar coluna
                </button>
              )}
            </div>
          </div>
        )}
      </Droppable>
    </DragDropContext>
  );
}
