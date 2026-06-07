function normalizeSocialUrl(type, value) {
  if (!value?.trim()) return null;
  const raw = value.trim();
  if (/^https?:\/\//i.test(raw)) return raw;

  if (type === "instagram") {
    const user = raw.replace(/^@/, "").replace(/^instagram\.com\//i, "");
    return `https://instagram.com/${user}`;
  }
  if (type === "tiktok") {
    const user = raw.replace(/^@/, "").replace(/^tiktok\.com\//i, "");
    return `https://www.tiktok.com/@${user}`;
  }
  if (type === "whatsapp") {
    const digits = raw.replace(/\D/g, "");
    if (!digits) return null;
    return `https://wa.me/${digits}`;
  }
  return raw;
}

function IconInstagram() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="currentColor"
        d="M7.8 2h8.4C19.4 2 22 4.6 22 7.8v8.4a5.8 5.8 0 0 1-5.8 5.8H7.8C4.6 22 2 19.4 2 16.2V7.8A5.8 5.8 0 0 1 7.8 2m-.2 2A3.6 3.6 0 0 0 4 7.6v8.8C4 18.39 5.61 20 7.6 20h8.8a3.6 3.6 0 0 0 3.6-3.6V7.6C20 5.61 18.39 4 16.4 4H7.6m9.65 1.5a1.25 1.25 0 0 1 1.25 1.25A1.25 1.25 0 0 1 17.25 8 1.25 1.25 0 0 1 16 6.75a1.25 1.25 0 0 1 1.25-1.25M12 7a5 5 0 0 1 5 5 5 5 0 0 1-5 5 5 5 0 0 1-5-5 5 5 0 0 1 5-5m0 2a3 3 0 0 0-3 3 3 3 0 0 0 3 3 3 3 0 0 0 3-3 3 3 0 0 0-3-3z"
      />
    </svg>
  );
}

function IconWhatsapp() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="currentColor"
        d="M12.04 2c-5.46 0-9.91 4.45-9.91 9.91 0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38a9.86 9.86 0 0 0 4.74 1.21h.01c5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.816 9.816 0 0 0 12.04 2m.01 1.67c2.2 0 4.26.86 5.82 2.42a8.225 8.225 0 0 1 2.41 5.83c0 4.54-3.7 8.23-8.24 8.23-1.48 0-2.93-.39-4.19-1.15l-.3-.18-3.12.82.83-3.04-.2-.31a8.15 8.15 0 0 1-1.26-4.38c.01-4.54 3.7-8.22 8.25-8.22m-4.39 3.74c-.24-.01-.53.08-.77.36-.18.22-.7.68-.7 1.66 0 .98.72 1.93.82 2.07.1.13 1.41 2.24 3.47 3.08 1.72.71 2.07.57 2.44.54.38-.03 1.22-.5 1.39-.98.17-.48.17-.89.12-.98-.05-.09-.18-.14-.38-.24-.2-.1-1.19-.59-1.38-.66-.19-.07-.33-.1-.47.1-.14.2-.54.66-.66.79-.12.13-.24.15-.44.05-.2-.1-.85-.31-1.62-1-.6-.53-1.01-1.19-1.13-1.39-.12-.2-.01-.31.09-.41.09-.09.2-.24.3-.36.1-.12.13-.2.2-.33.07-.13.03-.25-.02-.35-.05-.1-.47-1.13-.64-1.55-.17-.41-.34-.35-.47-.36-.12-.01-.27-.01-.41-.01z"
      />
    </svg>
  );
}

function IconTiktok() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="currentColor"
        d="M16.6 5.82s.51.5 0 0A4.278 4.278 0 0 1 15.54 3h-3.09v12.4a2.592 2.592 0 0 1-2.59 2.5c-1.42 0-2.6-1.16-2.6-2.6 0-1.72 1.66-3.01 3.37-2.48V9.66c-3.45-.46-6.47 2.22-6.47 5.64 0 3.33 2.76 5.7 5.69 5.7 3.14 0 5.69-2.55 5.69-5.7V9.01a7.35 7.35 0 0 0 4.3 1.38V7.3s-1.88.09-3.24-1.48z"
      />
    </svg>
  );
}

const ICONS = {
  instagram: { Icon: IconInstagram, label: "Instagram" },
  whatsapp: { Icon: IconWhatsapp, label: "WhatsApp" },
  tiktok: { Icon: IconTiktok, label: "TikTok" },
};

export default function QrSocialLinks({ social = {}, className = "" }) {
  const links = [
    { type: "instagram", url: normalizeSocialUrl("instagram", social.instagram) },
    { type: "whatsapp", url: normalizeSocialUrl("whatsapp", social.whatsapp) },
    { type: "tiktok", url: normalizeSocialUrl("tiktok", social.tiktok) },
  ].filter((item) => item.url);

  if (links.length === 0) return null;

  return (
    <div className={`qr-social-links ${className}`.trim()}>
      {links.map(({ type, url }) => {
        const { Icon, label } = ICONS[type];
        return (
          <a
            key={type}
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className={`qr-social-links__btn qr-social-links__btn--${type}`}
            aria-label={label}
            title={label}
          >
            <Icon />
          </a>
        );
      })}
    </div>
  );
}
