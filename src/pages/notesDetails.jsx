/**
 * src/pages/NoteDetails.jsx
 *
 * NEW FIXES ON TOP OF PREVIOUS VERSION:
 *
 * 1. PERSISTENCE AFTER REFRESH
 *    On mount, after GET /notes/:id returns, we read note.aiContent and
 *    pre-populate all AI state slices. The user sees their previously
 *    generated content immediately without clicking Generate again.
 *    Seeded fields: summary, quiz, flashcards, questions, simplify.
 *    Chat is seeded from note.chatHistory (persisted turns).
 *
 * 2. TIMEOUT ERRORS — surfaced cleanly
 *    normalizeNetworkError() now detects ECONNABORTED / timeout and
 *    returns a human-readable message instead of the raw axios message.
 *
 * 3. FLASHCARDS NULL CRASH
 *    extractArray() already returns [] for null. Additionally,
 *    FlashcardsPanelView guards hasData with Array.isArray() so a null
 *    payload never reaches the child component.
 *
 * 4. CHAT SEEDED FROM chatHistory
 *    note.chatHistory (array of { question, answer }) is converted to the
 *    { role, content } shape on load, so chat is persistent across refreshes.
 *
 * 5. getChatHistory imported for loading persisted chat on mount.
 *
 * RESPONSIVE IMPROVEMENTS (layout/visual only, no functionality changed):
 * - Stats grid: 2-col mobile → 3-col sm → 6-col xl, with gap
 * - Tab bar: horizontal scroll on mobile with snap, no wrapping
 * - Header section: proper stacking on small screens
 * - WorkspaceSidebar: shown as bottom drawer on mobile via sticky tab bar
 * - Sidebar: only one className attr (duplicate removed)
 * - StatCard: consistent height/padding on all sizes
 * - Toast: full-width on small screens
 * - PanelCard: tighter padding on mobile
 * - Tab buttons: even shrink with min-width so they don't collapse to icons
 */

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import axios from "axios";
import { useNavigate, useParams } from "react-router-dom";
import { useTheme } from "../context/ThemeContext";
import Layout from "../components/Layout";
import apiClient from "../lib/apiClient";
import {
  generateSummary,
  generateFlashcards,
  generateQuestions,
  generateQuiz,
  getAIHistory,
  simplifyNote,
  regenerateQuiz,

  createChat,
  getChats,
  getChat,
  renameChat,
  deleteChat,
  sendMessage,
} from "../services/aiService";


import SummaryPanel from "../components/notedetails/SummaryPanel";
import QuizPanel from "../components/notedetails/QuizPanel";
import FlashcardsPanel from "../components/notedetails/FlashcardsPanel";
import QuestionsPanel from "../components/notedetails/QuestionsPanel";
import SimplifyPanel from "../components/notedetails/SimplifyPanel";
import ChatPanel from "../components/notedetails/ChatPanel";
import AIHistoryPanel from "../components/notedetails/AIHistoryPanel";
import ExportPanel from "../components/notedetails/ExportPanel";
import {
  AlertCircle, ArrowLeft, BookOpen, CheckCircle2, Clock3,
  Download, ExternalLink, FileQuestion, FileText, Hash, History,
  Layers3, Lightbulb, MessageSquare, Minus, Plus, RefreshCw,
  ShieldQuestion, Sparkles, Star, Tags, Type, X,
} from "lucide-react";

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

const TABS = [
  { key: "summary", label: "Summary", icon: Sparkles },
  { key: "quiz", label: "Quiz", icon: ShieldQuestion },
  { key: "flashcards", label: "Flashcards", icon: Layers3 },
  { key: "questions", label: "Questions", icon: FileQuestion },
  { key: "simplify", label: "Simplify", icon: Lightbulb },
  { key: "chat", label: "Chat", icon: MessageSquare },
  { key: "history", label: "History", icon: History },
  { key: "pdf", label: "Export", icon: Download },
];

// ─────────────────────────────────────────────────────────────────────────────
// Utility functions
// ─────────────────────────────────────────────────────────────────────────────

function cn(...classes) { return classes.filter(Boolean).join(" "); }

function formatDate(value) {
  if (!value) return "—";
  try {
    return new Date(value).toLocaleDateString("en-US", {
      month: "short", day: "numeric", year: "numeric",
    });
  } catch { return "—"; }
}

function normalizeText(value) {
  if (value == null) return "";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return "";
}

function normalizeArray(value) {
  if (Array.isArray(value)) return value.filter(Boolean);
  if (typeof value === "string") return value.split(",").map((v) => v.trim()).filter(Boolean);
  return [];
}

function normalizeNote(raw) {
  const n = raw || {};
  return {
    id: n._id || n.id || null,
    title: normalizeText(n.title || n.name || n.fileName || n.originalName) || "Untitled Note",
    subject: normalizeText(n.subject || n.category || n.folder) || "General",
    content: normalizeText(n.content || n.body || n.text || n.extractedText || n.rawContent),
    createdAt: n.createdAt || n.created_at || null,
    updatedAt: n.updatedAt || n.lastUpdated || n.updated_at || n.createdAt || null,
    tags: normalizeArray(n.tags || n.tagList || n.labels),
    favorite: Boolean(n.isFavorite || n.favorite || n.favorited || n.starred),
    sourceType: normalizeText(n.source || n.fileType || n.type),
    aiContent: n.aiContent || {},
    chatHistory: Array.isArray(n.chatHistory) ? n.chatHistory : [],
  };
}

function unwrapResult(result) {
  if (!result) return null;
  if (typeof result === "string") return result;
  if (Array.isArray(result)) return result;
  if (result.data?.data != null) return result.data.data;
  if (result.data?.simplify != null) return result.data.simplify;
  if (result.data != null) return result.data;
  if (result.result != null) return result.result;
  if (result.response != null) return result.response;
  if (result.output != null) return result.output;
  if (result.payload != null) return result.payload;
  return result;
}

