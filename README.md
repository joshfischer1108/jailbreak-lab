# DeepSeek Red Team Basics

A hands-on kit for **educational, authorized** red teaming of a locally run LLM
(DeepSeek R1 and others). It covers the two ways an LLM system gets exploited:

1. **Jailbreaking the model** — real techniques (instruction override, roleplay/DAN,
   hypothetical framing, encoding, payload splitting, and a DeepSeek R1 reasoning-trace
   attack) that try to talk the model past its own guardrail.
2. **Injecting the agent** — indirect prompt injection that steers an agent into a
   forbidden tool call (exfil, destructive, out-of-scope).

**Canary-safe by design:** the model is told to protect a *fake* secret and the agent's
tools are mocks, so the techniques are genuine but nothing harmful is ever produced.

Everything runs against a model **you operate locally** (Ollama, LM Studio, vLLM, or any
OpenAI-compatible endpoint).

> Only test models and systems you own or are authorized to test.

## Two ways to run it

**Web lab** (`web/`) — an interactive page: try to break the model in your own words, then
unlock a playbook of techniques and watch each attack stream through a live dataflow, with
any leaked secret highlighted in the real response.

```bash
ollama pull deepseek-r1        # a real reasoning model to attack
cd web
npm install
npm run dev                    # open http://localhost:5173  (proxies to Ollama)
```

The model dropdown is populated from your installed Ollama models; switch between them to
compare how guardrails hold.

### Pull more models to compare

The lab (and CLI) work with any OpenAI-compatible model. Comparing across families is the
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

**CLI harnesses** (`python/agent_redteam/`) — the same catalog, headless, for scripting or
CI (exits non-zero if any attack lands).

```bash
cd python/agent_redteam

# validate offline (no model needed):
python3 jailbreak_eval.py --self-test
python3 agent_harness.py --scenarios scenarios.example.json

# run against your local model:
python3 jailbreak_eval.py \
    --endpoint http://localhost:11434/v1/chat/completions \
    --model deepseek-r1
```

## Layout

```
deepseek-red-team-basics/
├── web/                                 Interactive red-team lab (Vite + React)
└── python/agent_redteam/
    ├── jailbreak_eval.py                Fire jailbreak techniques at the model, score leaks
    ├── jailbreaks.deepseek.json         Technique catalog (why each works + defense)
    ├── run_local_model.py               Drive a local model through the mock tools
    ├── agent_harness.py                 Score an agent's tool-call trace
    ├── mock_tools.py                    Instrumented fake tools (read/write/destructive/exfil)
    └── scenario*.json                   Injection scenarios
```

See [`python/agent_redteam/README.md`](python/agent_redteam/README.md) for the CLI details.

## Requirements

- **Web lab:** Node.js 20.19+ (or 22.12+).
- **CLI:** Python 3.9+ — standard library only, nothing to install.

## License

MIT. See [`LICENSE`](LICENSE). You are responsible for how you use it.
