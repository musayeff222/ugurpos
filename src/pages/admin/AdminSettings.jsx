import { useState } from "react";
import { api } from "../../api/client";
import { useAuth } from "../../context/AuthContext";
import PageHeader from "../../components/ui/PageHeader";

export default function AdminSettings() {
  const { user, patchUser } = useAuth();
  const [form, setForm] = useState({
    newEmail: "",
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage("");
    setError("");

    const newEmail = form.newEmail.trim().toLowerCase();
    const newPassword = form.newPassword.trim();

    if (!newEmail && !newPassword) {
      setError("Yeni giriş e-postası veya yeni şifre girin.");
      return;
    }

    if (newPassword && newPassword !== form.confirmPassword) {
      setError("Yeni şifreler eşleşmiyor.");
      return;
    }
    if (newPassword && newPassword.length < 6) {
      setError("Yeni şifre en az 6 karakter olmalı.");
      return;
    }

    setSaving(true);
    try {
      const result = await api.updateAdminAccount({
        currentPassword: form.currentPassword,
        newEmail: newEmail || undefined,
        newPassword: newPassword || undefined,
      });
      patchUser({ email: result.email || user?.email });
      setForm({ newEmail: "", currentPassword: "", newPassword: "", confirmPassword: "" });
      setMessage(result.message || "Admin giriş bilgileri güncellendi.");
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="admin-page">
      <PageHeader title="Ayarlar" subtitle="Admin giriş bilgileri (/login/admin)" />

      {message && <div className="alert alert-info">{message}</div>}
      {error && <div className="alert alert-danger">{error}</div>}

      <div className="card admin-settings-card">
        <h3>Admin giriş bilgilerini güncelle</h3>
        <p className="hint-text">
          Yönetim paneli giriş e-postası ve şifresini buradan değiştirebilirsiniz. POS / şube girişi
          (/login) ayrıdır.
        </p>
        <p className="admin-settings-email">
          <strong>Mevcut giriş e-postası:</strong> {user?.email || "—"}
        </p>

        <form className="form-grid admin-settings-form" onSubmit={handleSubmit}>
          <label>Yeni giriş e-postası</label>
          <input
            type="email"
            autoComplete="username"
            placeholder="admin@firma.com"
            value={form.newEmail}
            onChange={(e) => setForm((prev) => ({ ...prev, newEmail: e.target.value }))}
          />
          <p className="hint-text admin-settings-field-hint">Boş bırakırsanız e-posta değişmez.</p>

          <label>Mevcut şifre</label>
          <input
            type="password"
            autoComplete="current-password"
            value={form.currentPassword}
            onChange={(e) => setForm((prev) => ({ ...prev, currentPassword: e.target.value }))}
            required
          />

          <label>Yeni şifre</label>
          <input
            type="password"
            autoComplete="new-password"
            placeholder="Değiştirmeyecekseniz boş bırakın"
            value={form.newPassword}
            onChange={(e) => setForm((prev) => ({ ...prev, newPassword: e.target.value }))}
          />

          <label>Yeni şifre (tekrar)</label>
          <input
            type="password"
            autoComplete="new-password"
            value={form.confirmPassword}
            onChange={(e) => setForm((prev) => ({ ...prev, confirmPassword: e.target.value }))}
          />

          <div className="form-actions">
            <button type="submit" className="btn btn-success" disabled={saving}>
              {saving ? "Kaydediliyor…" : "Giriş bilgilerini güncelle"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
