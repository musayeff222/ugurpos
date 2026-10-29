import { useEffect, useMemo, useState } from "react";
import { api } from "../../api/client";
import { parseAmount } from "../../utils/compressImage";
import { formatDateTime, formatMoney } from "../../utils/format";

function gramsToKq(grams) {
  return Math.round((parseAmount(grams) / 1000) * 1000) / 1000;
}

function lineQty(line) {
  return line.unit === "kq" ? gramsToKq(line.grams) : parseAmount(line.qty);
}

function lineTotal(line) {
  return lineQty(line) * Number(line.unitCost || 0);
}

function qtyLabel(line) {
  if (line.unit === "kq") return `${parseAmount(line.grams) || 0} q`;
  return `${parseAmount(line.qty) || 0} ədəd`;
}

export default function ElemanVeris() {
  const [data, setData] = useState(null);
  const [branch, setBranch] = useState(null);
  const [cashiers, setCashiers] = useState([]);
  const [lines, setLines] = useState([]);
  const [staffId, setStaffId] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [detail, setDetail] = useState(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);

  const load = () => api.getElemanOverview().then(setData);

  useEffect(() => {
    load().catch((err) => setError(err.message));
  }, []);

  const ready = lines.length > 0 && lines.every((line) => lineQty(line) > 0);
  const total = useMemo(() => lines.reduce((sum, line) => sum + lineTotal(line), 0), [lines]);

  const pickBranch = async (item) => {
    setError("");
    setBranch(item);
    setLines([]);
    try {
      const next = await api.getElemanCashiers(item.id);
      setCashiers(next.cashiers || []);
      setStaffId(next.cashiers?.[0]?.id || "");
    } catch (err) {
      setError(err.message);
    }
  };

  const toggle = (product) => {
    setLines((prev) => {
      if (prev.some((line) => line.productId === product.id)) {
        return prev.filter((line) => line.productId !== product.id);
      }
      return [
        ...prev,
        {
          productId: product.id,
          name: product.name,
          unit: product.unit,
          qty: product.unit === "kq" ? "" : 1,
          grams: product.unit === "kq" ? "" : "",
          unitCost: Number(product.unitCost || 0),
          stock: product.stock || 0,
        },
      ];
    });
  };

  const patchLine = (productId, patch) => {
    setLines((prev) => prev.map((line) => (line.productId === productId ? { ...line, ...patch } : line)));
  };

  const submit = async (event) => {
    event.preventDefault();
    setError("");
    setMessage("");
    if (!ready) {
      setError("Məhsulun sayını yazın.");
      return;
    }
    setSaving(true);
    try {
      await api.createElemanDelivery({
        branchId: branch.id,
        staffId,
        lines: lines.map((line) => ({
          productId: line.productId,
          unit: line.unit,
          qty: lineQty(line),
        })),
      });
      setConfirmOpen(false);
      setBranch(null);
      setLines([]);
      await load();
      setMessage("Təhvil kassirin təsdiqini gözləyir.");
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="el-page">
      <div className="el-pagehead">
        <div>
          <h2>Veriş</h2>
          <p>{branch ? `${branch.name} filialına məhsul verin.` : "Filial seçin, məhsulu verin."}</p>
        </div>
        <b>Kassa {formatMoney(data?.balance || 0)}</b>
      </div>
      {error && !confirmOpen && <div className="alert alert-danger">{error}</div>}
      {message && <div className="alert alert-info">{message}</div>}

      {!branch && (
        <div className="el-grid">
          {(data?.branches || []).map((item) => (
            <button key={item.id} type="button" className="el-tile" onClick={() => pickBranch(item)}>
              <span>Filial</span>
              <strong>{item.name}</strong>
              <small>Kassirə təhvil</small>
            </button>
          ))}
          {!data?.branches?.length && <p>Filial yoxdur.</p>}
        </div>
      )}

      {branch && (
        <>
          <div className="el-grid">
            {(data?.products || []).map((product) => {
              const picked = lines.find((line) => line.productId === product.id);
              const isKq = product.unit === "kq";
              return (
                <button
                  key={product.id}
                  type="button"
                  className={picked ? "el-tile is-on" : "el-tile"}
                  onClick={() => toggle(product)}
                >
                  <span>{isKq ? "kq" : "ədəd"}</span>
                  <strong>{product.name}</strong>
                  <small>
                    Anbar: {isKq ? `${product.stock || 0} kq` : product.stock || 0}
                    {product.unitCost ? ` · 1 ${isKq ? "kq" : "ədəd"} ${formatMoney(product.unitCost)}` : ""}
                  </small>
                </button>
              );
            })}
          </div>

          {lines.length > 0 && (
            <div className="el-cart">
              <h3>Səbət · {lines.length} məhsul</h3>
              {lines.map((line) => (
                <article key={line.productId} className="el-cart__line el-cart__line--veris">
                  <div className="el-cart__name">
                    <strong>{line.name}</strong>
                    <small>
                      Anbar {line.unit === "kq" ? `${line.stock || 0} kq` : line.stock || 0} · 1{" "}
                      {line.unit === "kq" ? "kq" : "ədəd"} {formatMoney(line.unitCost)}
                    </small>
                  </div>
                  {line.unit === "kq" ? (
                    <label className="el-field">
                      <span>Qram</span>
                      <input
                        type="number"
                        min="1"
                        step="1"
                        inputMode="numeric"
                        placeholder="200"
                        value={line.grams}
                        onChange={(e) => patchLine(line.productId, { grams: e.target.value })}
                      />
                    </label>
                  ) : (
                    <label className="el-field">
                      <span>Say</span>
                      <input
                        type="number"
                        min="1"
                        step="1"
                        inputMode="numeric"
                        value={line.qty}
                        onChange={(e) => patchLine(line.productId, { qty: e.target.value })}
                      />
                    </label>
                  )}
                  <div className="el-cart__sum">
                    <span>Cəm</span>
                    <b>{formatMoney(lineTotal(line))}</b>
                    <button type="button" className="btn btn-sm" onClick={() => toggle({ id: line.productId })}>
                      Sil
                    </button>
                  </div>
                </article>
              ))}
              <footer className="el-cart__total">
                <span>Ümumi</span>
                <strong>{formatMoney(total)}</strong>
              </footer>
            </div>
          )}

          <div className="el-paybar">
            <button type="button" className="el-login__submit" disabled={!ready} onClick={() => setConfirmOpen(true)}>
              Ver · {formatMoney(total)}
            </button>
          </div>
        </>
      )}

      <section className="el-history">
        <h3>Veriş tarixçəsi</h3>
        {(data?.deliveries || []).map((row) => (
          <button key={row.id} type="button" onClick={() => setDetail(row)}>
            <span>
              {row.branchName} · {row.status === "accepted" ? "Qəbul edilib" : "Gözləyir"}
            </span>
            <b>{formatMoney(row.total)}</b>
          </button>
        ))}
        {!data?.deliveries?.length && <p>Veriş yoxdur.</p>}
      </section>

      {confirmOpen ? (
        <div className="el-full">
          <header className="el-full__bar">
            <button type="button" className="el-full__back" onClick={() => !saving && setConfirmOpen(false)}>
              Geri
            </button>
            <h2>Kassir seçin</h2>
          </header>
          <form className="el-full__body" onSubmit={submit}>
            {error && <div className="alert alert-danger">{error}</div>}
            <p>
              {branch?.name} · {formatMoney(total)}
            </p>
            <ul className="el-full__lines">
              {lines.map((line) => (
                <li key={line.productId}>
                  {qtyLabel(line)} {line.name} · {formatMoney(lineTotal(line))}
                </li>
              ))}
            </ul>
            <label className="el-field">
              <span>Kassir</span>
              <select value={staffId} onChange={(e) => setStaffId(e.target.value)} required>
                {cashiers.map((person) => (
                  <option key={person.id} value={person.id}>
                    {person.name}
                  </option>
                ))}
              </select>
            </label>
            {!cashiers.length && <p>Bu filialda kassir yoxdur.</p>}
            <button type="submit" className="el-login__submit" disabled={saving || !staffId}>
              {saving ? "Göndərilir..." : "Təsdiqlə"}
            </button>
          </form>
        </div>
      ) : null}

      {detail ? (
        <div className="el-full">
          <header className="el-full__bar">
            <button type="button" className="el-full__back" onClick={() => setDetail(null)}>
              Geri
            </button>
            <h2>{detail.branchName || "Veriş"}</h2>
          </header>
          <div className="el-full__body">
            <article className="el-invoice">
              <p>
                {formatDateTime(detail.createdAt, "az")} · {formatMoney(detail.total)}
              </p>
              <p>{detail.status === "accepted" ? "Qəbul edilib" : "Gözləyir"}</p>
              <ul>
                {(detail.lines || []).map((line, index) => (
                  <li key={`${line.productId}-${index}`}>
                    <span>
                      {line.qty} {line.unit} {line.name}
                    </span>
                    <b>
                      {formatMoney(line.price)} · {formatMoney(Number(line.qty || 0) * Number(line.price || 0))}
                    </b>
                  </li>
                ))}
              </ul>
            </article>
          </div>
        </div>
      ) : null}
    </div>
  );
}
