import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import PublicQrShell from "../../components/public/PublicQrShell";
import OsesPromoSlider from "../../components/oses-site/OsesPromoSlider";
import OsesSingleProduct from "../../components/oses-site/OsesSingleProduct";
import { useLocale } from "../../context/LocaleContext";
import { findNearestBranch, requestUserLocation } from "../../utils/geo";
import {
  fetchPublicBranchMenu,
  fetchPublicFirmMenu,
  getPublicProductImageSrc,
} from "../../utils/qrMenuPublic";
import { getBranchLabel } from "../../utils/branchDisplay";
import { formatPublicMoney } from "../../utils/publicMoney";
import { getWebConfig, isWebItemEnabled } from "../../utils/menuWebConfig";

const LANG_KEY = "ugurpos_lang";
const AUTO_RADIUS_KM = 80;
const ORDER_STRIP_TOP_COUNT = 3;

function runOrderStripAction(action, goOrder) {
  if (action === "branches") {
    document.getElementById("subeler")?.scrollIntoView({ behavior: "smooth" });
    return;
  }
  if (action === "campaigns") {
    document.getElementById("kampanyalar")?.scrollIntoView({ behavior: "smooth" });
    return;
  }
  goOrder();
}

function OrderStripImage({ item, goOrder }) {
  if (!item?.imageUrl) return null;
  const content = <img src={item.imageUrl} className="img-fluid mb-4" alt={item.alt || ""} />;
  if (item.action === "branches") {
    return (
      <a href="#subeler" className="d-block w-100">
        {content}
      </a>
    );
  }
  if (item.action === "campaigns") {
    return (
      <a href="#kampanyalar" className="d-block w-100">
        {content}
      </a>
    );
  }
  return (
    <button type="button" className="p-0 border-0 bg-transparent w-100" onClick={() => runOrderStripAction(item.action, goOrder)}>
      {content}
    </button>
  );
}

