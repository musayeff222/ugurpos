import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { fetchPublicFirmMenu } from "../../utils/qrMenuPublic";
import "../../styles/public-qr-menu.css";

export default function PublicMenuLanding() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetchPublicFirmMenu(slug)
      .then(setData)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [slug]);

  if (loading) {
    return (
      <div className="public-menu-page">
        <div className="public-menu-loading">Menü yükleniyor…</div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="public-menu-page">
        <div className="public-menu-error card">{error || "Menü bulunamadı"}</div>
      </div>
    );
  }

  const { firm, branches } = data;

  return (
    <div className="public-menu-page">
      <header className="public-menu-header">
        <div className="public-menu-header__badge">QR Menü</div>
        <h1>{firm.menuTitle}</h1>
        {firm.menuWelcome && <p>{firm.menuWelcome}</p>}
        <p className="public-menu-branch-tag">Sipariş vermek istediğiniz şubeyi seçin.</p>
      </header>

      <div className="public-branch-picker">
        {branches.length === 0 ? (
          <div className="card public-menu-empty-card">
            <p>Şu an sipariş alan aktif şube yok.</p>
          </div>
        ) : (
          branches.map((branch) => (
            <button
              key={branch.id}
              type="button"
              className="public-branch-picker__item"
              onClick={() => navigate(`/m/${slug}/${branch.id}`)}
            >
              <strong>
                #{branch.branchNo} {branch.name}
              </strong>
              {branch.address && <span>{branch.address}</span>}
              {!branch.menuAcceptOrders && <em>Yalnızca menü görüntüleme</em>}
            </button>
          ))
        )}
      </div>
    </div>
  );
}
