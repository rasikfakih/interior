"use client";

import Image from "next/image";
import RichTextEditor from "@/components/admin/RichTextEditor";
import MediaPicker, { type PickedItem } from "@/components/admin/MediaPicker";
import {
  getSchema,
  type ArraySchema,
  type BlockSchema,
  type FieldSchema,
} from "@/components/admin/block-schemas";

type Json = Record<string, unknown>;

type Props = {
  type: BlockSchema["type"];
  value: Json;
  onChange: (next: Json) => void;
};

function get(obj: Json, path: string): unknown {
  return path.split(".").reduce<unknown>((acc, k) => {
    if (acc == null) return acc;
    if (typeof acc !== "object") return undefined;
    return (acc as Record<string, unknown>)[k];
  }, obj);
}

function setAt(obj: Json, path: string, value: unknown): Json {
  const keys = path.split(".");
  const root = { ...obj };
  let cursor: Json = root;
  for (let i = 0; i < keys.length - 1; i++) {
    const k = keys[i];
    const existing = cursor[k];
    cursor[k] =
      existing && typeof existing === "object"
        ? { ...(existing as Json) }
        : {};
    cursor = cursor[k] as Json;
  }
  cursor[keys[keys.length - 1]] = value;
  return root;
}

function clamp(s: string, max?: number) {
  if (max == null) return s;
  return s.length > max ? s.slice(0, max) : s;
}

function Field({
  schema,
  value,
  onChange,
}: {
  schema: FieldSchema;
  value: unknown;
  onChange: (next: unknown) => void;
}) {
  const v = value ?? "";
  function update(n: unknown) {
    onChange(n);
  }
  const labelEl = (
    <span className="block font-mono text-[10px] uppercase tracking-[0.22em] text-ink-mute mb-2">
      {schema.label}
      {schema.max != null && (
        <span className="ml-2 normal-case tracking-normal text-ink-soft">
          max {schema.max}
        </span>
      )}
    </span>
  );

  if (schema.kind === "text") {
    return (
      <label className="block">
        {labelEl}
        <input
          className="input-line"
          value={v as string}
          placeholder={schema.placeholder}
          maxLength={schema.max}
          onChange={(e) => update(e.target.value)}
        />
      </label>
    );
  }

  if (schema.kind === "longtext") {
    return (
      <label className="block">
        {labelEl}
        <textarea
          className="input-line w-full resize-y min-h-[120px] py-3"
          value={v as string}
          placeholder={schema.placeholder}
          maxLength={schema.max}
          onChange={(e) => update(e.target.value)}
        />
      </label>
    );
  }

  if (schema.kind === "number") {
    return (
      <label className="block">
        {labelEl}
        <input
          className="input-line"
          type="number"
          value={(v as number) ?? 0}
          max={schema.max}
          onChange={(e) => update(Number(e.target.value))}
        />
      </label>
    );
  }

  if (schema.kind === "select") {
    return (
      <label className="block">
        {labelEl}
        <select
          className="input-line bg-transparent"
          value={v as string}
          onChange={(e) => update(e.target.value)}
        >
          {(schema.options ?? []).map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>
      </label>
    );
  }

  if (schema.kind === "toggle") {
    return (
      <label className="flex items-center gap-3">
        <input
          type="checkbox"
          checked={Boolean(v)}
          onChange={(e) => update(e.target.checked)}
          className="h-4 w-4 accent-current"
        />
        {labelEl}
      </label>
    );
  }

  if (schema.kind === "richtext") {
    return (
      <div>
        {labelEl}
        <RichTextEditor
          value={v as string}
          onChange={(json) => update(json)}
          placeholder={schema.placeholder || "Write here..."}
        />
      </div>
    );
  }

  if (schema.kind === "media") {
    return (
      <div>
        {labelEl}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
          <div className="md:col-span-9">
            <input
              className="input-line"
              value={v as string}
              placeholder="/uploads/images/..."
              onChange={(e) => update(e.target.value)}
            />
          </div>
          <div className="md:col-span-3 flex justify-end">
            <MediaPicker
              label="Pick"
              accept="image"
              onPick={(_item, signedUrl) => {
                update(signedUrl ?? "");
              }}
            />
          </div>
        </div>
        {typeof v === "string" && /^https?:\/\//.test(v) && (
          <div className="mt-3 surface-tile overflow-hidden relative h-44">
            <Image
              src={v as string}
              alt=""
              fill
              unoptimized
              className="object-cover"
            />
          </div>
        )}
      </div>
    );
  }

  if (schema.kind === "mediaGallery") {
    const gallery: string[] = Array.isArray(v) ? v : [];
    return (
      <div>
        {labelEl}
        <ul className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-3">
          {gallery.map((url, i) => (
            <li
              key={i}
              className="aspect-[16/10] relative surface-tile overflow-hidden"
            >
              {/^https?:\/\//.test(url) ? (
                <Image
                  src={url}
                  alt=""
                  fill
                  unoptimized
                  className="object-cover"
                />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center font-mono text-[10px] uppercase tracking-[0.22em] text-ink-mute">
                  {url || "(empty)"}
                </div>
              )}
              <button
                type="button"
                onClick={() => {
                  const next = gallery.slice();
                  next.splice(i, 1);
                  update(next);
                }}
                className="absolute top-1 right-1 text-[10px] font-mono uppercase tracking-[0.18em] bg-black/60 text-white px-1.5 py-0.5"
                aria-label="Remove"
              >
                Remove
              </button>
            </li>
          ))}
          {gallery.length === 0 && (
            <li className="text-sm text-ink-mute col-span-full">
              No assets picked yet.
            </li>
          )}
        </ul>
        <MediaPicker
          label="Pick images"
          accept="image"
          multi
          onPick={(picks: PickedItem[]) => {
            const incoming = (Array.isArray(picks)
              ? picks.map((p: PickedItem) => p?.signedUrl ?? p?.item?.url ?? "")
              : []
            ).filter(Boolean);
            const merged = Array.from(
              new Set([...(gallery || []), ...incoming])
            );
            update(merged);
          }}
        />
      </div>
    );
  }

  return null;
}

