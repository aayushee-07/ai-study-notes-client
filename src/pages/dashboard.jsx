import React, { useEffect, useState, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useTheme } from "../context/ThemeContext";
import apiClient from "../lib/apiClient";
import Layout from "../components/Layout";
import {
  FileText,
  Sparkles,
  HelpCircle,
  Plus,
  Upload,
  Star,
  ArrowRight,
  Clock3,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Info,
  X,
  BookOpen,
  WandSparkles,
  MessageSquare,
  ChevronRight,
  Bookmark,
  PenSquare,
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

function formatTime(value) {
  if (!value) return "—";
  try {
    return new Date(value).toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  } catch {
    return "—";
  }
}

function safeText(value) {
  if (value == null) return "—";
  if (typeof value === "string" || typeof value === "number") return value;
  if (typeof value === "object") {
    return (
      value.question ||
      value.answer ||
      value.title ||
      value.preview ||
      value.content ||
      value.text ||
      value.name ||
      "—"
    );
  }
  return "—";
}

function getNoteId(note) {
  return note?._id || note?.id || null;
}

function getNoteTitle(note) {
  return safeText(note?.title || note?.name || "Untitled note");
}

function getPreview(note) {
  return safeText(note?.preview || note?.content || note?.excerpt || note?.summary || "No preview available.");
}

function getSubject(note) {
  return safeText(note?.subject || note?.category || note?.folder || "Note");
}

function getUpdatedAt(note) {
  return note?.updatedAt || note?.lastUpdated || note?.createdAt || null;
}

function getTags(note) {
  if (Array.isArray(note?.tags)) return note.tags.filter(Boolean).slice(0, 3).map((t) => safeText(t));
  if (typeof note?.tags === "string") {
    return note.tags
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean)
      .slice(0, 3);
  }
  return [];
}

function getActivityKey(type = "") {
  const t = String(type).toLowerCase();
  if (t.includes("summary")) return "summary";
  if (t.includes("quiz")) return "quiz";
  if (t.includes("flash")) return "flashcards";
  if (t.includes("simpl")) return "simplify";
  if (t.includes("chat")) return "chat";
  return "chat";
}

function getActivityMeta(type = "") {
  const key = getActivityKey(type);
  const map = {
    summary: {
      label: "Summary Generated",
      icon: Sparkles,
      iconClass: "bg-violet-500/10 text-violet-600 dark:text-violet-300",
    },
    quiz: {
      label: "Quiz Generated",
      icon: HelpCircle,
      iconClass: "bg-fuchsia-500/10 text-fuchsia-600 dark:text-fuchsia-300",
    },
    flashcards: {
      label: "Flashcards Generated",
      icon: BookOpen,
      iconClass: "bg-indigo-500/10 text-indigo-600 dark:text-indigo-300",
    },
    simplify: {
      label: "Simplify Generated",
      icon: WandSparkles,
      iconClass: "bg-purple-500/10 text-purple-600 dark:text-purple-300",
    },
    chat: {
      label: "Chat Activity",
      icon: MessageSquare,
      iconClass: "bg-sky-500/10 text-sky-600 dark:text-sky-300",
    },
  };
  return map[key];
}

function SkeletonCard({ className = "" }) {
  return (
    <div
      className={`animate-pulse rounded-3xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-[#161b22] ${className}`}
    />
  );
}

function Toast({ toast, onClose }) {
  if (!toast) return null;

  const styles =
    toast.type === "success"
      ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-700 dark:text-emerald-300"
      : toast.type === "error"
        ? "bg-rose-500/10 border-rose-500/20 text-rose-700 dark:text-rose-300"
        : "bg-sky-500/10 border-sky-500/20 text-sky-700 dark:text-sky-300";

  const Icon =
    toast.type === "success"
      ? CheckCircle2
      : toast.type === "error"
        ? AlertTriangle
        : Info;

  return (
    <div
      className={`fixed right-4 top-4 z-50 flex w-[calc(100vw-2rem)] max-w-sm items-start gap-3 rounded-2xl border px-4 py-3 shadow-xl backdrop-blur sm:w-auto ${styles}`}
    >
      <Icon size={18} className="mt-0.5 shrink-0" />
      <div className="flex-1 text-sm leading-5">{toast.message}</div>
      <button onClick={onClose} className="transition-opacity hover:opacity-100" aria-label="Close toast">
        <X size={16} />
      </button>
    </div>
  );
}

