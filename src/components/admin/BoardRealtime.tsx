"use client";

import { useEffect, useRef, useState, type Dispatch, type SetStateAction } from "react";
import { createClient, type RealtimeChannel, type SupabaseClient } from "@supabase/supabase-js";
import type { BoardItemDto } from "@/lib/boards";

/**
 * Browser supabase client for the moodboard canvas. Only exists when
 * the app is configured with NEXT_PUBLIC_SUPABASE_URL + anon key; on
 * the local/SQLite runtime (no Supabase env) this is a no-op so the
 * canvas works fully offline without realtime.
 */
let _browserClient: SupabaseClient | null = null;
function getBrowserClient(): SupabaseClient | null {
  if (typeof window === "undefined") return null;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) return null;
  if (!_browserClient) {
    _browserClient = createClient(url, anon, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return _browserClient;
}

export type RealtimePresence = {
  online: string[];
  cursors: Record<string, { x: number; y: number }>;
  broadcast: (x: number, y: number) => void;
};

/**
 * Merge a raw realtime row (snake_case, no material join) into local
 * state. Geometry updates patch the existing DTO in place; inserts
 * trigger a full board refetch so the joined material arrives; deletes
 * drop the item.
 */
function useRealtimeBoard(
  boardId: string,
  _items: BoardItemDto[],
  setItems: Dispatch<SetStateAction<BoardItemDto[]>>,
  setSelectedId: Dispatch<SetStateAction<string | null>>,
  role: string
): RealtimePresence {
  const [presence, setPresence] = useState<RealtimePresence>({
    online: [],
    cursors: {},
    broadcast: () => {},
  });
  const channelRef = useRef<RealtimeChannel | null>(null);
  const localId = useRef<string | null>(null);
  const itemsMap = useRef(new Map<string, BoardItemDto>());

  useEffect(() => {
    itemsMap.current = new Map(_items.map((i) => [i.id, i]));
  }, [_items]);

  // Local presence id is generated once, outside render.
  useEffect(() => {
    localId.current = `cursor-${crypto.randomUUID().slice(0, 8)}`;
  }, []);

  useEffect(() => {
    const client = getBrowserClient();
    if (!client) return;
    const channel = client.channel(`board:${boardId}`);

    channel
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "board_items", filter: `board_id=eq.${boardId}` },
        (payload) => {
          const row = payload.new as Record<string, unknown>;
          if (!row?.id) return;
          const id = String(row.id);
          if (itemsMap.current.has(id)) return; // our own optimistic insert
          // Refetch the whole board so the joined material arrives.
          void fetch(`/api/boards/${boardId}`)
            .then((r) => (r.ok ? r.json() : null))
            .then((d) => {
              if (d?.board?.items) setItems(d.board.items as BoardItemDto[]);
            })
            .catch(() => {});
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "board_items", filter: `board_id=eq.${boardId}` },
        (payload) => {
          const row = payload.new as Record<string, unknown>;
          if (!row?.id) return;
          const id = String(row.id);
          setItems((prev) =>
            prev.map((i) =>
              i.id === id
                ? {
                    ...i,
                    x: Number(row.x ?? i.x),
                    y: Number(row.y ?? i.y),
                    w: Number(row.w ?? i.w),
                    h: Number(row.h ?? i.h),
                    rotation: Number(row.rotation ?? i.rotation),
                    zIndex: Number(row.z_index ?? i.zIndex),
                  }
                : i
            )
          );
        }
      )
      .on(
        "postgres_changes",
        { event: "DELETE", schema: "public", table: "board_items", filter: `board_id=eq.${boardId}` },
        (payload) => {
          const id = String((payload.old as Record<string, unknown>)?.id ?? "");
          if (!id) return;
          setItems((prev) => prev.filter((i) => i.id !== id));
          setSelectedId((s) => (s === id ? null : s));
        }
      )
      .on("presence", { event: "sync" }, () => {
        const state = channel.presenceState();
        const online = Object.values(state)
          .flat()
          .map((p) => String((p as { name?: string }).name ?? "Designer"))
          .filter((v, idx, arr) => arr.indexOf(v) === idx);
        setPresence((p) => ({ ...p, online }));
      })
      .on("broadcast", { event: "cursor" }, (payload) => {
        const p = payload.payload as { pid?: string; x?: number; y?: number };
        if (!p?.pid || p.pid === localId.current) return;
        setPresence((prev) => ({
          ...prev,
          cursors: { ...prev.cursors, [p.pid as string]: { x: p.x ?? 0, y: p.y ?? 0 } },
        }));
      });

    channel.subscribe(async (status) => {
      if (status !== "SUBSCRIBED") return;
      await channel.track({ name: role === "superadmin" ? "Operator" : "Admin" });
    });

    channelRef.current = channel;
    return () => {
      void client.removeChannel(channel);
      channelRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [boardId]);

  /** Broadcast a cursor position (throttled by the caller). */
  function broadcast(x: number, y: number) {
    const channel = channelRef.current;
    if (!channel) return;
    void channel.send({
      type: "broadcast",
      event: "cursor",
      payload: { pid: localId.current ?? "cursor", x, y },
    });
  }

  return { ...presence, broadcast };
}

export { useRealtimeBoard };
