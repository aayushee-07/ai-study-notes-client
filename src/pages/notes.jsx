import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTheme } from "../context/ThemeContext";
import Layout from "../components/Layout";
import apiClient from "../lib/apiClient";
import {
  Search,
  ChevronDown,
  Clock3,
  Star,
  FileText,
  Pencil,
  Eye,
  Trash2,
  Tag,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  BookOpen,
  AlertCircle,
  X,
  CheckCircle2,
  Info,
  Upload,
  Plus,
  Grid3X3,
  List,
  MessageSquareText,
  HelpCircle,
  WandSparkles,
  LibraryBig,
  FileBadge2,
  BookMarked,
} from "lucide-react";

function formatDate(value) {
  if (!value) return "—";
  try {
    return new Date(value).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return "—";
  }
}

function formatRelativeDays(value) {
  if (!value) return false;
  try {
    const diff = Date.now() - new Date(value).getTime();
    return Math.floor(diff / (1000 * 60 * 60 * 24)) <= 3;
  } catch {
    return false;
  }
}

function formatPreview(text, max = 145) {
  const raw = String(text || "").trim().replace(/\s+/g, " ");
  if (!raw) return "No preview available.";
  if (raw.length <= max) return raw;
  return raw.slice(0, max).trimEnd() + "...";
}

function getNoteId(note) { return note?._id || note?.id || null; }
function getTitle(note) { return note?.title || note?.name || note?.fileName || note?.originalName || "Untitled note"; }
function getSubject(note) { return note?.subject || note?.category || note?.folder || "General"; }
function isFavorite(note) { return Boolean(note?.favorite || note?.isFavorite || note?.favorited || note?.starred); }
function getTags(note) {
  if (Array.isArray(note?.tags)) return note.tags.filter(Boolean);
  if (typeof note?.tags === "string") return note.tags.split(",").map((t) => t.trim()).filter(Boolean);
  return [];
}
function getCreatedAt(note) { return note?.createdAt || note?.updatedAt || note?.lastUpdated || null; }
function getNoteType(note) {
  const source = String(note?.source || note?.fileType || note?.type || "").toLowerCase();
  const name = String(note?.fileName || note?.originalName || note?.title || "").toLowerCase();
  if (source.includes("pdf") || name.endsWith(".pdf") || note?.pdfUrl || note?.fileUrl) return "PDF";
  if (note?.aiGenerated || note?.generatedByAI || source.includes("ai")) return "AI Note";
  return "Manual Note";
}
function isPdfNote(note) { return getNoteType(note) === "PDF"; }
function isManualNote(note) { return getNoteType(note) === "Manual Note"; }
function hasSummary(note) { return Boolean(note?.aiContent?.summary); }
function hasQuiz(note) { return Boolean(note?.aiContent?.quiz); }
function hasFlashcards(note) { return Boolean(note?.aiContent?.flashcards); }
function hasSimplify(note) { return Boolean(note?.aiContent?.simplify); }
function normalizeNotesData(data) {
  const raw = Array.isArray(data) ? data : data?.notes || data?.items || data?.data || [];
  return raw.map((n) => ({ ...n, title: getTitle(n), subject: getSubject(n) }));
}

function Toast({ toast, onClose }) {
  if (!toast) return null;
  const tone =
    toast.type === "success"
      ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-700 dark:text-emerald-300"
      : toast.type === "error"
        ? "bg-rose-500/10 border-rose-500/20 text-rose-700 dark:text-rose-300"
        : "bg-sky-500/10 border-sky-500/20 text-sky-700 dark:text-sky-300";
  const Icon = toast.type === "success" ? CheckCircle2 : toast.type === "error" ? AlertCircle : Info;
  return (
    <div className={`fixed right-4 top-4 z-50 flex w-[calc(100vw-2rem)] max-w-sm items-start gap-3 rounded-2xl border px-4 py-3 shadow-xl backdrop-blur sm:w-auto ${tone}`}>
      <Icon size={18} className="mt-0.5 shrink-0" />
      <div className="flex-1 text-sm leading-5">{toast.message}</div>
      <button onClick={onClose} className="transition-opacity hover:opacity-100" aria-label="Close toast">
        <X size={16} />
      </button>
    </div>
  );
}

