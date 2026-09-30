// A labeled input shared by both forms
export default function TextField({ label, name, value, onChange, type = "text" }) {
  return (
    <label className="field">
      <span className="field-label">{label}</span>
      <input
        className="field-input"
        type={type}
        name={name}
        value={value}
        onChange={onChange}
        autoComplete={type === "password" ? "current-password" : name}
      />
    </label>
  );
}
