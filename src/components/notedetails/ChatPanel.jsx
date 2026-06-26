import React, {
  useEffect,
  useMemo,
  useRef,
  useState,
  memo,
  useCallback,
  useLayoutEffect,
} from "react";
import {
  Bot,
  Send,
  User,
  Trash2,
  MessageSquare,
  Copy,
  RefreshCw,
  ThumbsUp,
  ThumbsDown,
  Search,
  Maximize2,
  Minimize2,
  Plus,
  X,
  Check,
  AlertCircle,
  Menu,
  PanelLeftClose,
  PanelLeft,
  Edit3,
  RotateCcw,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

const formatTime = (value) => {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const formatDateKey = (value) => {
  if (!value) return "Other";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "Other";
  const now = new Date();
  const diffDays = Math.floor(
    (new Date(now.getFullYear(), now.getMonth(), now.getDate()) -
      new Date(d.getFullYear(), d.getMonth(), d.getDate())) / 86400000
  );
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays <= 7) return "This Week";
  if (diffDays <= 30) return "This Month";
  return "Earlier";
};

const safeText = (v = "") => String(v ?? "");

const copyToClipboard = async (text) => {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }
  const ta = document.createElement("textarea");
  ta.value = text;
  ta.style.position = "fixed";
  ta.style.left = "-9999px";
  document.body.appendChild(ta);
  ta.focus();
  ta.select();
  document.execCommand("copy");
  document.body.removeChild(ta);
};

function useBodyLock(locked) {
  useLayoutEffect(() => {
    if (!locked) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [locked]);
}

const Toast = ({ toast, onClose }) => {
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(onClose, 2200);
    return () => clearTimeout(t);
  }, [toast, onClose]);

  if (!toast) return null;

  return (
    <div
      className={`fixed bottom-5 right-5 z-[9999] flex items-center gap-2.5 rounded-2xl px-4 py-3 text-sm text-white shadow-2xl ${
        toast.type === "error" ? "bg-red-600" : "bg-slate-900"
      }`}
    >
      {toast.type === "error" ? <AlertCircle size={15} /> : <Check size={15} />}
      <span>{toast.message}</span>
      <button onClick={onClose} className="ml-1 opacity-70 hover:opacity-100">
        <X size={13} />
      </button>
    </div>
  );
};

const Modal = ({ open, title, onClose, children, maxWidth = "max-w-md" }) => {
  useBodyLock(open);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e) => {
      if (e.key === "Escape") onClose?.();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className={`w-full ${maxWidth} rounded-3xl border border-slate-200 bg-white p-5 shadow-2xl dark:border-slate-800 dark:bg-slate-950`}
        onClick={(e) => e.stopPropagation()}
      >
        {title ? (
          <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
            {title}
          </h3>
        ) : null}
        <div className={title ? "mt-4" : ""}>{children}</div>
      </div>
    </div>
  );
};

const ActionBtn = ({
  children,
  title,
  onClick,
  disabled,
  active,
  activeClass = "",
  className = "",
}) => (
  <button
    title={title}
    onClick={onClick}
    disabled={disabled}
    className={`flex h-7 w-7 items-center justify-center rounded-lg transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
      active
        ? activeClass
        : "text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
    } ${className}`}
  >
    {children}
  </button>
);

