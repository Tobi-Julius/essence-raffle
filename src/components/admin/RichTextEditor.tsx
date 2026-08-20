"use client";

import { useEditor, EditorContent, type JSONContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import Underline from "@tiptap/extension-underline";
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Heading2,
  List,
  ListOrdered,
  Quote,
  Link as LinkIcon,
} from "lucide-react";
import { useEffect } from "react";
import { cn } from "@/lib/utils/cn";

interface RichTextEditorProps {
  content: JSONContent | undefined;
  onChange: (json: JSONContent, html: string) => void;
  editable?: boolean;
}

/**
 * Admin terms editor. Content is stored as Tiptap JSON (structured, not raw
 * HTML) and rendered to sanitized HTML on save — see SanitizedHtml for the
 * read path. No arbitrary HTML entry is possible through this editor.
 */
export function RichTextEditor({ content, onChange, editable = true }: RichTextEditorProps) {
  const editor = useEditor({
    immediatelyRender: false,
    editable,
    extensions: [
      StarterKit.configure({ heading: { levels: [2, 3] } }),
      Underline,
      Link.configure({ openOnClick: false, HTMLAttributes: { rel: "noopener noreferrer", target: "_blank" } }),
    ],
    content,
    onUpdate: ({ editor: e }) => onChange(e.getJSON(), e.getHTML()),
    editorProps: {
      attributes: {
        class: "prose-content min-h-[220px] max-w-none px-4 py-3 text-sm focus:outline-none",
      },
    },
  });

  useEffect(() => {
    return () => editor?.destroy();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!editor) return null;

  const buttons = [
    { icon: Bold, action: () => editor.chain().focus().toggleBold().run(), active: editor.isActive("bold"), label: "Bold" },
    { icon: Italic, action: () => editor.chain().focus().toggleItalic().run(), active: editor.isActive("italic"), label: "Italic" },
    { icon: UnderlineIcon, action: () => editor.chain().focus().toggleUnderline().run(), active: editor.isActive("underline"), label: "Underline" },
    { icon: Heading2, action: () => editor.chain().focus().toggleHeading({ level: 2 }).run(), active: editor.isActive("heading", { level: 2 }), label: "Heading" },
    { icon: List, action: () => editor.chain().focus().toggleBulletList().run(), active: editor.isActive("bulletList"), label: "Bullet list" },
    { icon: ListOrdered, action: () => editor.chain().focus().toggleOrderedList().run(), active: editor.isActive("orderedList"), label: "Numbered list" },
    { icon: Quote, action: () => editor.chain().focus().toggleBlockquote().run(), active: editor.isActive("blockquote"), label: "Quote" },
    {
      icon: LinkIcon,
      action: () => {
        const url = window.prompt("Link URL");
        if (url) editor.chain().focus().setLink({ href: url }).run();
      },
      active: editor.isActive("link"),
      label: "Link",
    },
  ];

  return (
    <div className="overflow-hidden rounded-xl border border-neutral-300">
      {editable && (
        <div className="flex flex-wrap gap-1 border-b border-neutral-200 bg-neutral-50 p-2">
          {buttons.map((b) => (
            <button
              key={b.label}
              type="button"
              aria-label={b.label}
              aria-pressed={b.active}
              onClick={b.action}
              className={cn(
                "focus-ring rounded-lg p-2 text-neutral-500 hover:bg-white",
                b.active && "bg-white text-brand-700 shadow-sm",
              )}
            >
              <b.icon className="h-4 w-4" />
            </button>
          ))}
        </div>
      )}
      <EditorContent editor={editor} />
    </div>
  );
}