function SectionHeader({ title, subtitle, actionLabel, onAction, actionIcon: ActionIcon }) {
  return (
    <div className="mb-4 flex items-end justify-between gap-3">
      <div>
        <h2 className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
          {title}
        </h2>
        {subtitle ? (
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{subtitle}</p>
        ) : null}
      </div>
      {onAction ? (
        <button
          onClick={onAction}
          className="inline-flex items-center gap-2 rounded-full border border-violet-200 bg-white px-3 py-2 text-xs font-medium text-violet-700 transition-all hover:border-violet-300 hover:bg-violet-50 dark:border-violet-900/50 dark:bg-[#161b22] dark:text-violet-300 dark:hover:border-violet-700 dark:hover:bg-violet-500/10"
        >
          {ActionIcon ? <ActionIcon size={14} /> : null}
          {actionLabel}
        </button>
      ) : null}
    </div>
  );
}

function StatCard({ label, value, icon, valueColor, iconBg, muted }) {
  return (
    <div className="flex h-full flex-col rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg dark:border-slate-800 dark:bg-[#161b22]">
      <div className="mb-4 flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
          {label}
        </span>
        <span className={`flex h-11 w-11 items-center justify-center rounded-2xl ${iconBg}`}>
          {icon}
        </span>
      </div>
      <p className={`text-3xl font-bold tracking-tight ${valueColor}`}>{value}</p>
      {muted ? (
        <p className="mt-2 text-xs leading-5 text-slate-500 dark:text-slate-400">{muted}</p>
      ) : null}
    </div>
  );
}