function ArrayEditor({
  name,
  schema,
  value,
  onChange,
}: {
  name: string;
  schema: ArraySchema;
  value: unknown[];
  onChange: (next: unknown[]) => void;
}) {
  const items: unknown[] = Array.isArray(value) ? value : [];

  function updateItem(idx: number, newItem: unknown) {
    const next = items.slice();
    next[idx] = newItem;
    onChange(next);
  }

  function addItem() {
    onChange([...items, schema.defaults()]);
  }

  function removeItem(idx: number) {
    onChange(items.filter((_, i) => i !== idx));
  }

  function moveItem(idx: number, dir: -1 | 1) {
    const target = idx + dir;
    if (target < 0 || target >= items.length) return;
    const next = items.slice();
    const [it] = next.splice(idx, 1);
    next.splice(target, 0, it);
    onChange(next);
  }

  return (
    <fieldset className="space-y-3">
      <legend className="font-mono text-[10px] uppercase tracking-[0.22em] text-ink-mute mb-2">
        {schema.label} - {items.length}
      </legend>
      {items.length === 0 && (
        <p className="text-sm text-ink-mute">No entries.</p>
      )}
      {items.map((item, idx) => {
        const isStringEntry = typeof item === "string";
        return (
          <article
            key={`${name}-${idx}`}
            className="surface-tile p-4 space-y-3"
          >
            <header className="flex items-center justify-between gap-3">
              <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink-mute">
                {schema.itemLabel
                  ? schema.itemLabel(item, idx)
                  : `Entry ${idx + 1}`}
              </p>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => moveItem(idx, -1)}
                  className="text-xs font-mono uppercase tracking-[0.18em] border-b hairline-strong pb-1"
                  disabled={idx === 0}
                  aria-label="Move up"
                >
                  Up
                </button>
                <button
                  type="button"
                  onClick={() => moveItem(idx, 1)}
                  className="text-xs font-mono uppercase tracking-[0.18em] border-b hairline-strong pb-1"
                  disabled={idx === items.length - 1}
                  aria-label="Move down"
                >
                  Down
                </button>
                <button
                  type="button"
                  onClick={() => removeItem(idx)}
                  className="text-xs font-mono uppercase tracking-[0.18em] text-ink border-b border-[var(--accent-soft)] pb-1"
                  aria-label="Remove"
                >
                  Remove
                </button>
              </div>
            </header>
            <div className="space-y-3">
              {schema.fields.map((f) => {
                const currentValue = isStringEntry ? item : get(item as Json, f.path);
                return (
                  <Field
                    key={f.path}
                    schema={f}
                    value={currentValue ?? ""}
                    onChange={(v) => {
                      if (isStringEntry) {
                        updateItem(idx, clamp(String(v), f.max));
                      } else {
                        const next = setAt(item as Json, f.path, v);
                        const clamped =
                          f.max != null && typeof v === "string"
                            ? clamp(v, f.max)
                            : next;
                        updateItem(idx, clamped);
                      }
                    }}
                  />
                );
              })}
            </div>
          </article>
        );
      })}
      <button
        type="button"
        onClick={addItem}
        className="btn-ghost text-xs h-9 px-3"
      >
        Add entry
      </button>
    </fieldset>
  );
}

export default function BlockEditor({ type, value, onChange }: Props) {
  const schema = getSchema(type);
  const safeValue = value ?? schema.defaults();
  function scalarChange(path: string, v: unknown) {
    onChange(setAt(safeValue, path, v));
  }
  function arrayChange(key: string, next: unknown[]) {
    onChange({ ...safeValue, [key]: next });
  }

  return (
    <div className="space-y-5">
      {schema.scalars.length === 0 &&
        Object.keys(schema.arrays).length === 0 && (
          <p className="text-sm text-ink-mute">
            This block has no editable fields.
          </p>
        )}
      {schema.scalars.map((f) => (
        <Field
          key={f.path}
          schema={f}
          value={get(safeValue, f.path)}
          onChange={(v) => scalarChange(f.path, v)}
        />
      ))}
      {Object.entries(schema.arrays).map(([key, arrSchema]) => (
        <ArrayEditor
          key={key}
          name={key}
          schema={arrSchema}
          value={safeValue[key] as unknown[]}
          onChange={(next) => arrayChange(key, next)}
        />
      ))}
    </div>
  );
}
