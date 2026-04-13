"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { getInitials } from "@/lib/utils";

export default function MetricsPage() {
  const { projectId } = useParams();
  const router = useRouter();
  const [metrics, setMetrics] = useState(null);
  const [period, setPeriod] = useState("week");
  const [loading, setLoading] = useState(true);

  const loadMetrics = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/metrics?projectId=${projectId}&period=${period}`);
    if (res.ok) {
      const data = await res.json();
      setMetrics(data);
    }
    setLoading(false);
  }, [projectId, period]);

  useEffect(() => {
    loadMetrics();
  }, [loadMetrics]);

  if (loading || !metrics) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
      </div>
    );
  }

  const maxColumnCount = Math.max(...metrics.columnStats.map((c) => c.count), 1);

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="border-b bg-white shadow-sm">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push(`/project/${projectId}`)}
              className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50"
            >
              Voltar
            </button>
            <h1 className="text-xl font-bold text-gray-900">Métricas de Desempenho</h1>
          </div>
          <div className="flex gap-1 rounded-lg bg-gray-100 p-1">
            {[
              { key: "week", label: "Semana" },
              { key: "month", label: "Mês" },
              { key: "quarter", label: "Trimestre" },
            ].map((p) => (
              <button
                key={p.key}
                onClick={() => setPeriod(p.key)}
                className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                  period === p.key
                    ? "bg-white text-gray-900 shadow-sm"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-8">
        {/* Summary Cards */}
        <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-xl bg-white p-5 shadow-sm border border-gray-200">
            <p className="text-sm text-gray-500">Tarefas Concluídas</p>
            <p className="mt-1 text-3xl font-bold text-green-600">
              {metrics.completedCount}
            </p>
          </div>
          <div className="rounded-xl bg-white p-5 shadow-sm border border-gray-200">
            <p className="text-sm text-gray-500">Lead Time Médio</p>
            <p className="mt-1 text-3xl font-bold text-blue-600">
              {metrics.avgLeadTimeHours}h
            </p>
          </div>
          <div className="rounded-xl bg-white p-5 shadow-sm border border-gray-200">
            <p className="text-sm text-gray-500">Tarefas Atrasadas</p>
            <p className="mt-1 text-3xl font-bold text-red-600">
              {metrics.overdueCards}
            </p>
          </div>
          <div className="rounded-xl bg-white p-5 shadow-sm border border-gray-200">
            <p className="text-sm text-gray-500">Total de Membros</p>
            <p className="mt-1 text-3xl font-bold text-purple-600">
              {metrics.memberStats.length}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Column Distribution */}
          <div className="rounded-xl bg-white p-6 shadow-sm border border-gray-200">
            <h2 className="mb-4 text-lg font-semibold text-gray-900">
              Distribuição por Coluna
            </h2>
            <div className="space-y-3">
              {metrics.columnStats.map((col) => (
                <div key={col.name}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm text-gray-700">{col.name}</span>
                    <span className="text-sm font-medium text-gray-900">{col.count}</span>
                  </div>
                  <div className="h-3 rounded-full bg-gray-100 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-primary transition-all"
                      style={{
                        width: `${(col.count / maxColumnCount) * 100}%`,
                      }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Member Stats */}
          <div className="rounded-xl bg-white p-6 shadow-sm border border-gray-200">
            <h2 className="mb-4 text-lg font-semibold text-gray-900">
              Desempenho por Membro
            </h2>
            <div className="space-y-3">
              {metrics.memberStats.map((m) => (
                <div
                  key={m.id}
                  className="flex items-center justify-between rounded-lg bg-gray-50 p-3"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-xs font-medium text-primary">
                      {m.image ? (
                        <img src={m.image} alt="" className="h-full w-full rounded-full object-cover" />
                      ) : (
                        getInitials(m.name)
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">{m.name}</p>
                      <p className="text-xs text-gray-500">
                        {m.role === "LEADER" ? "Líder" : "Membro"}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 text-sm">
                    <div className="text-center">
                      <p className="font-bold text-green-600">{m.done}</p>
                      <p className="text-xs text-gray-400">Concluídas</p>
                    </div>
                    <div className="text-center">
                      <p className="font-bold text-blue-600">{m.inProgress}</p>
                      <p className="text-xs text-gray-400">Em andamento</p>
                    </div>
                    <div className="text-center">
                      <p className="font-bold text-gray-600">{m.total}</p>
                      <p className="text-xs text-gray-400">Total</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
