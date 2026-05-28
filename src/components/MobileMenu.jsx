import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { navigation } from "../data/navigation";
import "../styles/mobile-menu.css";

function mapChildren(children, parentIcon) {
  return children.map((child) => ({
    label: child.label,
    path: child.path,
    icon: child.icon || parentIcon || "fa-circle",
  }));
}

export default function MobileMenu({ overlay = false, onClose }) {
  const navigate = useNavigate();
  const [stack, setStack] = useState([{ title: "Menü", items: navigation }]);
  const current = stack[stack.length - 1];
  const canGoBack = stack.length > 1;

  const handleItem = (item) => {
    if (item.children?.length) {
      setStack((prev) => [
        ...prev,
        { title: item.label, items: mapChildren(item.children, item.icon) },
      ]);
      return;
    }
    if (item.path) {
      navigate(item.path);
      onClose?.();
    }
  };

  const goBack = () => {
    if (canGoBack) setStack((prev) => prev.slice(0, -1));
    else onClose?.();
  };

  return (
    <div className={`mobile-menu ${overlay ? "mobile-menu-overlay" : "mobile-menu-page"}`}>
      <div className="mobile-menu-header">
        <button type="button" className="mobile-menu-back" onClick={goBack} aria-label="Geri">
          <i className={`fa ${canGoBack || overlay ? "fa-arrow-left" : "fa-th-large"}`} />
        </button>
        <h2>{current.title}</h2>
        {overlay && (
          <button type="button" className="mobile-menu-close" onClick={onClose} aria-label="Kapat">
            <i className="fa fa-times" />
          </button>
        )}
        {!overlay && <span className="mobile-menu-header-spacer" />}
      </div>

      <div className="mobile-menu-grid">
        {current.items.map((item) => (
          <button
            key={item.label + (item.path || "")}
            type="button"
            className="mobile-menu-card"
            onClick={() => handleItem(item)}
          >
            <span className="mobile-menu-card-icon">
              <i className={`fa ${item.icon || "fa-circle"}`} />
            </span>
            <span className="mobile-menu-card-label">{item.label}</span>
            {item.children?.length > 0 && <span className="mobile-menu-card-badge">{item.children.length}</span>}
          </button>
        ))}
      </div>
    </div>
  );
}
