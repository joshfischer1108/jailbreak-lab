import { useEffect, useState } from "react";

// The browser always calls the proxy path; dev (Vite) / prod (nginx) forward it
// to the real model server, so there's nothing to configure in the UI.
export const ENDPOINT =
  (import.meta.env.VITE_LLM_ENDPOINT as string) || "/llm/v1/chat/completions";

export type ModelState = {
  model: string;
  setModel: (m: string) => void;
  models: string[];
};

// Shared model selection, so the challenge and the lab agree on one model.
// The list is populated only from what Ollama reports via /api/tags; there are
// no hardcoded defaults. If Ollama is unreachable the list stays empty and
// `model` is "" (set VITE_LLM_MODEL to force a model for non-Ollama backends).
export function useModels(): ModelState {
  const [model, setModel] = useState((import.meta.env.VITE_LLM_MODEL as string) || "");
  const [models, setModels] = useState<string[]>([]);

  useEffect(() => {
    let cancelled = false;
    fetch("/llm/api/tags")
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d) => {
        const names: string[] = (d?.models ?? [])
          .map((m: any) => m.name)
          .filter(Boolean);
        if (cancelled || !names.length) return;
        setModels(names);
        const preferred = names.find((n) => n.startsWith("deepseek-r1")) ?? names[0];
        setModel((cur) => (names.includes(cur) ? cur : preferred));
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  return { model, setModel, models };
}
