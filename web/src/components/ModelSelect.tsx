// The model dropdown, shared by the challenge and the lab. Options come from the
// installed-models list; nothing is shown that Ollama isn't serving.
export default function ModelSelect({
  model,
  models,
  setModel,
  disabled,
}: {
  model: string;
  models: string[];
  setModel: (m: string) => void;
  disabled?: boolean;
}) {
  return (
    <div className="conn-field">
      <label className="mono">model</label>
      <select
        className="conn-select mono"
        value={model}
        onChange={(e) => setModel(e.target.value)}
        disabled={disabled || models.length === 0}
      >
        {models.length === 0 && <option value="">no models found in Ollama</option>}
        {models.map((m) => (
          <option key={m} value={m}>
            {m}
          </option>
        ))}
      </select>
    </div>
  );
}