function ActionCard({ icon, iconBg, title, subtitle, onClick }) {
  return (
    <button
      onClick={onClick}
      className="group flex h-full items-center gap-4 rounded-[1.75rem] border border-slate-200 bg-white p-5 text-left shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-violet-300 hover:shadow-lg dark:border-slate-800 dark:bg-[#161b22] dark:hover:border-violet-700/60"
    >
      <span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${iconBg}`}>
        {icon}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-slate-900 dark:text-white">{title}</p>
        <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">{subtitle}</p>
      </div>
      <ArrowRight
        size={16}
        className="text-slate-400 transition-colors group-hover:text-violet-600 dark:text-slate-500 dark:group-hover:text-violet-300"
      />
    </button>
  );
}

function NoteCard({ note, onView, ctaLabel = "Continue" }) {
  const id = getNoteId(note);
  const tags = getTags(note);

  return (
    <div className="flex h-full flex-col rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-violet-300 hover:shadow-lg dark:border-slate-800 dark:bg-[#161b22] dark:hover:border-violet-700/60">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-violet-500/20 bg-violet-500/10 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider text-violet-700 dark:text-violet-300">
            <Sparkles size={10} /> {getSubject(note)}
          </span>
          <h3 className="mt-3 line-clamp-2 text-base font-semibold leading-6 text-slate-900 dark:text-white">
            {getNoteTitle(note)}
          </h3>
        </div>
      </div>

      <p className="mt-4 line-clamp-3 text-sm leading-6 text-slate-600 dark:text-slate-400">
        {getPreview(note)}
      </p>

      {tags.length ? (
        <div className="mt-4 flex flex-wrap gap-2">
          {tags.map((tag) => (
            <span
              key={tag}
              className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] text-slate-600 dark:border-slate-800 dark:bg-[#10151d] dark:text-slate-300"
            >
              {tag}
            </span>
          ))}
        </div>
      ) : null}

      <div className="mt-auto flex items-center justify-between gap-3 pt-5 text-xs text-slate-500 dark:text-slate-400">
        <span className="inline-flex items-center gap-1.5">
          <Clock3 size={12} /> {formatDate(getUpdatedAt(note))}
        </span>
        <button
          onClick={() => onView(id)}
          className="inline-flex items-center gap-1.5 rounded-full border border-violet-200 bg-violet-50 px-3 py-2 text-xs font-semibold text-violet-700 transition-colors hover:border-violet-300 hover:bg-violet-100 dark:border-violet-900/50 dark:bg-violet-500/10 dark:text-violet-300 dark:hover:border-violet-700"
        >
          {ctaLabel} <ArrowRight size={12} />
        </button>
      </div>
    </div>
  );
}

function FavoriteCard({ note, onOpen }) {
  return (
    <div className="flex h-full items-start gap-4 rounded-[1.5rem] border border-slate-200 bg-white p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-lg dark:border-slate-800 dark:bg-[#161b22]">
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-violet-500/10 text-violet-600 dark:text-violet-300">
        <Star size={18} className="fill-current" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">
          {getNoteTitle(note)}
        </p>
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{getSubject(note)}</p>
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
          {formatDate(getUpdatedAt(note))}
        </p>
      </div>
      <button
        onClick={onOpen}
        className="inline-flex shrink-0 items-center rounded-full border border-violet-200 bg-violet-50 px-3 py-2 text-xs font-semibold text-violet-700 transition-colors hover:border-violet-300 hover:bg-violet-100 dark:border-violet-900/50 dark:bg-violet-500/10 dark:text-violet-300"
      >
        Quick Open
      </button>
    </div>
  );
}

function ChatCard({ chat, onOpen }) {
  return (
    <div className="flex h-full items-start gap-4 rounded-[1.5rem] border border-slate-200 bg-white p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-lg dark:border-slate-800 dark:bg-[#161b22]">
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-sky-500/10 text-sky-600 dark:text-sky-300">
        <MessageSquare size={18} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">
          {safeText(chat?.title || "Untitled chat")}
        </p>
        <p className="mt-1 line-clamp-2 text-sm leading-6 text-slate-600 dark:text-slate-400">
          {safeText(chat?.preview || "No preview available.")}
        </p>
        <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">{formatTime(chat?.updatedAt)}</p>
      </div>
      <button
        onClick={onOpen}
        className="inline-flex shrink-0 items-center rounded-full border border-violet-200 bg-violet-50 px-3 py-2 text-xs font-semibold text-violet-700 transition-colors hover:border-violet-300 hover:bg-violet-100 dark:border-violet-900/50 dark:bg-violet-500/10 dark:text-violet-300"
      >
        Open
      </button>
    </div>
  );
}

function CompactActivityCard({ item }) {
  const meta = getActivityMeta(item?.type);
  const Icon = meta.icon;

  return (
    <div className="flex h-full items-start gap-3 rounded-[1.5rem] border border-slate-200 bg-white p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-lg dark:border-slate-800 dark:bg-[#161b22]">
      <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${meta.iconClass}`}>
        <Icon size={18} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-slate-900 dark:text-white">{meta.label}</p>
        <p className="mt-1 line-clamp-2 text-sm leading-6 text-slate-600 dark:text-slate-400">
          {safeText(item?.content)}
        </p>
        <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">{formatTime(item?.createdAt)}</p>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { darkMode } = useTheme();
  const navigate = useNavigate();

  const [profile, setProfile] = useState(null);
  const [dashboard, setDashboard] = useState({
    totalNotes: 0,
    favoriteNotes: 0,
    pdfUploads: 0,
    summaries: 0,
    quizzes: 0,
    flashcards: 0,
    simplify: 0,
  });
  const [recentNotes, setRecentNotes] = useState([]);
  const [favoriteNotes, setFavoriteNotes] = useState([]);
  const [aiActivity, setAiActivity] = useState([]);
  const [recentChats, setRecentChats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [toast, setToast] = useState(null);

  const showToast = useCallback((message, type = "info") => {
    setToast({ message, type, id: Date.now() });
  }, []);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2800);
    return () => clearTimeout(t);
  }, [toast]);

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    try {
      const [profileRes, dashRes, recentRes, allRes, favRes, aiRes, chatsRes] = await Promise.all([
        apiClient.get("/auth/profile"),
        apiClient.get("/notes/dashboard"),
        apiClient.get("/notes/recent"),
        apiClient.get("/notes/all"),
        apiClient.get("/notes/favorites"),
        apiClient.get("/ai/ai-usage"),
        apiClient.get("/ai/recent-chats"),
      ]);

      const profileData =
        profileRes?.data?.user || profileRes?.data?.profile || profileRes?.data || null;
      const dashData = dashRes?.data || {};
      const recentData = recentRes?.data;
      const allData = allRes?.data;
      const favData = favRes?.data;
      const aiData = aiRes?.data || {};
      const chatsData = chatsRes?.data;

      const recentList = Array.isArray(recentData)
        ? recentData
        : recentData?.notes || recentData?.items || [];
      const allList = Array.isArray(allData)
        ? allData
        : allData?.notes || allData?.items || [];
      const favList = Array.isArray(favData)
        ? favData
        : favData?.notes || favData?.favorites || favData?.items || [];
      const chatsList = Array.isArray(chatsData)
        ? chatsData
        : chatsData?.chats || chatsData?.items || [];
      const activities = Array.isArray(aiData.activities) ? aiData.activities : [];

      setProfile(profileData);
      setDashboard({
        totalNotes: Number(dashData.totalNotes ?? allList.length ?? 0),
        favoriteNotes: Number(dashData.favoriteNotes ?? dashData.favorites ?? favList.length ?? 0),
        pdfUploads: Number(dashData.pdfUploads ?? 0),
        summaries: Number(dashData.summaries ?? 0),
        quizzes: Number(dashData.quizzes ?? 0),
        flashcards: Number(dashData.flashcards ?? 0),
        simplify: Number(dashData.simplify ?? 0),
      });
      setRecentNotes(recentList);
      setFavoriteNotes(favList);
      setAiActivity(activities);
      setRecentChats(chatsList);
    } catch (err) {
      showToast(
        err?.response?.data?.message || err?.message || "Failed to load dashboard.",
        "error"
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [showToast]);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadDashboard();
  }, [loadDashboard]);

  // FIX #4: Dynamic display name from profile
  const displayName =
    profile?.name ||
    profile?.username ||
    profile?.email?.split("@")[0] ||
    "there";

  // FIX #3: Single useMemo for activity counts (removed duplicate from loadDashboard)
  const activityCounts = useMemo(() => {
    return aiActivity.reduce(
      (acc, item) => {
        const key = getActivityKey(item?.type);
        acc[key] += 1;
        return acc;
      },
      { summary: 0, quiz: 0, flashcards: 0, simplify: 0, chat: 0 }
    );
  }, [aiActivity]);

  const stats = [
    {
      label: "Total Notes",
      value: dashboard.totalNotes,
      icon: <FileText size={18} />,
      valueColor: "text-violet-700 dark:text-violet-300",
      iconBg: "bg-violet-500/10 text-violet-700 dark:text-violet-300",
    },
    {
      label: "Favorites",
      value: dashboard.favoriteNotes,
      icon: <Star size={18} />,
      valueColor: "text-fuchsia-700 dark:text-fuchsia-300",
      iconBg: "bg-fuchsia-500/10 text-fuchsia-700 dark:text-fuchsia-300",
    },
    {
      label: "PDF Uploads",
      value: dashboard.pdfUploads,
      icon: <Upload size={18} />,
      valueColor: "text-purple-700 dark:text-purple-300",
      iconBg: "bg-purple-500/10 text-purple-700 dark:text-purple-300",
    },
    {
      label: "Summaries",
      value: dashboard.summaries,
      icon: <Sparkles size={18} />,
      valueColor: "text-indigo-700 dark:text-indigo-300",
      iconBg: "bg-indigo-500/10 text-indigo-700 dark:text-indigo-300",
    },
    {
      label: "Quizzes",
      value: dashboard.quizzes,
      icon: <HelpCircle size={18} />,
      valueColor: "text-pink-700 dark:text-pink-300",
      iconBg: "bg-pink-500/10 text-pink-700 dark:text-pink-300",
    },
    {
      label: "Flashcards",
      value: dashboard.flashcards,
      icon: <BookOpen size={18} />,
      valueColor: "text-violet-700 dark:text-violet-300",
      iconBg: "bg-violet-500/10 text-violet-700 dark:text-violet-300",
    },
    {
      label: "Simplify",
      value: dashboard.simplify,
      icon: <WandSparkles size={18} />,
      valueColor: "text-purple-700 dark:text-purple-300",
      iconBg: "bg-purple-500/10 text-purple-700 dark:text-purple-300",
    },
    {
      label: "Chats",
      value: activityCounts.chat,
      icon: <MessageSquare size={18} />,
      valueColor: "text-sky-700 dark:text-sky-300",
      iconBg: "bg-sky-500/10 text-sky-700 dark:text-sky-300",
    },
  ];

  const recentNotesToShow = recentNotes.slice(0, 6);

  return (
    <Layout>
      <Toast toast={toast} onClose={() => setToast(null)} />

      <div className="space-y-6 pb-8 lg:space-y-7">
        {/* Hero / Welcome */}
        <section className="rounded-[2rem] border border-violet-200/70 bg-gradient-to-br from-violet-50 via-white to-fuchsia-50 px-5 py-5 shadow-sm dark:border-slate-800 dark:from-[#161b22] dark:via-[#161b22] dark:to-[#11151c] sm:px-6 sm:py-5 lg:px-7">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="min-w-0">
              <div className="inline-flex items-center gap-2 rounded-full border border-violet-200 bg-violet-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-violet-700 dark:border-violet-900/50 dark:text-violet-300">
                OVERVIEW
              </div>
              <h1 className="mt-3 text-2xl font-semibold tracking-tight text-slate-900 dark:text-white sm:text-[2rem]">
                Welcome back, {displayName} 👋
              </h1>
              <p className="mt-2 text-sm text-slate-600 dark:text-slate-400 sm:text-base">
                A clean overview of your notes, favorites, and recent AI usage.
              </p>
            </div>

            <div className="flex flex-wrap gap-3 md:justify-end">
              <button
                onClick={onRefresh}
                className="inline-flex items-center gap-2 rounded-full border border-violet-200 bg-white px-4 py-2.5 text-sm font-medium text-violet-700 shadow-sm transition-all hover:border-violet-300 hover:bg-violet-50 dark:border-violet-900/50 dark:bg-[#161b22] dark:text-violet-300 dark:hover:bg-violet-500/10"
              >
                <RefreshCw size={16} className={refreshing ? "animate-spin" : ""} />
                Refresh
              </button>
              <button
                onClick={() => navigate("/notes/create")}
                className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-500 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:from-violet-600 hover:to-fuchsia-600 hover:shadow-md"
              >
                <Plus size={16} />
                Create Note
              </button>
            </div>
          </div>
        </section>

        {/* FIX #1: Stats — lg:grid-cols-4 instead of xl:grid-cols-4 */}
        <section>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {loading
              ? [...Array(8)].map((_, i) => <SkeletonCard key={i} className="h-full min-h-32" />)
              : stats.map((stat) => (
                  <StatCard
                    key={stat.label}
                    label={stat.label}
                    value={stat.value}
                    icon={stat.icon}
                    valueColor={stat.valueColor}
                    iconBg={stat.iconBg}
                    muted="Premium overview of your workspace."
                  />
                ))}
          </div>
        </section>

        {/* FIX #1: Quick Actions — lg:grid-cols-4 instead of xl:grid-cols-4 */}
        <section>
          <SectionHeader
            title="Quick Actions"
            subtitle="Common shortcuts to keep your workflow moving."
          />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <ActionCard
              icon={<PenSquare size={18} />}
              iconBg="bg-violet-500/10 text-violet-700 dark:text-violet-300"
              title="Create Note"
              subtitle="Start a fresh note."
              onClick={() => navigate("/notes/create")}
            />
            <ActionCard
              icon={<Upload size={18} />}
              iconBg="bg-purple-500/10 text-purple-700 dark:text-purple-300"
              title="Upload PDF"
              subtitle="Import and extract content."
              onClick={() => navigate("/upload")}
            />
            <ActionCard
              icon={<FileText size={18} />}
              iconBg="bg-indigo-500/10 text-indigo-700 dark:text-indigo-300"
              title="All Notes"
              subtitle="Browse the full library."
              onClick={() => navigate("/notes")}
            />
            <ActionCard
              icon={<Bookmark size={18} />}
              iconBg="bg-fuchsia-500/10 text-fuchsia-700 dark:text-fuchsia-300"
              title="Favorites"
              subtitle="Open starred notes."
              onClick={() => navigate("/favorites")}
            />
          </div>
        </section>

        {/* FIX #2: Recent Notes — simplified grid class */}
        <section>
          <SectionHeader
            title="Continue Study"
            subtitle="Your latest notes, ready to resume."
          />
          {loading ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {[...Array(6)].map((_, i) => (
                <SkeletonCard key={i} className="h-56" />
              ))}
            </div>
          ) : recentNotesToShow.length ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {recentNotesToShow.map((note) => (
                <div key={getNoteId(note) || getNoteTitle(note)} className="w-full">
                  <NoteCard
                    note={note}
                    onView={(id) => navigate(`/notes/${id}`)}
                    ctaLabel="Continue"
                  />
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-[1.75rem] border border-dashed border-slate-200 bg-white p-8 text-center text-slate-500 shadow-sm dark:border-slate-800 dark:bg-[#161b22] dark:text-slate-400">
              No recent notes yet. Create a note or upload a PDF to get started.
            </div>
          )}
        </section>

        {/* Favorites / Chats / AI Activity */}
        <section>
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3 lg:items-stretch">
            {/* Favorite Notes */}
            <div className="flex h-full flex-col">
              <SectionHeader
                title="Favorite Notes"
                subtitle="Top 3 starred notes."
                actionLabel="View All"
                actionIcon={ChevronRight}
                onAction={() => navigate("/favorites")}
              />
              <div className="flex h-full flex-col gap-4">
                {loading ? (
                  [...Array(3)].map((_, i) => <SkeletonCard key={i} className="h-28" />)
                ) : favoriteNotes.length ? (
                  favoriteNotes.slice(0, 3).map((note) => (
                    <FavoriteCard
                      key={getNoteId(note) || getNoteTitle(note)}
                      note={note}
                      onOpen={() => navigate(`/notes/${getNoteId(note)}`)}
                    />
                  ))
                ) : (
                  <div className="rounded-[1.5rem] border border-dashed border-slate-200 bg-white p-8 text-center text-slate-500 shadow-sm dark:border-slate-800 dark:bg-[#161b22] dark:text-slate-400">
                    No favorite notes yet.
                  </div>
                )}
              </div>
            </div>

            {/* Recent Chats */}
            <div className="flex h-full flex-col">
              <SectionHeader title="Recent Chats" subtitle="Latest 3 chats." />
              <div className="flex h-full flex-col gap-4">
                {loading ? (
                  [...Array(3)].map((_, i) => <SkeletonCard key={i} className="h-28" />)
                ) : recentChats.length ? (
                  recentChats.slice(0, 3).map((chat, idx) => (
                    <ChatCard
                      key={chat?.chatId || chat?.noteId || idx}
                      chat={chat}
                      onOpen={() => navigate(`/notes/${chat?.noteId || ""}`)}
                    />
                  ))
                ) : (
                  <div className="rounded-[1.5rem] border border-dashed border-slate-200 bg-white p-8 text-center text-slate-500 shadow-sm dark:border-slate-800 dark:bg-[#161b22] dark:text-slate-400">
                    No recent chats yet.
                  </div>
                )}
              </div>
            </div>

            {/* FIX #5: Recent AI Usage — clean item pass, no dead props */}
            <div className="flex h-full flex-col">
              <SectionHeader title="Recent AI Usage" subtitle="Latest 3 activities." />
              <div className="flex h-full flex-col gap-4">
                {loading ? (
                  [...Array(3)].map((_, i) => <SkeletonCard key={i} className="h-28" />)
                ) : aiActivity.length ? (
                  aiActivity.slice(0, 3).map((item, idx) => (
                    <CompactActivityCard
                      key={item?.id || item?._id || idx}
                      item={item}
                    />
                  ))
                ) : (
                  <div className="rounded-[1.5rem] border border-dashed border-slate-200 bg-white p-8 text-center text-slate-500 shadow-sm dark:border-slate-800 dark:bg-[#161b22] dark:text-slate-400">
                    No AI usage yet.
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>
      </div>
    </Layout>
  );
}