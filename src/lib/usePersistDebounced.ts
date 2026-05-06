import { useEffect, useRef } from "react";

/**
 * Debounced persistence that flushes its pending value on unmount and on
 * page-hide / visibility-hidden. Without these flushes, any edit made
 * within `delayMs` of a route change, athlete switch, tab switch, or app
 * close would be silently dropped — risky during a meet.
 */
export function usePersistDebounced<T>(
  value: T | null | undefined,
  save: (v: T) => void | Promise<void>,
  delayMs = 500,
) {
  const timer = useRef<number | null>(null);
  const latestVal = useRef(value);
  const latestSave = useRef(save);
  latestVal.current = value;
  latestSave.current = save;

  useEffect(() => {
    if (value == null) return;
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => {
      timer.current = null;
      const cur = latestVal.current;
      if (cur != null) void latestSave.current(cur);
    }, delayMs);
    return () => {
      // Flush pending save instead of silently dropping it.
      if (timer.current) {
        window.clearTimeout(timer.current);
        timer.current = null;
        const cur = latestVal.current;
        if (cur != null) void latestSave.current(cur);
      }
    };
  }, [value, delayMs]);

  useEffect(() => {
    const flush = () => {
      if (timer.current) {
        window.clearTimeout(timer.current);
        timer.current = null;
        const cur = latestVal.current;
        if (cur != null) void latestSave.current(cur);
      }
    };
    const onVis = () => {
      if (document.visibilityState === "hidden") flush();
    };
    window.addEventListener("pagehide", flush);
    document.addEventListener("visibilitychange", onVis);
    return () => {
      window.removeEventListener("pagehide", flush);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, []);
}
