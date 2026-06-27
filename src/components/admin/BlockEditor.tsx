"use client";

import { useState } from "react";
import RichTextEditor from "@/components/admin/RichTextEditor";
import MediaPicker from "@/components/admin/MediaPicker";
import {
  getSchema,
  type ArraySchema,
  type BlockSchema,
  type FieldSchema,
} from "@/components/admin/block-schemas";

type Props = {
  type: BlockSchema["type"];
  value: any;
  onChange: (next: any) => void;
};

function get(obj: any, path: string) {
  return path.split(".").reduce((acc, k) => (acc == null ? acc : acc[k]), obj);
}

function setAt(obj: any, path: string, value: any): any {
  const keys = path.split(".");
  const root = { ...obj };
  let cursor: any = root;
  for (let i = 0; i < keys.length - 1; i++) {
    const k = keys[i];
    cursor[k] =
      cursor[k] && typeof cursor[k] === "object"
        ? { ...cursor[k] }
        : {};
    cursor = cursor[k];
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
  value: any;
  onChange: (next: any) => void;
}) {
  const v = value ?? "";
  function update(n: any) {
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
          value={v}
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
          value={v}
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
          value={v ?? 0}
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
          value={v ?? ""}
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
          value={v}
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
              value={v}
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
        {v && /^https?:\/\//.test(v) && (
          <div className="mt-3 surface-tile overflow-hidden">
            <img
              src={v}
              alt=""
              className="w-full h-44 object-cover"
              loading="lazy"
            />
          </div>
        )}
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
  value: any[];
  onChange: (next: any[]) => void;
}) {
  const items: any[] = Array.isArray(value) ? value : [];

  function updateItem(idx: number, newItem: any) {
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
                  className="text-xs font-mono uppercase tracking-[0.18em] text-warm border-b border-[var(--accent-warm-soft)] pb-1"
                  aria-label="Remove"
                >
                  Remove
                </button>
              </div>
            </header>
            <div className="space-y-3">
              {schema.fields.map((f) => {
                const currentValue = isStringEntry ? item : get(item, f.path);
                return (
                  <Field
                    key={f.path}
                    schema={f}
                    value={currentValue ?? ""}
                    onChange={(v) => {
                      if (isStringEntry) {
                        updateItem(idx, clamp(String(v), f.max));
                      } else {
                        const next = setAt(item, f.path, v);
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
  function scalarChange(path: string, v: any) {
    onChange(setAt(safeValue, path, v));
  }
  function arrayChange(key: string, next: any[]) {
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
          value={safeValue[key]}
          onChange={(next) => arrayChange(key, next)}
        />
      ))}
    </div>
  );
}
