import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../../api/client";
import { useAuth } from "../../context/AuthContext";
import { formatDateTime, formatMoney } from "../../utils/format";
import ElemanInvoiceScreen from "./ElemanInvoiceScreen";

function Placeholder({ title, text }) {
  return (
    <div className="el-page">
      <div className="el-pagehead">
        <div>
          <h2>{title}</h2>
          <p>{text}</p>
        </div>
      </div>
      <article className="el-card" style={{ cursor: "default" }}>
        <span>Tezliklə</span>
        <strong>{title}</strong>
        <small>Bu bölmənin nə üçün olduğunu sonra deyəcəksiniz.</small>
      </article>
    </div>
  );
}

export function ElemanFranchise() {
  return <Placeholder title="Franchise" text="Bu kartın nə üçün olduğunu sonra deyəcəksiniz." />;
}

export function ElemanAyarlar() {
  const { user } = useAuth();
  const name = `${user?.firstName || ""} ${user?.lastName || ""}`.trim() || user?.staffName || "";
  return (
    <div className="el-page">
      <div className="el-pagehead">
        <div>
          <h2>Ayarlar</h2>
          <p>Hesab məlumatı. Digər ayarlar sonra əlavə olunacaq.</p>
        </div>
      </div>
      <article className="el-card" style={{ cursor: "default" }}>
        <span>Hesab</span>
        <strong>{name}</strong>
        <small>{user?.email || user?.login || ""}</small>
      </article>
    </div>
  );
}

export function ElemanLogolar() {
  return <Placeholder title="Loqolar" text="Logo bölməsi sonra doldurulacaq." />;
}

function useOverview() {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  useEffect(() => {
    api.getElemanOverview().then(setData).catch((err) => setError(err.message));
  }, []);
  return { data, error };
}

export function ElemanEmeliyyatlar() {
  const { user } = useAuth();
  const { data, error } = useOverview();
  const [invoice, setInvoice] = useState(null);
  const name = `${user?.firstName || ""} ${user?.lastName || ""}`.trim() || user?.staffName || "";

  const rows = useMemo(() => {
    const purchases = (data?.purchases || []).map((row) => ({
      ...row,
      kind: "alis",
      stamp: row.createdAt,
      title: "Alış",
    }));
    const deliveries = (data?.deliveries || []).map((row) => ({
      ...row,
      kind: "veris",
      stamp: row.createdAt,
      title: row.branchName || "Veriş",
    }));
    return [...purchases, ...deliveries].sort((a, b) => String(b.stamp || "").localeCompare(String(a.stamp || "")));
  }, [data]);

  return (
    <div className="el-page">
      <div className="el-pagehead">
        <div>
          <h2>Əməliyyatlar</h2>
          <p>Alış və veriş tarixçəsi.</p>
        </div>
      </div>
      {error && <div className="alert alert-danger">{error}</div>}
      <section className="el-history">
        {rows.map((row) =>
          row.kind === "alis" ? (
            <button key={row.id} type="button" onClick={() => setInvoice(row)}>
              <span>
                Alış · {formatDateTime(row.createdAt, "az")}
              </span>
              <b>{formatMoney(row.total)}</b>
            </button>
          ) : (
            <Link key={row.id} to="/eleman/veris">
              <span>
                Veriş · {row.title} · {row.status === "accepted" ? "Qəbul" : "Gözləyir"}
              </span>
              <b>{formatMoney(row.total)}</b>
            </Link>
          )
        )}
        {!rows.length && <p>Əməliyyat yoxdur.</p>}
      </section>
      {invoice ? (
        <ElemanInvoiceScreen
          purchase={invoice}
          personName={name}
          storeName={user?.firmName}
          onClose={() => setInvoice(null)}
        />
      ) : null}
    </div>
  );
}

export function ElemanAxtaris() {
  const { user } = useAuth();
  const { data, error } = useOverview();
  const [query, setQuery] = useState("");
  const [invoice, setInvoice] = useState(null);
  const name = `${user?.firstName || ""} ${user?.lastName || ""}`.trim() || user?.staffName || "";
  const needle = query.trim().toLocaleLowerCase("az");

  const rows = useMemo(() => {
    const hay = [
      ...(data?.purchases || []).map((row) => ({
        ...row,
        kind: "alis",
        label: `Alış ${(row.lines || []).map((line) => line.name).join(" ")}`,
      })),
      ...(data?.deliveries || []).map((row) => ({
        ...row,
        kind: "veris",
        label: `Veriş ${row.branchName || ""} ${(row.lines || []).map((line) => line.name).join(" ")}`,
      })),
    ];
    if (!needle) return hay;
    return hay.filter((row) => row.label.toLocaleLowerCase("az").includes(needle));
  }, [data, needle]);

  return (
    <div className="el-page">
      <div className="el-pagehead">
        <div>
          <h2>Axtarış</h2>
          <p>Alış və verişdə məhsul və ya filial axtarın.</p>
        </div>
      </div>
      {error && <div className="alert alert-danger">{error}</div>}
      <label className="el-field">
        <span>Axtar</span>
        <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="məhsul, filial..." />
      </label>
      <section className="el-history">
        {rows.map((row) =>
          row.kind === "alis" ? (
            <button key={row.id} type="button" onClick={() => setInvoice(row)}>
              <span>Alış · {formatDateTime(row.createdAt, "az")}</span>
              <b>{formatMoney(row.total)}</b>
            </button>
          ) : (
            <Link key={row.id} to="/eleman/veris">
              <span>
                Veriş · {row.branchName} · {formatDateTime(row.createdAt, "az")}
              </span>
              <b>{formatMoney(row.total)}</b>
            </Link>
          )
        )}
        {!rows.length && <p>Nəticə yoxdur.</p>}
      </section>
      {invoice ? (
        <ElemanInvoiceScreen
          purchase={invoice}
          personName={name}
          storeName={user?.firmName}
          onClose={() => setInvoice(null)}
        />
      ) : null}
    </div>
  );
}
