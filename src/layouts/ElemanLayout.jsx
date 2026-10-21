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
        <div>
          <strong>{name}</strong>
          <small>Əlman paneli</small>
        </div>
        <div>
          <Link to="/eleman">Ana səhifə</Link>{" "}
          <button
            type="button"
            onClick={() => {
              logout();
              navigate("/eleman-login", { replace: true });
            }}
          >
            Çıxış
          </button>
        </div>
      </header>
      <Outlet />
    </div>
  );
}