// ─── Inline editable user message ────────────────────────────────────────────
const InlineEditBox = memo(function InlineEditBox({ value, onChange, onSave, onCancel, saving }) {
  const ref = useRef(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 240)}px`;
  }, [value]);

  useEffect(() => {
    ref.current?.focus();
    // place cursor at end
    const el = ref.current;
    if (el) {
      el.selectionStart = el.selectionEnd = el.value.length;
    }
  }, []);

  const handleKey = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (value.trim() && !saving) onSave();
    }
    if (e.key === "Escape") onCancel();
  };

  return (
    <div className="flex w-full flex-col gap-2">
      <textarea
        ref={ref}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKey}
        rows={1}
        className="w-full resize-none rounded-xl border border-indigo-300 bg-indigo-50 px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-indigo-700 dark:bg-indigo-950/40 dark:text-slate-100"
        style={{ maxHeight: 240 }}
      />
      <div className="flex items-center justify-end gap-2">
        <button
          onClick={onCancel}
          disabled={saving}
          className="rounded-xl border border-slate-200 px-3.5 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-slate-50 disabled:opacity-40 dark:border-slate-700 dark:text-slate-300"
        >
          Cancel
        </button>
        <button
          onClick={onSave}
          disabled={!value.trim() || saving}
          className="flex items-center gap-1.5 rounded-xl bg-indigo-600 px-3.5 py-1.5 text-xs font-medium text-white shadow-sm transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-40 active:scale-95"
        >
          {saving ? (
            <>
              <div className="h-3 w-3 animate-spin rounded-full border-2 border-white border-t-transparent" />
              Sending…
            </>
          ) : (
            <>
              <Send size={11} />
              Send
            </>
          )}
        </button>
      </div>
    </div>
  );
});

// ─── Single message row ───────────────────────────────────────────────────────
const MessageItem = memo(function MessageItem({
  msg,
  onCopy,
  onRegenerate,
  onLike,
  onDislike,
  feedbackState,
  regenLoading,
  copiedId,
  onCopyId,
  // inline-edit props
  isEditing,
  editValue,
  onEditStart,
  onEditChange,
  onEditSave,
  onEditCancel,
  editSaving,
}) {
  const isUser = msg.role === "user";
  const time = formatTime(msg.timestamp || msg.createdAt);
  const content = safeText(msg.content);
  const msgId = msg.id || msg._id;

  return (
    <div className={`group flex w-full gap-3 ${isUser ? "flex-row-reverse" : "flex-row"}`}>
      <div className="mt-1 shrink-0">
        {isUser ? (
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-600 text-white">
            <User size={14} />
          </div>
        ) : (
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-100 dark:bg-indigo-500/15">
            <Bot size={14} className="text-indigo-600 dark:text-indigo-400" />
          </div>
        )}
      </div>

      <div
        className={`flex min-w-0 max-w-[95%] flex-col gap-1.5 sm:max-w-[85%] ${
          isUser ? "items-end" : "items-start"
        }`}
      >
        {/* User message: either inline editor or bubble */}
        {isUser && isEditing ? (
          <div className="w-full">
            <InlineEditBox
              value={editValue}
              onChange={onEditChange}
              onSave={onEditSave}
              onCancel={onEditCancel}
              saving={editSaving}
            />
          </div>
        ) : (
          <div
            className={`rounded-2xl px-4 py-3 text-sm leading-relaxed ${
              isUser
                ? "rounded-tr-sm bg-indigo-600 text-white"
                : "rounded-tl-sm border border-slate-200 bg-white text-slate-800 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
            }`}
          >
            {isUser ? (
              <div className="whitespace-pre-wrap break-words">{content}</div>
            ) : (
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                  p: ({ children }) => (
                    <p className="mb-3 whitespace-pre-wrap break-words last:mb-0">{children}</p>
                  ),
                  h1: ({ children }) => <h1 className="mb-2 text-lg font-bold">{children}</h1>,
                  h2: ({ children }) => <h2 className="mb-2 text-base font-semibold">{children}</h2>,
                  h3: ({ children }) => <h3 className="mb-1 text-sm font-semibold">{children}</h3>,
                  ul: ({ children }) => <ul className="mb-3 list-disc space-y-1 pl-5">{children}</ul>,
                  ol: ({ children }) => <ol className="mb-3 list-decimal space-y-1 pl-5">{children}</ol>,
                  li: ({ children }) => <li className="break-words">{children}</li>,
                  a: ({ href, children }) => (
                    <a href={href} target="_blank" rel="noreferrer" className="text-indigo-500 underline">
                      {children}
                    </a>
                  ),
                  table: ({ children }) => (
                    <div className="my-3 overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700">
                      <table className="w-full border-collapse text-sm">{children}</table>
                    </div>
                  ),
                  th: ({ children }) => (
                    <th className="border-b border-slate-200 bg-slate-50 px-3 py-2 text-left dark:border-slate-700 dark:bg-slate-800">
                      {children}
                    </th>
                  ),
                  td: ({ children }) => (
                    <td className="border-b border-slate-100 px-3 py-2 align-top last:border-0 dark:border-slate-800">
                      {children}
                    </td>
                  ),
                  code: ({ inline, children, className, ...props }) =>
                    inline ? (
                      <code
                        className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[12px] dark:bg-slate-800"
                        {...props}
                      >
                        {children}
                      </code>
                    ) : (
                      <pre className="my-3 overflow-x-auto rounded-xl bg-slate-950 p-4 text-xs leading-6 text-slate-100">
                        <code className={className} {...props}>
                          {children}
                        </code>
                      </pre>
                    ),
                }}
              >
                {content}
              </ReactMarkdown>
            )}
          </div>
        )}

        {/* Action row — hidden while editing */}
        {!isEditing && (
          <div className={`flex flex-wrap items-center gap-1 ${isUser ? "flex-row-reverse" : "flex-row"}`}>
            {time && <span className="px-1 text-[11px] text-slate-400">{time}</span>}

            {isUser && onEditStart && (
              <ActionBtn title="Edit" onClick={onEditStart} activeClass="text-indigo-600">
                <Edit3 size={13} />
              </ActionBtn>
            )}

            {!isUser && (
              <div className="flex items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
                <ActionBtn
                  title={copiedId === msgId ? "Copied!" : "Copy"}
                  onClick={async () => {
                    await onCopy(content);
                    onCopyId(msgId);
                  }}
                  active={copiedId === msgId}
                  activeClass="text-emerald-500"
                >
                  {copiedId === msgId ? <Check size={13} /> : <Copy size={13} />}
                </ActionBtn>

                <ActionBtn title="Regenerate" onClick={onRegenerate} disabled={regenLoading}>
                  <RefreshCw size={13} className={regenLoading ? "animate-spin" : ""} />
                </ActionBtn>

                <ActionBtn
                  title="Helpful"
                  onClick={onLike}
                  disabled={!!feedbackState}
                  active={feedbackState === "like"}
                  activeClass="text-emerald-500 bg-emerald-50 dark:bg-emerald-950/40"
                >
                  <ThumbsUp size={13} />
                </ActionBtn>

                <ActionBtn
                  title="Not helpful"
                  onClick={onDislike}
                  disabled={!!feedbackState}
                  active={feedbackState === "dislike"}
                  activeClass="text-red-500 bg-red-50 dark:bg-red-950/40"
                >
                  <ThumbsDown size={13} />
                </ActionBtn>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
});

const TypingIndicator = () => (
  <div className="flex gap-3">
    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-indigo-100 dark:bg-indigo-500/15">
      <Bot size={14} className="text-indigo-600 dark:text-indigo-400" />
    </div>
    <div className="rounded-2xl rounded-tl-sm border border-slate-200 bg-white px-4 py-3 dark:border-slate-700 dark:bg-slate-900">
      <div className="flex items-center gap-1.5">
        {[0, 150, 300].map((delay, i) => (
          <span
            key={i}
            className="h-2 w-2 animate-bounce rounded-full bg-indigo-500"
            style={{ animationDelay: `${delay}ms` }}
          />
        ))}
        <span className="ml-2 text-xs text-slate-400">Thinking…</span>
      </div>
    </div>
  </div>
);

const EmptyState = ({ onSuggest }) => {
  const suggestions = [
    "Summarize the key points",
    "Give me 3 practice questions",
    "Explain this in simple terms",
    "What are the most important concepts?",
  ];

  return (
    <div className="flex flex-1 flex-col items-center justify-center px-6 py-12 text-center">
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-50 dark:bg-indigo-500/10">
        <Bot size={26} className="text-indigo-500" />
      </div>
      <h2 className="text-base font-semibold text-slate-800 dark:text-slate-100">How can I help?</h2>
      <p className="mt-1.5 max-w-xs text-sm text-slate-500">
        Ask anything about your notes or try one of these:
      </p>
      <div className="mt-5 flex flex-wrap justify-center gap-2">
        {suggestions.map((s) => (
          <button
            key={s}
            onClick={() => onSuggest?.(s)}
            className="rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-medium text-slate-600 transition hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-indigo-700 dark:hover:bg-indigo-950/40"
          >
            {s}
          </button>
        ))}
      </div>
    </div>
  );
};

const HeaderBtn = ({ children, onClick, title }) => (
  <button
    onClick={onClick}
    title={title}
    className="flex items-center gap-1.5 rounded-xl border border-slate-200 px-2.5 py-1.5 text-sm text-slate-600 transition-colors hover:bg-slate-50 dark:border-slate-800 dark:text-slate-400 dark:hover:bg-slate-900"
  >
    {children}
  </button>
);

export default function ChatPanel({
  chats = [],
  selectedChat,
  onSelectChat,
  onNewChat,
  onDeleteChat,
  onRenameChat,
  onRefreshChat,
  onChatFeedback,
  messages = [],
  input = "",
  onInputChange,
  onSend,
  onEditMessage,   // (chatId, msgId, newText, meta) → Promise — caller must update messages + regenerate
  loading = false,
  historyLoading = false,
  error,
  chatEndRef,
  noteTitle = "",
  activeTab = "chat",
  refreshChats,
}) {
  const [fullscreen, setFullscreen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [toast, setToast] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [searchChats, setSearchChats] = useState("");
  const [regenLoading, setRegenLoading] = useState(false);
  const [feedback, setFeedback] = useState({});
  const [copiedId, setCopiedId] = useState(null);
  const [refreshingChat, setRefreshingChat] = useState(false);
  const [renameOpen, setRenameOpen] = useState(false);
  const [renameValue, setRenameValue] = useState("");
  const [renameTarget, setRenameTarget] = useState(null);

  // ── Inline edit state ──────────────────────────────────────────────────────
  const [editingMsgId, setEditingMsgId] = useState(null);
  const [editingValue, setEditingValue] = useState("");
  const [editSaving, setEditSaving] = useState(false);

  const textareaRef = useRef(null);
  const messagesEndRef = useRef(null);

  const isChatTabActive = activeTab === "chat" || activeTab === "chat-fullscreen";
  const isFullscreen = fullscreen || activeTab === "chat-fullscreen";
  const currentMessages = messages || [];
  const title = selectedChat?.title || noteTitle || "New Chat";

  const pushToast = useCallback((message, type = "success") => setToast({ message, type }), []);
  const handleCopyId = useCallback((id) => {
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1200);
  }, []);

  const filteredChats = useMemo(() => {
    const q = searchChats.trim().toLowerCase();
    const sorted = [...chats].sort(
      (a, b) => new Date(b.updatedAt || b.createdAt || 0) - new Date(a.updatedAt || a.createdAt || 0)
    );
    if (!q) return sorted;
    return sorted.filter((c) => {
      const titleMatch = safeText(c.title).toLowerCase().includes(q);
      const lastMessage = safeText(c.lastMessage || c.preview || c.messages?.[c.messages.length - 1]?.content || "");
      return titleMatch || lastMessage.toLowerCase().includes(q);
    });
  }, [chats, searchChats]);

  const groupedChats = useMemo(() => {
    const g = {};
    filteredChats.forEach((c) => {
      const key = formatDateKey(c.updatedAt || c.createdAt);
      (g[key] = g[key] || []).push(c);
    });
    return g;
  }, [filteredChats]);

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 180)}px`;
  }, [input]);

  useEffect(() => {
    if (!loading && !historyLoading) {
      const ref = chatEndRef || messagesEndRef;
      ref?.current?.scrollIntoView({ behavior: "smooth", block: "end" });
    }
  }, [currentMessages.length, loading, historyLoading, chatEndRef]);

  const handleSelectChat = useCallback(
    (chat) => {
      onSelectChat?.(chat);
      setMobileSidebarOpen(false);
      setEditingMsgId(null);
    },
    [onSelectChat]
  );

  const handleNewChat = useCallback(async () => {
    const created = await onNewChat?.();
    if (created?.chat) onSelectChat?.(created.chat);
    setMobileSidebarOpen(false);
    refreshChats?.();
  }, [onNewChat, onSelectChat, refreshChats]);

  const handleRefreshChat = useCallback(
    async (chatArg = selectedChat) => {
      if (!chatArg || refreshingChat) return;
      setRefreshingChat(true);
      try {
        await onRefreshChat?.(chatArg);
        await refreshChats?.();
        pushToast("Chat refreshed");
      } catch {
        pushToast("Could not refresh chat", "error");
      } finally {
        setRefreshingChat(false);
      }
    },
    [onRefreshChat, selectedChat, refreshChats, pushToast, refreshingChat]
  );

  const requestDeleteChat = useCallback((chat) => setDeleteTarget(chat), []);

  const confirmDeleteChat = useCallback(async () => {
    if (!deleteTarget) return;
    try {
      await onDeleteChat?.(deleteTarget._id);
      setDeleteTarget(null);
      pushToast("Chat deleted");
      await refreshChats?.();
    } catch {
      pushToast("Could not delete chat", "error");
    }
  }, [deleteTarget, onDeleteChat, refreshChats, pushToast]);

  const requestRenameChat = useCallback((chat) => {
    setRenameTarget(chat);
    setRenameValue(chat?.title || "");
    setRenameOpen(true);
  }, []);

  const confirmRenameChat = useCallback(async () => {
    if (!renameTarget || !renameValue.trim()) return;
    try {
      await onRenameChat?.(renameTarget._id, renameValue.trim());
      setRenameOpen(false);
      setRenameTarget(null);
      setRenameValue("");
      await refreshChats?.();
      pushToast("Chat renamed");
    } catch {
      pushToast("Could not rename chat", "error");
    }
  }, [renameTarget, renameValue, onRenameChat, refreshChats, pushToast]);

  const handleLike = useCallback(
    async (id) => {
      if (feedback[id]) return;
      setFeedback((p) => ({ ...p, [id]: "like" }));
      try {
        await onChatFeedback?.(selectedChat?._id, id, "like");
        pushToast("Feedback saved");
      } catch {
        setFeedback((p) => { const next = { ...p }; delete next[id]; return next; });
        pushToast("Could not save feedback", "error");
      }
    },
    [feedback, onChatFeedback, selectedChat, pushToast]
  );

  const handleDislike = useCallback(
    async (id) => {
      if (feedback[id]) return;
      setFeedback((p) => ({ ...p, [id]: "dislike" }));
      try {
        await onChatFeedback?.(selectedChat?._id, id, "dislike");
        pushToast("Feedback saved");
      } catch {
        setFeedback((p) => { const next = { ...p }; delete next[id]; return next; });
        pushToast("Could not save feedback", "error");
      }
    },
    [feedback, onChatFeedback, selectedChat, pushToast]
  );

  const handleRegenerate = useCallback(async () => {
    if (regenLoading) return;
    const lastUser = [...currentMessages].reverse().find((m) => m.role === "user");
    if (!lastUser) return pushToast("No message to regenerate from", "error");
    setRegenLoading(true);
    try {
      await onEditMessage?.(selectedChat?._id, lastUser.id || lastUser._id, lastUser.content);
    } finally {
      setRegenLoading(false);
    }
  }, [regenLoading, currentMessages, onEditMessage, selectedChat, pushToast]);

  // ── Inline edit handlers ───────────────────────────────────────────────────
  const handleEditStart = useCallback((msg) => {
    setEditingMsgId(msg.id || msg._id);
    setEditingValue(msg.content || "");
  }, []);

  const handleEditCancel = useCallback(() => {
    setEditingMsgId(null);
    setEditingValue("");
  }, []);

  /**
   * On Save:
   * 1. Optimistically update the edited message in local state (via onEditMessage meta).
   * 2. Strip all messages after the edited message index.
   * 3. Call onEditMessage — the parent is responsible for:
   *    a. Patching the message on the server.
   *    b. Deleting all subsequent messages.
   *    c. Calling the AI and appending the new assistant response.
   *    d. Updating `messages` prop so the UI reflects the new state.
   */
  const handleEditSave = useCallback(async () => {
    if (!editingMsgId || !editingValue.trim() || editSaving) return;

    const idx = currentMessages.findIndex((m) => (m.id || m._id) === editingMsgId);
    if (idx < 0) return;

    const newText = editingValue.trim();

    // Build the truncated message list for optimistic UI:
    // keep messages up to and including the edited one (with new content)
    const previousMessages = currentMessages.slice(0, idx + 1).map((m) =>
      (m.id || m._id) === editingMsgId ? { ...m, content: newText } : m
    );

    setEditSaving(true);
    // Close the editor immediately so the updated bubble shows
    setEditingMsgId(null);
    setEditingValue("");

    try {
      await onEditMessage?.(selectedChat?._id, editingMsgId, newText, {
        truncateAfterIndex: idx,          // hint: drop everything after this index
        previousMessages,                  // optimistic slice caller can use
        regenerate: true,                  // flag: caller must fire a new AI completion
      });
    } catch {
      pushToast("Could not send edit", "error");
    } finally {
      setEditSaving(false);
    }
  }, [editingMsgId, editingValue, editSaving, currentMessages, onEditMessage, selectedChat, pushToast]);

  const handleKeyDown = useCallback(
    (e) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        if (input?.trim() && !loading) onSend?.();
      }
    },
    [input, loading, onSend]
  );

  if (!isChatTabActive) return null;

  const hasMessages = currentMessages.length > 0;
  // Treat as "loading" if either global loading or an edit is saving
  const isResponding = loading || editSaving;

  return (
    <>
      {mobileSidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm lg:hidden"
          onClick={() => setMobileSidebarOpen(false)}
        />
      )}

      <div
        className={`flex overflow-hidden bg-white transition-all duration-300 dark:bg-slate-950 ${
          isFullscreen
            ? "fixed inset-0 z-40 rounded-none"
            : "h-[calc(100vh-200px)] min-h-[500px] w-full rounded-2xl border border-slate-200 shadow-sm dark:border-slate-800"
        }`}
      >
        {/* ── Sidebar ────────────────────────────────────────────────────── */}
        <aside
          className={`flex shrink-0 flex-col border-r border-slate-200 bg-slate-50 transition-all duration-300 dark:border-slate-800 dark:bg-[#1a1b1e]
          ${sidebarOpen ? "lg:w-[300px]" : "lg:w-0 lg:overflow-hidden lg:border-r-0"}
          max-lg:fixed max-lg:inset-y-0 max-lg:left-0 max-lg:z-50 max-lg:w-full md:max-lg:w-[320px] max-lg:shadow-2xl
          ${mobileSidebarOpen ? "max-lg:translate-x-0" : "max-lg:-translate-x-full"}`}
        >
          <div className="p-3">
            <button
              onClick={handleNewChat}
              className="flex w-full items-center gap-2.5 rounded-xl bg-indigo-600 px-3 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-indigo-700 active:scale-95"
            >
              <Plus size={16} />
              New Chat
            </button>
          </div>

          <div className="px-3 pb-3">
            <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-slate-400 focus-within:border-indigo-400 focus-within:ring-2 focus-within:ring-indigo-500/20 dark:border-slate-700 dark:bg-slate-900">
              <Search size={13} />
              <input
                value={searchChats}
                onChange={(e) => setSearchChats(e.target.value)}
                placeholder="Search chats…"
                className="w-full bg-transparent text-xs text-slate-700 outline-none placeholder:text-slate-400 dark:text-slate-200"
              />
              {searchChats && (
                <button onClick={() => setSearchChats("")}>
                  <X size={13} />
                </button>
              )}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-2 pb-4">
            {Object.keys(groupedChats).length === 0 ? (
              <div className="mt-4 rounded-xl border border-dashed border-slate-200 px-3 py-8 text-center dark:border-slate-700">
                <MessageSquare size={20} className="mx-auto mb-2 text-slate-300 dark:text-slate-600" />
                <p className="text-xs text-slate-500">{searchChats ? "No results" : "No chats yet — start one!"}</p>
              </div>
            ) : (
              Object.entries(groupedChats).map(([group, groupChats]) => (
                <div key={group} className="mb-4">
                  <p className="mb-1.5 px-2 text-[10px] font-semibold uppercase tracking-widest text-slate-400 dark:text-slate-500">
                    {group}
                  </p>
                  <div className="space-y-0.5">
                    {groupChats.map((chat) => {
                      const active = selectedChat?._id === chat._id;
                      return (
                        <div key={chat._id} className="group relative">
                          <button
                            onClick={() => handleSelectChat(chat)}
                            className={`flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 pr-20 text-left transition-colors ${
                              active
                                ? "bg-indigo-50 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300"
                                : "text-slate-700 hover:bg-white dark:text-slate-300 dark:hover:bg-slate-800/60"
                            }`}
                          >
                            <MessageSquare
                              size={14}
                              className={active ? "text-indigo-500 shrink-0" : "shrink-0 text-slate-400"}
                            />
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-xs font-medium leading-snug">
                                {chat.title || "Untitled Chat"}
                              </p>
                              <p className="mt-0.5 truncate text-[11px] leading-tight text-slate-400 dark:text-slate-500">
                                {chat.lastMessage || chat.preview || "No messages yet"}
                              </p>
                            </div>
                          </button>

                          <div className="absolute right-1.5 top-1/2 hidden -translate-y-1/2 items-center gap-0.5 rounded-lg bg-white/90 shadow-sm backdrop-blur dark:bg-slate-900/90 group-hover:flex">
                            {onRefreshChat && (
                              <button
                                onClick={(e) => { e.stopPropagation(); handleRefreshChat(chat); }}
                                className="rounded-lg p-1.5 text-slate-400 hover:text-indigo-600"
                                title="Refresh chat"
                              >
                                <RotateCcw size={11} />
                              </button>
                            )}
                            {onRenameChat && (
                              <button
                                onClick={(e) => { e.stopPropagation(); requestRenameChat(chat); }}
                                className="rounded-lg p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                                title="Rename"
                              >
                                <Edit3 size={11} />
                              </button>
                            )}
                            {onDeleteChat && (
                              <button
                                onClick={(e) => { e.stopPropagation(); requestDeleteChat(chat); }}
                                className="rounded-lg p-1.5 text-slate-400 hover:text-red-500"
                                title="Delete"
                              >
                                <Trash2 size={11} />
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))
            )}
          </div>
        </aside>

        {/* ── Main panel ─────────────────────────────────────────────────── */}
        <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
          <header className="flex items-center gap-2 border-b border-slate-200 bg-white/95 px-3 py-3 backdrop-blur dark:border-slate-800 dark:bg-slate-950/95">
            <button
              onClick={() => setMobileSidebarOpen(true)}
              className="flex h-8 w-8 items-center justify-center rounded-xl text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 lg:hidden"
            >
              <Menu size={17} />
            </button>

            <button
              onClick={() => setSidebarOpen((v) => !v)}
              className="hidden h-8 w-8 items-center justify-center rounded-xl text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 lg:flex"
              title={sidebarOpen ? "Hide sidebar" : "Show sidebar"}
            >
              {sidebarOpen ? <PanelLeftClose size={16} /> : <PanelLeft size={16} />}
            </button>

            <h1 className="flex-1 truncate text-sm font-semibold text-slate-900 dark:text-slate-100">{title}</h1>

            <div className="flex items-center gap-1.5">
              <HeaderBtn onClick={() => handleRefreshChat(selectedChat)} title="Refresh chat">
                {refreshingChat ? <RefreshCw size={14} className="animate-spin" /> : <RotateCcw size={14} />}
                <span className="hidden text-xs sm:inline">Refresh</span>
              </HeaderBtn>
              <HeaderBtn onClick={() => setFullscreen((v) => !v)} title={isFullscreen ? "Exit fullscreen" : "Fullscreen"}>
                {isFullscreen ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
              </HeaderBtn>
            </div>
          </header>

          {error && (
            <div className="mx-4 mt-3 flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300">
              <AlertCircle size={15} className="mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="flex flex-1 flex-col overflow-hidden">
            {historyLoading ? (
              <div className="flex flex-1 items-center justify-center">
                <div className="flex flex-col items-center gap-3">
                  <div className="h-8 w-8 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent" />
                  <p className="text-sm text-slate-400">Loading conversation…</p>
                </div>
              </div>
            ) : !hasMessages ? (
              <EmptyState onSuggest={(text) => onInputChange?.(text)} />
            ) : (
              <div className="flex-1 overflow-y-auto px-3 py-6 sm:px-6">
                <div className="mx-auto flex w-full max-w-[1100px] flex-col gap-5 sm:gap-6">
                  {currentMessages.map((msg, idx) => {
                    const id = msg.id || msg._id || idx;
                    const isThisEditing = editingMsgId === id;
                    return (
                      <MessageItem
                        key={id}
                        msg={msg}
                        onCopy={async (txt) => {
                          await copyToClipboard(txt);
                          pushToast("Copied to clipboard");
                        }}
                        onCopyId={handleCopyId}
                        onRegenerate={handleRegenerate}
                        onLike={() => handleLike(id)}
                        onDislike={() => handleDislike(id)}
                        feedbackState={feedback[id]}
                        regenLoading={regenLoading}
                        copiedId={copiedId}
                        // inline-edit
                        isEditing={isThisEditing}
                        editValue={isThisEditing ? editingValue : ""}
                        onEditStart={() => handleEditStart(msg)}
                        onEditChange={setEditingValue}
                        onEditSave={handleEditSave}
                        onEditCancel={handleEditCancel}
                        editSaving={editSaving}
                      />
                    );
                  })}

                  {/* Typing indicator while AI is regenerating after an edit */}
                  {isResponding && <TypingIndicator />}

                  <div ref={chatEndRef || messagesEndRef} />
                </div>
              </div>
            )}
          </div>

          {/* ── Input bar ───────────────────────────────────────────────── */}
          <div className="sticky bottom-0 border-t border-slate-200 bg-white/95 px-3 py-4 backdrop-blur dark:border-slate-800 dark:bg-slate-950/95 sm:px-4">
            <div className="mx-auto w-full max-w-[1100px]">
              <div className="flex items-end gap-2 rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 shadow-sm transition-all focus-within:border-indigo-400 focus-within:ring-2 focus-within:ring-indigo-500/20 dark:border-slate-700 dark:bg-slate-900">
                <textarea
                  ref={textareaRef}
                  value={input}
                  onChange={(e) => onInputChange?.(e.target.value)}
                  onKeyDown={handleKeyDown}
                  rows={1}
                  placeholder={editingMsgId ? "Editing a message above…" : "Message…"}
                  disabled={!!editingMsgId}
                  className="max-h-[180px] min-w-0 flex-1 resize-none bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400 disabled:opacity-50 dark:text-slate-100"
                />
                <button
                  onClick={onSend}
                  disabled={!input?.trim() || isResponding || !!editingMsgId}
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-md transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-40 active:scale-95"
                  title="Send (Enter)"
                >
                  {isResponding ? (
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  ) : (
                    <Send size={15} />
                  )}
                </button>
              </div>
              <p className="mt-1.5 text-center text-[11px] text-slate-400">
                Press <kbd className="rounded bg-slate-100 px-1 py-0.5 font-mono text-[10px] dark:bg-slate-800">Enter</kbd> to send ·{" "}
                <kbd className="rounded bg-slate-100 px-1 py-0.5 font-mono text-[10px] dark:bg-slate-800">Shift+Enter</kbd> for new line
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Rename modal ──────────────────────────────────────────────────── */}
      <Modal open={renameOpen} title="Rename chat" onClose={() => setRenameOpen(false)} maxWidth="max-w-md">
        <input
          value={renameValue}
          onChange={(e) => setRenameValue(e.target.value)}
          autoFocus
          className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-violet-400 dark:border-slate-700 dark:bg-slate-900"
          placeholder="Chat title"
        />
        <div className="mt-4 flex gap-2">
          <button onClick={() => setRenameOpen(false)} className="flex-1 rounded-2xl border border-slate-200 px-4 py-3 text-sm font-medium dark:border-slate-700">Cancel</button>
          <button onClick={confirmRenameChat} className="flex-1 rounded-2xl bg-violet-600 px-4 py-3 text-sm font-medium text-white">Save</button>
        </div>
      </Modal>

      {/* ── Delete modal ──────────────────────────────────────────────────── */}
      <Modal open={!!deleteTarget} title="Delete chat?" onClose={() => setDeleteTarget(null)} maxWidth="max-w-sm">
        <p className="text-sm leading-6 text-slate-600 dark:text-slate-300">
          This will permanently delete the selected chat and its messages.
        </p>
        <div className="mt-4 flex gap-2">
          <button onClick={() => setDeleteTarget(null)} className="flex-1 rounded-2xl border border-slate-200 px-4 py-3 text-sm font-medium dark:border-slate-700">Cancel</button>
          <button onClick={confirmDeleteChat} className="flex-1 rounded-2xl bg-red-600 px-4 py-3 text-sm font-medium text-white">Delete</button>
        </div>
      </Modal>

      <Toast toast={toast} onClose={() => setToast(null)} />
    </>
  );
}