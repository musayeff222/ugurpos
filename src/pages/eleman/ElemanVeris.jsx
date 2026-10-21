import { useEffect, useState } from "react";
import { api } from "../../api/client";
import Modal from "../../components/ui/Modal";
import { formatDateTime, formatMoney } from "../../utils/format";

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
      return [...prev, { productId: product.id, name: product.name, unit: product.unit, qty: 1 }];
    });
  };

  const submit = async (event) => {
    event.preventDefault();
    setError("");
    setMessage("");
    setSaving(true);
    try {
      await api.createElemanDelivery({
        branchId: branch.id,
        staffId,
        lines,
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
      <h2>Veriş</h2>
      {error && <div className="alert alert-danger">{error}</div>}
      {message && <div className="alert alert-info">{message}</div>}

      {!branch && (
        <div className="el-grid">
          {(data?.branches || []).map((item) => (
            <button key={item.id} type="button" className="el-tile" onClick={() => pickBranch(item)}>
              <span>Filial</span>
              <strong>{item.name}</strong>
            </button>
          ))}
          {!data?.branches?.length && <p>Filial yoxdur.</p>}
        </div>
      )}

      {branch && (
        <>
          <p>
            Filial: <strong>{branch.name}</strong>{" "}
            <button type="button" className="btn btn-sm" onClick={() => setBranch(null)}>
              Geri
            </button>
          </p>
          <div className="el-grid">
            {(data?.products || []).map((product) => {
              const picked = lines.find((line) => line.productId === product.id);
              return (
                <article key={product.id} className={picked ? "el-tile is-on" : "el-tile"}>
                  <button type="button" className="el-tile" style={{ boxShadow: "none", padding: 0, minHeight: 0 }} onClick={() => toggle(product)}>
                    <span>Anbar {product.stock || 0}</span>
                    <strong>{product.name}</strong>
                  </button>
                  {picked && (
                    <div className="el-qty">
                      <select
                        value={picked.unit}
                        onChange={(e) =>
                          setLines((prev) =>
                            prev.map((line) => (line.productId === product.id ? { ...line, unit: e.target.value } : line))
                          )
                        }
                      >
                        <option value="kq">kq</option>
                        <option value="adet">ədəd</option>
                      </select>
                      <input
                        type="number"
                        min="0.001"
                        step="0.001"
                        value={picked.qty}
                        onChange={(e) =>
                          setLines((prev) =>
                            prev.map((line) => (line.productId === product.id ? { ...line, qty: e.target.value } : line))
                          )
                        }
                      />
                    </div>
                  )}
                </article>
              );
            })}
          </div>
          <div className="el-paybar">
            <button type="button" className="btn btn-primary" disabled={!lines.length} onClick={() => setConfirmOpen(true)}>
              Ver
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
      </section>

      <Modal open={confirmOpen} title="Kassir seçin" onClose={() => setConfirmOpen(false)}>
        <form onSubmit={submit}>
          <p>Bu məhsulları təhvil verəcəyiniz kassiri seçin.</p>
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
          <div className="form-actions">
            <button type="button" className="btn" onClick={() => setConfirmOpen(false)}>
              Bağla
            </button>
            <button type="submit" className="btn btn-primary" disabled={saving || !staffId}>
              Təsdiqlə
            </button>
          </div>
        </form>
      </Modal>

      <Modal open={Boolean(detail)} title={detail?.branchName || "Veriş"} onClose={() => setDetail(null)}>
        {detail && (
          <div>
            <p>
              {formatDateTime(detail.createdAt)} · {formatMoney(detail.total)} ·{" "}
              {detail.status === "accepted" ? "Qəbul edilib" : "Gözləyir"}
            </p>
            <ul>
              {(detail.lines || []).map((line, index) => (
                <li key={`${line.productId}-${index}`}>
                  {line.qty} {line.unit} {line.name}
                </li>
              ))}
            </ul>
          </div>
        )}
      </Modal>
    </div>
  );
}