function extractArray(payload) {
  if (!payload) return [];
  if (Array.isArray(payload)) return payload.filter(Boolean);
  const arrayKeys = [
    "questions", "items", "cards", "flashcards",
    "quiz", "history", "results", "data", "entries", "list",
  ];
  for (const key of arrayKeys) {
    if (Array.isArray(payload[key])) return payload[key].filter(Boolean);
  }
  return [];
}

function extractText(payload) {
  if (!payload) return "";
  if (typeof payload === "string") return payload;
  const textKeys = ["summary", "simplified", "simplifiedContent", "content", "text", "output", "result", "body"];
  for (const key of textKeys) {
    if (typeof payload[key] === "string" && payload[key]) return payload[key];
  }
  return "";
}

function extractMessageText(item) {
  if (!item) return "";
  if (typeof item === "string") return item;
  return item.content || item.message || item.text || item.reply || item.answer || "";
}

function normalizeNetworkError(err) {
  if (err?.code === "ECONNABORTED" || err?.message?.includes("timeout")) {
    return "Request timed out — the AI is taking longer than usual. Please try again.";
  }
  if (err?.name === "AbortError") return "Request cancelled. Please try again.";
  return (
    err?.response?.data?.message ||
    err?.response?.data?.error ||
    err?.message ||
    "Something went wrong. Please try again."
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Shared presentational primitives
// ─────────────────────────────────────────────────────────────────────────────

function Badge({ children, tone = "slate" }) {
  const styles = {
    slate: "border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-700 dark:bg-[#161b22] dark:text-slate-300",
    purple: "border-purple-300/40 bg-purple-50 text-purple-700 dark:border-purple-500/30 dark:bg-purple-500/10 dark:text-purple-300",
    yellow: "border-yellow-300/40 bg-yellow-50 text-yellow-700 dark:border-yellow-500/30 dark:bg-yellow-500/10 dark:text-yellow-300",
  };
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium", styles[tone])}>
      {children}
    </span>
  );
}

function Skeleton({ rows = 4 }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="h-4 animate-pulse rounded-lg bg-slate-100 dark:bg-[#161b22]"
          style={{ width: `${[100, 85, 92, 70][i % 4]}%` }} />
      ))}
    </div>
  );
}

function ErrorCard({ message }) {
  return (
    <div className="flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300">
      <AlertCircle size={16} className="mt-0.5 shrink-0" />
      <span>{message}</span>
    </div>
  );
}

function EmptyState({ icon: Icon, title, description, action }) {
  return (
    <div className="flex flex-col items-center gap-4 rounded-2xl border border-dashed border-slate-200 bg-slate-50 py-10 px-4 text-center dark:border-slate-800 dark:bg-[#161b22]">
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-purple-500/10 text-purple-500 dark:text-purple-400">
        <Icon size={22} />
      </div>
      <div>
        <p className="text-sm font-medium text-slate-700 dark:text-slate-300">{title}</p>
        {description && <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{description}</p>}
      </div>
      {action}
    </div>
  );
}

function GenerateButton({ onClick, loading, label = "Generate", icon: Icon = Sparkles }) {
  return (
    <button onClick={onClick} disabled={loading}
      className="inline-flex items-center gap-2 rounded-xl bg-purple-600 px-5 py-2 text-sm font-medium text-white shadow-sm transition-all hover:bg-purple-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-purple-500 dark:hover:bg-purple-600">
      {loading ? (<><RefreshCw size={15} className="animate-spin" />Generating…</>) : (<><Icon size={15} />{label}</>)}
    </button>
  );
}

