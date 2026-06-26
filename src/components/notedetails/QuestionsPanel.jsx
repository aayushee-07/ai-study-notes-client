import React, { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import {
  BookOpen, Flag, Download, RefreshCw, Clock, TrendingUp,
  RotateCcw, Trash2, Search, History, Star, MoreVertical, Sparkles,
} from "lucide-react";
import {
  markQuestionImportant, regenerateQuestions, getQuestionHistory,
  restoreQuestionSet, deleteQuestionHistory, downloadAllQuestionsPDF,
} from "../../services/aiService";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const normalizeQuestion = (q) => {
  if (typeof q === "string") {
    return { text: q, isImportant: false, markedAt: null };
  }
  return {
    text: q?.text || q?.question || "",
    isImportant: !!q?.isImportant,
    markedAt: q?.markedAt || null,
  };
};

const normalizeQuestions = (arr) =>
  Array.isArray(arr) ? arr.map(normalizeQuestion) : [];

/**
 * Extracts questions array from any shape the backend might return.
 * Priority order matches what regenerateQuestions / restoreQuestionSet return.
 */
function getQuestionsFromResponse(res) {
  return (
    res?.data?.questions ||          // { questions: [...] }
    res?.data?.data?.questions ||    // { data: { questions: [...] } }
    res?.data?.note?.questions ||    // { note: { questions: [...] } }
    res?.data?.data ||               // { data: [...] }
    res?.data ||                     // [...]
    []
  );
}

// ---------------------------------------------------------------------------
// Toast
// ---------------------------------------------------------------------------

function Toast({ message, type }) {
  if (!message) return null;
  return (
    <motion.div
      initial={{ opacity: 0, y: -8, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -8, scale: 0.98 }}
      className={`fixed right-4 top-4 z-[70] flex items-center gap-2 rounded-2xl border px-4 py-3 text-sm font-medium shadow-lg backdrop-blur ${
        type === "error"
          ? "border-rose-200 bg-rose-50 text-rose-700"
          : "border-emerald-200 bg-emerald-50 text-emerald-700"
      }`}
    >
      {type === "error" ? "✕" : "✓"} {message}
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// Stat cards
// ---------------------------------------------------------------------------

const STAT_STYLES = {
  purple: {
    card: "bg-[#EEEDFE] border-[#AFA9EC] dark:bg-[#26215C]/30 dark:border-[#534AB7]/40",
    label: "text-[#534AB7] dark:text-[#CECBF6]",
    value: "text-[#3C3489] dark:text-[#EEEDFE]",
    icon: "bg-[#CECBF6] text-[#534AB7] dark:bg-[#3C3489] dark:text-[#CECBF6]",
  },
  yellow: {
    card: "bg-[#FAEEDA] border-[#EF9F27] dark:bg-[#412402]/30 dark:border-[#854F0B]/40",
    label: "text-[#854F0B] dark:text-[#FAC775]",
    value: "text-[#633806] dark:text-[#FAEEDA]",
    icon: "bg-[#FAC775] text-[#854F0B] dark:bg-[#633806] dark:text-[#FAC775]",
  },
  teal: {
    card: "bg-[#E1F5EE] border-[#5DCAA5] dark:bg-[#04342C]/30 dark:border-[#0F6E56]/40",
    label: "text-[#0F6E56] dark:text-[#9FE1CB]",
    value: "text-[#085041] dark:text-[#E1F5EE]",
    icon: "bg-[#9FE1CB] text-[#0F6E56] dark:bg-[#085041] dark:text-[#9FE1CB]",
  },
};

function StatCard({ icon: Icon, label, value, color = "purple" }) {
  const c = STAT_STYLES[color];
  return (
    <div className={`flex flex-col items-center justify-center gap-1.5 rounded-2xl border px-4 py-5 text-center ${c.card}`}>
      <div className={`flex h-10 w-10 items-center justify-center rounded-2xl ${c.icon}`}>
        <Icon size={18} />
      </div>
      <p className={`text-xs font-medium uppercase tracking-wider ${c.label}`}>{label}</p>
      <p className={`text-2xl font-semibold tracking-tight ${c.value}`}>{value}</p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Question card
// ---------------------------------------------------------------------------

function QuestionCard({ question, index, onToggleImportant, onOpenMenu }) {
  const { text, isImportant } = question;
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.18 }}
      className={`group rounded-2xl border bg-white p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md dark:bg-slate-900 ${
        isImportant
          ? "border-l-4 border-l-violet-400 border-slate-200 dark:border-slate-700"
          : "border-slate-200 dark:border-slate-700"
      }`}
    >
      <div className="flex items-start gap-3">
        <div
          className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold ${
            isImportant
              ? "bg-violet-600 text-white"
              : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400"
          }`}
        >
          {index + 1}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-start gap-2">
            <p className="min-w-0 flex-1 break-words text-sm leading-6 text-slate-800 dark:text-slate-200">
              {text}
            </p>
            <button
              onClick={(e) => { e.stopPropagation(); onOpenMenu?.(text); }}
              className="rounded-xl p-1.5 text-slate-400 opacity-0 transition hover:bg-slate-100 hover:text-slate-600 group-hover:opacity-100 dark:hover:bg-slate-800"
              title="More actions"
            >
              <MoreVertical size={16} />
            </button>
          </div>

          <div className="mt-2 flex flex-wrap items-center gap-2">
            <button
              onClick={() => onToggleImportant(text)}
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition ${
                isImportant
                  ? "bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300"
                  : "bg-slate-100 text-slate-600 hover:bg-violet-50 hover:text-violet-700 dark:bg-slate-800 dark:text-slate-400"
              }`}
            >
              <Star size={12} className={isImportant ? "fill-current" : ""} />
              {isImportant ? "Important" : "Mark important"}
            </button>

            {isImportant && (
              <span className="inline-flex items-center gap-1 rounded-full bg-violet-50 px-2.5 py-1 text-[11px] font-medium text-violet-700 dark:bg-violet-900/30 dark:text-violet-300">
                <Sparkles size={11} />
                Important question
              </span>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// History entry
// ---------------------------------------------------------------------------

function HistoryEntry({ entry, setNumber, onRestore, onDelete }) {
  const date = entry.generatedAt ? new Date(entry.generatedAt) : null;
  const dateStr = date
    ? date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
    : "Unknown date";
  const timeStr = date
    ? date.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })
    : "";

  return (
    <div className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-3.5 py-3 shadow-sm transition hover:shadow-md dark:border-slate-700 dark:bg-slate-900">
      <div className="flex min-w-0 items-center gap-3">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-indigo-50 text-[11px] font-semibold text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-300">
          v{setNumber}
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-slate-800 dark:text-slate-200">
            {dateStr}
            {timeStr && (
              <span className="ml-2 text-xs font-normal text-slate-400">{timeStr}</span>
            )}
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {entry.totalCount ?? 0} questions
            {entry.importantCount > 0 ? ` · ${entry.importantCount} important` : ""}
          </p>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-2">
        <button
          onClick={() => onRestore(entry._id)}
          className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-indigo-700"
        >
          <RotateCcw size={12} />
          Restore
        </button>
        <button
          onClick={() => onDelete(entry._id)}
          className="inline-flex items-center rounded-xl border border-slate-200 px-2.5 py-2 text-xs text-slate-500 transition hover:border-rose-200 hover:text-rose-600 dark:border-slate-700"
          title="Delete"
        >
          <Trash2 size={12} />
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Body scroll lock
// ---------------------------------------------------------------------------

function useBodyScrollLock(locked) {
  useEffect(() => {
    if (!locked) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = previous; };
  }, [locked]);
}

// ---------------------------------------------------------------------------
// Regenerate modal
// ---------------------------------------------------------------------------

function RegenerateModal({ open, loading, onClose, onConfirm }) {
  useBodyScrollLock(open);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <AnimatePresence>
      <motion.div
        key="regen-backdrop"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/35 p-4 backdrop-blur-md"
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 16 }}
          transition={{ duration: 0.18 }}
          onClick={(e) => e.stopPropagation()}
          className="w-full max-w-md rounded-[24px] border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-700 dark:bg-slate-900"
        >
          <div className="flex justify-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-violet-50 text-violet-600 dark:bg-violet-900/30 dark:text-violet-300">
              <RefreshCw size={22} />
            </div>
          </div>

          <p className="mt-4 text-center text-lg font-semibold text-slate-900 dark:text-white">
            Generate new questions?
          </p>
          <p className="mt-2 text-center text-sm leading-6 text-slate-500 dark:text-slate-400">
            This will create a fresh set of AI-generated questions. Your current set will be safely stored in history.
          </p>

          <div className="mt-6 flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
            >
              Cancel
            </button>
            <button
              onClick={onConfirm}
              disabled={loading}
              className="flex-1 rounded-xl bg-violet-600 px-4 py-3 text-sm font-medium text-white transition hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? (
                <span className="inline-flex items-center justify-center gap-2">
                  <RefreshCw size={14} className="animate-spin" />
                  Generating...
                </span>
              ) : (
                "Generate new set"
              )}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>,
    document.body
  );
}

