export const formatTime = (dateValue) => {
  const date = dateValue instanceof Date ? dateValue : new Date(dateValue);
  return date.toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  });
};

export const truncateText = (text, maxLength = 120) => {
  if (!text || text.length <= maxLength) {
    return text || "";
  }
  return `${text.slice(0, maxLength).trim()}...`;
};

export const generateMessageId = () => {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
};

export const getModuleColor = (moduleId) => {
  const colorMap = {
    blue: "border-blue-200 bg-blue-50",
    purple: "border-purple-200 bg-purple-50",
    green: "border-green-200 bg-green-50",
    amber: "border-amber-200 bg-amber-50",
    teal: "border-teal-200 bg-teal-50",
    admission: "border-blue-200 bg-blue-50",
    academic: "border-emerald-200 bg-emerald-50",
    financial: "border-amber-200 bg-amber-50",
    campus: "border-indigo-200 bg-indigo-50",
    support: "border-teal-200 bg-teal-50",
    mental_health: "border-rose-200 bg-rose-50",
  };

  return colorMap[moduleId] || "border-gray-200 bg-white";
};
