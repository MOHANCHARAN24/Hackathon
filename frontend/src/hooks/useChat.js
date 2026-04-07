import * as api from "../api/client";
import useChatStore from "../store/chatStore";

const MODULE_KEYWORDS = {
  admission: [
    "admission",
    "apply",
    "application",
    "eligibility",
    "counselling",
    "seat",
    "selected",
    "vsat",
  ],
  academic: [
    "exam",
    "syllabus",
    "curriculum",
    "semester",
    "attendance",
    "credits",
    "marks",
    "regulation",
  ],
  financial: [
    "fee",
    "fees",
    "scholarship",
    "payment",
    "refund",
    "tuition",
    "hostel fee",
  ],
  campus: [
    "hostel",
    "transport",
    "bus",
    "library",
    "canteen",
    "location",
    "where is",
    "route",
  ],
  support: [
    "grievance",
    "mental",
    "stress",
    "anxiety",
    "depressed",
    "support",
    "counseling",
    "anti-ragging",
  ],
};

const MODULE_NAMES = {
  admission: "Admission",
  academic: "Academic",
  financial: "Financial",
  campus: "Campus",
  support: "Support",
};

const detectModuleFromQuestion = (text) => {
  const q = (text || "").toLowerCase();
  const scores = Object.entries(MODULE_KEYWORDS).map(([moduleId, words]) => {
    const score = words.reduce(
      (count, word) => (q.includes(word) ? count + 1 : count),
      0,
    );
    return [moduleId, score];
  });

  scores.sort((a, b) => b[1] - a[1]);
  if (!scores.length || scores[0][1] === 0) {
    return null;
  }
  return scores[0][0];
};

export default function useChat() {
  const {
    addMessage,
    setLoading,
    isLoading,
    language,
    activeModule,
    sessionId,
    studentProfile,
  } = useChatStore();

  const sendMessage = async (text, module = null) => {
    if (!text.trim() || isLoading) {
      return;
    }

    const selectedModule = module || activeModule;
    if (!selectedModule) {
      addMessage({
        id: crypto.randomUUID(),
        role: "bot",
        content:
          "Please select one of the 5 modules first, then ask your question.",
        sources: [],
        sentiment: "neutral",
        mental_health_triggered: false,
        crisis_triggered: false,
        confidence: 1,
        is_answered: true,
        timestamp: new Date(),
        question: text,
      });
      return;
    }

    const detectedModule = detectModuleFromQuestion(text);
    if (detectedModule && detectedModule !== selectedModule) {
      const expectedName = MODULE_NAMES[detectedModule] || detectedModule;
      const selectedName = MODULE_NAMES[selectedModule] || selectedModule;
      addMessage({
        id: crypto.randomUUID(),
        role: "bot",
        content: `This question belongs to ${expectedName} module. Please ask it in ${expectedName}, not in ${selectedName}.`,
        sources: [],
        sentiment: "neutral",
        mental_health_triggered: false,
        crisis_triggered: false,
        confidence: 1,
        is_answered: true,
        timestamp: new Date(),
        question: text,
      });
      return;
    }

    const userMsg = {
      id: crypto.randomUUID(),
      role: "user",
      content: text,
      timestamp: new Date(),
    };
    addMessage(userMsg);
    setLoading(true);

    try {
      const response = await api.sendMessage({
        message: text,
        session_id: sessionId,
        language,
        module: selectedModule,
        student_profile: studentProfile,
      });

      const botMsg = {
        id: response.data.message_id,
        role: "bot",
        content: response.data.answer,
        sources: response.data.sources,
        sentiment: response.data.sentiment,
        mental_health_triggered: response.data.mental_health_triggered,
        crisis_triggered: response.data.crisis_triggered,
        confidence: response.data.confidence,
        is_answered: response.data.is_answered,
        timestamp: new Date(),
        question: text,
      };
      addMessage(botMsg);
    } catch (err) {
      addMessage({
        id: crypto.randomUUID(),
        role: "bot",
        content:
          "I'm having trouble connecting right now. Please try again or contact +91-863-2344700.",
        sources: [],
        sentiment: "neutral",
        mental_health_triggered: false,
        crisis_triggered: false,
        confidence: 0,
        is_answered: false,
        timestamp: new Date(),
        question: text,
      });
    } finally {
      setLoading(false);
    }
  };

  return { sendMessage, isLoading };
}