// ---------------------------------------------------------------------------
// Main panel
// ---------------------------------------------------------------------------

export default function QuestionsPanel({ questions = [], noteId }) {
  const [localQuestions, setLocalQuestions] = useState(() => normalizeQuestions(questions));
  const [searchQuery, setSearchQuery] = useState("");
  const [filter, setFilter] = useState("all");
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [questionHistory, setQuestionHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [toast, setToast] = useState({ message: null, type: "success" });

  const questionsTopRef = useRef(null);
  const regenLockRef = useRef(false);
  const refreshLockRef = useRef(false);

  // -------------------------------------------------------------------------
  // Sync localQuestions whenever the parent re-fetches the note
  // (covers page refresh: parent loads note from API → passes fresh prop)
  // -------------------------------------------------------------------------
  useEffect(() => {
    const normalized = normalizeQuestions(questions);
    if (normalized.length > 0) {
      setLocalQuestions(normalized);
    }
  }, [questions]);

  // -------------------------------------------------------------------------
  // Toast
  // -------------------------------------------------------------------------
  const showToast = useCallback((message, type = "success") => {
    setToast({ message, type });
    window.setTimeout(() => setToast({ message: null, type: "success" }), 2800);
  }, []);

  // -------------------------------------------------------------------------
  // History
  // -------------------------------------------------------------------------
  const loadQuestionHistory = useCallback(async () => {
    if (!noteId) return;
    setLoadingHistory(true);
    try {
      const res = await getQuestionHistory(noteId);
      setQuestionHistory(res?.data ?? []);
    } catch (err) {
      console.error("Failed to load history:", err);
      showToast("Failed to load history", "error");
    } finally {
      setLoadingHistory(false);
    }
  }, [noteId, showToast]);

  // -------------------------------------------------------------------------
  // Refresh — reload history; localQuestions are kept in sync via useEffect
  // -------------------------------------------------------------------------
  const refreshAll = useCallback(async () => {
    if (!noteId || refreshLockRef.current) return;
    refreshLockRef.current = true;
    setIsRefreshing(true);
    try {
      const res = await getQuestionHistory(noteId);
      setQuestionHistory(res?.data ?? []);
      // NOTE: do NOT reset localQuestions from the stale `questions` prop here.
      // The parent will re-fetch the note and pass the updated prop, which
      // the useEffect above will pick up automatically.
      showToast("Questions refreshed");
    } catch (err) {
      console.error("Failed to refresh:", err);
      showToast("Failed to refresh questions", "error");
    } finally {
      setIsRefreshing(false);
      refreshLockRef.current = false;
    }
  }, [noteId, showToast]);

  // -------------------------------------------------------------------------
  // Stats
  // -------------------------------------------------------------------------
  const stats = useMemo(() => {
    const total = localQuestions.length;
    const important = localQuestions.filter((q) => q.isImportant).length;
    const revisionTime = Math.max(1, Math.ceil(important * 2));
    return { total, important, revisionTime };
  }, [localQuestions]);

  // -------------------------------------------------------------------------
  // Filter / search
  // -------------------------------------------------------------------------
  const filteredQuestions = useMemo(() => {
    let result = localQuestions;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter((item) => item.text.toLowerCase().includes(q));
    }
    if (filter === "important") result = result.filter((q) => q.isImportant);
    return result;
  }, [localQuestions, searchQuery, filter]);

  // -------------------------------------------------------------------------
  // Mark important — use server response directly so UI never lags behind DB
  // -------------------------------------------------------------------------
  const handleMarkImportant = useCallback(async (questionText) => {
    try {
      const res = await markQuestionImportant(noteId, questionText);

      // Backend returns { success, questions, importantCount }
      const updatedQuestions = res?.data?.questions ?? [];

      if (updatedQuestions.length) {
        setLocalQuestions(normalizeQuestions(updatedQuestions));
      }

      await loadQuestionHistory();

      const updatedQuestion = updatedQuestions.find(
        (q) => (q.text ?? q.question) === questionText
      );

      showToast(
        updatedQuestion?.isImportant ? "Marked as important" : "Removed from important"
      );
    } catch (err) {
      console.error(err);
      showToast("Failed to update question", "error");
    }
  }, [noteId, loadQuestionHistory, showToast]);

  // -------------------------------------------------------------------------
  // Regenerate
  // Fix: save current questions to history FIRST (via backend), then set the
  // NEW questions returned by the API — don't re-use stale local state.
  // -------------------------------------------------------------------------
  const handleRegenerate = useCallback(async () => {
    if (!noteId || isRegenerating || regenLockRef.current) return;

    regenLockRef.current = true;
    setIsRegenerating(true);

    try {
      // regenerateQuestions should:
      //   1. Push current questions into history on the server
      //   2. Generate + save new questions
      //   3. Return the NEW questions in the response
      const res = await regenerateQuestions(noteId);

      const newQuestions = normalizeQuestions(getQuestionsFromResponse(res));

      if (newQuestions.length) {
        // Replace local state with the FRESH questions from the server
        setLocalQuestions(newQuestions);
      } else {
        console.warn("Regenerate returned empty questions — check backend response shape:", res);
        showToast("Regeneration returned no questions", "error");
        return;
      }

      // Reload history so the old set appears in the history panel
      await loadQuestionHistory();

      setShowConfirmModal(false);
      showToast("Questions regenerated successfully");
    } catch (err) {
      console.error(err);
      showToast(
        err?.response?.data?.message || "Failed to regenerate questions",
        "error"
      );
    } finally {
      setIsRegenerating(false);
      regenLockRef.current = false;
    }
  }, [noteId, isRegenerating, loadQuestionHistory, showToast]);

  // -------------------------------------------------------------------------
  // Download PDF
  // -------------------------------------------------------------------------
  const handleDownloadAll = useCallback(async () => {
    try {
      setIsDownloading(true);
      const response = await downloadAllQuestionsPDF(noteId);
      const url = window.URL.createObjectURL(response.data);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `questions-${noteId}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      showToast("PDF downloaded");
    } catch (err) {
      console.error("Failed to download PDF:", err);
      showToast("Failed to download PDF", "error");
    } finally {
      setIsDownloading(false);
    }
  }, [noteId, showToast]);

  // -------------------------------------------------------------------------
  // Restore history set
  // -------------------------------------------------------------------------
  const handleRestore = useCallback(async (historyId) => {
    try {
      const res = await restoreQuestionSet(noteId, historyId);
      const normalized = normalizeQuestions(getQuestionsFromResponse(res));
      setLocalQuestions((prev) => (normalized.length ? normalized : prev));
      await loadQuestionHistory();
      showToast("Questions restored");
      setShowHistory(false);
      questionsTopRef.current?.scrollIntoView({ behavior: "smooth" });
    } catch (err) {
      console.error("Failed to restore:", err);
      showToast("Failed to restore questions", "error");
    }
  }, [noteId, loadQuestionHistory, showToast]);

  // -------------------------------------------------------------------------
  // Delete history entry
  // -------------------------------------------------------------------------
  const handleDeleteHistory = useCallback(async (historyId) => {
    try {
      await deleteQuestionHistory(noteId, historyId);
      setQuestionHistory((prev) => prev.filter((h) => h._id !== historyId));
      showToast("History entry deleted");
    } catch (err) {
      console.error("Failed to delete history:", err);
      showToast("Failed to delete history", "error");
    }
  }, [noteId, showToast]);

  // -------------------------------------------------------------------------
  // Derived flags
  // -------------------------------------------------------------------------
  const hasNoQuestions = localQuestions.length === 0;
  const hasNoFilteredQuestions = filteredQuestions.length === 0 && !hasNoQuestions;

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------
  return (
    <div className="w-full max-w-full space-y-4">
      <AnimatePresence>
        {toast.message && <Toast message={toast.message} type={toast.type} />}
      </AnimatePresence>

      {/* Stats row */}
      {!hasNoQuestions && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid grid-cols-1 gap-3 sm:grid-cols-3"
        >
          <StatCard icon={TrendingUp} label="Total Questions" value={stats.total} color="purple" />
          <StatCard icon={Star} label="Important" value={stats.important} color="yellow" />
          <StatCard icon={Clock} label="Revision Time" value={`${stats.revisionTime}m`} color="teal" />
        </motion.div>
      )}

      {/* Toolbar */}
      {!hasNoQuestions && (
        <div className="flex flex-col gap-2 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-700 dark:bg-slate-900 xl:flex-row xl:items-center">
          <div className="relative min-w-0 flex-1">
            <Search
              size={14}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              type="text"
              placeholder="Search questions…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-3 text-sm text-slate-700 outline-none transition focus:border-violet-300 focus:ring-2 focus:ring-violet-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2 xl:flex-nowrap">
            {/* Filter toggle */}
            <div className="flex h-10 items-center rounded-xl border border-slate-200 bg-slate-50 p-0.5 dark:border-slate-700 dark:bg-slate-800">
              {["all", "important"].map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`h-9 rounded-lg px-3 text-xs font-medium transition ${
                    filter === f
                      ? "bg-white text-violet-700 shadow-sm dark:bg-slate-700 dark:text-violet-300"
                      : "text-slate-500 hover:text-slate-700 dark:text-slate-400"
                  }`}
                >
                  {f === "all" ? "All" : "Important"}
                </button>
              ))}
            </div>

            <button
              onClick={handleDownloadAll}
              disabled={isDownloading}
              className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 text-sm font-medium text-slate-700 transition hover:shadow-sm disabled:opacity-60 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
            >
              <Download size={14} />
              PDF
            </button>

            <button
              onClick={() => {
                setShowHistory((v) => !v);
                if (!showHistory) loadQuestionHistory();
              }}
              className={`inline-flex h-10 items-center gap-2 rounded-xl border px-3.5 text-sm font-medium transition hover:shadow-sm ${
                showHistory
                  ? "border-violet-300 bg-violet-50 text-violet-700 dark:border-violet-700 dark:bg-violet-900/30 dark:text-violet-300"
                  : "border-slate-200 bg-white text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
              }`}
            >
              <History size={14} />
              History
            </button>

            <button
              onClick={refreshAll}
              disabled={isRefreshing}
              className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 text-sm font-medium text-slate-700 transition hover:shadow-sm disabled:opacity-60 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
            >
              <RefreshCw size={14} className={isRefreshing ? "animate-spin" : ""} />
              Refresh
            </button>

            <button
              onClick={() => setShowConfirmModal(true)}
              disabled={isRegenerating}
              className="inline-flex h-10 items-center gap-2 rounded-xl bg-violet-600 px-4 text-sm font-medium text-white transition hover:bg-violet-700 hover:shadow-sm disabled:opacity-60"
            >
              <RefreshCw size={14} className={isRegenerating ? "animate-spin" : ""} />
              {isRegenerating ? "Regenerating…" : "Regenerate"}
            </button>
          </div>
        </div>
      )}

      {/* History panel */}
      <AnimatePresence>
        {showHistory && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            className="rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900"
          >
            <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <History size={14} className="text-violet-600" />
                <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                  Question history
                </span>
              </div>
              <span className="text-xs text-slate-400">
                {questionHistory.length} previous {questionHistory.length === 1 ? "set" : "sets"}
              </span>
            </div>

            <div className="max-h-72 space-y-2 overflow-y-auto p-3">
              {loadingHistory ? (
                <div className="space-y-2">
                  {[1, 2].map((i) => (
                    <div key={i} className="h-14 animate-pulse rounded-2xl bg-slate-100 dark:bg-slate-800" />
                  ))}
                </div>
              ) : questionHistory.length === 0 ? (
                <p className="py-6 text-center text-xs text-slate-400">No history yet</p>
              ) : (
                questionHistory.map((entry, idx) => (
                  <HistoryEntry
                    key={entry._id}
                    entry={entry}
                    setNumber={questionHistory.length - idx}
                    onRestore={handleRestore}
                    onDelete={handleDeleteHistory}
                  />
                ))
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Regenerate confirmation modal */}
      <RegenerateModal
        open={showConfirmModal}
        loading={isRegenerating}
        onClose={() => setShowConfirmModal(false)}
        onConfirm={handleRegenerate}
      />

      {/* Questions list */}
      {hasNoQuestions ? (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-white py-14 text-center shadow-sm dark:border-slate-700 dark:bg-slate-900/40">
          <BookOpen size={28} className="mx-auto mb-3 text-slate-300" />
          <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">No questions yet</p>
          <p className="mt-1 text-xs text-slate-400">Generate a set of practice questions from your notes</p>
        </div>
      ) : hasNoFilteredQuestions ? (
        <div className="rounded-2xl border border-slate-200 bg-white py-14 text-center shadow-sm dark:border-slate-700 dark:bg-slate-900/40">
          <Search size={24} className="mx-auto mb-3 text-slate-300" />
          <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">No questions match</p>
          <p className="mt-1 text-xs text-slate-400">Try a different search or clear the filter</p>
        </div>
      ) : (
        <div ref={questionsTopRef} className="space-y-2.5">
          {filteredQuestions.map((q, index) => (
            <QuestionCard
              key={q._id ?? `${q.text}-${index}`}
              question={q}
              index={index}
              onToggleImportant={handleMarkImportant}
              onOpenMenu={() => {}}
            />
          ))}
        </div>
      )}

      {!hasNoQuestions && filteredQuestions.length > 0 && (
        <p className="text-center text-xs text-slate-400">
          Showing {filteredQuestions.length} of {localQuestions.length} questions
          {filter === "important" ? " · important only" : ""}
        </p>
      )}
    </div>
  );
}