function RegenerateButton({ onClick, loading }) {
  return (
    <button onClick={onClick} disabled={loading} title="Regenerate"
      className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-600 transition-all hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:bg-[#161b22] dark:text-slate-300 dark:hover:bg-slate-800/60">
      <RefreshCw size={13} className={loading ? "animate-spin" : ""} />
      Regenerate
    </button>
  );
}

function PanelCard({ title, icon: Icon, headerRight, children }) {
  return (
    <section className="rounded-3xl border border-slate-200 bg-white/90 p-4 shadow-sm backdrop-blur dark:border-slate-800 dark:bg-[#161b22] sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className="flex h-7 w-7 items-center justify-center rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-300">
            <Icon size={16} />
          </span>
          <h2 className="text-base font-semibold text-slate-900 dark:text-white">{title}</h2>
        </div>
        {headerRight && <div className="flex items-center gap-2">{headerRight}</div>}
      </div>
      <div className="mt-5">{children}</div>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// AI Panel view components
// ─────────────────────────────────────────────────────────────────────────────

function SummaryPanelView({ data, loading, error, onGenerate, onRefresh, onRegenerate }) {
  const summary = extractText(data);
  const hasData = Boolean(summary);
  return (
    <PanelCard title="Summary" icon={Sparkles}
      headerRight={hasData && !loading && <RegenerateButton onClick={onRegenerate} loading={loading} />}>
      {loading && <Skeleton rows={5} />}
      {!loading && error && <ErrorCard message={error} />}
      {!loading && !error && !hasData && (
        <EmptyState icon={Sparkles} title="No summary yet"
          description="Generate an AI summary of this note."
          action={<GenerateButton onClick={onGenerate} loading={loading} />} />
      )}
      {!loading && !error && hasData && (
        <SummaryPanel summary={summary} onGenerate={onGenerate} onRefresh={onRefresh} />
      )}
    </PanelCard>
  );
}

function QuizPanelView({ data, noteId, loading, error, onGenerate, onRegenerate }) {
  const questions = Array.isArray(data) ? data : extractArray(data);
  const hasData = questions.length > 0;
  return (
    <PanelCard title="Quiz" icon={ShieldQuestion}
      headerRight={hasData && !loading && <RegenerateButton onClick={onRegenerate} loading={loading} />}>
      {loading && <Skeleton rows={6} />}
      {!loading && error && <ErrorCard message={error} />}
      {!loading && !error && !hasData && (
        <EmptyState icon={ShieldQuestion} title="No quiz yet"
          description="Generate quiz questions from this note."
          action={<GenerateButton onClick={onGenerate} loading={loading} label="Generate Quiz" icon={ShieldQuestion} />} />
      )}
      {!loading && !error && hasData && <QuizPanel questions={questions} noteId={noteId} />}
    </PanelCard>
  );
}

function FlashcardsPanelView({ data, loading, error, onGenerate }) {
  const cards = Array.isArray(data) ? data : extractArray(data);
  const hasData = cards.length > 0;
  return (
    <PanelCard title="Flashcards" icon={Layers3}
      headerRight={hasData && !loading && <RegenerateButton onClick={onGenerate} loading={loading} />}>
      {loading && <Skeleton rows={4} />}
      {!loading && error && <ErrorCard message={error} />}
      {!loading && !error && !hasData && (
        <EmptyState icon={Layers3} title="No flashcards yet"
          description="Generate study flashcards from this note."
          action={<GenerateButton onClick={onGenerate} loading={loading} label="Generate Flashcards" icon={Layers3} />} />
      )}
      {!loading && !error && hasData && <FlashcardsPanel cards={cards} />}
    </PanelCard>
  );
}

function QuestionsPanelView({ data, loading, error, onGenerate, noteId }) {
  const questions = Array.isArray(data) ? data : extractArray(data);
  const hasData = questions.length > 0;
  return (
    <PanelCard title="Practice Questions" icon={FileQuestion} headerRight={null}>
      {loading && <Skeleton rows={5} />}
      {!loading && error && <ErrorCard message={error} />}
      {!loading && !error && !hasData && (
        <EmptyState icon={FileQuestion} title="No questions yet"
          description="Generate practice questions from this note."
          action={<GenerateButton onClick={onGenerate} loading={loading} label="Generate Questions" icon={FileQuestion} />} />
      )}
      {!loading && !error && hasData && <QuestionsPanel questions={questions} noteId={noteId} />}
    </PanelCard>
  );
}

function SimplifyPanelView({ data, loading, error, onGenerate, onRefresh }) {
  console.log("SimplifyPanelView", { onGenerate, onRefresh });
  const content = extractText(data);
  const hasData = Boolean(content);
  return (
    <PanelCard title="Simplified Note" icon={Lightbulb}
      headerRight={hasData && !loading && <RegenerateButton onClick={onGenerate} loading={loading} />}>
      {loading && <Skeleton rows={5} />}
      {!loading && error && <ErrorCard message={error} />}
      {!loading && !error && !hasData && (
        <EmptyState icon={Lightbulb} title="Not simplified yet"
          description="Rewrite this note in simpler, clearer language."
          action={<GenerateButton onClick={onGenerate} loading={loading} label="Simplify Note" icon={Lightbulb} />} />
      )}
      {!loading && !error && hasData && <SimplifyPanel data={content} onGenerate={onGenerate} onRefresh={onRefresh} />}
    </PanelCard>
  );
}

function HistoryPanelView({ data, loading, error, onGenerate, onDelete }) {
  const history = Array.isArray(data) ? data : extractArray(data);
  const hasData = history.length > 0;
  return (
    <PanelCard title="AI History" icon={History} headerRight={null}>
      {loading && <Skeleton rows={4} />}
      {!loading && error && <ErrorCard message={error} />}
      {!loading && !error && !hasData && (
        <EmptyState icon={History} title="No history loaded"
          description="Load the AI generation history for this note."
          action={<GenerateButton onClick={onGenerate} loading={loading} label="Load History" icon={History} />} />
      )}
      {!loading && !error && hasData && (
        <AIHistoryPanel history={history} onDelete={onDelete} onRefreshHistory={onGenerate} />
      )}
    </PanelCard>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ActivePanel
// ─────────────────────────────────────────────────────────────────────────────

function ActivePanel(props) {
  console.log("ActivePanel props:", props);
  console.log("onSimplify:", props.onSimplify);
  console.log("onRefreshSimplify:", props.onRefreshSimplify);
  const { activeTab } = props;
  if (activeTab === "summary") return <SummaryPanelView data={props.summaryData} loading={props.summaryLoading} error={props.summaryError} onGenerate={props.onGenerateSummary} onRefresh={props.onRefreshSummary} onRegenerate={props.onRegenerateSummary} />;
  if (activeTab === "quiz")
    return (
      <QuizPanelView
        data={props.quizData}
        noteId={props.noteId}
        loading={props.quizLoading}
        error={props.quizError}
        onGenerate={props.onGenerateQuiz}
        onRegenerate={props.onRegenerate}
      />
    );
  if (activeTab === "flashcards") return <FlashcardsPanelView data={props.flashcardsData} loading={props.flashcardsLoading} error={props.flashcardsError} onGenerate={props.onGenerateFlashcards} />;
  if (activeTab === "questions")
    return (
      <QuestionsPanelView
        data={props.questionsData}
        loading={props.questionsLoading}
        error={props.questionsError}
        onGenerate={props.onGenerateQuestions}
        noteId={props.noteId}
      />
    );
  if (activeTab === "simplify") return <SimplifyPanelView data={props.simplifyData} loading={props.simplifyLoading} error={props.simplifyError} onGenerate={props.onSimplify} onRefresh={props.onRefreshSimplify} />;
  if (activeTab === "history") return <HistoryPanelView data={props.historyData} loading={props.historyLoading} error={props.historyError} onGenerate={props.onLoadHistory} onDelete={props.onDeleteHistory} />;
  if (activeTab === "chat")
    return (
      <ChatPanel
        messages={props.chatMessages}
        input={props.chatInput}
        onInputChange={props.setChatInput}
        loading={props.chatSending}
        onSend={() => props.onSendChat(props.chatInput)}
        onEditMessage={props.onEditMessage}
        onClear={() => props.setChatInput("")}
        chatEndRef={props.chatEndRef}
        noteTitle={props.noteTitle}
        onDownloadChat={props.onDownloadChat}
        chats={props.chats}
        selectedChat={props.selectedChat}
        onSelectChat={props.onSelectChat}
        onNewChat={props.onNewChat}
      />
    );

  return (
    <ExportPanel
      aiContent={props.aiContent}
      chats={props.chats}
      onExportSummary={props.onExportSummary}
      onExportQuiz={props.onExportQuiz}
      onExportFlashcards={props.onExportFlashcards}
      onExportQuestions={props.onExportQuestions}
      onExportSimplifiedNotes={props.onExportSimplifiedNotes}
      onExportChat={props.onExportChat}
      onExportStudyPack={props.onExportStudyPack}
    />
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// WorkspaceSidebar — navigation only
// ─────────────────────────────────────────────────────────────────────────────

function WorkspaceSidebar({ activeTab, onTabChange, generatedTabs }) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white/90 p-4 shadow-sm backdrop-blur dark:border-slate-800 dark:bg-[#161b22]">
      <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">AI Workspace</p>
      <p className="mt-1 mb-3 text-xs text-slate-400 dark:text-slate-500">Select a feature — generate from inside the panel.</p>
      <nav className="space-y-0.5" aria-label="AI workspace navigation">
        {TABS.map(({ key, label, icon: Icon }) => {
          const active = activeTab === key;
          const isDone = generatedTabs.has(key);
          return (
            <button key={key} onClick={() => onTabChange(key)}
              className={cn("flex w-full items-center justify-between rounded-xl px-2.5 py-1.5 text-sm font-medium transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-500",
                active ? "bg-purple-500/10 text-purple-700 ring-1 ring-purple-500/20 dark:text-purple-300" : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800/60")}>
              <span className="flex items-center gap-3">
                <span className={cn("flex h-7 w-7 shrink-0 items-center justify-center rounded-xl text-sm",
                  active ? "bg-purple-500/15 text-purple-600 dark:text-purple-300" : "bg-slate-100 text-slate-500 dark:bg-slate-800/60 dark:text-slate-400")}>
                  <Icon size={15} />
                </span>
                {label}
              </span>
              {isDone && <span title="Result ready" className="h-2 w-2 shrink-0 rounded-full bg-emerald-400" />}
            </button>
          );
        })}
      </nav>
    </section>
  );
}

function StatCard({ icon: Icon, label, value }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white/90 p-3 shadow-sm backdrop-blur dark:border-slate-800 dark:bg-[#161b22] sm:p-4">
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[10px] font-medium uppercase tracking-wider text-slate-400 dark:text-slate-500 truncate">{label}</p>
          <p className="mt-1 text-lg font-semibold text-slate-900 dark:text-white sm:text-xl truncate">{value}</p>
        </div>
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-300 sm:h-10 sm:w-10 sm:rounded-2xl">
          <Icon size={16} className="sm:hidden" />
          <Icon size={18} className="hidden sm:block" />
        </div>
      </div>
    </div>
  );
}

function Toast({ toast, onDismiss }) {
  if (!toast) return null;
  return (
    <div role="alert" aria-live="polite"
      className="fixed right-3 top-3 left-3 z-50 flex items-start gap-3 rounded-2xl border border-slate-200 bg-white/95 px-4 py-3 shadow-xl backdrop-blur dark:border-slate-800 dark:bg-[#11151c]/95 sm:left-auto sm:right-4 sm:top-4 sm:w-[min(calc(100vw-2rem),22rem)]">
      {toast.type === "error"
        ? <AlertCircle size={16} className="mt-0.5 shrink-0 text-rose-500" />
        : <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-emerald-500" />}
      <p className="flex-1 text-sm text-slate-700 dark:text-slate-300">{toast.message}</p>
      <button onClick={onDismiss} className="shrink-0 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
        <X size={15} />
      </button>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// NoteDetails — controller
// ─────────────────────────────────────────────────────────────────────────────

export default function NoteDetails() {
  const { darkMode } = useTheme(); // eslint-disable-line no-unused-vars
  const { id } = useParams();
  const navigate = useNavigate();

  const [noteRaw, setNoteRaw] = useState(null);
  const [noteLoading, setNoteLoading] = useState(true);
  const [noteError, setNoteError] = useState("");

  const [activeTab, setActiveTab] = useState("summary");

  const [summaryData, setSummaryData] = useState(null);
  const [quizData, setQuizData] = useState(null);
  const [flashcardsData, setFlashcardsData] = useState(null);
  const [questionsData, setQuestionsData] = useState(null);
  const [simplifyData, setSimplifyData] = useState(null);
  const [historyData, setHistoryData] = useState(null);
  const [chatMessages, setChatMessages] = useState([]);
  const [chats, setChats] = useState([]);
  const [selectedChat, setSelectedChat] = useState(null);

  const [summaryLoading, setSummaryLoading] = useState(false);
  const [quizLoading, setQuizLoading] = useState(false);
  const [flashcardsLoading, setFlashcardsLoading] = useState(false);
  const [questionsLoading, setQuestionsLoading] = useState(false);
  const [simplifyLoading, setSimplifyLoading] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [chatSending, setChatSending] = useState(false);

  const [summaryError, setSummaryError] = useState("");
  const [quizError, setQuizError] = useState("");
  const [flashcardsError, setFlashcardsError] = useState("");
  const [questionsError, setQuestionsError] = useState("");
  const [simplifyError, setSimplifyError] = useState("");
  const [historyError, setHistoryError] = useState("");

  const [chatInput, setChatInput] = useState("");
  const [toast, setToast] = useState(null);

  const toastTimer = useRef(null);
  const chatEndRef = useRef(null);
  const aiPanelRef = useRef(null);

  const showToast = useCallback((message, type = "info") => {
    setToast({ message, type });
    window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(null), 3200);
  }, []);

  const handleLoadHistory = useCallback(async () => {
    console.log("HISTORY REFRESH HIT");
    setHistoryLoading(true);
    setHistoryError("");

    try {
      const res = await getAIHistory(id);
      const payload = unwrapResult(res);
      console.log("[NoteDetails] getAIHistory:", payload);
      setHistoryData(payload);
      showToast("History refreshed");
    } catch (err) {
      const msg = normalizeNetworkError(err);
      setHistoryError(msg);
      showToast(msg, "error");
    } finally {
      setHistoryLoading(false);
    }
  }, [id, showToast]);

  useEffect(() => () => window.clearTimeout(toastTimer.current), []);

  useEffect(() => {
    let cancelled = false;
    async function fetchNote() {
      setNoteLoading(true);
      setNoteError("");
      try {
        const res = await apiClient.get(`/notes/${id}`);
        const raw = res?.data?.note || res?.data?.data || res?.data || {};
        console.log("[NoteDetails] fetchNote:", raw);

        if (!cancelled) {
          setNoteRaw(raw);

          const ai = raw.aiContent || {};

          if (ai.summary) setSummaryData(ai.summary);
          if (Array.isArray(ai.quiz) && ai.quiz.length) setQuizData(ai.quiz);
          if (Array.isArray(ai.flashcards) && ai.flashcards.length) setFlashcardsData(ai.flashcards);
          if (Array.isArray(ai.questions) && ai.questions.length) setQuestionsData(ai.questions);
          if (ai.simplify) setSimplifyData(ai.simplify);

          if (raw.chats?.length > 0) {
            const firstChat = raw.chats[0];
            setSelectedChat(firstChat);
            setChatMessages(firstChat.messages || []);
          }
        }
      } catch (err) {
        console.error("[NoteDetails] fetchNote error:", err);
        if (!cancelled) setNoteError(normalizeNetworkError(err));
      } finally {
        if (!cancelled) setNoteLoading(false);
      }
    }
    fetchNote();
    return () => { cancelled = true; };
  }, [id]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [chatMessages, chatSending]);

  const note_ = useMemo(() => normalizeNote(noteRaw), [noteRaw]);
  const { title, subject, tags, favorite, sourceType, createdAt, updatedAt, content } = note_;
  const wordCount = useMemo(() => content.trim().split(/\s+/).filter(Boolean).length, [content]);
  const readTime = Math.max(1, Math.ceil(wordCount / 200));
  const lastActive = updatedAt || createdAt;

  const generatedTabs = useMemo(() => {
    const s = new Set();
    if (summaryData != null) s.add("summary");
    if (quizData != null) s.add("quiz");
    if (flashcardsData != null) s.add("flashcards");
    if (questionsData != null) s.add("questions");
    if (simplifyData != null) s.add("simplify");
    if (Array.isArray(historyData) && historyData.length > 0) s.add("history");
    if (chatMessages.length) s.add("chat");
    return s;
  }, [summaryData, quizData, flashcardsData, questionsData, simplifyData, historyData, chatMessages]);

  // ── AI handlers ───────────────────────────────────────────────────────────

  const handleGenerateSummary = useCallback(async () => {
    setSummaryLoading(true); setSummaryError("");
    try {
      const res = await generateSummary(id);
      const payload = unwrapResult(res);
      console.log("[NoteDetails] generateSummary:", payload);
      setSummaryData(payload);
    } catch (err) {
      console.error("[NoteDetails] generateSummary error:", err);
      const msg = normalizeNetworkError(err);
      setSummaryError(msg); showToast(msg, "error");
    } finally { setSummaryLoading(false); }
  }, [id, showToast]);

  const handleRegenerateSummary = useCallback(async () => {
    setSummaryLoading(true);
    console.log("REGENERATE SUMMARY CLICKED");
    try {
      await apiClient.post(`/ai/regenerate-summary/${id}`);
      const res = await generateSummary(id);
      const payload = unwrapResult(res);
      setSummaryData(payload);
      showToast("Summary regenerated");
    } catch (err) {
      showToast(normalizeNetworkError(err), "error");
    } finally {
      setSummaryLoading(false);
    }
  }, [id, showToast]);

  const handleRefreshSummary = useCallback(async () => {
    try {
      const noteRes = await apiClient.get(`/notes/${id}`);
      const note = noteRes.data?.note || noteRes.data;
      setSummaryData({ summary: note?.aiContent?.summary || "" });
      showToast("Summary refreshed");
    } catch (err) {
      console.error(err);
    }
  }, [id, showToast]);

  const handleGenerateQuiz = useCallback(async () => {
    setQuizLoading(true);
    setQuizError("");
    try {
      const res = await generateQuiz(id);
      const payload = unwrapResult(res);
      console.log("PAYLOAD", payload);
      localStorage.removeItem(`quiz-selected-${id}`);
      localStorage.removeItem(`quiz-revealed-${id}`);
      setQuizData(Array.isArray(payload) ? payload : payload.quiz || []);
    } catch (err) {
      console.error("[NoteDetails] generateQuiz error:", err);
      const msg = normalizeNetworkError(err);
      setQuizError(msg);
      showToast(msg, "error");
    } finally {
      setQuizLoading(false);
    }
  }, [id, showToast]);

  const handleRegenerateQuiz = useCallback(async () => {
    setQuizLoading(true);
    try {
      const res = await regenerateQuiz(id);
      const payload = unwrapResult(res);
      setQuizData(payload.quiz || []);
      await handleLoadHistory();
      localStorage.removeItem(`quiz-selected-${id}`);
      localStorage.removeItem(`quiz-revealed-${id}`);
      showToast("Quiz regenerated successfully");
    } catch (err) {
      showToast(normalizeNetworkError(err), "error");
    } finally {
      setQuizLoading(false);
    }
  }, [id, showToast, handleLoadHistory]);

  const handleGenerateFlashcards = useCallback(async () => {
    setFlashcardsLoading(true); setFlashcardsError("");
    try {
      const res = await generateFlashcards(id);
      const payload = unwrapResult(res);
      console.log("[NoteDetails] generateFlashcards:", payload);
      setFlashcardsData(payload);
    } catch (err) {
      console.error("[NoteDetails] generateFlashcards error:", err);
      const msg = normalizeNetworkError(err);
      setFlashcardsError(msg); showToast(msg, "error");
    } finally { setFlashcardsLoading(false); }
  }, [id, showToast]);

  const handleGenerateQuestions = useCallback(async () => {
    setQuestionsLoading(true); setQuestionsError("");
    try {
      const res = await generateQuestions(id);
      const payload = unwrapResult(res);
      console.log("[NoteDetails] generateQuestions:", payload);
      setQuestionsData(payload);
    } catch (err) {
      console.error("[NoteDetails] generateQuestions error:", err);
      const msg = normalizeNetworkError(err);
      setQuestionsError(msg); showToast(msg, "error");
    } finally { setQuestionsLoading(false); }
  }, [id, showToast]);

  const handleSimplify = useCallback(async () => {
    console.log("SIMPLIFY BUTTON CLICKED");
    setSimplifyLoading(true);
    setSimplifyError("");
    try {
      const res = await simplifyNote(id);
      const payload = unwrapResult(res);
      setSimplifyData(payload);
    } catch (err) {
      console.error(err);
    } finally {
      setSimplifyLoading(false);
    }
  }, [id, showToast]);

  const handleRefreshSimplify = useCallback(async () => {
    console.log("REFRESH SIMPLIFY HIT");
    try {
      const noteRes = await apiClient.get(`/notes/${id}`);
      console.log("NOTE RESPONSE:", noteRes);
      const note = noteRes.data?.note || noteRes.data;
      setSimplifyData(note?.aiContent?.simplify || "");
      showToast("Simplified notes refreshed");
    } catch (err) {
      console.error(err);
    }
  }, [id, showToast]);

  const handleDeleteHistory = async (item) => {
    try {
      console.log("DELETE HISTORY:", item);
      await apiClient.delete(`/ai/history/${id}/${item._id}`);
      await handleLoadHistory();
      showToast("History deleted");
      return true;
    } catch (err) {
      showToast(normalizeNetworkError(err), "error");
      return false;
    }
  };

  const loadChats = async () => {
    try {
      const res = await getChats(id);
      const data = res.data || [];
      setChats(data);
      if (data.length > 0 && !selectedChat) {
        const firstChat = data[0];
        setSelectedChat(firstChat);
        const chatRes = await getChat(id, firstChat._id);
        setChatMessages(chatRes.data?.messages || []);
      }
    } catch (err) {
      console.error("Load Chats Error:", err);
    }
  };

  useEffect(() => {
    if (id) { loadChats(); }
  }, [id]);

  const handleRenameChat = async (chatId, title) => {
    try {
      await renameChat(id, chatId, title);
      await loadChats();
    } catch (err) {
      console.error("Rename Chat Error:", err);
    }
  };

  const handleDeleteChat = async (chatId) => {
    try {
      await deleteChat(id, chatId);
      await loadChats();
      if (selectedChat?._id === chatId) {
        setSelectedChat(null);
        setChatMessages([]);
      }
    } catch (err) {
      console.error("Delete Chat Error:", err);
    }
  };

  const handleSelectChat = async (chat) => {
    try {
      setSelectedChat(chat);
      const res = await getChat(id, chat._id);
      setChatMessages(res.data?.messages || []);
    } catch (err) {
      console.error("Select Chat Error:", err);
    }
  };

  const handleNewChat = async () => {
    try {
      const res = await createChat(id);
      await loadChats();
      setSelectedChat(res.data);
      setChatMessages([]);
      await handleSelectChat(res.data);
      return res.data;
    } catch (err) {
      console.error(err);
    }
  };

  const handleSendChat = useCallback(async (message) => {
    const text = (typeof message === "string" ? message : "").trim();
    if (!text) return;

    let currentChat = selectedChat;
    if (!currentChat) {
      const created = await handleNewChat();
      currentChat = created?.chat || created;
    }

    setChatInput("");
    setChatMessages((prev) => [...prev, {
      role: "user",
      content: text,
      timestamp: new Date().toISOString(),
    }]);
    setChatSending(true);

    try {
      const res = await sendMessage(id, currentChat._id, text);
      const raw = unwrapResult(res);
      const reply = extractMessageText(raw);

      setChatMessages((prev) => [...prev, {
        role: "assistant",
        content: reply || "No response.",
        timestamp: new Date().toISOString(),
      }]);

      await loadChats();

      const handleRenameChat = async (chatId, title) => {
        try {
          await renameChat(id, chatId, title);
          await loadChats();
        } catch (err) {
          console.error("Rename Chat Error:", err);
        }
      };

      const handleDeleteChat = async (chatId) => {
        try {
          await deleteChat(id, chatId);
          await loadChats();
          if (selectedChat?._id === chatId) {
            setSelectedChat(null);
            setChatMessages([]);
          }
        } catch (err) {
          console.error("Delete Chat Error:", err);
        }
      };

      const updatedChat = await getChat(id, currentChat._id);
      setSelectedChat(updatedChat.data);
      setChatMessages(updatedChat.data?.messages || []);
    } catch (err) {
      setChatMessages((prev) => [...prev, {
        role: "assistant",
        content: normalizeNetworkError(err),
        timestamp: new Date().toISOString(),
      }]);
    } finally {
      setChatSending(false);
    }
  }, [id, selectedChat]);

  const handleEditMessage = useCallback(async (chatId, messageId, newText, meta = {}) => {
    const text = newText?.trim();
    if (!text || !selectedChat) return;

    const editedIndex = chatMessages.findIndex((m) => (m.id || m._id) === messageId);
    const truncated = [
      ...chatMessages.slice(0, editedIndex < 0 ? chatMessages.length : editedIndex),
      { role: "user", content: text, timestamp: new Date().toISOString() },
    ];

    setChatMessages(truncated);
    setChatSending(true);

    try {
      const res = await sendMessage(id, selectedChat._id, text);
      const raw = unwrapResult(res);
      const reply = extractMessageText(raw);

      setChatMessages((prev) => [...prev, {
        role: "assistant",
        content: reply || "No response.",
        timestamp: new Date().toISOString(),
      }]);

      await loadChats();
      const updated = await getChat(id, selectedChat._id);
      setChatMessages(updated.data?.messages || []);
      setSelectedChat(updated.data);
    } catch (err) {
      setChatMessages((prev) => [...prev, {
        role: "assistant",
        content: normalizeNetworkError(err),
        timestamp: new Date().toISOString(),
      }]);
    } finally {
      setChatSending(false);
    }
  }, [id, selectedChat, chatMessages]);

  const downloadPdfFile = async (endpoint, filename) => {
    try {
      const response = await apiClient.get(endpoint, { responseType: "blob" });
      const blob = new Blob([response.data], { type: "application/pdf" });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("PDF Download Error:", error);
    }
  };

  const handleDownloadSummary = () => downloadPdfFile(`/ai/download-summary/${id}`, "summary.pdf");
  const handleDownloadQuiz = () => downloadPdfFile(`/ai/download-quiz/${id}`, "quiz.pdf");
  const handleDownloadFlashcards = () => downloadPdfFile(`/ai/download-flashcards/${id}`, "flashcards.pdf");
  const handleDownloadQuestions = () => downloadPdfFile(`/ai/download-important/${id}`, "questions.pdf");
  const handleDownloadSimplify = () => downloadPdfFile(`/ai/download-simplify/${id}`, "simplified-notes.pdf");
  const handleDownloadChat = (chatId) => downloadPdfFile(`/ai/download-chat/${id}/${chatId}`, "chat-history.pdf");
  const handleDownloadStudyPack = () => downloadPdfFile(`/ai/download-study-pack/${id}`, "study-pack.pdf");

  const handleTabChange = useCallback(
    (key) => {
      setActiveTab(key);
      if (key === "history" && !historyData) {
        handleLoadHistory();
      }
      requestAnimationFrame(() => {
        aiPanelRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    },
    [historyData, handleLoadHistory]
  );

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <Layout>
      <Toast toast={toast} onDismiss={() => setToast(null)} />
      <div className="dark:bg-[#11151c] min-h-screen">
        <div
          className={`grid grid-cols-1 gap-6 lg:gap-8 ${activeTab === "chat"
            ? "lg:grid-cols-1"
            : "lg:grid-cols-[minmax(0,1fr)_256px]"
            }`}
        >
          <main className="min-w-0 space-y-6 lg:space-y-8">

            {/* ── Header ── */}
            <section className="rounded-3xl border border-purple-200/60 bg-gradient-to-br from-purple-50 via-white to-slate-50 p-4 shadow-sm dark:border-slate-800 dark:from-[#161b22] dark:via-[#161b22] dark:to-[#11151c] sm:p-6">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <button onClick={() => navigate(-1)}
                  className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:bg-[#161b22] dark:text-slate-300 dark:hover:bg-slate-800/60">
                  <ArrowLeft size={15} /> Back
                </button>
                <Badge tone={favorite ? "yellow" : "slate"}>
                  <Star size={11} className={favorite ? "fill-yellow-500 text-yellow-500" : ""} />
                  {favorite ? "Favourite" : "Not Favourite"}
                </Badge>
              </div>
              <div className="mt-3 flex flex-wrap gap-1.5 sm:gap-2">
                <Badge tone="purple"><BookOpen size={11} /> {subject}</Badge>
                {sourceType && <Badge tone="slate"><FileText size={11} /> {sourceType}</Badge>}
                <Badge tone="slate"><Clock3 size={11} /> Created {formatDate(createdAt)}</Badge>
                <Badge tone="slate"><Clock3 size={11} /> Updated {formatDate(updatedAt)}</Badge>
                {tags.map((tag, i) => <Badge key={i} tone="slate">#{tag}</Badge>)}
              </div>
              <h1 className="mt-3 text-xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-2xl lg:text-3xl">
                {noteLoading ? "Loading…" : title}
              </h1>
              <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-500 dark:text-slate-400">
                Read the note below, then use the AI Workspace on the right to study, quiz yourself, or chat with the content.
              </p>
            </section>

            {/* ── Stats ── */}
            <section className="grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3 xl:grid-cols-6">
              <StatCard icon={Type} label="Words" value={wordCount.toLocaleString()} />
              <StatCard icon={Hash} label="Characters" value={content.length.toLocaleString()} />
              <StatCard icon={Clock3} label="Read Time" value={`${readTime} min`} />
              <StatCard icon={Tags} label="Tags" value={tags.length.toLocaleString()} />
              <StatCard icon={Sparkles} label="AI Generated" value={generatedTabs.size.toLocaleString()} />
              <StatCard icon={RefreshCw} label="Last Active" value={formatDate(lastActive)} />
            </section>

            {/* ── Note Content ── */}
            <section className="rounded-3xl border border-slate-200 bg-white/90 p-4 shadow-sm backdrop-blur dark:border-slate-800 dark:bg-[#161b22] sm:p-6">
              <h2 className="text-base font-semibold text-slate-900 dark:text-white">Note Content</h2>
              <p className="mt-0.5 text-xs text-slate-400 dark:text-slate-500">Clean reading view · line breaks preserved</p>
              <div className="mt-4">
                {noteLoading ? <Skeleton rows={8} />
                  : noteError ? <ErrorCard message={noteError} />
                    : <p className="whitespace-pre-wrap break-words text-sm leading-7 max-w-none text-slate-700 dark:text-slate-300">{content || "No content available."}</p>}
              </div>
            </section>

            {/* ── Tab bar — horizontally scrollable on mobile ── */}
            <div
              role="tablist"
              className="
grid w-full grid-cols-8 gap-1
rounded-xl border
border-slate-200 bg-white
dark:border-slate-800 dark:bg-[#161b22]
p-1.5
"
            >
              {TABS.map(({ key, label, icon: Icon }) => {
                const active = activeTab === key;
                const done = generatedTabs.has(key);
                return (
                  <button
                    key={key}
                    onClick={() => handleTabChange(key)}
                    className={cn(
                      "relative flex w-full items-center justify-center gap-1 rounded-lg px-1.5 py-1.5 text-[12px] font-medium transition-all whitespace-nowrap",
                      active
                        ? "bg-purple-600 text-white shadow-sm dark:bg-purple-500"
                        : "text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800/60"
                    )}
                  >
                    <Icon size={12} className="shrink-0" />
                    <span className="truncate">{label}</span>
                    {done && !active && (
                      <span className="absolute right-1 top-1 h-1.5 w-1.5 rounded-full bg-emerald-500 dark:bg-emerald-400" />
                    )}
                  </button>
                );
              })}
            </div>

            {/* ── Active AI panel ── */}
            <div ref={aiPanelRef}>
              {activeTab === "chat" ? (
                <ChatPanel
                  chats={chats}
                  selectedChat={selectedChat}
                  onSelectChat={handleSelectChat}
                  onNewChat={handleNewChat}
                  onRenameChat={handleRenameChat}
                  onDeleteChat={handleDeleteChat}
                  onEditMessage={handleEditMessage}
                  refreshChats={loadChats}
                  messages={chatMessages}
                  input={chatInput}
                  onInputChange={setChatInput}
                  loading={chatSending}
                  onSend={() => handleSendChat(chatInput)}
                  chatEndRef={chatEndRef}
                  noteTitle={title}
                />
              ) : (
                <ActivePanel
                  noteId={id}
                  activeTab={activeTab}
                  summaryData={summaryData}
                  quizData={quizData}
                  flashcardsData={flashcardsData}
                  questionsData={questionsData}
                  simplifyData={simplifyData}
                  historyData={historyData}
                  chatMessages={chatMessages}
                  chatInput={chatInput}
                  setChatInput={setChatInput}
                  chatSending={chatSending}
                  summaryLoading={summaryLoading}
                  quizLoading={quizLoading}
                  flashcardsLoading={flashcardsLoading}
                  questionsLoading={questionsLoading}
                  simplifyLoading={simplifyLoading}
                  historyLoading={historyLoading}
                  summaryError={summaryError}
                  quizError={quizError}
                  flashcardsError={flashcardsError}
                  questionsError={questionsError}
                  simplifyError={simplifyError}
                  historyError={historyError}
                  onGenerateSummary={handleGenerateSummary}
                  onRegenerateSummary={handleRegenerateSummary}
                  onRefreshSummary={handleRefreshSummary}
                  onGenerateQuiz={handleGenerateQuiz}
                  onGenerateFlashcards={handleGenerateFlashcards}
                  onGenerateQuestions={handleGenerateQuestions}
                  onSimplify={handleSimplify}
                  onRefreshSimplify={handleRefreshSimplify}
                  onExportStudyPack={handleDownloadStudyPack}
                  onExportChat={handleDownloadChat}
                  onLoadHistory={handleLoadHistory}
                  onSendChat={handleSendChat}
                  chatEndRef={chatEndRef}
                  aiContent={noteRaw?.aiContent || {}}
                  onExportSummary={handleDownloadSummary}
                  onExportQuiz={handleDownloadQuiz}
                  onExportFlashcards={handleDownloadFlashcards}
                  onExportQuestions={handleDownloadQuestions}
                  onExportSimplifiedNotes={handleDownloadSimplify}
                  chats={chats}
                  selectedChat={selectedChat}
                  onSelectChat={handleSelectChat}
                  onNewChat={handleNewChat}
                  onRegenerate={handleRegenerateQuiz}
                  onDeleteHistory={handleDeleteHistory}
                />
              )}
            </div>
          </main>

          {/* ── Sidebar: sticky on lg+, hidden on mobile ── */}
          {activeTab !== "chat" && (
            <aside className="hidden lg:block lg:sticky lg:top-8 self-start">
              <WorkspaceSidebar
                activeTab={activeTab}
                onTabChange={handleTabChange}
                generatedTabs={generatedTabs}
              />
            </aside>
          )}
        </div>
      </div>
    </Layout>
  );
}