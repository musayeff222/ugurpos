import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { api } from "../../api/client";
import PageHeader from "../../components/ui/PageHeader";

export default function AdminBranchCreate() {
  const { refreshBranches } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: "", email: "", password: "", address: "" });
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (!form.name.trim()) {
      setError("Şube adı zorunludur.");
      return;
    }
    if (!form.email.trim()) {
      setError("Şube e-postası zorunludur.");
      return;
    }
    if (!form.password.trim()) {
      setError("Giriş şifresi zorunludur.");
      return;
    }
    setSaving(true);
    try {
      const created = await api.createBranch(form);
      await refreshBranches();
      navigate(`/admin/branches/${created.id}`, {
        state: { message: `Şube #${created.branchNo} oluşturuldu.` },
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
        <p className="hint-text">
          Şube numarası otomatik atanır (1, 2, 3 …). POS girişi için e-posta ve şifre kullanılır.
        </p>

        <label>Şube Adı *</label>
        <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />

        <label>Şube Giriş E-postası *</label>
        <input
          type="email"
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
          placeholder="ornek@sube.com"
          autoComplete="off"
          required
        />

        <label>Giriş Şifresi *</label>
        <input
          type="password"
          value={form.password}
          onChange={(e) => setForm({ ...form, password: e.target.value })}
          placeholder="POS giriş şifresi"
          required
        />

        <label>Adres</label>
        <input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />

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
