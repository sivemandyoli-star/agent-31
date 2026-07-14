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
[DISCIPLINE:unknown] [DISCIPLINE:medicine] [DISCIPLINE:nursing] [DISCIPLINE:pharmacy] [DISCIPLINE:paramedicine] [DISCIPLINE:mixed]
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
  const match = raw.match(/^\[DISCIPLINE:([a-z]+)\]\n?/);
  const disc = match ? match[1] : "unknown";
  const content = raw.replace(/^\[DISCIPLINE:[a-z]+\]\n?/, "").trim();
  const hasRedFlag = /red flag:/i.test(content);
  return { disc, content, hasRedFlag };
}

export default function Agent31() {
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      content: "Hello. I am Agent 31.\n\nTell me what you are studying or share a case, and we will get started. I can generate a scenario for you, or work from one you bring.",
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

    const userMsg = { role: "user", content: input.trim() };
    const next = [...messages, userMsg];
    setMessages(next);
    setInput("");
    setApiError(null);
    if (textareaRef.current) textareaRef.current.style.height = "44px";
    setLoading(true);

    const apiMessages = next.map((m) => ({ role: m.role, content: m.content }));

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-6",
          max_tokens: 1000,
          system: SYSTEM_PROMPT,
          messages: apiMessages,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setApiError("Error " + res.status + ": " + (data?.error?.message || JSON.stringify(data)));
        setLoading(false);
        return;
      }

      const raw = data.content?.[0]?.text ?? "No response returned.";
      const { disc, content, hasRedFlag } = parseResponse(raw);

      setDiscipline(disc);
      if (hasRedFlag) setRedFlagActive(true);
      setMessages((prev) => [...prev, { role: "assistant", content, disc, hasRedFlag }]);
    } catch (err) {
      setApiError("Network error: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const onKey = (e) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); }
  };

  const onInput = (e) => {
    e.target.style.height = "44px";
    e.target.style.height = Math.min(e.target.scrollHeight, 140) + "px";
  };

  const exchanges = messages.filter((m) => m.role === "user").length;
  const d = DISCIPLINES[discipline] ?? DISCIPLINES.unknown;
  const canSend = !loading && input.trim().length > 0;

  return (
    <div style={{
      minHeight: "100vh", background: "#F9FAFB",
      display: "flex", flexDirection: "column", alignItems: "center",
      justifyContent: "center", padding: "24px", fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    }}>
      <div style={{
        width: "100%", maxWidth: "720px", height: "85vh", maxHeight: "800px",
        display: "flex", flexDirection: "column",
        background: "#FFFFFF", border: "1px solid #E5E7EB",
        borderRadius: "16px", overflow: "hidden",
        boxShadow: "0 4px 24px rgba(0,0,0,0.07)",
      }}>

        {/* Header */}
        <div style={{
          padding: "14px 20px", borderBottom: "1px solid #E5E7EB",
          background: "#FFFFFF", display: "flex",
          alignItems: "center", justifyContent: "space-between", flexShrink: 0,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div style={{
              width: "36px", height: "36px", borderRadius: "10px",
              background: "#EFF6FF", border: "1px solid #BFDBFE",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: "13px", fontWeight: "600", color: "#3B82F6", letterSpacing: "0.3px",
            }}>31</div>
            <div>
              <div style={{ fontSize: "15px", fontWeight: "600", color: "#111827" }}>Agent 31</div>
              <div style={{ fontSize: "12px", color: "#9CA3AF" }}>Healthcare exam preparation</div>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            {redFlagActive && (
              <span style={{
                padding: "4px 10px", borderRadius: "6px",
                background: "#FEF2F2", color: "#DC2626",
                border: "1px solid #FECACA", fontSize: "12px", fontWeight: "500",
              }}>
                ⚠ Red flag
              </span>
            )}
            <span style={{
              padding: "4px 10px", borderRadius: "6px",
              background: d.bg, color: d.color, border: `1px solid ${d.border}`,
              fontSize: "12px", fontWeight: "500", transition: "all 0.3s",
            }}>{d.label}</span>
            <span style={{ fontSize: "12px", color: "#9CA3AF" }}>
              {exchanges} {exchanges === 1 ? "exchange" : "exchanges"}
            </span>
          </div>
        </div>

        {/* Spec strip */}
        <div style={{
          padding: "6px 20px", borderBottom: "1px solid #F3F4F6",
          background: "#FAFAFA", display: "flex", gap: "10px",
          fontSize: "11px", color: "#9CA3AF", flexShrink: 0, flexWrap: "wrap",
        }}>
          <span>Definitions given directly</span>
          <span>·</span>
          <span>Clinical answers withheld</span>
          <span>·</span>
          <span>Red flags stated outright</span>
          <span>·</span>
          <span>Discipline inferred from context</span>
        </div>

        {/* Error banner */}
        {apiError && (
          <div style={{
            padding: "10px 20px", background: "#FEF2F2",
            borderBottom: "1px solid #FECACA",
            fontSize: "13px", color: "#DC2626", flexShrink: 0,
          }}>
            {apiError}
          </div>
        )}

        {/* Messages */}
        <div style={{
          flex: 1, overflowY: "auto", padding: "20px",
          display: "flex", flexDirection: "column", gap: "14px",
        }}>
          {messages.map((msg, i) => (
            <div key={i} style={{
              display: "flex",
              flexDirection: msg.role === "user" ? "row-reverse" : "row",
              alignItems: "flex-start", gap: "10px",
            }}>
              {msg.role === "assistant" && (
                <div style={{
                  width: "28px", height: "28px", borderRadius: "8px",
                  background: "#EFF6FF", border: "1px solid #BFDBFE",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: "10px", fontWeight: "600", color: "#3B82F6", flexShrink: 0,
                }}>31</div>
              )}
              <div style={{
                maxWidth: "78%", padding: "11px 15px",
                borderRadius: msg.role === "user" ? "14px 4px 14px 14px" : "4px 14px 14px 14px",
                background: msg.role === "user" ? "#EFF6FF" : "#F9FAFB",
                border: msg.role === "user"
                  ? "1px solid #BFDBFE"
                  : `1px solid ${msg.hasRedFlag ? "#FECACA" : "#E5E7EB"}`,
                fontSize: "14px", lineHeight: "1.65",
                color: msg.role === "user" ? "#1D4ED8" : "#111827",
                whiteSpace: "pre-wrap",
              }}>
                {msg.hasRedFlag && (
                  <div style={{
                    fontSize: "12px", color: "#DC2626", fontWeight: "500",
                    marginBottom: "6px", display: "flex", alignItems: "center", gap: "5px",
                  }}>
                    ⚠ Safety-critical content flagged
                  </div>
                )}
                {msg.content}
              </div>
            </div>
          ))}

          {loading && (
            <div style={{ display: "flex", alignItems: "flex-start", gap: "10px" }}>
              <div style={{
                width: "28px", height: "28px", borderRadius: "8px",
                background: "#EFF6FF", border: "1px solid #BFDBFE",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: "10px", fontWeight: "600", color: "#3B82F6", flexShrink: 0,
              }}>31</div>
              <div style={{
                padding: "13px 16px", borderRadius: "4px 14px 14px 14px",
                background: "#F9FAFB", border: "1px solid #E5E7EB",
                display: "flex", gap: "5px", alignItems: "center",
              }}>
                {[0, 1, 2].map((n) => (
                  <span key={n} style={{
                    display: "inline-block", width: "6px", height: "6px",
                    borderRadius: "50%", background: "#9CA3AF",
                    animation: `bounce 1.2s ${n * 0.2}s infinite ease-in-out`,
                  }} />
                ))}
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div style={{
          padding: "14px 16px", borderTop: "1px solid #E5E7EB",
          background: "#FFFFFF", display: "flex", gap: "10px",
          alignItems: "flex-end", flexShrink: 0,
        }}>
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={onKey}
            onInput={onInput}
            placeholder="Ask a question or present a case..."
            rows={1}
            style={{
              flex: 1, height: "44px", minHeight: "44px", maxHeight: "140px",
              resize: "none", padding: "11px 14px",
              fontSize: "14px", lineHeight: "1.5",
              fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
              background: "#F9FAFB", border: "1px solid #D1D5DB",
              borderRadius: "10px", color: "#111827",
              outline: "none", overflowY: "auto",
            }}
          />
          <button
            onClick={send}
            disabled={!canSend}
            style={{
              height: "44px", padding: "0 20px", borderRadius: "10px",
              background: canSend ? "#3B82F6" : "#F3F4F6",
              border: "none",
              color: canSend ? "#FFFFFF" : "#9CA3AF",
              fontSize: "14px", fontWeight: "500",
              cursor: canSend ? "pointer" : "not-allowed",
              transition: "background 0.15s", flexShrink: 0,
            }}
          >Send</button>
        </div>
      </div>

      <style>{`
        @keyframes bounce {
          0%, 80%, 100% { transform: translateY(0); opacity: 0.3; }
          40% { transform: translateY(-6px); opacity: 1; }
        }
        * { box-sizing: border-box; margin: 0; padding: 0; }
        textarea:focus { border-color: #93C5FD !important; box-shadow: 0 0 0 3px #EFF6FF; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-thumb { background: #E5E7EB; border-radius: 2px; }
      `}</style>
    </div>
  );
}
