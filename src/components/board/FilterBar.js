"use client";

export default function FilterBar({ filters, setFilters, members }) {
  return (
    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3 border-b bg-white px-3 py-2 sm:px-4">
      {/* Search */}
      <div className="relative flex-1 sm:max-w-md">
        <svg
          className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input
          type="text"
          value={filters.search}
          onChange={(e) => setFilters({ ...filters, search: e.target.value })}
          className="w-full rounded-lg border border-gray-300 py-1.5 pl-9 pr-3 text-sm focus:border-primary focus:outline-none"
          placeholder="Buscar cartões..."
        />
      </div>

      <div className="flex items-center gap-2 sm:gap-3">
        {/* Assignee filter */}
        <select
          value={filters.assignee}
          onChange={(e) => setFilters({ ...filters, assignee: e.target.value })}
          className="flex-1 sm:flex-none rounded-lg border border-gray-300 px-3 py-1.5 text-sm text-gray-700 focus:border-primary focus:outline-none"
        >
          <option value="">Todos</option>
          {members.map((m) => (
            <option key={m.user.id} value={m.user.id}>
              {m.user.name}
            </option>
          ))}
        </select>

        {/* Priority filter */}
        <select
          value={filters.priority}
          onChange={(e) => setFilters({ ...filters, priority: e.target.value })}
          className="flex-1 sm:flex-none rounded-lg border border-gray-300 px-3 py-1.5 text-sm text-gray-700 focus:border-primary focus:outline-none"
        >
          <option value="">Prioridades</option>
          <option value="LOW">Baixa</option>
          <option value="MEDIUM">Média</option>
          <option value="HIGH">Alta</option>
          <option value="CRITICAL">Crítica</option>
        </select>

        {/* Clear filters */}
        {(filters.search || filters.assignee || filters.priority) && (
          <button
            onClick={() => setFilters({ search: "", assignee: "", priority: "" })}
            className="shrink-0 rounded-lg px-3 py-1.5 text-sm text-gray-500 hover:bg-gray-100"
          >
            Limpar
          </button>
        )}
      </div>
    </div>
  );
}