function SkeletonCard() {
  return (
    <div className="h-56 animate-pulse rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-[#161b22]" />
  );
}

function EmptyState({ onCreate, onUpload }) {
  return (
    <div className="rounded-3xl border border-dashed border-slate-200 bg-white px-6 py-12 text-center dark:border-slate-800 dark:bg-[#161b22]">
      <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-300">
        <BookOpen size={24} />
      </div>
      <h3 className="text-lg font-semibold text-slate-900 dark:text-white">No notes found</h3>
      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-600 dark:text-slate-400">
        Try adjusting your search or filters. You can also create a new note or upload a PDF to get started.
      </p>
      <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
        <button
          onClick={onCreate}
          className="inline-flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-500 px-5 py-3 text-sm font-semibold text-white shadow-sm transition-all hover:from-violet-600 hover:to-fuchsia-600 hover:shadow-md"
        >
          <Plus size={14} /> Create Note
        </button>
        <button
          onClick={onUpload}
          className="inline-flex items-center justify-center gap-2 rounded-full border border-violet-200 bg-white px-5 py-3 text-sm font-semibold text-violet-700 shadow-sm transition-all hover:border-violet-300 hover:bg-violet-50 dark:border-violet-500/20 dark:bg-slate-900 dark:text-violet-300 dark:hover:bg-violet-500/10"
        >
          <Upload size={14} /> Upload PDF
        </button>
      </div>
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
              <span className="font-medium text-slate-900 dark:text-white">{getTitle(note)}</span>.
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

function StatCard({ label, value, icon, subtext }) {
  return (
    <div className="flex h-full flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md dark:border-slate-800 dark:bg-[#161b22]">
      <div className="mb-4 flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">{label}</span>
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-500/10 text-violet-600 dark:text-violet-300">{icon}</span>
      </div>
      <div className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">{value}</div>
      {subtext ? <p className="mt-2 text-xs leading-5 text-slate-500 dark:text-slate-400">{subtext}</p> : null}
    </div>
  );
}

function Notes() {
  const { darkMode } = useTheme();
  const navigate = useNavigate();

  const [notes, setNotes] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("newest");
  const [subject, setSubject] = useState("all");
  const [activeChip, setActiveChip] = useState("all");
  const [toast, setToast] = useState(null);
  const [favoriteBusyId, setFavoriteBusyId] = useState(null);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);

  // FIX #3: Read AND write viewMode to localStorage
  const [viewMode, setViewMode] = useState(
    () => localStorage.getItem("notes-view-mode") || "grid"
  );
  const handleViewMode = (mode) => {
    setViewMode(mode);
    localStorage.setItem("notes-view-mode", mode);
  };

  const showToast = useCallback((message, type = "info") => {
    setToast({ message, type, id: Date.now() });
  }, []);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2800);
    return () => clearTimeout(t);
  }, [toast]);

  const fetchNotes = useCallback(
    async (pageNumber = 1, silent = false) => {
      silent ? setRefreshing(true) : setLoading(true);
      try {
        const res = await apiClient.get(`/notes/all?page=${pageNumber}`);
        const list = normalizeNotesData(res?.data);
        const count = Number(res?.data?.totalCount ?? res?.data?.totalNotes ?? list.length ?? 0);
        setNotes(list);
        setTotalCount(count);
        setPage(pageNumber);
      } catch (err) {
        showToast(err?.response?.data?.message || err?.message || "Failed to load notes.", "error");
      } finally {
        silent ? setRefreshing(false) : setLoading(false);
      }
    },
    [showToast]
  );

  useEffect(() => { fetchNotes(page); }, [fetchNotes, page]);

  // FIX #6: Reset to page 1 when filters change
  useEffect(() => { setPage(1); }, [search, sortBy, subject, activeChip]);

  const subjects = useMemo(
    () => Array.from(new Set(notes.map((n) => n.subject).filter(Boolean))),
    [notes]
  );

  const filteredNotes = useMemo(() => {
    let list = [...notes];
    if (activeChip === "favorites") list = list.filter(isFavorite);
    if (activeChip === "pdfs") list = list.filter(isPdfNote);
    if (activeChip === "manual") list = list.filter(isManualNote);
    if (subject !== "all") list = list.filter((n) => n.subject === subject);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((n) =>
        getTitle(n).toLowerCase().includes(q) ||
        n.subject?.toLowerCase().includes(q) ||
        (n?.content || "").toLowerCase().includes(q) ||
        getTags(n).join(" ").toLowerCase().includes(q)
      );
    }
    const sorters = {
      newest: (a, b) => new Date(getCreatedAt(b) || 0) - new Date(getCreatedAt(a) || 0),
      oldest: (a, b) => new Date(getCreatedAt(a) || 0) - new Date(getCreatedAt(b) || 0),
      az: (a, b) => getTitle(a).localeCompare(getTitle(b)),
      favorites: (a, b) =>
        Number(isFavorite(b)) - Number(isFavorite(a)) ||
        new Date(getCreatedAt(b) || 0) - new Date(getCreatedAt(a) || 0),
    };
    return list.sort(sorters[sortBy] || sorters.newest);
  }, [notes, search, sortBy, subject, activeChip]);

  const totalPages = Math.max(1, Math.ceil(totalCount / 12));
  const favoriteCount = useMemo(() => notes.filter(isFavorite).length, [notes]);

  const stats = useMemo(() => [
    { label: "Total Notes", value: notes.length, icon: <LibraryBig size={18} />, subtext: "All loaded notes" },
    { label: "Favorites", value: notes.filter(isFavorite).length, icon: <Star size={18} />, subtext: "All starred notes" },
    { label: "PDF Notes", value: notes.filter(isPdfNote).length, icon: <FileBadge2 size={18} />, subtext: "Uploaded PDFs" },
    { label: "Manual Notes", value: notes.filter(isManualNote).length, icon: <BookMarked size={18} />, subtext: "Handwritten notes" },
  ], [notes]);

  const handleEdit = useCallback((id) => { if (id) navigate(`/notes/edit/${id}`); }, [navigate]);
  const handleView = useCallback((id) => { if (id) navigate(`/notes/${id}`); }, [navigate]);

  const handleDeleteConfirm = useCallback(async () => {
    const id = deleteTarget?.id;
    if (!id) return;
    setDeleteBusy(true);
    try {
      await apiClient.delete(`/notes/${id}`);
      showToast("Note deleted.", "success");
      setDeleteTarget(null);
      await fetchNotes(page, true);
    } catch (err) {
      showToast(err?.response?.data?.message || "Failed to delete note.", "error");
    } finally { setDeleteBusy(false); }
  }, [deleteTarget, fetchNotes, page, showToast]);

  // FIX #4: Renamed from previewCount → getPreviewText (it returns text, not a count)
  const getPreviewText = useCallback(
    (note) => formatPreview(note?.content || note?.excerpt || note?.summary || note?.preview || "", 145),
    []
  );

  // FIX #5: Optimistic favorite toggle — no extra fetchNotes call
  const handleToggleFavorite = useCallback(async (note) => {
    const noteId = getNoteId(note);
    if (!noteId) return;
    setFavoriteBusyId(noteId);
    // Optimistically flip locally
    setNotes((prev) =>
      prev.map((item) => {
        if (getNoteId(item) !== noteId) return item;
        return { ...item, favorite: !isFavorite(item), isFavorite: !isFavorite(item) };
      })
    );
    try {
      const res = await apiClient.put(`/notes/favorite/${noteId}`);
      const updated = res?.data?.note || res?.data || null;
      if (updated && typeof updated === "object") {
        setNotes((prev) =>
          prev.map((item) => (getNoteId(item) === noteId ? { ...item, ...updated } : item))
        );
      }
      showToast("Favorite updated.", "success");
    } catch (err) {
      // Revert optimistic update on error
      setNotes((prev) =>
        prev.map((item) => {
          if (getNoteId(item) !== noteId) return item;
          return { ...item, favorite: !isFavorite(item), isFavorite: !isFavorite(item) };
        })
      );
      showToast(err?.response?.data?.message || "Failed to update favorite.", "error");
    } finally {
      setFavoriteBusyId(null);
    }
  }, [showToast]);

  return (
    <Layout>
      <Toast toast={toast} onClose={() => setToast(null)} />
      <ConfirmDeleteModal
        note={deleteTarget?.note}
        loading={deleteBusy}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={handleDeleteConfirm}
      />

      <div className="space-y-6 lg:space-y-8">

        {/* Hero */}
        <section className="rounded-3xl border border-violet-200/60 bg-gradient-to-br from-violet-50 via-white to-fuchsia-50 p-5 shadow-sm dark:border-slate-800 dark:from-[#161b22] dark:via-[#161b22] dark:to-[#11151c] sm:p-7 lg:p-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-violet-200 bg-white px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-violet-700 shadow-sm dark:border-violet-500/20 dark:bg-slate-900 dark:text-violet-300">
                <Sparkles size={11} /> Notes Library
              </div>
              <h1 className="mt-4 text-2xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-3xl">
                All Notes
              </h1>
              <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-400">
                Search, sort, filter, and manage your notes from one place.
              </p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <button
                onClick={() => navigate("/notes/create")}
                className="inline-flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-500 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:from-violet-600 hover:to-fuchsia-600 hover:shadow-md"
              >
                <Plus size={14} /> Create Note
              </button>
              <button
                onClick={() => navigate("/upload")}
                className="inline-flex items-center justify-center gap-2 rounded-full border border-violet-200 bg-white px-4 py-2.5 text-sm font-semibold text-violet-700 shadow-sm transition-all hover:border-violet-300 hover:bg-violet-50 dark:border-violet-500/20 dark:bg-slate-900 dark:text-violet-300 dark:hover:bg-violet-500/10"
              >
                <Upload size={14} /> Upload PDF
              </button>
            </div>
          </div>
        </section>

        {/* FIX #1: Stats — lg:grid-cols-4 instead of xl:grid-cols-4 */}
        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {stats.map((stat) => (
            <StatCard key={stat.label} label={stat.label} value={stat.value} icon={stat.icon} subtext={stat.subtext} />
          ))}
        </section>

        {/* Filters */}
        <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-[#161b22] sm:p-5 lg:p-6">
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-12 lg:gap-4">
            {/* Search */}
            <div className="lg:col-span-5">
              <label className="block">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Search</span>
                <div className="relative mt-2">
                  <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
                  <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search notes, tags, subject..."
                    className="w-full rounded-2xl border border-slate-200 bg-white py-3 pl-10 pr-4 text-sm text-slate-900 outline-none transition-colors focus:border-violet-500/50 dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:placeholder-slate-500"
                  />
                </div>
              </label>
            </div>

            {/* Sort */}
            <div className="lg:col-span-3">
              <label className="block">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Sort By</span>
                <div className="relative mt-2">
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    className="w-full appearance-none rounded-2xl border border-slate-200 bg-white px-4 py-3 pr-10 text-sm text-slate-900 outline-none transition-colors focus:border-violet-500/50 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                  >
                    <option value="newest">Newest</option>
                    <option value="oldest">Oldest</option>
                    <option value="az">A-Z</option>
                    <option value="favorites">Favorites First</option>
                  </select>
                  <ChevronDown size={16} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
                </div>
              </label>
            </div>

            {/* Subject */}
            <div className="lg:col-span-3">
              <label className="block">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Subject</span>
                <div className="relative mt-2">
                  <select
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    className="w-full appearance-none rounded-2xl border border-slate-200 bg-white px-4 py-3 pr-10 text-sm text-slate-900 outline-none transition-colors focus:border-violet-500/50 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                  >
                    <option value="all">All subjects</option>
                    {subjects.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                  <ChevronDown size={16} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
                </div>
              </label>
            </div>

            {/* FIX #3: View toggle uses handleViewMode to persist to localStorage */}
            <div className="lg:col-span-1 flex items-end justify-end">
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

          {/* Filter chips */}
          <div className="mt-4 flex flex-wrap items-center gap-2">
            {[
              { key: "all", label: "All" },
              { key: "favorites", label: "Favorites" },
              { key: "pdfs", label: "PDFs" },
              { key: "manual", label: "Manual Notes" },
            ].map((chip) => (
              <button
                key={chip.key}
                onClick={() => setActiveChip(chip.key)}
                className={`rounded-full border px-4 py-2 text-sm transition-colors ${
                  activeChip === chip.key
                    ? "border-violet-500/30 bg-violet-500/10 text-violet-700 dark:text-violet-300"
                    : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-slate-600"
                }`}
              >
                {chip.label}
              </button>
            ))}
          </div>
        </section>

        {/* Count bar */}
        <section className="flex items-center justify-between gap-3">
          <div className="text-sm text-slate-600 dark:text-slate-300">
            Showing{" "}
            <span className="font-semibold text-slate-900 dark:text-white">{filteredNotes.length}</span> notes
            <span className="mx-2 text-slate-300 dark:text-slate-600">·</span>
            <span className="font-semibold text-slate-900 dark:text-white">{favoriteCount}</span> favorites
          </div>
          <div className="text-xs text-slate-500 dark:text-slate-400">
            Page <span className="text-slate-700 dark:text-slate-300">{page}</span> of{" "}
            <span className="text-slate-700 dark:text-slate-300">{totalPages}</span>
          </div>
        </section>

        {/* FIX #2: Cards — lg:grid-cols-3 instead of xl:grid-cols-3 */}
        <section>
          {loading ? (
            <div className={viewMode === "list" ? "space-y-4" : "grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3"}>
              {[...Array(6)].map((_, i) => <SkeletonCard key={i} />)}
            </div>
          ) : filteredNotes.length ? (
            <div className={viewMode === "list" ? "space-y-4" : "grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3"}>
              {filteredNotes.map((note) => {
                const id = getNoteId(note);
                const fav = isFavorite(note);
                const noteType = getNoteType(note);
                const tags = getTags(note).slice(0, 3);
                const aiBadges = [
                  hasSummary(note) ? { label: "Summary", icon: <MessageSquareText size={10} /> } : null,
                  hasQuiz(note) ? { label: "Quiz", icon: <HelpCircle size={10} /> } : null,
                  hasFlashcards(note) ? { label: "Flashcards", icon: <BookOpen size={10} /> } : null,
                  hasSimplify(note) ? { label: "Simplify", icon: <WandSparkles size={10} /> } : null,
                ].filter(Boolean);
                // FIX #4: Using renamed getPreviewText
                const preview = getPreviewText(note);
                const created = getCreatedAt(note);
                const isNew = formatRelativeDays(created);

                return (
                  <div
                    key={id || getTitle(note)}
                    className={
                      viewMode === "list"
                        ? "flex h-full flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:border-violet-200 hover:shadow-md dark:border-slate-800 dark:bg-[#161b22] dark:hover:border-violet-500/20 sm:flex-row sm:items-start"
                        : "flex h-full flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-all hover:-translate-y-1 hover:border-violet-200 hover:shadow-lg dark:border-slate-800 dark:bg-[#161b22] dark:hover:border-violet-500/20"
                    }
                  >
                    {/* Badges row */}
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="inline-flex items-center gap-1.5 rounded-full border border-violet-500/20 bg-violet-500/10 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider text-violet-700 dark:text-violet-300">
                          <FileText size={10} /> {noteType}
                        </span>
                        <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-medium text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
                          {note.subject}
                        </span>
                        {fav && (
                          <span className="inline-flex items-center gap-1.5 rounded-full border border-yellow-200 bg-yellow-50 px-2.5 py-1 text-[11px] text-yellow-700 dark:border-yellow-500/20 dark:bg-yellow-500/10 dark:text-yellow-300">
                            <Star size={10} className="fill-yellow-500 dark:fill-yellow-300" /> Favorite
                          </span>
                        )}
                        {isNew && (
                          <span className="inline-flex items-center rounded-full bg-emerald-500/10 px-2.5 py-1 text-[11px] font-semibold text-emerald-700 dark:text-emerald-300">
                            NEW
                          </span>
                        )}
                      </div>
                      <h3 className="mt-3 line-clamp-2 text-base font-semibold tracking-tight text-slate-900 dark:text-white">
                        {getTitle(note)}
                      </h3>
                    </div>

                    {/* Preview */}
                    {viewMode === "list" ? (
                      <div className="mt-1 flex min-w-0 flex-1 flex-col">
                        <p className="line-clamp-2 text-sm leading-6 text-slate-600 dark:text-slate-400">{preview}</p>
                        <div className="mt-3 flex flex-wrap gap-2">
                          {aiBadges.map((b) => (
                            <span key={b.label} className="inline-flex items-center gap-1.5 rounded-full border border-violet-500/20 bg-violet-500/10 px-2.5 py-1 text-[11px] text-violet-700 dark:text-violet-300">
                              {b.icon} {b.label}
                            </span>
                          ))}
                          {tags.map((tag) => (
                            <span key={tag} className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
                              <Tag size={10} /> {tag}
                            </span>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <>
                        <p className="mt-3 line-clamp-3 flex-1 text-sm leading-6 text-slate-600 dark:text-slate-400">{preview}</p>
                        {aiBadges.length > 0 && (
                          <div className="mt-4 flex flex-wrap gap-2">
                            {aiBadges.map((b) => (
                              <span key={b.label} className="inline-flex items-center gap-1.5 rounded-full border border-violet-500/20 bg-violet-500/10 px-2.5 py-1 text-[11px] text-violet-700 dark:text-violet-300">
                                {b.icon} {b.label}
                              </span>
                            ))}
                          </div>
                        )}
                        {tags.length > 0 && (
                          <div className="mt-4 flex flex-wrap gap-2">
                            {tags.map((tag) => (
                              <span key={tag} className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
                                <Tag size={10} /> {tag}
                              </span>
                            ))}
                          </div>
                        )}
                      </>
                    )}

                    {/* Footer */}
                    <div className="mt-auto flex items-center justify-between gap-3 pt-5 text-xs text-slate-500 dark:text-slate-400">
                      <span className="inline-flex items-center gap-1.5">
                        <Clock3 size={12} /> {formatDate(created)}
                      </span>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleView(id)}
                          className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-slate-700 transition-colors hover:border-violet-200 hover:bg-violet-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-violet-500/20 dark:hover:bg-violet-500/10"
                          aria-label="View note"
                        >
                          <Eye size={14} />
                        </button>
                        <button
                          onClick={() => handleEdit(id)}
                          className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-slate-700 transition-colors hover:border-slate-300 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-slate-600"
                          aria-label="Edit note"
                        >
                          <Pencil size={14} />
                        </button>
                        {/* FIX #5: Uses handleToggleFavorite — no extra fetchNotes call */}
                        <button
                          onClick={() => handleToggleFavorite(note)}
                          disabled={favoriteBusyId === id}
                          aria-label="Toggle favorite"
                          className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-slate-700 transition-colors hover:border-slate-300 hover:bg-slate-100 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-slate-600"
                        >
                          <Star
                            size={14}
                            className={fav ? "fill-yellow-500 text-yellow-500 dark:fill-yellow-300 dark:text-yellow-300" : ""}
                          />
                        </button>
                        <button
                          onClick={() => setDeleteTarget({ id, note })}
                          aria-label="Delete note"
                          className="inline-flex items-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-rose-700 transition-colors hover:bg-rose-100 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-200 dark:hover:bg-rose-500/15"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <EmptyState onCreate={() => navigate("/notes/create")} onUpload={() => navigate("/upload")} />
          )}
        </section>

        {/* Pagination */}
        <section className="flex flex-col items-center justify-between gap-3 pb-6 sm:flex-row">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1 || refreshing}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-700 transition-colors hover:border-slate-300 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:border-slate-600"
          >
            <ChevronLeft size={16} /> Previous
          </button>
          <div className="text-sm text-slate-600 dark:text-slate-300">
            Page <span className="font-semibold text-slate-900 dark:text-white">{page}</span> of{" "}
            <span className="font-semibold text-slate-900 dark:text-white">{totalPages}</span>
          </div>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages || refreshing}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-700 transition-colors hover:border-slate-300 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:border-slate-600"
          >
            Next <ChevronRight size={16} />
          </button>
        </section>

      </div>
    </Layout>
  );
}

export default Notes;