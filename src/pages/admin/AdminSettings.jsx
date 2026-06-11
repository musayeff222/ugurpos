import { useState } from "react";
import { api } from "../../api/client";
import { useAuth } from "../../context/AuthContext";
import PageHeader from "../../components/ui/PageHeader";

export default function AdminSettings() {
  const { user } = useAuth();
  const [form, setForm] = useState({ currentPassword: "", newPassword: "", confirmPassword: "" });
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage("");
    setError("");

    if (form.newPassword !== form.confirmPassword) {
      setError("Yeni şifreler eşleşmiyor.");
      return;
    }
    if (form.newPassword.length < 6) {
      setError("Yeni şifre en az 6 karakter olmalı.");
      return;
    }

    setSaving(true);
    try {
      await api.changeAdminPassword({
        currentPassword: form.currentPassword,
        newPassword: form.newPassword,
      });
      setForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
      setMessage("Admin şifreniz güncellendi.");
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="admin-page">
      <PageHeader title="Ayarlar" subtitle="Admin hesabı güvenliği" />

      {message && <div className="alert alert-info">{message}</div>}
      {error && <div className="alert alert-danger">{error}</div>}

      <div className="card admin-settings-card">
        <h3>Admin şifresi değiştir</h3>
        <p className="hint-text">Web sipariş yönetim paneli giriş şifrenizi buradan güncelleyebilirsiniz.</p>
        <p className="admin-settings-email">
          <strong>Hesap:</strong> {user?.email}
        </p>

        <form className="form-grid admin-settings-form" onSubmit={handleSubmit}>
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
            value={form.newPassword}
            onChange={(e) => setForm((prev) => ({ ...prev, newPassword: e.target.value }))}
            required
          />

          <label>Yeni şifre (tekrar)</label>
          <input
            type="password"
            autoComplete="new-password"
            value={form.confirmPassword}
            onChange={(e) => setForm((prev) => ({ ...prev, confirmPassword: e.target.value }))}
            required
          />

          <div className="form-actions">
            <button type="submit" className="btn btn-success" disabled={saving}>
              {saving ? "Kaydediliyor…" : "Şifreyi güncelle"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
