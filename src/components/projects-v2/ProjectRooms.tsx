import Model3DViewer from "@/components/Model3DViewer";
import type { ProjectRoom } from "@/lib/rooms";

type Props = {
  rooms: ProjectRoom[];
  fallbackModel: string | null;
  fallbackPoster?: string | null;
};

/**
 * Room-by-room walkthrough story. Each room is a full-width 3D
 * stage with an editorial header column - deliberately NOT a zigzag
 * so a 3-5 room tour never reads as a repetitive pattern. A room
 * without its own GLB falls back to the project-level model so the
 * tour is always demonstrable end to end.
 */
export default function ProjectRooms({
  rooms,
  fallbackModel,
  fallbackPoster,
}: Props) {
  if (!rooms.length) return null;

  return (
    <section
      aria-label="Rooms walkthrough"
      className="py-16 md:py-24 bg-canvas border-t hairline"
    >
      <div className="container-page">
        <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-ink-mute mb-4">
          Walk through · {rooms.length} room{rooms.length === 1 ? "" : "s"}
        </p>
        <h2 className="text-4xl md:text-[3.5rem] tracking-tighter mb-4">
          Room by room.
        </h2>
        <p className="text-ink-mute max-w-[52ch] mb-10">
          Each space below renders from its own model. Rotate, zoom, and step
          between rooms in the order they were built.
        </p>

        {rooms.map((room, i) => {
          const model = room.model_3d || fallbackModel;
          if (!model) return null;
          return (
            <article
              key={room.id}
              className="grid grid-cols-1 md:grid-cols-12 gap-6 md:gap-10 py-10 md:py-14 border-t hairline"
            >
              <div className="md:col-span-4 md:pt-2">
                <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-ink-mute">
                  0{i + 1} / {String(rooms.length).padStart(2, "0")}
                </p>
                <h3 className="text-3xl md:text-4xl tracking-tighter mt-3">
                  {room.name}
                </h3>
                {room.description && (
                  <p className="text-ink-mute text-sm md:text-base leading-relaxed mt-4 max-w-[42ch]">
                    {room.description}
                  </p>
                )}
              </div>
              <div className="md:col-span-8">
                <Model3DViewer
                  modelUrl={model}
                  posterUrl={fallbackPoster || undefined}
                />
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
