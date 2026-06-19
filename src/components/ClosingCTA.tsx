import Reveal from "./Reveal";

export default function ClosingCTA() {
  return (
    <section className="py-24 md:py-40" aria-label="Start a project">
      <div className="container-page">
        <Reveal className="grid grid-cols-1 md:grid-cols-12 gap-8">
          <div className="md:col-span-9">
            <h2 className="text-[clamp(2.4rem,7vw,6rem)] tracking-[-0.03em] leading-[0.95]">
              A home you'll live in for{" "}
              <em className="text-warm not-italic font-medium">
                twenty years
              </em>
              . Let's start with a kitchen table conversation.
            </h2>
          </div>
          <div className="md:col-span-3 md:pt-3 flex md:justify-end">
            <a href="/contact" className="btn-primary w-fit">
              Start a project <span aria-hidden>↗</span>
            </a>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
