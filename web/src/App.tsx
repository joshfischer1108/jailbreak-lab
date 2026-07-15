import { useEffect } from "react";
import Hero from "./components/Hero";
import Arena from "./components/Arena";
import AgentPage from "./components/AgentPage";
import { useModels } from "./lib/models";
import { useHashRoute } from "./lib/useHashRoute";
import "./App.css";

export default function App() {
  // One model selection, shared across both attack surfaces (persists on navigation).
  const modelState = useModels();
  const route = useHashRoute();

  // Land at the top when switching pages.
  useEffect(() => {
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    window.scrollTo({ top: 0, behavior: reduce ? "auto" : "smooth" });
  }, [route]);

  return (
    <>
      {route === "agent" ? (
        <AgentPage modelState={modelState} />
      ) : (
        <>
          <Hero />
          {/* Surface 1: blind challenge -> gated hints -> gated full lab */}
          <Arena modelState={modelState} />
        </>
      )}

      <footer className="footer">
        <div className="section section-tight">
          <p className="muted" style={{ fontSize: 13 }}>
            Educational, authorized red teaming only. The secret is fake, the payloads chase a
            canary, and nothing harmful is generated. Test only models you own or are
            permitted to test.
          </p>
        </div>
      </footer>
    </>
  );
}
