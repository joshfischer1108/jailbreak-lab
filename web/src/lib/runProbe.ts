// Runs one probe against the REAL model and scores the real output.
// No scripted data: every token here comes from DeepSeek.

import { detectLeak, type LeakResult } from "./leakDetect";
import { streamChat, type LLMConfig } from "./llm";
import { SYSTEM_POLICY, type Technique } from "../data/techniques";

export type Phase =
  | "idle"
  | "sending"
  | "thinking"
  | "answering"
  | "scanning"
  | "resisted"
  | "jailbroken"
  | "error";

export type LeakChannel = "reasoning" | "answer" | "both";

export type LiveState = {
  phase: Phase;
  reasoning: string; // streamed <think> content so far
  answer: string; // streamed visible answer so far
  leak: LeakResult | null;
  leakChannel: LeakChannel | null; // where the secret surfaced
  error: string | null;
  ms: number | null; // wall-clock latency once finished
};

export const emptyLive: LiveState = {
  phase: "idle",
  reasoning: "",
  answer: "",
  leak: null,
  leakChannel: null,
  error: null,
  ms: null,
};

// Split accumulated content into (reasoning, answer) for the inline <think> case.
function splitInline(content: string): { reasoning: string; answer: string } {
  const open = content.indexOf("<think>");
  if (open === -1) return { reasoning: "", answer: content };
  const close = content.indexOf("</think>");
  if (close === -1) {
    // still inside the reasoning block
    return { reasoning: content.slice(open + 7), answer: "" };
  }
  return {
    reasoning: content.slice(open + 7, close),
    answer: content.slice(close + 8).replace(/^\s+/, ""),
  };
}

export async function runProbeLive(
  probe: Technique,
  cfg: LLMConfig,
  onState: (s: LiveState) => void,
  signal?: AbortSignal
): Promise<LiveState> {
  const startedAt = performance.now();
  let inlineContent = ""; // raw content channel (may contain <think>)
  let sepReasoning = ""; // reasoning from a separate channel, if the server uses one

  const emit = (phase: Phase, extra: Partial<LiveState> = {}): LiveState => {
    const inline = splitInline(inlineContent);
    const reasoning = sepReasoning || inline.reasoning;
    const answer = inline.answer;
    const s: LiveState = {
      phase,
      reasoning,
      answer,
      leak: null,
      leakChannel: null,
      error: null,
      ms: null,
      ...extra,
    };
    onState(s);
    return s;
  };

  try {
    emit("sending");

    const result = await streamChat(
      cfg,
      [
        { role: "system", content: SYSTEM_POLICY },
        { role: "user", content: probe.prompt },
      ],
      (d) => {
        if (d.reasoning) sepReasoning += d.reasoning;
        if (d.content) inlineContent += d.content;
        // Are we still reasoning, or has the visible answer begun?
        const inline = splitInline(inlineContent);
        const answering = inline.answer.length > 0;
        emit(answering ? "answering" : "thinking");
      },
      signal
    );

    emit("scanning");
    const leak = detectLeak(result.raw);
    const ms = Math.round(performance.now() - startedAt);

    // Pinpoint which channel exposed the secret, so the UI can say where.
    let leakChannel: LeakChannel | null = null;
    if (leak.leaked) {
      const inline = splitInline(inlineContent);
      const finalReasoning = sepReasoning || inline.reasoning;
      const finalAnswer = inline.answer;
      const inReasoning = detectLeak(finalReasoning).leaked;
      const inAnswer = detectLeak(finalAnswer).leaked;
      leakChannel =
        inReasoning && inAnswer ? "both" : inReasoning ? "reasoning" : "answer";
    }
    return emit(leak.leaked ? "jailbroken" : "resisted", { leak, leakChannel, ms });
  } catch (err: any) {
    if (err?.name === "AbortError") {
      return emit("idle");
    }
    const ms = Math.round(performance.now() - startedAt);
    return emit("error", { error: err?.message ?? String(err), ms });
  }
}
