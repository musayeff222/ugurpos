import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { api } from "../../api/client";
import Modal from "../../components/ui/Modal";
import { useAuth } from "../../context/AuthContext";
import { formatDateTime, formatMoney } from "../../utils/format";
import { printPurchaseInvoice } from "../../utils/printPurchase";
import AdminDay from "./AdminDay";
import AdminWholesalers from "./AdminWholesalers";

const TABS = [
  { id: "bugun", label: "Bugün" },
  { id: "alis", label: "Yeni alış" },
  { id: "topdanci", label: "Toptancılar" },
  { id: "kasa", label: "Kasalar" },
  { id: "borc", label: "Borçlar" },
];

const PAYMENTS = [
  { id: "borc", label: "Borç" },
  { id: "nagd", label: "Nakit" },
  { id: "kart", label: "Kart" },
];

const emptySeller = { name: "", phone: "" };

function priceFor(product, wholesalerId, prices) {
  const saved = prices.find((row) => row.wholesalerId === wholesalerId && row.productId === product.id);
  if (saved) return Number(saved.buyPrice) || 0;
  return Number(product.buyPrice) || 0;
}

function paymentLabel(type) {
  return PAYMENTS.find((item) => item.id === type)?.label || type;
}

function kassaKindLabel(kind) {
  if (kind === "nakit") return "Nakit";
  if (kind === "banka") return "Banka";
  return "Diğer";
}

function movementLabel(kind) {
  if (kind === "branch") return "Şubeden";
  if (kind === "purchase") return "Alış";
  if (kind === "debt") return "Borç";
  return "Hareket";
}

