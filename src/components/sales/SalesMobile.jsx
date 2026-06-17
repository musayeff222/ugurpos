import { useNavigate } from "react-router-dom";
import { formatMoney } from "../../utils/format";
import { getProductImageSrc } from "../../utils/productImage";

const QUICK_LISTS = ["Liste 1", "Liste 2", "Liste 3", "Liste 4"];

export default function SalesMobile({
  barcodeRef,
  barcode,
  onBarcodeChange,
  onBarcodeSubmit,
  priceType,
  onPriceTypeChange,
  activeTab,
  onTabChange,
  tabTotals,
  cart,
  gross,
  discountAmount,
  total,
  itemCount,
  onUpdateQty,
  onRemoveLine,
  selectedCustomer,
  onOpenCustomer,
  onClearCustomer,
  note,
  onNoteChange,
  showPrice,
  onShowPriceChange,
  returnMode,
  onReturnModeChange,
  onFinalize,
  onPrintToggle,
  onPriceModal,
  onQuickCash,
  fastListTab,
  onFastListTabChange,
  fastProducts,
  onAddProduct,
  searchResults,
}) {
  const navigate = useNavigate();

  const focusScan = () => {
    barcodeRef.current?.focus();
    barcodeRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  return (
    <div className="sales-mobile">
      <header className="sales-mobile__header">
        <button type="button" className="sales-mobile__header-btn" onClick={() => navigate("/menu")} aria-label="Geri">
          <i className="fa fa-chevron-left" />
        </button>
        <h1 className="sales-mobile__title">Satış Yap</h1>
        <div className="sales-mobile__header-actions">
          <button type="button" className="sales-mobile__header-btn" onClick={onPriceModal} aria-label="Fiyat gör">
            <i className="fa fa-line-chart" />
          </button>
          <button type="button" className="sales-mobile__header-btn" onClick={() => onOpenCustomer()} aria-label="Müşteri">
            <i className="fa fa-plus-circle" />
          </button>
          <button type="button" className="sales-mobile__header-btn sales-mobile__header-btn--cash" onClick={() => onQuickCash(100)}>
            100
          </button>
          <button type="button" className="sales-mobile__header-btn" onClick={onPrintToggle} aria-label="Yazdır">
            <i className="fa fa-print" />
          </button>
        </div>
      </header>

      <div className="sales-mobile__stats">
        <div>
          <span>Miktar</span>
          <strong>{itemCount.toFixed(2)}</strong>
        </div>
        <div>
          <span>Brüt</span>
          <strong>₺{gross.toFixed(2)}</strong>
        </div>
        <div>
          <span>İskonto</span>
          <strong>%{gross > 0 ? ((discountAmount / gross) * 100).toFixed(2) : "0.00"}</strong>
        </div>
        <div>
          <span>Tutar</span>
          <strong className="sales-mobile__total">₺{total.toFixed(2)}</strong>
        </div>
      </div>

      <div className="sales-mobile__search">
        <div className="sales-mobile__search-field">
          <i className="fa fa-search" />
          <input
            ref={barcodeRef}
            type="text"
            inputMode="search"
            autoComplete="off"
            placeholder="Ürün barkodun..."
            value={barcode}
            onChange={(e) => onBarcodeChange(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && onBarcodeSubmit()}
          />
        </div>
        <select className="sales-mobile__price-select" value={priceType} onChange={(e) => onPriceTypeChange(e.target.value)}>
          <option value="price1">Fiyat 1</option>
          <option value="price2">Fiyat 2</option>
        </select>
      </div>

      {searchResults.length > 0 && (
        <div className="sales-mobile__search-results">
          {searchResults.map((p) => (
            <button key={p.id} type="button" className="sales-mobile__search-item" onClick={() => onAddProduct(p)}>
              <span>{p.name}</span>
              <strong>{formatMoney(p[priceType] ?? p.price1)}</strong>
            </button>
          ))}
        </div>
      )}

      <div className="sales-mobile__tabs">
        {tabTotals.map((tabTotal, idx) => (
          <button
            key={idx}
            type="button"
            className={`sales-mobile__tab ${activeTab === idx ? "is-active" : ""}`}
            onClick={() => onTabChange(idx)}
          >
            Müşteri {idx + 1} ({tabTotal.toFixed(2)})
          </button>
        ))}
      </div>

      <div className="sales-mobile__cart">
        {cart.length === 0 ? (
          <p className="sales-mobile__empty">
            Listede ürün bulunamadı. Ürün kartında &apos;Satış sayfasında göster&apos; seçeneği ile ürünlerinizi bu
            ekrana alabilirsiniz.
          </p>
        ) : (
          <ul className="sales-mobile__lines">
            {cart.map((line) => (
              <li key={line.id} className="sales-mobile__line">
                <div className="sales-mobile__line-main">
                  <strong>{line.name}</strong>
                  <span>₺{(line.qty * line.price).toFixed(2)}</span>
                </div>
                <div className="sales-mobile__line-actions">
                  <button type="button" onClick={() => onUpdateQty(line.id, line.qty - 1)} aria-label="Azalt">
                    −
                  </button>
                  <input
                    type="number"
                    min="1"
                    value={line.qty}
                    onChange={(e) => onUpdateQty(line.id, Number(e.target.value))}
                  />
                  <button type="button" onClick={() => onUpdateQty(line.id, line.qty + 1)} aria-label="Artır">
                    +
                  </button>
                  {showPrice && <span className="sales-mobile__unit-price">₺{line.price.toFixed(2)}</span>}
                  <button type="button" className="sales-mobile__line-remove" onClick={() => onRemoveLine(line.id)}>
                    <i className="fa fa-trash" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="sales-mobile__panel">
        <div className="sales-mobile__customer">
          <i className="fa fa-user" />
          <div className="sales-mobile__customer-text">
            <strong>{selectedCustomer?.name || "Müşterisiz satış"}</strong>
            <span>
              (Borç : {(selectedCustomer?.debt || 0).toFixed(2)} Limit : {(selectedCustomer?.creditLimit || 0).toFixed(2)})
            </span>
          </div>
          <button type="button" className="sales-mobile__customer-add" onClick={onOpenCustomer} aria-label="Müşteri seç">
            <i className="fa fa-user-plus" />
          </button>
          {selectedCustomer && (
            <button type="button" className="sales-mobile__customer-clear" onClick={onClearCustomer} aria-label="Müşteri kaldır">
              <i className="fa fa-times" />
            </button>
          )}
        </div>

        <div className="sales-mobile__note-row">
          <input
            className="sales-mobile__note"
            placeholder="Satış notu"
            value={note}
            onChange={(e) => onNoteChange(e.target.value)}
          />
          <span className="sales-mobile__version">App V.1.7.7</span>
        </div>

        <div className="sales-mobile__toggles">
          <label>
            <input type="checkbox" checked={showPrice} onChange={(e) => onShowPriceChange(e.target.checked)} />
            Fiyat gör
          </label>
          <label>
            <input type="checkbox" checked={returnMode} onChange={(e) => onReturnModeChange(e.target.checked)} />
            İade modu
          </label>
        </div>

        <div className="sales-mobile__pay-row">
          <button type="button" className="sales-mobile__pay sales-mobile__pay--cash" onClick={() => onFinalize("cash")}>
            Nakit
          </button>
          <button type="button" className="sales-mobile__pay sales-mobile__pay--pos" onClick={() => onFinalize("pos")}>
            Pos
          </button>
          <button type="button" className="sales-mobile__pay sales-mobile__pay--open" onClick={() => onFinalize("open")}>
            Açık Hesap
          </button>
          <button type="button" className="sales-mobile__pay sales-mobile__pay--partial" onClick={() => onFinalize("partial")}>
            Parçalı
          </button>
        </div>

        <ul className="sales-mobile__fast-tabs">
          {QUICK_LISTS.map((label, idx) => (
            <li key={label}>
              <button
                type="button"
                className={fastListTab === idx + 1 ? "is-active" : ""}
                onClick={() => onFastListTabChange(idx + 1)}
              >
                {label}
              </button>
            </li>
          ))}
        </ul>

        {fastListTab > 0 && (
          <div className="sales-mobile__fast-grid">
            {fastProducts.length === 0 ? (
              <p className="sales-mobile__empty sales-mobile__empty--compact">
                Bu listeye henüz ürün eklenmemiş.
              </p>
            ) : (
              fastProducts.map((p) => (
                <button key={p.id} type="button" className="sales-mobile__fast-item" onClick={() => onAddProduct(p)}>
                  {p.hasImage ? (
                    <img src={getProductImageSrc(p)} alt="" loading="lazy" />
                  ) : (
                    <span className="sales-mobile__fast-icon">
                      <i className="fa fa-cube" />
                    </span>
                  )}
                  <span>{p.name}</span>
                  <strong>{formatMoney(p.price1)}</strong>
                </button>
              ))
            )}
          </div>
        )}
      </div>

      <button type="button" className="sales-mobile__fab" onClick={focusScan}>
        <i className="fa fa-qrcode" />
        Tara
      </button>
    </div>
  );
}
