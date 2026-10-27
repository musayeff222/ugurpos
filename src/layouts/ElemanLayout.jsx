import { Link, Navigate, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import "../styles/eleman.css";

export default function ElemanLayout() {
  const { user, isAuthenticated, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  if (!isAuthenticated) {
    return <Navigate to="/eleman-login" replace state={{ from: location }} />;
  }

  if (user?.loginType !== "eleman") {
    return <Navigate to="/login/admin" replace />;
  }

  const name = `${user.firstName || ""} ${user.lastName || ""}`.trim() || user.staffName || user.email;

  return (
    <div className="el-shell">
      <header className="el-top">
        <Link to="/eleman" className="el-top__who">
          <span className="el-login__mark el-login__mark--sm">İK</span>
          <span>
            <strong>{name}</strong>
            <small>Əlman</small>
          </span>
        </Link>
        <button
          type="button"
          className="el-top__out"
          onClick={() => {
            logout();
            navigate("/eleman-login", { replace: true });
          }}
        >
          Çıxış
        </button>
      </header>
      <Outlet />
    </div>
  );
}
