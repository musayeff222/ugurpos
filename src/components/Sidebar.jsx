import { useEffect, useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { navigation } from "../data/navigation";
import { useWebOrders } from "../context/WebOrdersContext";
import { useLocale } from "../context/LocaleContext";
import { useAuth } from "../context/AuthContext";

function navLabel(item, t) {
  return item.labelKey ? t(item.labelKey) : item.label;
}

function NavItem({ item, onNavigate, pendingWebOrders, t }) {
  const location = useLocation();
  const hasChildren = item.children?.length;
  const isChildActive = hasChildren && item.children.some((c) => location.pathname === c.path);
  const [open, setOpen] = useState(isChildActive);

  useEffect(() => {
    setOpen(isChildActive);
  }, [location.pathname, isChildActive]);

  if (hasChildren) {
    return (
      <li className={isChildActive ? "has-active-child" : ""}>
        <button type="button" className="nav-parent" onClick={() => setOpen(!open)} aria-expanded={open}>
          <i className={`fa ${item.icon}`} />
          <span>{navLabel(item, t)}</span>
          <i className={`fa fa-chevron-right nav-chevron ${open ? "open" : ""}`} />
        </button>
        {open && (
          <ul className="vertical-submenu">
            {item.children.map((child) => (
              <li key={child.path}>
                <NavLink
                  to={child.path}
                  className={({ isActive }) => (isActive ? "active" : "")}
                  onClick={onNavigate}
                >
                  {navLabel(child, t)}
                </NavLink>
              </li>
            ))}
          </ul>
        )}
      </li>
    );
  }

  return (
    <li>
      <NavLink
        to={item.path}
        className={({ isActive }) => (isActive ? "active" : "")}
        onClick={onNavigate}
      >
        <i className={`fa ${item.icon}`} />
        <span>{navLabel(item, t)}</span>
        {item.badge === "webOrders" && pendingWebOrders > 0 && (
          <span className="nav-badge">{pendingWebOrders}</span>
        )}
      </NavLink>
    </li>
  );
}

export default function Sidebar({ onNavigate }) {
  const { pendingCount } = useWebOrders();
  const { t } = useLocale();
  const { isStaffUser, activeStaffRole } = useAuth();
  const isCashier = isStaffUser && String(activeStaffRole || "").toLocaleLowerCase("tr").includes("kasiyer");
  const items = isCashier ? navigation.filter((item) => item.path === "/sales") : navigation;

  return (
    <div className="leftbar">
      <div className="sidebar">
        <nav className="navigationbar">
          <ul className="vertical-menu">
            {items.map((item) => (
              <NavItem
                key={(item.labelKey || item.label) + (item.path || "")}
                item={item}
                onNavigate={onNavigate}
                pendingWebOrders={pendingCount}
                t={t}
              />
            ))}
          </ul>
        </nav>
      </div>
    </div>
  );
}
