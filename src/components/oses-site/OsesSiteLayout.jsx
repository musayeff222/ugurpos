import { useEffect } from "react";
import OsesSiteHeader from "./OsesSiteHeader";
import OsesSiteFooter from "./OsesSiteFooter";

const OSES_LINKS = [
  { id: "oses-bootstrap", href: "https://stackpath.bootstrapcdn.com/bootstrap/4.1.2/css/bootstrap.min.css" },
  { id: "oses-fa", href: "https://use.fontawesome.com/releases/v5.6.3/css/all.css" },
  { id: "oses-style", href: "/oses/css/style.css" },
  { id: "oses-promo", href: "/oses/css/oses-promo.css" },
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
    </>
  );
}
