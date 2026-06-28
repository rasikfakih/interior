"use client";

import { useEffect, useState } from "react";
import { gsap } from "gsap";

/**
 * Read prefers-reduced-motion once with a subscription.
 */
export function useReducedMotion(): boolean {
  const [reduce, setReduce] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined") return;
    const mql = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduce(mql.matches);
    const onChange = () => setReduce(mql.matches);
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, []);
  return reduce;
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
  useEffect(() => {
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
