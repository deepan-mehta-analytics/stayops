// ── AI slide-over panel ────────────────────────────────────
"use client";                                                            // client component — manages stream state

import { useState } from "react";                                        // local state hook
import { Sparkles } from "lucide-react";                                 // empty-state icon

// ── Types ─────────────────────────────────────────────────
type PanelState = "idle" | "streaming" | "proposal";                    // three states of the AI panel

type StreamEvent =                                                       // events emitted by /api/ai/analyze
  | { type: "text"; content: string }                                   // text token from Claude
  | { type: "tool_call_start"; name: string }                           // tool being called
  | { type: "proposal"; action: string; confidence: number; reasoningSummary: string } // final proposal
  | { type: "done" };                                                   // stream complete

export interface ConflictSlideOverProps {
  flag: {                                                                // flag to analyse (null = closed)
    id: string;                                                          // flag UUID
    type: string;                                                        // conflict type
    reason: string | null;                                               // rule-based reason text
    bookingIds: string[];                                                // involved booking UUIDs
  } | null;
  onClose: () => void;                                                   // called when dismissed
  onResolved: () => void;                                                // called after successful Accept — triggers page refresh
}

// ── Confidence badge colour ────────────────────────────────
function confidenceClass(confidence: number): string {                  // returns Tailwind class string
  if (confidence >= 90) return "bg-violet-100 text-violet-700";         // high confidence — violet
  if (confidence >= 70) return "bg-amber-100 text-amber-700";           // medium confidence — amber
  return "bg-red-100 text-red-700";                                      // low confidence — red
}

