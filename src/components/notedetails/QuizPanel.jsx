/**
 * src/components/notedetails/QuizPanel.jsx
 *
 * Props: questions={Array}
 *   Each item: { question: string, options: string[], answer: string }
 *
 * Features:
 *  - Click an option to reveal correct/incorrect
 *  - Score counter
 *  - Reset button
 *  - Null-safe: never crashes on missing fields
 */

import React, { useState, useEffect } from "react";
import { CheckCircle2, XCircle, RotateCcw, Trophy } from "lucide-react";

function cn(...c) { return c.filter(Boolean).join(" "); }
export default function QuizPanel({
  questions,
  noteId,
}) {
  // Null-safe: always work with an array
  const items = Array.isArray(questions) ? questions.filter(Boolean) : [];

  const [selected, setSelected] = useState(() => {
    try {
      return JSON.parse(
        localStorage.getItem(
          `quiz-selected-${noteId}`
        )
      ) || {};
    } catch {
      return {};
    }
  });

  const [revealed, setRevealed] = useState(() => {
    try {
      return JSON.parse(
        localStorage.getItem(
          `quiz-revealed-${noteId}`
        )
      ) || {};
    } catch {
      return {};
    }
  });

  useEffect(() => {
    localStorage.setItem(
      `quiz-selected-${noteId}`,
      JSON.stringify(selected)
    );
  }, [selected, noteId]);

  useEffect(() => {
    localStorage.setItem(
      `quiz-revealed-${noteId}`,
      JSON.stringify(revealed)
    );
  }, [revealed, noteId]);
  if (items.length === 0) {
    return (
      <p className="text-sm text-slate-500 dark:text-slate-400">No questions available.</p>
    );
  }

  function handleSelect(qi, option) {
    if (revealed[qi]) return;            // already answered
    setSelected((prev) => ({ ...prev, [qi]: option }));
    setRevealed((prev) => ({ ...prev, [qi]: true }));
  }

  function reset() {
    setSelected({});
    setRevealed({});

    localStorage.removeItem(
      `quiz-selected-${noteId}`
    );

    localStorage.removeItem(
      `quiz-revealed-${noteId}`
    );
  }

  const answeredCount = Object.keys(revealed).length;
  const correctCount = items.filter((q, i) =>
    revealed[i] && selected[i] === (q.answer || q.correctAnswer || q.options?.[0])
  ).length;

  return (
    <div className="space-y-5">
      {/* Score bar */}
      {answeredCount > 0 && (
        <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-700 dark:bg-slate-900/40">
          <div className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-300">
            <Trophy size={15} className="text-yellow-500" />
            {correctCount} / {answeredCount} correct
          </div>
          <button onClick={reset}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
            <RotateCcw size={12} /> Reset
          </button>
        </div>
      )}

      {/* Questions */}
      {items.map((q, qi) => {
        // Null-safe field access
        const questionText = q?.question || q?.text || `Question ${qi + 1}`;
        const options = Array.isArray(q?.options) ? q.options : [];
        const correctAns = q?.answer || q?.correctAnswer || "";
        const isRevealed = Boolean(revealed[qi]);
        const userAnswer = selected[qi];

        return (
          <div key={qi} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900/60">
            <p className="mb-3 text-sm font-medium text-slate-800 dark:text-slate-200">
              <span className="mr-2 inline-flex h-6 w-6 items-center justify-center rounded-full bg-purple-100 text-xs font-bold text-purple-700 dark:bg-purple-500/20 dark:text-purple-300">
                {qi + 1}
              </span>
              {questionText}
            </p>

            <div className="space-y-2">
              {options.map((opt, oi) => {
                const isCorrect = opt === correctAns;
                const isSelected = opt === userAnswer;

                let optStyle = "border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700";
                if (isRevealed && isCorrect)
                  optStyle = "border-emerald-300 bg-emerald-50 text-emerald-800 dark:border-emerald-500/40 dark:bg-emerald-500/10 dark:text-emerald-300";
                else if (isRevealed && isSelected && !isCorrect)
                  optStyle = "border-rose-300 bg-rose-50 text-rose-800 dark:border-rose-500/40 dark:bg-rose-500/10 dark:text-rose-300";

                return (
                  <button key={oi} onClick={() => handleSelect(qi, opt)}
                    className={cn("flex w-full items-center gap-3 rounded-xl border px-4 py-2.5 text-left text-sm transition-all", optStyle,
                      !isRevealed && "cursor-pointer", isRevealed && "cursor-default")}>
                    <span className="shrink-0 font-medium">{["A", "B", "C", "D"][oi] || oi + 1}.</span>
                    <span className="flex-1">{opt}</span>
                    {isRevealed && isCorrect && <CheckCircle2 size={15} className="shrink-0 text-emerald-600 dark:text-emerald-400" />}
                    {isRevealed && isSelected && !isCorrect && <XCircle size={15} className="shrink-0 text-rose-600 dark:text-rose-400" />}
                  </button>
                );
              })}
            </div>

            {isRevealed && (
              <p className="mt-2 text-xs text-slate-400 dark:text-slate-500">
                Correct answer:
                <span className="font-medium text-emerald-600 dark:text-emerald-400">
                  {correctAns}
                </span>
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}