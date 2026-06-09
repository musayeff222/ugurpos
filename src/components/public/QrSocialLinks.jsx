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
  if (type === "facebook") {
    const user = raw.replace(/^@/, "").replace(/^facebook\.com\//i, "").replace(/^fb\.com\//i, "");
    return `https://www.facebook.com/${user}`;
  }
  if (type === "whatsapp") {
    const digits = raw.replace(/\D/g, "");
    if (!digits) return null;
    return `https://wa.me/${digits}`;
  }
  return raw;
}

function IconInstagram({ brand }) {
  if (brand) {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <defs>
          <linearGradient id="igGrad" x1="0%" y1="100%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#FD5949" />
            <stop offset="50%" stopColor="#D6249F" />
            <stop offset="100%" stopColor="#285AEB" />
          </linearGradient>
        </defs>
        <rect width="24" height="24" rx="6" fill="url(#igGrad)" />
        <path
          fill="#fff"
          d="M12 7.2a4.8 4.8 0 1 0 0 9.6 4.8 4.8 0 0 0 0-9.6m0 7.9a3.1 3.1 0 1 1 0-6.2 3.1 3.1 0 0 1 0 6.2M16.8 6.6a1.1 1.1 0 1 1-2.2 0 1.1 1.1 0 0 1 2.2 0M17.8 2H6.2A4.2 4.2 0 0 0 2 6.2v11.6A4.2 4.2 0 0 0 6.2 22h11.6a4.2 4.2 0 0 0 4.2-4.2V6.2A4.2 4.2 0 0 0 17.8 2m2.5 15.8a2.5 2.5 0 0 1-2.5 2.5H6.2a2.5 2.5 0 0 1-2.5-2.5V6.2a2.5 2.5 0 0 1 2.5-2.5h11.6a2.5 2.5 0 0 1 2.5 2.5z"
        />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="currentColor"
        d="M7.8 2h8.4C19.4 2 22 4.6 22 7.8v8.4a5.8 5.8 0 0 1-5.8 5.8H7.8C4.6 22 2 19.4 2 16.2V7.8A5.8 5.8 0 0 1 7.8 2m-.2 2A3.6 3.6 0 0 0 4 7.6v8.8C4 18.39 5.61 20 7.6 20h8.8a3.6 3.6 0 0 0 3.6-3.6V7.6C20 5.61 18.39 4 16.4 4H7.6m9.65 1.5a1.25 1.25 0 0 1 1.25 1.25A1.25 1.25 0 0 1 17.25 8 1.25 1.25 0 0 1 16 6.75a1.25 1.25 0 0 1 1.25-1.25M12 7a5 5 0 0 1 5 5 5 5 0 0 1-5 5 5 5 0 0 1-5-5 5 5 0 0 1 5-5m0 2a3 3 0 0 0-3 3 3 3 0 0 0 3 3 3 3 0 0 0 3-3 3 3 0 0 0-3-3z"
      />
    </svg>
  );
}

function IconFacebook({ brand }) {
  if (brand) {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <rect width="24" height="24" rx="6" fill="#1877F2" />
        <path
          fill="#fff"
          d="M14.5 8.5h2V5.9h-2c-2.3 0-3.7 1.4-3.7 3.8v1.8H9v2.7h1.8V19h2.8v-5.8h2.4l.3-2.7h-2.7V9.6c0-.8.2-1.1 1.3-1.1z"
        />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path fill="currentColor" d="M14 13.5h2.5L17 9h-2.5V7.5c0-.8.2-1.3 1.4-1.3H17V3.1C16.7 3 15.6 3 14.4 3 11.9 3 10.2 4.5 10.2 7v2H8v4.5h2.2V21h3.3v-7.5z" />
    </svg>
  );
}

