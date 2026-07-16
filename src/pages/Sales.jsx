import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useLocale } from "../context/LocaleContext";
import { useStore } from "../store/StoreContext";
import { api } from "../api/client";
import Modal from "../components/ui/Modal";
import CashExpenseModal from "../components/CashExpenseModal";
import StaffLoginForm from "../components/StaffLoginForm";
import { navigation } from "../data/navigation";
import { calcCartTotal, formatMoney, uid } from "../utils/format";
import { getPostLoginPath } from "../utils/authRedirect";
import { getProductImageSrc } from "../utils/productImage";
import { printSaleReceipt, sendReceiptWhatsApp } from "../utils/printReceipt";
import { playPosItemAddedSound, playPosPaymentSound } from "../utils/posSounds";
import { getSalePaymentParts } from "../utils/salePayments";
import "../styles/sales.css";

const TAB_COUNT = 5;

function emptyCarts() {
  return Array.from({ length: TAB_COUNT }, () => []);
}

export default function Sales() {
  const { user, logout, endStaffShift, loginStaff, loading: authLoading, isStaffUser, activeStaffRole, activeStaffName, canCashExpense } = useAuth();
  const { t } = useLocale();
  const navigate = useNavigate();
  const { state, completeSale, addCashWithdrawal } = useStore();
  const [activeTab, setActiveTab] = useState(0);
  const [carts, setCarts] = useState(emptyCarts);
  const [barcode, setBarcode] = useState("");
  const [priceType, setPriceType] = useState("price1");
  const [paid, setPaid] = useState("0");
  const [discount, setDiscount] = useState("");
  const [discountType, setDiscountType] = useState("AZN");
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
  const [autoPrint, setAutoPrint] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.localStorage.getItem("posAutoPrintEnabled") === "1";
  });
  const [otherOpen, setOtherOpen] = useState(false);
  const [fastListTab, setFastListTab] = useState(0);
  const [mobileView, setMobileView] = useState("products");
  const [terminalMenuOpen, setTerminalMenuOpen] = useState(false);
  const [staffLoginOpen, setStaffLoginOpen] = useState(false);
  const [shiftEndStep, setShiftEndStep] = useState(null);
  const [expenseModalOpen, setExpenseModalOpen] = useState(false);
  const [expenseLoading, setExpenseLoading] = useState(false);
  const [cashRegisterBalance, setCashRegisterBalance] = useState(null);
  const [splitModalOpen, setSplitModalOpen] = useState(false);
  const [splitCash, setSplitCash] = useState("");
  const [splitPos, setSplitPos] = useState("");
  const [splitError, setSplitError] = useState("");
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
  const gross = useMemo(() => cart.reduce((sum, item) => sum + item.qty * item.price, 0), [cart]);
  const discountAmount = useMemo(() => {
    const value = Number(discount) || 0;
    if (discountType === "Yüzde") return (gross * value) / 100;
    return value;
  }, [discount, discountType, gross]);
  const isCashier = isStaffUser && String(activeStaffRole || "").toLocaleLowerCase("tr").includes("kasiyer");
  const isBranchSession = user?.loginType === "branch";
  const staffRecord = useMemo(
    () => state.staff.find((s) => s.id === user?.staffId),
    [state.staff, user?.staffId]
  );
  const showCashExpense =
    !isStaffUser || isCashier || !!(staffRecord?.canCashExpense ?? canCashExpense);
  const cashierName = activeStaffName || user?.staffName || "Kasiyer";
  const shiftStartedAt = user?.shiftStartedAt || new Date().toISOString().slice(0, 10);
  const shiftSales = useMemo(
    () =>
      state.sales.filter(
        (sale) =>
          sale.paymentType !== "refund" &&
          sale.staffName === cashierName &&
          (!shiftStartedAt || sale.createdAt >= shiftStartedAt)
      ),
    [cashierName, shiftStartedAt, state.sales]
  );
  const shiftSummary = useMemo(() => {
    const shiftWithdrawals = (state.cashWithdrawals || []).filter(
      (row) =>
        row.staffName === cashierName && (!shiftStartedAt || row.createdAt >= shiftStartedAt)
    );
    const withdrawalsTotal = shiftWithdrawals.reduce((sum, row) => sum + Number(row.amount || 0), 0);
    let cash = 0;
    let pos = 0;
    shiftSales.forEach((sale) => {
      const parts = getSalePaymentParts(sale);
      cash += parts.cash;
      pos += parts.pos;
    });
    const partialSales = shiftSales.filter((sale) => sale.paymentType === "partial");
    return {
      count: shiftSales.length,
      total: shiftSales.reduce((sum, sale) => sum + (sale.total || 0), 0),
      cash,
      pos,
      partialTotal: partialSales.reduce((sum, sale) => sum + (sale.total || 0), 0),
      partialCount: partialSales.length,
      withdrawalsTotal,
      cashRegister: cash - withdrawalsTotal,
      withdrawals: shiftWithdrawals,
    };
  }, [shiftSales, state.cashWithdrawals, cashierName, shiftStartedAt]);
  const change = Math.max(0, (Number(paid) || 0) - total);
  const itemCount = cart.reduce((s, i) => s + i.qty, 0);
  const money = (value) => formatMoney(value, "az");

  const loadCashRegisterBalance = useCallback(async () => {
    if (!showCashExpense) return;
    try {
      const data = await api.getCashRegisterBalance();
      setCashRegisterBalance(data);
    } catch {
      setCashRegisterBalance(null);
    }
  }, [showCashExpense]);

  useEffect(() => {
    loadCashRegisterBalance();
  }, [loadCashRegisterBalance, state.sales, state.cashWithdrawals, state.expense]);

  useEffect(() => {
    if (!terminalMenuOpen) return undefined;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [terminalMenuOpen]);

  const productCategories = useMemo(
    () => [{ id: "__all__", name: "Hamısı" }, ...state.groups.map((g) => ({ id: g.id, name: g.name }))],
    [state.groups]
  );

  useEffect(() => {
    if (fastListTab >= productCategories.length) setFastListTab(0);
  }, [fastListTab, productCategories.length]);

  const buildReceiptData = useCallback(
    (saleOverride = null) => {
      const source = saleOverride || (cart.length ? { items: cart } : lastSale);
      if (!source?.items?.length) return null;

      const items = source.items;
      const disc = saleOverride?.discount ?? (cart.length ? Number(discount) || 0 : lastSale?.discount ?? 0);
      const discType = saleOverride?.discountType ?? (cart.length ? discountType : lastSale?.discountType ?? "AZN");
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
    if (!message) return undefined;
    const timer = window.setTimeout(() => setMessage(""), 3500);
    return () => window.clearTimeout(timer);
  }, [message]);

  useEffect(() => {
    setPaid(cart.length ? String(total) : "0");
  }, [total, activeTab, cart.length]);

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem("posAutoPrintEnabled", autoPrint ? "1" : "0");
  }, [autoPrint]);

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
    setMobileView("cart");
    barcodeRef.current?.focus();
    playPosItemAddedSound();
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
    playPosItemAddedSound();
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

  const finalize = useCallback(async (paymentType, options = {}) => {
    if (!cart.length) {
      setMessage("Sepet boş.");
      return;
    }

    let paidAmount = Number(paid) || 0;
    if (paymentType === "cash") {
      paidAmount = Math.max(paidAmount, total);
    } else if (paymentType === "pos" || paymentType === "partial") {
      paidAmount = total;
    }

    const payload = {
      items: cart,
      paymentType,
      customerId: customerId || null,
      staffName: user?.staffName || "Admin",
      note,
      discount: Number(discount) || 0,
      discountType,
      paidAmount,
    };

    if (paymentType === "partial") {
      payload.cashAmount = options.cashAmount;
      payload.posAmount = options.posAmount;
    }

    try {
      const sale = await completeSale(payload);

      setLastSale(sale);
      setMessage("Satış tamamlandı.");
      playPosPaymentSound();
      setCartForTab([]);
      setPaid("0");
      setDiscount("");
      setCustomerForTab("");
      setSplitModalOpen(false);
      setSplitCash("");
      setSplitPos("");
      setSplitError("");

      if (autoPrint) {
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
            cashAmount: sale.cashAmount,
            posAmount: sale.posAmount,
            change: Math.max(0, sale.paidAmount - sale.total),
            paymentType: sale.paymentType,
            customerName: selectedCustomer?.name || "",
            staffName: sale.staffName,
            note: sale.note,
          },
          { paper: "thermal", copyLabel: "SATIŞ FİŞİ" }
        );
      }
    } catch (err) {
      setMessage(err.message || "Satış kaydedilemedi.");
      if (paymentType === "partial") {
        setSplitError(err.message || "Satış kaydedilemedi.");
      }
    }
  }, [autoPrint, cart, completeSale, customerId, discount, discountType, note, paid, total, selectedCustomer, user?.firmName, user?.staffName]);

  const openSplitModal = useCallback(() => {
    if (!cart.length) {
      setMessage("Sepet boş.");
      return;
    }
    setSplitCash("");
    setSplitPos("");
    setSplitError("");
    setSplitModalOpen(true);
  }, [cart.length]);

  const handleSplitCashChange = (value) => {
    const raw = value.replace(",", ".");
    setSplitCash(raw);
    setSplitError("");
    const cash = Number(raw);
    if (!Number.isNaN(cash) && raw !== "") {
      setSplitPos(String(Math.max(0, Number((total - cash).toFixed(2)))));
    }
  };

  const handleSplitPosChange = (value) => {
    const raw = value.replace(",", ".");
    setSplitPos(raw);
    setSplitError("");
    const pos = Number(raw);
    if (!Number.isNaN(pos) && raw !== "") {
      setSplitCash(String(Math.max(0, Number((total - pos).toFixed(2)))));
    }
  };

  const submitSplitPayment = async (e) => {
    e?.preventDefault();
    const cash = Number(splitCash) || 0;
    const pos = Number(splitPos) || 0;
    if (cash <= 0 && pos <= 0) {
      setSplitError("Nakit və ya kart məbləği daxil edin.");
      return;
    }
    if (Math.abs(cash + pos - total) > 0.009) {
      setSplitError(`Nakit + kart = ${money(total)} olmalıdır.`);
      return;
    }
    await finalize("partial", { cashAmount: cash, posAmount: pos });
  };

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
        openSplitModal();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [finalize, openSplitModal]);

  const filteredCustomers = state.customers.filter((c) =>
    c.name.toLocaleLowerCase("tr").includes(customerSearch.toLocaleLowerCase("tr"))
  );

  const fastProducts = state.products.filter((p) => p.active && p.onSalePage);

  const tabTotals = carts.map((c) => calcCartTotal(c, 0, "AZN"));

  const priceProduct = state.products.find(
    (p) => p.barcode === priceLookup.trim() || p.stockCode === priceLookup.trim()
  );

  const visibleProducts = useMemo(() => {
    const saleProducts = state.products.filter((p) => p.active && p.onSalePage);
    const pool = saleProducts.length ? saleProducts : state.products.filter((p) => p.active);
    const category = productCategories[fastListTab] || productCategories[0];
    if (!category || category.id === "__all__") return pool;
    return pool.filter((p) => p.groupId === category.id);
  }, [state.products, productCategories, fastListTab]);

  const handleCashExpenseSubmit = async ({ amount, reason, note }) => {
    setExpenseLoading(true);
    setMessage("");
    try {
      await addCashWithdrawal({ amount, reason, note });
      setMessage("Kassadan xərc qeyd edildi.");
      await loadCashRegisterBalance();
      setExpenseModalOpen(false);
    } catch (err) {
      throw err;
    } finally {
      setExpenseLoading(false);
    }
  };

  const terminalNavigation = isCashier ? navigation.filter((item) => item.path === "/sales") : navigation;

  const handleStaffLogin = async (staffLogin, staffPassword) => {
    const account = await loginStaff(staffLogin, staffPassword, { fromBranch: isBranchSession });
    setStaffLoginOpen(false);
    setTerminalMenuOpen(false);
    navigate(getPostLoginPath(account), { replace: true });
  };

  const handleEndShift = () => {
    const result = endStaffShift();
    setShiftEndStep(null);
    if (result === "branch") {
      navigate("/sales", { replace: true });
      return;
    }
    logout();
    navigate("/login", { replace: true });
  };

  const handleShiftEndRequest = () => {
    setTerminalMenuOpen(false);
    setShiftEndStep("confirm");
  };

  const handleShiftEndConfirm = () => {
    setShiftEndStep("summary");
  };

  return (
    <div className={`sales-page bp-sales sales-terminal dzy-sales dzy-sales--${mobileView}`}>
      {message && (
        <div className="alert alert-info sales-alert">
          {message}
          <button type="button" onClick={() => setMessage("")}>
            ×
          </button>
        </div>
      )}

      <header className="dzy-sales__top">
        <div className="dzy-sales__terminal">
          <button
            type="button"
            className="dzy-sales__menu-btn"
            onClick={() => setTerminalMenuOpen((open) => !open)}
            aria-label="Menünü aç"
            aria-expanded={terminalMenuOpen}
          >
            <i className="fa fa-bars" />
          </button>
          <strong>Terminal 01</strong>
        </div>
        <div className="dzy-sales__search">
          <i className="fa fa-barcode" />
          <select className="sales-price-select" value={priceType} onChange={(e) => setPriceType(e.target.value)}>
            <option value="price1">Fiyat 1</option>
            <option value="price2">Fiyat 2</option>
          </select>
          <input
            ref={barcodeRef}
            className="sales-barcode-input"
            placeholder="Barkod okutun veya ürün arayın..."
            value={barcode}
            onChange={(e) => handleBarcodeInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && submitBarcode()}
            autoFocus
          />
          <button type="button" className="dzy-sales__icon-btn dzy-sales__icon-btn--primary" onClick={submitBarcode}>
            <i className="fa fa-search" />
          </button>
          <button type="button" className="dzy-sales__icon-btn dzy-sales__icon-btn--soft" onClick={() => setPriceModal(true)}>
            <i className="fa fa-line-chart" />
          </button>
          <div className="sales-dropdown-wrap" ref={printWrapRef}>
            <button type="button" className="dzy-sales__icon-btn dzy-sales__icon-btn--soft" onClick={() => setPrintOpen(!printOpen)}>
              <i className="fa fa-print" />
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
                <button type="button" onClick={() => setAutoPrint((prev) => !prev)}>
                  Auto Print: {autoPrint ? "ON" : "OFF"}
                </button>
              </div>
            )}
          </div>
        </div>
        <div className="dzy-sales__grand-total">
          <span>CƏMİ MƏBLƏĞ</span>
          <strong>{money(total)}</strong>
        </div>
      </header>

      <section className="dzy-payment-panel" aria-label="Ödəniş məlumatı">
        <label>
          <span>Ödənilən</span>
          <input
            value={paid}
            onChange={(e) => setPaid(e.target.value.replace(",", "."))}
            inputMode="decimal"
            placeholder="0.00"
          />
        </label>
        <div className="dzy-payment-panel__quick">
          {[10, 20, 50, 100].map((n) => (
            <button key={n} type="button" onClick={() => adjustPaid(n)}>
              {n}
            </button>
          ))}
        </div>
        <strong className="dzy-payment-panel__change">Para üstü: {money(change)}</strong>
      </section>

      {terminalMenuOpen && (
        <div className="dzy-terminal-menu">
          <div className="dzy-terminal-menu__backdrop" onClick={() => setTerminalMenuOpen(false)} />
          <nav className="dzy-terminal-menu__panel" aria-label="POS menü">
            <div className="dzy-terminal-menu__head">
              <strong>BenimPOS</strong>
              <button type="button" onClick={() => setTerminalMenuOpen(false)} aria-label="Menünü bağla">
                ×
              </button>
            </div>
            <div className="dzy-terminal-menu__body">
            {isBranchSession && (
              <div className="dzy-terminal-menu__staff-login">
                <span>{t("login.staffFromBranch")}</span>
                <button type="button" onClick={() => setStaffLoginOpen(true)}>
                  {t("login.staffSubmit")}
                </button>
              </div>
            )}
            {terminalNavigation.map((item) =>
              item.children?.length ? (
                <div className="dzy-terminal-menu__group" key={item.labelKey || item.label}>
                  <span>
                    <i className={`fa ${item.icon}`} />
                    {item.labelKey ? t(item.labelKey) : item.label}
                  </span>
                  {item.children.map((child) => (
                    <Link key={child.path} to={child.path} onClick={() => setTerminalMenuOpen(false)}>
                      {child.labelKey ? t(child.labelKey) : child.label}
                    </Link>
                  ))}
                </div>
              ) : (
                <Link
                  key={item.path}
                  className="dzy-terminal-menu__link"
                  to={item.path}
                  onClick={() => setTerminalMenuOpen(false)}
                >
                  <i className={`fa ${item.icon}`} />
                  {item.labelKey ? t(item.labelKey) : item.label}
                </Link>
              )
            )}
            {showCashExpense && (
              <button
                type="button"
                className="dzy-terminal-menu__expense-btn"
                onClick={() => {
                  setExpenseModalOpen(true);
                  setTerminalMenuOpen(false);
                }}
              >
                <i className="fa fa-minus-circle" />
                Kassadan xərc
              </button>
            )}
            {isCashier && (
              <button type="button" className="dzy-terminal-menu__shift" onClick={handleShiftEndRequest}>
                <i className="fa fa-sign-out" />
                Nöbeti Bitir
              </button>
            )}
            </div>
          </nav>
        </div>
      )}

      {searchResults.length > 0 && (
        <div className="dzy-sales__search-results">
          {searchResults.map((p) => (
            <button key={p.id} type="button" onClick={() => addProductToCart(p)}>
              <span>{p.name}</span>
              <strong>{money(p[priceType] ?? p.price1)}</strong>
            </button>
          ))}
        </div>
      )}

      <main className="dzy-sales__workspace">
        <aside className="dzy-cart">
          <div className="dzy-cart__head">
            <h5>SƏBƏT ({itemCount} ELEMENT)</h5>
            <button type="button" onClick={clearAllLines}>
              <i className="fa fa-trash" /> Təmizlə
            </button>
          </div>
          <ul className="dzy-cart__tabs">
            {tabTotals.map((tabTotal, idx) => (
              <li key={idx}>
                <button type="button" className={activeTab === idx ? "active" : ""} onClick={() => setActiveTab(idx)}>
                  Müşteri {idx + 1} ({tabTotal.toFixed(2)})
                </button>
              </li>
            ))}
          </ul>
          <div className="dzy-cart__table">
            <table>
              <thead>
                <tr>
                  <th>Məhsul</th>
                  <th>Miqdar</th>
                  <th>Qiymət</th>
                  <th>Məbləğ</th>
                </tr>
              </thead>
              <tbody>
                {cart.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="sales-empty">
                      Sepet boş.
                    </td>
                  </tr>
                ) : (
                  cart.map((line) => (
                    <tr key={line.id}>
                      <td>
                        <strong>{line.name}</strong>
                        <button type="button" className="dzy-cart__remove" onClick={() => removeLine(line.id)}>
                          <i className="fa fa-trash" />
                        </button>
                      </td>
                      <td>
                        <div className="dzy-cart__qty">
                          <button type="button" onClick={() => updateQty(line.id, line.qty - 1)}>
                            -
                          </button>
                          <input
                            type="number"
                            min="1"
                            value={line.qty}
                            onChange={(e) => updateQty(line.id, Number(e.target.value))}
                          />
                          <button type="button" onClick={() => updateQty(line.id, line.qty + 1)}>
                            +
                          </button>
                        </div>
                      </td>
                      <td>{line.price.toFixed(2)}</td>
                      <td>{(line.qty * line.price).toFixed(2)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          <div className="dzy-cart__footer">
            <div>
              <span>Ara cəmi:</span>
              <strong>{money(gross)}</strong>
            </div>
            <div>
              <span>ƏDV (18%):</span>
              <strong>{money(gross * 0.18)}</strong>
            </div>
            <div className="dzy-cart__footer-actions">
              <button type="button" onClick={() => handlePrint("thermal", "SATIŞ FİŞİ")}>
                Qəbz Çap Et
              </button>
              <button type="button" onClick={() => setShowDetails(!showDetails)}>
                Endirim Et
              </button>
            </div>
          </div>
        </aside>

        <section className="dzy-products">
          <ul className="dzy-products__categories">
            {productCategories.map((category, idx) => (
              <li key={category.id}>
                <button type="button" className={fastListTab === idx ? "active" : ""} onClick={() => setFastListTab(idx)}>
                  {category.name}
                </button>
              </li>
            ))}
          </ul>
          <div className="dzy-products__grid">
            {visibleProducts.length === 0 ? (
              <p className="dzy-products__empty">Bu qrupda məhsul yoxdur.</p>
            ) : (
              visibleProducts.map((p) => (
              <button key={p.id} type="button" className="dzy-product-card" onClick={() => addProductToCart(p)}>
                {p.hasImage ? (
                  <img src={getProductImageSrc(p)} alt="" loading="lazy" />
                ) : (
                  <span className="dzy-product-card__placeholder">
                    <i className="fa fa-shopping-bag" />
                  </span>
                )}
                <span>{p.name}</span>
                <strong>{money(p.price1)}</strong>
              </button>
              ))
            )}
          </div>
        </section>
      </main>

      {showDetails && (
        <div className="dzy-sales__drawer">
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
              <option value="AZN">AZN</option>
              <option value="Yüzde">Yüzde</option>
            </select>
          </div>
          <input placeholder="Satışa dair notlar" value={note} onChange={(e) => setNote(e.target.value)} />
          <input placeholder="Telefon (5xxxxxxxxxx)" value={phone} onChange={(e) => setPhone(e.target.value)} />
          <button type="button" className="btn btn-info" onClick={() => setCustomerModal(true)}>
            Müşteri Seç
          </button>
        </div>
      )}

      <footer className="dzy-paybar">
        <button type="button" className="dzy-paybar__btn dzy-paybar__btn--cash" onClick={() => finalize("cash")}>
          <i className="fa fa-money" />
          <span>NAKİT</span>
        </button>
        <button type="button" className="dzy-paybar__btn dzy-paybar__btn--pos" onClick={() => finalize("pos")}>
          <i className="fa fa-credit-card" />
          <span>POS</span>
        </button>
        <button type="button" className="dzy-paybar__btn dzy-paybar__btn--partial" onClick={openSplitModal}>
          <i className="fa fa-columns" />
          <span>HİSSƏLİ</span>
        </button>
        <button type="button" className="dzy-paybar__print" onClick={() => handlePrint("thermal", "SATIŞ FİŞİ")}>
          <i className="fa fa-print" />
        </button>
      </footer>

      <nav className="dzy-mobile-nav" aria-label="Mobil satış bölmələri">
        <button
          type="button"
          className={mobileView === "products" ? "active" : ""}
          onClick={() => setMobileView("products")}
        >
          <i className="fa fa-th-large" />
          <span>Məhsullar</span>
        </button>
        <button
          type="button"
          className={mobileView === "cart" ? "active" : ""}
          onClick={() => setMobileView("cart")}
        >
          <i className="fa fa-shopping-cart" />
          <span>Səbət ({itemCount})</span>
        </button>
      </nav>

      <div className="dzy-sales__hidden-tools">
        <input
          value={paid}
          onChange={(e) => setPaid(e.target.value.replace(",", "."))}
          placeholder="Ödənilən"
          aria-label="Ödənilən"
        />
        <button type="button" onClick={() => adjustPaid(Number(paid || 0) + 20)}>
          +20
        </button>
        <button type="button" onClick={() => adjustPaid(Math.max(0, Number(paid || 0) - 20))}>
          -20
        </button>
        <button type="button" onClick={() => setOtherOpen(!otherOpen)}>
          Diğer
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
        <div>
          <span>{now.toLocaleString("tr-TR")}</span>
          <span>Para Üstü: {change.toFixed(2)}</span>
          <span>
            Limit: {(selectedCustomer?.creditLimit || 0).toFixed(2)} Kalan:{" "}
            {((selectedCustomer?.creditLimit || 0) - (selectedCustomer?.debt || 0)).toFixed(2)}
          </span>
          {customerId && (
            <button type="button" onClick={() => setCustomerForTab("")}>
              Müşteri kaldır
            </button>
          )}
        </div>
      </div>

      <CashExpenseModal
        open={expenseModalOpen}
        onClose={() => setExpenseModalOpen(false)}
        onSubmit={handleCashExpenseSubmit}
        balance={cashRegisterBalance}
        loading={expenseLoading}
      />

      <Modal
        open={shiftEndStep === "confirm"}
        title="Nöbeti bitir"
        onClose={() => setShiftEndStep(null)}
      >
        <p className="cashier-shift-confirm__text">Növbəni bitirmək istəyirsiniz?</p>
        <p className="cashier-shift-confirm__hint">Təsdiq etdikdən sonra növbə xülasəsi göstəriləcək və hesabdan çıxış ediləcək.</p>
        <div className="cashier-shift-summary__actions">
          <button type="button" className="btn btn-default" onClick={() => setShiftEndStep(null)}>
            Xeyr
          </button>
          <button type="button" className="btn btn-danger" onClick={handleShiftEndConfirm}>
            Bəli, bitir
          </button>
        </div>
      </Modal>

      <Modal
        open={shiftEndStep === "summary"}
        title="Nöbet Çıkış Özeti"
        onClose={() => {}}
        closable={false}
        size="lg"
      >
        <div className="cashier-shift-summary">
          <div className="cashier-shift-summary__hero">
            <span>Kasiyer</span>
            <strong>{cashierName}</strong>
            <small>Giriş: {shiftStartedAt ? new Date(shiftStartedAt).toLocaleString("tr-TR") : "—"}</small>
          </div>
          <div className="cashier-shift-summary__grid">
            <div>
              <span>Satış adedi</span>
              <strong>{shiftSummary.count}</strong>
            </div>
            <div>
              <span>Toplam satış</span>
              <strong>{money(shiftSummary.total)}</strong>
            </div>
            <div>
              <span>Nakit</span>
              <strong>{money(shiftSummary.cash)}</strong>
            </div>
            <div>
              <span>POS</span>
              <strong>{money(shiftSummary.pos)}</strong>
            </div>
            <div>
              <span>Hissəli ödəmə</span>
              <strong>{money(shiftSummary.partialTotal)}</strong>
              {shiftSummary.partialCount > 0 && <small>{shiftSummary.partialCount} satış</small>}
            </div>
            <div>
              <span>Kassadan xərc</span>
              <strong>{money(shiftSummary.withdrawalsTotal)}</strong>
            </div>
            <div>
              <span>Nakit kasa</span>
              <strong className={Number(cashRegisterBalance?.balance ?? shiftSummary.cashRegister) < 0 ? "cash-negative" : ""}>
                {money(cashRegisterBalance?.balance ?? shiftSummary.cashRegister)}
              </strong>
            </div>
          </div>
          {shiftSummary.withdrawals.length > 0 && (
            <div className="cashier-shift-summary__expenses">
              <span>Kassadan çıxarılanlar</span>
              <ul>
                {shiftSummary.withdrawals.map((row) => (
                  <li key={row.id}>
                    <strong>{money(row.amount)}</strong>
                    <span>{row.reason}</span>
                    <time>{new Date(row.createdAt).toLocaleString("tr-TR")}</time>
                  </li>
                ))}
              </ul>
            </div>
          )}
          <p className="cashier-shift-summary__notice">
            Növbə bitdi. Məlumatı yoxlayın və çıxış edin.
          </p>
          <div className="cashier-shift-summary__actions cashier-shift-summary__actions--final">
            <button type="button" className="btn btn-danger" onClick={handleEndShift}>
              Çıxış et
            </button>
          </div>
        </div>
      </Modal>

      <Modal open={splitModalOpen} title="Hissəli ödəmə" onClose={() => setSplitModalOpen(false)}>
        <form className="split-payment-form" onSubmit={submitSplitPayment}>
          <p className="split-payment-form__total">
            Toplam: <strong>{money(total)}</strong>
          </p>
          <label>Nakit (AZN)</label>
          <input
            type="number"
            step="0.01"
            min="0"
            placeholder="0.00"
            value={splitCash}
            onChange={(e) => handleSplitCashChange(e.target.value)}
            autoFocus
          />
          <label>Kart / POS (AZN)</label>
          <input
            type="number"
            step="0.01"
            min="0"
            placeholder="0.00"
            value={splitPos}
            onChange={(e) => handleSplitPosChange(e.target.value)}
          />
          {splitError && <p className="login-error">{splitError}</p>}
          <div className="form-actions">
            <button type="button" className="btn btn-default" onClick={() => setSplitModalOpen(false)}>
              Ləğv et
            </button>
            <button type="submit" className="btn btn-success">
              Satışı tamamla
            </button>
          </div>
        </form>
      </Modal>

      <Modal open={staffLoginOpen} title={t("login.staffTitle")} onClose={() => setStaffLoginOpen(false)}>
        <StaffLoginForm onSubmit={handleStaffLogin} loading={authLoading} compact />
      </Modal>

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
              <span>Borç: {money(c.debt)}</span>
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
            <p>Fiyat 1: {money(priceProduct.price1)}</p>
            <p>Fiyat 2: {money(priceProduct.price2)}</p>
            <p>Stok: {priceProduct.stock}</p>
          </div>
        ) : (
          priceLookup && <p>Ürün bulunamadı.</p>
        )}
      </Modal>
    </div>
  );
}
