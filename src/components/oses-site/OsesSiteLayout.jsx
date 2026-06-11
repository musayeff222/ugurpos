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

export default function OsesSiteLayout({ firm, children }) {
  useEffect(() => {
    document.body.classList.add("oses-site-body");
    document.documentElement.style.height = "100%";
    document.body.style.minHeight = "100vh";
    document.body.style.display = "flex";
    document.body.style.flexDirection = "column";
    OSES_LINKS.forEach(({ id, href }) => {
      if (document.getElementById(id)) return;
      const link = document.createElement("link");
      link.id = id;
      link.rel = "stylesheet";
      link.href = href;
      document.head.appendChild(link);
    });
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
      <OsesSiteHeader firm={firm} />
      <div id="mainContent">{children}</div>
      <OsesSiteFooter firm={firm} />
      <WhatsappFloatButton firm={firm} />
    </>
  );
}
