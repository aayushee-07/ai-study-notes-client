import React, { memo, useMemo, useState } from "react";
import {
  Download,
  FileDown,
  FileText,
  ListChecks,
  Sparkles,
  Lightbulb,
  Brain,
  MessageSquareText,
  Loader2,
  CheckCircle2,
  Circle,
  Clock3,
} from "lucide-react";

const safeText = (value) => {
  if (value === null || value === undefined) return "";
  if (typeof value === "string" || typeof value === "number") return String(value);
  if (Array.isArray(value)) return value.map(safeText).filter(Boolean).join("\n");
  if (typeof value === "object") {
    if (typeof value.content === "string") return value.content;
    if (typeof value.text === "string") return value.text;
    if (typeof value.title === "string") return value.title;
    if (typeof value.message === "string") return value.message;
    return "";
  }
  return "";
};

const toArray = (value) => {
  if (Array.isArray(value)) return value.filter(Boolean);
  const text = safeText(value).trim();
  if (!text) return [];
  return text.split(/\n+/).map((s) => s.trim()).filter(Boolean);
};

const countItems = (value) => {
  if (Array.isArray(value)) return value.length;
  const text = safeText(value).trim();
  if (!text) return 0;
  return text.split(/\n+/).map((s) => s.trim()).filter(Boolean).length || 1;
};

const hasContent = (value) => {
  if (Array.isArray(value)) return value.length > 0;
  return !!safeText(value).trim();
};

const formatDate = (value) => {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return safeText(value);
  return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
};

const Panel = memo(function Panel({ title, subtitle, children, className = "" }) {
  return (
    <section className={`rounded-2xl border border-slate-200/70 dark:border-slate-800/70 bg-white/75 dark:bg-slate-950/60 backdrop-blur-xl shadow-sm ${className}`}>
      <div className="border-b border-slate-200/60 dark:border-slate-800/60 px-4 py-3">
        <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">{title}</h3>
        {subtitle ? <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{subtitle}</p> : null}
      </div>
      <div className="p-4">{children}</div>
    </section>
  );
});

