import React, { useMemo, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { jsPDF } from "jspdf";
import {
  Lightbulb,
  Clock3,
  Copy,
  Check,
  RefreshCw,
  Download,
  BookOpen,
  FileText,
} from "lucide-react";

// ─── Utilities ───────────────────────────────────────────────────────────────

function cn(...classes) {
  return classes.filter(Boolean).join(" ");
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

// ─── Data normalisation ───────────────────────────────────────────────────────

function normalizeSimplifyPayload(input) {
  if (input == null) return null;
  if (typeof input === "string") {
    return { content: input, generatedAt: new Date().toISOString() };
  }
  const source =
    input.simplify ||
    input.simplified ||
    input.simplifiedContent ||
    input.data?.simplify ||
    input.data?.simplified ||
    input.data ||
    input.result ||
    input.response ||
    input.output ||
    input.content ||
    input.text ||
    input;
  if (typeof source === "string") {
    return {
      content: source,
      generatedAt: input.generatedAt || input.createdAt || new Date().toISOString(),
    };
  }
  if (!source || typeof source !== "object" || Array.isArray(source)) return null;
  return {
    content:
      source.simplify ||
      source.simplified ||
      source.simplifiedContent ||
      source.content ||
      source.text ||
      source.summary ||
      source.output ||
      source.message ||
      "",
    generatedAt:
      source.generatedAt ||
      source.createdAt ||
      source.timestamp ||
      input.generatedAt ||
      input.createdAt ||
      new Date().toISOString(),
  };
}

function getRenderableSimplify(input) {
  const normalized = normalizeSimplifyPayload(input);
  if (!normalized) return null;
  const content = toStringValue(normalized.content);
  return { ...normalized, content, hasContent: Boolean(content.trim()) };
}

// ─── Unicode sanitizer for jsPDF helvetica ────────────────────────────────────
// jsPDF's built-in helvetica cannot encode arrows, curly quotes, em-dashes, etc.
// Replace them with safe ASCII equivalents before any PDF text operation.

function sanitizeForPdf(text) {
  return toStringValue(text)
    .replace(/→/g, "->")
    .replace(/←/g, "<-")
    .replace(/↑/g, "^")
    .replace(/↓/g, "v")
    .replace(/⇒/g, "=>")
    .replace(/⇐/g, "<=")
    .replace(/–/g, "-")
    .replace(/—/g, "--")
    .replace(/\u2018|\u2019/g, "'")   // curly single quotes
    .replace(/\u201C|\u201D/g, '"')   // curly double quotes
    .replace(/…/g, "...")
    .replace(/•/g, "*")
    .replace(/✓/g, "✓".normalize("NFKD").replace(/[^\x00-\x7F]/g, ""))
    // Strip any remaining non-latin-1 characters jsPDF can't handle
    .replace(/[^\x00-\xFF]/g, "?");
}

// ─── Strip markdown formatting from plain-text contexts (e.g. table cells) ───

function sanitizeCell(text) {
  return sanitizeForPdf(text || "")
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .replace(/__(.*?)__/g, "$1")
    .replace(/\*(.*?)\*/g, "$1")
    .replace(/_(.*?)_/g, "$1")
    .replace(/`([^`]+)`/g, "$1");
}

// ─── Markdown → AST parser ───────────────────────────────────────────────────

function parseInlines(raw) {
  const nodes = [];
  const re = /(\*\*|__)(.*?)\1|(\*|_)(.*?)\3|`([^`]+)`|\[([^\]]+)\]\(([^)]+)\)/g;
  let last = 0;
  let m;
  while ((m = re.exec(raw)) !== null) {
    if (m.index > last) {
      nodes.push({ type: "text", text: raw.slice(last, m.index) });
    }
    if (m[1]) {
      nodes.push({ type: "bold", text: m[2] });
    } else if (m[3]) {
      nodes.push({ type: "italic", text: m[4] });
    } else if (m[5] !== undefined) {
      nodes.push({ type: "code", text: m[5] });
    } else if (m[6] !== undefined) {
      nodes.push({ type: "link", text: m[6], href: m[7] });
    }
    last = re.lastIndex;
  }
  if (last < raw.length) {
    nodes.push({ type: "text", text: raw.slice(last) });
  }
  return nodes;
}

function inlinesToPlainText(inlines) {
  return inlines.map((n) => n.text).join("");
}

function parseMarkdownToBlocks(markdown) {
  // Sanitize unicode chars that jsPDF's helvetica cannot encode
  const raw = sanitizeForPdf(toStringValue(markdown)).replace(/\r\n/g, "\n");
  const lines = raw.split("\n");
  const blocks = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    // Blank line
    if (!trimmed) {
      blocks.push({ type: "blank" });
      i++;
      continue;
    }

    // Fenced code block
    if (/^```/.test(trimmed)) {
      const lang = trimmed.slice(3).trim();
      const codeLines = [];
      i++;
      while (i < lines.length && !/^```/.test(lines[i].trim())) {
        codeLines.push(lines[i]);
        i++;
      }
      i++; // closing ```
      blocks.push({ type: "code", text: codeLines.join("\n"), lang });
      continue;
    }

    // HR
    if (/^(-{3,}|\*{3,}|_{3,})$/.test(trimmed)) {
      blocks.push({ type: "hr" });
      i++;
      continue;
    }

    // Heading
    const headingMatch = trimmed.match(/^(#{1,6})\s+(.*)/);
    if (headingMatch) {
      blocks.push({
        type: "heading",
        level: headingMatch[1].length,
        inlines: parseInlines(headingMatch[2]),
      });
      i++;
      continue;
    }

    // Table — detect by leading |
    if (/^\|/.test(trimmed)) {
      const tableLines = [];
      while (i < lines.length && /^\|/.test(lines[i].trim())) {
        tableLines.push(lines[i].trim());
        i++;
      }
      const parseRow = (row) =>
        row
          .replace(/^\||\|$/g, "")
          .split("|")
          .map((c) => c.trim());

      if (tableLines.length >= 2) {
        const headers = parseRow(tableLines[0]);
        const rows = tableLines.slice(2).map(parseRow);
        blocks.push({ type: "table", headers, rows });
      }
      continue;
    }

    // Blockquote
    if (/^>\s?/.test(trimmed)) {
      const quoteLines = [];
      while (i < lines.length && /^>\s?/.test(lines[i].trim())) {
        quoteLines.push(lines[i].trim().replace(/^>\s?/, ""));
        i++;
      }
      blocks.push({ type: "blockquote", inlines: parseInlines(quoteLines.join(" ")) });
      continue;
    }

    // Bullet list item
    const bulletMatch = trimmed.match(/^([-*+])\s+(.*)/);
    if (bulletMatch) {
      const depth = Math.floor((line.match(/^(\s*)/)[1].length) / 2);
      blocks.push({ type: "bullet", inlines: parseInlines(bulletMatch[2]), depth });
      i++;
      continue;
    }

    // Ordered list item
    const orderedMatch = trimmed.match(/^(\d+)\.\s+(.*)/);
    if (orderedMatch) {
      const depth = Math.floor((line.match(/^(\s*)/)[1].length) / 2);
      blocks.push({
        type: "ordered",
        number: orderedMatch[1],
        inlines: parseInlines(orderedMatch[2]),
        depth,
      });
      i++;
      continue;
    }

    // Paragraph — collect consecutive non-special lines
    const paraLines = [];
    while (
      i < lines.length &&
      lines[i].trim() &&
      !/^(#{1,6}\s|[-*+]\s|\d+\.\s|>|\|{1}|```|---|===|\*{3}|_{3})/.test(lines[i].trim())
    ) {
      paraLines.push(lines[i].trim());
      i++;
    }
    if (paraLines.length) {
      blocks.push({ type: "paragraph", inlines: parseInlines(paraLines.join(" ")) });
    } else {
      i++; // safety
    }
  }

  return blocks;
}

// ─── PDF renderer ────────────────────────────────────────────────────────────

function buildSimplifyPdf({ title, generatedAt, content }) {
  const pdf = new jsPDF({ unit: "pt", format: "a4" });
  const PW = pdf.internal.pageSize.getWidth();
  const PH = pdf.internal.pageSize.getHeight();
  const ML = 52;
  const MR = 52;
  const MT = 52;
  const MB = 52;
  const CW = PW - ML - MR;
  let y = MT;

  // ── Palette ───
  const C_PURPLE = [88, 28, 135];
  const C_PURPLE_MID = [124, 58, 237];
  const C_SLATE_900 = [15, 23, 42];
  const C_SLATE_700 = [51, 65, 85];
  const C_SLATE_500 = [100, 116, 139];
  const C_SLATE_300 = [203, 213, 225];
  const C_SLATE_100 = [241, 245, 249];
  const C_PURPLE_TINT = [237, 233, 254];
  const C_WHITE = [255, 255, 255];

  // ── Page management ───────────────────────────────────────────────────────

  function newPage() {
    drawPageFooter();
    pdf.addPage();
    y = MT;
    drawPageHeader();
  }

  function ensureY(needed) {
    if (y + needed > PH - MB) newPage();
  }

  let pageHeaderDrawn = false;

  function drawPageHeader() {
    if (pageHeaderDrawn) {
      pdf.setFont("helvetica", "italic");
      pdf.setFontSize(8);
      pdf.setTextColor(...C_SLATE_500);
      pdf.text(sanitizeForPdf(toStringValue(title)) || "Study Guide", ML, MT - 18);
      pdf.setDrawColor(...C_SLATE_300);
      pdf.line(ML, MT - 10, ML + CW, MT - 10);
    }
  }

  function drawPageFooter() {
    const pageNum = pdf.internal.getCurrentPageInfo().pageNumber;
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(8);
    pdf.setTextColor(...C_SLATE_500);
    const label = `Page ${pageNum}`;
    const lw = pdf.getTextWidth(label);
    pdf.text(label, PW - MR - lw, PH - 24);
    pdf.setDrawColor(...C_SLATE_300);
    pdf.line(ML, PH - 34, ML + CW, PH - 34);
  }

  // ── Low-level drawing ─────────────────────────────────────────────────────

  /**
   * Sets font state AND wraps text. Font is left active after this call
   * so pdf.text() uses the exact same metrics — never call setFont/setFontSize
   * between this and the actual pdf.text() calls.
   */
  function wrapText(text, maxW, fontSize, fontStyle = "normal") {
    pdf.setFont("helvetica", fontStyle);
    pdf.setFontSize(fontSize);
    return pdf.splitTextToSize(sanitizeForPdf(text), maxW);
  }

  /**
   * Draws pre-wrapped lines using the font state already set by wrapText.
   * Does NOT call setFont/setFontSize — that would corrupt jsPDF's glyph cache
   * and cause the &X& garbled-text bug on headings.
   */
  function drawLines(lines, x, color, lineH) {
    pdf.setTextColor(...color);
    for (const ln of lines) {
      ensureY(lineH);
      pdf.text(ln, x, y);
      y += lineH;
    }
  }

  /**
   * Draws inline nodes with font switching (bold/italic/code/link/text).
   * Handles word-level wrapping within maxW.
   */
  function drawInlines(inlines, {
    x = ML,
    maxW = CW,
    fontSize = 11,
    baseColor = C_SLATE_700,
    lineH = 16,
  } = {}) {
    const segments = inlines.map((n) => {
      switch (n.type) {
        case "bold": return { text: sanitizeForPdf(n.text), bold: true, color: C_SLATE_900 };
        case "italic": return { text: sanitizeForPdf(n.text), italic: true, color: baseColor };
        case "code": return { text: sanitizeForPdf(n.text), mono: true, color: C_PURPLE_MID };
        case "link": return { text: sanitizeForPdf(n.text), color: C_PURPLE_MID };
        default: return { text: sanitizeForPdf(n.text), color: baseColor };
      }
    });

    let lineTokens = [];
    let lineWidth = 0;

    function flushLine(isLast) {
      if (!lineTokens.length) return;
      ensureY(lineH);
      let cx = x;
      for (const tok of lineTokens) {
        const style = tok.bold ? "bold" : tok.italic ? "italic" : "normal";
        const family = tok.mono ? "courier" : "helvetica";
        pdf.setFont(family, style);
        pdf.setFontSize(fontSize);
        pdf.setTextColor(...tok.color);
        pdf.text(tok.text, cx, y);
        cx += pdf.getTextWidth(tok.text);
      }
      if (!isLast) y += lineH;
      lineTokens = [];
      lineWidth = 0;
    }

    for (const seg of segments) {
      const style = seg.bold ? "bold" : seg.italic ? "italic" : "normal";
      const family = seg.mono ? "courier" : "helvetica";
      pdf.setFont(family, style);
      pdf.setFontSize(fontSize);

      const words = seg.text.split(/(\s+)/);
      for (const word of words) {
        const ww = pdf.getTextWidth(word);
        if (lineWidth + ww > maxW && word.trim() !== "") {
          flushLine(false);
          y += lineH;
        }
        lineTokens.push({ ...seg, text: word });
        lineWidth += ww;
      }
    }
    flushLine(true);
    y += lineH;
  }

  // ── Block renderers ───────────────────────────────────────────────────────

  function renderHeading(block) {
    const { level, inlines } = block;
    const plain = inlinesToPlainText(inlines); // sanitizeForPdf runs inside wrapText

    const cfg = {
      1: { size: 22, lh: 28, color: C_PURPLE, weight: "bold", spaceAbove: 14, spaceBelow: 6 },
      2: { size: 17, lh: 22, color: C_PURPLE, weight: "bold", spaceAbove: 12, spaceBelow: 4 },
      3: { size: 14, lh: 19, color: C_SLATE_900, weight: "bold", spaceAbove: 10, spaceBelow: 3 },
      4: { size: 12, lh: 17, color: C_SLATE_900, weight: "bold", spaceAbove: 8, spaceBelow: 2 },
      5: { size: 11, lh: 15, color: C_SLATE_700, weight: "bold", spaceAbove: 6, spaceBelow: 2 },
      6: { size: 10, lh: 14, color: C_SLATE_500, weight: "bold", spaceAbove: 6, spaceBelow: 2 },
    }[level] || { size: 11, lh: 16, color: C_SLATE_700, weight: "bold", spaceAbove: 4, spaceBelow: 2 };

    y += cfg.spaceAbove;

    // wrapText sets font state; we draw immediately after without any setFont call
    // in between — this prevents the &X& garbled heading bug.
    const lines = wrapText(plain, CW, cfg.size, cfg.weight);
    ensureY(lines.length * cfg.lh + cfg.spaceBelow);

    pdf.setTextColor(...cfg.color);
    for (const ln of lines) {
      pdf.text(ln, ML, y);
      y += cfg.lh;
    }

    if (level <= 2) {
      const underlineColor = level === 1 ? C_PURPLE : C_SLATE_300;
      pdf.setDrawColor(...underlineColor);
      pdf.setLineWidth(level === 1 ? 1.5 : 0.75);
      pdf.line(ML, y, ML + CW, y);
      pdf.setLineWidth(0.5);
      y += 6;
    }
    y += cfg.spaceBelow;
  }

  function renderParagraph(block) {
    y += 2;
    drawInlines(block.inlines, { fontSize: 11, lineH: 16, baseColor: C_SLATE_700 });
    y += 4;
  }

  function renderBullet(block) {
    const indent = ML + block.depth * 14;
    const bulletX = indent;
    const textX = indent + 12;
    const maxW = CW - (textX - ML);
    const plain = inlinesToPlainText(block.inlines);
    const lines = wrapText(plain, maxW, 11);

    ensureY(lines.length * 16 + 2);
    // Bullet dot
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(11);
    pdf.setTextColor(...C_PURPLE);
    pdf.text("\u2022", bulletX, y);

    const savedY = y;
    drawInlines(block.inlines, { x: textX, maxW, fontSize: 11, lineH: 16, baseColor: C_SLATE_700 });
    if (y <= savedY) y += 16;
    y += 1;
  }

  function renderOrdered(block) {
    const indent = ML + block.depth * 14;
    const numText = `${block.number}.`;
    const textX = indent + 18;
    const maxW = CW - (textX - ML);

    ensureY(18);
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(11);
    pdf.setTextColor(...C_PURPLE);
    pdf.text(numText, indent, y);

    drawInlines(block.inlines, { x: textX, maxW, fontSize: 11, lineH: 16, baseColor: C_SLATE_700 });
    y += 1;
  }

  function renderBlockquote(block) {
    const textX = ML + 14;
    const maxW = CW - 20;
    const plain = inlinesToPlainText(block.inlines);

    // Set font ONCE before splitTextToSize — never reset between split and draw
    pdf.setFont("helvetica", "italic");
    pdf.setFontSize(10.5);
    const lines = pdf.splitTextToSize(sanitizeForPdf(plain), maxW);

    const LINE_H = 15;
    const PADDING = 8;
    const blockH = lines.length * LINE_H + PADDING * 2;

    ensureY(blockH + 10);

    // Background fill
    pdf.setFillColor(...C_PURPLE_TINT);
    pdf.roundedRect(ML, y, CW, blockH, 4, 4, "F");
    // Left accent bar
    pdf.setFillColor(...C_PURPLE_MID);
    pdf.rect(ML, y, 3, blockH, "F");

    // Draw lines — font already set above, do not reset
    pdf.setTextColor(...C_SLATE_700);
    let ty = y + PADDING + LINE_H - 3;
    for (const ln of lines) {
      pdf.text(ln, textX, ty);
      ty += LINE_H;
    }
    y += blockH + 6;
  }

  function renderHr() {
    y += 6;
    ensureY(8);
    pdf.setDrawColor(...C_SLATE_300);
    pdf.setLineWidth(0.75);
    pdf.line(ML, y, ML + CW, y);
    pdf.setLineWidth(0.5);
    y += 10;
  }

  function renderCode(block) {
    const lines = block.text.split("\n");
    const lineH = 13;
    const padding = 10;
    const blockH = lines.length * lineH + padding * 2 + (block.lang ? 14 : 0);

    ensureY(blockH);

    pdf.setFillColor(30, 41, 59);
    pdf.roundedRect(ML, y - 2, CW, blockH, 4, 4, "F");

    let textY = y + padding + (block.lang ? 14 : 0);
    if (block.lang) {
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(7.5);
      pdf.setTextColor(148, 163, 184);
      pdf.text(sanitizeForPdf(block.lang.toUpperCase()), ML + padding, y + 10);
      pdf.setDrawColor(51, 65, 85);
      pdf.line(ML, y + 14, ML + CW, y + 14);
    }

    pdf.setFont("courier", "normal");
    pdf.setFontSize(9);
    pdf.setTextColor(226, 232, 240);
    for (const ln of lines) {
      const wrapped = pdf.splitTextToSize(sanitizeForPdf(ln) || " ", CW - padding * 2);
      for (const wl of wrapped) {
        ensureY(lineH);
        pdf.text(wl, ML + padding, textY);
        textY += lineH;
        y += lineH;
      }
    }
    y = textY + padding;
    y += 6;
  }

  function renderTable(block) {
    const { headers, rows } = block;
    const allRows = [headers, ...rows];
    const colCount = headers.length;

    const CELL_PAD_X = 8;
    const CELL_PAD_Y = 6;
    const FONT_SIZE = 9.5;
    const LINE_H = 13;

    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(FONT_SIZE);

    const minColW = CW / colCount;
    const maxContentW = headers.map((h, ci) => {
      let max = pdf.getTextWidth(sanitizeCell(h));
      for (const row of rows) {
        const cell = sanitizeCell(row[ci] || "");
        const w = pdf.getTextWidth(cell);
        if (w > max) max = w;
      }
      return max + CELL_PAD_X * 2;
    });

    const totalMax = maxContentW.reduce((s, w) => s + w, 0);
    const colWidths = maxContentW.map((w) =>
      Math.max(minColW * 0.5, (w / totalMax) * CW)
    );
    const diff = CW - colWidths.reduce((s, w) => s + w, 0);
    colWidths[colWidths.length - 1] += diff;

    function measureRow(rowCells, fontStyle = "normal") {
      let maxLines = 1;
      rowCells.forEach((cell, ci) => {
        pdf.setFont("helvetica", fontStyle);
        pdf.setFontSize(FONT_SIZE);
        const lines = pdf.splitTextToSize(sanitizeCell(cell), colWidths[ci] - CELL_PAD_X * 2);
        if (lines.length > maxLines) maxLines = lines.length;
      });
      return maxLines * LINE_H + CELL_PAD_Y * 2;
    }

    const rowHeights = allRows.map((row, ri) =>
      measureRow(row, ri === 0 ? "bold" : "normal")
    );

    const tableH = rowHeights.reduce((s, h) => s + h, 0);

    if (y + tableH > PH - MB - 10) {
      if (tableH < PH - MT - MB - 10) {
        newPage();
      }
    }

    y += 4;

    allRows.forEach((rowCells, ri) => {
      const isHeader = ri === 0;
      const rowH = rowHeights[ri];

      if (!isHeader && y + rowH > PH - MB) {
        newPage();
        drawTableRow(allRows[0], colWidths, rowHeights[0], CELL_PAD_X, CELL_PAD_Y, FONT_SIZE, LINE_H, true);
        y += rowHeights[0];
      }

      drawTableRow(rowCells, colWidths, rowH, CELL_PAD_X, CELL_PAD_Y, FONT_SIZE, LINE_H, isHeader);
      y += rowH;
    });

    y += 8;
  }

  function drawTableRow(cells, colWidths, rowH, padX, padY, fontSize, lineH, isHeader) {
    let cx = ML;
    cells.forEach((cell, ci) => {
      // Cell background
      if (isHeader) {
        pdf.setFillColor(...C_PURPLE_TINT);
        pdf.rect(cx, y, colWidths[ci], rowH, "F");
      } else if (ci % 2 === 0) {
        pdf.setFillColor(...C_SLATE_100);
        pdf.rect(cx, y, colWidths[ci], rowH, "F");
      } else {
        pdf.setFillColor(...C_WHITE);
        pdf.rect(cx, y, colWidths[ci], rowH, "F");
      }

      // Border
      pdf.setDrawColor(...C_SLATE_300);
      pdf.setLineWidth(0.5);
      pdf.rect(cx, y, colWidths[ci], rowH, "S");

      // Text — sanitizeCell strips **bold**, *italic*, `code` markdown
      pdf.setFont("helvetica", isHeader ? "bold" : "normal");
      pdf.setFontSize(fontSize);
      pdf.setTextColor(...(isHeader ? C_PURPLE : C_SLATE_700));
      const cleanCell = sanitizeCell(cell);
      const lines = pdf.splitTextToSize(cleanCell, colWidths[ci] - padX * 2);
      lines.forEach((ln, li) => {
        pdf.text(ln, cx + padX, y + padY + lineH * li + lineH - 3);
      });

      cx += colWidths[ci];
    });
  }

  // ── Cover / title block ───────────────────────────────────────────────────

  function drawCoverHeader() {
    pdf.setFillColor(...C_PURPLE);
    pdf.rect(0, 0, PW, 6, "F");

    y = MT + 4;

    const titleText = sanitizeForPdf(toStringValue(title)) || "Simplified Note";
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(24);
    pdf.setTextColor(...C_PURPLE);
    const titleLines = pdf.splitTextToSize(titleText, CW);
    titleLines.forEach((ln) => {
      pdf.text(ln, ML, y);
      y += 30;
    });

    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(9.5);
    pdf.setTextColor(...C_SLATE_500);
    pdf.text(`Study Guide  |  Generated ${formatDateTime(generatedAt)}`, ML, y);
    y += 8;

    pdf.setDrawColor(...C_PURPLE);
    pdf.setLineWidth(1);
    pdf.line(ML, y, ML + CW, y);
    pdf.setLineWidth(0.5);
    y += 18;

    pageHeaderDrawn = true;
  }

  // ── Main render loop ──────────────────────────────────────────────────────

  drawCoverHeader();

  const blocks = parseMarkdownToBlocks(content);

  for (const block of blocks) {
    switch (block.type) {
      case "heading": renderHeading(block); break;
      case "paragraph": renderParagraph(block); break;
      case "bullet": renderBullet(block); break;
      case "ordered": renderOrdered(block); break;
      case "blockquote": renderBlockquote(block); break;
      case "hr": renderHr(); break;
      case "code": renderCode(block); break;
      case "table": renderTable(block); break;
      case "blank": y += 5; break;
      default: break;
    }
  }

  drawPageFooter();

  return pdf;
}

// ─── React UI components ──────────────────────────────────────────────────────

function EmptyState({ children }) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-4 text-sm text-slate-500 dark:border-slate-800 dark:bg-slate-900/40 dark:text-slate-400">
      {children}
    </div>
  );
}

