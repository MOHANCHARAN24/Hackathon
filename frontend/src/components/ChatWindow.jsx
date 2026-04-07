import { useEffect, useMemo, useRef } from "react";

import useChatStore from "../store/chatStore";
import MessageBubble from "./MessageBubble";
import SuggestionChips from "./SuggestionChips";
import TypingIndicator from "./TypingIndicator";

export default function ChatWindow({ onSelectSuggestion }) {
  const messages = useChatStore((state) => state.messages);
  const isLoading = useChatStore((state) => state.isLoading);
  const activeModule = useChatStore((state) => state.activeModule);
  const modules = useChatStore((state) => state.modules);
  const endRef = useRef(null);

  const starterQuestions = useMemo(() => {
    const selected = modules.find((module) => module.id === activeModule);
    if (selected?.starter_questions?.length) {
      return selected.starter_questions;
    }
    return [];
  }, [modules, activeModule]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  return (
    <div className="flex-1 overflow-y-auto bg-slate-50 p-4 dark:bg-slate-950">
      {messages.length === 0 && (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-6 text-center text-slate-700 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100">
          <h2 className="text-lg font-semibold">
            CampusAI for Vignan University
          </h2>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-300">
            Ask about admissions, fees, hostel, exams, scholarships, and
            support.
          </p>
        </div>
      )}

      {messages.length === 0 && (
        <SuggestionChips
          questions={starterQuestions}
          onSelect={onSelectSuggestion}
        />
      )}

      <div className="space-y-4">
        {messages.map((message) => (
          <MessageBubble key={message.id} message={message} />
        ))}

        {isLoading && <TypingIndicator />}
      </div>

      <div ref={endRef} />
    </div>
  );
}
