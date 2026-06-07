import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { api } from "../../api/client";
import PageHeader from "../../components/ui/PageHeader";

export default function AdminBranchCreate() {
  const { refreshBranches } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: "", loginCode: "", password: "", address: "", phone: "" });
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (!form.name.trim()) {
      setError("Şube adı zorunludur.");
      return;
    }
    if (!form.password.trim()) {
      setError("Şube parolası zorunludur.");
      return;
    }
    setSaving(true);
    try {
      const created = await api.createBranch(form);
      await refreshBranches();
      navigate(`/admin/branches/${created.id}`, {
        state: { message: `Şube oluşturuldu. Giriş kodu: ${created.loginCode}` },
      });
    } catch (err) {
      setError(err.message || "Kayıt başarısız.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <PageHeader
        title="Yeni Şube Oluştur"
        actions={
          <Link to="/admin/branches" className="btn btn-default">
            ← Şube listesi
          </Link>
        }
      />
      {error && <div className="alert alert-danger">{error}</div>}

      <form className="card form-grid admin-branch-form" onSubmit={handleSubmit}>
        <p className="hint-text">Her şube tamamen ayrı veriye sahip olur. Giriş kodu ve parola POS girişi içindir.</p>

        <label>Şube Adı *</label>
        <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />

        <label>Giriş Kodu (boş = otomatik)</label>
        <input
          value={form.loginCode}
          onChange={(e) => setForm({ ...form, loginCode: e.target.value.toUpperCase() })}
          placeholder="Örn: U261269-KADIKOY"
        />

        <label>Şube Parolası *</label>
        <input
          type="password"
          value={form.password}
          onChange={(e) => setForm({ ...form, password: e.target.value })}
          placeholder="POS giriş parolası"
          required
        />

        <label>Adres</label>
        <input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />

        <label>Telefon</label>
        <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />

        <div className="form-actions">
          <Link to="/admin/branches" className="btn btn-default">
            İptal
          </Link>
          <button type="submit" className="btn btn-success" disabled={saving}>
            {saving ? "Kaydediliyor..." : "Şube Oluştur"}
          </button>
        </div>
      </form>
    </div>
  );
}
