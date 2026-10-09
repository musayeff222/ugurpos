import { useEffect } from "react";
import OsesSiteHeader from "./OsesSiteHeader";
import OsesSiteFooter from "./OsesSiteFooter";
import WhatsappFloatButton from "./WhatsappFloatButton";

const OSES_LINKS = [
  { id: "oses-bootstrap", href: "https://stackpath.bootstrapcdn.com/bootstrap/4.1.2/css/bootstrap.min.css" },
  { id: "oses-fa", href: "https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css" },
  { id: "oses-style", href: "/oses/css/style.css" },
  { id: "oses-promo", href: "/oses/css/oses-promo.css" },
  { id: "oses-yellow", href: "/oses/css/oses-yellow-theme.css" },
  { id: "oses-wa-float", href: "/oses/css/whatsapp-float.css" },
];

const OSES_CRITICAL_CSS = `
.promo.low{height:250px;overflow:hidden;position:relative}
@media(min-width:768px){.promo.low{height:550px}}
#promo{list-style:none;padding:0;margin:0;height:100%;position:relative}
#promo li{position:absolute;inset:0;width:100%;margin:0;opacity:0}
#promo li.is-active{opacity:1;z-index:1}
#promo li img{display:block;width:100%;height:100%;object-fit:cover}
.navbar-brand img{display:block;height:66px;width:auto;max-width:220px;object-fit:contain}
.wa-float{position:fixed;right:20px;bottom:20px;z-index:1200}
.order-strip__img{display:block;width:100%;height:auto;aspect-ratio:16/7;object-fit:cover}
`;

export default function OsesSiteLayout({ firm, children }) {
  useEffect(() => {
    document.body.classList.add("oses-site-body");
    document.documentElement.style.height = "100%";
    document.body.style.minHeight = "100vh";
    document.body.style.display = "flex";
    document.body.style.flexDirection = "column";
    return () => {
      document.body.classList.remove("oses-site-body");
      document.documentElement.style.height = "";
      document.body.style.minHeight = "";
      document.body.style.display = "";
      document.body.style.flexDirection = "";
    };
  }, []);

  return (
    <>
      {OSES_LINKS.map(({ id, href }) => (
        <link key={id} id={id} rel="stylesheet" href={href} />
      ))}
      <style>{OSES_CRITICAL_CSS}</style>
      <OsesSiteHeader firm={firm} />
      <div id="mainContent">{children}</div>
      <OsesSiteFooter firm={firm} />
      <WhatsappFloatButton firm={firm} />
    </>
  );
}
