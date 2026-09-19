'use client'

import { useCallback, useEffect, useRef } from 'react'
import { useEditor, EditorContent, type Editor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Link from '@tiptap/extension-link'
import { marked } from 'marked'
import {
  Bold,
  Italic,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Quote,
  Link as LinkIcon,
  Undo2,
  Redo2,
} from 'lucide-react'
import { cn } from '@/lib/utils'

function ToolbarButton({
  onClick,
  active,
  disabled,
  label,
  children,
}: {
  onClick: () => void
  active?: boolean
  disabled?: boolean
  label: string
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      aria-pressed={active}
      className={cn(
        'flex size-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-40',
        active && 'bg-primary/10 text-primary hover:bg-primary/15 hover:text-primary',
      )}
    >
      {children}
    </button>
  )
}

function Toolbar({ editor }: { editor: Editor }) {
  const setLink = useCallback(() => {
    const previous = editor.getAttributes('link').href as string | undefined
    const url = window.prompt('Adres URL odnośnika:', previous ?? 'https://')
    if (url === null) return
    if (url === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run()
      return
    }
    editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run()
  }, [editor])

  return (
    <div className="flex flex-wrap items-center gap-0.5 border-b border-border bg-muted/40 p-1.5">
      <ToolbarButton label="Pogrubienie" onClick={() => editor.chain().focus().toggleBold().run()} active={editor.isActive('bold')}>
        <Bold className="size-4" />
      </ToolbarButton>
      <ToolbarButton label="Kursywa" onClick={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive('italic')}>
        <Italic className="size-4" />
      </ToolbarButton>
      <span className="mx-1 h-5 w-px bg-border" />
      <ToolbarButton label="Nagłówek 2" onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} active={editor.isActive('heading', { level: 2 })}>
        <Heading2 className="size-4" />
      </ToolbarButton>
      <ToolbarButton label="Nagłówek 3" onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} active={editor.isActive('heading', { level: 3 })}>
        <Heading3 className="size-4" />
      </ToolbarButton>
      <span className="mx-1 h-5 w-px bg-border" />
      <ToolbarButton label="Lista punktowana" onClick={() => editor.chain().focus().toggleBulletList().run()} active={editor.isActive('bulletList')}>
        <List className="size-4" />
      </ToolbarButton>
      <ToolbarButton label="Lista numerowana" onClick={() => editor.chain().focus().toggleOrderedList().run()} active={editor.isActive('orderedList')}>
        <ListOrdered className="size-4" />
      </ToolbarButton>
      <ToolbarButton label="Cytat" onClick={() => editor.chain().focus().toggleBlockquote().run()} active={editor.isActive('blockquote')}>
        <Quote className="size-4" />
      </ToolbarButton>
      <ToolbarButton label="Odnośnik" onClick={setLink} active={editor.isActive('link')}>
        <LinkIcon className="size-4" />
      </ToolbarButton>
      <span className="mx-1 h-5 w-px bg-border" />
      <ToolbarButton label="Cofnij" onClick={() => editor.chain().focus().undo().run()} disabled={!editor.can().undo()}>
        <Undo2 className="size-4" />
      </ToolbarButton>
      <ToolbarButton label="Ponów" onClick={() => editor.chain().focus().redo().run()} disabled={!editor.can().redo()}>
        <Redo2 className="size-4" />
      </ToolbarButton>
    </div>
  )
}

/**
 * Heurystyka: czy wklejony zwykły tekst wygląda na Markdown?
 * Wystarczy jeden charakterystyczny znacznik (nagłówek, pogrubienie, lista,
 * cytat, odnośnik lub kod), by potraktować wklejkę jako Markdown.
 */
function looksLikeMarkdown(text: string) {
  return (
    /(^|\n)\s{0,3}#{1,6}\s/.test(text) || // # Nagłówek
    /\*\*[^*\n]+\*\*/.test(text) || // **pogrubienie**
    /(^|\n)\s{0,3}[-*+]\s+\S/.test(text) || // - lista punktowana
    /(^|\n)\s{0,3}\d+\.\s+\S/.test(text) || // 1. lista numerowana
    /\[[^\]]+\]\([^)]+\)/.test(text) || // [odnośnik](url)
    /(^|\n)\s{0,3}>\s+\S/.test(text) || // > cytat
    /`[^`\n]+`/.test(text) // `kod`
  )
}

export function RichTextEditor({
  initialContent,
  onChange,
}: {
  initialContent: string
  onChange: (html: string) => void
}) {
  const editorRef = useRef<Editor | null>(null)

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({ link: false }),
      Link.configure({ openOnClick: false, autolink: true }),
    ],
    content: initialContent || '',
    editorProps: {
      attributes: {
        class: 'article-prose min-h-[280px] max-w-none px-4 py-3 outline-none',
      },
      // Wklejenie sformatowanego tekstu w Markdown „zaskakuje” w formatowanie.
      handlePaste: (_view, event) => {
        const ed = editorRef.current
        if (!ed) return false

        // Bogaty HTML (np. z WWW / Worda) obsługuje sam TipTap.
        const html = event.clipboardData?.getData('text/html')?.trim()
        if (html) return false

        const text = event.clipboardData?.getData('text/plain') ?? ''
        if (!text || !looksLikeMarkdown(text)) return false

        const converted = marked.parse(text, { async: false, gfm: true, breaks: true }) as string
        ed.chain().focus().insertContent(converted).run()
        return true
      },
    },
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
  })

  useEffect(() => {
    editorRef.current = editor
  }, [editor])

  if (!editor) {
    return (
      <div className="min-h-[340px] rounded-xl border border-input bg-background" aria-hidden />
    )
  }

  return (
    <div className="overflow-hidden rounded-xl border border-input bg-background focus-within:border-ring focus-within:ring-2 focus-within:ring-ring/40">
      <Toolbar editor={editor} />
      <EditorContent editor={editor} />
    </div>
  )
}
