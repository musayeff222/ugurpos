import { useEffect, useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { navigation } from "../data/navigation";

function NavItem({ item, onNavigate }) {
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
          <span>{item.label}</span>
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
                  {child.label}
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
        <span>{item.label}</span>
      </NavLink>
    </li>
  );
}

export default function Sidebar({ onNavigate }) {
  return (
    <div className="leftbar">
      <div className="sidebar">
        <nav className="navigationbar">
          <ul className="vertical-menu">
            {navigation.map((item) => (
              <NavItem key={item.label + (item.path || "")} item={item} onNavigate={onNavigate} />
            ))}
          </ul>
        </nav>
      </div>
    </div>
  );
}
