import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";

const TAWK_SRC = "https://embed.tawk.to/6ac7f89ab255d834c35d1a30/1k4ei67ek";

function isPublicSite(pathname) {
  return pathname === "/m" || pathname.startsWith("/m/");
}

export default function TawkChat() {
  const { pathname } = useLocation();
  const onPublic = isPublicSite(pathname);
  const onPublicRef = useRef(onPublic);
  onPublicRef.current = onPublic;

  useEffect(() => {
    const api = (window.Tawk_API = window.Tawk_API || {});
    if (!onPublic) {
      api.hideWidget?.();
      return undefined;
    }

    api.customStyle = {
      visibility: {
        desktop: { position: "br", xOffset: 20, yOffset: 90 },
        mobile: { position: "br", xOffset: 12, yOffset: 84 },
      },
    };

    const show = () => {
      if (onPublicRef.current) api.showWidget?.();
    };

    if (!document.getElementById("tawk-script")) {
      window.Tawk_LoadStart = new Date();
      const script = document.createElement("script");
      script.id = "tawk-script";
      script.async = true;
      script.src = TAWK_SRC;
      script.charset = "UTF-8";
      script.setAttribute("crossorigin", "*");
      const first = document.getElementsByTagName("script")[0];
      if (first?.parentNode) first.parentNode.insertBefore(script, first);
      else document.body.appendChild(script);
    }

    api.onLoad = show;
    show();
    return undefined;
  }, [onPublic]);

  return null;
}
