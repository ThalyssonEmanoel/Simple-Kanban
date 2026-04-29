"use client";

import { useState, useEffect, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import useSWR from "swr";
import { createClient } from "@/lib/supabase/client";
import Board from "@/components/board/Board";
import Navbar from "@/components/layout/Navbar";
import FilterBar from "@/components/board/FilterBar";
import CardModal from "@/components/board/CardModal";

export default function ProjectPage() {
  const { projectId } = useParams();
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [selectedCard, setSelectedCard] = useState(null);
  const [authUser, setAuthUser] = useState(null);
  const [onlineUserIds, setOnlineUserIds] = useState([]);
  const [filters, setFilters] = useState({
    search: "",
    assignee: "",
    priority: "",
  });

  const {
    data: project,
    error,
    isLoading,
    mutate,
  } = useSWR(projectId ? `/api/projects/${projectId}` : null);

  // Local optimistic setter wrapping SWR's mutate. Keeps the same surface that
  // Board/AddCard already use so we don't have to rewrite their state model.
  const setProject = (updater) => {
    mutate(
      (current) => {
        if (typeof updater === "function") return updater(current);
        return updater;
      },
      { revalidate: false }
    );
  };

  const onRefresh = () => mutate();

  useEffect(() => {
    if (error?.status === 401 || error?.status === 403) {
      router.push("/");
    }
  }, [error, router]);

  useEffect(() => {
    let cancelled = false;
    supabase.auth.getUser().then(({ data }) => {
      if (!cancelled) setAuthUser(data?.user ?? null);
    });
    return () => {
      cancelled = true;
    };
  }, [supabase]);

  const currentMember = useMemo(() => {
    if (!project || !authUser) return null;
    return project.members?.find((m) => m.user.email === authUser.email) || null;
  }, [project, authUser]);

  const userRole = currentMember?.role || null;
  const currentUserId = currentMember?.user?.id || null;

  // Supabase Realtime Presence
  useEffect(() => {
    if (!currentUserId || !projectId) return;

    const channel = supabase.channel(`project-presence:${projectId}`, {
      config: { presence: { key: currentUserId } },
    });

    channel
      .on("presence", { event: "sync" }, () => {
        const state = channel.presenceState();
        setOnlineUserIds(Object.keys(state));
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          await channel.track({ online_at: new Date().toISOString() });
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentUserId, projectId, supabase]);

  const onlineMembers = useMemo(() => {
    if (!project) return [];
    const set = new Set(onlineUserIds);
    return project.members.filter((m) => set.has(m.user.id));
  }, [project, onlineUserIds]);

  if (isLoading && !project) {
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
      <Navbar project={project} onRefresh={onRefresh} onlineMembers={onlineMembers} />
      <FilterBar
        filters={filters}
        setFilters={setFilters}
        members={project.members}
      />
      <div className="flex-1 overflow-hidden">
        <Board
          project={project}
          setProject={setProject}
          filters={filters}
          onCardClick={setSelectedCard}
          onRefresh={onRefresh}
          userRole={userRole}
        />
      </div>
      {selectedCard && (
        <CardModal
          cardId={selectedCard}
          project={project}
          onClose={() => setSelectedCard(null)}
          onRefresh={onRefresh}
          currentUserId={currentUserId}
          userRole={userRole}
        />
      )}
    </div>
  );
}
