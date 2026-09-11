import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

function staffRoleLabel(role) {
  const value = String(role || "").toLocaleLowerCase("tr");
  if (value.includes("garson")) return "Garson";
  if (value.includes("personal") || value.includes("personel")) return "Personal";
  if (value.includes("kasiyer") || value.includes("kasa")) return "Kasa";
  return role || "Çalışan";
}

export default function ImpersonationBanner() {
  const { activeBranchName, activeStaffName, activeStaffRole, user, returnToAdminPanel } = useAuth();
  const navigate = useNavigate();
  const isStaffView = user?.loginType === "staff" || user?.role === "staff";

  const handleReturn = () => {
    const lastBranch =
      sessionStorage.getItem("ugurpos_admin_last_branch") || user?.returnToBranchId || "";
    const restored = returnToAdminPanel();
    if (restored && lastBranch) navigate(`/admin/branches/${lastBranch}`);
    else if (restored) navigate("/admin/branches");
    else navigate("/login/admin");
  };

  return (
    <div className="impersonation-banner">
      <span>
        <i className="fa fa-user-secret" />{" "}
        {isStaffView ? (
          <>
            <strong>{activeStaffName || "Çalışan"}</strong>
            {activeStaffRole ? ` (${staffRoleLabel(activeStaffRole)})` : ""} olarak görüntülüyorsunuz
            {activeBranchName ? (
              <>
                {" "}
                · şube: <strong>{activeBranchName}</strong>
              </>
            ) : null}
          </>
        ) : (
          <>
            Admin olarak <strong>{activeBranchName}</strong> şubesindesiniz
          </>
        )}
      </span>
      <button type="button" className="btn impersonation-banner__back" onClick={handleReturn}>
        Admin panele dön
      </button>
    </div>
  );
}
