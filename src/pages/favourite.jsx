import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTheme } from "../context/ThemeContext";
import Layout from "../components/Layout";
import apiClient from "../lib/apiClient";
import {
  Search,
  Grid3X3,
  List,
  RefreshCw,
  Star,
  FileText,
  Clock3,
  Trash2,
  Eye,
  X,
  CheckCircle2,
  AlertCircle,
  Info,
  Sparkles,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Tag,
  BookOpen,
  CalendarDays,
  ArrowRight,
  FileBadge2,
  BookMarked,
  WandSparkles,
  MessageSquareText,
  HelpCircle,
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

function formatRelativeTime(value) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";

  const diffMs = Date.now() - date.getTime();
  const diffMinutes = Math.max(0, Math.floor(diffMs / 60000));
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMinutes < 1) return "Just now";
  if (diffMinutes < 60) return `${diffMinutes} minute${diffMinutes === 1 ? "" : "s"} ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours === 1 ? "" : "s"} ago`;
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays} days ago`;
  return formatDate(value);
}

function getNoteId(note) {
  return note?._id || note?.id || null;
}

function getTitle(note) {
  return note?.title || note?.name || note?.fileName || note?.originalName || "Untitled note";
}

function getSubject(note) {
  return note?.subject || note?.category || note?.folder || "General";
}

function getCreatedAt(note) {
  return note?.createdAt || note?.updatedAt || note?.lastUpdated || null;
}

function getUpdatedAt(note) {
  return note?.updatedAt || note?.lastUpdated || note?.createdAt || null;
}

function getTags(note) {
  if (Array.isArray(note?.tags)) return note.tags.filter(Boolean);
  if (typeof note?.tags === "string") return note.tags.split(",").map((t) => t.trim()).filter(Boolean);
  return [];
}

function getNoteType(note) {
  const source = String(note?.source || note?.fileType || note?.type || "").toLowerCase();
  const name = String(note?.fileName || note?.originalName || note?.title || "").toLowerCase();
  if (source.includes("pdf") || name.endsWith(".pdf") || note?.pdfUrl || note?.fileUrl) return "PDF";
  if (note?.aiGenerated || note?.generatedByAI || source.includes("ai")) return "AI Note";
  return "Manual Note";
}

function isFavorite(note) {
  return Boolean(note?.favorite || note?.isFavorite || note?.favorited || note?.starred);
}

function hasSummary(note) { return Boolean(note?.aiContent?.summary); }
function hasQuiz(note) { return Boolean(note?.aiContent?.quiz); }
function hasFlashcards(note) { return Boolean(note?.aiContent?.flashcards); }
function hasSimplify(note) { return Boolean(note?.aiContent?.simplify); }

function normalizeFavoritesData(data) {
  const raw = Array.isArray(data) ? data : data?.notes || data?.items || data?.favorites || data?.data || [];
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

function StatCard({ label, value, icon, valueColor, iconBg, muted }) {
  return (
    <div className="flex h-full flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md dark:border-slate-800 dark:bg-[#161b22]">
      <div className="mb-4 flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">{label}</span>
        <span className={`flex h-9 w-9 items-center justify-center rounded-xl ${iconBg}`}>{icon}</span>
      </div>
      <p className={`text-3xl font-bold ${valueColor}`}>{value}</p>
      {muted ? <p className="mt-2 text-xs leading-5 text-slate-500 dark:text-slate-400">{muted}</p> : null}
    </div>
  );
}

function SkeletonCard({ view }) {
  return (
    <div
      className={`animate-pulse rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-[#161b22] ${
        view === "list" ? "flex h-28 items-center p-4" : "h-56 p-5"
      }`}
    />
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
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Remove favorite?</h3>
            <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
              This will remove{" "}
              <span className="font-medium text-slate-900 dark:text-white">{getTitle(note)}</span>{" "}
              from your favorites.
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
            {loading ? "Removing..." : "Remove"}
          </button>
        </div>
      </div>
    </div>
  );
}

function NoteCard({ note, view, onView, onRemove }) {
  const id = getNoteId(note);
  const tags = getTags(note);
  const noteType = getNoteType(note);

  const aiBadges = [
    hasSummary(note) ? { label: "Summary", icon: <MessageSquareText size={10} /> } : null,
    hasQuiz(note) ? { label: "Quiz", icon: <HelpCircle size={10} /> } : null,
    hasFlashcards(note) ? { label: "Flashcards", icon: <BookOpen size={10} /> } : null,
    hasSimplify(note) ? { label: "Simplify", icon: <WandSparkles size={10} /> } : null,
  ].filter(Boolean);

  const content = note?.content || note?.excerpt || note?.summary || "No preview available.";

  if (view === "list") {
    return (
      <div className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-5 transition-all hover:-translate-y-0.5 hover:border-violet-200 hover:shadow-md dark:border-slate-800 dark:bg-[#161b22] dark:hover:border-violet-500/20 sm:flex-row sm:items-center">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-violet-500/20 bg-violet-500/10 text-violet-600 dark:text-violet-300">
          <Star size={18} className="fill-violet-500 dark:fill-violet-300" />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-violet-500/20 bg-violet-500/10 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider text-violet-700 dark:text-violet-300">
              <FileText size={10} /> {noteType}
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
              {getSubject(note)}
            </span>
          </div>
          <h3 className="mt-2 line-clamp-1 text-base font-semibold tracking-tight text-slate-900 dark:text-white">
            {getTitle(note)}
          </h3>
          <p className="mt-1 line-clamp-2 text-sm leading-6 text-slate-600 dark:text-slate-400">{content}</p>
          {aiBadges.length ? (
            <div className="mt-3 flex flex-wrap gap-2">
              {aiBadges.map((badge) => (
                <span key={badge.label} className="inline-flex items-center gap-1.5 rounded-full border border-violet-500/20 bg-violet-500/10 px-2.5 py-1 text-[11px] text-violet-700 dark:text-violet-300">
                  {badge.icon} {badge.label}
                </span>
              ))}
            </div>
          ) : null}
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:justify-end">
          <button
            onClick={() => onView(id)}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-slate-700 transition-colors hover:border-violet-200 hover:bg-violet-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-violet-500/20 dark:hover:bg-violet-500/10"
            aria-label="View note"
          >
            <Eye size={14} />
          </button>
          <button
            onClick={() => onRemove(note)}
            className="inline-flex items-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-rose-700 transition-colors hover:bg-rose-100 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-200 dark:hover:bg-rose-500/15"
            aria-label="Remove favorite"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-all hover:-translate-y-1 hover:border-violet-200 hover:shadow-lg dark:border-slate-800 dark:bg-[#161b22] dark:hover:border-violet-500/20">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-violet-500/20 bg-violet-500/10 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider text-violet-700 dark:text-violet-300">
              <FileText size={10} /> {noteType}
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-medium text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
              {getSubject(note)}
            </span>
          </div>
          <h3 className="mt-3 line-clamp-2 text-base font-semibold tracking-tight text-slate-900 dark:text-white">
            {getTitle(note)}
          </h3>
        </div>
      </div>

      <p className="mt-3 line-clamp-3 flex-1 text-sm leading-6 text-slate-600 dark:text-slate-400">{content}</p>

      {aiBadges.length ? (
        <div className="mt-4 flex flex-wrap gap-2">
          {aiBadges.map((badge) => (
            <span key={badge.label} className="inline-flex items-center gap-1.5 rounded-full border border-violet-500/20 bg-violet-500/10 px-2.5 py-1 text-[11px] text-violet-700 dark:text-violet-300">
              {badge.icon} {badge.label}
            </span>
          ))}
        </div>
      ) : null}

      {tags.length ? (
        <div className="mt-4 flex flex-wrap gap-2">
          {tags.slice(0, 3).map((tag) => (
            <span key={tag} className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
              <Tag size={10} /> {tag}
            </span>
          ))}
        </div>
      ) : null}

      <div className="mt-5 flex items-center justify-between gap-3 text-xs text-slate-500 dark:text-slate-400">
        <span className="inline-flex items-center gap-1.5">
          <Clock3 size={12} /> {formatRelativeTime(getUpdatedAt(note))}
        </span>
        <div className="flex items-center gap-2">
          <button
            onClick={() => onView(id)}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-slate-700 transition-colors hover:border-violet-200 hover:bg-violet-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-violet-500/20 dark:hover:bg-violet-500/10"
            aria-label="View note"
          >
            <Eye size={14} />
          </button>
          <button
            onClick={() => onRemove(note)}
            className="inline-flex items-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-rose-700 transition-colors hover:bg-rose-100 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-200 dark:hover:bg-rose-500/15"
            aria-label="Remove favorite"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}

function EmptyState({ onBrowse }) {
  return (
    <div className="rounded-3xl border border-dashed border-slate-200 bg-white px-6 py-14 text-center dark:border-slate-800 dark:bg-[#161b22]">
      <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-violet-500/10 text-violet-600 dark:text-violet-300">
        <Star size={28} className="fill-violet-500 dark:fill-violet-300" />
      </div>
      <h3 className="text-xl font-semibold text-slate-900 dark:text-white">No favorite notes yet</h3>
      <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-slate-600 dark:text-slate-400">
        Star your important notes to access them quickly from this page.
      </p>
      <button
        onClick={onBrowse}
        className="mt-6 inline-flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-500 px-5 py-3 text-sm font-semibold text-white shadow-sm transition-all hover:from-violet-600 hover:to-fuchsia-600 hover:shadow-md"
      >
        Browse Notes <ArrowRight size={14} />
      </button>
    </div>
  );
}

export default function Favorites() {
  const { darkMode } = useTheme();
  const navigate = useNavigate();

  const [favorites, setFavorites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("newest");
  const [view, setView] = useState("grid");
  const [toast, setToast] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [page, setPage] = useState(1);

  const showToast = useCallback((message, type = "info") => {
    setToast({ message, type, id: Date.now() });
  }, []);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2800);
    return () => clearTimeout(t);
  }, [toast]);

  // FIX #4: fetchFavorites no longer takes a page param — all pagination is client-side
  const fetchFavorites = useCallback(
    async (silent = false) => {
      silent ? setRefreshing(true) : setLoading(true);
      try {
        const res = await apiClient.get("/notes/favorites");
        setFavorites(normalizeFavoritesData(res?.data));
      } catch (err) {
        showToast(err?.response?.data?.message || err?.message || "Failed to load favorites.", "error");
      } finally {
        silent ? setRefreshing(false) : setLoading(false);
      }
    },
    [showToast]
  );

  // FIX #4: Only fetch once on mount, not on every page change
  useEffect(() => {
    fetchFavorites(false);
  }, [fetchFavorites]);

  const filteredFavorites = useMemo(() => {
    let list = [...favorites];
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((note) => {
        const tags = getTags(note).join(" ").toLowerCase();
        return (
          getTitle(note).toLowerCase().includes(q) ||
          getSubject(note).toLowerCase().includes(q) ||
          (note?.content || "").toLowerCase().includes(q) ||
          tags.includes(q)
        );
      });
    }
    const sorters = {
      newest: (a, b) => new Date(getCreatedAt(b) || 0) - new Date(getCreatedAt(a) || 0),
      oldest: (a, b) => new Date(getCreatedAt(a) || 0) - new Date(getCreatedAt(b) || 0),
      az: (a, b) => getTitle(a).localeCompare(getTitle(b)),
    };
    return list.sort(sorters[sortBy] || sorters.newest);
  }, [favorites, search, sortBy]);

  const favoriteCount = favorites.length;
  const pdfCount = useMemo(() => favorites.filter((n) => getNoteType(n) === "PDF").length, [favorites]);
  const manualCount = useMemo(() => favorites.filter((n) => getNoteType(n) === "Manual Note").length, [favorites]);

  // FIX #3: Pass .getTime() (number) to formatRelativeTime, not a Date object
  const latestUpdated = useMemo(() => {
    const dates = favorites
      .map((note) => getUpdatedAt(note))
      .filter(Boolean)
      .map((value) => new Date(value))
      .filter((date) => !Number.isNaN(date.getTime()));
    if (!dates.length) return null;
    return dates.sort((a, b) => b - a)[0].getTime();
  }, [favorites]);

  const totalPages = Math.max(1, Math.ceil(filteredFavorites.length / 12));

  const paginatedFavorites = useMemo(() => {
    const start = (page - 1) * 12;
    return filteredFavorites.slice(start, start + 12);
  }, [filteredFavorites, page]);

  // Reset page on filter change
  useEffect(() => { setPage(1); }, [search, sortBy]);

  // Clamp page if total pages shrinks
  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const handleRemoveFavorite = useCallback(
    async (note) => {
      const id = getNoteId(note);
      if (!id) return;
      setDeleteBusy(true);
      try {
        await apiClient.put(`/notes/favorite/${id}`);
        setFavorites((prev) => prev.filter((item) => getNoteId(item) !== id));
        showToast("Removed from favorites.", "success");
        setDeleteTarget(null);
      } catch (err) {
        showToast(err?.response?.data?.message || "Failed to remove favorite.", "error");
      } finally {
        setDeleteBusy(false);
      }
    },
    [showToast]
  );

  return (
    <Layout>
      <Toast toast={toast} onClose={() => setToast(null)} />
      <ConfirmDeleteModal
        note={deleteTarget}
        loading={deleteBusy}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={() => handleRemoveFavorite(deleteTarget)}
      />

      <div className="space-y-6 lg:space-y-8">

        {/* Hero */}
        <section className="rounded-3xl border border-violet-200/60 bg-gradient-to-br from-violet-50 via-white to-fuchsia-50 p-5 shadow-sm dark:border-slate-800 dark:from-[#161b22] dark:via-[#161b22] dark:to-[#11151c] sm:p-7 lg:p-8">
          <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
            <div className="max-w-2xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-violet-200 bg-white px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-violet-700 shadow-sm dark:border-violet-500/20 dark:bg-slate-900 dark:text-violet-300">
                FAVORITES
              </div>
              <h1 className="mt-4 text-3xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-4xl">
                Favorite Notes <span className="align-middle">⭐</span>
              </h1>
              <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-400 sm:text-base">
                Quick access to your most important study materials.
              </p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row md:justify-end">
              <button
                onClick={() => fetchFavorites(true)}
                className="inline-flex items-center justify-center gap-2 rounded-full border border-violet-200 bg-white px-4 py-2.5 text-sm font-semibold text-violet-700 shadow-sm transition-all hover:border-violet-300 hover:bg-violet-50 dark:border-violet-500/20 dark:bg-slate-900 dark:text-violet-300 dark:hover:bg-violet-500/10"
              >
                <RefreshCw size={14} className={refreshing ? "animate-spin" : ""} /> Refresh
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

        {/* FIX #2: Stats — lg:grid-cols-4 instead of xl:grid-cols-4 */}
        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            label="Total Favorites"
            value={favoriteCount}
            icon={<Star size={18} />}
            valueColor="text-violet-600 dark:text-violet-300"
            iconBg="bg-violet-500/10 text-violet-600 dark:text-violet-300"
            muted="All starred notes"
          />
          <StatCard
            label="PDF Notes"
            value={pdfCount}
            icon={<FileBadge2 size={18} />}
            valueColor="text-indigo-600 dark:text-indigo-300"
            iconBg="bg-indigo-500/10 text-indigo-600 dark:text-indigo-300"
            muted="Favorite PDF files"
          />
          <StatCard
            label="Manual Notes"
            value={manualCount}
            icon={<BookMarked size={18} />}
            valueColor="text-emerald-600 dark:text-emerald-300"
            iconBg="bg-emerald-500/10 text-emerald-600 dark:text-emerald-300"
            muted="Favorite manual notes"
          />
          {/* FIX #3: Pass .getTime() number to formatRelativeTime, not a Date object */}
          <StatCard
            label="Recently Updated"
            value={latestUpdated ? formatRelativeTime(latestUpdated) : "—"}
            icon={<CalendarDays size={18} />}
            valueColor="text-sky-600 dark:text-sky-300"
            iconBg="bg-sky-500/10 text-sky-600 dark:text-sky-300"
            muted="Most recent favorite activity"
          />
        </section>

        {/* Filters */}
        <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-[#161b22] sm:p-5 lg:p-6">
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-12 lg:gap-4">
            <div className="lg:col-span-5">
              <label className="block">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Search</span>
                <div className="relative mt-2">
                  <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
                  <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search favorites..."
                    className="w-full rounded-2xl border border-slate-200 bg-white py-3 pl-10 pr-4 text-sm text-slate-900 outline-none transition-colors focus:border-violet-500/50 dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:placeholder-slate-500"
                  />
                </div>
              </label>
            </div>

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
                  </select>
                  <ChevronDown size={16} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
                </div>
              </label>
            </div>

            <div className="lg:col-span-4">
              <div className="flex flex-wrap items-center gap-2 pt-6 lg:justify-end lg:pt-0">
                <button
                  onClick={() => setView("grid")}
                  className={`inline-flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm transition-colors ${
                    view === "grid"
                      ? "border-violet-500/30 bg-violet-500/10 text-violet-700 dark:text-violet-300"
                      : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-slate-600"
                  }`}
                >
                  <Grid3X3 size={14} /> Grid
                </button>
                <button
                  onClick={() => setView("list")}
                  className={`inline-flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm transition-colors ${
                    view === "list"
                      ? "border-violet-500/30 bg-violet-500/10 text-violet-700 dark:text-violet-300"
                      : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-slate-600"
                  }`}
                >
                  <List size={14} /> List
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* Count bar */}
        <section className="flex items-center justify-between gap-3">
          <div className="text-sm text-slate-600 dark:text-slate-300">
            Showing{" "}
            <span className="font-semibold text-slate-900 dark:text-white">{paginatedFavorites.length}</span> notes
            <span className="mx-2 text-slate-300 dark:text-slate-600">·</span>
            <span className="font-semibold text-slate-900 dark:text-white">{favoriteCount}</span> favorites
          </div>
          <div className="text-xs text-slate-500 dark:text-slate-400">
            Page <span className="text-slate-700 dark:text-slate-300">{page}</span> of{" "}
            <span className="text-slate-700 dark:text-slate-300">{totalPages}</span>
          </div>
        </section>

        {/* FIX #1: Cards — lg:grid-cols-3 instead of xl:grid-cols-3 */}
        <section>
          {loading ? (
            <div className={view === "list" ? "grid grid-cols-1 gap-4" : "grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3"}>
              {[...Array(6)].map((_, i) => <SkeletonCard key={i} view={view} />)}
            </div>
          ) : paginatedFavorites.length ? (
            <div className={view === "list" ? "grid grid-cols-1 gap-4" : "grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3"}>
              {paginatedFavorites.map((note) => (
                <NoteCard
                  key={getNoteId(note) || getTitle(note)}
                  note={note}
                  view={view}
                  onView={(id) => navigate(`/notes/${id}`)}
                  onRemove={(item) => setDeleteTarget(item)}
                />
              ))}
            </div>
          ) : (
            <EmptyState onBrowse={() => navigate("/notes")} />
          )}
        </section>

        {/* FIX #5: Pagination with ChevronLeft/ChevronRight icons matching other pages */}
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