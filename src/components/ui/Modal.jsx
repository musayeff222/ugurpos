import { useEffect } from "react";

export default function Modal({ open, title, onClose, children, footer, size = "md" }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className={`modal-panel modal-${size}`} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h4>{title}</h4>
          <button type="button" className="modal-close" onClick={onClose} aria-label="Kapat">
            ×
          </button>
        </div>
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-footer">{footer}</div>}
      </div>
    </div>
  );
}
