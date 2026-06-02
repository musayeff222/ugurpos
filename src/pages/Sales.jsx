import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useStore } from "../store/StoreContext";
import Modal from "../components/ui/Modal";
import { calcCartTotal, formatMoney, uid } from "../utils/format";
import { printSaleReceipt, sendReceiptWhatsApp } from "../utils/printReceipt";
import "../styles/sales.css";

const TAB_COUNT = 5;
const QUICK_LISTS = ["ANA", "Liste 1", "Liste 2", "Liste 3", "Liste 4"];

function emptyCarts() {
  return Array.from({ length: TAB_COUNT }, () => []);
}

export default function Sales() {
  const { user } = useAuth();
  const { state, completeSale } = useStore();
  const [activeTab, setActiveTab] = useState(0);
  const [carts, setCarts] = useState(emptyCarts);
  const [barcode, setBarcode] = useState("");
  const [priceType, setPriceType] = useState("price1");
  const [paid, setPaid] = useState("0");
  const [discount, setDiscount] = useState("");
  const [discountType, setDiscountType] = useState("TL");
  const [miscAmount, setMiscAmount] = useState("");
  const [customerIds, setCustomerIds] = useState(Array(TAB_COUNT).fill(""));
  const [note, setNote] = useState("");
  const [phone, setPhone] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [customerModal, setCustomerModal] = useState(false);
  const [priceModal, setPriceModal] = useState(false);
  const [priceLookup, setPriceLookup] = useState("");
  const [customerSearch, setCustomerSearch] = useState("");
  const [showDetails, setShowDetails] = useState(false);
  const [printOpen, setPrintOpen] = useState(false);
  const [otherOpen, setOtherOpen] = useState(false);
  const [fastListTab, setFastListTab] = useState(0);
  const [message, setMessage] = useState("");
  const [lastSale, setLastSale] = useState(null);
  const [now, setNow] = useState(new Date());
  const barcodeRef = useRef(null);
  const printWrapRef = useRef(null);

  const cart = carts[activeTab];
  const customerId = customerIds[activeTab];
  const selectedCustomer = state.customers.find((c) => c.id === customerId);

  const total = useMemo(
    () => calcCartTotal(cart, Number(discount) || 0, discountType),
    [cart, discount, discountType]
  );
  const change = Math.max(0, (Number(paid) || 0) - total);
  const itemCount = cart.reduce((s, i) => s + i.qty, 0);

  const buildReceiptData = useCallback(
    (saleOverride = null) => {
      const source = saleOverride || (cart.length ? { items: cart } : lastSale);
      if (!source?.items?.length) return null;

      const items = source.items;
      const disc = saleOverride?.discount ?? (cart.length ? Number(discount) || 0 : lastSale?.discount ?? 0);
      const discType = saleOverride?.discountType ?? (cart.length ? discountType : lastSale?.discountType ?? "TL");
      const tot = saleOverride?.total ?? (cart.length ? total : lastSale?.total ?? 0);
      const paidAmt =
        saleOverride?.paidAmount ?? (cart.length ? Number(paid) || 0 : lastSale?.paidAmount ?? 0);
      const payment = saleOverride?.paymentType ?? lastSale?.paymentType ?? "cash";
      const customer =
        saleOverride?.customerName ??
        (cart.length ? selectedCustomer?.name : state.customers.find((c) => c.id === lastSale?.customerId)?.name) ??
        "";

      return {
        storeName: user?.firmName || "Mağaza",
        code: saleOverride?.code ?? lastSale?.code ?? (cart.length ? "ÖNİZLEME" : ""),
        createdAt: saleOverride?.createdAt ?? lastSale?.createdAt ?? new Date().toISOString(),
        items,
        discount: disc,
        discountType: discType,
        total: tot,
        paidAmount: paidAmt,
        change: Math.max(0, paidAmt - tot),
        paymentType: payment,
        customerName: customer,
        staffName: saleOverride?.staffName ?? lastSale?.staffName ?? "Admin",
        note: saleOverride?.note ?? (cart.length ? note : lastSale?.note ?? ""),
      };
    },
    [cart, discount, discountType, lastSale, note, paid, selectedCustomer, state.customers, total, user?.firmName]
  );

  const handlePrint = (paper, copyLabel = "") => {
    const data = buildReceiptData();
    if (!data) {
      setMessage("Yazdırmak için sepete ürün ekleyin veya satış tamamlayın.");
      return;
    }
    const result = printSaleReceipt(data, { paper, copyLabel });
    if (!result.ok) setMessage(result.message);
    else setPrintOpen(false);
  };

  const handleWhatsApp = () => {
    const data = buildReceiptData();
    if (!data) {
      setMessage("Göndermek için sepete ürün ekleyin veya satış tamamlayın.");
      return;
    }
    const result = sendReceiptWhatsApp(data, phone || selectedCustomer?.phone || "");
    if (!result.ok) setMessage(result.message);
    else setPrintOpen(false);
  };

  useEffect(() => {
    if (!printOpen) return undefined;
    const onDocClick = (e) => {
      if (printWrapRef.current && !printWrapRef.current.contains(e.target)) {
        setPrintOpen(false);
      }
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [printOpen]);

  useEffect(() => {
    setPaid(cart.length ? String(total) : "0");
  }, [total, activeTab, cart.length]);

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const setCartForTab = (updater) => {
    setCarts((prev) => {
      const next = [...prev];
      next[activeTab] = typeof updater === "function" ? updater(next[activeTab]) : updater;
      return next;
    });
  };

  const setCustomerForTab = (id) => {
    setCustomerIds((prev) => {
      const next = [...prev];
      next[activeTab] = id;
      return next;
    });
  };

  const addProductToCart = (product, qty = 1) => {
    const price = product[priceType] ?? product.price1;
    setCartForTab((prev) => {
      const existing = prev.find((i) => i.productId === product.id);
      if (existing) {
        return prev.map((i) => (i.productId === product.id ? { ...i, qty: i.qty + qty } : i));
      }
      return [
        ...prev,
        {
          id: uid("line"),
          productId: product.id,
          name: product.name,
          qty,
          price,
          discount: 0,
          note: "",
        },
      ];
    });
    setBarcode("");
    setSearchResults([]);
    barcodeRef.current?.focus();
  };

  const handleBarcodeInput = (value) => {
    setBarcode(value);
    const q = value.trim().toLocaleLowerCase("tr");
    if (q.length >= 2) {
      setSearchResults(
        state.products
          .filter(
            (p) =>
              p.active &&
              (p.barcode.includes(q) ||
                p.name.toLocaleLowerCase("tr").includes(q) ||
                p.stockCode.toLocaleLowerCase("tr").includes(q))
          )
          .slice(0, 8)
      );
    } else {
      setSearchResults([]);
    }
  };

  const submitBarcode = () => {
    const product =
      state.products.find((p) => p.barcode === barcode.trim()) ||
      state.products.find((p) => p.stockCode === barcode.trim());
    if (product) addProductToCart(product);
    else setMessage("Ürün bulunamadı.");
  };

  const addMisc = () => {
    const amount = Number(String(miscAmount).replace(",", "."));
    if (!amount) return;
    setCartForTab((prev) => [
      ...prev,
      {
        id: uid("line"),
        productId: null,
        name: "Muhtelif Tutar",
        qty: 1,
        price: amount,
        discount: 0,
        note: "",
      },
    ]);
    setMiscAmount("");
  };

  const updateQty = (lineId, qty) => {
    setCartForTab((prev) =>
      prev.map((i) => (i.id === lineId ? { ...i, qty: Math.max(1, qty) } : i)).filter((i) => i.qty > 0)
    );
  };

  const removeLine = (lineId) => setCartForTab((prev) => prev.filter((i) => i.id !== lineId));
  const clearCart = () => {
    setCartForTab([]);
    setPaid("0");
    setDiscount("");
  };

  const clearAllLines = () => setCartForTab([]);

  const adjustPaid = (value) => {
    setPaid(String(value));
  };

  const finalize = useCallback(async (paymentType) => {
    if (!cart.length) {
      setMessage("Sepet boş.");
      return;
    }
    if (paymentType === "open" && !customerId) {
      setMessage("Açık hesap için müşteri seçin.");
      setCustomerModal(true);
      return;
    }

    let paidAmount = Number(paid) || 0;
    if (paymentType === "cash") {
      paidAmount = Math.max(paidAmount, total);
    } else if (paymentType === "pos" || paymentType === "partial") {
      paidAmount = total;
    }

    try {
      const sale = await completeSale({
        items: cart,
        paymentType,
        customerId: customerId || null,
        staffName: "Admin",
        note,
        discount: Number(discount) || 0,
        discountType,
        paidAmount,
      });

      setLastSale(sale);
      setMessage("Satış tamamlandı.");
      setCartForTab([]);
      setPaid("0");
      setDiscount("");
      setCustomerForTab("");

      printSaleReceipt(
        {
          storeName: user?.firmName || "Mağaza",
          code: sale.code,
          createdAt: sale.createdAt,
          items: sale.items,
          discount: sale.discount,
          discountType: sale.discountType,
          total: sale.total,
          paidAmount: sale.paidAmount,
          change: Math.max(0, sale.paidAmount - sale.total),
          paymentType: sale.paymentType,
          customerName: selectedCustomer?.name || "",
          staffName: sale.staffName,
          note: sale.note,
        },
        { paper: "thermal", copyLabel: "SATIŞ FİŞİ" }
      );
    } catch (err) {
      setMessage(err.message || "Satış kaydedilemedi.");
    }
  }, [cart, completeSale, customerId, discount, discountType, note, paid, total, selectedCustomer, user?.firmName]);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "F8") {
        e.preventDefault();
        finalize("cash");
      }
      if (e.key === "F9") {
        e.preventDefault();
        finalize("pos");
      }
      if (e.key === "F10") {
        e.preventDefault();
        finalize("open");
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [finalize]);

  const filteredCustomers = state.customers.filter((c) =>
    c.name.toLocaleLowerCase("tr").includes(customerSearch.toLocaleLowerCase("tr"))
  );

  const fastProducts = state.products.filter((p) => p.active && p.onSalePage);

  const tabTotals = carts.map((c) => calcCartTotal(c, 0, "TL"));

  const priceProduct = state.products.find(
    (p) => p.barcode === priceLookup.trim() || p.stockCode === priceLookup.trim()
  );

  return (
    <div className="sales-page bp-sales">
      {message && (
        <div className="alert alert-info sales-alert">
          {message}
          <button type="button" onClick={() => setMessage("")}>
            ×
          </button>
        </div>
      )}

      {/* Top barcode row */}
      <div className="card sales-card sales-card-top">
        <div className="sales-top-grid">
          <div className="sales-top-left">
            <div className="sales-input-group">
              <select className="sales-price-select" value={priceType} onChange={(e) => setPriceType(e.target.value)}>
                <option value="price1">Fiyat 1</option>
                <option value="price2">Fiyat 2</option>
              </select>
              <input
                ref={barcodeRef}
                className="sales-barcode-input"
                placeholder="Ürün barkodunu okutunuz..."
                value={barcode}
                onChange={(e) => handleBarcodeInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && submitBarcode()}
                autoFocus
              />
              <button type="button" className="sales-action-btn btn-primary-sales" onClick={submitBarcode}>
                <i className="fa fa-search-plus" />
                Ara
              </button>
              <button type="button" className="sales-action-btn btn-success-sales" onClick={() => setPriceModal(true)}>
                <i className="fa fa-barcode" />
                Fiyat Gör
              </button>
              <div className="sales-dropdown-wrap" ref={printWrapRef}>
                <button type="button" className="sales-action-btn btn-warning-sales" onClick={() => setPrintOpen(!printOpen)}>
                  <i className="fa fa-print" /> Yazdır
                  <small>
                    {lastSale?.code
                      ? `Son fiş: ${lastSale.code}`
                      : cart.length
                        ? `${itemCount} ürün hazır`
                        : "Satış bekleniyor."}
                  </small>
                </button>
                {printOpen && (
                  <div className="sales-dropdown-menu">
                    <button type="button" onClick={() => handlePrint("thermal", "SATIŞ FİŞİ")}>
                      Termal Yazıcı İle Yazdır
                    </button>
                    <button type="button" onClick={() => handlePrint("a4", "MÜŞTERİ NÜSHASI")}>
                      A4 Yazıcı İle Yazdır
                    </button>
                    <button type="button" onClick={handleWhatsApp}>
                      WhatsApp İle Gönder
                    </button>
                  </div>
                )}
              </div>
              <button type="button" className="sales-action-btn btn-info-sales">
                <i className="fa fa-plus-circle" /> Ödeme Ekle
              </button>
            </div>
            {searchResults.length > 0 && (
              <div className="sales-search-table">
                <table>
                  <thead>
                    <tr>
                      <th>Barkod</th>
                      <th>Stok Kodu</th>
                      <th>Ürün Adı</th>
                      <th>Kalan Stok</th>
                      <th>Fiyat 1</th>
                      <th>Fiyat 2</th>
                    </tr>
                  </thead>
                  <tbody>
                    {searchResults.map((p) => (
                      <tr key={p.id} onClick={() => addProductToCart(p)}>
                        <td>{p.barcode}</td>
                        <td>{p.stockCode}</td>
                        <td>{p.name}</td>
                        <td>{p.stock}</td>
                        <td>{formatMoney(p.price1)}</td>
                        <td>{formatMoney(p.price2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
          <div className="sales-top-right">
            <div className="sales-amount-box">
              <label>Ödenen</label>
              <input
                className="sales-amount paid"
                value={paid}
                onChange={(e) => setPaid(e.target.value.replace(",", "."))}
              />
            </div>
            <div className="sales-amount-box">
              <label>Tutar</label>
              <input className="sales-amount total" value={total.toFixed(2)} readOnly />
            </div>
            <div className="sales-amount-box">
              <label>Para Üstü</label>
              <input className="sales-amount change" value={change.toFixed(2)} readOnly />
            </div>
          </div>
        </div>
      </div>

      {/* Main sales card */}
      <div className="card sales-card sales-card-main">
        <div className="sales-main-grid">
          {/* Left: cart */}
          <div className="sales-main-left">
            <div className="sales-toolbar">
              <div className="sales-toolbar-title">
                <h5>
                  Ürünler <i className="fa fa-info-circle" />
                </h5>
                <span className="sales-item-count">{itemCount}</span>
              </div>
              <div className="sales-toolbar-misc">
                <input placeholder="Muhtelif Tutar" value={miscAmount} onChange={(e) => setMiscAmount(e.target.value)} />
                <button type="button" className="btn btn-primary-rgba" onClick={addMisc}>
                  Ekle
                </button>
              </div>
              <div className="sales-toolbar-discount">
                <input
                  placeholder="İsk. Değeri"
                  value={discount}
                  onChange={(e) => setDiscount(e.target.value.replace(",", "."))}
                />
                <select value={discountType} onChange={(e) => setDiscountType(e.target.value)}>
                  <option value="TL">TRY</option>
                  <option value="Yüzde">Yüzde</option>
                </select>
              </div>
              <div className="sales-dropdown-wrap">
                <button type="button" className="btn btn-dark-rgba" onClick={() => setOtherOpen(!otherOpen)}>
                  <i className="fa fa-cog" /> Diğer
                </button>
                {otherOpen && (
                  <div className="sales-dropdown-menu">
                    <label>
                      <input type="checkbox" /> Terazi Modu
                    </label>
                    <label>
                      <input type="checkbox" /> İade Modu
                    </label>
                  </div>
                )}
              </div>
            </div>

            <ul className="sales-customer-tabs">
              {tabTotals.map((tabTotal, idx) => (
                <li key={idx}>
                  <button
                    type="button"
                    className={activeTab === idx ? "active" : ""}
                    onClick={() => setActiveTab(idx)}
                  >
                    Müşteri {idx + 1} ({tabTotal.toFixed(2)})
                  </button>
                </li>
              ))}
            </ul>

            <div className="sales-cart-scroll">
              <table className="sales-cart-table">
                <thead>
                  <tr>
                    <th style={{ width: 50 }}>
                      <button type="button" className="sales-trash-all" onClick={clearAllLines}>
                        <i className="fa fa-trash" />
                      </button>
                    </th>
                    <th>Ürün</th>
                    <th>İsk./Not</th>
                    <th style={{ width: 120 }}>Miktar</th>
                    <th style={{ width: 90 }}>Fiyat</th>
                    <th style={{ width: 90 }}>Tutar</th>
                    <th style={{ width: 40 }} title="Fiyatı güncelle">
                      G. (?)
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {cart.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="sales-empty">
                        &nbsp;
                      </td>
                    </tr>
                  ) : (
                    cart.map((line) => (
                      <tr key={line.id}>
                        <td>
                          <button type="button" className="sales-trash-all" onClick={() => removeLine(line.id)}>
                            <i className="fa fa-trash" />
                          </button>
                        </td>
                        <td>{line.name}</td>
                        <td>
                          <input className="sales-line-note" defaultValue={line.note} placeholder="" />
                        </td>
                        <td>
                          <input
                            type="number"
                            min="1"
                            className="sales-qty"
                            value={line.qty}
                            onChange={(e) => updateQty(line.id, Number(e.target.value))}
                          />
                        </td>
                        <td>{line.price.toFixed(2)}</td>
                        <td>{(line.qty * line.price).toFixed(2)}</td>
                        <td>
                          <input type="checkbox" />
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Right: payment panel */}
          <div className="sales-main-right">
            <div className="sales-customer-row">
              <input value={selectedCustomer?.name || ""} placeholder="Müşteri Seç" readOnly />
              <button type="button" className="btn btn-info" onClick={() => setCustomerModal(true)}>
                <i className="fa fa-plus-circle" /> Seç
              </button>
              {customerId && (
                <button type="button" className="btn btn-danger btn-xs" onClick={() => setCustomerForTab("")}>
                  <i className="fa fa-times-circle" />
                </button>
              )}
              <button type="button" className="btn btn-warning btn-xs">
                <i className="fa fa-bar-chart" />
              </button>
            </div>

            <div className="sales-meta-row">
              <div className="sales-datetime">{now.toLocaleString("tr-TR")}</div>
              <div className="sales-limit">
                <b>
                  Limit: {(selectedCustomer?.creditLimit || 0).toFixed(2)} Kalan:{" "}
                  {((selectedCustomer?.creditLimit || 0) - (selectedCustomer?.debt || 0)).toFixed(2)}
                </b>
                <button type="button" className="sales-details-toggle" onClick={() => setShowDetails(!showDetails)}>
                  <i className={`fa fa-chevron-${showDetails ? "up" : "down"}`} /> Diğer Detaylar
                </button>
              </div>
            </div>

            {showDetails && (
              <div className="sales-details-panel">
                <input placeholder="Satışa dair notlar" value={note} onChange={(e) => setNote(e.target.value)} />
                <input placeholder="Telefon (5xxxxxxxxxx)" value={phone} onChange={(e) => setPhone(e.target.value)} />
                <label className="sales-sms-label">
                  SMS Gönder <input type="checkbox" />
                </label>
                <div className="sales-details-grid">
                  <div>
                    <label>İşlem Tarihi</label>
                    <input value={now.toLocaleDateString("tr-TR")} disabled />
                  </div>
                  <div>
                    <label>Personel Seçimi</label>
                    <select disabled defaultValue="0">
                      <option value="0">Yönetici</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

            <div className="sales-quick-cash">
              {[20, 50, 100, 200].map((n) => (
                <button key={n} type="button" className="btn btn-primary-rgba" onClick={() => adjustPaid(n)}>
                  {n}
                </button>
              ))}
              <button type="button" className="btn btn-primary-rgba" onClick={() => adjustPaid(Number(paid || 0) + 20)}>
                +20
              </button>
              <button type="button" className="btn btn-primary-rgba" onClick={() => adjustPaid(Math.max(0, Number(paid || 0) - 20))}>
                -20
              </button>
            </div>

            <div className="sales-pay-row">
              <button type="button" className="btn btn-success sales-pay-btn" onClick={() => finalize("cash")}>
                <b>
                  ₺ (F8)
                  <br />
                  NAKİT
                </b>
              </button>
              <button type="button" className="btn btn-info sales-pay-btn" onClick={() => finalize("pos")}>
                <b>
                  <i className="fa fa-credit-card" /> (F9)
                  <br />
                  POS
                </b>
              </button>
              <button type="button" className="btn btn-warning sales-pay-btn" onClick={() => finalize("open")}>
                <b>
                  <i className="fa fa-book" /> (F10)
                  <br />
                  AÇIK HESAP
                </b>
              </button>
              <button type="button" className="btn btn-primary sales-pay-btn" onClick={() => finalize("partial")}>
                <b>
                  <i className="fa fa-random" />
                  <br />
                  PARÇALI
                </b>
              </button>
            </div>

            <ul className="sales-fast-tabs">
              {QUICK_LISTS.map((label, idx) => (
                <li key={label}>
                  <button type="button" className={fastListTab === idx ? "active" : ""} onClick={() => setFastListTab(idx)}>
                    {label}
                  </button>
                </li>
              ))}
            </ul>
            <div className="sales-fast-grid">
              {fastListTab === 0 && fastProducts.length === 0 && (
                <p className="sales-fast-empty">
                  Bu listeye henüz ürün eklememişsiniz. Ürün kartından &quot;Satış sayfasında göster&quot; seçeneği ile
                  ekleyebilirsiniz.
                </p>
              )}
              {fastProducts.map((p) => (
                <button key={p.id} type="button" className="sales-fast-item" onClick={() => addProductToCart(p)}>
                  <span>{p.name}</span>
                  <strong>{formatMoney(p.price1)}</strong>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <Modal open={customerModal} title="Müşteri Seç" onClose={() => setCustomerModal(false)}>
        <input
          className="form-control"
          placeholder="Müşteri ara..."
          value={customerSearch}
          onChange={(e) => setCustomerSearch(e.target.value)}
        />
        <div className="customer-list-modal">
          {filteredCustomers.map((c) => (
            <button
              key={c.id}
              type="button"
              className="customer-option"
              onClick={() => {
                setCustomerForTab(c.id);
                setCustomerModal(false);
              }}
            >
              <strong>{c.name}</strong>
              <span>Borç: {formatMoney(c.debt)}</span>
            </button>
          ))}
        </div>
      </Modal>

      <Modal open={priceModal} title="Fiyat Gör" onClose={() => setPriceModal(false)}>
        <input
          className="form-control"
          placeholder="Barkod okutun..."
          value={priceLookup}
          onChange={(e) => setPriceLookup(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && e.preventDefault()}
        />
        {priceProduct ? (
          <div className="sales-price-result">
            <p>
              <strong>{priceProduct.name}</strong>
            </p>
            <p>Fiyat 1: {formatMoney(priceProduct.price1)}</p>
            <p>Fiyat 2: {formatMoney(priceProduct.price2)}</p>
            <p>Stok: {priceProduct.stock}</p>
          </div>
        ) : (
          priceLookup && <p>Ürün bulunamadı.</p>
        )}
      </Modal>
    </div>
  );
}
