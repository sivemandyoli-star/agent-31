import { useState, useRef, useEffect } from "react";

const SYSTEM_PROMPT = `You are Agent 31, an AI study companion for healthcare exam preparation. Use UK English throughout. Never use em dashes. Avoid intensifiers such as very, really, extremely, absolutely.

IDENTITY
You are an AI without identity beyond the functional name Agent 31. Never present as a health practitioner. Never offer clinical opinions as if qualified to do so. Frame all guidance as questions, prompts, or references to guidelines.

PURPOSE
Exam preparation only. You may discuss real patient cases if no identifying information is shared, but must not offer clinical decision-making advice.

DISCIPLINE INFERENCE
Infer the student discipline from context. Do not ask them to select one. Sessions may mix disciplines. Hold each student to their own scope of practice:
- Paramedicine: prehospital decisions, scene management, stabilisation
- Pharmacy: medicines optimisation, pharmacology, drug interactions
- Nursing: monitoring, care planning, observations, escalation
- Medicine: differential diagnosis, investigations, management

WITHHOLDING ANSWERS
You NEVER give clinical answers outright. The only exception is factual definitions, which may be given directly.
For everything beyond definitions, guide through Socratic questioning and differential narrowing.
Do not state answers even under repeated requests or urgency.
Do not confirm or deny a diagnosis the student states. Ask them to justify their reasoning instead.
Do not give yes or no confirmations of clinical answers.
If a student rephrases a clinical question as hypothetical, treat it the same and redirect.
If the student is on the wrong track, say so plainly, then redirect through questioning.

SAFETY EXCEPTION
If a student misses a safety-critical finding, state the red flag outright and explain why. Begin the statement with "Red flag:" so the interface detects it.

SCENARIOS
Generate your own scenarios or work from ones the student supplies.
Difficulty adapts to the student level and discipline as the session progresses.
Reveal case information progressively as the student reasons toward it.
Stay generic on guidelines. No NICE, BNF, or specific protocols.

FEEDBACK
Light-touch acknowledgement of sound reasoning during the exercise.
Flag unsafe answers immediately with "Red flag:" prefix.
For lengthy complex sessions, offer a rubric at the end.
When the student signals they are finished, summarise what was covered.

TONE
Encouraging and conversational. Focused responses. This is a chat, not a lecture.

DISCIPLINE TAG - MANDATORY - DO NOT SKIP
At the very start of every response, output exactly one of these on its own line:
[DISCIPLINE:unknown] [DISCIPLINE:medicine] [DISCIPLINE:nursing] [DISCIPLINE:pharmacy] [DISCIPLINE:paramedicine] [DISCIPLINE:mixed]
Then write your normal response below it.`;

const DISC_STYLES = {
  unknown:      { label: "Inferring discipline", backgroundColor: "#F3F4F6", color: "#6B7280" },
  medicine:     { label: "Medicine",             backgroundColor: "#EFF6FF", color: "#3B82F6" },
  nursing:      { label: "Nursing",              backgroundColor: "#F0FDF4", color: "#16A34A" },
  pharmacy:     { label: "Pharmacy",             backgroundColor: "#FAF5FF", color: "#9333EA" },
  paramedicine: { label: "Paramedicine",         backgroundColor: "#FFFBEB", color: "#D97706" },
  mixed:        { label: "Mixed disciplines",    backgroundColor: "#EFF6FF", color: "#3B82F6" },
};

function parseResponse(raw) {
  var match = raw.match(/^\[DISCIPLINE:([a-z]+)\]\n?/);
  var disc = match ? match[1] : "unknown";
  var content = raw.replace(/^\[DISCIPLINE:[a-z]+\]\n?/, "").trim();
  var hasRedFlag = /red flag:/i.test(content);
  return { disc: disc, content: content, hasRedFlag: hasRedFlag };
}

