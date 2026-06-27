import React, { useState, useRef, useCallback, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "../components/Layout";
import apiClient from "../lib/apiClient";
import {
  Upload,
  FileText,
  Loader2,
  CheckCircle,
  AlertCircle,
  Trash2,
  ExternalLink,
  BookOpen,
  HelpCircle,
  RefreshCw,
  Sparkles,
  Calendar,
  TrendingUp,
  Search,
  Star,
  X,
  ArrowRight,
  WandSparkles,
  Plus,
  List,
  Grid3X3,
  MessageSquareText,
  CheckCircle2,
  Info,
  Home,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const formatBytes = (bytes) => {
  if (!bytes) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
};

const formatDate = (dateString) => {
  if (!dateString) return "N/A";
  return new Date(dateString).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

const formatRelativeTime = (value) => {
  if (!value) return "N/A";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "N/A";
  const diffMs = Date.now() - d.getTime();
  const mins = Math.floor(diffMs / 60000);
  const hrs = Math.floor(mins / 60);
  const days = Math.floor(hrs / 24);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins} minute${mins === 1 ? "" : "s"} ago`;
  if (hrs < 24) return `${hrs} hour${hrs === 1 ? "" : "s"} ago`;
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days} days ago`;
  return formatDate(value);
};

const safeText = (v) => (v || "").toString().trim();

const hasAnyAIFeature = (note) =>
  Boolean(
    note?.aiContent?.summary ||
      note?.aiContent?.quiz?.length > 0 ||
      note?.aiContent?.flashcards?.length > 0 ||
      note?.aiContent?.simplify ||
      note?.aiContent?.simplifiedNotes ||
      note?.chats?.length > 0
  );

const getAIFlags = (note) => {
  const flags = [];
  if (note?.aiContent?.summary) flags.push({ key: "summary", label: "Summary", icon: BookOpen });
  if (note?.aiContent?.quiz?.length > 0) flags.push({ key: "quiz", label: "Quiz", icon: HelpCircle });
  if (note?.aiContent?.flashcards?.length > 0) flags.push({ key: "flashcards", label: "Flashcards", icon: BookOpen });
  if (note?.aiContent?.simplify || note?.aiContent?.simplifiedNotes)
    flags.push({ key: "simplify", label: "Simplify", icon: WandSparkles });
  if (note?.chats?.length > 0) flags.push({ key: "chat", label: "Chat", icon: MessageSquareText });
  return flags;
};

// ─── Shared UI components (mirrors Notes.jsx exactly) ─────────────────────────

function Toast({ toast, onClose }) {
  if (!toast) return null;
  const tone =
    toast.type === "success"
      ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-700 dark:text-emerald-300"
      : toast.type === "error"
        ? "bg-rose-500/10 border-rose-500/20 text-rose-700 dark:text-rose-300"
        : "bg-sky-500/10 border-sky-500/20 text-sky-700 dark:text-sky-300";
  const Icon =
    toast.type === "success" ? CheckCircle2 : toast.type === "error" ? AlertCircle : Info;
  return (
    <div
      className={`fixed right-4 top-4 z-50 flex w-[calc(100vw-2rem)] max-w-sm items-start gap-3 rounded-2xl border px-4 py-3 shadow-xl backdrop-blur sm:w-auto ${tone}`}
    >
      <Icon size={18} className="mt-0.5 shrink-0" />
      <div className="flex-1 text-sm leading-5">{toast.message}</div>
      <button onClick={onClose} className="transition-opacity hover:opacity-100" aria-label="Close toast">
        <X size={16} />
      </button>
    </div>
  );
}

function ConfirmDeleteModal({ note, loading, onCancel, onConfirm }) {
  if (!note) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
      <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-700 dark:bg-slate-900">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-rose-500/10 text-rose-600 dark:text-rose-300">
            <Trash2 size={20} />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Delete note?</h3>
            <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
              This will permanently delete{" "}
              <span className="font-medium text-slate-900 dark:text-white">{note.title || "Untitled Note"}</span>.
            </p>
          </div>
        </div>
        <div className="mt-6 flex justify-end gap-3">
          <button
            onClick={onCancel}
            className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-800 transition-colors hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className="rounded-xl border border-rose-200 bg-rose-500/10 px-4 py-2.5 text-sm text-rose-700 transition-colors hover:bg-rose-500/15 disabled:opacity-60 dark:border-rose-500/20 dark:text-rose-200"
          >
            {loading ? "Deleting..." : "Delete"}
          </button>
        </div>
      </div>
    </div>
  );
}

// Matches Notes.jsx StatCard exactly — uniform violet icon, no custom color props
function StatCard({ label, value, icon, subtext }) {
  return (
    <div className="flex h-full flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md dark:border-slate-800 dark:bg-[#161b22]">
      <div className="mb-4 flex items-center justify-between">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
          {label}
        </span>
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-500/10 text-violet-600 dark:text-violet-300">
          {icon}
        </span>
      </div>
      <div className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">{value}</div>
      {subtext ? <p className="mt-2 text-xs leading-5 text-slate-500 dark:text-slate-400">{subtext}</p> : null}
    </div>
  );
}

function ActivityIcon({ type }) {
  const map = {
    summary: { icon: Sparkles, cls: "bg-violet-50 text-violet-600 dark:bg-violet-500/10 dark:text-violet-400" },
    quiz: { icon: HelpCircle, cls: "bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400" },
    flashcards: { icon: BookOpen, cls: "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400" },
    simplify: { icon: WandSparkles, cls: "bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400" },
    chat: { icon: MessageSquareText, cls: "bg-slate-50 text-slate-600 dark:bg-slate-500/10 dark:text-slate-400" },
  };
  const item = map[type] || map.summary;
  const Icon = item.icon;
  return (
    <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${item.cls}`}>
      <Icon size={16} />
    </span>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function UploadPDF() {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  const [file, setFile] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStage, setUploadStage] = useState(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [validationErr, setValidationErr] = useState("");

  const [recentPDFs, setRecentPDFs] = useState([]);
  const [recentLoading, setRecentLoading] = useState(true);
  const [deletingId, setDeletingId] = useState(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [sortOrder, setSortOrder] = useState("newest");
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);

  // Mirrors Notes.jsx: separate Grid/List buttons + localStorage persistence
  const [viewMode, setViewMode] = useState(
    () => localStorage.getItem("pdf-view-mode") || "grid"
  );
  const handleViewMode = (mode) => {
    setViewMode(mode);
    localStorage.setItem("pdf-view-mode", mode);
  };

  const [pdfStats, setPdfStats] = useState({
    totalPDFs: 0,
    totalCharacters: 0,
    aiFeaturesGenerated: 0,
    lastUploadDate: null,
  });
  const [recentActivity, setRecentActivity] = useState([]);

  const [toast, setToast] = useState(null);
  const showToast = useCallback((message, type = "info") => {
    setToast({ message, type, id: Date.now() });
  }, []);
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2800);
    return () => clearTimeout(t);
  }, [toast]);

  const [deleteTarget, setDeleteTarget] = useState(null); // { id, note }

  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 6;

  // ─── Data fetching ────────────────────────────────────────────────────────

  const fetchData = useCallback(async () => {
    setRecentLoading(true);
    try {
      const res = await apiClient.get("/notes/all");
      const notes = res.data?.notes || res.data || [];
      const filteredNotes = notes.filter((n) => n.pdfFile);
      setRecentPDFs(filteredNotes);

      const totalPDFs = filteredNotes.length;
      const totalCharacters = filteredNotes.reduce((sum, n) => sum + (n.extractedText?.length || 0), 0);
      const aiFeaturesGenerated = filteredNotes.filter(hasAnyAIFeature).length;
      const lastUpload = [...filteredNotes].sort(
        (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
      )[0];
      setPdfStats({ totalPDFs, totalCharacters, aiFeaturesGenerated, lastUploadDate: lastUpload?.createdAt });

      try {
        const historyRes = await apiClient.get("/ai/history");
        setRecentActivity((historyRes.data?.history || []).slice(0, 3));
      } catch {
        setRecentActivity([]);
      }
    } catch {
      setRecentPDFs([]);
    } finally {
      setRecentLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  // ─── Filtering / sorting ──────────────────────────────────────────────────

  const filteredPDFs = useMemo(() => {
    return recentPDFs
      .filter((note) => {
        if (searchQuery && !safeText(note.title).toLowerCase().includes(searchQuery.toLowerCase()))
          return false;
        if (showFavoritesOnly && !note.favorite) return false;
        return true;
      })
      .sort((a, b) => {
        const diff = new Date(b.createdAt) - new Date(a.createdAt);
        return sortOrder === "newest" ? diff : -diff;
      });
  }, [recentPDFs, searchQuery, showFavoritesOnly, sortOrder]);

  // Reset to page 1 on filter changes
  useEffect(() => { setCurrentPage(1); }, [searchQuery, sortOrder, showFavoritesOnly]);

  const totalPages = Math.max(1, Math.ceil(filteredPDFs.length / pageSize));
  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages);
  }, [currentPage, totalPages]);

  const currentPagePDFs = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredPDFs.slice(start, start + pageSize);
  }, [filteredPDFs, currentPage]);

  // ─── Upload logic ─────────────────────────────────────────────────────────

  const validate = (f) => {
    if (!f) return "Please select a file.";
    if (f.type !== "application/pdf") return "Only PDF files are allowed.";
    if (f.size > 10 * 1024 * 1024) return `File exceeds 10 MB (${formatBytes(f.size)}).`;
    return "";
  };

  const pickFile = (f) => {
    setMessage("");
    setValidationErr("");
    setUploadStage(null);
    setUploadProgress(0);
    const err = validate(f);
    if (err) { setValidationErr(err); return; }
    setFile(f);
    showToast("File selected successfully!", "success");
  };

  const onDragOver = (e) => { e.preventDefault(); setDragOver(true); };
  const onDragLeave = () => setDragOver(false);
  const onDrop = (e) => { e.preventDefault(); setDragOver(false); pickFile(e.dataTransfer.files[0]); };

  const handleUpload = async () => {
    const err = validate(file);
    if (err) { setValidationErr(err); return; }
    setValidationErr("");
    setMessage("");
    setLoading(true);
    setUploadStage("uploading");
    setUploadProgress(0);
    const formData = new FormData();
    formData.append("pdf", file);
    try {
      const res = await apiClient.post("/ai/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" },
        onUploadProgress: (e) => {
          const pct = Math.round((e.loaded * 100) / e.total);
          setUploadProgress(pct);
          if (pct === 100) setUploadStage("processing");
        },
      });
      setUploadStage("completed");
      setUploadProgress(100);
      setMessage("success:PDF uploaded and processed successfully!");
      fetchData();
      showToast("PDF uploaded successfully!", "success");
      setTimeout(() => navigate(`/notes/${res.data.note._id}`), 2500);
    } catch (error) {
      setUploadStage(null);
      setMessage(`error:${error.response?.data?.message || "Upload failed"}`);
      showToast(error.response?.data?.message || "Upload failed.", "error");
    } finally {
      setLoading(false);
    }
  };

  // ─── Note actions ─────────────────────────────────────────────────────────

  const handleDeleteConfirm = async () => {
    const id = deleteTarget?.id;
    if (!id) return;
    setDeletingId(id);
    try {
      await apiClient.delete(`/notes/${id}`);
      showToast("Note deleted.", "success");
      setDeleteTarget(null);
      fetchData();
    } catch {
      showToast("Failed to delete note.", "error");
    } finally {
      setDeletingId(null);
    }
  };

  const handleFavorite = async (noteId, currentFavorite) => {
    // Optimistic update
    setRecentPDFs((prev) =>
      prev.map((n) => (n._id === noteId ? { ...n, favorite: !currentFavorite } : n))
    );
    try {
      await apiClient.put(`/notes/favorite/${noteId}`);
      showToast("Favorite updated.", "success");
    } catch {
      // Revert
      setRecentPDFs((prev) =>
        prev.map((n) => (n._id === noteId ? { ...n, favorite: currentFavorite } : n))
      );
      showToast("Failed to update favorite.", "error");
    }
  };

  const isSuccess = message.startsWith("success:");
  const isError = message.startsWith("error:");
  const msgText = message.replace(/^(success|error):/, "");
  const recentTotal = filteredPDFs.length;

  // ─── Card renderer ────────────────────────────────────────────────────────

  const renderCard = (note) => {
    const aiFlags = getAIFlags(note);

    if (viewMode === "list") {
      return (
        <div
          key={note._id}
          className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:border-violet-200 hover:shadow-md dark:border-slate-800 dark:bg-[#161b22] dark:hover:border-violet-500/20 sm:flex-row sm:items-start"
        >
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-violet-500/20 bg-violet-500/10 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider text-violet-700 dark:text-violet-300">
                <FileText size={10} /> PDF
              </span>
              {note.favorite && (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-yellow-200 bg-yellow-50 px-2.5 py-1 text-[11px] text-yellow-700 dark:border-yellow-500/20 dark:bg-yellow-500/10 dark:text-yellow-300">
                  <Star size={10} className="fill-yellow-500 dark:fill-yellow-300" /> Favorite
                </span>
              )}
            </div>
            <h3 className="mt-3 line-clamp-1 text-base font-semibold tracking-tight text-slate-900 dark:text-white">
              {note.title || "Untitled Note"}
            </h3>
            <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
              <span className="inline-flex items-center gap-1"><Calendar size={11} /> {formatDate(note.createdAt)}</span>
              {note.extractedText && <span>{note.extractedText.length.toLocaleString()} chars</span>}
            </div>
            {aiFlags.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {aiFlags.map(({ key, label, icon: Icon }) => (
                  <span key={key} className="inline-flex items-center gap-1 rounded-full border border-violet-500/20 bg-violet-500/10 px-2.5 py-1 text-[11px] text-violet-700 dark:text-violet-300">
                    <Icon size={10} /> {label}
                  </span>
                ))}
              </div>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2 sm:justify-end">
            <button
              onClick={() => navigate(`/notes/${note._id}`)}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-slate-700 transition-colors hover:border-violet-200 hover:bg-violet-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-violet-500/20 dark:hover:bg-violet-500/10"
              aria-label="Open workspace"
            >
              <ExternalLink size={14} />
            </button>
            <button
              onClick={() => handleFavorite(note._id, note.favorite)}
              aria-label="Toggle favorite"
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-slate-700 transition-colors hover:border-slate-300 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-slate-600"
            >
              <Star
                size={14}
                className={note.favorite ? "fill-yellow-500 text-yellow-500 dark:fill-yellow-300 dark:text-yellow-300" : ""}
              />
            </button>
            <button
              onClick={() => setDeleteTarget({ id: note._id, note })}
              disabled={deletingId === note._id}
              aria-label="Delete note"
              className="inline-flex items-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-rose-700 transition-colors hover:bg-rose-100 disabled:opacity-40 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-200"
            >
              {deletingId === note._id ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
            </button>
          </div>
        </div>
      );
    }

    return (
      <div
        key={note._id}
        className="flex h-full flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-all hover:-translate-y-1 hover:border-violet-200 hover:shadow-lg dark:border-slate-800 dark:bg-[#161b22] dark:hover:border-violet-500/20"
      >
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-violet-500/20 bg-violet-500/10 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider text-violet-700 dark:text-violet-300">
            <FileText size={10} /> PDF
          </span>
          {note.favorite && (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-yellow-200 bg-yellow-50 px-2.5 py-1 text-[11px] text-yellow-700 dark:border-yellow-500/20 dark:bg-yellow-500/10 dark:text-yellow-300">
              <Star size={10} className="fill-yellow-500 dark:fill-yellow-300" /> Favorite
            </span>
          )}
        </div>
        <h3 className="mt-3 line-clamp-2 text-base font-semibold tracking-tight text-slate-900 dark:text-white">
          {note.title || "Untitled Note"}
        </h3>
        <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
          <span className="inline-flex items-center gap-1"><Calendar size={11} /> {formatDate(note.createdAt)}</span>
          {note.extractedText && <span>{note.extractedText.length.toLocaleString()} chars</span>}
        </div>
        {aiFlags.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-1.5">
            {aiFlags.map(({ key, label, icon: Icon }) => (
              <span key={key} className="inline-flex items-center gap-1 rounded-full border border-violet-500/20 bg-violet-500/10 px-2.5 py-1 text-[11px] text-violet-700 dark:text-violet-300">
                <Icon size={10} /> {label}
              </span>
            ))}
          </div>
        )}

        {/* Footer — mirrors Notes.jsx card footer */}
        <div className="mt-auto flex items-center justify-between gap-3 pt-5 text-xs text-slate-500 dark:text-slate-400">
          <span className="inline-flex items-center gap-1.5">
            <Calendar size={12} /> {formatDate(note.createdAt)}
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate(`/notes/${note._id}`)}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-slate-700 transition-colors hover:border-violet-200 hover:bg-violet-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-violet-500/20 dark:hover:bg-violet-500/10"
              aria-label="Open workspace"
            >
              <ExternalLink size={14} />
            </button>
            <button
              onClick={() => handleFavorite(note._id, note.favorite)}
              aria-label="Toggle favorite"
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-slate-700 transition-colors hover:border-slate-300 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-slate-600"
            >
              <Star
                size={14}
                className={note.favorite ? "fill-yellow-500 text-yellow-500 dark:fill-yellow-300 dark:text-yellow-300" : ""}
              />
            </button>
            <button
              onClick={() => setDeleteTarget({ id: note._id, note })}
              disabled={deletingId === note._id}
              aria-label="Delete note"
              className="inline-flex items-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-rose-700 transition-colors hover:bg-rose-100 disabled:opacity-40 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-200"
            >
              {deletingId === note._id ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
            </button>
          </div>
        </div>
      </div>
    );
  };

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <Layout>
      <Toast toast={toast} onClose={() => setToast(null)} />
      <ConfirmDeleteModal
        note={deleteTarget?.note}
        loading={deletingId === deleteTarget?.id}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={handleDeleteConfirm}
      />

      <div className="space-y-6 lg:space-y-8">

        {/* Hero — mirrors Notes.jsx hero exactly */}
        <section className="rounded-3xl border border-violet-200/60 bg-gradient-to-br from-violet-50 via-white to-fuchsia-50 p-5 shadow-sm dark:border-slate-800 dark:from-[#161b22] dark:via-[#161b22] dark:to-[#11151c] sm:p-7 lg:p-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-violet-200 bg-white px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-violet-700 shadow-sm dark:border-violet-500/20 dark:bg-slate-900 dark:text-violet-300">
                <Sparkles size={11} /> PDF Workspace
              </div>
              <h1 className="mt-4 text-2xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-3xl">
                Upload PDF
              </h1>
              <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-400">
                Transform PDFs into summaries, quizzes, flashcards, simplified notes and AI-powered study material.
              </p>
            </div>
           <div className="flex flex-col gap-2 sm:flex-row">
  <button
    onClick={fetchData}
    className="inline-flex h-10 items-center justify-center gap-2 rounded-full border border-violet-200 bg-white px-3 text-xs font-medium text-violet-700 shadow-sm transition-all hover:border-violet-300 hover:bg-violet-50 dark:border-violet-500/20 dark:bg-slate-900 dark:text-violet-300 dark:hover:bg-violet-500/10"
  >
    <RefreshCw size={13} className={recentLoading ? "animate-spin" : ""} />
    Refresh
  </button>

  <button
    onClick={() => navigate("/notes")}
    className="inline-flex h-10 items-center justify-center gap-2 rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-500 px-3 text-xs font-medium text-white shadow-sm transition-all hover:from-violet-600 hover:to-fuchsia-600 hover:shadow-md"
  >
    Browse Notes
    <ArrowRight size={13} />
  </button>
</div>
          </div>
        </section>

        {/* Stats — lg:grid-cols-4 matches Notes.jsx */}
        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            label="Total PDFs"
            value={pdfStats.totalPDFs}
            icon={<FileText size={18} />}
            subtext="All uploaded PDFs"
          />
          <StatCard
            label="AI Workspaces"
            value={pdfStats.aiFeaturesGenerated}
            icon={<Sparkles size={18} />}
            subtext="PDFs with AI features"
          />
          <StatCard
            label="Characters Extracted"
            value={pdfStats.totalCharacters.toLocaleString()}
            icon={<TrendingUp size={18} />}
            subtext="Text pulled from PDFs"
          />
          <StatCard
            label="Last Upload"
            value={pdfStats.lastUploadDate ? formatRelativeTime(pdfStats.lastUploadDate) : "—"}
            icon={<Calendar size={18} />}
            subtext={pdfStats.lastUploadDate ? formatDate(pdfStats.lastUploadDate) : "No uploads yet"}
          />
        </section>

        {/* Upload panel */}
        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-[#161b22] sm:p-6 lg:p-8">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold tracking-tight text-slate-900 dark:text-white">Upload PDF</h2>
              <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">PDF only · max 10 MB</p>
            </div>
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-500/10 text-violet-600 dark:text-violet-300">
              <Upload size={16} />
            </span>
          </div>

          <div
            onDragOver={onDragOver}
            onDragLeave={onDragLeave}
            onDrop={onDrop}
            onClick={() => !loading && fileInputRef.current?.click()}
            className={`cursor-pointer rounded-2xl border-2 border-dashed p-8 text-center transition-all duration-200 sm:p-10 ${
              dragOver
                ? "border-violet-400 bg-violet-50 dark:bg-violet-500/10"
                : "border-violet-200 bg-slate-50 hover:border-violet-300 hover:bg-slate-100 dark:border-violet-500/30 dark:bg-slate-900/40 dark:hover:bg-violet-500/5"
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="application/pdf"
              className="hidden"
              onChange={(e) => pickFile(e.target.files[0])}
            />
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-violet-100 shadow-sm dark:bg-violet-500/10">
              <Upload size={28} className="text-violet-600 dark:text-violet-400" />
            </div>
            {file ? (
              <>
                <h3 className="text-base font-semibold text-slate-900 dark:text-white">{file.name}</h3>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{formatBytes(file.size)}</p>
              </>
            ) : (
              <>
                <h3 className="text-base font-semibold text-slate-900 dark:text-white">Drop your PDF here</h3>
                <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">or click to browse files</p>
                <button
                  type="button"
                  className="mt-4 inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-500 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-all hover:from-violet-600 hover:to-fuchsia-600"
                >
                  Browse PDF
                </button>
              </>
            )}
            <div className="mt-5 flex flex-wrap items-center justify-center gap-2 text-xs text-slate-500 dark:text-slate-400">
              <span className="rounded-full border border-slate-200 bg-white px-3 py-1 dark:border-slate-700 dark:bg-slate-900">PDF Only</span>
              <span className="rounded-full border border-slate-200 bg-white px-3 py-1 dark:border-slate-700 dark:bg-slate-900">Max 10 MB</span>
              <span className="rounded-full border border-slate-200 bg-white px-3 py-1 dark:border-slate-700 dark:bg-slate-900">Summary · Quiz · Flashcards · Simplify · Chat</span>
            </div>
          </div>

          {validationErr && (
            <div className="mt-4 flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-500/10 px-4 py-3 text-sm text-rose-700 dark:border-rose-500/20 dark:text-rose-300">
              <AlertCircle size={15} /> {validationErr}
            </div>
          )}

          {file && !validationErr && (
            <div className="mt-4 flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-900/60">
              <FileText size={22} className="shrink-0 text-violet-600 dark:text-violet-400" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-slate-900 dark:text-white">{file.name}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">{formatBytes(file.size)}</p>
              </div>
              <button
                onClick={() => { setFile(null); setMessage(""); setUploadStage(null); }}
                className="text-slate-400 transition-colors hover:text-rose-500 dark:hover:text-rose-400"
              >
                <Trash2 size={15} />
              </button>
            </div>
          )}

          {uploadStage && (
            <div className="mt-4">
              <div className="mb-1.5 flex justify-between text-xs text-slate-500 dark:text-slate-400">
                <span>
                  {uploadStage === "uploading" ? "Uploading…" : uploadStage === "processing" ? "Processing…" : "Complete!"}
                </span>
                <span>{uploadProgress}%</span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-500 transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          )}

          <button
            onClick={handleUpload}
            disabled={loading || !file || !!validationErr}
            className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-500 to-fuchsia-500 py-3 text-sm font-semibold text-white shadow-sm transition-all hover:from-violet-600 hover:to-fuchsia-600 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {loading ? <><Loader2 size={16} className="animate-spin" /> Uploading…</> : <><Upload size={16} /> Upload PDF</>}
          </button>

          {message && (
            <div className={`mt-4 flex items-center gap-2 text-sm ${isSuccess ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}`}>
              {isSuccess ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
              {msgText}
            </div>
          )}
        </section>

        {/* Quick Actions */}
        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-[#161b22] sm:p-6">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold tracking-tight text-slate-900 dark:text-white">Quick Actions</h2>
              <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">Navigate to key areas</p>
            </div>
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-500/10 text-violet-600 dark:text-violet-300">
              <ArrowRight size={16} />
            </span>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              { label: "Create Note", sub: "Start from scratch", icon: Plus, onClick: () => navigate("/notes/create"), },
              { label: "Browse Notes", sub: "Open your library", icon: ChevronRight, onClick: () => navigate("/notes"), },
              { label: "Favorites", sub: "Access starred notes", icon: Star, onClick: () => navigate("/favorites"), },
              { label: "Dashboard", sub: "Go to overview", icon: Home, onClick: () => navigate("/dashboard"), },
            ].map(({ label, sub, icon: Icon, onClick }) => (
              <button
                key={label}
                onClick={onClick}
                className="flex flex-col rounded-2xl border border-slate-200 bg-slate-50 p-4 text-left transition-all hover:-translate-y-0.5 hover:border-violet-200 hover:shadow-md dark:border-slate-700 dark:bg-slate-900/60 dark:hover:border-violet-500/20"
              >
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-500/10 text-violet-600 dark:text-violet-300">
                  <Icon size={16} />
                </span>
                <span className="mt-3 text-sm font-semibold text-slate-900 dark:text-white">{label}</span>
                <span className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{sub}</span>
              </button>
            ))}
          </div>
        </section>

        {/* Recent Activity */}
        {recentActivity.length > 0 && (
          <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-[#161b22] sm:p-6">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold tracking-tight text-slate-900 dark:text-white">Recent Activity</h2>
                <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">Your latest AI actions</p>
              </div>
              <button
                onClick={() => navigate("/notes")}
                className="inline-flex items-center gap-1.5 rounded-full border border-violet-200 bg-white px-3 py-1.5 text-xs font-semibold text-violet-700 transition-all hover:border-violet-300 hover:bg-violet-50 dark:border-violet-500/20 dark:bg-slate-900 dark:text-violet-300 dark:hover:bg-violet-500/10"
              >
                View All <ArrowRight size={12} />
              </button>
            </div>
            <div className="space-y-2.5">
              {recentActivity.map((item, i) => (
                <div
                  key={i}
                  className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-3.5 dark:border-slate-700 dark:bg-slate-900/60"
                >
                  <ActivityIcon type={item.type} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">{item.title || "Untitled"}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">{formatRelativeTime(item.createdAt)}</p>
                  </div>
                  <span className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[11px] text-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400">
                    {item.type}
                  </span>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Recent PDFs — filters panel matches Notes.jsx */}
        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-[#161b22] sm:p-6">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold tracking-tight text-slate-900 dark:text-white">Recent PDFs</h2>
              <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                {recentTotal} {recentTotal === 1 ? "file" : "files"} total
              </p>
            </div>
          </div>

          {/* Filters — rounded-3xl panel style matching Notes.jsx */}
          <div className="mb-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-900/60">
            <div className="grid grid-cols-1 gap-3 lg:grid-cols-12 lg:gap-4">
              {/* Search */}
              <div className="lg:col-span-5">
                <label className="block">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Search</span>
                  <div className="relative mt-2">
                    <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
                    <input
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search PDFs..."
                      className="w-full rounded-2xl border border-slate-200 bg-white py-3 pl-10 pr-4 text-sm text-slate-900 outline-none transition-colors focus:border-violet-500/50 dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:placeholder-slate-500"
                    />
                    {searchQuery && (
                      <button
                        onClick={() => setSearchQuery("")}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                      >
                        <X size={14} />
                      </button>
                    )}
                  </div>
                </label>
              </div>

              {/* Sort */}
              <div className="lg:col-span-4">
                <label className="block">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Sort By</span>
                  <div className="relative mt-2">
                    <select
                      value={sortOrder}
                      onChange={(e) => setSortOrder(e.target.value)}
                      className="w-full appearance-none rounded-2xl border border-slate-200 bg-white px-4 py-3 pr-10 text-sm text-slate-900 outline-none transition-colors focus:border-violet-500/50 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                    >
                      <option value="newest">Newest</option>
                      <option value="oldest">Oldest</option>
                    </select>
                  </div>
                </label>
              </div>

              {/* View toggle — separate Grid/List buttons matching Notes.jsx */}
              <div className="lg:col-span-3 flex items-end justify-end">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleViewMode("grid")}
                    className={`inline-flex items-center gap-2 rounded-xl border px-3 py-2.5 text-sm transition-colors ${
                      viewMode === "grid"
                        ? "border-violet-500/30 bg-violet-500/10 text-violet-700 dark:text-violet-300"
                        : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-slate-600"
                    }`}
                  >
                    <Grid3X3 size={14} />
                  </button>
                  <button
                    onClick={() => handleViewMode("list")}
                    className={`inline-flex items-center gap-2 rounded-xl border px-3 py-2.5 text-sm transition-colors ${
                      viewMode === "list"
                        ? "border-violet-500/30 bg-violet-500/10 text-violet-700 dark:text-violet-300"
                        : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-slate-600"
                    }`}
                  >
                    <List size={14} />
                  </button>
                </div>
              </div>
            </div>

            {/* Filter chips — Favorites toggle as chip */}
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <button
                onClick={() => setShowFavoritesOnly(false)}
                className={`rounded-full border px-4 py-2 text-sm transition-colors ${
                  !showFavoritesOnly
                    ? "border-violet-500/30 bg-violet-500/10 text-violet-700 dark:text-violet-300"
                    : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-slate-600"
                }`}
              >
                All PDFs
              </button>
              <button
                onClick={() => setShowFavoritesOnly(true)}
                className={`rounded-full border px-4 py-2 text-sm transition-colors ${
                  showFavoritesOnly
                    ? "border-violet-500/30 bg-violet-500/10 text-violet-700 dark:text-violet-300"
                    : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-slate-600"
                }`}
              >
                Favorites
              </button>
            </div>
          </div>

          {/* Count bar */}
          <div className="mb-4 flex items-center justify-between gap-3 text-sm text-slate-600 dark:text-slate-300">
            <div>
              Showing{" "}
              <span className="font-semibold text-slate-900 dark:text-white">{currentPagePDFs.length}</span> of{" "}
              <span className="font-semibold text-slate-900 dark:text-white">{recentTotal}</span> PDFs
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400">
              Page <span className="text-slate-700 dark:text-slate-300">{currentPage}</span> of{" "}
              <span className="text-slate-700 dark:text-slate-300">{totalPages}</span>
            </div>
          </div>

          {/* Grid / List */}
          {recentLoading ? (
            <div className={viewMode === "list" ? "space-y-4" : "grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3"}>
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="h-52 animate-pulse rounded-2xl border border-slate-200 bg-slate-100 dark:border-slate-700 dark:bg-slate-800" />
              ))}
            </div>
          ) : currentPagePDFs.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-slate-200 bg-white px-6 py-12 text-center dark:border-slate-800 dark:bg-[#161b22]">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-300">
                <FileText size={24} />
              </div>
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                {showFavoritesOnly ? "No favorite PDFs yet" : "No PDFs uploaded yet"}
              </h3>
              <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-600 dark:text-slate-400">
                {showFavoritesOnly
                  ? "Star a PDF from your library to see it here."
                  : "Upload your first PDF above to get started."}
              </p>
              {showFavoritesOnly && (
                <button
                  onClick={() => setShowFavoritesOnly(false)}
                  className="mt-6 inline-flex items-center justify-center gap-2 rounded-full border border-violet-200 bg-white px-5 py-3 text-sm font-semibold text-violet-700 shadow-sm transition-all hover:border-violet-300 hover:bg-violet-50 dark:border-violet-500/20 dark:bg-slate-900 dark:text-violet-300"
                >
                  Show all PDFs
                </button>
              )}
            </div>
          ) : (
            <div className={viewMode === "list" ? "space-y-4" : "grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3"}>
              {currentPagePDFs.map((note) => renderCard(note))}
            </div>
          )}

          {/* Pagination — mirrors Notes.jsx pagination */}
          {!recentLoading && currentPagePDFs.length > 0 && (
            <div className="mt-6 flex flex-col items-center justify-between gap-3 pb-2 sm:flex-row">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-700 transition-colors hover:border-slate-300 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:border-slate-600"
              >
                <ChevronLeft size={16} /> Previous
              </button>
              <div className="text-sm text-slate-600 dark:text-slate-300">
                Page <span className="font-semibold text-slate-900 dark:text-white">{currentPage}</span> of{" "}
                <span className="font-semibold text-slate-900 dark:text-white">{totalPages}</span>
              </div>
              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage >= totalPages}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-700 transition-colors hover:border-slate-300 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:border-slate-600"
              >
                Next <ChevronRight size={16} />
              </button>
            </div>
          )}
        </section>

      </div>
    </Layout>
  );
}