function MarkdownTable({ children }) {
  return (
    <div className="my-4 max-w-full overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800">
      <table className="w-full min-w-full border-collapse bg-white dark:bg-slate-900">{children}</table>
    </div>
  );
}

const markdownComponents = {
  h1: ({ children }) => (
    <h2 className="mb-3 mt-5 break-words text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
      {children}
    </h2>
  ),
  h2: ({ children }) => (
    <h3 className="mb-2 mt-5 break-words text-xl font-semibold text-slate-900 dark:text-white">
      {children}
    </h3>
  ),
  h3: ({ children }) => (
    <h4 className="mb-2 mt-4 break-words text-lg font-semibold text-purple-700 dark:text-purple-300">
      {children}
    </h4>
  ),
  h4: ({ children }) => (
    <h5 className="mb-2 mt-4 break-words text-base font-semibold text-slate-800 dark:text-slate-100">
      {children}
    </h5>
  ),
  h5: ({ children }) => (
    <h6 className="mb-1.5 mt-3 break-words text-sm font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-300">
      {children}
    </h6>
  ),
  h6: ({ children }) => (
    <p className="mb-1.5 mt-3 break-words text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
      {children}
    </p>
  ),
  p: ({ children }) => (
    <p className="mb-3 break-words text-sm leading-7 text-slate-700 dark:text-slate-300">
      {children}
    </p>
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
  li: ({ children, className }) => {
    if (className?.includes("task-list-item")) {
      return <li className="flex items-start gap-2 break-words pl-1">{children}</li>;
    }
    return <li className="break-words pl-1">{children}</li>;
  },
  input: ({ checked }) => (
    <input
      type="checkbox"
      checked={!!checked}
      readOnly
      className="mr-1.5 mt-1 h-3.5 w-3.5 shrink-0 accent-purple-600"
    />
  ),
  a: ({ href, children }) => (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="font-medium text-purple-600 underline decoration-purple-300 underline-offset-2 transition-colors hover:text-purple-700 dark:text-purple-300 dark:decoration-purple-700"
    >
      {children}
    </a>
  ),
  img: ({ src, alt }) => (
    <img
      src={src}
      alt={alt}
      loading="lazy"
      className="my-3 max-w-full rounded-xl border border-slate-200 dark:border-slate-800"
    />
  ),
  del: ({ children }) => <del className="text-slate-400 dark:text-slate-500">{children}</del>,
  strong: ({ children }) => (
    <strong className="font-semibold text-slate-900 dark:text-white">{children}</strong>
  ),
  blockquote: ({ children }) => (
    <blockquote className="my-4 break-words border-l-4 border-purple-500/30 bg-purple-500/5 px-4 py-3 text-sm text-slate-700 dark:text-slate-300">
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
    <th className="break-words px-4 py-3 text-left text-sm font-semibold text-slate-700 dark:text-purple-200">
      {children}
    </th>
  ),
  td: ({ children }) => (
    <td className="break-words px-4 py-3 align-top text-sm text-slate-700 dark:text-slate-300">
      {children}
    </td>
  ),
  code: ({ className, children }) => {
    const raw = Array.isArray(children) ? children.join("") : String(children ?? "");
    const match = /language-(\w+)/.exec(className || "");
    const isInline = !match && !raw.includes("\n");
    if (isInline) {
      return (
        <code className="break-words rounded-md bg-slate-200/80 px-1.5 py-0.5 font-mono text-[0.85em] text-purple-700 dark:bg-slate-800 dark:text-purple-300">
          {raw}
        </code>
      );
    }
    return (
      <pre className="mb-4 max-w-full overflow-x-auto rounded-2xl border border-slate-200 bg-slate-950 p-4 text-xs leading-6 text-slate-100 sm:text-sm sm:leading-7 dark:border-slate-800">
        <code>{raw.replace(/\n$/, "")}</code>
      </pre>
    );
  },
};

// ─── Main export ──────────────────────────────────────────────────────────────

export default function SimplifyPanel({
  data,
  noteTitle = "Note",
  loading = false,
  error = "",
  onGenerate,
  generatedAt,
  onRefresh,
}) {
  const [copied, setCopied] = useState(false);

  const resolved = useMemo(() => getRenderableSimplify(data), [data]);
  const rawText = resolved?.content || "";
  const readingTime = useMemo(() => estimateReadingTime(rawText), [rawText]);
  const wordCount = useMemo(() => countWords(rawText), [rawText]);
  const generatedDate = generatedAt || resolved?.generatedAt || new Date().toISOString();

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

  const handleRefresh = () => {
    if (typeof onRefresh === "function") onRefresh();
  };

  function handlePdf() {
    if (!resolved?.hasContent) return;
    const pdf = buildSimplifyPdf({
      title: noteTitle,
      generatedAt: generatedDate,
      content: rawText,
    });
    pdf.save(`${(noteTitle || "simplified").replace(/[\\/:*?"<>|]/g, "_")}-simplified.pdf`);
  }

  // ── Loading skeleton ───────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="w-full max-w-full space-y-4 sm:space-y-5">
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 animate-pulse rounded-3xl bg-slate-200/70" />
          ))}
        </div>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-11 animate-pulse rounded-2xl bg-slate-200/70" />
          ))}
        </div>
        <div className="rounded-[32px] border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#161b22] p-8 shadow-sm sm:p-10">
          <div className="space-y-3">
            <div className="h-4 w-2/5 animate-pulse rounded-full bg-slate-200" />
            <div className="h-3 w-4/5 animate-pulse rounded-full bg-slate-200" />
            <div className="h-3 w-3/5 animate-pulse rounded-full bg-slate-200" />
            <div className="mt-5 h-3 w-full animate-pulse rounded-full bg-slate-200" />
            <div className="h-3 w-[92%] animate-pulse rounded-full bg-slate-200" />
            <div className="h-3 w-[84%] animate-pulse rounded-full bg-slate-200" />
          </div>
        </div>
      </div>
    );
  }

  // ── Error state ────────────────────────────────────────────────────────────
  if (error) {
    return (
      <div className="rounded-[32px] border border-rose-200 bg-rose-50 p-6 shadow-sm">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white text-rose-600 shadow-sm">
            <RefreshCw size={18} />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="text-sm font-semibold text-rose-900">Unable to load simplified notes</h3>
            <p className="mt-1 text-sm leading-6 text-rose-700">{error}</p>
            <button
              type="button"
              onClick={handleRefresh}
              className="mt-4 inline-flex items-center gap-2 rounded-2xl bg-white px-4 py-2.5 text-sm font-medium text-rose-700 shadow-sm transition hover:bg-rose-100"
            >
              <RefreshCw size={14} />
              Try again
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Empty state ────────────────────────────────────────────────────────────
  if (!resolved?.hasContent) {
    return (
      <div className="rounded-[32px] border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-8 text-center shadow-sm">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-violet-50 text-violet-600">
          <Lightbulb size={22} />
        </div>
        <h3 className="mt-4 text-base font-semibold text-slate-900">No simplified notes yet</h3>
        <p className="mt-2 text-sm leading-6 text-slate-500">
          Click Refresh to generate a readable version of your notes.
        </p>
        <button
          onClick={onGenerate}
          className="mt-5 inline-flex items-center gap-2 rounded-2xl bg-violet-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-violet-700 hover:shadow-sm"
        >
          <RefreshCw size={14} />
          Refresh
        </button>
      </div>
    );
  }

  // ── Main panel ─────────────────────────────────────────────────────────────
  return (
    <div className="w-full max-w-full space-y-4 sm:space-y-5">
      {/* Stat cards */}
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        <div className="rounded-3xl border border-slate-200 dark:border-slate-700 bg-violet-50/80 dark:bg-slate-900 p-4 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-medium text-slate-500">Reading Time</p>
              <p className="mt-1 text-2xl font-semibold tracking-tight text-slate-900 dark:text-white">
                {readingTime} min
              </p>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white dark:bg-slate-800 text-violet-600">
              <Clock3 size={18} />
            </div>
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200 dark:border-slate-700 bg-violet-50/80 dark:bg-slate-900 p-4 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-medium text-slate-500">Word Count</p>
              <p className="mt-1 text-2xl font-semibold tracking-tight text-slate-900 dark:text-white">
                {wordCount.toLocaleString()}
              </p>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white dark:bg-slate-800 text-violet-600">
              <BookOpen size={18} />
            </div>
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200 dark:border-slate-700 bg-violet-50/80 dark:bg-slate-900 p-4 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-medium text-slate-500">Generated Date</p>
              <p className="mt-1 text-sm font-semibold tracking-tight text-slate-900 dark:text-white">
                {formatDateTime(generatedDate)}
              </p>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white dark:bg-slate-800 text-violet-600">
              <FileText size={18} />
            </div>
          </div>
        </div>
      </div>

      {/* Action buttons */}
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        <button
          onClick={handleCopy}
          className={cn(
            "inline-flex h-11 items-center justify-center gap-2 rounded-2xl border px-4 text-sm font-medium transition hover:shadow-md",
            copied
              ? "border-emerald-300 bg-emerald-50 text-emerald-700"
              : "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800"
          )}
        >
          {copied ? <Check size={14} /> : <Copy size={14} />}
          {copied ? "Copied" : "Copy Notes"}
        </button>

        <button
          type="button"
          onClick={handleRefresh}
          disabled={loading}
          className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-violet-200 dark:border-violet-800 bg-violet-50 dark:bg-slate-900 text-violet-700 dark:text-violet-300 hover:bg-violet-100 dark:hover:bg-slate-800 transition hover:bg-violet-100 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-60"
        >
          <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
          Refresh
        </button>

        <button
          onClick={handlePdf}
          className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-violet-600 text-sm font-medium text-white transition hover:bg-violet-700 hover:shadow-md"
        >
          <Download size={14} />
          Download PDF
        </button>
      </div>

      {/* Markdown preview */}
      <div className="rounded-[32px] border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#161b22] p-8 shadow-sm sm:p-10">
        <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
          {rawText}
        </ReactMarkdown>
      </div>
    </div>
  );
}