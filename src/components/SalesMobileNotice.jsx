import { Link } from "react-router-dom";
import { useLocale } from "../context/LocaleContext";

export default function SalesMobileNotice() {
  const { t } = useLocale();

  return (
    <div className="sales-mobile-notice">
      <div className="sales-mobile-notice__card">
        <i className="fa fa-desktop sales-mobile-notice__icon" aria-hidden />
        <h2>{t("sales.mobileTitle")}</h2>
        <p>{t("sales.mobileText")}</p>
        <div className="sales-mobile-notice__actions">
          <Link to="/menu" className="btn btn-primary">
            {t("sales.mobileMenu")}
          </Link>
          <Link to="/dashboard" className="btn btn-default">
            {t("sales.mobileDashboard")}
          </Link>
        </div>
      </div>
    </div>
  );
}
