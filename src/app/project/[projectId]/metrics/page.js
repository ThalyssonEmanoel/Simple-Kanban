"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { getInitials } from "@/lib/utils";
import * as XLSX from "xlsx";

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

  async function handleExportXLSX() {
    const res = await fetch(`/api/projects/${projectId}`);
    if (!res.ok) return;
    const project = await res.json();

    const wb = XLSX.utils.book_new();

    // Sheet 1: Cards
    const cardsData = [];
    for (const column of project.columns) {
      for (const card of column.cards) {
        cardsData.push({
          Coluna: column.name,
          Título: card.title,
          Prioridade: card.priority,
          Responsável: card.assignee?.name || "Não atribuído",
          Criador: card.creator?.name || "",
          Prazo: card.dueDate
            ? new Date(card.dueDate).toLocaleDateString("pt-BR")
            : "Sem prazo",
          "Criado em": new Date(card.createdAt).toLocaleDateString("pt-BR"),
        });
      }
    }
    const wsCards = XLSX.utils.json_to_sheet(
      cardsData.length > 0
        ? cardsData
        : [{ Coluna: "", Título: "Nenhum cartão encontrado" }]
    );
    XLSX.utils.book_append_sheet(wb, wsCards, "Cartões");

    // Sheet 2: Members
    const membersData = metrics.memberStats.map((m) => ({
      Nome: m.name,
      Função: m.role === "LEADER" ? "Líder" : "Membro",
      Concluídas: m.done,
      Pendentes: m.todo,
      Total: m.total,
    }));
    const wsMembers = XLSX.utils.json_to_sheet(membersData);
    XLSX.utils.book_append_sheet(wb, wsMembers, "Membros");

    // Sheet 3: Column Distribution
    const columnData = metrics.columnStats.map((c) => ({
      Coluna: c.name,
      "Qtd. Cartões": c.count,
    }));
    const wsCols = XLSX.utils.json_to_sheet(columnData);
    XLSX.utils.book_append_sheet(wb, wsCols, "Distribuição");

    // Sheet 4: Summary
    const summaryData = [
      { Métrica: "Tarefas Concluídas", Valor: metrics.completedCount },
      { Métrica: "Tarefas A fazer", Valor: metrics.todoCount },
      { Métrica: "Tarefas Não Finalizadas", Valor: metrics.notFinishedCount },
      { Métrica: "Total de Membros", Valor: metrics.memberStats.length },
      { Métrica: "Período", Valor: period === "week" ? "Semana" : period === "month" ? "Mês" : "Trimestre" },
    ];
    const wsSummary = XLSX.utils.json_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(wb, wsSummary, "Resumo");

    XLSX.writeFile(wb, `projeto-metricas-${period}.xlsx`);
  }

  async function handleExportArchivedXLSX() {
    const res = await fetch(`/api/projects/${projectId}/archived-export`);
    if (res.status === 403) {
      alert("Apenas líderes podem exportar tarefas arquivadas.");
      return;
    }
    if (!res.ok) {
      alert("Não foi possível exportar as tarefas arquivadas.");
      return;
    }

    const data = await res.json();
    const wb = XLSX.utils.book_new();

    const rows = (data.cards || []).map((c) => ({
      Coluna: c.columnName,
      Título: c.title,
      Descrição: c.description || "",
      Prioridade: c.priority,
      Responsáveis: c.assigneeNames,
      Criador: c.creatorName,
      "E-mail Criador": c.creatorEmail,
      Prazo: c.dueDate ? new Date(c.dueDate).toLocaleDateString("pt-BR") : "Sem prazo",
      Lembrete: c.reminderDate
        ? new Date(c.reminderDate).toLocaleDateString("pt-BR")
        : "",
      "Criado em": new Date(c.createdAt).toLocaleDateString("pt-BR"),
      "Atualizado em": new Date(c.updatedAt).toLocaleDateString("pt-BR"),
    }));

    const ws = XLSX.utils.json_to_sheet(
      rows.length > 0
        ? rows
        : [{ Coluna: "", Título: "Nenhuma tarefa arquivada" }]
    );
    XLSX.utils.book_append_sheet(wb, ws, "Arquivadas");

    const safeName = (data.project?.name || "projeto").replace(/[^a-z0-9-_]+/gi, "-");
    XLSX.writeFile(wb, `${safeName}-arquivadas.xlsx`);
  }

  if (loading || !metrics) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
      </div>
    );
  }

  const maxColumnCount = Math.max(...metrics.columnStats.map((c) => c.count), 1);

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-white shadow-sm">
        <div className="mx-auto flex max-w-6xl flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 py-3 sm:px-6 sm:py-4">
          <div className="flex items-center gap-3 sm:gap-4">
            <button
              onClick={() => router.push(`/project/${projectId}`)}
              className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50"
            >
              Voltar
            </button>
            <h1 className="text-base sm:text-xl font-bold text-gray-900">Métricas</h1>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <button
              onClick={handleExportXLSX}
              className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50 transition-colors flex items-center gap-2"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <span className="hidden sm:inline">Exportar</span> XLSX
            </button>
            {metrics.currentUserRole === "LEADER" && (
              <button
                onClick={handleExportArchivedXLSX}
                title="Exportar tarefas arquivadas (somente líderes)"
                className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50 transition-colors flex items-center gap-2"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 01-2-2V5a2 2 0 012-2h14a2 2 0 012 2v1a2 2 0 01-2 2M5 8v11a2 2 0 002 2h10a2 2 0 002-2V8M10 12h4" />
                </svg>
                <span className="hidden sm:inline">Exportar Arquivadas</span>
                <span className="sm:hidden">Arquivadas</span>
              </button>
            )}
            <div className="flex gap-1 rounded-lg bg-gray-100 p-1">
              {[
                { key: "week", label: "Semana" },
                { key: "month", label: "Mês" },
                { key: "quarter", label: "Tri" },
              ].map((p) => (
                <button
                  key={p.key}
                  onClick={() => setPeriod(p.key)}
                  className={`rounded-md px-2 sm:px-3 py-1.5 text-xs sm:text-sm font-medium transition-colors ${
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
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
        {/* Summary Cards */}
        <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-xl bg-white p-5 shadow-sm border border-gray-200">
            <p className="text-sm text-gray-500">Tarefas Concluídas</p>
            <p className="mt-1 text-3xl font-bold text-green-600">
              {metrics.completedCount}
            </p>
          </div>
          <div className="rounded-xl bg-white p-5 shadow-sm border border-gray-200">
            <p className="text-sm text-gray-500">Quantidade de Tarefas A fazer</p>
            <p className="mt-1 text-3xl font-bold text-amber-600">
              {metrics.todoCount}
            </p>
          </div>
          <div className="rounded-xl bg-white p-5 shadow-sm border border-gray-200">
            <p className="text-sm text-gray-500">Tarefas Não Finalizadas</p>
            <p className="mt-1 text-3xl font-bold text-red-600">
              {metrics.notFinishedCount}
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
                  className="flex flex-col sm:flex-row sm:items-center justify-between rounded-lg bg-gray-50 p-3 gap-2"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-medium text-primary">
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
                  <div className="flex items-center gap-4 text-sm ml-12 sm:ml-0">
                    <div className="text-center">
                      <p className="font-bold text-green-600">{m.done}</p>
                      <p className="text-xs text-gray-400">Concluídas</p>
                    </div>
                    <div className="text-center">
                      <p className="font-bold text-amber-600">{m.todo}</p>
                      <p className="text-xs text-gray-400">Pendentes</p>
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
