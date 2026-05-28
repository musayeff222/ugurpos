import { useState } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import "../styles/login.css";

export default function Login() {
  const { login, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [loginType, setLoginType] = useState("firma");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  if (isAuthenticated) {
    const dest = location.state?.from?.pathname || (window.matchMedia("(max-width: 991px)").matches ? "/menu" : "/dashboard");
    return <Navigate to={dest} replace />;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      setError("E-posta ve parola girin.");
      return;
    }
    setError("");
    try {
      await login(email.trim(), password);
      const isMobile = window.matchMedia("(max-width: 991px)").matches;
      navigate(location.state?.from?.pathname || (isMobile ? "/menu" : "/dashboard"), { replace: true });
    } catch (err) {
      setError(err.message === "Invalid credentials" ? "Geçersiz e-posta veya parola." : err.message);
    }
  };

  return (
    <div className="login-page">
      <div className="login-container">
        <div className="login-grid">
          <div className="login-card">
            <form onSubmit={handleSubmit}>
              <h4>Giriş Yap!</h4>

              <div className="login-type">
                <label>
                  <input
                    type="radio"
                    name="type"
                    checked={loginType === "firma"}
                    onChange={() => setLoginType("firma")}
                  />
                  Firma Girişi
                </label>
                <label>
                  <input
                    type="radio"
                    name="type"
                    checked={loginType === "personel"}
                    onChange={() => setLoginType("personel")}
                  />
                  Personel girişi
                </label>
              </div>

              <div className="form-group">
                <input
                  type="text"
                  placeholder="E-posta / Personel Kodu"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <div className="form-group">
                <input
                  type="password"
                  placeholder="Parola"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
              {loginType === "personel" && (
                <div className="form-group">
                  <input type="text" placeholder="Firma numaranız (Personel girişi için)" />
                </div>
              )}

              {error && <p className="login-error">{error}</p>}

              <button type="submit" className="btn-login">
                Giriş Yap
              </button>

              <div className="login-links">
                <a href="#forgot">Parolanızı mı unuttunuz?</a>
              </div>
              <p className="register-link">
                Hesabınız yok mu? <a href="#register">Ücretsiz kayıt olun!</a>
              </p>
            </form>
          </div>

          <div className="login-promo">
            <h4>Mağazanız için tüm ihtiyaçlarınız tek uygulamada!</h4>
            <p>
              Web, mobil ve masaüstü tüm platformlarda işlerinizi takip edin. Satış, stok, ürün yönetimi,
              detaylı raporlama, cari hesap takibi, personel izleme ve daha fazlası.
            </p>
            <h4>E-Fatura ve Yazarkasa Entegrasyonları!</h4>
            <p>Güçlü e-fatura ve yazarkasa entegrasyonları ile tüm süreçleriniz çok kolay!</p>
          </div>
        </div>
      </div>
    </div>
  );
}
