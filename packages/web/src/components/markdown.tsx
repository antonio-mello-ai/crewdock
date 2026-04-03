"use client";

import React from "react";

/**
 * Lightweight markdown renderer. Handles:
 * - **bold**, *italic*, `inline code`
 * - ```code blocks```
 * - # headings (h1-h3)
 * - - unordered lists
 * - numbered lists
 *
 * No external dependencies.
 */
export function Markdown({ content }: { content: string }) {
  const blocks = parseBlocks(content);

  return (
    <div className="markdown-content space-y-2 text-sm leading-relaxed">
      {blocks.map((block, i) => (
        <MarkdownBlock key={i} block={block} />
      ))}
    </div>
  );
}

type Block =
  | { type: "code"; lang: string; content: string }
  | { type: "heading"; level: number; content: string }
  | { type: "list"; items: string[] }
  | { type: "paragraph"; content: string };

function parseBlocks(text: string): Block[] {
  const lines = text.split("\n");
  const blocks: Block[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Code block
    if (line.trimStart().startsWith("```")) {
      const lang = line.trimStart().slice(3).trim();
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i].trimStart().startsWith("```")) {
        codeLines.push(lines[i]);
        i++;
      }
      i++; // skip closing ```
      blocks.push({ type: "code", lang, content: codeLines.join("\n") });
      continue;
    }

    // Heading
    const headingMatch = line.match(/^(#{1,3})\s+(.+)/);
    if (headingMatch) {
      blocks.push({
        type: "heading",
        level: headingMatch[1].length,
        content: headingMatch[2],
      });
      i++;
      continue;
    }

    // List items (- or * or numbered)
    if (/^[\s]*[-*]\s+/.test(line) || /^[\s]*\d+\.\s+/.test(line)) {
      const items: string[] = [];
      while (
        i < lines.length &&
        (/^[\s]*[-*]\s+/.test(lines[i]) || /^[\s]*\d+\.\s+/.test(lines[i]))
      ) {
        items.push(lines[i].replace(/^[\s]*[-*]\s+/, "").replace(/^[\s]*\d+\.\s+/, ""));
        i++;
      }
      blocks.push({ type: "list", items });
      continue;
    }

    // Empty line
    if (line.trim() === "") {
      i++;
      continue;
    }

    // Paragraph — collect consecutive non-special lines
    const paraLines: string[] = [];
    while (
      i < lines.length &&
      lines[i].trim() !== "" &&
      !lines[i].trimStart().startsWith("```") &&
      !lines[i].match(/^#{1,3}\s+/) &&
      !/^[\s]*[-*]\s+/.test(lines[i]) &&
      !/^[\s]*\d+\.\s+/.test(lines[i])
    ) {
      paraLines.push(lines[i]);
      i++;
    }
    if (paraLines.length > 0) {
      blocks.push({ type: "paragraph", content: paraLines.join(" ") });
    }
  }

  return blocks;
}

function MarkdownBlock({ block }: { block: Block }) {
  switch (block.type) {
    case "code":
      return (
        <pre className="rounded-md bg-neutral-950 border border-neutral-800/60 px-4 py-3 overflow-x-auto">
          <code className="text-xs font-mono text-neutral-300 leading-5">
            {block.content}
          </code>
        </pre>
      );

    case "heading": {
      const Tag = `h${block.level}` as "h1" | "h2" | "h3";
      const sizes = {
        h1: "text-base font-semibold text-neutral-100",
        h2: "text-sm font-semibold text-neutral-200",
        h3: "text-sm font-medium text-neutral-300",
      };
      return <Tag className={sizes[Tag]}>{renderInline(block.content)}</Tag>;
    }

    case "list":
      return (
        <ul className="space-y-1 pl-4">
          {block.items.map((item, i) => (
            <li
              key={i}
              className="text-sm text-neutral-300 relative before:content-[''] before:absolute before:left-[-12px] before:top-[9px] before:h-1 before:w-1 before:rounded-full before:bg-neutral-600"
            >
              {renderInline(item)}
            </li>
          ))}
        </ul>
      );

    case "paragraph":
      return (
        <p className="text-sm text-neutral-300">{renderInline(block.content)}</p>
      );
  }
}

function renderInline(text: string): React.ReactNode[] {
  const parts: React.ReactNode[] = [];
  // Process inline formatting: **bold**, *italic*, `code`
  const regex = /(\*\*(.+?)\*\*|\*(.+?)\*|`([^`]+)`)/g;
  let lastIndex = 0;
  let match;

  while ((match = regex.exec(text)) !== null) {
    // Push text before match
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }

    if (match[2]) {
      // **bold**
      parts.push(
        <strong key={match.index} className="font-semibold text-neutral-100">
          {match[2]}
        </strong>
      );
    } else if (match[3]) {
      // *italic*
      parts.push(
        <em key={match.index} className="italic text-neutral-200">
          {match[3]}
        </em>
      );
    } else if (match[4]) {
      // `code`
      parts.push(
        <code
          key={match.index}
          className="rounded bg-neutral-800/80 px-1.5 py-0.5 text-xs font-mono text-amber-300/90"
        >
          {match[4]}
        </code>
      );
    }

    lastIndex = match.index + match[0].length;
  }

  // Push remaining text
  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return parts.length > 0 ? parts : [text];
}
