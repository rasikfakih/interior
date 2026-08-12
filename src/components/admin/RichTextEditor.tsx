"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import Image from "@tiptap/extension-image";
import Placeholder from "@tiptap/extension-placeholder";
import { useEffect, useRef, useState } from "react";
import {
  IconImage,
  IconLink,
  IconListBullets,
  IconListNumbers,
  IconParagraph,
  IconQuote,
  IconTextBold,
  IconTextH2,
  IconTextH3,
  IconTextItalic,
} from "../icons";

type Toolbar = "bold" | "italic" | "h2" | "h3" | "bullet" | "ordered" | "quote" | "link" | "image";

export type RichTextEditorProps = {
  value: string | null | undefined;
  onChange: (json: string) => void;
  placeholder?: string;
};

const EMPTY_DOC = {
  type: "doc",
  content: [{ type: "paragraph" }],
};

function safeParse(json: string | null | undefined) {
  if (!json) return EMPTY_DOC;
  try {
    return JSON.parse(json);
  } catch {
    return EMPTY_DOC;
  }
}

export default function RichTextEditor({
  value,
  onChange,
  placeholder,
}: RichTextEditorProps) {
  const lastJsonRef = useRef<string | null>(value || null);
  const [linkUrl, setLinkUrl] = useState("");
  const [showLink, setShowLink] = useState(false);
  const [imageUrl, setImageUrl] = useState("");
  const [showImage, setShowImage] = useState(false);

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3] },
        codeBlock: false,
      }),
      Link.configure({
        openOnClick: false,
        autolink: true,
        HTMLAttributes: { class: "ei-rte-link" },
      }),
      Image.configure({
        inline: false,
        allowBase64: false,
        HTMLAttributes: { class: "ei-rte-image" },
      }),
      Placeholder.configure({
        placeholder: placeholder || "Write here…",
      }),
    ],
    content: safeParse(value),
    onUpdate({ editor }) {
      const json = JSON.stringify(editor.getJSON());
      lastJsonRef.current = json;
      onChange(json);
    },
    editorProps: {
      attributes: {
        class: "ei-rte prose-ui text-ink",
        spellcheck: "true",
      },
    },
  });

  useEffect(() => {
    if (!editor) return;
    if (value && value !== lastJsonRef.current) {
      try {
        const incoming = JSON.parse(value);
        editor.commands.setContent(incoming, false);
        lastJsonRef.current = value;
      } catch {}
    }
  }, [value, editor]);

  if (!editor) {
    return (
      <div className="surface-tile p-6 text-sm text-ink-mute">
        Loading editor…
      </div>
    );
  }

  const btn =
    "px-2 py-1.5 text-ink-mute hover:text-ink transition-colors flex items-center justify-center";
  const btnActive = "bg-canvas text-ink";
  const TOOLBAR: {
    key: Toolbar | "paragraph";
    label: string;
    Icon: (p: React.ComponentProps<typeof IconTextBold>) => React.ReactNode;
  }[] = [
    { key: "bold", label: "Bold", Icon: IconTextBold },
    { key: "italic", label: "Italic", Icon: IconTextItalic },
    { key: "h2", label: "Heading 2", Icon: IconTextH2 },
    { key: "h3", label: "Heading 3", Icon: IconTextH3 },
    { key: "bullet", label: "Bullet list", Icon: IconListBullets },
    { key: "ordered", label: "Numbered list", Icon: IconListNumbers },
    { key: "quote", label: "Quote", Icon: IconQuote },
    { key: "link", label: "Link", Icon: IconLink },
    { key: "image", label: "Image", Icon: IconImage },
    { key: "paragraph", label: "Paragraph", Icon: IconParagraph },
  ];

  const isActive = (name: Toolbar) =>
    name === "bold"
      ? editor.isActive("bold")
      : name === "italic"
      ? editor.isActive("italic")
      : name === "h2"
      ? editor.isActive("heading", { level: 2 })
      : name === "h3"
      ? editor.isActive("heading", { level: 3 })
      : name === "bullet"
      ? editor.isActive("bulletList")
      : name === "ordered"
      ? editor.isActive("orderedList")
      : name === "quote"
      ? editor.isActive("blockquote")
      : name === "link"
      ? editor.isActive("link")
      : name === "image"
      ? false
      : false;

  function run(name: Toolbar) {
    if (!editor) return;
    const chain = editor.chain().focus();
    switch (name) {
      case "bold":
        chain.toggleBold().run();
        break;
      case "italic":
        chain.toggleItalic().run();
        break;
      case "h2":
        chain.toggleHeading({ level: 2 }).run();
        break;
      case "h3":
        chain.toggleHeading({ level: 3 }).run();
        break;
      case "bullet":
        chain.toggleBulletList().run();
        break;
      case "ordered":
        chain.toggleOrderedList().run();
        break;
      case "quote":
        chain.toggleBlockquote().run();
        break;
      case "link":
        if (editor.isActive("link")) {
          chain.unsetLink().run();
          setShowLink(false);
          break;
        }
        setShowLink(true);
        break;
      case "image":
        if (!imageUrl) return;
        chain.setImage({ src: imageUrl }).run();
        setImageUrl("");
        setShowImage(false);
        break;
    }
  }

  function applyLink() {
    if (!editor) return;
    if (!linkUrl) {
      editor.chain().focus().unsetLink().run();
      setShowLink(false);
      return;
    }
    editor
      .chain()
      .focus()
      .extendMarkRange("link")
      .setLink({ href: linkUrl, target: "_blank", rel: "noopener noreferrer" })
      .run();
    setShowLink(false);
    setLinkUrl("");
  }

  return (
    <div className="surface-tile overflow-hidden">
      <div className="flex flex-wrap items-center gap-1 p-2 border-b hairline" role="toolbar" aria-label="Formatting">
        {TOOLBAR.map(({ key, label, Icon }) => {
          if (key === "paragraph") {
            return (
              <button
                key={key}
                type="button"
                title={label}
                aria-label={label}
                className={btn}
                onClick={() => editor.chain().focus().setParagraph().run()}
              >
                <Icon aria-hidden size={18} />
              </button>
            );
          }
          return (
            <button
              key={key}
              type="button"
              title={label}
              aria-label={label}
              aria-pressed={isActive(key as Toolbar)}
              className={`${btn} ${isActive(key as Toolbar) ? btnActive : ""}`}
              onClick={() => run(key as Toolbar)}
            >
              <Icon aria-hidden size={18} />
            </button>
          );
        })}
      </div>

      {showLink && (
        <div className="flex items-center gap-2 p-3 border-b hairline">
          <input
            className="input-line flex-1"
            placeholder="https://"
            value={linkUrl}
            onChange={(e) => setLinkUrl(e.target.value)}
          />
          <button type="button" className="btn-primary" onClick={applyLink}>
            Add link
          </button>
          <button
            type="button"
            className="btn-ghost"
            onClick={() => setShowLink(false)}
          >
            Cancel
          </button>
        </div>
      )}

      {showImage && (
        <div className="flex items-center gap-2 p-3 border-b hairline">
          <input
            className="input-line flex-1"
            placeholder="/uploads/images/…"
            value={imageUrl}
            onChange={(e) => setImageUrl(e.target.value)}
          />
          <button
            type="button"
            className="btn-primary"
            onClick={() => run("image")}
          >
            Add image
          </button>
          <button
            type="button"
            className="btn-ghost"
            onClick={() => setShowImage(false)}
          >
            Cancel
          </button>
        </div>
      )}

      <EditorContent editor={editor} className="p-4" />
    </div>
  );
}
