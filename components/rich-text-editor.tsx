'use client';

import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import Placeholder from '@tiptap/extension-placeholder';
import { useEffect, useState, useRef } from 'react';
import {
  Bold,
  Italic,
  Strikethrough,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Link as LinkIcon,
  Quote,
  Tag,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { MERGE_FIELDS } from '@/lib/email/merge';

interface RichTextEditorProps {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
}

export function RichTextEditor({
  value,
  onChange,
  placeholder = 'Write your email…',
}: RichTextEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3] },
      }),
      Link.configure({
        openOnClick: false,
        autolink: true,
        HTMLAttributes: {
          class: 'text-clay-600 underline underline-offset-2',
        },
      }),
      Placeholder.configure({
        placeholder,
      }),
    ],
    content: value,
    immediatelyRender: false,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class:
          'min-h-[280px] max-h-[600px] overflow-y-auto p-4 prose prose-sm max-w-none focus:outline-none',
      },
    },
  });

  // Keep editor content in sync if `value` changes externally (e.g. template change)
  useEffect(() => {
    if (!editor) return;
    if (editor.getHTML() !== value) {
      editor.commands.setContent(value);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  if (!editor) {
    return (
      <div className="border border-slate-200 rounded-lg bg-cream-50 min-h-[320px]" />
    );
  }

  return (
    <div className="border border-slate-200 rounded-lg bg-cream-50 focus-within:border-clay-500 focus-within:ring-2 focus-within:ring-clay-500">
      <Toolbar editor={editor} />
      <EditorContent editor={editor} />
    </div>
  );
}

function Toolbar({ editor }: { editor: ReturnType<typeof useEditor> }) {
  if (!editor) return null;

  function setLink() {
    const previousUrl = editor!.getAttributes('link').href as
      | string
      | undefined;
    const url = window.prompt('URL', previousUrl ?? 'https://');
    if (url === null) return; // cancelled
    if (url === '') {
      editor!.chain().focus().extendMarkRange('link').unsetLink().run();
      return;
    }
    editor!
      .chain()
      .focus()
      .extendMarkRange('link')
      .setLink({ href: url })
      .run();
  }

  return (
    <div className="flex flex-wrap items-center gap-1 px-2 py-1.5 border-b border-cream-300 bg-cream-100">
      <ToolbarButton
        active={editor.isActive('bold')}
        onClick={() => editor.chain().focus().toggleBold().run()}
        label="Bold"
      >
        <Bold className="h-3.5 w-3.5" />
      </ToolbarButton>
      <ToolbarButton
        active={editor.isActive('italic')}
        onClick={() => editor.chain().focus().toggleItalic().run()}
        label="Italic"
      >
        <Italic className="h-3.5 w-3.5" />
      </ToolbarButton>
      <ToolbarButton
        active={editor.isActive('strike')}
        onClick={() => editor.chain().focus().toggleStrike().run()}
        label="Strikethrough"
      >
        <Strikethrough className="h-3.5 w-3.5" />
      </ToolbarButton>
      <Divider />
      <ToolbarButton
        active={editor.isActive('heading', { level: 2 })}
        onClick={() =>
          editor.chain().focus().toggleHeading({ level: 2 }).run()
        }
        label="Heading"
      >
        <Heading2 className="h-3.5 w-3.5" />
      </ToolbarButton>
      <ToolbarButton
        active={editor.isActive('heading', { level: 3 })}
        onClick={() =>
          editor.chain().focus().toggleHeading({ level: 3 }).run()
        }
        label="Subheading"
      >
        <Heading3 className="h-3.5 w-3.5" />
      </ToolbarButton>
      <Divider />
      <ToolbarButton
        active={editor.isActive('bulletList')}
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        label="Bullet list"
      >
        <List className="h-3.5 w-3.5" />
      </ToolbarButton>
      <ToolbarButton
        active={editor.isActive('orderedList')}
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        label="Numbered list"
      >
        <ListOrdered className="h-3.5 w-3.5" />
      </ToolbarButton>
      <ToolbarButton
        active={editor.isActive('blockquote')}
        onClick={() => editor.chain().focus().toggleBlockquote().run()}
        label="Quote"
      >
        <Quote className="h-3.5 w-3.5" />
      </ToolbarButton>
      <Divider />
      <ToolbarButton
        active={editor.isActive('link')}
        onClick={setLink}
        label="Link"
      >
        <LinkIcon className="h-3.5 w-3.5" />
      </ToolbarButton>
      <Divider />
      <MergeFieldPicker editor={editor} />
    </div>
  );
}

function ToolbarButton({
  children,
  onClick,
  active,
  label,
}: {
  children: React.ReactNode;
  onClick: () => void;
  active?: boolean;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className={cn(
        'h-7 w-7 rounded inline-flex items-center justify-center transition-colors',
        active
          ? 'bg-clay-100 text-clay-700'
          : 'text-slate-600 hover:bg-cream-200 hover:text-slate-900'
      )}
    >
      {children}
    </button>
  );
}

function Divider() {
  return <span className="h-4 w-px bg-cream-300 mx-0.5" />;
}

function MergeFieldPicker({
  editor,
}: {
  editor: ReturnType<typeof useEditor>;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [open]);

  if (!editor) return null;

  function insert(key: string) {
    editor!.chain().focus().insertContent(`{{${key}}}`).run();
    setOpen(false);
  }

  const groups: Record<string, typeof MERGE_FIELDS> = {};
  for (const f of MERGE_FIELDS) {
    if (!groups[f.group]) groups[f.group] = [];
    groups[f.group].push(f);
  }

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="h-7 px-2 rounded inline-flex items-center gap-1 text-xs font-medium text-clay-700 hover:bg-clay-50"
      >
        <Tag className="h-3 w-3" />
        Insert variable
      </button>

      {open ? (
        <div className="absolute top-full left-0 mt-1 w-64 max-h-80 overflow-y-auto rounded-lg border border-cream-300 bg-cream-50 shadow-soft z-30 py-2">
          {Object.entries(groups).map(([group, fields]) => (
            <div key={group}>
              <p className="px-3 py-1 text-2xs font-mono uppercase tracking-wider text-slate-500">
                {group}
              </p>
              <ul>
                {fields.map((f) => (
                  <li key={f.key}>
                    <button
                      type="button"
                      onClick={() => insert(f.key)}
                      className="w-full text-left px-3 py-1.5 hover:bg-cream-200"
                    >
                      <p className="text-sm text-slate-900">{f.label}</p>
                      <p className="text-xs text-slate-500 font-mono">
                        {`{{${f.key}}}`} · {f.example}
                      </p>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
