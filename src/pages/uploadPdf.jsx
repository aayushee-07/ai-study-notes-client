import React, { useState, useRef, useCallback, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import Layout from "../components/Layout";
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
  ChevronRight,
  Home,
  Plus,
  List,
  LayoutGrid,
  MessageSquareText,
  CheckCircle2,
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
  if (note?.aiContent?.simplify || note?.aiContent?.simplifiedNotes) flags.push({ key: "simplify", label: "Simplify", icon: WandSparkles });
  if (note?.chats?.length > 0) flags.push({ key: "chat", label: "Chat", icon: MessageSquareText });
  return flags;
};

// ─── Sub-components ───────────────────────────────────────────────────────────

const DeleteModal = ({ isOpen, onClose, onConfirm, fileName, loading }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-[#232634] dark:bg-[#11131a]">
        <div className="mb-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="rounded-2xl bg-red-100 p-3 dark:bg-red-500/10">
              <Trash2 size={22} className="text-red-600 dark:text-red-400" />
            </div>
            <h3 className="text-xl font-bold text-slate-900 dark:text-white">Delete Note</h3>
          </div>
          <button onClick={onClose} className="text-slate-500 transition-colors hover:text-slate-700 dark:text-slate-400 dark:hover:text-white">
            <X size={20} />
          </button>
        </div>
        <p className="mb-2 text-slate-600 dark:text-slate-400">Are you sure you want to delete this note?</p>
        <p className="mb-6 break-words text-sm text-slate-500 dark:text-slate-500">"{fileName}"</p>
        <p className="mb-6 text-xs text-red-600 dark:text-red-400">This action cannot be undone.</p>
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 rounded-xl bg-slate-100 px-4 py-3 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-200 dark:border dark:border-[#232634] dark:bg-[#0d1016] dark:text-slate-300 dark:hover:bg-[#1e2030]">
            Cancel
          </button>
          <button onClick={onConfirm} disabled={loading} className="flex-1 rounded-xl bg-red-600 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60">
            {loading ? "Deleting..." : "Delete Permanently"}
          </button>
        </div>
      </div>
    </div>
  );
};

/** Matches Favorites/Profile StatCard exactly */
function StatCard({ label, value, icon, iconBg, valueColor, subtext }) {
  return (
    <div className="flex h-full flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md dark:border-slate-800 dark:bg-[#161b22]">
      <div className="mb-4 flex items-center justify-between">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">{label}</span>
        <span className={`flex h-9 w-9 items-center justify-center rounded-xl ${iconBg}`}>{icon}</span>
      </div>
      <p className={`text-3xl font-bold ${valueColor}`}>{value}</p>
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

function CardActions({ note, navigate, handleFavorite, openDeleteModal, deletingId }) {
  return (
    <div className="mt-auto flex flex-wrap gap-2 pt-4">
      <button
        onClick={() => navigate(`/notes/${note._id}`)}
        className="inline-flex items-center gap-1.5 rounded-xl border border-violet-200 bg-violet-50 px-3 py-2 text-xs font-medium text-violet-700 transition-colors hover:bg-violet-100 dark:border-violet-500/20 dark:bg-violet-500/10 dark:text-violet-300 dark:hover:bg-violet-500/15"
      >
        <ExternalLink size={12} /> Open Workspace
      </button>
      <button
        onClick={() => handleFavorite(note._id, note.favorite)}
        className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-medium transition-colors ${
          note.favorite
            ? "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-400"
            : "border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100 dark:border-[#232634] dark:bg-[#0d1016] dark:text-slate-300 dark:hover:bg-[#1e2030]"
        }`}
      >
        <Star size={12} fill={note.favorite ? "currentColor" : "none"} />
        {note.favorite ? "Unfavorite" : "Favorite"}
      </button>
      <button
        onClick={() => openDeleteModal(note._id, note.title, note.pdfFile)}
        disabled={deletingId === note._id}
        className="inline-flex items-center gap-1.5 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-medium text-red-600 transition-colors hover:bg-red-100 disabled:opacity-40 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-400 dark:hover:bg-red-500/20"
      >
        {deletingId === note._id ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />} Delete
      </button>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function UploadPDF() {
  const navigate = useNavigate();
  const token = localStorage.getItem("token");
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (!localStorage.getItem("theme")) localStorage.setItem("theme", "light");
  }, []);

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
  const [viewMode, setViewMode] = useState(() => localStorage.getItem("pdfView") || "grid");

  const [pdfStats, setPdfStats] = useState({
    totalPDFs: 0,
    totalCharacters: 0,
    aiFeaturesGenerated: 0,
    lastUploadDate: null,
  });

  const [recentActivity, setRecentActivity] = useState([]);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState(null);
  const [pendingDeleteName, setPendingDeleteName] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 6;

  useEffect(() => { localStorage.setItem("pdfView", viewMode); }, [viewMode]);

  const triggerToast = (msg) => {
    setToastMessage(msg);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 3000);
  };

  const fetchData = useCallback(async () => {
    setRecentLoading(true);
    try {
      const res = await apiClient.get("/notes/all", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const notes = res.data?.notes || res.data || [];
      const filteredNotes = notes.filter((n) => n.pdfFile);
      setRecentPDFs(filteredNotes);

      const totalPDFs = filteredNotes.length;
      const totalCharacters = filteredNotes.reduce((sum, n) => sum + (n.extractedText?.length || 0), 0);
      const aiFeaturesGenerated = filteredNotes.filter(hasAnyAIFeature).length;
      const lastUpload = [...filteredNotes].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))[0];
      setPdfStats({ totalPDFs, totalCharacters, aiFeaturesGenerated, lastUploadDate: lastUpload?.createdAt });

      try {
        const historyRes = await apiClient.get("/api/ai/history", {
          headers: { Authorization: `Bearer ${token}` },
        });
        setRecentActivity((historyRes.data?.history || []).slice(0, 3));
      } catch {
        setRecentActivity([]);
      }
    } catch {
      setRecentPDFs([]);
    } finally {
      setRecentLoading(false);
    }
  }, [token]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const filteredPDFs = useMemo(() => {
    return recentPDFs
      .filter((note) => {
        if (searchQuery && !safeText(note.title).toLowerCase().includes(searchQuery.toLowerCase())) return false;
        if (showFavoritesOnly && !note.favorite) return false;
        return true;
      })
      .sort((a, b) => {
        const diff = new Date(b.createdAt) - new Date(a.createdAt);
        return sortOrder === "newest" ? diff : -diff;
      });
  }, [recentPDFs, searchQuery, showFavoritesOnly, sortOrder]);

  useEffect(() => { setCurrentPage(1); }, [searchQuery, sortOrder, showFavoritesOnly, viewMode]);

  const totalPages = Math.max(1, Math.ceil(filteredPDFs.length / pageSize));
  useEffect(() => { if (currentPage > totalPages) setCurrentPage(totalPages); }, [currentPage, totalPages]);

  const currentPagePDFs = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredPDFs.slice(start, start + pageSize);
  }, [filteredPDFs, currentPage]);

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
    triggerToast("File selected successfully!");
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
      const res = await apiClient.post("/api/ai/upload", formData, {
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "multipart/form-data" },
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
      triggerToast("🎉 PDF uploaded successfully!");
      setTimeout(() => navigate(`/notes/${res.data.note._id}`), 2500);
    } catch (error) {
      setUploadStage(null);
      setMessage(`error:${error.response?.data?.message || "Upload failed"}`);
    } finally {
      setLoading(false);
    }
  };

  const openDeleteModal = (noteId, title, fileName) => {
    setPendingDeleteId(noteId);
    setPendingDeleteName(title || fileName || "Untitled Note");
    setShowDeleteModal(true);
  };

  const handleDeleteConfirm = async () => {
    if (!pendingDeleteId) return;
    setDeletingId(pendingDeleteId);
    try {
      await apiClient.delete(`/api/notes/${pendingDeleteId}`, { headers: { Authorization: `Bearer ${token}` } });
      setRecentPDFs((prev) => prev.filter((n) => n._id !== pendingDeleteId));
      triggerToast("Note deleted successfully");
      fetchData();
    } catch {}
    finally {
      setDeletingId(null);
      setPendingDeleteId(null);
      setPendingDeleteName("");
      setShowDeleteModal(false);
    }
  };

  const handleFavorite = async (noteId, currentFavorite) => {
    setRecentPDFs((prev) => prev.map((n) => (n._id === noteId ? { ...n, favorite: !currentFavorite } : n)));
    try {
      await apiClient.put(`/api/notes/favorite/${noteId}`, {}, { headers: { Authorization: `Bearer ${token}` } });
    } catch {
      setRecentPDFs((prev) => prev.map((n) => (n._id === noteId ? { ...n, favorite: currentFavorite } : n)));
      triggerToast("Failed to update favorite");
    }
  };

  const isSuccess = message.startsWith("success:");
  const isError = message.startsWith("error:");
  const msgText = message.replace(/^(success|error):/, "");
  const pageButtons = Array.from({ length: totalPages }, (_, i) => i + 1);
  const recentTotal = filteredPDFs.length;

  const renderCard = (note) => {
    const aiFlags = getAIFlags(note);

    if (viewMode === "list") {
      return (
        <div
          key={note._id}
          className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-5 transition-all hover:-translate-y-0.5 hover:border-violet-200 hover:shadow-md dark:border-slate-800 dark:bg-[#161b22] dark:hover:border-violet-500/20 sm:flex-row sm:items-center"
        >
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-violet-200 bg-violet-50 dark:border-violet-500/20 dark:bg-violet-500/10">
            <FileText size={16} className="text-violet-600 dark:text-violet-400" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center rounded-full border border-violet-200 bg-violet-50 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider text-violet-700 dark:border-violet-500/20 dark:bg-violet-500/10 dark:text-violet-300">
                PDF
              </span>
              {note.favorite && (
                <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-[11px] text-amber-700 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-400">
                  <Star size={10} fill="currentColor" /> Favorite
                </span>
              )}
            </div>
            <h3 className="mt-1.5 line-clamp-1 text-sm font-semibold text-slate-900 dark:text-white">{note.title || "Untitled Note"}</h3>
            <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
              <span className="inline-flex items-center gap-1"><Calendar size={11} /> {formatDate(note.createdAt)}</span>
              {note.extractedText && <span>{note.extractedText.length.toLocaleString()} chars</span>}
            </div>
            {aiFlags.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {aiFlags.map(({ key, label, icon: Icon }) => (
                  <span key={key} className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
                    <Icon size={10} className="text-violet-500" /> {label}
                  </span>
                ))}
              </div>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2 sm:justify-end">
            <button onClick={() => navigate(`/notes/${note._id}`)} className="inline-flex items-center gap-1.5 rounded-xl border border-violet-200 bg-violet-50 px-3 py-2 text-xs font-medium text-violet-700 transition-colors hover:bg-violet-100 dark:border-violet-500/20 dark:bg-violet-500/10 dark:text-violet-300 dark:hover:bg-violet-500/15">
              <ExternalLink size={12} /> Open
            </button>
            <button onClick={() => handleFavorite(note._id, note.favorite)} className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-medium transition-colors ${note.favorite ? "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-400" : "border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"}`}>
              <Star size={12} fill={note.favorite ? "currentColor" : "none"} />
              {note.favorite ? "Unfavorite" : "Favorite"}
            </button>
            <button onClick={() => openDeleteModal(note._id, note.title, note.pdfFile)} disabled={deletingId === note._id} className="inline-flex items-center gap-1.5 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-medium text-red-600 transition-colors hover:bg-red-100 disabled:opacity-40 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-400">
              {deletingId === note._id ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />} Delete
            </button>
          </div>
        </div>
      );
    }

    return (
      <div
        key={note._id}
        className="flex h-full flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:border-violet-200 hover:shadow-md dark:border-slate-800 dark:bg-[#161b22] dark:hover:border-violet-500/20"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-violet-200 bg-violet-50 dark:border-violet-500/20 dark:bg-violet-500/10">
              <FileText size={16} className="text-violet-600 dark:text-violet-400" />
            </div>
            <div className="min-w-0">
              <h3 className="line-clamp-2 text-sm font-semibold tracking-tight text-slate-900 dark:text-white">{note.title || "Untitled Note"}</h3>
              <p className="mt-0.5 truncate text-xs text-slate-500 dark:text-slate-400">{note.pdfFile?.split("/").pop() || "PDF"}</p>
            </div>
          </div>
          <span className="shrink-0 inline-flex items-center rounded-full border border-violet-200 bg-violet-50 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider text-violet-700 dark:border-violet-500/20 dark:bg-violet-500/10 dark:text-violet-300">
            PDF
          </span>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
          <span className="inline-flex items-center gap-1"><Calendar size={11} /> {formatDate(note.createdAt)}</span>
          {note.extractedText && <span>{note.extractedText.length.toLocaleString()} chars</span>}
          {note.favorite && (
            <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[11px] text-amber-700 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-400">
              <Star size={10} fill="currentColor" /> Fav
            </span>
          )}
        </div>

        {aiFlags.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {aiFlags.map(({ key, label, icon: Icon }) => (
              <span key={key} className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
                <Icon size={10} className="text-violet-500" /> {label}
              </span>
            ))}
          </div>
        )}

        <CardActions note={note} navigate={navigate} handleFavorite={handleFavorite} openDeleteModal={openDeleteModal} deletingId={deletingId} />
      </div>
    );
  };

  // ─── Render ─────────────────────────────────────────────────────────────────

  return (
    <Layout>
      {/* Toast */}
      {showToast && (
        <div className="fixed right-4 top-4 z-50 flex items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-3.5 shadow-xl dark:border-emerald-500/25 dark:bg-emerald-500/10">
          <CheckCircle2 size={18} className="text-emerald-600 dark:text-emerald-400" />
          <p className="text-sm font-medium text-emerald-700 dark:text-emerald-400">{toastMessage}</p>
        </div>
      )}

      <DeleteModal isOpen={showDeleteModal} onClose={() => setShowDeleteModal(false)} onConfirm={handleDeleteConfirm} fileName={pendingDeleteName} loading={deletingId === pendingDeleteId} />

      {/* ── Outer flow: matches Favorites exactly ── */}
      <div className="space-y-6 lg:space-y-8">

        {/* ── Hero Header ─────────────────────────────────────────────────── */}
        <section className="rounded-3xl border border-violet-200/60 bg-gradient-to-br from-violet-50 via-white to-fuchsia-50 p-5 shadow-sm dark:border-slate-800 dark:from-[#161b22] dark:via-[#161b22] dark:to-[#11151c] sm:p-7 lg:p-8">
          <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
            <div className="max-w-2xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-violet-200 bg-white px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-violet-700 shadow-sm dark:border-violet-500/20 dark:bg-slate-900 dark:text-violet-300">
                PDF WORKSPACE
              </div>
              <h1 className="mt-4 text-3xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-4xl">
                Upload PDF <span className="align-middle">📄</span>
              </h1>
              <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-400 sm:text-base">
                Transform PDFs into summaries, quizzes, flashcards, simplified notes and AI-powered study material.
              </p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row md:justify-end">
              <button
                onClick={fetchData}
                className="inline-flex items-center justify-center gap-2 rounded-full border border-violet-200 bg-white px-4 py-2.5 text-sm font-semibold text-violet-700 shadow-sm transition-all hover:border-violet-300 hover:bg-violet-50 dark:border-violet-500/20 dark:bg-slate-900 dark:text-violet-300 dark:hover:bg-violet-500/10"
              >
                <RefreshCw size={14} className={recentLoading ? "animate-spin" : ""} /> Refresh
              </button>
              <button
                onClick={() => navigate("/notes")}
                className="inline-flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-500 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:from-violet-600 hover:to-fuchsia-600 hover:shadow-md"
              >
                Browse Notes <ArrowRight size={14} />
              </button>
            </div>
          </div>
        </section>

        {/* ── Stat Cards ──────────────────────────────────────────────────── */}
        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            label="Total PDFs"
            value={pdfStats.totalPDFs}
            icon={<FileText size={18} />}
            iconBg="bg-violet-500/10 text-violet-600 dark:text-violet-300"
            valueColor="text-violet-600 dark:text-violet-300"
            subtext="All uploaded PDFs"
          />
          <StatCard
            label="AI Workspaces"
            value={pdfStats.aiFeaturesGenerated}
            icon={<Sparkles size={18} />}
            iconBg="bg-emerald-500/10 text-emerald-600 dark:text-emerald-300"
            valueColor="text-emerald-600 dark:text-emerald-300"
            subtext="PDFs with AI features"
          />
          <StatCard
            label="Characters Extracted"
            value={pdfStats.totalCharacters.toLocaleString()}
            icon={<TrendingUp size={18} />}
            iconBg="bg-indigo-500/10 text-indigo-600 dark:text-indigo-300"
            valueColor="text-indigo-600 dark:text-indigo-300"
            subtext="Text pulled from PDFs"
          />
          <StatCard
            label="Last Upload"
            value={pdfStats.lastUploadDate ? formatRelativeTime(pdfStats.lastUploadDate) : "—"}
            icon={<Calendar size={18} />}
            iconBg="bg-amber-500/10 text-amber-600 dark:text-amber-300"
            valueColor="text-amber-600 dark:text-amber-300"
            subtext={pdfStats.lastUploadDate ? formatDate(pdfStats.lastUploadDate) : "No uploads yet"}
          />
        </section>

        {/* ── Upload Box ──────────────────────────────────────────────────── */}
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

          {/* Drop zone */}
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
            <input ref={fileInputRef} type="file" accept="application/pdf" className="hidden" onChange={(e) => pickFile(e.target.files[0])} />
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
                <button type="button" className="mt-4 inline-flex items-center gap-2 rounded-full bg-violet-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-violet-700">
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

          {/* Validation error */}
          {validationErr && (
            <div className="mt-4 flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-400">
              <AlertCircle size={15} /> {validationErr}
            </div>
          )}

          {/* Selected file preview */}
          {file && !validationErr && (
            <div className="mt-4 flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-900/60">
              <FileText size={22} className="shrink-0 text-violet-600 dark:text-violet-400" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-slate-900 dark:text-white">{file.name}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">{formatBytes(file.size)}</p>
              </div>
              <button
                onClick={() => { setFile(null); setMessage(""); setUploadStage(null); }}
                className="text-slate-400 transition-colors hover:text-red-500 dark:hover:text-red-400"
              >
                <Trash2 size={15} />
              </button>
            </div>
          )}

          {/* Progress bar */}
          {uploadStage && (
            <div className="mt-4">
              <div className="mb-1.5 flex justify-between text-xs text-slate-500 dark:text-slate-400">
                <span>{uploadStage === "uploading" ? "Uploading…" : uploadStage === "processing" ? "Processing…" : "Complete!"}</span>
                <span>{uploadProgress}%</span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
                <div className="h-full rounded-full bg-gradient-to-r from-violet-600 to-violet-400 transition-all duration-300" style={{ width: `${uploadProgress}%` }} />
              </div>
            </div>
          )}

          {/* Upload button */}
          <button
            onClick={handleUpload}
            disabled={loading || !file || !!validationErr}
            className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-violet-600 py-3 text-sm font-semibold text-white transition-colors hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {loading ? <><Loader2 size={16} className="animate-spin" /> Uploading…</> : <><Upload size={16} /> Upload PDF</>}
          </button>

          {/* Upload result */}
          {message && (
            <div className={`mt-4 flex items-center gap-2 text-sm ${isSuccess ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}>
              {isSuccess ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
              {msgText}
            </div>
          )}
        </section>

        {/* ── Quick Actions ────────────────────────────────────────────────── */}
        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-[#161b22] sm:p-6">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold tracking-tight text-slate-900 dark:text-white">Quick Actions</h2>
              <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">Navigate to key areas</p>
            </div>
            <ArrowRight size={16} className="text-slate-400 dark:text-slate-500" />
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              { label: "Create Note", sub: "Start from scratch", icon: Plus, onClick: () => navigate("/notes/create"), color: "bg-indigo-500/10 text-indigo-600 dark:text-indigo-300" },
              { label: "Browse Notes", sub: "Open your library", icon: ChevronRight, onClick: () => navigate("/notes"), color: "bg-violet-500/10 text-violet-600 dark:text-violet-300" },
              { label: "Favorites", sub: "Access starred notes", icon: Star, onClick: () => navigate("/favorites"), color: "bg-amber-500/10 text-amber-600 dark:text-amber-300" },
              { label: "Dashboard", sub: "Go to overview", icon: Home, onClick: () => navigate("/dashboard"), color: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-300" },
            ].map(({ label, sub, icon: Icon, onClick, color }) => (
              <button
                key={label}
                onClick={onClick}
                className="flex flex-col rounded-2xl border border-slate-200 bg-slate-50 p-4 text-left transition-all hover:-translate-y-0.5 hover:border-violet-200 hover:shadow-md dark:border-slate-700 dark:bg-slate-900/60 dark:hover:border-violet-500/20"
              >
                <span className={`flex h-9 w-9 items-center justify-center rounded-xl ${color}`}>
                  <Icon size={16} />
                </span>
                <span className="mt-3 text-sm font-semibold text-slate-900 dark:text-white">{label}</span>
                <span className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{sub}</span>
              </button>
            ))}
          </div>
        </section>

        {/* ── Recent Activity (conditional) ───────────────────────────────── */}
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
                <div key={i} className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-3.5 dark:border-slate-700 dark:bg-slate-900/60">
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

        {/* ── Recent PDFs ──────────────────────────────────────────────────── */}
        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-[#161b22] sm:p-6">
          {/* Section header */}
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-base font-bold tracking-tight text-slate-900 dark:text-white">Recent PDFs</h2>
              <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                {recentTotal} {recentTotal === 1 ? "file" : "files"} total
              </p>
            </div>
            {/* Controls */}
            <div className="flex flex-wrap items-center gap-2">
              {/* Search */}
              <div className="relative">
                <Search size={13} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search…"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-36 rounded-xl border border-slate-200 bg-slate-50 py-2 pl-8 pr-7 text-sm text-slate-900 outline-none transition focus:border-violet-400 focus:ring-0 dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:placeholder-slate-500 sm:w-44"
                />
                {searchQuery && (
                  <button onClick={() => setSearchQuery("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                    <X size={11} />
                  </button>
                )}
              </div>
              {/* Sort */}
              <select
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value)}
                className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-violet-400 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
              >
                <option value="newest">Newest</option>
                <option value="oldest">Oldest</option>
              </select>
              {/* Favorites toggle */}
              <button
                onClick={() => setShowFavoritesOnly(!showFavoritesOnly)}
                className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-2 text-sm font-medium transition-all ${
                  showFavoritesOnly
                    ? "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-400"
                    : "border-slate-200 bg-slate-50 text-slate-600 hover:text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400 dark:hover:text-white"
                }`}
              >
                <Star size={13} fill={showFavoritesOnly ? "currentColor" : "none"} /> Favorites
              </button>
              {/* View toggle */}
              <button
                onClick={() => setViewMode(viewMode === "grid" ? "list" : "grid")}
                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                {viewMode === "grid" ? <List size={14} /> : <LayoutGrid size={14} />}
                {viewMode === "grid" ? "List" : "Grid"}
              </button>
            </div>
          </div>

          {/* Active filter pill */}
          {showFavoritesOnly && (
            <div className="mb-3">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-medium text-amber-700 dark:border-amber-500/25 dark:bg-amber-500/10 dark:text-amber-400">
                <Star size={10} fill="currentColor" /> Favorites only
                <button onClick={() => setShowFavoritesOnly(false)} className="ml-1 hover:opacity-70"><X size={10} /></button>
              </span>
            </div>
          )}

          {/* Cards */}
          {recentLoading ? (
            <div className={`grid grid-cols-1 gap-4 ${viewMode === "grid" ? "md:grid-cols-2 xl:grid-cols-3" : ""}`}>
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="h-52 animate-pulse rounded-2xl border border-slate-200 bg-slate-100 dark:border-slate-700 dark:bg-slate-800" />
              ))}
            </div>
          ) : currentPagePDFs.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-6 py-12 text-center dark:border-slate-700 dark:bg-slate-900/40">
              <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-violet-500/10 text-violet-600 dark:text-violet-300">
                <FileText size={24} />
              </div>
              <p className="text-sm font-semibold text-slate-900 dark:text-white">
                {showFavoritesOnly ? "No favorite PDFs yet" : "No PDFs uploaded yet"}
              </p>
              <p className="mx-auto mt-1.5 max-w-md text-xs leading-5 text-slate-500 dark:text-slate-400">
                {showFavoritesOnly ? "Star a PDF from your library to see it here." : "Upload your first PDF above to get started."}
              </p>
              {showFavoritesOnly && (
                <button onClick={() => setShowFavoritesOnly(false)} className="mt-4 rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
                  Show all PDFs
                </button>
              )}
            </div>
          ) : (
            <div className={`grid grid-cols-1 gap-4 ${viewMode === "grid" ? "md:grid-cols-2 xl:grid-cols-3" : ""}`}>
              {currentPagePDFs.map((note) => renderCard(note))}
            </div>
          )}

          {/* Pagination */}
          {!recentLoading && currentPagePDFs.length > 0 && (
            <div className="mt-5 flex flex-col gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-700 dark:bg-slate-900/60 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs text-slate-500 dark:text-slate-400">Page {currentPage} of {totalPages}</p>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
                >
                  Previous
                </button>
                {pageButtons.map((page) => (
                  <button
                    key={page}
                    onClick={() => setCurrentPage(page)}
                    className={`h-8 min-w-[2rem] rounded-xl border px-2.5 text-xs font-medium transition-colors ${
                      page === currentPage
                        ? "border-violet-200 bg-violet-600 text-white dark:border-violet-500/20"
                        : "border-slate-200 bg-white text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
                    }`}
                  >
                    {page}
                  </button>
                ))}
                <button
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage >= totalPages}
                  className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </section>

      </div>
    </Layout>
  );
}