function KasaDesk({
  kassas,
  branches,
  movements,
  activeId,
  onPick,
  showNew,
  onToggleNew,
  kassaForm,
  setKassaForm,
  onCreate,
  pullForm,
  setPullForm,
  onPull,
  saving,
}) {
  const active = kassas.find((kassa) => kassa.id === activeId) || kassas[0];
  const nakitTotal = kassas.filter((kassa) => kassa.kind === "nakit").reduce((sum, kassa) => sum + Number(kassa.balance || 0), 0);
  const bankaTotal = kassas.filter((kassa) => kassa.kind === "banka").reduce((sum, kassa) => sum + Number(kassa.balance || 0), 0);
  const branch = branches.find((item) => item.id === pullForm.branchId) || branches[0];
  const history = movements.filter((row) => row.kassaId === active?.id);

  return (
    <div className="kasa-layout">
      <section className="alis-panel kasa-list">
        <header className="alis-panel__head">
          <h3>Kasalar</h3>
          <button type="button" className="btn btn-default btn-sm" onClick={onToggleNew}>
            {showNew ? "Kapat" : "Yeni"}
          </button>
        </header>
        <div className="kasa-totals">
          <span>Nakit {formatMoney(nakitTotal)}</span>
          <span>Banka {formatMoney(bankaTotal)}</span>
        </div>
        <div className="kasa-cards">
          {kassas.map((kassa) => (
            <button
              key={kassa.id}
              type="button"
              className={kassa.id === active?.id ? "kasa-card is-on" : "kasa-card"}
              onClick={() => onPick(kassa.id)}
            >
              <span>{kassaKindLabel(kassa.kind)}</span>
              <strong>{kassa.name}</strong>
              <b>{formatMoney(kassa.balance)}</b>
            </button>
          ))}
          {!kassas.length && <p className="alis-empty">Kasa yok.</p>}
        </div>
        {showNew && (
          <form className="kasa-new" onSubmit={onCreate}>
            <input
              value={kassaForm.name}
              onChange={(e) => setKassaForm({ ...kassaForm, name: e.target.value })}
              placeholder="Kasa adı"
              required
            />
            <select value={kassaForm.kind} onChange={(e) => setKassaForm({ ...kassaForm, kind: e.target.value })}>
              <option value="nakit">Nakit</option>
              <option value="banka">Banka</option>
              <option value="diger">Diğer</option>
            </select>
            <button type="submit" className="btn btn-primary btn-sm" disabled={saving}>
              Kaydet
            </button>
          </form>
        )}
      </section>

      <section className="alis-panel kasa-work">
        <header className="alis-panel__head">
          <h3>{active?.name || "Kasa seçin"}</h3>
          <span>{active ? formatMoney(active.balance) : ""}</span>
        </header>
        <form className="kasa-pull" onSubmit={onPull}>
          <span className="kasa-pull__label">Şubeden bu kasaya al</span>
          <div className="kasa-branches">
            {branches.map((item) => (
              <button
                key={item.id}
                type="button"
                className={item.id === branch?.id ? "kasa-branch is-on" : "kasa-branch"}
                onClick={() => setPullForm({ ...pullForm, branchId: item.id, kassaId: active?.id || pullForm.kassaId, amount: String(item.available || "") })}
              >
                <strong>{item.name}</strong>
                <span>Nakit {formatMoney(item.available || 0)}</span>
              </button>
            ))}
            {!branches.length && <p className="alis-empty">Şube yok.</p>}
          </div>
          <div className="kasa-pull__row">
            <input
              type="number"
              min="0.01"
              step="0.01"
              value={pullForm.amount}
              onChange={(e) => setPullForm({ ...pullForm, amount: e.target.value, kassaId: active?.id || pullForm.kassaId })}
              placeholder="Tutar"
              required
            />
            <button
              type="button"
              className="btn btn-default"
              disabled={!branch}
              onClick={() =>
                setPullForm({
                  ...pullForm,
                  branchId: branch?.id || "",
                  kassaId: active?.id || pullForm.kassaId,
                  amount: String(branch?.available || ""),
                })
              }
            >
              Tümü
            </button>
            <button type="submit" className="btn btn-primary" disabled={saving || !active}>
              Kasaya al
            </button>
          </div>
        </form>
        <div className="kasa-moves">
          <span>Son hareketler</span>
          {history.map((row) => (
            <article key={row.id}>
              <div>
                <strong>{movementLabel(row.kind)}</strong>
                <small>
                  {when(row.createdAt)}
                  {row.note ? ` · ${row.note}` : ""}
                </small>
              </div>
              <b className={row.direction === "out" ? "is-out" : ""}>
                {row.direction === "out" ? "−" : "+"}
                {formatMoney(row.amount)}
              </b>
            </article>
          ))}
          {!history.length && <p className="alis-empty">Bu kasada hareket yok.</p>}
        </div>
      </section>
    </div>
  );
}

function when(value) {
  if (!value) return "—";
  const date = new Date(String(value).replace(" ", "T"));
  if (Number.isNaN(date.getTime())) return String(value);
  return formatDateTime(date);
}

