"use client";

import { useLayoutEffect, useSyncExternalStore } from "react";
import { gsap } from "gsap";

/**
 * Live prefers-reduced-motion flag via useSyncExternalStore: no
 * setState-in-effect, SSR-safe (server snapshot is false), and the
 * value updates when the user toggles the OS setting.
 */
const reduceMotionMql = () =>
  window.matchMedia("(prefers-reduced-motion: reduce)");

export function useReducedMotion(): boolean {
  return useSyncExternalStore(
    (onChange) => {
      const mql = reduceMotionMql();
      mql.addEventListener("change", onChange);
      return () => mql.removeEventListener("change", onChange);
    },
    () => reduceMotionMql().matches,
    () => false
  );
}

/**
 * useGSAP: a clone of GSAP's recommended pattern with the SSR/CSR guard
 * baked in, and an automatic `prefers-reduced-motion` short-circuit.
 *
 * When reduce is true, animations never run, scopes are not created, and
 * the component renders its SSR markup without timeline bookkeeping.
 */
export function useGSAP(
  setup: () => void | (() => void),
  scopeRef: React.RefObject<HTMLElement | null>,
  deps: unknown[] = []
) {
  const reduce = useReducedMotion();
  // Layout effect on purpose: GSAP pins move DOM nodes (the section is
  // re-parented into a .pin-spacer at refresh, even at scroll 0). React's
  // unmount then fails with "removeChild: node is not a child" because the
  // fiber still thinks the old parent owns the node. Cleanup must run in
  // the layout phase (ctx.revert() restores the DOM) BEFORE React deletes
  // the subtree in commitMutationEffects.
  useLayoutEffect(() => {
    if (reduce || !scopeRef.current) return;
    let cleanup: void | (() => void);
    const ctx = gsap.context(() => {
      cleanup = setup();
    }, scopeRef.current);
    return () => {
      if (typeof cleanup === "function") cleanup();
      ctx.revert();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reduce, ...deps]);
}
