import { useEffect, useMemo, useState } from "react";
import { api } from "../../api/client";
import { useLocale } from "../../context/LocaleContext";
import { elT } from "../../i18n/eleman";
import { parseAmount } from "../../utils/compressImage";
import { formatMoney } from "../../utils/format";

function gramsToKq(grams) {
  return Math.round((parseAmount(grams) / 1000) * 1000) / 1000;
}

function lineQty(line) {
  return line.unit === "kq" ? gramsToKq(line.grams) : parseAmount(line.qty);
}

function lineTotal(line) {
  return lineQty(line) * Number(line.sellPrice || 0);
}

function qtyLabel(line) {
  if (line.unit === "kq") return `${parseAmount(line.grams) || 0} q`;
  return `${parseAmount(line.qty) || 0} ədəd`;
}

export default function ElemanFranchise() {
  const { lang } = useLocale();
  const t = (key) => elT(lang, key);
  const [data, setData] = useState(null);
  const [branch, setBranch] = useState(null);
  const [lines, setLines] = useState([]);
  const [payType, setPayType] = useState("cash");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);

  const load = () => api.getElemanOverview().then(setData);

  useEffect(() => {
    load().catch((err) => setError(err.message));
  }, []);

  const ready =
    lines.length > 0 && lines.every((line) => lineQty(line) > 0 && parseAmount(line.sellPrice) > 0);
  const total = useMemo(() => lines.reduce((sum, line) => sum + lineTotal(line), 0), [lines]);

  const pickBranch = (item) => {
    setError("");
    setBranch(item);
    setLines([]);
    setPayType("cash");
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
          grams: "",
          unitCost: Number(product.unitCost || 0),
          sellPrice: product.franchisePrice ? String(product.franchisePrice) : "",
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
      setError(t("franchise.needPrice"));
      return;
    }
    setSaving(true);
    try {
      await api.createElemanDelivery({
        branchId: branch.id,
        payType,
        lines: lines.map((line) => ({
          productId: line.productId,
          unit: line.unit,
          qty: lineQty(line),
          price: parseAmount(line.sellPrice),
        })),
      });
      setConfirmOpen(false);
      setBranch(null);
      setLines([]);
      await load();
      setMessage(payType === "debt" ? t("franchise.savedDebt") : t("franchise.savedCash"));
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
          <h2>{t("menu.franchise")}</h2>
          <p>{branch ? `${branch.name}` : t("franchise.pick")}</p>
        </div>
        <b>
          {t("home.franchiseCash")} {formatMoney(data?.franchiseBalance || 0)}
        </b>
      </div>
      {error && !confirmOpen && <div className="alert alert-danger">{error}</div>}
      {message && <div className="alert alert-info">{message}</div>}

      {!branch && (
        <div className="el-grid">
          {(data?.franchiseBranches || []).map((item) => (
            <button key={item.id} type="button" className="el-tile" onClick={() => pickBranch(item)}>
              <span>{t("menu.franchise")}</span>
              <strong>{item.name}</strong>
              <small>{t("franchise.toBranch")}</small>
            </button>
          ))}
          {!data?.franchiseBranches?.length && <p>{t("franchise.empty")}</p>}
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
                    {t("alis.stock")}: {isKq ? `${product.stock || 0} kq` : product.stock || 0}
                    {product.franchisePrice ? ` · ${t("franchise.price")} ${formatMoney(product.franchisePrice)}` : ""}
                  </small>
                </button>
              );
            })}
          </div>

          {lines.length > 0 && (
            <div className="el-cart">
              <h3>
                {t("alis.cart")} · {lines.length} {t("alis.product")}
              </h3>
              {lines.map((line) => (
                <article key={line.productId} className="el-cart__line">
                  <div className="el-cart__name">
                    <strong>{line.name}</strong>
                    <small>{line.unit === "kq" ? "kq" : "ədəd"}</small>
                  </div>
                  {line.unit === "kq" ? (
                    <label className="el-field">
                      <span>{t("veris.grams")}</span>
                      <input
                        type="number"
                        min="1"
                        step="1"
                        inputMode="numeric"
                        value={line.grams}
                        onChange={(e) => patchLine(line.productId, { grams: e.target.value })}
                      />
                    </label>
                  ) : (
                    <label className="el-field">
                      <span>{t("alis.qty")}</span>
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
                  <label className="el-field">
                    <span>{t("franchise.price")}</span>
                    <input
                      type="number"
                      min="0.01"
                      step="0.01"
                      inputMode="decimal"
                      value={line.sellPrice}
                      onChange={(e) => patchLine(line.productId, { sellPrice: e.target.value })}
                    />
                  </label>
                  <div className="el-cart__sum">
                    <span>{t("alis.sum")}</span>
                    <b>{formatMoney(lineTotal(line))}</b>
                    <button type="button" className="btn btn-sm" onClick={() => toggle({ id: line.productId })}>
                      {t("alis.remove")}
                    </button>
                  </div>
                </article>
              ))}
              <footer className="el-cart__total">
                <span>{t("alis.total")}</span>
                <strong>{formatMoney(total)}</strong>
              </footer>
            </div>
          )}

          <div className="el-paybar">
            <button type="button" className="el-login__submit" disabled={!ready} onClick={() => setConfirmOpen(true)}>
              {t("veris.give")} · {formatMoney(total)}
            </button>
          </div>
        </>
      )}

      {confirmOpen ? (
        <div className="el-full">
          <header className="el-full__bar">
            <button type="button" className="el-full__back" onClick={() => !saving && setConfirmOpen(false)}>
              {t("menu.back")}
            </button>
            <h2>{t("alis.payTitle")}</h2>
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
            <div className="el-langs">
              <span>{t("alis.pay")}</span>
              <div>
                <button type="button" className={payType === "cash" ? "is-on" : ""} onClick={() => setPayType("cash")}>
                  {t("franchise.cash")}
                </button>
                <button type="button" className={payType === "debt" ? "is-on" : ""} onClick={() => setPayType("debt")}>
                  {t("franchise.debt")}
                </button>
              </div>
            </div>
            <button type="submit" className="el-login__submit" disabled={saving}>
              {saving ? t("veris.sending") : t("veris.confirm")}
            </button>
          </form>
        </div>
      ) : null}
    </div>
  );
}