// ── Component ─────────────────────────────────────────────
export default function ConflictSlideOver({ flag, onClose, onResolved }: ConflictSlideOverProps) {
  const [panelState, setPanelState] = useState<PanelState>("idle");     // current panel state
  const [streamText, setStreamText] = useState("");                      // accumulated Claude reasoning text
  const [toolChips,  setToolChips]  = useState<string[]>([]);           // tool call chip labels
  const [proposal,   setProposal]   = useState<{                        // final proposal from Claude
    action: string;                                                      // proposed action text
    confidence: number;                                                  // 0–100 confidence score
    reasoningSummary: string;                                            // brief reasoning
  } | null>(null);

  // ── Glassmorphism inline styles (shared across all states) ──
  const panelStyle: React.CSSProperties = {
    background:     "rgba(255, 255, 255, 0.92)",                        // translucent white
    backdropFilter: "blur(16px)",                                        // frosted glass blur
    borderLeft:     "1px solid rgba(124, 58, 237, 0.25)",               // subtle violet left border
    boxShadow:      "-4px 0 24px rgba(0, 0, 0, 0.10)",                  // leftward shadow
  };

  // ── Empty state — no flag selected yet ────────────────
  if (!flag) {
    return (
      <div
        className="w-80 flex-shrink-0 flex flex-col p-4 gap-3 rounded-r-lg"
        style={panelStyle}
      >
        <p className="text-xs font-bold text-violet-700 uppercase tracking-widest">✦ AI Analysis</p>
        <div className="flex flex-col items-center justify-center gap-4 py-10 text-center">
          <div className="w-12 h-12 rounded-full bg-violet-50 border border-violet-200 flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-violet-400" />
          </div>
          <div className="flex flex-col gap-2">
            <p className="text-sm font-semibold text-zinc-700">No conflict selected</p>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Click <span className="font-semibold text-violet-600">⚡ Analyze</span> on any conflict row to run Claude AI analysis on that booking conflict.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const currentFlag = flag;                                              // non-nullable alias after guard

  // ── Start streaming analysis ───────────────────────────
  async function handleAnalyze() {
    setPanelState("streaming");                                          // transition to streaming state
    setStreamText("");                                                   // clear previous reasoning
    setToolChips([]);                                                    // clear previous chips
    setProposal(null);                                                   // clear previous proposal

    const res = await fetch("/api/ai/analyze", {                        // call the streaming route
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ flagId: currentFlag.id }),               // send flag ID
    });

    if (!res.ok || !res.body) return;                                    // guard: abort on failure

    const reader  = res.body.getReader();                               // streaming reader
    const decoder = new TextDecoder();                                   // UTF-8 byte decoder
    let   buffer  = "";                                                  // incomplete line buffer

    while (true) {
      const { done, value } = await reader.read();                      // read next chunk
      if (done) break;                                                   // stream ended
      buffer += decoder.decode(value, { stream: true });                // decode bytes to string
      const lines = buffer.split("\n");                                  // split on newlines
      buffer = lines.pop() ?? "";                                        // keep last incomplete line
      for (const line of lines) {                                        // process complete lines
        if (!line.trim()) continue;                                      // skip blank lines
        try {
          const event = JSON.parse(line) as StreamEvent;                // parse JSON event
          if (event.type === "text") {
            setStreamText((prev) => prev + event.content);              // append text token
          } else if (event.type === "tool_call_start") {
            setToolChips((prev) => [...prev, `⚡ ${event.name}(...)`]); // add chip label
          } else if (event.type === "proposal") {
            setProposal({ action: event.action, confidence: event.confidence, reasoningSummary: event.reasoningSummary });
            setPanelState("proposal");                                   // transition to proposal state
          }
        } catch {
          // skip malformed lines — stream may have trailing non-JSON
        }
      }
    }
  }

  // ── Accept the proposal ────────────────────────────────
  async function handleAccept() {
    if (!proposal) return;                                               // guard: proposal must exist

    await fetch("/api/ai/resolve", {                                     // call the resolve route
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ flagId: currentFlag.id, proposedAction: proposal.action, confidence: proposal.confidence }),
    });

    onResolved();                                                        // trigger parent to refresh page
  }

  // ── Dismiss with feedback ──────────────────────────────
  async function handleFeedback(feedback: "correct" | "wrong") {
    await fetch("/api/ai/feedback", {                                    // call the feedback route
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ flagId: currentFlag.id, userFeedback: feedback }), // send feedback label
    });
    onClose();                                                           // close without resolving
  }

  return (
    <div
      className="w-80 flex-shrink-0 flex flex-col p-4 gap-3 rounded-r-lg overflow-y-auto max-h-[70vh]"  // fixed-width scrollable panel
      style={panelStyle}                                                  // glassmorphism (inline)
    >

      {/* ── State 1: Idle ───────────────────────────── */}
      {panelState === "idle" && (
        <>
          <p className="text-xs font-bold text-violet-700 uppercase tracking-widest">✦ AI Analysis</p>
          <p className="text-xs font-semibold text-zinc-800 capitalize">{flag.type.replace(/_/g, " ")}</p>  {/* humanise type */}
          <div className="rounded-md border border-zinc-200 bg-zinc-50 p-2 text-xs text-zinc-600 leading-relaxed">
            {flag.reason ?? "No rule-based reason available."}          {/* show existing reason */}
          </div>
          {process.env.NEXT_PUBLIC_ENABLE_AI_AGENT === "true" && (      /* feature flag gate */
            <button
              onClick={handleAnalyze}                                    // trigger stream
              className="w-full rounded-md bg-violet-600 py-2 text-xs font-semibold text-white hover:bg-violet-700 transition-colors"
            >
              Analyze with AI ✦
            </button>
          )}
        </>
      )}

      {/* ── State 2: Streaming ──────────────────────── */}
      {panelState === "streaming" && (
        <>
          <div className="flex items-center gap-2">                      {/* header + dots */}
            <p className="text-xs font-bold text-violet-700 uppercase tracking-widest">Claude is thinking</p>
            <span className="flex gap-1">                               {/* pulsing dots */}
              <span className="w-1.5 h-1.5 rounded-full bg-violet-600 animate-pulse" />
              <span className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-pulse [animation-delay:0.2s]" />
              <span className="w-1.5 h-1.5 rounded-full bg-violet-200 animate-pulse [animation-delay:0.4s]" />
            </span>
          </div>
          {toolChips.map((chip, i) => (                                  /* tool call chips */
            <span
              key={i}                                                    // index stable (chips only accumulate)
              className="rounded px-2 py-1 text-xs bg-violet-100 border border-violet-300 text-violet-700"
            >
              {chip}
            </span>
          ))}
          <div className="rounded-md border border-zinc-200 bg-zinc-50 p-2 text-xs text-zinc-700 leading-relaxed min-h-[80px]">
            {streamText}
            <span className="border-r border-violet-600 animate-pulse ml-0.5">&nbsp;</span>  {/* blinking cursor */}
          </div>
        </>
      )}

      {/* ── State 3: Proposal ready ──────────────────── */}
      {panelState === "proposal" && proposal && (
        <>
          <p className="text-xs font-bold text-violet-700 uppercase tracking-widest">✦ Claude&apos;s analysis</p>
          <div className="rounded-md border border-zinc-200 bg-zinc-50 p-2 text-xs text-zinc-700 leading-relaxed max-h-36 overflow-y-auto">
            {streamText}                                                  {/* full reasoning text, scrollable */}
          </div>
          <span className={`self-start rounded-full px-2 py-0.5 text-xs font-semibold ${confidenceClass(proposal.confidence)}`}>
            {proposal.confidence}% confident                             {/* colour-coded confidence badge */}
          </span>
          {proposal.confidence < 70 && (                                 /* low-confidence advisory */
            <p className="text-xs text-red-600">Consider manual review before accepting.</p>
          )}
          <div className="rounded-md border border-violet-300 bg-violet-50 p-3 flex flex-col gap-1">
            <p className="text-xs font-bold text-violet-700">Proposed action</p>
            <p className="text-xs text-violet-900 leading-relaxed">{proposal.action}</p>  {/* action text */}
          </div>
          <div className="flex gap-2">                                   {/* action buttons */}
            <button
              onClick={handleAccept}                                     // accept: resolves flag + refreshes page
              className="flex-[2] rounded-md bg-violet-600 py-2 text-xs font-bold text-white hover:bg-violet-700 transition-colors"
            >
              Accept ✓
            </button>
            <button
              onClick={() => handleFeedback("correct")}                  // Claude was right but dismissing
              title="Claude was right"
              className="flex-1 rounded-md bg-zinc-100 py-2 text-sm hover:bg-zinc-200 transition-colors"
            >
              👍
            </button>
            <button
              onClick={() => handleFeedback("wrong")}                    // Claude was wrong
              title="Claude was wrong"
              className="flex-1 rounded-md bg-zinc-100 py-2 text-sm hover:bg-zinc-200 transition-colors"
            >
              👎
            </button>
          </div>
        </>
      )}

    </div>
  );
}
