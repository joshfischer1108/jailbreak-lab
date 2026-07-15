import { useEffect, useState } from "react";

// The browser always calls the proxy path; dev (Vite) / prod (nginx) forward it
// to the real model server, so there's nothing to configure in the UI.
export const ENDPOINT =
  (import.meta.env.VITE_LLM_ENDPOINT as string) || "/llm/v1/chat/completions";

const DEFAULT_MODEL = (import.meta.env.VITE_LLM_MODEL as string) || "deepseek-r1";

// Shown until (and if) we can read the real installed list from Ollama.
const FALLBACK_MODELS = [
  "deepseek-r1",
  "llama3.1:8b",
  "mistral-small:latest",
  "llama3.2:latest",
];

export type ModelState = {
  model: string;
  setModel: (m: string) => void;
  models: string[];
};

// Shared model selection, so the challenge and the lab agree on one model.
// Populates the list from the models actually installed in Ollama; if the
// backend isn't Ollama (e.g. a hosted API), the /api/tags call 404s and we keep
// the fallback list.
export function useModels(): ModelState {
  const [model, setModel] = useState(DEFAULT_MODEL);
  const [models, setModels] = useState<string[]>(FALLBACK_MODELS);

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
        setModel(preferred);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  return { model, setModel, models };
}