function IconWhatsapp({ brand }) {
  if (brand) {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <rect width="24" height="24" rx="6" fill="#25D366" />
        <path
          fill="#fff"
          d="M12 5.5c-3.6 0-6.5 2.9-6.5 6.5 0 1.1.3 2.2.8 3.1L5.5 18l3.1-.8c.9.5 1.9.8 3 .8 3.6 0 6.5-2.9 6.5-6.5S15.6 5.5 12 5.5m3.8 9.2c-.2.5-1 1-1.4 1.1-.4.1-.9.2-2.9-.6-2.4-1-4-3.5-4.1-3.7-.1-.2-1-1.3-1-2.5s.6-1.8.9-2c.2-.2.5-.3.7-.3h.5c.2 0 .4 0 .5.4.2.4.7 1.7.8 1.8.1.1.1.3 0 .4-.1.2-.2.3-.3.5-.1.1-.2.2-.3.3-.1.1-.2.2-.1.4.1.2.5 1 1.1 1.6.8.7 1.4.9 1.6 1 .2.1.3.1.4-.1.1-.2.6-.7.7-.9.1-.2.3-.2.5-.1.2.1 1.3.6 1.5.7.2.1.4.2.4.3 0 .2 0 .5-.2 1z"
        />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="currentColor"
        d="M12.04 2c-5.46 0-9.91 4.45-9.91 9.91 0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38a9.86 9.86 0 0 0 4.74 1.21h.01c5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.816 9.816 0 0 0 12.04 2m.01 1.67c2.2 0 4.26.86 5.82 2.42a8.225 8.225 0 0 1 2.41 5.83c0 4.54-3.7 8.23-8.24 8.23-1.48 0-2.93-.39-4.19-1.15l-.3-.18-3.12.82.83-3.04-.2-.31a8.15 8.15 0 0 1-1.26-4.38c.01-4.54 3.7-8.22 8.25-8.22m-4.39 3.74c-.24-.01-.53.08-.77.36-.18.22-.7.68-.7 1.66 0 .98.72 1.93.82 2.07.1.13 1.41 2.24 3.47 3.08 1.72.71 2.07.57 2.44.54.38-.03 1.22-.5 1.39-.98.17-.48.17-.89.12-.98-.05-.09-.18-.14-.38-.24-.2-.1-1.19-.59-1.38-.66-.19-.07-.33-.1-.47.1-.14.2-.54.66-.66.79-.12.13-.24.15-.44.05-.2-.1-.85-.31-1.62-1-.6-.53-1.01-1.19-1.13-1.39-.12-.2-.01-.31.09-.41.09-.09.2-.24.3-.36.1-.12.13-.2.2-.33.07-.13.03-.25-.02-.35-.05-.1-.47-1.13-.64-1.55-.17-.41-.34-.35-.47-.36-.12-.01-.27-.01-.41-.01z"
      />
    </svg>
  );
}

function IconTiktok({ brand }) {
  if (brand) {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <rect width="24" height="24" rx="6" fill="#010101" />
        <path
          fill="#25F4EE"
          d="M10.5 10.2v5.1a2.4 2.4 0 1 1-2.4-2.4h.4v-2.7h-.4a5.1 5.1 0 1 0 5.1 5.1v-2.4c.9.6 2 1 3.2 1.1V12a4.8 4.8 0 0 1-3.2-1.1V8.5h2.4V6.2h-2.4V4.8c-1.2.1-2.3.5-3.2 1.1z"
        />
        <path
          fill="#FE2C55"
          d="M11.7 9.1V12a4.8 4.8 0 0 0 3.2 1.1v-2.4c-.9-.6-2-1-3.2-1.1V9.1z"
        />
        <path
          fill="#fff"
          d="M10.5 10.2a5.1 5.1 0 0 0 5.1 5.1v-2.7a2.4 2.4 0 1 1-2.4-2.4h-.4V10.2z"
        />
      </svg>
    );
  }
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
  facebook: { Icon: IconFacebook, label: "Facebook" },
  whatsapp: { Icon: IconWhatsapp, label: "WhatsApp" },
  tiktok: { Icon: IconTiktok, label: "TikTok" },
};

const ORDER = ["instagram", "facebook", "tiktok", "whatsapp"];

export default function QrSocialLinks({ social = {}, className = "", variant = "compact" }) {
  const brand = variant === "brand";
  const links = ORDER.map((type) => ({
    type,
    url: normalizeSocialUrl(type, social[type]),
  })).filter((item) => item.url);

  if (links.length === 0) return null;

  return (
    <div className={`qr-social-links ${brand ? "qr-social-links--brand" : ""} ${className}`.trim()}>
      {links.map(({ type, url }) => {
        const { Icon, label } = ICONS[type];
        return (
          <a
            key={type}
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className={`qr-social-links__btn qr-social-links__btn--${type}${brand ? " qr-social-links__btn--brand" : ""}`}
            aria-label={label}
            title={label}
          >
            <Icon brand={brand} />
          </a>
        );
      })}
    </div>
  );
}