export default function PublicMenuLanding() {
  const navigate = useNavigate();
  const { t, setLang } = useLocale();
  const [data, setData] = useState(null);
  const [preview, setPreview] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [locating, setLocating] = useState(false);
  const [nearest, setNearest] = useState(null);
  const [search, setSearch] = useState("");
  const geoAttemptRef = useRef(false);

  useEffect(() => {
    fetchPublicFirmMenu()
      .then((payload) => {
        setData(payload);
        if (typeof window !== "undefined" && !localStorage.getItem(LANG_KEY) && payload.firm?.defaultLang) {
          setLang(payload.firm.defaultLang === "tr" ? "tr" : "az");
        }
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [setLang]);

  useEffect(() => {
    if (!data?.branches?.length) return;
    const branch = data.branches.find((b) => b.menuAcceptOrders) || data.branches[0];
    fetchPublicBranchMenu(branch.id).then(setPreview).catch(() => {});
  }, [data]);

  useEffect(() => {
    if (!data?.branches?.length || geoAttemptRef.current) return;
    geoAttemptRef.current = true;
    let cancelled = false;
    setLocating(true);
    requestUserLocation()
      .then(({ lat, lng }) => {
        if (cancelled) return;
        const match = findNearestBranch(data.branches, lat, lng);
        if (match && match.distanceKm <= AUTO_RADIUS_KM) {
          setNearest(match);
          navigate(`/m/branch/${match.branch.id}`, { replace: true });
        } else if (match) setNearest(match);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLocating(false);
      });
    return () => {
      cancelled = true;
    };
  }, [data, navigate]);

  const filteredBranches = useMemo(() => {
    if (!data?.branches) return [];
    const q = search.trim().toLowerCase();
    if (!q) return data.branches;
    return data.branches.filter(
      (b) =>
        b.name?.toLowerCase().includes(q) ||
        b.address?.toLowerCase().includes(q) ||
        String(b.branchNo).includes(q)
    );
  }, [data, search]);

  const firm = data?.firm;
  const web = getWebConfig(firm);
  const welcome = web.franchiseText?.trim() || firm?.menuWelcome || t("qr.osesFranchiseText");
  const orderStripItems = useMemo(
    () => (web.orderStrip || []).filter((item) => item.imageUrl && isWebItemEnabled(item)),
    [web.orderStrip]
  );
  const showOrderStripFill =
    web.showOrderStripFillImage !== false && !!web.orderStripFillImageUrl;
  const orderStripTop = orderStripItems.slice(0, ORDER_STRIP_TOP_COUNT);
  const orderStripBottom = orderStripItems.slice(ORDER_STRIP_TOP_COUNT);
  const orderStripTopCol = showOrderStripFill ? "col-12 col-md-6 col-lg-3" : "col-12 col-md-6 col-lg-4";
  const previewBranchId = preview?.branch?.id;
  const money = (v) => formatPublicMoney(v);

  const goBranch = (id) => navigate(`/m/branch/${id}`);
  const goOrder = () => {
    const b = nearest?.branch || filteredBranches[0];
    if (b) goBranch(b.id);
    else document.getElementById("subeler")?.scrollIntoView({ behavior: "smooth" });
  };

  if (loading) {
    return (
      <PublicQrShell firm={firm}>
        <div className="container py-5 text-center">{t("qr.loadingMenu")}</div>
      </PublicQrShell>
    );
  }

  if (error || !data) {
    return (
      <PublicQrShell firm={firm}>
        <div className="container py-5 text-center text-danger">{error || t("qr.menuNotFound")}</div>
      </PublicQrShell>
    );
  }

  return (
    <PublicQrShell firm={firm}>
      {web.showPromoSlider !== false && (
        <OsesPromoSlider slides={web.promoSlides} onSlideClick={goOrder} />
      )}

      {web.showOrderStrip && (orderStripItems.length > 0 || showOrderStripFill) && (
        <div className="container mt-4 order-strip">
          {orderStripTop.length > 0 || showOrderStripFill ? (
            <div className="row order-strip__row order-strip__row--top">
              {orderStripTop.map((item, i) => (
                <div key={item.id || `strip-top-${i}`} className={orderStripTopCol}>
                  <OrderStripImage item={item} goOrder={goOrder} />
                </div>
              ))}
              {showOrderStripFill && (
                <div className={orderStripTopCol}>
                  <OrderStripImage
                    item={{
                      imageUrl: web.orderStripFillImageUrl,
                      alt: web.orderStripFillImageAlt || "",
                      action: web.orderStripFillAction || "order",
                    }}
                    goOrder={goOrder}
                  />
                </div>
              )}
            </div>
          ) : null}
          {orderStripBottom.length > 0 ? (
            <div className="row order-strip__row order-strip__row--bottom">
              {orderStripBottom.map((item, i) => (
                <div key={item.id || `strip-bottom-${i}`} className="col-12 col-md-6 col-lg-4">
                  <OrderStripImage item={item} goOrder={goOrder} />
                </div>
              ))}
            </div>
          ) : null}
        </div>
      )}

      {web.showCampaigns !== false &&
        web.campaignBanners.some((banner) => banner.imageUrl && isWebItemEnabled(banner)) && (
        <div className="container" id="kampanyalar">
          <div className="row">
            {web.campaignBanners.map((banner, i) =>
              banner.imageUrl && isWebItemEnabled(banner) ? (
                <div key={banner.id || `${banner.imageUrl}-${i}`} className="col-12 col-md-6 col-lg-4">
                  <button type="button" className="p-0 border-0 bg-transparent w-100" onClick={goOrder}>
                    <img src={banner.imageUrl} className="img-fluid mb-4" alt={banner.alt || ""} />
                  </button>
                </div>
              ) : null
            )}
          </div>
        </div>
      )}

      {web.showFranchise && (
        <div
          className="franchiseFwrd my-5"
          id="franchise"
          style={
            web.franchiseBackgroundUrl
              ? { backgroundImage: `url(${web.franchiseBackgroundUrl})` }
              : undefined
          }
        >
          <div className="container">
            <div className="row">
              <div className="col-12 col-sm-10 offset-sm-1">
                <div
                  className="box"
                  style={
                    web.franchiseIconUrl
                      ? {
                          backgroundImage: `url(${web.franchiseIconUrl})`,
                          backgroundRepeat: "no-repeat",
                          backgroundPosition: "90% center",
                          backgroundSize: "20%",
                        }
                      : undefined
                  }
                >
                  <h2 className="title32 txt_green">
                    {web.franchiseTitle1}
                    <br />
                    {web.franchiseTitle2}
                  </h2>
                  <h3 className="title24 txt_white">{web.franchiseSubtitle}</h3>
                  <p className="txt_white">{welcome}</p>
                  <button type="button" className="btn_box_green btn_box" onClick={goOrder}>
                    {t("qr.osesOrderNow")} <i className="fas fa-check" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {web.showFeatures !== false && web.features.some(isWebItemEnabled) && (
        <div className="container">
          <div className="card-deck">
            {web.features.filter(isWebItemEnabled).map((card) => (
              <div className="card" key={card.title}>
                <img className="card-img-top" src={card.iconUrl} alt="" />
                <div className="card-body">
                  <h5 className="card-title title18 txt_green">{card.title}</h5>
                  <p className="card-text">{card.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {preview?.products?.length > 0 && previewBranchId && (
        <div className="container productList mt-5">
          <div className="row">
            <div className="col-12">
              <h2 className="title32 txt_green my-5">{t("qr.nav.products")}</h2>
            </div>
          </div>
          <div className="row">
            {preview.products.map((product) => (
              <div key={product.id} className="col-12 col-lg-3 col-md-4 col-sm-6 my-4">
                <OsesSingleProduct
                  product={product}
                  imageSrc={getPublicProductImageSrc(previewBranchId, product)}
                  priceLabel={money(product.price1)}
                  canOrder={preview.branch?.menuAcceptOrders && preview.branch?.isOpen !== false}
                  onAdd={() => goBranch(previewBranchId)}
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {web.showLezzetlerBanner && web.lezzetlerImageUrl && (
        <div className="container mt-5">
          <div className="row">
            <div className="col-12">
              <a href="#subeler">
                <img src={web.lezzetlerImageUrl} className="img-fluid" alt={t("qr.osesLezzetleri")} />
              </a>
            </div>
          </div>
        </div>
      )}

      <div className="container my-5" id="subeler">
        <div className="row">
          <div className="col-12">
            <h2 className="title32 txt_green my-4">{t("qr.nav.branches")}</h2>
            {locating && <p className="text-center">{t("qr.locating")}</p>}
            <input
              className="form-control mb-4"
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t("qr.searchBranch")}
            />
          </div>
        </div>
        <div id="satisnoktalari">
          <div className="row">
            {filteredBranches.map((branch) => (
              <div key={branch.id} className="col-12 mb-3">
                <div className="wrapper" role="button" tabIndex={0} onClick={() => goBranch(branch.id)} onKeyDown={(e) => e.key === "Enter" && goBranch(branch.id)}>
                  <h2>{getBranchLabel(branch)}</h2>
                  {branch.address && <h3>{branch.address}</h3>}
                  <p>
                    {branch.openTime} – {branch.closeTime} · {branch.isOpen ? t("qr.openNow") : t("qr.closedNow")}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </PublicQrShell>
  );
}
