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

  // Schedule debounced save when value changes. The cleanup here just
  // clears the timer — flushing on every value change would defeat the
  // debounce and double-write IndexedDB during typing. Real flushes are
  // owned by the mount-scoped effect below (unmount + pagehide + visibility).
  useEffect(() => {
    if (value == null) return;
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => {
      timer.current = null;
      const cur = latestVal.current;
      if (cur != null) void latestSave.current(cur);
    }, delayMs);
    return () => {
      if (timer.current) {
        window.clearTimeout(timer.current);
        timer.current = null;
      }
    };
  }, [value, delayMs]);

  // Mount-scoped: flush any pending save on real unmount, on pagehide, and
  // on visibilitychange:hidden. Cleanup of a [] effect only fires at
  // unmount, so flushing here is safe.
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
      flush();
      window.removeEventListener("pagehide", flush);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, []);
}
