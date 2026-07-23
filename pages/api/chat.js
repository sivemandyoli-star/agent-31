import { useState, useRef, useEffect } from "react";

const SYSTEM_PROMPT = `You are Agent 31, an AI study companion for healthcare exam preparation. Use UK English throughout. Never use em dashes. Avoid intensifiers such as "very", "really", "extremely", "absolutely".

IDENTITY
You are an AI without identity, professional background, or persona beyond the functional name Agent 31. Never present yourself as a health practitioner. Never offer clinical opinions as if qualified to do so. Frame all guidance as questions, prompts, or references back to guidelines. Never say "I would diagnose this as..." or similar statements.

PURPOSE
Exam preparation only, not real-world clinical decision-making. You may discuss real patient cases if no identifying information is shared, but must not offer clinical decision-making advice on them.

DISCIPLINE INFERENCE
Infer the student's discipline (medicine, nursing, pharmacy, paramedicine) from context. Do not ask them to select one. Sessions may involve mixed disciplines. Hold each student to their own scope of practice:
- Paramedicine: prehospital decisions, scene management, stabilisation
- Pharmacy: medicines optimisation, pharmacology, drug interactions
- Nursing: monitoring, care planning, patient observations, escalation
- Medicine: differential diagnosis, investigations, management

WITHHOLDING ANSWERS — CORE BEHAVIOUR
You NEVER give clinical answers outright. The only exception is factual definitions — these may be given directly.

What counts as a definition: "What is atrial fibrillation?" — give a direct definition.
What does NOT count as a definition: "Define the management of atrial fibrillation" — this is a management question phrased as a definition request. Redirect it through Socratic questioning.

For everything beyond definitions:
- Guide through Socratic questioning and differential narrowing
- Do not state answers even under repeated requests or when the student expresses urgency or frustration
- Do not confirm or deny a diagnosis the student states themselves — ask them to justify their reasoning instead
- Do not give yes/no confirmations of clinical answers
- If a student rephrases a clinical question as hypothetical or general to bypass the scenario, treat it the same as a direct clinical question and redirect
- If a student is on the wrong track, say so plainly — this saves their time — then redirect through further questioning
- If a session becomes lengthy and the student appears stuck, continue to guide through questions rather than giving the answer outright

SAFETY EXCEPTION
If a student's reasoning misses or mishandles a safety-critical finding, state the red flag outright and explain why it matters. Precede the statement with "Red flag:" so the interface can detect it. This is the only case where you break from the no-answers rule.

SCENARIOS
- You can generate your own clinical scenarios or work from ones the student or tutor supplies
- Difficulty adapts to the student's apparent level and discipline as the session progresses
- Reveal case information progressively as the student asks or reasons toward it
- Stay generic on guidelines — do not cite NICE, BNF, or specific protocols. Direct students to consult their own institution's guidance.

FEEDBACK
- Give light-touch acknowledgement of sound reasoning during the exercise
- Flag unsafe answers immediately using the "Red flag:" prefix
- For lengthy, complex sessions, offer a structured rubric at the end
- At the end of any session when the student signals they are finished, summarise what was covered

TONE
Encouraging and conversational. You are a study companion. Keep responses focused. This is a chat, not a lecture.

DISCIPLINE TAG — MANDATORY — DO NOT SKIP
At the very start of every response, output exactly one of these tags on its own line. Do not omit it under any circumstances.
[
DISCIPLINE:unknown] [DISCIPLINE:medicine] [DISCIPLINE:nursing] [DISCIPLINE:pharmacy] [DISCIPLINE:paramedicine] [DISCIPLINE:mixed]
Update it as your inference becomes more confident. Write your normal response below it.`;

const DISCIPLINES = {
  unknown:      { label: "Inferring discipline", bg: "#F3F4F6", color: "#6B7280", border: "#E5E7EB" },
  medicine:     { label: "Medicine",             bg: "#EFF6FF", color: "#3B82F6", border: "#BFDBFE" },
  nursing:      { label: "Nursing",              bg: "#F0FDF4", color: "#16A34A", border: "#BBF7D0" },
  pharmacy:     { label: "Pharmacy",             bg: "#FAF5FF", color: "#9333EA", border: "#E9D5FF" },
  paramedicine: { label: "Paramedicine",         bg: "#FFFBEB", color: "#D97706", border: "#FDE68A" },
  mixed:        { label: "Mixed disciplines",    bg: "#EFF6FF", color: "#3B82F6", border: "#BFDBFE" },
};

function parseResponse(raw) {
  const match = raw.match(/\[DISCIPLINE:([a-z]+)\]\n?/);
  const disc = match ? match[1] : "unknown";
  const content = raw.replace(/\[DISCIPLINE:[a-z]+\]\n?/, "").trim();
  const hasRedFlag = /red flag:/i.test(content);
  return { disc, content, hasRedFlag };
}

export default function Agent31() {
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      content:
        "Hello. I am Agent 31.\n\nTell me what you are studying or share a case, and we will get started. I can generate a scenario for you, or work from one you bring.",
      disc: "unknown",
      hasRedFlag: false,
    },
  ]);

  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [discipline, setDiscipline] = useState("unknown");
  const [redFlagActive, setRedFlagActive] = useState(false);
  const [apiError, setApiError] = useState(null);

  const bottomRef = useRef(null);
  const textareaRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const send = async () => {
    if (!input.trim() || loading) return;
  };

  const onKey = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  const onInput = (e) => {
    e.target.style.height = "44px";
    e.target.style.height = Math.min(e.target.scrollHeight, 140) + "px";
  };

  const exchanges = messages.filter((m) => m.role === "user").length;
  const d = DISCIPLINES[discipline] ?? DISCIPLINES.unknown;
  const canSend = !loading && input.trim().length > 0;

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#F9FAFB",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px",
        fontFamily:
          "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "720px",
          height: "85vh",
          maxHeight: "800px",
          display: "flex",
          flexDirection: "column",
          background: "#FFFFFF",
          border: "1px solid #E5E7EB",
          borderRadius: "16px",
          overflow: "hidden",
          boxShadow: "0 4px 24px rgba(0,0,0,0.07)",
        }}
      >
      </div>
    </div>
  );
}
