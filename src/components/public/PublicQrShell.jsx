import OsesSiteLayout from "../oses-site/OsesSiteLayout";

/** Public sipariş sayfaları — yalnızca oses.com.tr klonu */
export default function PublicQrShell({ firm, children }) {
  return <OsesSiteLayout firm={firm}>{children}</OsesSiteLayout>;
}
