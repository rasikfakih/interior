"use client";

import { useState } from "react";
import { BLOCK_REGISTRY, BLOCK_TYPES, type BlockType } from "@/cms/blocks/registry";

export default function BlockPicker({
  onPick,
}: {
  onPick: (type: BlockType) => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="btn-primary"
      >
        Add block
      </button>
      {open && (
        <div
          role="dialog"
          className="fixed inset-0 z-[90] flex items-center justify-center p-4 bg-black/55"
          onClick={() => setOpen(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-canvas border hairline rounded-[var(--radius-card)] w-full max-w-3xl max-h-[80vh] overflow-hidden flex flex-col"
          >
            <header className="flex items-center justify-between p-4 border-b hairline">
              <p className="chrome-pill">Insert block</p>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="text-xs font-mono uppercase tracking-[0.18em]"
              >
                Close
              </button>
            </header>
            <div className="overflow-y-auto p-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
              {BLOCK_TYPES.map((t) => {
                const def = BLOCK_REGISTRY[t];
                return (
                  <button
                    key={t}
                    type="button"
                    onClick={() => {
                      onPick(t);
                      setOpen(false);
                    }}
                    className="surface-tile p-4 text-left hover:bg-[var(--surface)] transition-colors"
                  >
                    <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-warm">
                      {def.type}
                    </p>
                    <p className="text-base mt-1">{def.label}</p>
                    <p className="text-xs text-ink-mute mt-1">{def.description}</p>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
