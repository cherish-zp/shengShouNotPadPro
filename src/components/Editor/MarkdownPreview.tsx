import React, { useMemo } from "react";
import { renderMarkdown } from "@/utils/markdown";

interface MarkdownPreviewProps {
  content: string;
}

export default function MarkdownPreview({ content }: MarkdownPreviewProps) {
  const html = useMemo(() => renderMarkdown(content), [content]);

  return (
    <div
      className="md-preview"
      style={{
        flex: 1,
        overflow: "auto",
        padding: "24px 32px",
        background: "var(--bg-primary)",
        color: "var(--text-primary)",
        fontSize: 14,
        lineHeight: 1.7,
        fontFamily:
          '-apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif',
      }}
    >
      <style>{`
        .md-preview .md-h1 { font-size: 2em; font-weight: 700; margin: 0.5em 0 0.4em; border-bottom: 1px solid var(--border); padding-bottom: 0.25em; }
        .md-preview .md-h2 { font-size: 1.5em; font-weight: 700; margin: 1.2em 0 0.4em; border-bottom: 1px solid var(--border); padding-bottom: 0.2em; }
        .md-preview .md-h3 { font-size: 1.25em; font-weight: 600; margin: 1em 0 0.4em; }
        .md-preview .md-h4 { font-size: 1.1em; font-weight: 600; margin: 1em 0 0.4em; }
        .md-preview .md-h5 { font-size: 1em;   font-weight: 600; margin: 1em 0 0.4em; }
        .md-preview .md-h6 { font-size: 0.95em; font-weight: 600; color: var(--text-secondary); margin: 1em 0 0.4em; }
        .md-preview .md-p { margin: 0.6em 0; white-space: pre-wrap; word-wrap: break-word; }
        .md-preview a { color: var(--accent); text-decoration: none; }
        .md-preview a:hover { text-decoration: underline; }
        .md-preview .md-code-inline {
          padding: 1px 6px;
          background: var(--bg-secondary);
          border: 1px solid var(--border);
          border-radius: 4px;
          font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
          font-size: 0.9em;
        }
        .md-preview .md-pre {
          padding: 12px 14px;
          background: var(--bg-secondary);
          border: 1px solid var(--border);
          border-radius: 6px;
          overflow-x: auto;
          margin: 0.8em 0;
        }
        .md-preview .md-pre code {
          font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
          font-size: 0.9em;
          background: transparent;
          padding: 0;
          border: none;
          color: var(--text-primary);
          white-space: pre;
        }
        .md-preview .md-quote {
          margin: 0.8em 0;
          padding: 4px 14px;
          border-left: 3px solid var(--accent);
          background: var(--bg-secondary);
          color: var(--text-secondary);
          border-radius: 0 6px 6px 0;
        }
        .md-preview .md-ul, .md-preview .md-ol {
          margin: 0.5em 0;
          padding-left: 1.6em;
        }
        .md-preview .md-ul li, .md-preview .md-ol li {
          margin: 0.2em 0;
        }
        .md-preview .md-task { list-style: none; margin-left: -1.4em; }
        .md-preview .md-task input { margin-right: 6px; }
        .md-preview .md-hr {
          border: 0;
          border-top: 1px solid var(--border);
          margin: 1.5em 0;
        }
        .md-preview .md-table {
          border-collapse: collapse;
          margin: 0.8em 0;
          width: 100%;
          font-size: 0.95em;
        }
        .md-preview .md-table th, .md-preview .md-table td {
          border: 1px solid var(--border);
          padding: 6px 12px;
        }
        .md-preview .md-table th {
          background: var(--bg-secondary);
          font-weight: 600;
        }
        .md-preview .md-table tr:nth-child(even) td {
          background: var(--bg-secondary);
        }
        .md-preview .md-img {
          max-width: 100%;
          border-radius: 6px;
        }
      `}</style>
      <div dangerouslySetInnerHTML={{ __html: html }} />
    </div>
  );
}
