import { useEffect, useRef, useState } from "react";

import useChatStore from "../store/chatStore";
import useVoice from "../hooks/useVoice";

export default function ChatInput({ onSend, disabled }) {
  const language = useChatStore((state) => state.language);
  const [value, setValue] = useState("");
  const textareaRef = useRef(null);
  const {
    isListening,
    transcript,
    startListening,
    stopListening,
    clearTranscript,
    isSupported,
  } = useVoice();

  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  useEffect(() => {
    if (transcript) {
      setValue(transcript);
    }
  }, [transcript]);

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) {
      return;
    }
    el.style.height = "auto";
    const lineHeight = 24;
    const maxHeight = lineHeight * 4;
    el.style.height = `${Math.min(el.scrollHeight, maxHeight)}px`;
    el.style.overflowY = el.scrollHeight > maxHeight ? "auto" : "hidden";
  }, [value]);

  const handleSend = () => {
    const text = value.trim();
    if (!text || disabled) {
      return;
    }
    onSend(text);
    setValue("");
    clearTranscript();
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.focus();
    }
  };

  const handleKeyDown = (event) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="border-t border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-900">
      <div className="flex items-end gap-2">
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(event) => setValue(event.target.value)}
          onKeyDown={handleKeyDown}
          rows={1}
          disabled={disabled}
          placeholder="Ask about admissions, fees, hostel, exams..."
          className="min-h-[44px] w-full resize-none rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 outline-none focus:border-blue-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
        />

        {isSupported && (
          <button
            type="button"
            onClick={isListening ? stopListening : startListening}
            disabled={disabled}
            title={language}
            className={`rounded-xl border px-3 py-2 text-lg ${
              isListening
                ? "pulse-ring border-red-400 bg-red-50 text-red-700 dark:border-red-400 dark:bg-red-900/30 dark:text-red-200"
                : "border-slate-300 bg-white text-slate-700 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
            }`}
          >
            ●
          </button>
        )}

        <button
          type="button"
          onClick={handleSend}
          disabled={disabled || !value.trim()}
          className={`rounded-xl px-4 py-2 text-sm font-medium text-white ${
            disabled
              ? "bg-blue-600"
              : value.trim()
                ? "bg-blue-600 hover:bg-blue-700"
                : "bg-blue-400"
          }`}
        >
          {disabled ? (
            <span className="inline-flex items-center gap-2">
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              Sending
            </span>
          ) : (
            <span>➤</span>
          )}
        </button>
      </div>
    </div>
  );
}
