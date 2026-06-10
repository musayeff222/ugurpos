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
import { formatPublicMoney } from "../../utils/publicMoney";

const LANG_KEY = "ugurpos_lang";
const AUTO_RADIUS_KM = 80;

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
  const welcome = firm?.menuWelcome || t("qr.osesFranchiseText");
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
      <OsesPromoSlider />

      {/* Sipariş butonları — oses.com.tr */}
      <div className="container mt-4">
        <div className="row">
          <div className="col-12 col-md-6">
            <button type="button" className="p-0 border-0 bg-transparent w-100" onClick={goOrder}>
              <img src="/oses/assets/images/oses-yemeksepeti.jpg" className="img-fluid mb-4" alt={t("qr.osesOrderYemeksepeti")} />
            </button>
          </div>
          <div className="col-12 col-md-6">
            <button type="button" className="p-0 border-0 bg-transparent w-100" onClick={goOrder}>
              <img src="/oses/assets/images/oses-getir.jpg" className="img-fluid mb-4" alt={t("qr.osesOrderGetir")} />
            </button>
          </div>
        </div>
      </div>

      <div className="container mt-4">
        <div className="row">
          <div className="col-12 col-md-4">
            <button type="button" className="p-0 border-0 bg-transparent w-100" onClick={goOrder}>
              <img src="/oses/assets/images/hemen_siparis_ver.png" className="img-fluid mb-4" alt={t("qr.osesOrderNow")} />
            </button>
          </div>
          <div className="col-12 col-md-4">
            <a href="#subeler">
              <img src="/oses/assets/images/en_yakin_oses.png" className="img-fluid mb-4" alt={t("qr.osesNearest")} />
            </a>
          </div>
          <div className="col-12 col-md-4">
            <a href="#kampanyalar">
              <img src="/oses/assets/images/kampanyalar.png" className="img-fluid mb-4" alt={t("qr.nav.campaigns")} />
            </a>
          </div>
        </div>
      </div>

      <div className="container" id="kampanyalar">
        <div className="row">
          <div className="col-12 col-md-6">
            <button type="button" className="p-0 border-0 bg-transparent w-100" onClick={goOrder}>
              <img src="/oses/photos/onecikanlar/tatli-severler.jpg" className="img-fluid" alt={t("qr.osesSlide3")} />
            </button>
          </div>
          <div className="col-12 col-md-6">
            <button type="button" className="p-0 border-0 bg-transparent w-100" onClick={goOrder}>
              <img src="/oses/photos/onecikanlar/mutluluga-doyma-zamani.jpg" className="img-fluid" alt={t("qr.osesSlide2")} />
            </button>
          </div>
        </div>
      </div>

      <div className="franchiseFwrd my-5" id="franchise">
        <div className="container">
          <div className="row">
            <div className="col-12 col-sm-10 offset-sm-1">
              <div className="box">
                <h2 className="title32 txt_green">
                  {t("qr.osesFranchiseTitle")}
                  <br />
                  {t("qr.osesFranchiseTitle2")}
                </h2>
                <h3 className="title24 txt_white">{t("qr.osesFranchiseSubtitle")}</h3>
                <p className="txt_white">{welcome}</p>
                <button type="button" className="btn_box_green btn_box" onClick={goOrder}>
                  {t("qr.osesOrderNow")} <i className="fas fa-check" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="container">
        <div className="card-deck">
          {[
            { img: "/oses/assets/images/ico_bayilik.png", title: t("qr.osesFeatureBayilik"), desc: t("qr.osesFeatureBayilikDesc") },
            { img: "/oses/assets/images/ico_kalite.png", title: t("qr.osesFeatureQuality"), desc: t("qr.osesFeatureQualityDesc") },
            { img: "/oses/assets/images/ico_gida-guvenligi.png", title: t("qr.osesFeatureSafety"), desc: t("qr.osesFeatureSafetyDesc") },
            { img: "/oses/assets/images/ico_tuketici.png", title: t("qr.osesFeatureHappy"), desc: t("qr.osesFeatureHappyDesc") },
          ].map((card) => (
            <div className="card" key={card.title}>
              <img className="card-img-top" src={card.img} alt="" />
              <div className="card-body">
                <h5 className="card-title title18 txt_green">{card.title}</h5>
                <p className="card-text">{card.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

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

      <div className="container mt-5">
        <div className="row">
          <div className="col-12">
            <a href="#subeler">
              <img src="/oses/assets/images/oses-lezzetleri.jpg" className="img-fluid" alt={t("qr.osesLezzetleri")} />
            </a>
          </div>
        </div>
      </div>

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
                  <h2>
                    #{branch.branchNo} {branch.name}
                  </h2>
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
