import { useLayoutEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { Phase } from "../lib/runProbe";
import "./pipeline.css";

const NODES = [
  { key: "attacker", label: "Attacker", sub: "crafted prompt" },
  { key: "policy", label: "System policy", sub: "never reveal ●" },
  { key: "model", label: "model", sub: "under test" },
  { key: "detector", label: "Leak detector", sub: "normalize / b64 / think-scan" },
  { key: "verdict", label: "Verdict", sub: "resist or breach" },
];

// Turn an Ollama model id into a readable node title, with a graceful fallback
// so any model works. "deepseek-r1:latest" -> "DeepSeek R1", "mistral:7b" -> "Mistral 7B".
function prettyModel(id: string): string {
  const base = id.replace(/:latest$/i, "");
  const [name, tag] = base.split(":");
  const map: [RegExp, string][] = [
    [/^deepseek-r1/i, "DeepSeek R1"],
    [/^deepseek/i, "DeepSeek"],
    [/^llama3\.1/i, "Llama 3.1"],
    [/^llama3\.2/i, "Llama 3.2"],
    [/^llama3/i, "Llama 3"],
    [/^codellama/i, "Code Llama"],
    [/^mistral-small/i, "Mistral Small"],
    [/^mistral/i, "Mistral"],
    [/^qwen/i, "Qwen"],
    [/^phi/i, "Phi"],
    [/^gemma/i, "Gemma"],
  ];
  let display = name;
  for (const [re, label] of map) {
    if (re.test(name)) { display = label; break; }
  }
  return tag ? `${display} ${tag.toUpperCase()}` : display;
}

// Map a real model phase onto the furthest pipeline node reached.
function stageFor(phase: Phase): number {
  switch (phase) {
    case "idle": return -1;
    case "sending": return 1;
    case "thinking":
    case "answering":
    case "error": return 2;
    case "scanning": return 3;
    case "resisted":
    case "jailbroken": return 4;
    default: return -1;
  }
}

export default function PipelineDiagram({
  phase,
  leakHow,
  model,
}: {
  phase: Phase;
  leakHow?: string;
  model: string;
}) {
  const modelLabel = prettyModel(model);
  const containerRef = useRef<HTMLDivElement>(null);
  const nodeRefs = useRef<(HTMLDivElement | null)[]>([]);
  const [centers, setCenters] = useState<number[]>([]);

  const stage = stageFor(phase);
  const breached = phase === "jailbroken";
  const errored = phase === "error";
  const streaming = phase === "thinking" || phase === "answering";
  const done = phase === "resisted" || phase === "jailbroken";

  useLayoutEffect(() => {
    const measure = () => {
      const c = containerRef.current;
      if (!c) return;
      const base = c.getBoundingClientRect().left;
      setCenters(
        nodeRefs.current.map((n) => {
          if (!n) return 0;
          const r = n.getBoundingClientRect();
          return r.left - base + r.width / 2;
        })
      );
    };
    measure();
    const ro = new ResizeObserver(measure);
    if (containerRef.current) ro.observe(containerRef.current);
    window.addEventListener("resize", measure);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, []);

  const tokenX = centers[Math.max(0, stage)] ?? 0;
  const tokenColor = breached ? "var(--breach)" : errored ? "var(--text-faint)" : "var(--canary)";
  const active = (i: number) => stage >= i;
  const wireActive = (i: number) => stage >= i + 1;

  return (
    <div className="pipeline panel" ref={containerRef}>
      <div className="pipeline-row">
        {NODES.map((n, i) => (
          <div key={n.key} className="pipeline-cell">
            {i > 0 && (
              <div className={`wire ${wireActive(i - 1) ? "on" : ""} ${breached && i >= 3 ? "breach" : ""}`}>
                <span className="wire-pulse" />
              </div>
            )}
            <div
              ref={(el) => { nodeRefs.current[i] = el; }}
              className={[
                "node",
                `node-${n.key}`,
                active(i) ? "active" : "",
                streaming && n.key === "model" ? "streaming" : "",
                errored && n.key === "model" ? "error" : "",
                breached && n.key === "model" ? "breach" : "",
                breached && n.key === "verdict" ? "breach" : "",
                done && !breached && n.key === "verdict" ? "safe" : "",
                stage >= 2 && !breached && n.key === "policy" ? "shield" : "",
                phase === "scanning" && n.key === "detector" ? "scanning" : "",
              ].join(" ")}
            >
              <div className="node-label">
                {n.key === "model" ? modelLabel : n.label}
                {streaming && n.key === "model" && <span className="live-dot" />}
              </div>
              <div className="node-sub mono">{n.key === "model" ? model : n.sub}</div>
              {n.key === "verdict" && done && (
                <div className={`verdict-badge ${breached ? "breach" : "safe"}`}>
                  {breached ? "BREACH" : "RESISTED"}
                </div>
              )}
              {n.key === "model" && errored && (
                <div className="verdict-badge breach">ERROR</div>
              )}
            </div>
          </div>
        ))}
      </div>

      <AnimatePresence>
        {stage >= 0 && stage < 4 && !errored && (
          <motion.div
            className="token-fly"
            initial={{ opacity: 0 }}
            animate={{ x: tokenX - 9, opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ type: "spring", stiffness: 120, damping: 18 }}
            style={{ background: tokenColor, boxShadow: `0 0 18px ${tokenColor}` }}
          />
        )}
      </AnimatePresence>

      {breached && stage >= 3 && leakHow && (
        <div className="detector-note mono">caught: {leakHow}</div>
      )}
    </div>
  );
}
