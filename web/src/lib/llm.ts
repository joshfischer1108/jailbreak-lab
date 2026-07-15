// Real streaming client for an OpenAI-compatible chat endpoint (Ollama, vLLM,
// LM Studio, DeepSeek API, ...). No scripted data — this streams the actual
// tokens the model produces.

export type ChatMessage = { role: "system" | "user" | "assistant"; content: string };

export type StreamDelta = {
  // Visible answer tokens.
  content?: string;
  // Reasoning tokens, when the server exposes them as a separate channel
  // (some builds do; DeepSeek R1 via Ollama usually inlines <think> in content).
  reasoning?: string;
};

export type StreamResult = {
  content: string; // the visible answer
  reasoning: string; // reasoning captured from a separate channel, if any
  raw: string; // everything the model emitted, reasoning + content, for leak scanning
};

export type LLMConfig = {
  endpoint: string;
  model: string;
  apiKey?: string;
};

// Parse one SSE data line's JSON delta into content/reasoning.
function readDelta(json: any): StreamDelta {
  const choice = json?.choices?.[0];
  const delta = choice?.delta ?? choice?.message ?? {};
  // Different servers name the reasoning field differently.
  const reasoning =
    delta.reasoning_content ?? delta.reasoning ?? undefined;
  return { content: delta.content ?? undefined, reasoning };
}

export async function streamChat(
  cfg: LLMConfig,
  messages: ChatMessage[],
  onDelta: (d: StreamDelta) => void,
  signal?: AbortSignal
): Promise<StreamResult> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (cfg.apiKey) headers["Authorization"] = `Bearer ${cfg.apiKey}`;

  const res = await fetch(cfg.endpoint, {
    method: "POST",
    headers,
    signal,
    body: JSON.stringify({
      model: cfg.model,
      messages,
      temperature: 0,
      stream: true,
    }),
  });

  if (!res.ok || !res.body) {
    const text = await res.text().catch(() => "");
    throw new Error(`model endpoint returned ${res.status} ${res.statusText}${text ? ` — ${text.slice(0, 200)}` : ""}`);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let content = "";
  let reasoning = "";

  // Parse the SSE stream: lines beginning "data: ", terminated by "data: [DONE]".
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    const lines = buffer.split("\n");
    buffer = lines.pop() ?? ""; // keep the trailing partial line
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed.startsWith("data:")) continue;
      const payload = trimmed.slice(5).trim();
      if (payload === "[DONE]") continue;
      let json: any;
      try {
        json = JSON.parse(payload);
      } catch {
        continue; // ignore keep-alives / partial frames
      }
      const d = readDelta(json);
      if (d.content) content += d.content;
      if (d.reasoning) reasoning += d.reasoning;
      if (d.content || d.reasoning) onDelta(d);
    }
  }

  // raw = the full emission the leak detector must scan. If reasoning came on a
  // separate channel, fold it into a <think> block so downstream parsing and
  // scanning behave the same as the inline-<think> case.
  const raw =
    reasoning && !content.includes("<think>")
      ? `<think>${reasoning}</think>\n${content}`
      : content;

  return { content, reasoning, raw };
}
