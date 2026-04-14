"use client";

import { Draggable } from "@hello-pangea/dnd";
import { getPriorityColor, getPriorityLabel, isOverdue, formatDate, getInitials } from "@/lib/utils";

export default function Card({ card, index, onClick }) {
  const overdue = isOverdue(card.dueDate) && card.column?.name !== "Finalizadas" && card.column?.name !== "Done";

  return (
    <Draggable draggableId={card.id} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          onClick={onClick}
          className={`cursor-pointer rounded-lg bg-white p-3 shadow-sm border border-gray-200 hover:shadow-md hover:border-gray-300 transition-all ${
            snapshot.isDragging ? "shadow-lg rotate-2" : ""
          } ${overdue ? "border-l-4 border-l-red-400" : ""}`}
        >
          {/* Priority badge */}
          <div className="mb-2 flex items-center justify-between">
            <span
              className={`rounded-full px-2 py-0.5 text-xs font-medium ${getPriorityColor(
                card.priority
              )}`}
            >
              {getPriorityLabel(card.priority)}
            </span>
            {card._count?.comments > 0 && (
              <div className="flex items-center gap-2 text-xs text-gray-400">
                <span className="flex items-center gap-0.5">
                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                  {card._count.comments}
                </span>
              </div>
            )}
          </div>

          {/* Title */}
          <h4 className="text-sm font-medium text-gray-900 leading-snug">{card.title}</h4>

          {/* Footer: due date + assignee */}
          <div className="mt-3 flex items-center justify-between">
            {card.dueDate ? (
              <span
                className={`text-xs ${
                  overdue ? "font-medium text-red-500" : "text-gray-400"
                }`}
              >
                {overdue ? "Atrasado - " : ""}
                {formatDate(card.dueDate)}
              </span>
            ) : (
              <span></span>
            )}

            {/* Assignee avatar */}
            {card.assignee ? (
              <div
                className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-xs font-medium text-primary"
                title={card.assignee.name}
              >
                {card.assignee.image ? (
                  <img
                    src={card.assignee.image}
                    alt={card.assignee.name}
                    className="h-full w-full rounded-full object-cover"
                  />
                ) : (
                  getInitials(card.assignee.name)
                )}
              </div>
            ) : card.creator ? (
              <div
                className="flex h-7 w-7 items-center justify-center rounded-full bg-gray-100 text-xs font-medium text-gray-500"
                title={`Criado por ${card.creator.name}`}
              >
                {card.creator.image ? (
                  <img
                    src={card.creator.image}
                    alt={card.creator.name}
                    className="h-full w-full rounded-full object-cover"
                  />
                ) : (
                  getInitials(card.creator.name)
                )}
              </div>
            ) : null}
          </div>
        </div>
      )}
    </Draggable>
  );
}
