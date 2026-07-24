import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

type TableSpec = { table: string; filter?: string };

/**
 * Subscribe to Supabase Realtime changes on one or more tables and
 * invalidate the given TanStack Query keys whenever a row changes.
 *
 * Use this to give any KPI / list / dashboard tile live updates without
 * manual polling. Falls back to a lightweight polling interval so tiles
 * still refresh even when realtime is temporarily unavailable.
 */
export function useRealtimeInvalidate(
  channelName: string,
  tables: Array<string | TableSpec>,
  invalidateKeys: readonly (readonly unknown[])[],
  opts?: { pollMs?: number; enabled?: boolean },
) {
  const qc = useQueryClient();
  const enabled = opts?.enabled ?? true;
  const pollMs = opts?.pollMs ?? 30_000;

  useEffect(() => {
    if (!enabled) return;

    const invalidate = () => {
      for (const key of invalidateKeys) {
        qc.invalidateQueries({ queryKey: key as unknown[] });
      }
    };

    let channel = supabase.channel(channelName);
    for (const t of tables) {
      const spec: TableSpec = typeof t === "string" ? { table: t } : t;
      channel = channel.on(
        // Realtime typings for postgres_changes are narrow; cast so we can pass a runtime table name.
        "postgres_changes" as never,
        { event: "*", schema: "public", ...spec } as never,
        invalidate,
      );
    }
    channel.subscribe();

    const timer = window.setInterval(invalidate, pollMs);

    return () => {
      window.clearInterval(timer);
      supabase.removeChannel(channel);
    };
    // channelName + serialized keys are stable identity for consumers.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [channelName, enabled, pollMs, qc]);
}
