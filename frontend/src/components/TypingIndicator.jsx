export default function TypingIndicator() {
  return (
    <div className="flex justify-start">
      <div>
        <div className="rounded-2xl border border-slate-200 bg-slate-100 px-4 py-3 dark:border-slate-700 dark:bg-slate-800">
          <div className="flex items-center gap-1.5">
            <span className="typing-dot" />
            <span className="typing-dot" style={{ animationDelay: "0.2s" }} />
            <span className="typing-dot" style={{ animationDelay: "0.4s" }} />
          </div>
        </div>
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-300">CampusAI is thinking...</p>
      </div>
    </div>
  );
}
