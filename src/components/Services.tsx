import Reveal from "./Reveal";

const capabilities = [
  {
    title: "Spatial design",
    body: "Plans, sections, and elevations drawn in-house. Locked before any material is chosen.",
    photo:
      "https://images.unsplash.com/photo-1503387762-592deb58ef4e?q=80&w=1600&auto=format&fit=crop",
    span: "md:col-span-7",
    aspect: "aspect-[16/10]",
  },
  {
    title: "Material specification",
    body: "Stone, wood, textile, finish — sourced and specified against your brief.",
    photo:
      "https://images.unsplash.com/photo-1505691938895-1758d7feb511?q=80&w=1600&auto=format&fit=crop",
    span: "md:col-span-5",
    aspect: "aspect-[16/12]",
  },
  {
    title: "On-site direction",
    body: "Weekly site visits. Written reports. Contractors work to drawings.",
    photo:
      "https://images.unsplash.com/photo-1581094288338-2314dddb7ece?q=80&w=1600&auto=format&fit=crop",
    span: "md:col-span-5",
    aspect: "aspect-[16/11]",
  },
  {
    title: "Furniture & styling",
    body: "Custom joinery and made-to-order soft furnishing. Everything accounted for.",
    photo:
      "https://images.unsplash.com/photo-1493663284031-b7e3aefcae8e?q=80&w=1600&auto=format&fit=crop",
    span: "md:col-span-7",
    aspect: "aspect-[16/9]",
  },
];

export default function Services() {
  return (
    <section
      className="bg-elev py-24 md:py-36"
      aria-label="What we do"
    >
      <div className="container-page">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 md:gap-12 mb-12 md:mb-16">
          <div className="md:col-span-7">
            <h2 className="text-4xl md:text-[3.5rem] tracking-tighter">
              A studio that draws, specifies, and{" "}
              <em className="text-warm not-italic font-medium">builds</em>.
            </h2>
          </div>
          <div className="md:col-span-5 md:pt-3">
            <p className="text-ink-mute text-base md:text-lg leading-relaxed">
              Four capabilities. An interior studio that doesn't farm out
              drawings or hand off a material board at week six and disappear.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 md:gap-5">
          {capabilities.map((c, i) => (
            <Reveal
              key={c.title}
              delay={i * 60}
              className={`${c.span} group relative overflow-hidden rounded-[var(--radius-card)]`}
            >
              <div className={`relative ${c.aspect} w-full overflow-hidden`}>
                <img
                  src={c.photo}
                  alt={c.title}
                  loading="lazy"
                  className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-[1.03]"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/15 to-transparent" />
              </div>
              <div className="absolute inset-0 flex flex-col justify-end p-6 md:p-8">
                <p className="font-mono text-[10px] tracking-[0.22em] uppercase text-white/70">
                  0{i + 1}
                </p>
                <h3 className="text-white text-2xl md:text-3xl mt-3 tracking-tight">
                  {c.title}
                </h3>
                <p className="text-white/80 text-sm md:text-base mt-2 max-w-[40ch]">
                  {c.body}
                </p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
