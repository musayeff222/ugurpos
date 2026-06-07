import { useAuth } from "../context/AuthContext";
import PageHeader from "../components/ui/PageHeader";
import { Link } from "react-router-dom";

export default function Profile() {
  const { user } = useAuth();
  const isBranch = user?.role === "branch" || user?.loginType === "branch";

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
                <span>Giriş Kodu</span> {user?.loginCode || "—"}
              </p>
              <p>
                <span>Firma</span> {user?.firmName || "—"}
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
