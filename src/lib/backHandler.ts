import { useEffect } from "react";

/**
 * Global back-navigation stack.
 *
 * Overlays (book detail, video player, sheets…) register a handler while they
 * are open. The Android hardware/gesture back button pops the top-most handler
 * instead of closing the whole app.
 */
type Handler = () => void;

const stack: Handler[] = [];

export const pushBackHandler = (h: Handler): (() => void) => {
  stack.push(h);
  return () => {
    const i = stack.lastIndexOf(h);
    if (i >= 0) stack.splice(i, 1);
  };
};

/** Runs the top-most handler. Returns true when something was handled. */
export const runBackHandler = (): boolean => {
  const h = stack[stack.length - 1];
  if (!h) return false;
  h();
  return true;
};

/** Register a back handler for as long as `active` is true. */
export const useBackHandler = (active: boolean, handler: Handler) => {
  useEffect(() => {
    if (!active) return;
    return pushBackHandler(handler);
  }, [active, handler]);
};
