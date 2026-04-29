"use client";

import { useState } from "react";
import { DragDropContext, Droppable } from "@hello-pangea/dnd";
import Column from "./Column";

const ARCHIVED_COLUMN_ID = "__archived__";

export default function Board({ project, setProject, filters, onCardClick, onRefresh, userRole }) {
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

    // Snapshot previous state for rollback on failure
    const previousProject = project;

    if (type === "COLUMN") {
      const newColumns = Array.from(project.columns);
      const [moved] = newColumns.splice(source.index, 1);
      newColumns.splice(destination.index, 0, moved);

      // Optimistic update
      setProject({ ...project, columns: newColumns });

      try {
        const res = await fetch("/api/columns/reorder", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            projectId: project.id,
            // Send only real columns to the server. The synthetic "Arquivadas"
            // column has no row to reorder.
            columns: newColumns
              .filter((c) => c.id !== ARCHIVED_COLUMN_ID && !c.isArchive)
              .map((c) => ({ id: c.id })),
          }),
        });
        if (!res.ok) throw new Error("reorder failed");
      } catch {
        setProject(previousProject);
      }
      return;
    }

    const intoArchive = destination.droppableId === ARCHIVED_COLUMN_ID;
    const fromArchive = source.droppableId === ARCHIVED_COLUMN_ID;

    // Card drag — optimistic update of columns/cards locally
    const newColumns = project.columns.map((col) => ({ ...col, cards: [...col.cards] }));
    const sourceCol = newColumns.find((c) => c.id === source.droppableId);
    const destCol = newColumns.find((c) => c.id === destination.droppableId);
    if (!sourceCol || !destCol) return;

    const [movedCard] = sourceCol.cards.splice(source.index, 1);
    if (!movedCard) return;

    const movedCardUpdated = {
      ...movedCard,
      columnId: intoArchive ? movedCard.columnId : destination.droppableId,
      archived: intoArchive ? true : fromArchive ? false : movedCard.archived,
    };
    destCol.cards.splice(destination.index, 0, movedCardUpdated);

    setProject({ ...project, columns: newColumns });

    try {
      const res = await fetch("/api/cards/move", {
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
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "move failed");
      }
      // Reactivation/archive needs a full reload because the server may move the
      // card to a different column (previousColumnId) than the dropdown intended.
      if (intoArchive || fromArchive) {
        onRefresh();
      }
    } catch (err) {
      // Rollback on server failure
      setProject(previousProject);
      if (intoArchive || fromArchive) {
        alert(err?.message || "Não foi possível mover o cartão.");
      }
    }
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
    // Column create is infrequent; fall back to full reload for the new column id
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

  // Real columns participate in column-level reordering via the parent Droppable.
  // The synthetic "Arquivadas" column is fixed at the end and rendered outside that
  // Droppable so it never appears in the column drag handle and can't be dragged
  // out of position. Cards can still be dropped into/out of it via its own CARD Droppable.
  const realColumns = project.columns.filter(
    (c) => c.id !== ARCHIVED_COLUMN_ID && !c.isArchive
  );
  const archiveColumn = project.columns.find(
    (c) => c.id === ARCHIVED_COLUMN_ID || c.isArchive
  );

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <div className="flex h-full overflow-x-auto p-3 sm:p-4">
        <Droppable droppableId="board" type="COLUMN" direction="horizontal">
          {(provided) => (
            <div
              ref={provided.innerRef}
              {...provided.droppableProps}
              className="flex gap-3 sm:gap-4"
            >
              {realColumns.map((column, index) => (
                <Column
                  key={column.id}
                  column={column}
                  cards={filterCards(column.cards)}
                  index={index}
                  project={project}
                  setProject={setProject}
                  onCardClick={onCardClick}
                  onRefresh={onRefresh}
                  userRole={userRole}
                />
              ))}
              {provided.placeholder}
            </div>
          )}
        </Droppable>

        <div className="flex gap-3 sm:gap-4 ml-3 sm:ml-4">
          {/* Add Column */}
          <div className="shrink-0 w-72">
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

          {archiveColumn && (
            <Column
              column={archiveColumn}
              cards={filterCards(archiveColumn.cards)}
              index={-1}
              project={project}
              setProject={setProject}
              onCardClick={onCardClick}
              onRefresh={onRefresh}
              userRole={userRole}
            />
          )}
        </div>
      </div>
    </DragDropContext>
  );
}