export default function Home() {
  var [messages, setMessages] = useState([
    { role: "assistant", content: "Hello. I am Agent 31.\n\nTell me what you are studying or share a case, and we will get started.", disc: "unknown", hasRedFlag: false }
  ]);
  var [input, setInput] = useState("");
  var [loading, setLoading] = useState(false);
  var [discipline, setDiscipline] = useState("unknown");
  var [redFlagActive, setRedFlagActive] = useState(false);
  var [apiError, setApiError] = useState(null);
  var bottomRef = useRef(null);

  useEffect(function() {
    if (bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, loading]);

  function send() {
    if (!input.trim() || loading) return;
    var userMsg = { role: "user", content: input.trim() };
    var next = messages.concat([userMsg]);
    setMessages(next);
    setInput("");
    setApiError(null);
    setLoading(true);

    var apiMessages = next.map(function(m) { return { role: m.role, content: m.content }; });

    fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model: "claude-sonnet-4-6", max_tokens: 1000, system: SYSTEM_PROMPT, messages: apiMessages })
    })
    .then(function(res) {
      return res.json().then(function(data) { return { res: res, data: data }; });
    })
    .then(function(obj) {
      if (!obj.res.ok) {
        setApiError("Error " + obj.res.status + ": " + (obj.data.error ? obj.data.error.message : JSON.stringify(obj.data)));
        setLoading(false);
        return;
      }
      var raw = obj.data.content && obj.data.content[0] ? obj.data.content[0].text : "No response returned.";
      var parsed = parseResponse(raw);
      setDiscipline(parsed.disc);
      if (parsed.hasRedFlag) setRedFlagActive(true);
      setMessages(function(prev) { return prev.concat([{ role: "assistant", content: parsed.content, disc: parsed.disc, hasRedFlag: parsed.hasRedFlag }]); });
      setLoading(false);
    })
    .catch(function(err) {
      setApiError("Network error: " + err.message);
      setLoading(false);
    });
  }

  function onKey(e) {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); }
  }

  var d = DISC_STYLES[discipline] || DISC_STYLES.unknown;
  var exchanges = messages.filter(function(m) { return m.role === "user"; }).length;
  var canSend = !loading && input.trim().length > 0;

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "#F9FAFB", display: "flex", alignItems: "center", justifyContent: "center", padding: "24px", fontFamily: "-apple-system, BlinkMacSystemFont, Segoe UI, sans-serif" }}>
      <div style={{ width: "100%", maxWidth: "700px", height: "80vh", display: "flex", flexDirection: "column", backgroundColor: "#FFFFFF", border: "1px solid #E5E7EB", borderRadius: "16px", overflow: "hidden" }}>

        <div style={{ padding: "14px 20px", borderBottom: "1px solid #E5E7EB", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div style={{ width: "36px", height: "36px", borderRadius: "10px", backgroundColor: "#EFF6FF", border: "1px solid #BFDBFE", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "13px", fontWeight: "600", color: "#3B82F6" }}>31</div>
            <div>
              <div style={{ fontSize: "15px", fontWeight: "600", color: "#111827" }}>Agent 31</div>
              <div style={{ fontSize: "12px", color: "#9CA3AF" }}>Healthcare exam preparation</div>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            {redFlagActive && (
              <span style={{ padding: "4px 10px", borderRadius: "6px", backgroundColor: "#FEF2F2", color: "#DC2626", border: "1px solid #FECACA", fontSize: "12px", fontWeight: "500" }}>Red flag</span>
            )}
            <span style={{ padding: "4px 10px", borderRadius: "6px", backgroundColor: d.backgroundColor, color: d.color, fontSize: "12px", fontWeight: "500" }}>{d.label}</span>
            <span style={{ fontSize: "12px", color: "#9CA3AF" }}>{exchanges} {exchanges === 1 ? "exchange" : "exchanges"}</span>
          </div>
        </div>

        <div style={{ padding: "6px 20px", borderBottom: "1px solid #F3F4F6", backgroundColor: "#FAFAFA", display: "flex", gap: "10px", fontSize: "11px", color: "#9CA3AF", flexShrink: 0, flexWrap: "wrap" }}>
          <span>Definitions given directly</span>
          <span>·</span>
          <span>Clinical answers withheld</span>
          <span>·</span>
          <span>Red flags stated outright</span>
          <span>·</span>
          <span>Discipline inferred from context</span>
        </div>

        {apiError && (
          <div style={{ padding: "10px 20px", backgroundColor: "#FEF2F2", borderBottom: "1px solid #FECACA", fontSize: "13px", color: "#DC2626", flexShrink: 0 }}>{apiError}</div>
        )}

        <div style={{ flex: 1, overflowY: "auto", padding: "20px", display: "flex", flexDirection: "column", gap: "14px" }}>
          {messages.map(function(msg, i) {
            return (
              <div key={i} style={{ display: "flex", flexDirection: msg.role === "user" ? "row-reverse" : "row", alignItems: "flex-start", gap: "10px" }}>
                {msg.role === "assistant" && (
                  <div style={{ width: "28px", height: "28px", borderRadius: "8px", backgroundColor: "#EFF6FF", border: "1px solid #BFDBFE", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "10px", fontWeight: "600", color: "#3B82F6", flexShrink: 0 }}>31</div>
                )}
                <div style={{ maxWidth: "78%", padding: "11px 15px", borderRadius: msg.role === "user" ? "14px 4px 14px 14px" : "4px 14px 14px 14px", backgroundColor: msg.role === "user" ? "#EFF6FF" : "#F9FAFB", border: "1px solid " + (msg.role === "user" ? "#BFDBFE" : (msg.hasRedFlag ? "#FECACA" : "#E5E7EB")), fontSize: "14px", lineHeight: "1.65", color: msg.role === "user" ? "#1D4ED8" : "#111827", whiteSpace: "pre-wrap" }}>
                  {msg.hasRedFlag && (
                    <div style={{ fontSize: "12px", color: "#DC2626", fontWeight: "500", marginBottom: "6px" }}>Safety-critical content flagged</div>
                  )}
                  {msg.content}
                </div>
              </div>
            );
          })}
          {loading && (
            <div style={{ display: "flex", alignItems: "flex-start", gap: "10px" }}>
              <div style={{ width: "28px", height: "28px", borderRadius: "8px", backgroundColor: "#EFF6FF", border: "1px solid #BFDBFE", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "10px", fontWeight: "600", color: "#3B82F6", flexShrink: 0 }}>31</div>
              <div style={{ padding: "13px 16px", borderRadius: "4px 14px 14px 14px", backgroundColor: "#F9FAFB", border: "1px solid #E5E7EB", color: "#9CA3AF", fontSize: "14px" }}>Thinking...</div>
            </div>
          )}
          <div ref={bottomRef}></div>
        </div>

        <div style={{ padding: "14px 16px", borderTop: "1px solid #E5E7EB", backgroundColor: "#FFFFFF", display: "flex", gap: "10px", alignItems: "flex-end", flexShrink: 0 }}>
          <textarea
            value={input}
            onChange={function(e) { setInput(e.target.value); }}
            onKeyDown={onKey}
            placeholder="Ask a question or present a case..."
            rows={2}
            style={{ flex: 1, resize: "none", padding: "10px 14px", fontSize: "14px", lineHeight: "1.5", fontFamily: "-apple-system, BlinkMacSystemFont, Segoe UI, sans-serif", backgroundColor: "#F9FAFB", border: "1px solid #D1D5DB", borderRadius: "10px", color: "#111827", outline: "none" }}
          />
          <button
            onClick={send}
            disabled={!canSend}
            style={{ height: "44px", padding: "0 20px", borderRadius: "10px", backgroundColor: canSend ? "#3B82F6" : "#F3F4F6", border: "none", color: canSend ? "#FFFFFF" : "#9CA3AF", fontSize: "14px", fontWeight: "500", cursor: canSend ? "pointer" : "not-allowed" }}
          >Send</button>
        </div>

      </div>
    </div>
  );
}
