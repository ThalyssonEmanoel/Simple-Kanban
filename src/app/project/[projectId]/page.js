"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Board from "@/components/board/Board";
import Navbar from "@/components/layout/Navbar";
import FilterBar from "@/components/board/FilterBar";
import CardModal from "@/components/board/CardModal";

export default function ProjectPage() {
  const { projectId } = useParams();
  const router = useRouter();
  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedCard, setSelectedCard] = useState(null);
  const [filters, setFilters] = useState({
    search: "",
    assignee: "",
    priority: "",
  });

  const loadProject = useCallback(async () => {
    const res = await fetch(`/api/projects/${projectId}`);
    if (res.ok) {
      const data = await res.json();
      setProject(data);
    } else if (res.status === 401 || res.status === 403) {
      router.push("/");
    }
    setLoading(false);
  }, [projectId, router]);

  useEffect(() => {
    loadProject();
  }, [loadProject]);

  function getUserRole() {
    if (!project) return null;
    // We need to get current user ID from somewhere
    // For now, check from project members
    return null;
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-gray-500">Projeto não encontrado</p>
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-col overflow-hidden">
      <Navbar project={project} onRefresh={loadProject} />
      <FilterBar
        filters={filters}
        setFilters={setFilters}
        members={project.members}
      />
      <div className="flex-1 overflow-hidden">
        <Board
          project={project}
          filters={filters}
          onCardClick={setSelectedCard}
          onRefresh={loadProject}
        />
      </div>
      {selectedCard && (
        <CardModal
          cardId={selectedCard}
          project={project}
          onClose={() => setSelectedCard(null)}
          onRefresh={loadProject}
        />
      )}
    </div>
  );
}
