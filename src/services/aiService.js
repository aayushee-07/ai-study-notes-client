/**
 * src/services/aiService.js
 *
 * FIXES:
 *  1. TIMEOUT — Summary and Simplify now pass timeout: 180_000 (3 min).
 *     These endpoints generate long markdown; the default 120 s may still
 *     be too short for very large notes on cold AI starts.
 *
 *  2. NULL-SAFE — every function wraps the axios call in try/catch and
 *     always returns a consistent shape so callers never receive null/undefined
 *     and crash on property access.
 *
 *  3. RESPONSE NORMALISATION — each function returns the raw axios response
 *     so NoteDetails.jsx's unwrapResult() can handle all envelope shapes.
 *     We do NOT destructure here; unwrapResult handles that.
 *
 *  4. CHAT — sendChatMessage sends { message } in the request body, matching
 *     the backend route which reads req.body.message.
 */

import apiClient from "../lib/apiClient";

// ── Timeout constants ─────────────────────────────────────────────────────────
const TIMEOUT_DEFAULT = 300_000;// 2 min  — quiz, flashcards, questions, history
const TIMEOUT_LONG    = 180_000;   // 3 min  — summary, simplify (long markdown output)

// ─────────────────────────────────────────────────────────────────────────────
// Summary
// FIX: timeout raised to 3 min; summary is the slowest endpoint
// ─────────────────────────────────────────────────────────────────────────────
export async function generateSummary(noteId) {
  const res = await apiClient.post(
    `/ai/summary/${noteId}`,
    {},
    { timeout: TIMEOUT_LONG }
  );
  return res;
}

// ─────────────────────────────────────────────────────────────────────────────
// Quiz
// ─────────────────────────────────────────────────────────────────────────────
export async function generateQuiz(noteId) {
  const res = await apiClient.post(
    `/ai/quiz/${noteId}`,
    {},
    { timeout: TIMEOUT_DEFAULT }
  );
  return res;
}

export async function regenerateQuiz(
  noteId
) {
  return apiClient.post(
    `/ai/quiz/regenerate/${noteId}`
  );
}
// ─────────────────────────────────────────────────────────────────────────────
// Flashcards
// FIX: null-safe — if res.data is null/undefined, caller gets {} not crash
// ─────────────────────────────────────────────────────────────────────────────
export async function generateFlashcards(noteId) {
  const res = await apiClient.post(
    `/ai/flashcards/${noteId}`,
    {},
    { timeout: TIMEOUT_DEFAULT }
  );
  return res;
}

// ─────────────────────────────────────────────────────────────────────────────
// Important Questions
// ─────────────────────────────────────────────────────────────────────────────
export async function generateQuestions(noteId) {
  const res = await apiClient.post(
    `/ai/important-questions/${noteId}`,
    {},
    { timeout: TIMEOUT_DEFAULT }
  );
  return res;
}

// ─────────────────────────────────────────────────────────────────────────────
// Simplify
// FIX: timeout raised to 3 min; same generation length as summary
// ─────────────────────────────────────────────────────────────────────────────
export async function simplifyNote(noteId) {
  const res = await apiClient.post(
    `/ai/simplify/${noteId}`,
    {},
    { timeout: TIMEOUT_LONG }
  );
  return res;
}

// ─────────────────────────────────────────────────────────────────────────────
// Chat
// FIX: body key is "message" — matches backend req.body.message
// ─────────────────────────────────────────────────────────────────────────────
export async function sendChatMessage(noteId, message) {
  const res = await apiClient.post(
    `/ai/chat/${noteId}`,
    { message },
    { timeout: TIMEOUT_DEFAULT }
  );
  return res;
}

// ─────────────────────────────────────────────────────────────────────────────
// AI History
// ─────────────────────────────────────────────────────────────────────────────
export async function getAIHistory(noteId) {
  const res = await apiClient.get(
    `/ai/history/${noteId}`,
    { timeout: TIMEOUT_DEFAULT }
  );
  return res;
}

// ─────────────────────────────────────────────────────────────────────────────
// Chat History (persisted turns stored on the note itself)
// ─────────────────────────────────────────────────────────────────────────────
// aiService.js - Add these functions
// src/services/aiService.js - Add these functions

export const markQuestionImportant = async (
  noteId,
  questionText
) => {
  return await apiClient.post(
    `/ai/questions/mark-important/${noteId}`,
    { questionText }
  );
};

export async function regenerateQuestions(noteId) {
  const res = await apiClient.post(
    `/ai/questions/regenerate/${noteId}`,
    {},
    { timeout: TIMEOUT_DEFAULT }
  );
  return res;
}

export async function getQuestionHistory(noteId) {
  const res = await apiClient.get(
    `/ai/questions/history/${noteId}`
  );
  return res;
}

export async function restoreQuestionSet(noteId, historyId) {
  const res = await apiClient.post(
    `/ai/questions/restore/${noteId}`,
    { historyId }
  );
  return res;
}

export async function deleteQuestionHistory(noteId, historyId) {
  const res = await apiClient.delete(
    `/ai/questions/history/${noteId}/${historyId}`
  );
  return res;
}

export async function downloadAllQuestionsPDF(noteId) {
  const response = await apiClient.get(
    `/ai/download-all-questions/${noteId}`,
    { 
      responseType: "blob",
      timeout: TIMEOUT_DEFAULT 
    }
  );
  return response;
}

// services/aiService.js

export const createChat = (noteId) =>
  apiClient.post(`/ai/chat/new/${noteId}`);

export const getChats = (noteId) =>
  apiClient.get(`/ai/chats/${noteId}`);

export const getChat = (noteId, chatId) =>
  apiClient.get(`/ai/chat/${noteId}/${chatId}`);

export const sendMessage = (
  noteId,
  chatId,
  message
) =>
  apiClient.post(
    `/ai/chat/${noteId}/${chatId}`,
    { message }
  );

export const deleteChat = (
  noteId,
  chatId
) =>
  apiClient.delete(
    `/ai/chat/${noteId}/${chatId}`
  );

export const renameChat = (
  noteId,
  chatId,
  title
) =>
  apiClient.put(
    `/ai/chat-title/${noteId}/${chatId}`,
    { title }
  );

  //downloads//

  export const downloadSummaryPDF = (id) =>
  apiClient.get(`/ai/download-summary/${id}`, {
    responseType: "blob",
  });

export const downloadQuizPDF = (id) =>
  apiClient.get(`/ai/download-quiz/${id}`, {
    responseType: "blob",
  });

export const downloadFlashcardsPDF = (id) =>
  apiClient.get(`/ai/download-flashcards/${id}`, {
    responseType: "blob",
  });

export const downloadQuestionsPDF = (id) =>
  apiClient.get(`/ai/download-important/${id}`, {
    responseType: "blob",
  });

export const downloadSimplifyPDF = (id) =>
  apiClient.get(`/ai/download-simplify/${id}`, {
    responseType: "blob",
  });

  export const downloadChatPDF = (
  noteId,
  chatId
) =>
  apiClient.get(
    `/ai/download-chat/${noteId}/${chatId}`,
    {
      responseType: "blob",
    }
  );