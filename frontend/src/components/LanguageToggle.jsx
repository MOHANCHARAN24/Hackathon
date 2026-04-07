import useChatStore from "../store/chatStore";

export const LANGUAGES = [
  { code: "en", nativeLabel: "English" },
  { code: "te", nativeLabel: "తెలుగు" },
  { code: "hi", nativeLabel: "हिंदी" },
];

export default function LanguageToggle({ className = "" }) {
  const language = useChatStore((state) => state.language);
  const setLanguage = useChatStore((state) => state.setLanguage);

  const selected =
    LANGUAGES.find((option) => option.code === language) || LANGUAGES[0];

  const handleChange = (event) => {
    const next = event.target.value;
    setLanguage(next);
    localStorage.setItem("campusai_language", next);
  };

  return (
    <div className={`flex items-center gap-2 ${className}`.trim()}>
      <span className="text-xs font-medium text-slate-500 dark:text-slate-300">
        {selected.nativeLabel}
      </span>
      <select
        value={language}
        onChange={handleChange}
        className="rounded-lg border border-slate-300 bg-white px-2 py-1 text-sm text-slate-700 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
      >
        {LANGUAGES.map((option) => (
          <option key={option.code} value={option.code}>
            {option.nativeLabel}
          </option>
        ))}
      </select>
    </div>
  );
}
