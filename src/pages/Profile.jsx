import { useNavigate } from "react-router-dom";
import StaffLoginForm from "../components/StaffLoginForm";
import { useAuth } from "../context/AuthContext";
import { useStore } from "../store/StoreContext";
import { useLocale } from "../context/LocaleContext";
import PageHeader from "../components/ui/PageHeader";
import { Link } from "react-router-dom";
import { getPostLoginPath } from "../utils/authRedirect";

export default function Profile() {
  const { user, loginStaff, loading } = useAuth();
  const { state } = useStore();
  const { t } = useLocale();
  const navigate = useNavigate();
  const isBranch = user?.role === "branch" || user?.loginType === "branch";
  const isStaff = user?.role === "staff" || user?.loginType === "staff";

  const handleStaffLogin = async (staffLogin, staffPassword, options = {}) => {
    const account = await loginStaff(staffLogin, staffPassword, { fromBranch: true, ...options });
    navigate(getPostLoginPath(account), { replace: true });
  };

  const branchStaff = state.staff.filter((member) => member.hasPassword && member.login);

  return (
    <div>
      <PageHeader title="Profilim" />
      <div className="card">
        <div className="card-body detail-grid">
          {isBranch ? (
            <>
              <p>
                <span>Şube</span> {user?.branchName || "—"}
              </p>
              <p>
                <span>Şube No</span> #{user?.branchNo || "—"}
              </p>
              <p>
                <span>Giriş E-postası</span> {user?.email || "—"}
              </p>
              <p>
                <span>Firma</span> {user?.firmName || "—"}
              </p>
            </>
          ) : isStaff ? (
            <>
              <p>
                <span>Personal</span> {user?.staffName || "—"}
              </p>
              <p>
                <span>Rol</span> {user?.staffRole || "—"}
              </p>
              <p>
                <span>Login</span> {user?.email || "—"}
              </p>
              <p>
                <span>Şube</span> {user?.branchName || "—"}
              </p>
            </>
          ) : (
            <>
              <p>
                <span>E-posta</span> {user?.email || "—"}
              </p>
              <p>
                <span>Firma</span> {user?.firmName || "—"}
              </p>
              <p>
                <span>Şube</span> {user?.branchName || "—"}
              </p>
            </>
          )}
        </div>
      </div>

      {isBranch && (
        <div className="card staff-login-panel">
          <h5>{t("login.staffFromBranch")}</h5>
          <p>{t("login.staffFromBranchHint")}</p>
          <StaffLoginForm
            onSubmit={handleStaffLogin}
            loading={loading}
            compact
            staffList={branchStaff}
            branchEmail={user?.email || user?.branchEmail || ""}
          />
        </div>
      )}

      <div className="card" style={{ marginTop: 16 }}>
        <div className="card-body">
          <Link to="/notices" className="btn btn-default">
            Duyurular
          </Link>{" "}
          <Link to="/integration" className="btn btn-default">
            Entegrasyonlar
          </Link>{" "}
          <Link to="/buyingInformation" className="btn btn-default">
            Lisans
          </Link>
        </div>
      </div>
    </div>
  );
}
