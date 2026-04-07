export default function SuggestionChips({ questions = [], onSelect }) {
  if (!questions.length) {
    return null;
  }

  return (
    <div className="mb-4 flex gap-2 overflow-x-auto pb-2 whitespace-nowrap">
      {questions.map((question) => (
        <button
          key={question}
          type="button"
          onClick={() => onSelect(question)}
          className="shrink-0 rounded-full border border-blue-200 bg-blue-50 px-4 py-2 text-sm font-medium text-blue-700 hover:bg-blue-100 dark:border-blue-400/40 dark:bg-blue-900/30 dark:text-blue-100"
        >
          {question}
        </button>
      ))}
    </div>
  );
}
