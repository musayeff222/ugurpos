import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function ImpersonationBanner() {
  const { activeBranchName, returnToAdminPanel } = useAuth();
  const navigate = useNavigate();

  const handleReturn = () => {
    const lastBranch = sessionStorage.getItem("ugurpos_admin_last_branch");
    const restored = returnToAdminPanel();
    if (restored && lastBranch) navigate(`/admin/branches/${lastBranch}`);
    else if (restored) navigate("/admin/branches");
    else navigate("/login/admin");
  };

  return (
    <div className="impersonation-banner">
      <span>
        <i className="fa fa-user-secret" /> Admin olarak <strong>{activeBranchName}</strong> şubesindesiniz
      </span>
      <button type="button" className="btn impersonation-banner__back" onClick={handleReturn}>
        Admin panele dön
      </button>
    </div>
  );
}
