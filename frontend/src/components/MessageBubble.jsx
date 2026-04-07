import { useMemo, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import { submitFeedback } from "../api/client";
import useChatStore from "../store/chatStore";
import MentalHealthBanner from "./MentalHealthBanner";
import SourcePanel from "./SourcePanel";

const formatTime = (value) => {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
};

export default function MessageBubble({ message }) {
  const isUser = message.role === "user";
  const sessionId = useChatStore((state) => state.sessionId);
  const bookmarks = useChatStore((state) => state.bookmarks);
  const addBookmark = useChatStore((state) => state.addBookmark);
  const [rating, setRating] = useState(null);
  const [feedbackText, setFeedbackText] = useState("");
  const [copied, setCopied] = useState(false);

  const isBookmarked = useMemo(
    () => bookmarks.some((bookmark) => bookmark.id === message.id),
    [bookmarks, message.id],
  );

  const handleFeedback = async (value) => {
    if (rating !== null || isUser) {
      return;
    }
    setRating(value);
    setFeedbackText("Thanks for your feedback");
    setTimeout(() => setFeedbackText(""), 1500);

    try {
      await submitFeedback({
        message_id: message.id,
        session_id: sessionId,
        rating: value,
      });
    } catch {
      // Keep UI optimistic even if network is flaky.
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(message.content || "");
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  const handleBookmark = () => {
    if (isBookmarked) {
      return;
    }
    addBookmark({
      id: message.id,
      question: message.question || "Saved answer",
      answer: message.content || "",
      timestamp: new Date().toISOString(),
    });
  };

  const handleShare = async () => {
    const payload = `Q: ${message.question || "CampusAI answer"}\nA: ${message.content || ""}`;
    try {
      await navigator.clipboard.writeText(payload);
    } catch {
      // No-op fallback.
    }
  };

  return (
    <div className={`flex w-full ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[90%] ${isUser ? "items-end" : "items-start"} flex flex-col`}
      >
        <div className="flex items-end gap-2">
          {!isUser && (
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-200 text-sm dark:bg-slate-700">
              🤖
            </div>
          )}

          <div
            className={`rounded-2xl px-4 py-3 ${
              isUser
                ? "bg-blue-600 text-white"
                : "border border-slate-200 bg-white text-slate-800 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
            }`}
          >
            {isUser ? (
              <p className="whitespace-pre-wrap text-sm">{message.content}</p>
            ) : (
              <div className="prose prose-sm max-w-none dark:prose-invert">
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  components={{
                    a: ({ href, children }) => (
                      <a
                        href={href || "#"}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 underline dark:text-blue-300"
                      >
                        {children}
                      </a>
                    ),
                  }}
                >
                  {message.content || ""}
                </ReactMarkdown>
              </div>
            )}
          </div>
        </div>

        <span className="mt-1 text-xs text-slate-500 dark:text-slate-300">
          {formatTime(message.timestamp)}
        </span>

        {!isUser && message.confidence < 0.5 && (
          <span className="mt-2 inline-flex rounded-full border border-yellow-300 bg-yellow-100 px-2 py-1 text-xs text-yellow-700 dark:border-yellow-400/60 dark:bg-yellow-900/25 dark:text-yellow-200">
            Low confidence — verify
          </span>
        )}

        {!isUser && <SourcePanel sources={message.sources || []} />}

        {!isUser && message.mental_health_triggered && (
          <MentalHealthBanner
            triggered={Boolean(message.mental_health_triggered)}
          />
        )}

        {!isUser && message.crisis_triggered && <MentalHealthBanner crisis />}

        {!isUser && (
          <div className="mt-2 flex items-center gap-2">
            {rating !== -1 && (
              <button
                type="button"
                disabled={rating !== null}
                onClick={() => handleFeedback(1)}
                className={`rounded-md border px-2 py-1 text-sm ${
                  rating === 1
                    ? "border-green-600 bg-green-600 text-white"
                    : "border-slate-300 bg-white text-slate-700 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                }`}
              >
                👍
              </button>
            )}
            {rating !== 1 && (
              <button
                type="button"
                disabled={rating !== null}
                onClick={() => handleFeedback(-1)}
                className={`rounded-md border px-2 py-1 text-sm ${
                  rating === -1
                    ? "border-red-600 bg-red-600 text-white"
                    : "border-slate-300 bg-white text-slate-700 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                }`}
              >
                👎
              </button>
            )}
            {feedbackText && (
              <span className="text-xs text-slate-500 dark:text-slate-300">
                {feedbackText}
              </span>
            )}
          </div>
        )}

        {!isUser && (
          <div className="mt-2 flex items-center gap-2 text-xs">
            <button
              type="button"
              onClick={handleCopy}
              className="rounded-md border border-slate-300 bg-white px-2 py-1 text-slate-700 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
            >
              {copied ? "Copied!" : "Copy"}
            </button>
            <button
              type="button"
              onClick={handleBookmark}
              className="rounded-md border border-slate-300 bg-white px-2 py-1 text-slate-700 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
            >
              {isBookmarked ? "🔖 Bookmarked" : "Bookmark"}
            </button>
            <button
              type="button"
              onClick={handleShare}
              className="rounded-md border border-slate-300 bg-white px-2 py-1 text-slate-700 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
            >
              Share
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
