import React, { useMemo, useState, useCallback, useEffect } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import {
  History,
  Clock,
  Copy,
  Trash2,
  ChevronDown,
  ChevronUp,
  Search,
  Sparkles,
  MessageSquare,
  FileText,
  HelpCircle,
  LayoutGrid,
  BookOpen,
  WandSparkles,
  Check,
  ArrowDownAZ,
  ArrowUpAZ,
  RefreshCw,
  Bot,
  FileQuestion,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

const TYPE_OPTIONS = [
  { key: "all", label: "All", icon: LayoutGrid },
  { key: "chat", label: "Chat", icon: MessageSquare },
  { key: "summary", label: "Summary", icon: FileText },
  { key: "quiz", label: "Quiz", icon: HelpCircle },
  { key: "flashcards", label: "Flashcards", icon: BookOpen },
  { key: "questions", label: "Questions", icon: FileQuestion },
  { key: "simplify", label: "Simplify", icon: WandSparkles },
];

const TYPE_META = {
  chat: { label: "Chat", color: "bg-indigo-500/15 text-indigo-700 ring-indigo-500/20 dark:text-indigo-300" },
  summary: { label: "Summary", color: "bg-emerald-500/15 text-emerald-700 ring-emerald-500/20 dark:text-emerald-300" },
  quiz: { label: "Quiz", color: "bg-violet-500/15 text-violet-700 ring-violet-500/20 dark:text-violet-300" },
  flashcards: { label: "Flashcards", color: "bg-amber-500/15 text-amber-700 ring-amber-500/20 dark:text-amber-300" },
  questions: { label: "Questions", color: "bg-pink-500/15 text-pink-700 ring-pink-500/20 dark:text-pink-300" },
  importantquestions: { label: "Questions", color: "bg-pink-500/15 text-pink-700 ring-pink-500/20 dark:text-pink-300" },
  simplify: { label: "Simplify", color: "bg-sky-500/15 text-sky-700 ring-sky-500/20 dark:text-sky-300" },
};

function cn(...cls) {
  return cls.filter(Boolean).join(" ");
}

function getType(item) {
  return String(item?.type || item?.aiType || item?.action || item?.category || "").toLowerCase().trim();
}

function formatRelativeTime(value) {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  const diff = Date.now() - d.getTime();
  const sec = Math.floor(diff / 1000);
  const min = Math.floor(sec / 60);
  const hr = Math.floor(min / 60);
  const day = Math.floor(hr / 24);
  if (sec < 60) return "Just now";
  if (min < 60) return `${min} min ago`;
  if (hr < 24) return `${hr} hour${hr === 1 ? "" : "s"} ago`;
  if (day === 1) return "Yesterday";
  if (day < 7) return `${day} days ago`;
  return d.toLocaleDateString();
}

function stripMd(text = "") {
  return String(text)
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/!\[.*?\]\(.*?\)/g, " ")
    .replace(/\[([^\]]+)\]\(.*?\)/g, "$1")
    .replace(/[#>*_~\-]+/g, " ")
    .replace(/\n+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function extractContent(item) {
  const type = getType(item);
  const raw = item?.content;

  if (type === "chat") {
    return {
      question: raw?.question || item?.question || "",
      answer: raw?.answer || item?.answer || "",
    };
  }

  if (type === "summary") {
    if (typeof raw === "string" && raw) return raw;
    if (typeof raw?.summary === "string" && raw.summary) return raw.summary;
    if (typeof raw?.content === "string" && raw.content) return raw.content;
    if (typeof raw?.text === "string" && raw.text) return raw.text;
    if (typeof raw?.output === "string" && raw.output) return raw.output;
    if (typeof raw?.result === "string" && raw.result) return raw.result;
    if (typeof item?.summary === "string") return item.summary;
    return "";
  }

  if (type === "simplify") {
    if (typeof raw === "string" && raw) return raw;
    if (typeof raw?.simplify === "string" && raw.simplify) return raw.simplify;
    if (typeof raw?.simplifiedContent === "string" && raw.simplifiedContent) return raw.simplifiedContent;
    if (typeof raw?.simplified === "string" && raw.simplified) return raw.simplified;
    if (typeof raw?.text === "string" && raw.text) return raw.text;
    if (typeof raw?.content === "string" && raw.content) return raw.content;
    if (typeof raw?.output === "string" && raw.output) return raw.output;
    if (typeof item?.simplify === "string") return item.simplify;
    return "";
  }

  if (type === "quiz") {
    if (Array.isArray(raw)) return raw;
    if (Array.isArray(raw?.quiz)) return raw.quiz;
    if (Array.isArray(raw?.questions)) return raw.questions;
    if (Array.isArray(raw?.items)) return raw.items;
    if (Array.isArray(item?.quiz)) return item.quiz;
    return [];
  }

  if (type === "flashcards") {
    if (Array.isArray(raw)) return raw;
    if (Array.isArray(raw?.flashcards)) return raw.flashcards;
    if (Array.isArray(raw?.cards)) return raw.cards;
    if (Array.isArray(raw?.items)) return raw.items;
    if (Array.isArray(item?.flashcards)) return item.flashcards;
    return [];
  }

  if (type === "questions" || type === "importantquestions") {
    const candidate =
      Array.isArray(raw) ? raw :
        Array.isArray(raw?.questions) ? raw.questions :
          Array.isArray(raw?.items) ? raw.items :
            Array.isArray(raw?.list) ? raw.list :
              Array.isArray(item?.questions) ? item.questions :
                null;

    if (candidate) {
      return candidate.map((q) => {
        if (typeof q === "string") return q;
        if (typeof q === "object" && q !== null) {
          return q.text || q.question || q.content || JSON.stringify(q);
        }
        return String(q);
      }).filter(Boolean);
    }

    if (typeof raw === "string" && raw) {
      return raw.split("\n").map((l) => l.replace(/^\d+\.\s*/, "").trim()).filter(Boolean);
    }

    return [];
  }

  return raw || "";
}

function MarkdownTable({ children }) {
  return (
    <div className="my-3 max-w-full overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800">
      <table className="w-full min-w-full border-collapse bg-white dark:bg-slate-950">{children}</table>
    </div>
  );
}

const markdownComponents = {
  h1: ({ children }) => <h2 className="mb-3 mt-5 text-2xl font-bold tracking-tight text-slate-900 dark:text-white">{children}</h2>,
  h2: ({ children }) => <h3 className="mb-2 mt-5 text-xl font-semibold text-slate-900 dark:text-white">{children}</h3>,
  h3: ({ children }) => <h4 className="mb-2 mt-4 text-lg font-semibold text-purple-700 dark:text-purple-300">{children}</h4>,
  h4: ({ children }) => <h5 className="mb-2 mt-4 text-base font-semibold text-slate-800 dark:text-slate-100">{children}</h5>,
  h5: ({ children }) => <h6 className="mb-1.5 mt-3 text-sm font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-300">{children}</h6>,
  h6: ({ children }) => <p className="mb-1.5 mt-3 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">{children}</p>,
  p: ({ children }) => <p className="mb-3 text-sm leading-7 text-slate-700 dark:text-slate-300">{children}</p>,
  ul: ({ children }) => <ul className="mb-4 ml-5 list-disc space-y-2 text-sm leading-7 text-slate-700 dark:text-slate-300">{children}</ul>,
  ol: ({ children }) => <ol className="mb-4 ml-5 list-decimal space-y-2 text-sm leading-7 text-slate-700 dark:text-slate-300">{children}</ol>,
  li: ({ children }) => <li className="pl-1">{children}</li>,
  a: ({ href, children }) => (
    <a href={href} target="_blank" rel="noreferrer" className="font-medium text-purple-600 underline underline-offset-2 hover:text-purple-700 dark:text-purple-300">
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
  tr: ({ children }) => <tr className="border-b border-slate-100 dark:border-slate-800">{children}</tr>,
  th: ({ children }) => <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700 dark:text-purple-200">{children}</th>,
  td: ({ children }) => <td className="px-4 py-3 align-top text-sm text-slate-700 dark:text-slate-300">{children}</td>,
};

function MarkdownContent({ value }) {
  return (
    <div className="w-full max-w-full overflow-x-hidden">
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
        {String(value || "")}
      </ReactMarkdown>
    </div>
  );
}

function StatCard({ label, value, icon: Icon, color }) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm transition hover:shadow-md dark:border-slate-800 dark:bg-slate-950/60">
      <div className="flex items-center justify-between">
        <div className="min-w-0">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
            {label}
          </p>

          <p className="mt-2 text-3xl font-bold leading-none text-slate-900 dark:text-white">
            {value}
          </p>
        </div>

        <div
          className={cn(
            "flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl",
            color
          )}
        >
          <Icon size={22} strokeWidth={2} />
        </div>
      </div>
    </div>
  );
}
function ExpandToggle({ expanded, onToggle }) {
  return (
    <button type="button" onClick={onToggle} className="mt-1 inline-flex items-center gap-1.5 text-xs font-medium text-violet-600 transition hover:text-violet-500 dark:text-violet-400">
      {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
      {expanded ? "Show Less" : "Read More"}
    </button>
  );
}

function ChatContent({ content, expanded }) {
  const answerText = content.answer || "";
  const answerPlain = stripMd(answerText);
  const hasMore = answerPlain.length > 300;

  return (
    <div className="space-y-3 w-full">
      <div className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-900/60">
        <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-indigo-500">Question</p>
        <p className="text-sm leading-6 text-slate-800 dark:text-slate-100 whitespace-pre-wrap">{content.question || "No question available."}</p>
      </div>
      <div className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-900/60">
        <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-emerald-500">Answer</p>
        {expanded ? <MarkdownContent value={answerText || "No answer available."} /> : <p className="text-sm leading-6 text-slate-700 dark:text-slate-300 whitespace-pre-wrap">{answerPlain.slice(0, 300)}{hasMore ? "…" : ""}</p>}
      </div>
    </div>
  );
}

function TextContent({ text, expanded }) {
  const plain = stripMd(text);
  const hasMore = plain.length > 300;
  return (
    <div className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-900/60">
      {expanded ? <MarkdownContent value={text} /> : <p className="text-sm leading-7 text-slate-700 dark:text-slate-300 whitespace-pre-wrap">{plain.slice(0, 300) || "No content available."}{hasMore ? "…" : ""}</p>}
    </div>
  );
}

function QuestionsContent({ questions, expanded }) {
  if (!questions.length) {
    return <div className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-900/60"><p className="text-sm text-slate-500">No questions available.</p></div>;
  }
  const shown = expanded ? questions : questions.slice(0, 3);
  return (
    <div className="space-y-2">
      {shown.map((q, i) => (
        <div key={i} className="flex gap-3 rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3 dark:border-slate-800 dark:bg-slate-900/60">
          <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-pink-500/15 text-[10px] font-bold text-pink-600 dark:text-pink-400">{i + 1}</span>
          <p className="text-sm leading-6 text-slate-800 dark:text-slate-200 whitespace-pre-wrap">{q}</p>
        </div>
      ))}
      {!expanded && questions.length > 3 && <p className="pl-1 text-xs text-slate-400">+{questions.length - 3} more questions</p>}
    </div>
  );
}

function FlashcardsContent({ cards, expanded }) {
  if (!cards.length) {
    return <div className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-900/60"><p className="text-sm text-slate-500">No flashcards available.</p></div>;
  }
  const shown = expanded ? cards : cards.slice(0, 3);
  return (
    <div className="space-y-2">
      {shown.map((card, i) => (
        <div key={i} className="rounded-2xl border border-slate-100 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900/60">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-amber-500 mb-1">Q</p>
          <p className="text-sm font-medium text-slate-800 dark:text-slate-100">{card?.front || card?.question || String(card)}</p>
          {(card?.back || card?.answer) && <>
            <p className="mt-2 text-[10px] font-semibold uppercase tracking-wider text-emerald-500">A</p>
            <p className="text-sm text-slate-600 dark:text-slate-300">{card.back || card.answer}</p>
          </>}
        </div>
      ))}
      {!expanded && cards.length > 3 && <p className="pl-1 text-xs text-slate-400">+{cards.length - 3} more cards</p>}
    </div>
  );
}

function QuizContent({ questions, expanded }) {
  if (!questions.length) {
    return <div className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-900/60"><p className="text-sm text-slate-500">No quiz questions available.</p></div>;
  }
  const shown = expanded ? questions : questions.slice(0, 2);
  return (
    <div className="space-y-3">
      {shown.map((q, i) => (
        <div key={i} className="rounded-2xl border border-slate-100 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900/60">
          <p className="text-sm font-medium text-slate-800 dark:text-slate-100">{i + 1}. {q?.question || String(q)}</p>
          {Array.isArray(q?.options) && q.options.length > 0 && (
            <div className="mt-2 space-y-1">
              {q.options.map((opt, oi) => (
                <p key={oi} className="ml-3 text-sm text-slate-600 dark:text-slate-300">{String.fromCharCode(65 + oi)}. {opt}</p>
              ))}
            </div>
          )}
          {q?.answer && <p className="mt-2 text-xs font-semibold text-emerald-600 dark:text-emerald-400">✓ {q.answer}</p>}
        </div>
      ))}
      {!expanded && questions.length > 2 && <p className="pl-1 text-xs text-slate-400">+{questions.length - 2} more questions</p>}
    </div>
  );
}

function useBodyScrollLock(locked) {
  useEffect(() => {
    if (!locked) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = previous; };
  }, [locked]);
}

function DeleteConfirmModal({ open, item, loading, onClose, onConfirm }) {
  useBodyScrollLock(open);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  if (!open || typeof document === "undefined") return null;

  const type = getType(item);
  const meta = TYPE_META[type] || { label: item?.type || "AI" };
  const title =
    type === "chat"
      ? item?.content?.question || item?.question || "Chat"
      : type === "summary"
        ? "Summary"
        : type === "quiz"
          ? "Quiz"
          : type === "flashcards"
            ? "Flashcards"
            : type === "questions" || type === "importantquestions"
              ? "Practice Questions"
              : type === "simplify"
                ? "Simplified Notes"
                : "AI Generation";

  return createPortal(
    <AnimatePresence>
      <motion.div
        key="delete-backdrop"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/35 p-4 backdrop-blur-md"
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 16 }}
          transition={{ duration: 0.18 }}
          onClick={(e) => e.stopPropagation()}
          className="w-full max-w-md rounded-[24px] border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-700 dark:bg-slate-900"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-rose-50 text-rose-600 dark:bg-rose-900/30 dark:text-rose-300">
              <Trash2 size={20} />
            </div>
            <div className="min-w-0">
              <p className={cn("inline-flex rounded-full px-2.5 py-1 text-xs font-medium ring-1", meta.color)}>
                {meta.label}
              </p>
              <h3 className="mt-2 text-lg font-semibold text-slate-900 dark:text-white">
                Delete this item?
              </h3>
            </div>
          </div>

          <p className="mt-4 text-sm leading-6 text-slate-600 dark:text-slate-300">
            This will permanently remove{" "}
            <span className="font-medium text-slate-900 dark:text-white">{title}</span> from your history.
          </p>

          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={onConfirm}
              disabled={loading}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-rose-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-rose-500 disabled:opacity-60"
            >
              <Trash2 size={14} className={loading ? "animate-pulse" : ""} />
              {loading ? "Deleting…" : "Delete"}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>,
    document.body
  );
}

