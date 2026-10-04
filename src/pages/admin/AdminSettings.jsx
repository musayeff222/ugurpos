import { useEffect, useState } from "react";
import { api } from "../../api/client";
import { useAuth } from "../../context/AuthContext";
import { setDisplayCurrency } from "../../utils/format";

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
  const [currency, setCurrency] = useState(user?.currency === "TL" ? "TL" : "AZN");
  const [savingCurrency, setSavingCurrency] = useState(false);

  useEffect(() => {
    api
      .getAdminCurrency()
      .then((data) => {
        if (data?.currency === "TL" || data?.currency === "AZN") setCurrency(data.currency);
      })
      .catch(() => {});
  }, []);

  const saveCurrency = async (e) => {
    e.preventDefault();
    setMessage("");
    setError("");
    setSavingCurrency(true);
    try {
      const result = await api.updateAdminCurrency(currency);
      setDisplayCurrency(result.currency);
      patchUser({ currency: result.currency });
      setMessage(result.currency === "TL" ? "Fiyatlar TL olarak gösterilecek." : "Fiyatlar AZN olarak gösterilecek.");
    } catch (err) {
      setError(err.message);
    } finally {
      setSavingCurrency(false);
    }
  };

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
    <div className="admin-page erp-page">
      <div className="crm-listbar">
        <div>
          <h2>Kurulum</h2>
          <span>Yönetici hesabı · POS girişi ayrı</span>
        </div>
      </div>

      {message && <div className="alert alert-info">{message}</div>}
      {error && <div className="alert alert-danger">{error}</div>}

      <div className="erp-panel admin-settings-card">
        <header className="erp-panel__head">
          <h3>Para birimi</h3>
        </header>
        <p className="hint-text">Fiyatlar kasa, rapor ve web siparişte bu birimle görünür.</p>
        <form className="erp-form admin-settings-form" onSubmit={saveCurrency}>
          <label className="erp-field">
            <span>Gösterim</span>
            <select value={currency} onChange={(e) => setCurrency(e.target.value)}>
              <option value="AZN">AZN (₼)</option>
              <option value="TL">TL (₺)</option>
            </select>
          </label>
          <div className="form-actions">
            <button type="submit" className="btn btn-success" disabled={savingCurrency}>
              {savingCurrency ? "Kaydediliyor…" : "Para birimini kaydet"}
            </button>
          </div>
        </form>
      </div>

      <div className="erp-panel admin-settings-card">
        <header className="erp-panel__head">
          <h3>Güvenlik</h3>
        </header>
        <p className="erp-current-email">
          Mevcut hesap <strong>{user?.email || "—"}</strong>
        </p>

        <form className="erp-form admin-settings-form" onSubmit={handleSubmit}>
          <div className="erp-form-grid">
          <label className="erp-field">
            <span>Yeni giriş e-postası</span>
            <input
              type="email"
              autoComplete="username"
              placeholder="Boş = değişmez"
              value={form.newEmail}
              onChange={(e) => setForm((prev) => ({ ...prev, newEmail: e.target.value }))}
            />
          </label>
          <label className="erp-field">
            <span>Mevcut şifre *</span>
            <input
              type="password"
              autoComplete="current-password"
              value={form.currentPassword}
              onChange={(e) => setForm((prev) => ({ ...prev, currentPassword: e.target.value }))}
              required
            />
          </label>
          <label className="erp-field">
            <span>Yeni şifre</span>
            <input
              type="password"
              autoComplete="new-password"
              placeholder="Değiştirmeyecekseniz boş"
              value={form.newPassword}
              onChange={(e) => setForm((prev) => ({ ...prev, newPassword: e.target.value }))}
            />
          </label>
          <label className="erp-field">
            <span>Yeni şifre (tekrar)</span>
            <input
              type="password"
              autoComplete="new-password"
              value={form.confirmPassword}
              onChange={(e) => setForm((prev) => ({ ...prev, confirmPassword: e.target.value }))}
            />
          </label>
          </div>
          <div className="form-actions">
            <button type="submit" className="btn btn-success" disabled={saving}>
              {saving ? "Kaydediliyor…" : "Güncelle"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