const Badge = ({ available, count }) => (
  <span
    className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-semibold ${
      available
        ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
        : "border-slate-200/70 bg-slate-100/70 text-slate-500 dark:border-slate-800/70 dark:bg-slate-900/60 dark:text-slate-400"
    }`}
  >
    {available ? <CheckCircle2 size={11} /> : <Circle size={11} />}
    {available ? count || "Ready" : "Unavailable"}
  </span>
);

const ExportCard = memo(function ExportCard({ title, description, icon: Icon, available, loading, onClick }) {
  return (
    <div className="rounded-2xl border border-slate-200/70 dark:border-slate-800/70 bg-white/75 dark:bg-slate-950/60 p-4 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:scale-[1.02] hover:shadow-md">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500/15 via-violet-500/15 to-fuchsia-500/15 text-indigo-600 dark:text-indigo-300">
          <Icon size={18} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100">{title}</h4>
            <Badge available={available} count={available ? "Ready" : "Missing"} />
          </div>
          <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">{description}</p>
          <button
            type="button"
            onClick={onClick}
            disabled={!available || loading}
            className="mt-3 inline-flex h-11 w-full items-center justify-center gap-2 rounded-2xl bg-slate-100/80 px-4 text-sm font-medium text-slate-700 transition-all duration-300 hover:bg-slate-200 hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-slate-800/80 dark:text-slate-200 dark:hover:bg-slate-700"
          >
            {loading ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
            Download PDF
          </button>
        </div>
      </div>
    </div>
  );
});

const ChatRow = memo(function ChatRow({ chat, onExportChat, loading, onClick }) {
  const title = safeText(chat?.title || chat?.name || "Untitled Chat");
  const rawMessages = chat?.messages ?? chat?.messageCount ?? chat?.totalMessages ?? 0;
  const messageCount = Array.isArray(rawMessages) ? rawMessages.length : Number(rawMessages) || 0;
  const updated = chat?.updatedAt || chat?.lastUpdated || chat?.createdAt || null;
  const canExport = !!chat?._id && typeof onExportChat === "function";

  return (
    <div className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200/70 dark:border-slate-800/70 bg-white/75 dark:bg-slate-950/60 px-3 py-3 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:scale-[1.01] hover:shadow-md">
      <div className="min-w-0">
        <p className="truncate text-sm font-medium text-slate-900 dark:text-slate-100">{title}</p>
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
          {messageCount} Message{messageCount === 1 ? "" : "s"}{updated ? ` • ${formatDate(updated)}` : ""}
        </p>
      </div>

      <button
        type="button"
        onClick={onClick}
        disabled={!canExport || loading}
        className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-2xl bg-slate-100/80 px-3 text-sm font-medium text-slate-700 transition-all duration-300 hover:bg-slate-200 hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-slate-800/80 dark:text-slate-200 dark:hover:bg-slate-700"
        aria-label={`Download PDF for ${title}`}
      >
        {loading ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
        PDF
      </button>
    </div>
  );
});

export default memo(function ExportPanel({
  aiContent = {},
  chats = [],
  onExportSummary,
  onExportQuiz,
  onExportFlashcards,
  onExportQuestions,
  onExportSimplifiedNotes,
  onExportChat,
  onExportStudyPack,
}) {
  const [busyKey, setBusyKey] = useState("");
  const [toast, setToast] = useState(null);

  const summary = safeText(aiContent.summary);
  const simplified = safeText(aiContent.simplifiedNotes || aiContent.simplify);
  const quiz = toArray(aiContent.quiz);
  const flashcards = toArray(aiContent.flashcards);
  const questions = toArray(aiContent.questions);
  const chatList = Array.isArray(chats) ? chats : [];

  const counts = useMemo(
    () => ({
      summary: hasContent(summary) ? 1 : 0,
      quiz: countItems(quiz),
      flashcards: countItems(flashcards),
      questions: countItems(questions),
      simplified: hasContent(simplified) ? 1 : 0,
      chats: chatList.length,
    }),
    [summary, quiz, flashcards, questions, simplified, chatList.length]
  );

  const totalExports = counts.summary + counts.quiz + counts.flashcards + counts.questions + counts.simplified + counts.chats;

  const showToast = (type, message) => {
    setToast({ type, message });
    window.clearTimeout(showToast._t);
    showToast._t = window.setTimeout(() => setToast(null), 2200);
  };

  const run = async (key, fn, successMsg, errorMsg) => {
    if (!fn || busyKey) return;
    try {
      setBusyKey(key);
      await Promise.resolve(fn());
      showToast("success", successMsg);
    } catch (e) {
      showToast("error", errorMsg || "Export failed");
    } finally {
      setBusyKey("");
    }
  };

  const tiles = [
    {
      key: "summary",
      title: "Summary",
      description: counts.summary ? "AI summary ready for download." : "No Summary Generated",
      icon: FileText,
      available: !!counts.summary,
      loading: busyKey === "summary",
      onClick: () => run("summary", onExportSummary, "Summary Downloaded", "Summary export failed"),
    },
    {
      key: "quiz",
      title: "Quiz",
      description: counts.quiz ? `${counts.quiz} question${counts.quiz === 1 ? "" : "s"} available.` : "No Quiz Generated",
      icon: ListChecks,
      available: !!counts.quiz,
      loading: busyKey === "quiz",
      onClick: () => run("quiz", onExportQuiz, "Quiz Downloaded", "Quiz export failed"),
    },
    {
      key: "flashcards",
      title: "Flashcards",
      description: counts.flashcards ? `${counts.flashcards} flashcard${counts.flashcards === 1 ? "" : "s"} available.` : "No Flashcards Generated",
      icon: Sparkles,
      available: !!counts.flashcards,
      loading: busyKey === "flashcards",
      onClick: () => run("flashcards", onExportFlashcards, "Flashcards Downloaded", "Flashcards export failed"),
    },
    {
      key: "questions",
      title: "Questions",
      description: counts.questions ? `${counts.questions} important question${counts.questions === 1 ? "" : "s"} ready.` : "No Questions Generated",
      icon: Lightbulb,
      available: !!counts.questions,
      loading: busyKey === "questions",
      onClick: () => run("questions", onExportQuestions, "Questions Downloaded", "Questions export failed"),
    },
    {
      key: "simplified",
      title: "Simplified Notes",
      description: counts.simplified ? "Simplified notes ready for revision." : "No Simplified Notes Generated",
      icon: Brain,
      available: !!counts.simplified,
      loading: busyKey === "simplified",
      onClick: () => run("simplified", onExportSimplifiedNotes, "Simplified Notes Downloaded", "Simplified notes export failed"),
    },
  ];

  const handleStudyPack = async () => {
    if (!onExportStudyPack || busyKey === "studyPack") return;
    try {
      setBusyKey("studyPack");
      await Promise.resolve(onExportStudyPack());
      showToast("success", "Study Pack Downloaded");
    } catch (e) {
      showToast("error", "Study pack export failed");
    } finally {
      setBusyKey("");
    }
  };

  return (
    <div className="space-y-4 text-slate-900 dark:text-slate-100">
      {toast ? (
        <div
          role="status"
          aria-live="polite"
          className={`rounded-2xl px-4 py-3 text-sm shadow-sm ${
            toast.type === "success"
              ? "border border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
              : "border border-red-500/20 bg-red-500/10 text-red-700 dark:text-red-300"
          }`}
        >
          {toast.message}
        </div>
      ) : null}

      <Panel
        title="📄 AI Export Center"
        subtitle="Download and organize your AI-generated study materials."
        className="overflow-hidden"
      >
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap gap-2 text-xs text-slate-500 dark:text-slate-400">
            <span className="rounded-full border border-slate-200/70 dark:border-slate-800/70 bg-white/60 dark:bg-slate-900/60 px-3 py-1">
              ✓ Summary Ready
            </span>
            <span className="rounded-full border border-slate-200/70 dark:border-slate-800/70 bg-white/60 dark:bg-slate-900/60 px-3 py-1">
              ✓ Quiz Ready
            </span>
            <span className="rounded-full border border-slate-200/70 dark:border-slate-800/70 bg-white/60 dark:bg-slate-900/60 px-3 py-1">
              ✓ Flashcards Ready
            </span>
            <span className="rounded-full border border-slate-200/70 dark:border-slate-800/70 bg-white/60 dark:bg-slate-900/60 px-3 py-1">
              ✓ Questions Ready
            </span>
            <span className="rounded-full border border-slate-200/70 dark:border-slate-800/70 bg-white/60 dark:bg-slate-900/60 px-3 py-1">
              ✓ Simplified Notes Ready
            </span>
            <span className="rounded-full border border-slate-200/70 dark:border-slate-800/70 bg-white/60 dark:bg-slate-900/60 px-3 py-1">
              ✓ {counts.chats} Chats Available
            </span>
          </div>

          <div className="rounded-2xl border border-indigo-500/15 bg-gradient-to-br from-indigo-500/10 via-violet-500/10 to-fuchsia-500/10 p-4 shadow-sm">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/70 dark:bg-slate-900/70 text-indigo-600 dark:text-indigo-300 shadow-sm">
                    <FileDown size={18} />
                  </div>
                  <div>
                    <h3 className="text-base font-semibold">📚 Complete Study Pack</h3>
                    <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                      Export Summary, Quiz, Flashcards, Questions, Simplified Notes and all study materials in one PDF.
                    </p>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={handleStudyPack}
                disabled={!onExportStudyPack || busyKey === "studyPack"}
                className="inline-flex h-12 w-full sm:w-auto items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-indigo-600 via-violet-600 to-fuchsia-600 px-5 text-sm font-semibold text-white shadow-lg transition-all duration-300 hover:scale-[1.02] hover:-translate-y-1 hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/40 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {busyKey === "studyPack" ? <Loader2 size={16} className="animate-spin" /> : <FileDown size={16} />}
                Download Complete Study Pack PDF
              </button>
            </div>
          </div>
        </div>
      </Panel>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
        {tiles.map((tile) => (
          <ExportCard
            key={tile.key}
            title={tile.title}
            description={tile.description}
            icon={tile.icon}
            available={tile.available}
            loading={tile.loading}
            onClick={tile.onClick}
          />
        ))}
      </div>

      <Panel title="💬 Chat Exports" subtitle="Download individual chat conversations as PDF">
        {counts.chats ? (
          <div className="space-y-2">
            {chatList.map((chat) => {
              const title = safeText(chat?.title || chat?.name || "Untitled Chat");
              const messageCount = Array.isArray(chat?.messages)
                ? chat.messages.length
                : Number(chat?.messageCount ?? chat?.totalMessages ?? 0) || 0;
              const updated = chat?.updatedAt || chat?.lastUpdated || chat?.createdAt || null;
              const canExport = !!chat?._id && typeof onExportChat === "function";
              const loading = busyKey === `chat-${chat?._id}`;

              return (
                <div
                  key={chat?._id || title}
                  className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200/70 dark:border-slate-800/70 bg-white/75 dark:bg-slate-950/60 px-3 py-3 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:scale-[1.01] hover:shadow-md"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-slate-900 dark:text-slate-100">{title}</p>
                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                      {messageCount} Message{messageCount === 1 ? "" : "s"}
                      {updated ? ` • ${formatDate(updated)}` : ""}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      if (!canExport) return;
                      run(
                        `chat-${chat._id}`,
                        () => onExportChat(chat._id, chat.title || title),
                        "Chat Export Downloaded",
                        "Chat export failed"
                      );
                    }}
                    disabled={!canExport || loading}
                    className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-2xl bg-slate-100/80 px-3 text-sm font-medium text-slate-700 transition-all duration-300 hover:bg-slate-200 hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-slate-800/80 dark:text-slate-200 dark:hover:bg-slate-700"
                    aria-label={`Download PDF for ${title}`}
                  >
                    {loading ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
                    PDF
                  </button>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-slate-300/70 dark:border-slate-700/70 bg-slate-50/50 dark:bg-slate-950/30 px-4 py-5 text-sm text-slate-500 dark:text-slate-400">
            No chat exports available.
          </div>
        )}
      </Panel>
    </div>
  );
});