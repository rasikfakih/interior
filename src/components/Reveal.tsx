"use client";

import { createElement, useEffect, useRef, useState } from "react";
import { useReducedMotion } from "@/lib/use-gsap";

type Props = {
  children: React.ReactNode;
  delay?: number;
  className?: string;
  as?: keyof React.JSX.IntrinsicElements;
};

export function Reveal({
  children,
  delay = 0,
  className = "",
  as = "div",
}: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [shown, setShown] = useState(false);

  const reduce = useReducedMotion();

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (reduce) {
      // Reduced-motion users see content immediately; defer the state
      // write so it never runs synchronously in the effect body.
      const t = setTimeout(() => setShown(true), 0);
      return () => clearTimeout(t);
    }
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setShown(true);
          io.disconnect();
        }
      },
      { threshold: 0.18 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [reduce]);

  const Tag = as;
  return createElement(
    Tag,
    // eslint-disable-next-line react-hooks/refs -- `as` is constrained to keyof JSX.IntrinsicElements (host element), so the rule's "ref may be read during render" concern cannot apply; it cannot see through the dynamic tag
    {
      ref,
      style: { transitionDelay: `${delay}ms` },
      className: "ei-reveal " + (shown ? "ei-reveal--in " : "") + (className || ""),
    },
    children
  );
}

export default Reveal;
