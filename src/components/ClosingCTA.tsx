"use client";

import { useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@/lib/use-gsap";

gsap.registerPlugin(ScrollTrigger);

export default function ClosingCTA({ data }: { data?: any } = {}) {
  const ref = useRef<HTMLElement | null>(null);
  const btnRef = useRef<HTMLAnchorElement | null>(null);

  const text = data?.text || "A home you'll live in for twenty years. Let's start with a kitchen table conversation.";
  const em = data?.em || "twenty years";
  const buttonLabel = data?.buttonLabel || "Start a project";
  const buttonHref = data?.buttonHref || "/contact";

  useGSAP(
    () => {
      const headline = ref.current?.querySelector(".ei-cta-head");
      if (headline) {
        const words = headline.querySelectorAll(".ei-cta-word");
        gsap.set(words, { y: 80, opacity: 0 });
        gsap.to(words, {
          y: 0,
          opacity: 1,
          duration: 1,
          stagger: 0.04,
          ease: "expo.out",
          scrollTrigger: { trigger: headline, start: "top 80%", once: true },
        });
      }
      const btn = btnRef.current;
      if (btn) {
        const onMove = (e: MouseEvent) => {
          const rect = btn.getBoundingClientRect();
          const cx = rect.left + rect.width / 2;
          const cy = rect.top + rect.height / 2;
          const dx = (e.clientX - cx) * 0.18;
          const dy = (e.clientY - cy) * 0.18;
          gsap.to(btn, {
            x: dx,
            y: dy,
            duration: 0.45,
            ease: "power3.out",
            overwrite: "auto",
          });
        };
        const onLeave = () =>
          gsap.to(btn, {
            x: 0,
            y: 0,
            duration: 0.6,
            ease: "elastic.out(1, 0.4)",
            overwrite: "auto",
          });
        btn.addEventListener("mousemove", onMove);
        btn.addEventListener("mouseleave", onLeave);
        ScrollTrigger.create({
          trigger: btn,
          start: "top 95%",
          once: true,
          onEnter: () =>
            gsap.fromTo(
              btn,
              { scale: 0.94, opacity: 0 },
              { scale: 1, opacity: 1, duration: 0.7, ease: "expo.out" }
            ),
        });
        return () => {
          btn.removeEventListener("mousemove", onMove);
          btn.removeEventListener("mouseleave", onLeave);
        };
      }
    },
    ref,
    []
  );

  return (
    <section ref={ref as any} className="py-24 md:py-40" aria-label="Start a project">
      <div className="container-page">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
          <div className="md:col-span-9">
            <h2 className="ei-cta-head text-[clamp(2.4rem,7vw,6rem)] tracking-[-0.03em] leading-[0.95]">
              {(() => {
                const [before, ...afterParts] = text.split(em);
                const after = afterParts.join(em);
                const renderWords = (str: string, keyBase: string) =>
                  str.split(/(\s+)/).map((part, i) =>
                    /\s+/.test(part) ? (
                      <span key={`${keyBase}-${i}-ws`}>{part}</span>
                    ) : (
                      <span
                        key={`${keyBase}-${i}`}
                        className="ei-cta-word inline-block overflow-hidden align-bottom"
                      >
                        {part}
                      </span>
                    )
                  );
                return (
                  <>
                    {renderWords(before, "b")}
                    <em className="text-ink not-italic font-medium">
                      <span className="ei-cta-word inline-block overflow-hidden align-bottom">
                        {em}
                      </span>
                    </em>
                    {renderWords(after, "a")}
                  </>
                );
              })()}
            </h2>
          </div>
          <div className="md:col-span-3 md:pt-3 flex md:justify-end">
            <a
              ref={btnRef as any}
              href={buttonHref}
              className="btn-primary w-fit"
            >
              {buttonLabel} <span aria-hidden>→</span>
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
