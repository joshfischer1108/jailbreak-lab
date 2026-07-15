import AgentInjection from "./AgentInjection";
import type { ModelState } from "../lib/models";

// The agent-injection surface as its own page (reached via #/agent).
export default function AgentPage({ modelState }: { modelState: ModelState }) {
  return (
    <>
      <div className="page-nav section">
        <a href="#/" className="back-link mono">← Back to the lab</a>
      </div>
      <AgentInjection modelState={modelState} />
    </>
  );
}
