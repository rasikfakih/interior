import { Fragment } from "react";

type Mark = { type: string; attrs?: Record<string, any> };
type TextNode = { type: "text"; text: string; marks?: Mark[] };
type Node = {
  type: string;
  attrs?: Record<string, any>;
  marks?: Mark[];
  text?: string;
  content?: Node[];
};

function renderMark(node: TextNode, key: string) {
  let el: React.ReactNode = node.text;
  if (!node.marks) return <Fragment key={key}>{el}</Fragment>;
  for (const m of node.marks) {
    if (m.type === "bold") el = <strong key={`${key}-b`}>{el}</strong>;
    if (m.type === "italic") el = <em key={`${key}-i`}>{el}</em>;
    if (m.type === "code") el = <code key={`${key}-c`}>{el}</code>;
    if (m.type === "link") {
      el = (
        <a
          key={`${key}-a`}
          href={m.attrs?.href}
          target={m.attrs?.target || "_self"}
          rel={
            m.attrs?.target === "_blank"
              ? "noopener noreferrer"
              : undefined
          }
          className="underline decoration-1 hairline-strong underline-offset-4 hover:text-ink"
        >
          {el}
        </a>
      );
    }
  }
  return <Fragment key={key}>{el}</Fragment>;
}

function renderInline(nodes: Node[], keyPrefix: string): React.ReactNode[] {
  return nodes.map((n, i) => {
    if (n.type === "text") return renderMark(n as TextNode, `${keyPrefix}-${i}`);
    if (n.type === "hardBreak")
      return <br key={`${keyPrefix}-br-${i}`} />;
    if (n.type === "image") {
      return (
        <span
          key={`${keyPrefix}-img-${i}`}
          className="block my-4"
        >
          <img
            src={n.attrs?.src}
            alt={n.attrs?.alt || ""}
            className="w-full h-auto rounded-[var(--radius-card)]"
            loading="lazy"
          />
        </span>
      );
    }
    return (
      <Fragment key={`${keyPrefix}-${i}`}>
        {n.content ? renderInline(n.content, `${keyPrefix}-${i}`) : null}
      </Fragment>
    );
  });
}

function renderBlock(node: Node, key: string): React.ReactNode {
  switch (node.type) {
    case "paragraph":
      return (
        <p key={key} className="mb-4 last:mb-0 leading-relaxed">
          {node.content ? renderInline(node.content, key) : null}
        </p>
      );
    case "heading": {
      const level = (node.attrs?.level || 2) as 2 | 3;
      const cls =
        level === 2
          ? "text-2xl md:text-3xl tracking-tight mt-8 mb-3"
          : "text-xl md:text-2xl tracking-tight mt-6 mb-2";
      const Tag: any = `h${level}`;
      return (
        <Tag key={key} className={cls}>
          {node.content ? renderInline(node.content, key) : null}
        </Tag>
      );
    }
    case "bulletList":
      return (
        <ul key={key} className="list-disc pl-6 mb-4 space-y-1">
          {node.content?.map((li, i) => (
            <li key={`${key}-li-${i}`}>
              {li.content ? renderInline(li.content, `${key}-${i}`) : null}
            </li>
          ))}
        </ul>
      );
    case "orderedList":
      return (
        <ol key={key} className="list-decimal pl-6 mb-4 space-y-1">
          {node.content?.map((li, i) => (
            <li key={`${key}-li-${i}`}>
              {li.content ? renderInline(li.content, `${key}-${i}`) : null}
            </li>
          ))}
        </ol>
      );
    case "blockquote":
      return (
        <blockquote
          key={key}
          className="border-l-2 hairline-strong pl-4 italic text-ink-mute my-4"
        >
          {node.content ? renderBlock(node.content[0], `${key}-b`) : null}
        </blockquote>
      );
    case "codeBlock":
      return (
        <pre
          key={key}
          className="bg-elev border hairline rounded-[var(--radius-control)] p-3 my-4 overflow-x-auto text-sm font-mono"
        >
          <code>{node.content ? node.content.map((c) => c.text || "").join("") : ""}</code>
        </pre>
      );
    case "horizontalRule":
      return <hr key={key} className="my-6 hairline" />;
    default:
      if (node.content && node.content.length > 0) {
        return (
          <div key={key} className="my-4">
            {node.content.map((c, i) => renderBlock(c, `${key}-${i}`))}
          </div>
        );
      }
      return null;
  }
}

export type RichTextRendererProps = {
  json: string | Record<string, any> | null | undefined;
  fallbackText?: string | null;
};

export default function RichTextRenderer({
  json,
  fallbackText,
}: RichTextRendererProps) {
  if (json == null) {
    if (fallbackText)
      return <p className="leading-relaxed">{fallbackText}</p>;
    return null;
  }
  let doc: Node | null = null;
  if (typeof json === "object") {
    doc = json as Node;
  } else {
    try {
      doc = JSON.parse(json) as Node;
    } catch {
      return <p className="leading-relaxed">{fallbackText || ""}</p>;
    }
  }
  if (!doc || !doc.content) {
    return <p className="leading-relaxed">{fallbackText || ""}</p>;
  }
  return (
    <div className="prose-ui">
      {doc.content.map((n, i) => renderBlock(n, `b-${i}`))}
    </div>
  );
}
