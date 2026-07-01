import { useState } from "react";
import { Link } from "react-router-dom";

const QUICK_GROUPS = ["Yiyecekler", "İçecekler", "Tatlılar", "Diğer"];

export default function ProductGroupField({ value, groups, onChange, onCreateGroup, showLabel = true }) {
  const [newName, setNewName] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");

  const createGroup = async (name) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    setCreating(true);
    setError("");
    try {
      const created = await onCreateGroup(trimmed);
      onChange(created.id);
      setNewName("");
    } catch (err) {
      setError(err.message || "Kateqoriya əlavə edilə bilmədi.");
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="product-group-field">
      {showLabel && <label className="product-group-field__label">Kateqoriya / Qrup *</label>}
      <div className="product-group-field__body">
      <select value={value} onChange={(e) => onChange(e.target.value)} required>
        <option value="">Kateqoriya seçin</option>
        {groups.map((group) => (
          <option key={group.id} value={group.id}>
            {group.name}
          </option>
        ))}
      </select>

      {groups.length === 0 && (
        <p className="hint-text">Hələ kateqoriya yoxdur. Aşağıdan yeni kateqoriya yaradın.</p>
      )}

      <div className="product-group-field__quick">
        {QUICK_GROUPS.filter((name) => !groups.some((g) => g.name.toLocaleLowerCase("tr") === name.toLocaleLowerCase("tr"))).map(
          (name) => (
            <button key={name} type="button" className="btn btn-default btn-sm" disabled={creating} onClick={() => createGroup(name)}>
              + {name}
            </button>
          )
        )}
      </div>

      <div className="product-group-field__create form-inline-bar">
        <input
          placeholder="Yeni kateqoriya (məs: Yiyecekler, İçecekler)"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              createGroup(newName);
            }
          }}
        />
        <button type="button" className="btn btn-success btn-sm" disabled={creating || !newName.trim()} onClick={() => createGroup(newName)}>
          {creating ? "…" : "Kateqoriya əlavə et"}
        </button>
      </div>

      {error && <p className="login-error">{error}</p>}

      <p className="hint-text">
        <Link to="/pgroups">Bütün kateqoriyaları idarə et →</Link>
      </p>
      </div>
    </div>
  );
}
