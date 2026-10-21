import { useState } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import "../../styles/eleman.css";

export default function ElemanLogin() {
  const { loginEleman, isAuthenticated, user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [login, setLogin] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  if (isAuthenticated && user?.loginType === "eleman") {
    return <Navigate to="/eleman" replace />;
  }

  if (isAuthenticated && user?.loginType !== "eleman") {
    return <Navigate to={user?.role === "admin" ? "/admin" : "/sales"} replace />;
  }

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    if (!login.trim() || !password.trim()) {
      setError("Login və parol yazın.");
      return;
    }
    try {
      const account = await loginEleman(login.trim(), password);
      if (account.loginType !== "eleman") {
        logout();
        setError("Bu giriş yalnız əlman üçündür.");
        return;
      }
      navigate(location.state?.from?.pathname || "/eleman", { replace: true });
    } catch (err) {
      setError(err.message === "Invalid credentials" ? "Login və ya parol səhvdir." : err.message);
    }
  };

  return (
    <div className="el-login">
      <form onSubmit={handleSubmit}>
        <h1>Əlman girişi</h1>
        <p>Login və parolunuzla daxil olun.</p>
        <label className="el-field">
          <span>Login</span>
          <input value={login} onChange={(e) => setLogin(e.target.value)} autoComplete="username" />
        </label>
        <label className="el-field">
          <span>Parol</span>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
          />
        </label>
        {error && <p className="login-error">{error}</p>}
        <button type="submit" className="btn btn-primary">
          Daxil ol
        </button>
      </form>
    </div>
  );
}
