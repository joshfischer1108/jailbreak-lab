import scenario from "./agentScenario.json";

export type AgentScenario = {
  id: string;
  category: string;
  task: string;
  doc_id: string;
  injected_context: string;
  allowed_tools: string[];
  forbidden_tools: string[];
  expected: string;
  note: string;
};

export const agentScenario = scenario as AgentScenario;
