import { useEffect } from "react";
import OsesSiteHeader from "./OsesSiteHeader";
import OsesSiteFooter from "./OsesSiteFooter";
import WhatsappFloatButton from "./WhatsappFloatButton";
import "../../styles/public-site.css";

export default function OsesSiteLayout({ firm, children }) {
  useEffect(() => {
    document.documentElement.classList.add("ps-site");
    document.body.classList.add("ps-site");
    const previousTheme = document.querySelector('meta[name="theme-color"]');
    const old = previousTheme?.getAttribute("content");
    previousTheme?.setAttribute("content", "#0f0e0c");
    return () => {
      document.documentElement.classList.remove("ps-site");
      document.body.classList.remove("ps-site");
      if (old) previousTheme?.setAttribute("content", old);
    };
  }, []);

  return (
    <div className="ps-shell">
      <OsesSiteHeader firm={firm} />
      <main className="ps-main">{children}</main>
      <OsesSiteFooter firm={firm} />
      <WhatsappFloatButton firm={firm} />
    </div>
  );
}
