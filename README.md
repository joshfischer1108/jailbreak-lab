# LLM Red Team Lab

A hands-on kit for **educational, authorized** red teaming of any locally-run LLM. It works
with **any OpenAI-compatible model** — Llama, Mistral, Qwen, Gemma, DeepSeek R1, and more —
and covers the two ways an LLM system gets exploited:

1. **Jailbreaking the model** — real techniques (instruction override, roleplay/DAN,
   hypothetical framing, encoding, payload splitting, and a reasoning-trace attack aimed at
   reasoning models like DeepSeek R1) that try to talk the model past its own guardrail.
2. **Injecting the agent** — indirect prompt injection that steers an agent into a
   forbidden tool call (exfil, destructive, out-of-scope).

**Canary-safe by design:** the model is told to protect a *fake* secret and the agent's
tools are mocks, so the techniques are genuine but nothing harmful is ever produced.

Everything runs against a model **you operate locally** (Ollama, LM Studio, vLLM, or any
OpenAI-compatible endpoint) — and comparing how different models hold up is the whole point.

> Only test models and systems you own or are authorized to test.

## Quick start

```bash
ollama pull deepseek-r1        # a model to attack (any works — see below)
cd web
npm install
npm run dev                    # open http://localhost:5173  (proxies to Ollama)
```

Then: try to break the model in your own words, unlock a playbook of jailbreak techniques and
watch each attack stream through a live dataflow with any leaked secret highlighted, and open
the **agent injection** page to watch a hidden instruction hijack a tool-using agent.

The model dropdown is populated from your installed Ollama models; switch between them to
compare how guardrails hold.

## Pull more models to compare

The lab works with any OpenAI-compatible model. Comparing across families is the
best way to see how differently guardrails behave — pull a few and switch between them:

```bash
# Reasoning models (emit a <think> trace — can leak in the reasoning channel):
ollama pull deepseek-r1          # 7B default; also :1.5b, :8b, :14b, :32b
ollama pull qwen3                # reasoning; :1.7b, :4b, :8b

# Safety-tuned instruct models (answer directly, no reasoning channel):
ollama pull llama3.1:8b          # Meta, heavily safety-tuned — often resists
ollama pull gemma3               # Google

# Lightly-guarded instruct models (tend to leak more — good contrast):
ollama pull mistral:7b           # minimal built-in guardrails
ollama pull mistral-small
```

`ollama list` shows what you have; anything installed appears in the dropdown. Larger tags
(e.g. `deepseek-r1:14b`) need more RAM but resist better. A good comparison run is a
reasoning model (`deepseek-r1`) vs. a safety-tuned one (`llama3.1:8b`) vs. a weak one
(`mistral:7b`) on the same attack.

## How it connects to your model

The browser calls the relative path `/llm/v1/chat/completions`, which the dev server (and, in
production, a reverse proxy) forwards to your model server — so there's no CORS to fight and
no key in the browser. Point it elsewhere with `VITE_LLM_TARGET` (see `web/vite.config.ts`).

## Layout

```
web/
├── src/components/   UI — challenge, technique lab, agent-injection page, dataflow pipeline
├── src/lib/          Real streaming client, leak detection, agent loop + mock tools
└── src/data/         Jailbreak technique catalog + the agent-injection scenario
```

## Requirements

- Node.js 20.19+ (or 22.12+). No API key needed for local Ollama.

## License

MIT. See [`LICENSE`](LICENSE). You are responsible for how you use it.