export default function AdminMuhasib() {
  const { user } = useAuth();
  const [params, setParams] = useSearchParams();
  const requested = params.get("bolum");
  const tab = TABS.some((item) => item.id === requested) ? requested : "bugun";
  const openTab = (id) => setParams(id === "bugun" ? {} : { bolum: id }, { replace: true });
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [wholesalerId, setWholesalerId] = useState("");
  const [newSeller, setNewSeller] = useState(emptySeller);
  const [showNewSeller, setShowNewSeller] = useState(false);
  const [query, setQuery] = useState("");
  const [lines, setLines] = useState([]);
  const [paymentType, setPaymentType] = useState("nagd");
  const [kassaId, setKassaId] = useState("");
  const [kassaForm, setKassaForm] = useState({ name: "", kind: "nakit" });
  const [kassaPick, setKassaPick] = useState("");
  const [showNewKassa, setShowNewKassa] = useState(false);
  const [payForm, setPayForm] = useState({ wholesalerId: "", kassaId: "", amount: "" });
  const [pullForm, setPullForm] = useState({ branchId: "", kassaId: "", amount: "" });
  const [invoice, setInvoice] = useState(null);
  const [historyQuery, setHistoryQuery] = useState("");
  const [note, setNote] = useState("");

  const load = async () => {
    const next = await api.getAccounting();
    setData(next);
    setWholesalerId((prev) => prev || next.wholesalers[0]?.id || "");
    setKassaId((prev) => prev || next.kassas.find((kassa) => kassa.kind === "nakit")?.id || next.kassas[0]?.id || "");
    setPayForm((prev) => ({
      wholesalerId: prev.wholesalerId || next.wholesalers.find((row) => row.debt > 0)?.id || next.wholesalers[0]?.id || "",
      kassaId: prev.kassaId || next.kassas[0]?.id || "",
      amount: prev.amount,
    }));
    setPullForm((prev) => ({
      branchId: prev.branchId || next.branches[0]?.id || "",
      kassaId: prev.kassaId || next.kassas.find((kassa) => kassa.kind === "nakit")?.id || next.kassas[0]?.id || "",
      amount: prev.amount,
    }));
    return next;
  };

  useEffect(() => {
    load().catch((err) => setError(err.message));
  }, []);

  const purchaseRows = useMemo(() => {
    const term = historyQuery.trim().toLowerCase();
    const list = data?.purchases || [];
    if (!term) return list;
    return list.filter((row) =>
      `${row.wholesalerName || ""} ${row.wholesalerPhone || ""} ${paymentLabel(row.paymentType)} ${row.lines.map((line) => line.name).join(" ")}`
        .toLowerCase()
        .includes(term)
    );
  }, [data, historyQuery]);

  const products = data?.products || [];
  const prices = data?.prices || [];
  const kassas = data?.kassas || [];
  const wholesalers = data?.wholesalers || [];

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    const list = term ? products.filter((product) => product.name.toLowerCase().includes(term)) : products;
    return list.slice(0, 30);
  }, [products, query]);

  const total = lines.reduce((sum, line) => sum + Number(line.qty || 0) * Number(line.buyPrice || 0), 0);

  const pickKassa = (type, list = kassas) => {
    const kind = type === "kart" ? "banka" : "nakit";
    return list.find((kassa) => kassa.kind === kind)?.id || list[0]?.id || "";
  };

  const changePayment = (type) => {
    setPaymentType(type);
    if (type !== "borc") setKassaId(pickKassa(type));
  };

  const addProduct = (product) => {
    setLines((prev) => {
      if (prev.some((line) => line.productId === product.id)) {
        return prev.filter((line) => line.productId !== product.id);
      }
      return [
        ...prev,
        {
          productId: product.id,
          name: product.name,
          unit: product.unit || "",
          qty: 1,
          buyPrice: priceFor(product, wholesalerId, prices),
        },
      ];
    });
  };

  const savePurchase = async (event) => {
    event.preventDefault();
    setError("");
    setMessage("");
    if (!wholesalerId) {
      setError("Satan toptancıyı seçin.");
      return;
    }
    if (!lines.length) {
      setError("Alınacak ürünü listeden seçin.");
      return;
    }
    setSaving(true);
    try {
      const result = await api.createAccountPurchase({
        wholesalerId,
        paymentType,
        kassaId: paymentType === "borc" ? "" : kassaId,
        note,
        lines: lines.map((line) => ({
          productId: line.productId,
          qty: Number(line.qty),
          buyPrice: Number(line.buyPrice),
        })),
      });
      setLines([]);
      setNote("");
      const next = await load();
      const saved = (next?.purchases || []).find((row) => row.id === result.id);
      if (saved) setInvoice(saved);
      setMessage(`Alış kaydedildi. Toplam ${formatMoney(result.total)}. Alış fiyatı bir sonraki sefer için saklandı.`);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const addSeller = async (event) => {
    event.preventDefault();
    setError("");
    setMessage("");
    setSaving(true);
    try {
      const created = await api.createWholesaler({ name: newSeller.name, phone: newSeller.phone });
      setNewSeller(emptySeller);
      setShowNewSeller(false);
      setWholesalerId(created.id);
      await load();
      setMessage("Toptancı eklendi.");
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const addKassa = async (event) => {
    event.preventDefault();
    setError("");
    setMessage("");
    setSaving(true);
    try {
      const created = await api.createAccountKassa(kassaForm);
      setKassaForm({ name: "", kind: "nakit" });
      setShowNewKassa(false);
      if (created?.id) {
        setKassaPick(created.id);
        setPullForm((prev) => ({ ...prev, kassaId: created.id }));
      }
      await load();
      setMessage("Kasa oluşturuldu.");
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const payDebt = async (event) => {
    event.preventDefault();
    setError("");
    setMessage("");
    setSaving(true);
    try {
      await api.payAccountDebt({
        wholesalerId: payForm.wholesalerId,
        kassaId: payForm.kassaId,
        amount: Number(payForm.amount),
      });
      setPayForm((prev) => ({ ...prev, amount: "" }));
      await load();
      setMessage("Borç ödemesi kasadan düşüldü.");
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const pullCash = async (event) => {
    event.preventDefault();
    setError("");
    setMessage("");
    setSaving(true);
    try {
      await api.pullBranchCash({
        branchId: pullForm.branchId,
        kassaId: kassaPick || pullForm.kassaId,
        amount: Number(pullForm.amount),
      });
      setPullForm((prev) => ({ ...prev, amount: "" }));
      await load();
      setMessage("Şube nakiti kasaya alındı. Satış kayıtları duruyor.");
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="admin-page erp-page">
      {tab !== "topdanci" && tab !== "bugun" && tab !== "alis" && tab !== "kasa" && (
        <div className="crm-listbar">
          <div>
            <h2>Mühasib</h2>
            <span>Toptancı alışları, kasalar ve borçlar</span>
          </div>
        </div>
      )}

      <div className="muhasib-tabs">
        {TABS.map((item) => (
          <button
            key={item.id}
            type="button"
            className={tab === item.id ? "btn btn-primary" : "btn"}
            onClick={() => {
              openTab(item.id);
              setError("");
              setMessage("");
            }}
          >
            {item.label}
          </button>
        ))}
      </div>

      {tab !== "topdanci" && error && <div className="alert alert-danger">{error}</div>}
      {tab !== "bugun" && tab !== "topdanci" && message && <div className="alert alert-info">{message}</div>}

      {tab === "bugun" && <AdminDay day={data?.day} onChanged={load} />}

      {tab === "alis" && (
        <form className="alis-layout" onSubmit={savePurchase}>
          <section className="alis-panel alis-catalog">
            <header className="alis-panel__head">
              <h3>
                <span className="alis-step">1</span>Ürün seç
              </h3>
              <span>{lines.length ? `${lines.length} seçili` : `${filtered.length} ürün`}</span>
            </header>
            <div className="crm-global-search">
              <i className="fa fa-search" aria-hidden />
              <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Ürün adı yazın" />
            </div>
            <div className="alis-products">
              {filtered.map((product) => {
                const picked = lines.some((line) => line.productId === product.id);
                return (
                  <button
                    key={product.id}
                    type="button"
                    className={picked ? "alis-product is-in" : "alis-product"}
                    onClick={() => addProduct(product)}
                  >
                    <strong>{product.name}</strong>
                    <span>
                      {picked ? "Seçildi · tekrar basınca çıkar" : `${product.unit || "Adet"} · ${formatMoney(priceFor(product, wholesalerId, prices))}`}
                    </span>
                  </button>
                );
              })}
              {!filtered.length && <p className="alis-empty">Bu aramada ürün yok.</p>}
            </div>
          </section>

          <section className="alis-panel alis-seller">
            <header className="alis-panel__head">
              <h3>
                <span className="alis-step">2</span>Toptancı
              </h3>
              <button type="button" className="btn btn-default btn-sm" onClick={() => setShowNewSeller((open) => !open)}>
                {showNewSeller ? "Kapat" : "Yeni"}
              </button>
            </header>
            <label className="erp-field">
              <span>Kim satıyor</span>
              <select
                value={wholesalerId}
                onChange={(e) => {
                  const nextId = e.target.value;
                  setWholesalerId(nextId);
                  setLines((prev) =>
                    prev.map((line) => {
                      const product = products.find((item) => item.id === line.productId);
                      return product ? { ...line, buyPrice: priceFor(product, nextId, prices) } : line;
                    })
                  );
                }}
              >
                <option value="">Toptancı seçin</option>
                {wholesalers.map((person) => (
                  <option key={person.id} value={person.id}>
                    {person.name}
                    {person.phone ? ` · ${person.phone}` : ""}
                  </option>
                ))}
              </select>
            </label>
            {showNewSeller && (
              <div className="alis-new-seller">
                <input
                  value={newSeller.name}
                  onChange={(e) => setNewSeller({ ...newSeller, name: e.target.value })}
                  placeholder="Ad"
                />
                <input
                  value={newSeller.phone}
                  onChange={(e) => setNewSeller({ ...newSeller, phone: e.target.value })}
                  placeholder="Telefon"
                />
                <button type="button" className="btn btn-primary btn-sm" disabled={saving} onClick={addSeller}>
                  Kaydet
                </button>
              </div>
            )}
            <p className="alis-empty">Seçilen toptancının kayıtlı alış fiyatı sağdaki satırlara yazılır. Orada değiştirilebilir.</p>
          </section>

          <section className="alis-panel alis-cart">
            <header className="alis-panel__head">
              <h3>
                <span className="alis-step">3</span>Say ve öde
              </h3>
              <span>{lines.length} kalem</span>
            </header>
            {!lines.length && <p className="alis-empty">Soldan ürün seçin. Adet ve alış fiyatı burada değişir.</p>}
            {lines.length > 0 && (
              <div className="alis-lines">
                {lines.map((line) => (
                  <article key={line.productId}>
                    <div className="alis-line__top">
                      <strong>{line.name}</strong>
                      <button
                        type="button"
                        className="alis-remove"
                        onClick={() => setLines((prev) => prev.filter((item) => item.productId !== line.productId))}
                      >
                        Sil
                      </button>
                    </div>
                    <div className="alis-line__controls">
                      <div className="alis-qty">
                        <button
                          type="button"
                          onClick={() =>
                            setLines((prev) =>
                              prev.map((item) =>
                                item.productId === line.productId
                                  ? { ...item, qty: Math.max(1, Number(item.qty || 1) - 1) }
                                  : item
                              )
                            )
                          }
                        >
                          −
                        </button>
                        <input
                          type="number"
                          min="0.001"
                          step="0.001"
                          value={line.qty}
                          onChange={(e) =>
                            setLines((prev) =>
                              prev.map((item) =>
                                item.productId === line.productId ? { ...item, qty: e.target.value } : item
                              )
                            )
                          }
                        />
                        <button
                          type="button"
                          onClick={() =>
                            setLines((prev) =>
                              prev.map((item) =>
                                item.productId === line.productId
                                  ? { ...item, qty: Number(item.qty || 0) + 1 }
                                  : item
                              )
                            )
                          }
                        >
                          +
                        </button>
                      </div>
                      <label>
                        <span>Alış</span>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={line.buyPrice}
                          onChange={(e) =>
                            setLines((prev) =>
                              prev.map((item) =>
                                item.productId === line.productId ? { ...item, buyPrice: e.target.value } : item
                              )
                            )
                          }
                        />
                      </label>
                      <b>{formatMoney(Number(line.qty || 0) * Number(line.buyPrice || 0))}</b>
                    </div>
                  </article>
                ))}
              </div>
            )}

            <div className="alis-pay">
              <div className="muhasib-pay">
                {PAYMENTS.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    className={paymentType === item.id ? "btn btn-primary" : "btn"}
                    onClick={() => changePayment(item.id)}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
              {paymentType !== "borc" && (
                <label className="erp-field">
                  <span>{paymentType === "kart" ? "Kart kasası" : "Nakit kasa"}</span>
                  <select value={kassaId} onChange={(e) => setKassaId(e.target.value)}>
                    {kassas
                      .filter((kassa) => (paymentType === "kart" ? kassa.kind !== "nakit" : kassa.kind !== "banka"))
                      .map((kassa) => (
                        <option key={kassa.id} value={kassa.id}>
                          {kassa.name} · {formatMoney(kassa.balance)}
                        </option>
                      ))}
                  </select>
                </label>
              )}
              <label className="erp-field">
                <span>Not</span>
                <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="İsteğe bağlı" />
              </label>
              <footer className="alis-total">
                <div>
                  <span>Toplam</span>
                  <strong>{formatMoney(total)}</strong>
                </div>
                <button type="submit" className="btn btn-primary" disabled={saving || !lines.length}>
                  {saving ? "Kaydediliyor..." : "Alışı kaydet"}
                </button>
              </footer>
            </div>
          </section>
        </form>
      )}

      {tab === "alis" && (
        <section className="erp-panel erp-panel--flush">
          <header className="erp-panel__head" style={{ padding: "14px 16px 0" }}>
            <h3>Alış geçmişi</h3>
            <form className="crm-global-search crm-global-search--inline" onSubmit={(e) => e.preventDefault()}>
              <i className="fa fa-search" aria-hidden />
              <input
                value={historyQuery}
                onChange={(e) => setHistoryQuery(e.target.value)}
                placeholder="Toptancı, ürün..."
              />
            </form>
          </header>
          <div className="admin-table-wrap">
            <table className="erp-table">
              <thead>
                <tr>
                  <th>Zaman</th>
                  <th>Toptancı</th>
                  <th>Ödeme</th>
                  <th>Tutar</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {purchaseRows.map((row) => (
                  <tr key={row.id}>
                    <td>{when(row.createdAt)}</td>
                    <td>
                      {row.wholesalerName || "—"}
                      {row.wholesalerPhone ? ` · ${row.wholesalerPhone}` : ""}
                    </td>
                    <td>
                      {paymentLabel(row.paymentType)}
                      {row.kassaName ? ` · ${row.kassaName}` : ""}
                    </td>
                    <td>{formatMoney(row.total)}</td>
                    <td>
                      <div className="staff-row-actions">
                        <button type="button" className="btn btn-default btn-sm" onClick={() => setInvoice(row)}>
                          Fatura
                        </button>
                        <button
                          type="button"
                          className="btn btn-primary btn-sm"
                          onClick={() => printPurchaseInvoice(row, user?.firmName)}
                        >
                          A4 yazdır
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {!purchaseRows.length && (
                  <tr>
                    <td colSpan={5} className="erp-table__empty">
                      Alış kaydı yok.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      )}

      <Modal open={Boolean(invoice)} size="lg" title="Alış faturası" onClose={() => setInvoice(null)}>
        {invoice && (
          <div>
            <p className="hint-text">
              {when(invoice.createdAt)} · {invoice.wholesalerName || "—"}
              {invoice.wholesalerPhone ? ` · ${invoice.wholesalerPhone}` : ""} · {paymentLabel(invoice.paymentType)}
              {invoice.kassaName ? ` · ${invoice.kassaName}` : ""}
            </p>
            <div className="admin-table-wrap">
              <table className="erp-table">
                <thead>
                  <tr>
                    <th>Ürün</th>
                    <th>Adet</th>
                    <th>Alış fiyatı</th>
                    <th>Tutar</th>
                  </tr>
                </thead>
                <tbody>
                  {invoice.lines.map((line, index) => (
                    <tr key={`${line.productId || line.name}-${index}`}>
                      <td>{line.name}</td>
                      <td>{line.qty}</td>
                      <td>{formatMoney(line.buyPrice)}</td>
                      <td>{formatMoney(Number(line.qty || 0) * Number(line.buyPrice || 0))}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p>
              <strong>Toplam {formatMoney(invoice.total)}</strong>
            </p>
            <div className="form-actions">
              <button type="button" className="btn" onClick={() => setInvoice(null)}>
                Kapat
              </button>
              <button type="button" className="btn btn-primary" onClick={() => printPurchaseInvoice(invoice, user?.firmName)}>
                A4 yazdır
              </button>
            </div>
          </div>
        )}
      </Modal>

      {tab === "topdanci" && (
        <AdminWholesalers
          wholesalers={wholesalers}
          kassas={kassas}
          onChanged={load}
          onStartPurchase={(id) => {
            setWholesalerId(id);
            openTab("alis");
          }}
        />
      )}

      {tab === "kasa" && (
        <KasaDesk
          kassas={kassas}
          branches={data?.branches || []}
          movements={data?.movements || []}
          activeId={kassaPick || pullForm.kassaId}
          onPick={(id) => {
            setKassaPick(id);
            setPullForm((prev) => ({ ...prev, kassaId: id }));
          }}
          showNew={showNewKassa}
          onToggleNew={() => setShowNewKassa((open) => !open)}
          kassaForm={kassaForm}
          setKassaForm={setKassaForm}
          onCreate={addKassa}
          pullForm={pullForm}
          setPullForm={setPullForm}
          onPull={pullCash}
          saving={saving}
        />
      )}

      {tab === "borc" && (
        <section className="erp-panel">
          <header className="erp-panel__head">
            <h3>Açık borçlar</h3>
          </header>
          <div className="erp-table-wrap">
            <table className="erp-table">
              <thead>
                <tr>
                  <th>Toptancı</th>
                  <th>Telefon</th>
                  <th>Borç</th>
                </tr>
              </thead>
              <tbody>
                {wholesalers
                  .filter((person) => person.debt > 0)
                  .map((person) => (
                    <tr key={person.id}>
                      <td>{person.name}</td>
                      <td>{person.phone || "—"}</td>
                      <td>{formatMoney(person.debt)}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
          <form className="erp-form" onSubmit={payDebt}>
            <label className="erp-field">
              <span>Kime</span>
              <select
                value={payForm.wholesalerId}
                onChange={(e) => setPayForm({ ...payForm, wholesalerId: e.target.value })}
              >
                {wholesalers.map((person) => (
                  <option key={person.id} value={person.id}>
                    {person.name} · {formatMoney(person.debt)}
                  </option>
                ))}
              </select>
            </label>
            <label className="erp-field">
              <span>Hangi kasadan</span>
              <select value={payForm.kassaId} onChange={(e) => setPayForm({ ...payForm, kassaId: e.target.value })}>
                {kassas.map((kassa) => (
                  <option key={kassa.id} value={kassa.id}>
                    {kassa.name} · {formatMoney(kassa.balance)}
                  </option>
                ))}
              </select>
            </label>
            <label className="erp-field">
              <span>Tutar</span>
              <input
                type="number"
                min="0.01"
                step="0.01"
                value={payForm.amount}
                onChange={(e) => setPayForm({ ...payForm, amount: e.target.value })}
                required
              />
            </label>
            <div className="erp-field">
              <span>&nbsp;</span>
              <button type="submit" className="btn btn-primary" disabled={saving}>
                Borcu öde
              </button>
            </div>
          </form>
        </section>
      )}
    </div>
  );
}
