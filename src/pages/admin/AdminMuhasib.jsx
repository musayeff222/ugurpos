import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { api } from "../../api/client";
import { formatMoney } from "../../utils/format";

const TABS = [
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

export default function AdminMuhasib() {
  const [params, setParams] = useSearchParams();
  const tab = TABS.some((item) => item.id === params.get("bolum")) ? params.get("bolum") : "alis";
  const openTab = (id) => setParams(id === "alis" ? {} : { bolum: id }, { replace: true });
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
  const [sellerForm, setSellerForm] = useState(emptySeller);
  const [kassaForm, setKassaForm] = useState({ name: "", kind: "nakit" });
  const [payForm, setPayForm] = useState({ wholesalerId: "", kassaId: "", amount: "" });
  const [pullForm, setPullForm] = useState({ branchId: "", kassaId: "", amount: "" });

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
      const found = prev.find((line) => line.productId === product.id);
      if (found) {
        return prev.map((line) =>
          line.productId === product.id ? { ...line, qty: Number(line.qty || 0) + 1 } : line
        );
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
    setQuery("");
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
        lines: lines.map((line) => ({
          productId: line.productId,
          qty: Number(line.qty),
          buyPrice: Number(line.buyPrice),
        })),
      });
      setLines([]);
      await load();
      setMessage(`Alış kaydedildi. Toplam ${formatMoney(result.total)}. Alış fiyatı bir sonraki sefer için saklandı.`);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const addSeller = async (event, fromPurchase) => {
    event.preventDefault();
    const form = fromPurchase ? newSeller : sellerForm;
    setError("");
    setMessage("");
    setSaving(true);
    try {
      const created = await api.createWholesaler({ name: form.name, phone: form.phone });
      if (fromPurchase) {
        setNewSeller(emptySeller);
        setShowNewSeller(false);
        setWholesalerId(created.id);
      } else {
        setSellerForm(emptySeller);
      }
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
      await api.createAccountKassa(kassaForm);
      setKassaForm({ name: "", kind: "nakit" });
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
        kassaId: pullForm.kassaId,
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
      <div className="crm-listbar">
        <div>
          <h2>Mühasib</h2>
          <span>Toptancı alışları, kasalar ve borçlar</span>
        </div>
      </div>

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

      {error && <div className="alert alert-danger">{error}</div>}
      {message && <div className="alert alert-info">{message}</div>}

      {tab === "alis" && (
        <form className="erp-panel" onSubmit={savePurchase}>
          <header className="erp-panel__head">
            <h3>Yeni alış</h3>
          </header>
          <div className="erp-form">
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
            <div className="erp-field">
              <span>Yeni toptancı</span>
              <button type="button" className="btn" onClick={() => setShowNewSeller((open) => !open)}>
                {showNewSeller ? "Kapat" : "Toptancı ekle"}
              </button>
            </div>
            {showNewSeller && (
              <div className="erp-form-grid erp-field--full">
                <label className="erp-field">
                  <span>Ad</span>
                  <input value={newSeller.name} onChange={(e) => setNewSeller({ ...newSeller, name: e.target.value })} />
                </label>
                <label className="erp-field">
                  <span>Telefon</span>
                  <input value={newSeller.phone} onChange={(e) => setNewSeller({ ...newSeller, phone: e.target.value })} />
                </label>
                <div className="erp-field">
                  <span>&nbsp;</span>
                  <button type="button" className="btn btn-primary" disabled={saving} onClick={(e) => addSeller(e, true)}>
                    Kaydet
                  </button>
                </div>
              </div>
            )}

            <label className="erp-field erp-field--full">
              <span>Ürün ara</span>
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Admin ürün listesinden seçin"
              />
            </label>
            <div className="muhasib-products">
              {filtered.map((product) => (
                <button key={product.id} type="button" className="muhasib-product" onClick={() => addProduct(product)}>
                  <strong>{product.name}</strong>
                  <span>{formatMoney(priceFor(product, wholesalerId, prices))}</span>
                </button>
              ))}
              {!filtered.length && <p>Ürün yok.</p>}
            </div>

            {lines.length > 0 && (
              <div className="erp-table-wrap erp-field--full muhasib-lines">
                <table className="erp-table">
                  <thead>
                    <tr>
                      <th>Ürün</th>
                      <th>Adet</th>
                      <th>Alış fiyatı</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {lines.map((line) => (
                      <tr key={line.productId}>
                        <td>
                          {line.name}
                          {line.unit ? ` (${line.unit})` : ""}
                        </td>
                        <td>
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
                        </td>
                        <td>
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
                        </td>
                        <td>
                          <button
                            type="button"
                            className="btn"
                            onClick={() => setLines((prev) => prev.filter((item) => item.productId !== line.productId))}
                          >
                            Sil
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

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
                <span>{paymentType === "kart" ? "Banka kasası" : "Nakit kasa"}</span>
                <select value={kassaId} onChange={(e) => setKassaId(e.target.value)}>
                  {kassas.map((kassa) => (
                    <option key={kassa.id} value={kassa.id}>
                      {kassa.name} · {formatMoney(kassa.balance)}
                    </option>
                  ))}
                </select>
              </label>
            )}
            <div className="erp-field">
              <span>Toplam</span>
              <strong>{formatMoney(total)}</strong>
            </div>
            <div className="erp-field">
              <span>&nbsp;</span>
              <button type="submit" className="btn btn-primary" disabled={saving}>
                Alışı kaydet
              </button>
            </div>
          </div>
        </form>
      )}

      {tab === "alis" && (data?.purchases || []).length > 0 && (
        <section className="erp-panel">
          <header className="erp-panel__head">
            <h3>Son alışlar</h3>
          </header>
          <div className="erp-table-wrap">
            <table className="erp-table">
              <thead>
                <tr>
                  <th>Toptancı</th>
                  <th>Ödeme</th>
                  <th>Tutar</th>
                  <th>Ürünler</th>
                </tr>
              </thead>
              <tbody>
                {data.purchases.map((row) => (
                  <tr key={row.id}>
                    <td>
                      {row.wholesalerName || "—"}
                      {row.wholesalerPhone ? ` · ${row.wholesalerPhone}` : ""}
                    </td>
                    <td>
                      {paymentLabel(row.paymentType)}
                      {row.kassaName ? ` · ${row.kassaName}` : ""}
                    </td>
                    <td>{formatMoney(row.total)}</td>
                    <td>{row.lines.map((line) => `${line.qty} x ${line.name}`).join(", ")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {tab === "topdanci" && (
        <section className="erp-panel">
          <header className="erp-panel__head">
            <h3>Toptancılar</h3>
          </header>
          <form className="erp-form" onSubmit={(e) => addSeller(e, false)}>
            <label className="erp-field">
              <span>Ad</span>
              <input
                value={sellerForm.name}
                onChange={(e) => setSellerForm({ ...sellerForm, name: e.target.value })}
                required
              />
            </label>
            <label className="erp-field">
              <span>Telefon</span>
              <input value={sellerForm.phone} onChange={(e) => setSellerForm({ ...sellerForm, phone: e.target.value })} />
            </label>
            <div className="erp-field">
              <span>&nbsp;</span>
              <button type="submit" className="btn btn-primary" disabled={saving}>
                Toptancı oluştur
              </button>
            </div>
          </form>
          <div className="erp-table-wrap">
            <table className="erp-table">
              <thead>
                <tr>
                  <th>Ad</th>
                  <th>Telefon</th>
                  <th>Borç</th>
                </tr>
              </thead>
              <tbody>
                {wholesalers.map((person) => (
                  <tr key={person.id}>
                    <td>{person.name}</td>
                    <td>{person.phone || "—"}</td>
                    <td>{formatMoney(person.debt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {tab === "kasa" && (
        <>
          <section className="erp-panel">
            <header className="erp-panel__head">
              <h3>Kasalar</h3>
            </header>
            <div className="muhasib-kassas">
              {kassas.map((kassa) => (
                <article key={kassa.id}>
                  <strong>{kassa.name}</strong>
                  <span>{formatMoney(kassa.balance)}</span>
                </article>
              ))}
            </div>
            <form className="erp-form" onSubmit={addKassa}>
              <label className="erp-field">
                <span>Yeni kasa adı</span>
                <input
                  value={kassaForm.name}
                  onChange={(e) => setKassaForm({ ...kassaForm, name: e.target.value })}
                  required
                />
              </label>
              <label className="erp-field">
                <span>Tür</span>
                <select value={kassaForm.kind} onChange={(e) => setKassaForm({ ...kassaForm, kind: e.target.value })}>
                  <option value="nakit">Nakit</option>
                  <option value="banka">Banka</option>
                  <option value="diger">Diğer</option>
                </select>
              </label>
              <div className="erp-field">
                <span>&nbsp;</span>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  Kasa oluştur
                </button>
              </div>
            </form>
          </section>
          <section className="erp-panel">
            <header className="erp-panel__head">
              <h3>Şubeden kasaya al</h3>
            </header>
            <form className="erp-form" onSubmit={pullCash}>
              <label className="erp-field">
                <span>Şube</span>
                <select
                  value={pullForm.branchId}
                  onChange={(e) => setPullForm({ ...pullForm, branchId: e.target.value })}
                >
                  {(data?.branches || []).map((branch) => (
                    <option key={branch.id} value={branch.id}>
                      {branch.name} · nakit {formatMoney(branch.available)}
                    </option>
                  ))}
                </select>
              </label>
              <label className="erp-field">
                <span>Hangi kasa</span>
                <select value={pullForm.kassaId} onChange={(e) => setPullForm({ ...pullForm, kassaId: e.target.value })}>
                  {kassas.map((kassa) => (
                    <option key={kassa.id} value={kassa.id}>
                      {kassa.name}
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
                  value={pullForm.amount}
                  onChange={(e) => setPullForm({ ...pullForm, amount: e.target.value })}
                  required
                />
              </label>
              <div className="erp-field">
                <span>&nbsp;</span>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  Kasaya al
                </button>
              </div>
            </form>
          </section>
        </>
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
