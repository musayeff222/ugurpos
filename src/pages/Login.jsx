import { useState } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import "../styles/login.css";

export default function Login() {
  const { login, loginBranch, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [loginType, setLoginType] = useState("firma");
  const [email, setEmail] = useState("");
  const [branchCode, setBranchCode] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  if (isAuthenticated) {
    const dest = location.state?.from?.pathname || (window.matchMedia("(max-width: 991px)").matches ? "/menu" : "/dashboard");
    return <Navigate to={dest} replace />;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (loginType === "firma") {
      if (!email.trim() || !password.trim()) {
        setError("E-posta ve parola girin.");
        return;
      }
      try {
        await login(email.trim(), password);
        const isMobile = window.matchMedia("(max-width: 991px)").matches;
        navigate(location.state?.from?.pathname || (isMobile ? "/menu" : "/dashboard"), { replace: true });
      } catch (err) {
        setError(err.message === "Invalid credentials" ? "Geçersiz e-posta veya parola." : err.message);
      }
      return;
    }

    if (!branchCode.trim() || !password.trim()) {
      setError("Şube kodu ve parola girin.");
      return;
    }

    try {
      await loginBranch(branchCode.trim().toUpperCase(), password);
      const isMobile = window.matchMedia("(max-width: 991px)").matches;
      navigate(location.state?.from?.pathname || (isMobile ? "/menu" : "/dashboard"), { replace: true });
    } catch (err) {
      setError(err.message === "Invalid credentials" ? "Geçersiz şube kodu veya parola." : err.message);
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
                  Firma / Admin Girişi
                </label>
                <label>
                  <input
                    type="radio"
                    name="type"
                    checked={loginType === "sube"}
                    onChange={() => setLoginType("sube")}
                  />
                  Şube Girişi
                </label>
              </div>

              {loginType === "firma" ? (
                <div className="form-group">
                  <input
                    type="text"
                    placeholder="E-posta"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
              ) : (
                <div className="form-group">
                  <input
                    type="text"
                    placeholder="Şube Giriş Kodu (örn: U261269-001)"
                    value={branchCode}
                    onChange={(e) => setBranchCode(e.target.value.toUpperCase())}
                  />
                </div>
              )}

              <div className="form-group">
                <input
                  type="password"
                  placeholder="Parola"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>

              {loginType === "sube" && (
                <p className="login-hint">Her şubenin kendi giriş kodu ve parolası vardır. Admin panelden oluşturulur.</p>
              )}

              {error && <p className="login-error">{error}</p>}

              <button type="submit" className="btn-login">
                Giriş Yap
              </button>

              <div className="login-links">
                <a href="#forgot">Parolanızı mı unuttunuz?</a>
              </div>
            </form>
          </div>

          <div className="login-promo">
            <h4>Mağazanız için tüm ihtiyaçlarınız tek uygulamada!</h4>
            <p>
              Web, mobil ve masaüstü tüm platformlarda işlerinizi takip edin. Satış, stok, ürün yönetimi,
              detaylı raporlama, cari hesap takibi, personel izleme ve daha fazlası.
            </p>
            <h4>Çoklu şube desteği</h4>
            <p>Her şube ayrı kod ve parola ile giriş yapar. Yönetici tüm şubeleri admin panelden yönetir.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
