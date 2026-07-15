// The model dropdown, shared by the challenge and the lab. Options come from the
// installed-models list; the current value is always shown even if not in the list.
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
        disabled={disabled}
      >
        {!models.includes(model) && <option value={model}>{model}</option>}
        {models.map((m) => (
          <option key={m} value={m}>
            {m}
          </option>
        ))}
      </select>
    </div>
  );
}
