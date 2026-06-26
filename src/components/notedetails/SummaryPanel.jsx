import React, { useMemo, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { jsPDF } from "jspdf";
import {
  Sparkles,
  Clock3,
  Copy,
  Check,
  RefreshCw,
  Download,
  BookOpen,
  Lightbulb,
  FileText,
  Target,
  MessageSquareText,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Utilities
// ---------------------------------------------------------------------------

function cn(...classes) {
  return classes.filter(Boolean).join(" ");
}

function isObject(value) {
  return value && typeof value === "object" && !Array.isArray(value);
}

function toStringValue(value) {
  if (value === null || value === undefined) return "";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return "";
}

function countWords(text = "") {
  return toStringValue(text).trim().split(/\s+/).filter(Boolean).length;
}

function estimateReadingTime(text = "") {
  return Math.max(1, Math.ceil(countWords(text) / 180));
}

function formatDateTime(value) {
  const d = value ? new Date(value) : new Date();
  const safe = Number.isNaN(d.getTime()) ? new Date() : d;
  return safe.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

// ---------------------------------------------------------------------------
// Payload normalisation
// ---------------------------------------------------------------------------

function normalizeSummaryPayload(input) {
  if (input == null) return null;

  if (typeof input === "string") {
    return { summary: input, generatedAt: new Date().toISOString() };
  }

  const source =
    input.data ||
    input.result ||
    input.response ||
    input.output ||
    input.payload ||
    input.summary ||
    input.content ||
    input.text ||
    input.aiContent?.summary ||
    input.historyContent ||
    input.noteSummary ||
    input;

  if (typeof source === "string") {
    return {
      summary: source,
      generatedAt: input.generatedAt || input.createdAt || new Date().toISOString(),
    };
  }

  if (!isObject(source)) return null;

  return {
    summary:
      source.summary ||
      source.content ||
      source.text ||
      source.overview ||
      source.explanation ||
      source.message ||
      source.answer ||
      source.markdown ||
      "",
    keyConcepts: Array.isArray(source.keyConcepts) ? source.keyConcepts : [],
    importantPoints: Array.isArray(source.importantPoints) ? source.importantPoints : [],
    examNotes: Array.isArray(source.examNotes) ? source.examNotes : [],
    quickRevision: toStringValue(source.quickRevision),
    vivaQuestions: Array.isArray(source.vivaQuestions) ? source.vivaQuestions : [],
    generatedAt:
      source.generatedAt ||
      source.createdAt ||
      source.timestamp ||
      input.generatedAt ||
      input.createdAt ||
      new Date().toISOString(),
  };
}

function getRenderableSummary(input) {
  const normalized = normalizeSummaryPayload(input);
  if (!normalized) return null;

  const summary = toStringValue(normalized.summary);

  return {
    ...normalized,
    summary,
    hasContent:
      Boolean(summary.trim()) ||
      (Array.isArray(normalized.keyConcepts) && normalized.keyConcepts.length > 0) ||
      (Array.isArray(normalized.importantPoints) && normalized.importantPoints.length > 0) ||
      (Array.isArray(normalized.examNotes) && normalized.examNotes.length > 0) ||
      (Array.isArray(normalized.vivaQuestions) && normalized.vivaQuestions.length > 0) ||
      Boolean(toStringValue(normalized.quickRevision).trim()),
  };
}

// ---------------------------------------------------------------------------
// Markdown components for React rendering
// ---------------------------------------------------------------------------

function MarkdownTable({ children }) {
  return (
    <div className="my-3 max-w-full overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800">
      <table className="w-full min-w-full border-collapse bg-white dark:bg-slate-950">{children}</table>
    </div>
  );
}

const markdownComponents = {
  h1: ({ children }) => (
    <h2 className="mb-3 mt-5 text-2xl font-bold tracking-tight text-slate-900 dark:text-white">{children}</h2>
  ),
  h2: ({ children }) => (
    <h3 className="mb-2 mt-5 text-xl font-semibold text-slate-900 dark:text-white">{children}</h3>
  ),
  h3: ({ children }) => (
    <h4 className="mb-2 mt-4 text-lg font-semibold text-purple-700 dark:text-purple-300">{children}</h4>
  ),
  h4: ({ children }) => (
    <h5 className="mb-2 mt-4 text-base font-semibold text-slate-800 dark:text-slate-100">{children}</h5>
  ),
  h5: ({ children }) => (
    <h6 className="mb-1.5 mt-3 text-sm font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-300">
      {children}
    </h6>
  ),
  h6: ({ children }) => (
    <p className="mb-1.5 mt-3 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
      {children}
    </p>
  ),
  p: ({ children }) => (
    <p className="mb-3 text-sm leading-7 text-slate-700 dark:text-slate-300">{children}</p>
  ),
  ul: ({ children }) => (
    <ul className="mb-4 ml-5 list-disc space-y-2 text-sm leading-7 text-slate-700 dark:text-slate-300">
      {children}
    </ul>
  ),
  ol: ({ children }) => (
    <ol className="mb-4 ml-5 list-decimal space-y-2 text-sm leading-7 text-slate-700 dark:text-slate-300">
      {children}
    </ol>
  ),
  li: ({ children }) => <li className="pl-1">{children}</li>,
  a: ({ href, children }) => (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="font-medium text-purple-600 underline underline-offset-2 hover:text-purple-700 dark:text-purple-300"
    >
      {children}
    </a>
  ),
  blockquote: ({ children }) => (
    <blockquote className="my-4 border-l-4 border-purple-500/30 bg-purple-500/5 px-4 py-3 text-sm text-slate-700 dark:text-slate-300">
      {children}
    </blockquote>
  ),
  hr: () => <hr className="my-5 border-slate-200 dark:border-slate-800" />,
  table: ({ children }) => <MarkdownTable>{children}</MarkdownTable>,
  thead: ({ children }) => <thead className="bg-purple-50 dark:bg-purple-500/10">{children}</thead>,
  tbody: ({ children }) => <tbody>{children}</tbody>,
  tr: ({ children }) => (
    <tr className="border-b border-slate-100 dark:border-slate-800">{children}</tr>
  ),
  th: ({ children }) => (
    <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700 dark:text-purple-200">{children}</th>
  ),
  td: ({ children }) => (
    <td className="px-4 py-3 align-top text-sm text-slate-700 dark:text-slate-300">{children}</td>
  ),
  code: ({ className, children }) => {
    const raw = Array.isArray(children) ? children.join("") : String(children ?? "");
    const match = /language-(\w+)/.exec(className || "");
    const isInline = !match && !raw.includes("\n");
    if (isInline) {
      return (
        <code className="rounded-md bg-slate-200/80 px-1.5 py-0.5 font-mono text-[0.85em] text-purple-700 dark:bg-slate-800 dark:text-purple-300">
          {raw}
        </code>
      );
    }
    return (
      <pre className="mb-4 overflow-x-auto rounded-2xl border border-slate-200 bg-slate-950 p-4 text-xs leading-6 text-slate-100 sm:text-sm sm:leading-7 dark:border-slate-800">
        <code>{raw.replace(/\n$/, "")}</code>
      </pre>
    );
  },
};

// ---------------------------------------------------------------------------
// PDF helpers
// ---------------------------------------------------------------------------

function isTableRowLine(line) {
  const t = line.trim();
  return t.startsWith("|") && t.endsWith("|") && t.length > 1;
}

function isTableSeparatorLine(line) {
  return /^\|?\s*:?-+:?\s*(\|\s*:?-+:?\s*)*\|?$/.test(line.trim());
}

function parseTableRow(line) {
  let t = line.trim();
  if (t.startsWith("|")) t = t.slice(1);
  if (t.endsWith("|")) t = t.slice(0, -1);
  return t.split("|").map((c) => c.trim());
}

// ---------------------------------------------------------------------------
// FIX 1 — Complete Unicode → Latin-1 sanitisation
// Covers smart quotes, dashes, arrows, math symbols, and a catch-all strip
// for anything outside Latin-1 that jsPDF's helvetica cannot encode.
// Without this, jsPDF falls back to individual glyph positioning which
// creates huge inter-letter spacing and garbled / box characters.
// ---------------------------------------------------------------------------
function sanitizePdfText(text = "") {
  return String(text)
    // Smart / curly quotes → straight
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    // Dashes
    .replace(/\u2014/g, "--")   // em dash  —
    .replace(/\u2013/g, "-")    // en dash  –
    .replace(/\u2012/g, "-")    // figure dash
    .replace(/\u2015/g, "--")   // horizontal bar
    // Ellipsis
    .replace(/\u2026/g, "...")
    // Bullets / list markers
    .replace(/\u2022/g, "-")    // bullet  •
    .replace(/\u2023/g, "-")    // triangular bullet
    .replace(/\u25CF/g, "-")    // black circle
    .replace(/\u25CB/g, "-")    // white circle
    // Non-breaking & special spaces
    .replace(/[\u00A0\u202F\u2009\u200A]/g, " ")
    // Arrows
    .replace(/\u2192/g, "->")   // →
    .replace(/\u2190/g, "<-")   // ←
    .replace(/\u2194/g, "<->")  // ↔
    .replace(/\u21D2/g, "=>")   // ⇒
    .replace(/\u21D0/g, "<=")   // ⇐
    // Math / comparison
    .replace(/\u2248/g, "~=")
    .replace(/\u2260/g, "!=")
    .replace(/\u2264/g, "<=")
    .replace(/\u2265/g, ">=")
    .replace(/\u00D7/g, "x")    // ×
    .replace(/\u00F7/g, "/")    // ÷
    .replace(/\u00B1/g, "+/-")  // ±
    .replace(/\u221E/g, "inf")  // ∞
    .replace(/\u2211/g, "sum")  // ∑
    .replace(/\u221A/g, "sqrt") // √
    // Typographic
    .replace(/\u00B7/g, ".")    // middle dot
    .replace(/\u2019/g, "'")    // belt-and-suspenders for right single quote
    // Zero-width / invisible characters
    .replace(/[\u200B-\u200D\uFEFF]/g, "")
    // HTML line-break remnants
    .replace(/<br\s*\/?>/gi, "\n")
    // CATCH-ALL: strip anything outside Latin-1 that jsPDF cannot encode.
    // This must be the last replacement — it is the safety net.
    .replace(/[^\x00-\xFF]/g, "")
    // Strip control characters
    .replace(/[\x00-\x1F\x7F-\x9F]/g, "")
    .trim();
}

// ---------------------------------------------------------------------------
// FIX 2 — tokenizeInline: parse inline markdown tokens
// Was defined in the original but NEVER CALLED, causing **bold** and `code`
// to appear literally in PDF output.
// ---------------------------------------------------------------------------
function tokenizeInline(line) {
  const tokens = [];
  // Matches **bold**, `code`, *italic*, _italic_
  const regex = /(\*\*[^*]+\*\*|`[^`]+`|\*[^*]+\*|_[^_]+_)/g;
  let lastIndex = 0;
  let match;

  while ((match = regex.exec(line))) {
    if (match.index > lastIndex) {
      tokens.push({ text: line.slice(lastIndex, match.index), style: "normal" });
    }
    const m = match[0];
    if (m.startsWith("**")) {
      tokens.push({ text: m.slice(2, -2), style: "bold" });
    } else if (m.startsWith("`")) {
      tokens.push({ text: m.slice(1, -1), style: "code" });
    } else {
      tokens.push({ text: m.slice(1, -1), style: "italic" });
    }
    lastIndex = match.index + m.length;
  }

  if (lastIndex < line.length) {
    tokens.push({ text: line.slice(lastIndex), style: "normal" });
  }

  return tokens;
}

// ---------------------------------------------------------------------------
// PDF document builder
// ---------------------------------------------------------------------------
function buildStudyGuidePdf({ title, generatedAt, overview, sections }) {
  const pdf = new jsPDF({ unit: "pt", format: "a4" });
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 48;
  const contentWidth = pageWidth - margin * 2;
  let y = margin;

  const PURPLE = [88, 28, 135];
  const SLATE_700 = [51, 65, 85];
  const SLATE_500 = [100, 116, 139];
  const SLATE_300 = [203, 213, 225];

  function newPage() {
    pdf.addPage();
    y = margin;
  }

  function ensureSpace(needed = 16) {
    if (y + needed > pageHeight - margin) newPage();
  }

  // -------------------------------------------------------------------------
  // FIX 2 (continued) — drawRichLine now calls tokenizeInline and switches
  // pdf.setFont per token so that **bold** → bold font, `code` → normal font
  // with monospace-ish treatment, *italic* → italic font.
  // The original passed the raw string straight to pdf.text(), printing
  // markdown syntax characters literally.
  // -------------------------------------------------------------------------
  function drawRichLine(line, { indent = 0, size = 11, color = SLATE_700, lineHeight = 16 } = {}) {
    const cleanLine = sanitizePdfText(line);
    if (!cleanLine) return;

    // First, obtain the plain text (all tokens joined) for wrapping.
    // jsPDF's splitTextToSize measures plain text width, so we need the
    // stripped version to get accurate line breaks.
    const tokens = tokenizeInline(cleanLine);
    const plainText = tokens.map((t) => t.text).join("");
    const wrappedLines = pdf.splitTextToSize(plainText, contentWidth - indent);

    // For each wrapped line we re-tokenize so inline styles span correctly
    // across word-wrapped segments.
    wrappedLines.forEach((wLine) => {
      ensureSpace(lineHeight);
      const lineTokens = tokenizeInline(sanitizePdfText(wLine));
      let xCursor = margin + indent;

      lineTokens.forEach(({ text, style }) => {
        if (!text) return;

        const fontStyle =
          style === "bold" ? "bold" :
            style === "italic" ? "italic" :
              "normal";

        pdf.setFont("helvetica", fontStyle);
        pdf.setFontSize(size);
        pdf.setTextColor(...color);
        pdf.text(text, xCursor, y);
        xCursor += pdf.getTextWidth(text);
      });

      y += lineHeight;
    });
  }

  function drawDivider(width = contentWidth) {
    ensureSpace(16);
    pdf.setDrawColor(...SLATE_300);
    pdf.line(margin, y, margin + width, y);
    y += 12;
  }

  function drawTable(rows) {
    if (!rows.length) return;
    const cols = rows[0].length;
    const colWidth = contentWidth / cols;
    const cellPadding = 6;
    const fontSize = 9.5;

    rows.forEach((row, rowIdx) => {
      pdf.setFont("helvetica", rowIdx === 0 ? "bold" : "normal");
      pdf.setFontSize(fontSize);
      const cellLines = row.map((cell) =>
        pdf.splitTextToSize(sanitizePdfText(cell || ""), colWidth - cellPadding * 2)
      );
      const rowHeight =
        Math.max(...cellLines.map((l) => l.length), 1) * 12 + cellPadding * 2;
      ensureSpace(rowHeight);
      const rowTop = y;

      if (rowIdx === 0) {
        pdf.setFillColor(245, 243, 255);
        pdf.rect(margin, rowTop, contentWidth, rowHeight, "F");
      }

      row.forEach((cell, colIdx) => {
        const cx = margin + colIdx * colWidth;
        pdf.setDrawColor(226, 232, 240);
        pdf.rect(cx, rowTop, colWidth, rowHeight);
        pdf.setFont("helvetica", rowIdx === 0 ? "bold" : "normal");
        pdf.setFontSize(fontSize);
        pdf.setTextColor(...(rowIdx === 0 ? PURPLE : SLATE_700));
        let ty = rowTop + cellPadding + 8;
        cellLines[colIdx].forEach((l) => {
          pdf.text(sanitizePdfText(l), cx + cellPadding, ty);
          ty += 12;
        });
      });

      y = rowTop + rowHeight;
    });
    y += 10;
  }

  // -------------------------------------------------------------------------
  // FIX 3 — renderMarkdownBlock now handles heading tokens (# through ####).
  // The original had NO heading branch, so "## Introduction" was passed to
  // drawRichLine and printed literally with the hash characters.
  // -------------------------------------------------------------------------
  function renderMarkdownBlock(markdownText) {
    const lines = toStringValue(markdownText).replace(/\r\n/g, "\n").split("\n");
    let i = 0;

    while (i < lines.length) {
      const raw = lines[i];
      const trimmed = raw.trim();

      // Empty line — small vertical gap
      if (!trimmed) {
        y += 6;
        i++;
        continue;
      }

      // --- FIX 3: Headings (# H1, ## H2, ### H3, #### H4) -----------------
      const headingMatch = trimmed.match(/^(#{1,4})\s+(.*)/);
      if (headingMatch) {
        const level = headingMatch[1].length;
        const headingText = sanitizePdfText(headingMatch[2]);
        // Size scale: h1=15, h2=13.5, h3=12.5, h4=11.5
        const headingSize = [15, 13.5, 12.5, 11.5][level - 1] ?? 11.5;
        const headingIndent = level > 2 ? 14 : 0;

        ensureSpace(headingSize + 12);
        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(headingSize);
        pdf.setTextColor(...PURPLE);

        const wrappedH = pdf.splitTextToSize(headingText, contentWidth - headingIndent);
        pdf.text(wrappedH, margin + headingIndent, y);
        y += wrappedH.length * (headingSize + 4);

        // Underline for h1 and h2
        if (level <= 2) {
          drawDivider(level === 1 ? contentWidth : 80);
        } else {
          y += 4;
        }

        i++;
        continue;
      }

      // Table
      if (isTableRowLine(trimmed)) {
        const tableLines = [];
        while (i < lines.length && isTableRowLine(lines[i].trim())) {
          tableLines.push(lines[i].trim());
          i++;
        }
        const rows = tableLines
          .filter((l) => !isTableSeparatorLine(l))
          .map(parseTableRow);

        if (rows.length > 1) {
          drawTable(rows);
        }
        continue;
      }

      // Horizontal rule
      if (/^(-{3,}|\*{3,}|_{3,})$/.test(trimmed)) {
        drawDivider();
        i++;
        continue;
      }

      // Blockquote
      if (/^>\s?/.test(trimmed)) {
        drawRichLine(trimmed.replace(/^>\s?/, ""), {
          indent: 14,
          color: SLATE_500,
          size: 10.5,
        });
        i++;
        continue;
      }

      // Unordered list item  (- text  or  * text)
      const bulletMatch = trimmed.match(/^[-*]\s+(.*)/);
      if (bulletMatch) {
        ensureSpace(16);
        pdf.setFont("helvetica", "normal");
        pdf.setFontSize(11);
        pdf.setTextColor(...PURPLE);
        pdf.text("\u2022", margin, y);
        drawRichLine(bulletMatch[1], { indent: 14 });
        i++;
        continue;
      }

      // Ordered list item  (1. text)
      const numMatch = trimmed.match(/^(\d+)\.\s+(.*)/);
      if (numMatch) {
        ensureSpace(16);
        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(11);
        pdf.setTextColor(...PURPLE);
        pdf.text(`${numMatch[1]}.`, margin, y);
        drawRichLine(numMatch[2], { indent: 18 });
        i++;
        continue;
      }

      // Plain paragraph text
      drawRichLine(trimmed);
      i++;
    }
  }

  // ---- Document layout ----------------------------------------------------

  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(19);
  pdf.setTextColor(...PURPLE);
  pdf.text(sanitizePdfText(title || "Summary"), margin, y);
  y += 24;

  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(10);
  pdf.setTextColor(...SLATE_500);
  pdf.text(`Generated ${formatDateTime(generatedAt)}`, margin, y);
  y += 10;

  drawDivider();
  y += 6;

  if (toStringValue(overview).trim()) {
    renderMarkdownBlock(overview);
    y += 6;
  }

  sections
    .filter((section) => toStringValue(section.content).trim())
    .forEach((section, idx) => {
      if (idx > 0) y += 8;
      ensureSpace(34);
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(14);
      pdf.setTextColor(...PURPLE);
      pdf.text(sanitizePdfText(section.heading), margin, y);
      y += 8;
      pdf.setDrawColor(233, 213, 255);
      pdf.line(margin, y, margin + 56, y);
      y += 16;
      renderMarkdownBlock(section.content);
    });

  return pdf;
}

// ---------------------------------------------------------------------------
// UI sub-components
// ---------------------------------------------------------------------------

function CompactStatCard({ icon: Icon, label, value }) {
  return (
    <div className="flex h-16 min-w-0 items-center justify-between rounded-2xl bg-[#faf5ff] dark:bg-slate-900 border border-slate-200 dark:border-slate-700 px-4 py-3">
      <div className="min-w-0">
        <p className="truncate text-[11px] font-medium text-slate-500 dark:text-slate-400">
          {label}
        </p>
        <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">
          {value}
        </p>
      </div>
      <div className="ml-3 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white dark:bg-slate-800 text-purple-600 shadow-sm">
        <Icon size={16} />
      </div>
    </div>
  );
}

function CompactActionButton({ onClick, children, icon: Icon, variant = "default", disabled = false, loading = false }) {
  const styles =
    variant === "primary"
      ? "bg-purple-600 text-white hover:bg-purple-700 disabled:hover:bg-purple-600"
      : "bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700";

  return (
    <button
      onClick={onClick}
      disabled={disabled || loading}
      className={cn(
        "flex h-11 min-w-0 items-center justify-center gap-2 rounded-2xl px-4 text-sm font-medium transition disabled:opacity-60",
        styles
      )}
    >
      {loading ? (
        <RefreshCw
          size={16}
          className={cn("animate-spin", variant === "primary" ? "text-white" : "text-purple-600")}
        />
      ) : (
        <Icon size={16} className={variant === "primary" ? "text-white" : "text-purple-600"} />
      )}
      <span className="truncate">{loading ? "Refreshing…" : children}</span>
    </button>
  );
}

function ContentShell({ children }) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-slate-50/80 p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900/40 sm:p-5">
      {children}
    </div>
  );
}

function SectionCard({ title, icon: Icon, subtitle, children }) {
  return (
    <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#161b22] p-4 shadow-sm sm:p-5">
      <div className="mb-3 flex items-center gap-2">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-purple-50 text-purple-600 dark:bg-purple-500/10 dark:text-purple-300">
          <Icon size={15} />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-slate-900 dark:text-white">{title}</p>
          {subtitle && (
            <p className="truncate text-[11px] text-slate-500 dark:text-slate-400">{subtitle}</p>
          )}
        </div>
      </div>
      {children}
    </div>
  );
}

function EmptyState({ children }) {
  return (
    <div className="flex min-h-[200px] flex-col items-center justify-center rounded-3xl border border-dashed border-slate-300 bg-slate-50 px-6 py-12 text-center text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-900/20 dark:text-slate-400">
      {children}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

/**
 * SummaryPanel
 *
 * Props
 * ─────
 * summary      – raw summary payload (string | object | null)
 * noteTitle    – used as the PDF file name and document heading
 * loading      – show skeleton while summary is being fetched
 * error        – error string to display instead of content
 * onGenerate   – called when "Generate Summary" is clicked (first-time)
 * onRefresh    – called when "Refresh" is clicked
 *               ⚠️  The PARENT is responsible for:
 *                    1. Setting summary → null  BEFORE the API call starts
 *                    2. Setting loading  → true BEFORE the API call starts
 *                   This ensures the stale memo result is cleared immediately
 *                   and the skeleton is shown during regeneration.
 * generatedAt  – ISO timestamp override (falls back to payload value)
 *
 * Parent refresh pattern (FIX 4 — documented here for integration):
 * ─────────────────────────────────────────────────────────────────
 *   async function handleRefresh() {
 *     setSummary(null);          // ← clears stale memo immediately
 *     setLoading(true);
 *     setError("");
 *     try {
 *       const data = await fetchSummary(noteId, { force: true }); // force bypasses backend cache
 *       setSummary(data);
 *     } catch (err) {
 *       setError(err.message || "Failed to regenerate summary.");
 *     } finally {
 *       setLoading(false);
 *     }
 *   }
 *
 * Backend cache bypass (FIX 5 — documented here for integration):
 * ───────────────────────────────────────────────────────────────
 *   router.post("/notes/:id/summary", async (req, res) => {
 *     const { force = false } = req.body;
 *     const note = await Note.findById(req.params.id);
 *     if (note.summary && !force) return res.json({ summary: note.summary });
 *     const fresh = await generateSummaryWithAI(note.content);
 *     note.summary = fresh;  note.generatedAt = new Date();
 *     await note.save();
 *     return res.json({ summary: note.summary, generatedAt: note.generatedAt });
 *   });
 */
export default function SummaryPanel({
  summary,
  noteTitle = "Note",
  loading = false,
  error = "",
  onGenerate,
  onRefresh,
  generatedAt,
}) {
  const [copied, setCopied] = useState(false);
  // FIX 4 — local refreshing state lets the button show a spinner even when
  // the parent doesn't immediately toggle `loading` on the first render tick.
  const [refreshing, setRefreshing] = useState(false);

  const resolved = useMemo(() => getRenderableSummary(summary), [summary]);
  const rawText = resolved?.summary || "";
  const readingTime = useMemo(() => estimateReadingTime(rawText), [rawText]);
  const wordCount = useMemo(() => countWords(rawText), [rawText]);
  const generatedDate = generatedAt || resolved?.generatedAt || new Date().toISOString();

  const keyConcepts = resolved?.keyConcepts || [];
  const importantPoints = resolved?.importantPoints || [];
  const examNotes = resolved?.examNotes || [];
  const quickRevision = resolved?.quickRevision || "";
  const vivaQuestions = resolved?.vivaQuestions || [];

  async function handleCopy() {
    if (!rawText.trim()) return;
    try {
      await navigator.clipboard.writeText(rawText);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  }

  // FIX 4 — handleRefresh sets local `refreshing` so the button gives
  // immediate visual feedback regardless of parent re-render timing.
  async function handleRefresh() {
    if (!onRefresh) return;
    setRefreshing(true);
    try {
      await onRefresh();
    } finally {
      setRefreshing(false);
    }
  }

  function handlePdf() {
    if (!resolved?.hasContent) return;
    const pdf = buildStudyGuidePdf({
      title: noteTitle,
      generatedAt: generatedDate,
      overview: rawText,
      sections: [
        {
          heading: "Key Concepts",
          content: keyConcepts.map((c) => `- ${c}`).join("\n"),
        },
        {
          heading: "Important Points",
          content: importantPoints.map((c) => `- ${c}`).join("\n"),
        },
        {
          heading: "Exam Notes",
          content: examNotes.join("\n\n"),
        },
        {
          heading: "Quick Revision",
          content: quickRevision,
        },
        {
          heading: "Viva Questions",
          content: vivaQuestions.map((q, i) => `${i + 1}. ${q}`).join("\n"),
        },
      ],
    });
    pdf.save(`${(noteTitle || "summary").replace(/[\\/:*?"<>|]/g, "_")}.pdf`);
  }

  const stats = [
    { icon: Clock3, label: "Reading Time", value: `${readingTime} min` },
    { icon: BookOpen, label: "Word Count", value: wordCount.toLocaleString() },
    { icon: FileText, label: "Generated Date", value: formatDateTime(generatedDate) },
  ];

  // ── Loading skeleton ──────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="space-y-3">
        <div className="grid gap-3 sm:grid-cols-3">
          {stats.map((_, i) => (
            <div key={i} className="h-16 animate-pulse rounded-2xl bg-[#faf5ff] dark:bg-slate-900 border border-slate-200 dark:border-slate-700" />
          ))}
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-11 animate-pulse rounded-2xl bg-slate-100 dark:bg-slate-800" />
          ))}
        </div>
        <div className="h-72 animate-pulse rounded-3xl bg-slate-100 dark:bg-slate-800" />
      </div>
    );
  }

  // ── Error state ───────────────────────────────────────────────────────────
  if (error) {
    return (
      <div className="space-y-3">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-white">
          Summary
        </h1>
        <div className="break-words rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-200">
          {error}
        </div>
        {onRefresh && (
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:opacity-60"
          >
            <RefreshCw size={15} className={cn("text-purple-600", refreshing && "animate-spin")} />
            {refreshing ? "Retrying…" : "Try Again"}
          </button>
        )}
      </div>
    );
  }

  // ── Empty / not-yet-generated state ──────────────────────────────────────
  if (!resolved?.hasContent) {
    return (
      <div className="space-y-3">
        <EmptyState>
          <Sparkles size={28} className="mb-3 text-purple-400" />
          <p className="mb-1 font-medium text-slate-700 dark:text-slate-200">No summary yet</p>
          <p className="mb-4 text-xs text-slate-400">
            Generate a study guide from your notes in one click.
          </p>
          {onGenerate && (
            <button
              onClick={onGenerate}
              className="inline-flex items-center gap-2 rounded-2xl bg-purple-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-purple-700"
            >
              <Sparkles size={15} />
              Generate Summary
            </button>
          )}
        </EmptyState>
      </div>
    );
  }

  // ── Section definitions ───────────────────────────────────────────────────
  const sectionDefs = [
    {
      key: "keyConcepts",
      title: "Key Concepts",
      icon: BookOpen,
      subtitle: "Main ideas to memorise",
      isEmpty: keyConcepts.length === 0,
      content: (
        <div className="grid gap-3 sm:grid-cols-2">
          {keyConcepts.map((item, idx) => (
            <div
              key={idx}
              className="break-words rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-4 text-sm text-slate-700 dark:text-slate-300 shadow-sm"
            >
              {item}
            </div>
          ))}
        </div>
      ),
    },
    {
      key: "importantPoints",
      title: "Important Points",
      icon: Target,
      subtitle: "High-priority takeaways",
      isEmpty: importantPoints.length === 0,
      content: (
        <div className="space-y-3">
          {importantPoints.map((item, idx) => (
            <div
              key={idx}
              className="break-words rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-4 text-sm text-slate-700 dark:text-slate-300 shadow-sm"
            >
              {item}
            </div>
          ))}
        </div>
      ),
    },
    {
      key: "examNotes",
      title: "Exam Notes",
      icon: Lightbulb,
      subtitle: "Revision-friendly reminders",
      isEmpty: examNotes.length === 0,
      content: (
        <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
          {examNotes.join("\n\n")}
        </ReactMarkdown>
      ),
    },
    {
      key: "quickRevision",
      title: "Quick Revision",
      icon: FileText,
      subtitle: "Last-minute review notes",
      isEmpty: !quickRevision.trim(),
      content: (
        <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
          {quickRevision}
        </ReactMarkdown>
      ),
    },
    {
      key: "vivaQuestions",
      title: "Viva Questions",
      icon: MessageSquareText,
      subtitle: "Oral exam prep",
      full: true,
      isEmpty: vivaQuestions.length === 0,
      content: (
        <div className="space-y-3">
          {vivaQuestions.map((q, idx) => (
            <div
              key={idx}
              className="flex items-start gap-3 break-words rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-4 text-sm text-slate-700 dark:text-slate-300 shadow-sm"
            >
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-purple-500/10 text-xs font-semibold text-purple-700 dark:text-purple-300">
                {idx + 1}
              </span>
              <span className="break-words">{q}</span>
            </div>
          ))}
        </div>
      ),
    },
  ];

  const visibleSections = sectionDefs.filter((s) => !s.isEmpty);

  // ── Main render ───────────────────────────────────────────────────────────
  return (
    <div className="w-full max-w-full space-y-3 overflow-x-hidden">

      {/* Stat cards */}
      <div className="grid gap-3 sm:grid-cols-3">
        {stats.map((item) => (
          <CompactStatCard key={item.label} icon={item.icon} label={item.label} value={item.value} />
        ))}
      </div>

      {/* Action buttons */}
      <div className="grid gap-3 sm:grid-cols-3">
        <CompactActionButton icon={copied ? Check : Copy} onClick={handleCopy} variant="ghost">
          {copied ? "Copied!" : "Copy Notes"}
        </CompactActionButton>

        {/* FIX 4 — Refresh button shows spinner via local `refreshing` state */}
        <CompactActionButton
          icon={RefreshCw}
          onClick={handleRefresh}
          variant="ghost"
          disabled={refreshing}
          loading={refreshing}
        >
          Refresh
        </CompactActionButton>

        <CompactActionButton icon={Download} onClick={handlePdf} variant="primary">
          Download PDF
        </CompactActionButton>
      </div>

      {/* Main markdown content + section cards */}
      <ContentShell>
        <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
          {rawText}
        </ReactMarkdown>

        {visibleSections.length > 0 && (
          <div className="mt-5 grid grid-cols-1 gap-4 sm:gap-5 lg:grid-cols-2">
            {visibleSections.map((section) => (
              <div key={section.key} className={section.full ? "lg:col-span-2" : undefined}>
                <SectionCard
                  title={section.title}
                  icon={section.icon}
                  subtitle={section.subtitle}
                >
                  {section.content}
                </SectionCard>
              </div>
            ))}
          </div>
        )}
      </ContentShell>
    </div>
  );
}