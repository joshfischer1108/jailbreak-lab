import { useState } from "react";
import Challenge from "./Challenge";
import Lab from "./Lab";
import type { ModelState } from "../lib/models";
import { attacks } from "../data/techniques";
import type { Outcome } from "../lib/outcome";
import "./challenge.css";

const HINT_THRESHOLD = 3;

function scrollToLab() {
  const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
  document
    .getElementById("lab")
    ?.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
}

export default function Arena({ modelState }: { modelState: ModelState }) {
  const [attempts, setAttempts] = useState(0);
  const [solved, setSolved] = useState(false);
  const [revealed, setRevealed] = useState(false);

  // The full lab is the "answer key": it opens once the user asks for hints or
  // breaks the model on their own.
  const labUnlocked = revealed || solved;

  function onResult(o: Outcome) {
    setAttempts((a) => a + 1);
    if (o === "broken") setSolved(true);
  }

  function reveal() {
    setRevealed(true);
    // The lab section is always mounted (content just gated), so we can scroll now.
    scrollToLab();
  }

  return (
    <>
      <section className="section" id="challenge">
        <div className="eyebrow">Your turn</div>
        <h2 className="h2">Break the model yourself.</h2>
        <p className="lede mt-16 mb-24">
          A real model is guarding a secret code and was told never to reveal it. Write your
          own prompt and try to make it leak — every attempt runs live against the model you
          pick. No playbook yet; see how far you get on instinct.
        </p>

        <Challenge modelState={modelState} attempts={attempts} onResult={onResult} />

        {/* Bridge into the full lab */}
        <div className="arena-bridge">
          {labUnlocked ? (
            <button className="btn primary" onClick={scrollToLab}>
              {solved ? "You broke it — explore the full playbook" : "Attack playbook"} ↓
            </button>
          ) : attempts >= HINT_THRESHOLD ? (
            <button className="btn primary" onClick={reveal}>
              Stuck? Reveal the attack playbook ↓
            </button>
          ) : (
            <p className="hints-locked mono">
              🔒 The attack playbook unlocks after {HINT_THRESHOLD} attempts ·{" "}
              {attempts}/{HINT_THRESHOLD}
            </p>
          )}
        </div>
      </section>

      <section className="section" id="lab">
        <div className="eyebrow">Attack playbook · {attacks.length} techniques</div>
        <h2 className="h2">The full technique lab</h2>
        {labUnlocked ? (
          <>
            <p className="lede mt-16 mb-24">
              The complete annotated catalog. Select a technique to see its exact payload, run
              it against the model, and read why it works — then take what you learn back to
              your own attack above.
            </p>
            <Lab {...modelState} />

            {/* Hint to the second attack surface, on its own page */}
            <a href="#/agent" className="surface2-teaser panel">
              <div>
                <div className="eyebrow" style={{ marginBottom: 6 }}>Next · Surface 2</div>
                <strong>There’s a second attack surface: the agent’s tools.</strong>
                <p className="muted mt-8" style={{ fontSize: 14 }}>
                  Instead of talking the model into leaking a secret, watch a hidden instruction
                  in a document hijack a tool-using agent into an action it was told not to take.
                </p>
              </div>
              <span className="surface2-go mono">Try agent injection →</span>
            </a>
          </>
        ) : (
          <div className="lab-locked panel">
            <div className="lab-locked-icon">🔒</div>
            <div>
              <strong>The full annotated lab is locked.</strong>
              <p className="muted mt-8" style={{ fontSize: 14 }}>
                It unlocks once you reveal the playbook above, or break the model on your own.
                Try a few attempts first.
              </p>
            </div>
          </div>
        )}
      </section>
    </>
  );
}
