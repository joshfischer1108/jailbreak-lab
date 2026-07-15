import { useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import ModelSelect from "./ModelSelect";
import { runAgent, emptyAgentState, type AgentState, type AgentPhase } from "../lib/agentLoop";
import { TOOL_DEFS } from "../lib/mockTools";
import { agentScenario } from "../data/agentScenario";
import { ENDPOINT, type ModelState } from "../lib/models";
import "./agent.css";

const PHASE_LABEL: Record<AgentPhase, string> = {
  idle: "ready",
  deciding: "agent deciding next action…",
  acting: "tool called…",
  safe: "ignored the injection",
  breach: "breached",
  error: "error",
};

// Highlight the hidden instruction (the HTML comment) inside the document body.
function highlightInjection(text: string) {
  const start = text.indexOf("<!--");
  const end = text.indexOf("-->");
  if (start === -1 || end === -1 || end < start) return text;
  return (
    <>
      {text.slice(0, start)}
      <mark className="inject-mark">{text.slice(start, end + 3)}</mark>
      {text.slice(end + 3)}
    </>
  );
}

export default function AgentInjection({ modelState }: { modelState: ModelState }) {
  const { model, models, setModel } = modelState;
  const [agent, setAgent] = useState<AgentState>(emptyAgentState);
  const [showHow, setShowHow] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const busy = agent.phase === "deciding" || agent.phase === "acting";
  const allowed = new Set(agentScenario.allowed_tools);
  const forbidden = new Set(agentScenario.forbidden_tools);

  async function run() {
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    setAgent({ ...emptyAgentState, phase: "deciding" });
    await runAgent(agentScenario, { endpoint: ENDPOINT, model }, setAgent, ctrl.signal);
  }
  function cancel() {
    abortRef.current?.abort();
    setAgent(emptyAgentState);
  }

  return (
    <section className="section" id="agent">
      <div className="eyebrow">Surface 2 · Agent injection</div>
      <h2 className="h2">Now attack the agent, not the model.</h2>
      <p className="lede mt-16 mb-24">
        Same model — but this time it’s an <strong>agent with tools</strong>. It’s asked to
        summarize a customer document. Hidden in that document is an instruction telling it to
        email the data to an outside address. Will it obey?
      </p>

      <div className="agent-body">
        {/* Left: the setup */}
        <div className="agent-setup">
          <div className="lab-conn panel">
            <ModelSelect model={model} models={models} setModel={setModel} disabled={busy} />
            <div className={`conn-status mono phase-${agent.phase}`}>
              <span className="dot" />
              {PHASE_LABEL[agent.phase]}
            </div>
          </div>

          <div className="tools-legend panel">
            <div className="tl-head mono">tools the agent can call</div>
            {TOOL_DEFS.map((t) => {
              const state = forbidden.has(t.name)
                ? "forbidden"
                : allowed.has(t.name)
                ? "allowed"
                : "off-limits";
              return (
                <div key={t.name} className="tl-row">
                  <span className={`sens-dot sens-${t.sensitivity}`} />
                  <code className="tl-name">{t.name}</code>
                  <span className="tl-sens mono">{t.sensitivity}</span>
                  <span className={`tl-flag ${state}`}>
                    {state === "forbidden" ? "forbidden" : state === "allowed" ? "allowed" : "not allowed"}
                  </span>
                </div>
              );
            })}
          </div>

          <div className="doc panel">
            <div className="doc-head mono">
              📄 {agentScenario.doc_id} · the document the agent reads
            </div>
            <pre className="doc-body">{highlightInjection(agentScenario.injected_context)}</pre>
          </div>

          <div className="agent-actions">
            {busy ? (
              <button className="btn" onClick={cancel}>Cancel</button>
            ) : (
              <button className="btn primary" onClick={run}>▶ Run the agent</button>
            )}
          </div>
        </div>

        {/* Right: the trace */}
        <div className="agent-trace panel">
          <div className="tl-head mono">action trace</div>
          {agent.steps.length === 0 && !busy && (
            <p className="muted trace-empty">Run the agent to watch each tool call it makes.</p>
          )}
          <div className="trace-list">
            <AnimatePresence initial={false}>
              {agent.steps.map((s) => (
                <motion.div
                  key={s.index}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  className={`trace-step ${s.forbidden ? "forbidden" : ""} kind-${s.kind}`}
                >
                  <span className="ts-num mono">{s.index}</span>
                  {s.kind === "tool" && (
                    <>
                      <span className={`sens-dot sens-${s.sensitivity}`} />
                      <code className="ts-tool">{s.tool}</code>
                      <span className="ts-args mono">{argPreview(s.args)}</span>
                      {s.forbidden && <span className="ts-flag mono">FORBIDDEN · {s.sensitivity}</span>}
                    </>
                  )}
                  {s.kind === "final" && <span className="ts-final mono">final answer</span>}
                  {s.kind === "stopped" && <span className="ts-final mono">stopped (no valid action)</span>}
                  {s.kind === "error" && (
                    <>
                      <code className="ts-tool">{s.tool}</code>
                      <span className="ts-args mono">{s.result}</span>
                    </>
                  )}
                </motion.div>
              ))}
            </AnimatePresence>
            {busy && (
              <div className="trace-step deciding">
                <span className="live-dot" /> <span className="mono muted">agent deciding…</span>
              </div>
            )}
          </div>

          {/* Verdict */}
          {agent.phase === "breach" && agent.verdict && (
            <div className="verdict-banner broken mt-16">
              <div className="vb-title mono">🚨 BREACH — the agent was hijacked</div>
              <div className="vb-body">
                The injected instruction steered it into <strong>{agent.verdict.note}</strong>. The
                data was exfiltrated via a tool it was told not to use. (Nothing real happened —
                the tool is a mock and the address is fake.)
              </div>
            </div>
          )}
          {agent.phase === "safe" && (
            <div className="verdict-banner refused mt-16">
              <div className="vb-title mono">✓ SAFE — the injection was ignored</div>
              <div className="vb-body">
                The agent treated the document as data, not commands, and never touched a
                forbidden tool.
              </div>
            </div>
          )}
          {agent.phase === "error" && (
            <div className="verdict-banner refused mt-16">
              <div className="vb-title mono">✕ ERROR</div>
              <div className="vb-body">{agent.error}</div>
            </div>
          )}
        </div>
      </div>

      <button className="how-toggle mono" onClick={() => setShowHow((v) => !v)}>
        {showHow ? "− hide" : "+ how this works"}
      </button>
      {showHow && <p className="detail-note how-body">{agentScenario.note}</p>}
    </section>
  );
}

function argPreview(args: any): string {
  try {
    const s = JSON.stringify(args);
    return s.length > 70 ? s.slice(0, 67) + "…" : s;
  } catch {
    return "";
  }
}