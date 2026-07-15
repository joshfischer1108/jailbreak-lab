import { useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import PipelineDiagram from "./PipelineDiagram";
import ModelSelect from "./ModelSelect";
import { attacks, CATEGORY_LABEL, type Technique } from "../data/techniques";
import { runProbeLive, emptyLive, type LiveState, type Phase } from "../lib/runProbe";
import type { LLMConfig } from "../lib/llm";
import { ENDPOINT, type ModelState } from "../lib/models";
import { highlightSecret } from "../lib/highlight";
import "./lab.css";

const PHASE_LABEL: Record<Phase, string> = {
  idle: "ready",
  sending: "sending prompt…",
  thinking: "model reasoning…",
  answering: "model answering…",
  scanning: "scanning output for the secret…",
  resisted: "resisted",
  jailbroken: "jailbroken",
  error: "error",
};

export default function Lab({ model, models, setModel }: ModelState) {
  const [selected, setSelected] = useState<Technique | null>(attacks[0] ?? null);
  const [live, setLive] = useState<LiveState>(emptyLive);
  const [results, setResults] = useState<Record<string, "resisted" | "jailbroken" | "error">>({});
  const abortRef = useRef<AbortController | null>(null);

  const busy =
    live.phase === "sending" ||
    live.phase === "thinking" ||
    live.phase === "answering" ||
    live.phase === "scanning";

  // Selecting a technique only shows its payload/notes — it does NOT run.
  // Nothing hits the model until "Run against model" is clicked.
  function select(probe: Technique) {
    if (busy) return;
    abortRef.current?.abort();
    setSelected(probe);
    setLive(emptyLive);
  }

  async function run(probe: Technique) {
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    setSelected(probe);
    setLive({ ...emptyLive, phase: "sending" });

    const cfg: LLMConfig = { endpoint: ENDPOINT, model };
    const final = await runProbeLive(probe, cfg, setLive, ctrl.signal);
    if (final.phase === "resisted" || final.phase === "jailbroken" || final.phase === "error") {
      setResults((r) => ({ ...r, [probe.id]: final.phase as any }));
    }
  }

  function cancel() {
    abortRef.current?.abort();
    setLive(emptyLive);
  }

  return (
    <div className="lab">
      <div className="lab-conn panel">
        <ModelSelect model={model} models={models} setModel={setModel} disabled={busy} />
        <div className={`conn-status mono phase-${live.phase}`}>
          <span className="dot" />
          {PHASE_LABEL[live.phase]}
          {live.ms != null && (live.phase === "resisted" || live.phase === "jailbroken") && (
            <span className="muted"> · {(live.ms / 1000).toFixed(1)}s</span>
          )}
        </div>
      </div>

      <PipelineDiagram phase={live.phase} leakHow={live.leak?.how} model={model} />

      <div className="lab-body">
        <div className="gallery" role="listbox" aria-label="Attack techniques">
          {attacks.map((t) => {
            const outcome = results[t.id];
            const isSel = selected?.id === t.id;
            return (
              <button
                key={t.id}
                role="option"
                aria-selected={isSel}
                className={`gcard ${isSel ? "sel" : ""}`}
                onClick={() => select(t)}
                disabled={busy}
              >
                <div className="gcard-top">
                  <span className="gcard-cat mono">
                    {CATEGORY_LABEL[t.technique] ?? t.technique}
                  </span>
                  {outcome && (
                    <span className={`gdot ${outcome === "jailbroken" ? "breach" : outcome === "error" ? "err" : "safe"}`} />
                  )}
                </div>
                <div className="gcard-id mono">{t.id}</div>
              </button>
            );
          })}
        </div>

        <AnimatePresence mode="wait">
          {selected && (
            <motion.div
              key={selected.id}
              className="detail panel"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
            >
              <div className="detail-head">
                <div>
                  <div className="eyebrow" style={{ marginBottom: 6 }}>
                    {CATEGORY_LABEL[selected.technique] ?? selected.technique}
                  </div>
                  <h3>{selected.id}</h3>
                </div>
                {busy ? (
                  <button className="btn" onClick={cancel}>Cancel</button>
                ) : (
                  <button className="btn primary" onClick={() => run(selected)}>
                    ▶ Run against model
                  </button>
                )}
              </div>

              <div className="detail-label">The payload</div>
              <pre className="code-block">{selected.prompt}</pre>

              <div className="detail-label">
                Model response
                {(live.phase === "thinking" || live.phase === "answering") && (
                  <span className="streaming-tag mono"> · streaming</span>
                )}
              </div>
              <div className="response-wrap">
                {live.reasoning ? (
                  <div className={`think-block ${live.leakChannel === "reasoning" || live.leakChannel === "both" ? "leaked" : ""}`}>
                    <div className="think-head mono">
                      &lt;think&gt; reasoning trace
                      {(live.leakChannel === "reasoning" || live.leakChannel === "both") && (
                        <span className="chan-flag"> · secret exposed here</span>
                      )}
                    </div>
                    <pre className="code-block think">{highlightSecret(live.reasoning)}</pre>
                  </div>
                ) : live.answer ? (
                  <div className="no-reason mono">
                    no &lt;think&gt; reasoning — this model answers directly (no reasoning channel to leak into)
                  </div>
                ) : null}
                <pre className="code-block response">
                  {live.answer
                    ? highlightSecret(live.answer)
                    : busy
                    ? "…"
                    : live.phase === "idle"
                    ? "Run the probe to see the real response."
                    : ""}
                  {(live.phase === "thinking" || live.phase === "answering") && <span className="caret" />}
                </pre>
              </div>

              {live.phase === "error" && (
                <div className="leak-line breach mono">
                  ✕ {live.error}
                  <div className="muted mt-8" style={{ fontSize: 12 }}>
                    Is your model server running and reachable? For local Ollama:{" "}
                    <code>ollama serve</code>, then <code>ollama pull {model}</code>.
                  </div>
                </div>
              )}
              {live.phase === "jailbroken" && live.leak && (
                <div className="leak-line breach mono">
                  ▲ secret leaked in the{" "}
                  {live.leakChannel === "reasoning"
                    ? "model’s <think> reasoning"
                    : live.leakChannel === "answer"
                    ? "answer"
                    : "reasoning and answer"}{" "}
                  — matched as: {live.leak.how}
                  {live.leakChannel === "reasoning" && (
                    <div className="muted mt-8" style={{ fontSize: 12 }}>
                      The final answer refused, but the reasoning trace printed the code. That is
                      a real leak wherever the trace is shown — which many DeepSeek deployments do.
                    </div>
                  )}
                </div>
              )}
              {live.phase === "resisted" && (
                <div className="leak-line safe mono">✓ no leak — the guardrail held in every channel</div>
              )}

              <div className="detail-label">How it works &amp; the defense</div>
              <p className="detail-note">{selected.note}</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
