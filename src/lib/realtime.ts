import { useEffect, useRef } from "react";
import { supabase } from "./supabase";

/**
 * Subscribe to any Supabase table and fire callback on INSERT / UPDATE / DELETE.
 * Debounced 600ms so rapid batch writes trigger only one reload.
 * Cleans up subscription on unmount automatically.
 */
export function useRealtime(table: string, callback: () => void) {
  const cbRef = useRef(callback);
  cbRef.current = callback;

  useEffect(() => {
    const timer: { id: ReturnType<typeof setTimeout> | null } = { id: null };

    const debounced = () => {
      if (timer.id) clearTimeout(timer.id);
      timer.id = setTimeout(() => cbRef.current(), 600);
    };

    const channel = supabase
      .channel(`rt-${table}-${Math.random().toString(36).slice(2)}`)
      .on("postgres_changes" as any, { event: "*", schema: "public", table }, debounced)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      if (timer.id) clearTimeout(timer.id);
    };
  }, [table]);
}
