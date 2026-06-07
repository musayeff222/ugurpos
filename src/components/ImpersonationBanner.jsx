import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function ImpersonationBanner() {
  const { activeBranchName, returnToAdminPanel } = useAuth();
  const navigate = useNavigate();

  const handleReturn = () => {
    const restored = returnToAdminPanel();
    if (restored) navigate("/admin/branches");
    else navigate("/login/admin");
  };

  return (
    <div className="impersonation-banner">
      <span>
        <i className="fa fa-eye" /> Admin modu — <strong>{activeBranchName}</strong> şubesini görüntülüyorsunuz
      </span>
      <button type="button" className="btn btn-default btn-xs" onClick={handleReturn}>
        Admin panele dön
      </button>
    </div>
  );
}
