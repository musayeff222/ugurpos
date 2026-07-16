import { useEffect } from "react";

export default function Modal({ open, title, onClose, children, footer, size = "md", closable = true }) {
  useEffect(() => {
    if (!open || !closable) return;
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose, closable]);

  if (!open) return null;

  return (
    <div className="modal-overlay" onClick={closable ? onClose : undefined}>
      <div className={`modal-panel modal-${size}`} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h4>{title}</h4>
          {closable && (
            <button type="button" className="modal-close" onClick={onClose} aria-label="Kapat">
              ×
            </button>
          )}
        </div>
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-footer">{footer}</div>}
      </div>
    </div>
  );
}