function HistoryCard({ item, expanded, onToggleExpand, onCopy, onDelete, copiedId }) {
  const type = getType(item);
  const meta = TYPE_META[type] || {
    label: item?.type || "AI",
    color: "bg-slate-500/15 text-slate-600 ring-slate-500/20 dark:text-slate-300",
  };
  const content = extractContent(item);
  const id = item?._id || item?.id;

  const isExpandable = ["chat", "summary", "simplify", "quiz", "flashcards", "questions", "importantquestions"].includes(type);

  function renderContent() {
    if (type === "chat") return <ChatContent content={content} expanded={expanded} />;
    if (type === "summary" || type === "simplify") return <TextContent text={String(content || "")} expanded={expanded} />;
    if (type === "questions" || type === "importantquestions") return <QuestionsContent questions={Array.isArray(content) ? content : []} expanded={expanded} />;
    if (type === "flashcards") return <FlashcardsContent cards={Array.isArray(content) ? content : []} expanded={expanded} />;
    if (type === "quiz") return <QuizContent questions={Array.isArray(content) ? content : []} expanded={expanded} />;
    return <div className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-900/60"><p className="text-sm text-slate-500 dark:text-slate-400">No preview available.</p></div>;
  }

  function getTitle() {
    if (type === "chat") return content?.question?.slice(0, 80) || "Chat";
    if (type === "summary") return "Summary";
    if (type === "quiz") return "Quiz";
    if (type === "flashcards") return "Flashcards";
    if (type === "questions" || type === "importantquestions") return "Practice Questions";
    if (type === "simplify") return "Simplified Notes";
    return "AI Generation";
  }

  const showExpandToggle = (() => {
    if (type === "summary" || type === "simplify") return stripMd(String(content || "")).length > 300;
    if (type === "chat") return stripMd(content?.answer || "").length > 300;
    if (type === "questions" || type === "importantquestions" || type === "flashcards") return Array.isArray(content) && content.length > 3;
    if (type === "quiz") return Array.isArray(content) && content.length > 2;
    return false;
  })();

  return (
    <article className="group rounded-3xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-violet-200 hover:shadow-lg dark:border-slate-800 dark:bg-slate-950/70 dark:hover:border-slate-700">
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className={cn("inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ring-1", meta.color)}>
              <Sparkles size={11} />
              {meta.label}
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600 dark:bg-slate-900 dark:text-slate-300">
              <Clock size={11} />
              {formatRelativeTime(item?.createdAt || item?.generatedAt || item?.timestamp)}
            </span>
          </div>
          {isExpandable && (
            <button
              type="button"
              onClick={onToggleExpand}
              className="hidden group-hover:inline-flex items-center gap-1 rounded-xl px-2.5 py-1 text-xs font-medium text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              {expanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
              {expanded ? "Collapse" : "Expand"}
            </button>
          )}
        </div>

        <h3 className="text-sm font-semibold leading-snug text-slate-900 dark:text-white">{getTitle()}</h3>
        {renderContent()}
        {showExpandToggle && <ExpandToggle expanded={expanded} onToggle={onToggleExpand} />}

        <div className="flex flex-wrap items-center gap-2 pt-1">
          <button
            type="button"
            onClick={() => onCopy(item)}
            className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300 dark:hover:bg-slate-900"
          >
            {copiedId === id ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
            {copiedId === id ? "Copied!" : "Copy"}
          </button>

          <button
            type="button"
            onClick={onToggleExpand}
            className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300 dark:hover:bg-slate-900"
          >
            {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            {expanded ? "Collapse" : "Expand"}
          </button>

          <button
            type="button"
            onClick={() => onDelete(item)}
            className="inline-flex items-center gap-2 rounded-2xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-medium text-rose-600 transition hover:bg-rose-100 dark:border-rose-900/40 dark:bg-rose-950/30 dark:text-rose-300 dark:hover:bg-rose-950/50"
          >
            <Trash2 size={14} />
            Delete
          </button>
        </div>
      </div>
    </article>
  );
}

function EmptyState({ onRefresh, loading }) {
  return (
    <div className="rounded-3xl border border-dashed border-slate-200 bg-white px-6 py-16 text-center shadow-sm dark:border-slate-800 dark:bg-slate-950/50">
      <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-3xl bg-violet-500/10 text-violet-600 dark:text-violet-300">
        <Bot size={30} />
      </div>
      <h3 className="text-2xl font-semibold text-slate-900 dark:text-white">No AI History Yet</h3>
      <p className="mx-auto mt-3 max-w-sm text-sm leading-6 text-slate-500 dark:text-slate-400">
        Generate summaries, quizzes, flashcards and chats with your notes — they'll all appear here.
      </p>
      <button
        type="button"
        onClick={onRefresh}
        disabled={loading}
        className="mt-6 inline-flex items-center gap-2 rounded-2xl bg-violet-600 px-5 py-3 text-sm font-medium text-white transition hover:bg-violet-500 disabled:opacity-60"
      >
        <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
        {loading ? "Loading…" : "Refresh History"}
      </button>
    </div>
  );
}

export default function AIHistoryPanel({
  history = [],
  onCopy,
  onDelete,
  onRefreshHistory,
  loading = false,
  setHistory,
  onToast,
}) {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [sort, setSort] = useState("newest");
  const [expandedIds, setExpandedIds] = useState([]);
  const [copiedId, setCopiedId] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const stats = useMemo(() => {
    const s = { all: 0, chat: 0, summary: 0, quiz: 0, flashcards: 0, questions: 0, simplify: 0 };
    history.forEach((item) => {
      const t = getType(item);
      s.all++;
      if (t === "chat") s.chat++;
      else if (t === "summary") s.summary++;
      else if (t === "quiz") s.quiz++;
      else if (t === "flashcards") s.flashcards++;
      else if (t === "questions" || t === "importantquestions") s.questions++;
      else if (t === "simplify") s.simplify++;
    });
    return s;
  }, [history]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return history
      .filter((item) => {
        const t = getType(item);
        const typeMatch = filter === "all" || t === filter || (filter === "questions" && t === "importantquestions");
        if (!typeMatch) return false;
        if (!q) return true;

        const content = extractContent(item);
        const blob = [
          typeof content === "string" ? content : "",
          content?.question || "",
          content?.answer || "",
          Array.isArray(content)
            ? content.map((x) => (typeof x === "string" ? x : x?.question || x?.front || "")).join(" ")
            : "",
        ].join(" ").toLowerCase();

        return blob.includes(q);
      })
      .sort((a, b) => {
        const da = new Date(a?.createdAt || a?.generatedAt || a?.timestamp || 0).getTime();
        const db = new Date(b?.createdAt || b?.generatedAt || b?.timestamp || 0).getTime();
        return sort === "newest" ? db - da : da - db;
      });
  }, [history, search, filter, sort]);

  const toggleExpanded = useCallback((item) => {
    const id = item?._id || item?.id;
    if (!id) return;
    setExpandedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }, []);

  const handleCopy = useCallback(async (item) => {
    const id = item?._id || item?.id;
    const content = extractContent(item);
    const text = typeof content === "string" ? content : Array.isArray(content) ? content.join("\n") : JSON.stringify(content, null, 2);

    try {
      if (onCopy) await onCopy(text, item);
      else await navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 1400);
      onToast?.("Copied to clipboard", "success");
    } catch { }
  }, [onCopy, onToast]);

  const handleDelete = useCallback((item) => {
    setDeleteTarget(item);
  }, []);

  const confirmDelete = useCallback(async () => {
    if (!deleteTarget) return;
    const id = deleteTarget?._id || deleteTarget?.id;
    if (!id) return;

    setDeleting(true);
    try {
      const ok = await onDelete?.(deleteTarget);
      if (ok === false) return;

      if (setHistory) {
        setHistory((prev) => prev.filter((x) => (x?._id || x?.id) !== id));
      }

      onToast?.("History item deleted", "success");
      setDeleteTarget(null);
    } catch {
      onToast?.("Could not delete history item", "error");
    } finally {
      setDeleting(false);
    }
  }, [deleteTarget, onDelete, setHistory, onToast]);

  const handleRefresh = useCallback(async () => {
    if (refreshing || loading) return;
    setRefreshing(true);
    try {
      await onRefreshHistory?.();
      onToast?.("History refreshed", "success");
    } catch {
      onToast?.("Could not refresh history", "error");
    } finally {
      setRefreshing(false);
    }
  }, [refreshing, loading, onRefreshHistory, onToast]);

  const isRefreshing = refreshing || loading;

  if (!loading && !history.length) {
    return <EmptyState onRefresh={handleRefresh} loading={isRefreshing} />;
  }

  return (
    <div className="space-y-6">
     <div className="grid gap-3" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(110px, 1fr))" }}>
  <StatCard label="Total"      value={stats.all}        icon={History}       color="text-violet-600 bg-violet-500/10 dark:text-violet-300" />
  <StatCard label="Chats"      value={stats.chat}       icon={MessageSquare} color="text-indigo-600 bg-indigo-500/10 dark:text-indigo-300" />
  <StatCard label="Summaries"  value={stats.summary}    icon={FileText}      color="text-emerald-600 bg-emerald-500/10 dark:text-emerald-300" />
  <StatCard label="Quizzes"    value={stats.quiz}       icon={HelpCircle}    color="text-violet-600 bg-violet-500/10 dark:text-violet-300" />
  <StatCard label="Flashcards" value={stats.flashcards} icon={BookOpen}      color="text-amber-600 bg-amber-500/10 dark:text-amber-300" />
  <StatCard label="Questions"  value={stats.questions}  icon={FileQuestion}  color="text-pink-600 bg-pink-500/10 dark:text-pink-300" />
  <StatCard label="Simplify"   value={stats.simplify}   icon={WandSparkles}  color="text-sky-600 bg-sky-500/10 dark:text-sky-300" />
</div>
 

      <div className="space-y-4 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950/70">
        <div className="relative w-full">
          <Search size={16} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search AI history…"
            className="h-11 w-full rounded-2xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-4 text-sm text-slate-900 outline-none transition focus:border-violet-400 focus:ring-4 focus:ring-violet-500/10 dark:border-slate-800 dark:bg-slate-900/60 dark:text-white dark:placeholder:text-slate-500"
          />
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap gap-1.5">
            {TYPE_OPTIONS.map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                type="button"
                onClick={() => setFilter(key)}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-medium transition",
                  filter === key
                    ? "bg-violet-600 text-white shadow-sm"
                    : "bg-slate-50 text-slate-600 hover:bg-violet-50 dark:bg-slate-900/60 dark:text-slate-300 dark:hover:bg-slate-800"
                )}
              >
                <Icon size={13} />
                {label}
                {key !== "all" && (
                  <span
                    className={cn(
                      "rounded-full px-1.5 py-0.5 text-[10px] font-semibold",
                      filter === key
                        ? "bg-white/20 text-white"
                        : "bg-slate-200 text-slate-600 dark:bg-slate-800 dark:text-slate-300"
                    )}
                  >
                    {stats[key] ?? 0}
                  </span>
                )}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-50 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300 dark:hover:bg-slate-900"
            >
              <RefreshCw size={14} className={isRefreshing ? "animate-spin" : ""} />
              {isRefreshing ? "Loading…" : "Refresh"}
            </button>

            <button
              type="button"
              onClick={() => setSort((s) => (s === "newest" ? "oldest" : "newest"))}
              className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300 dark:hover:bg-slate-900"
            >
              {sort === "newest" ? <ArrowDownAZ size={14} /> : <ArrowUpAZ size={14} />}
              {sort === "newest" ? "Newest" : "Oldest"}
            </button>
          </div>
        </div>
      </div>

      {isRefreshing ? (
        <div className="flex items-center justify-center py-16">
          <RefreshCw size={24} className="animate-spin text-violet-500" />
        </div>
      ) : filtered.length ? (
        <div className="space-y-4">
          {filtered.map((item) => {
            const id = item?._id || item?.id;
            const expanded = expandedIds.includes(id);
            return (
              <HistoryCard
                key={id}
                item={item}
                expanded={expanded}
                onToggleExpand={() => toggleExpanded(item)}
                onCopy={handleCopy}
                onDelete={handleDelete}
                copiedId={copiedId}
              />
            );
          })}
        </div>
      ) : (
        <div className="rounded-3xl border border-dashed border-slate-200 bg-white px-6 py-14 text-center shadow-sm dark:border-slate-800 dark:bg-slate-950/50">
          <Search size={26} className="mx-auto mb-3 text-slate-400" />
          <p className="text-base font-semibold text-slate-800 dark:text-slate-200">No results found</p>
          <p className="mt-1 text-sm text-slate-400">Try a different search term or filter.</p>
        </div>
      )}

      <DeleteConfirmModal
        open={Boolean(deleteTarget)}
        item={deleteTarget}
        loading={deleting}
        onClose={() => setDeleteTarget(null)}
        onConfirm={confirmDelete}
      />
    </div>
  );
}