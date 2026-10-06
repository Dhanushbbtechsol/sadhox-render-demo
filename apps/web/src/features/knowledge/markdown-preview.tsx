import type { ReactNode } from "react";

/**
 * Lightweight markdown-ish preview (no extra dependency).
 * Supports headings, bold, italic, lists, and paragraphs.
 */
export function MarkdownPreview({ body }: { body: string }) {
  const blocks = body.trim() ? body.replace(/\r\n/g, "\n").split(/\n\n+/) : [];

  if (blocks.length === 0) {
    return <p className="text-sm text-muted-foreground">Nothing to preview yet.</p>;
  }

  return (
    <div className="prose-preview space-y-3 text-sm leading-relaxed">
      {blocks.map((block, index) => (
        <PreviewBlock key={index} block={block} />
      ))}
    </div>
  );
}

function PreviewBlock({ block }: { block: string }) {
  const lines = block.split("\n");
  const first = lines[0] ?? "";

  if (first.startsWith("### ")) {
    return <h3 className="text-base font-semibold">{inlineMarkdown(first.slice(4))}</h3>;
  }
  if (first.startsWith("## ")) {
    return <h2 className="text-lg font-semibold">{inlineMarkdown(first.slice(3))}</h2>;
  }
  if (first.startsWith("# ")) {
    return <h1 className="text-xl font-semibold">{inlineMarkdown(first.slice(2))}</h1>;
  }

  const listItems = lines.filter((line) => /^[-*]\s+/.test(line) || /^\d+\.\s+/.test(line));
  if (listItems.length === lines.length && listItems.length > 0) {
    const ordered = /^\d+\.\s+/.test(lines[0] ?? "");
    const ListTag = ordered ? "ol" : "ul";
    return (
      <ListTag className={ordered ? "list-decimal space-y-1 pl-5" : "list-disc space-y-1 pl-5"}>
        {lines.map((line, i) => (
          <li key={i}>{inlineMarkdown(line.replace(/^([-*]|\d+\.)\s+/, ""))}</li>
        ))}
      </ListTag>
    );
  }

  return (
    <p className="whitespace-pre-wrap text-foreground/90">
      {lines.map((line, i) => (
        <span key={i}>
          {i > 0 ? <br /> : null}
          {inlineMarkdown(line)}
        </span>
      ))}
    </p>
  );
}

function inlineMarkdown(text: string): ReactNode {
  const parts: ReactNode[] = [];
  const pattern = /(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/g;
  let last = 0;
  let match: RegExpExecArray | null;
  let key = 0;

  while ((match = pattern.exec(text)) !== null) {
    if (match.index > last) {
      parts.push(text.slice(last, match.index));
    }
    const token = match[0];
    if (token.startsWith("**")) {
      parts.push(
        <strong key={key++} className="font-semibold">
          {token.slice(2, -2)}
        </strong>,
      );
    } else if (token.startsWith("*")) {
      parts.push(
        <em key={key++} className="italic">
          {token.slice(1, -1)}
        </em>,
      );
    } else if (token.startsWith("`")) {
      parts.push(
        <code key={key++} className="rounded bg-muted px-1 py-0.5 font-mono text-xs">
          {token.slice(1, -1)}
        </code>,
      );
    }
    last = match.index + token.length;
  }

  if (last < text.length) {
    parts.push(text.slice(last));
  }

  return parts.length > 0 ? parts : text;
}
