import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../../api/client";
import { formatMoney } from "../../utils/format";

export default function ElemanHome() {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api.getElemanOverview().then(setData).catch((err) => setError(err.message));
  }, []);

  return (
    <div className="el-page">
      {error && <div className="alert alert-danger">{error}</div>}
      <div className="el-grid">
        <article className="el-card">
          <span>Kassa</span>
          <strong>{formatMoney(data?.balance || 0)}</strong>
          <small>Kassanızdakı məbləğ</small>
        </article>
        <Link to="/eleman/alis" className="el-card">
          <span>Alış</span>
          <strong>{data?.purchases?.length || 0}</strong>
          <small>Məhsul al</small>
        </Link>
        <Link to="/eleman/veris" className="el-card">
          <span>Veriş</span>
          <strong>{data?.deliveries?.length || 0}</strong>
          <small>Filiala ver</small>
        </Link>
      </div>
    </div>
  );
}
