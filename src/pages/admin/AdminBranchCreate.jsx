import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { api } from "../../api/client";

export default function AdminBranchCreate() {
  const { refreshBranches } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const isProduction = searchParams.get("kind") === "production";
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
      setError("Giriş e-postası zorunludur.");
      return;
    }
    if (!form.password.trim()) {
      setError("Giriş şifresi zorunludur.");
      return;
    }
    setSaving(true);
    try {
      const created = await api.createBranch({
        ...form,
        kind: isProduction ? "production" : "sales",
      });
      await refreshBranches();
      navigate(`/admin/branches/${created.id}`, {
        state: {
          message: isProduction
            ? "İstehsalat şubesi oluşturuldu. Login ve parolayla /login üzerinden girilir."
            : `Şube #${created.branchNo} oluşturuldu.`,
        },
      });
    } catch (err) {
      setError(err.message || "Kayıt başarısız.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="admin-page erp-page">
      <div className="crm-listbar">
        <div>
          <h2>{isProduction ? "İstehsalat şubesi" : "Yeni hesap"}</h2>
          <span>{isProduction ? "Login + parola ile üretim paneli" : "Şube kaydı · numara otomatik"}</span>
        </div>
        <div className="crm-listbar__tools">
          <Link to="/admin/branches" className="btn btn-default btn-sm">
            İptal
          </Link>
        </div>
      </div>

      {error && <div className="alert alert-danger">{error}</div>}

      <form className="erp-panel erp-form" onSubmit={handleSubmit}>
        <div className="erp-form-grid">
          <label className="erp-field">
            <span>{isProduction ? "İstehsalat adı *" : "Şube adı *"}</span>
            <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          </label>
          <label className="erp-field">
            <span>Giriş e-postası (login) *</span>
            <input
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              placeholder="ornek@sube.com"
              autoComplete="off"
              required
            />
          </label>
          <label className="erp-field">
            <span>Parola *</span>
            <input
              type="password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              placeholder={isProduction ? "İstehsalat girişi bu parolayla yapılır" : "Şube personeli bu şifreyle girer"}
              required
            />
          </label>
          <label className="erp-field erp-field--full">
            <span>Adres</span>
            <input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
          </label>
        </div>
        <div className="form-actions">
          <Link to="/admin/branches" className="btn btn-default">
            İptal
          </Link>
          <button type="submit" className="btn btn-success" disabled={saving}>
            {saving ? "Kaydediliyor..." : isProduction ? "İstehsalat şubesi oluştur" : "Şube oluştur"}
          </button>
        </div>
      </form>
    </div>
  );
}
