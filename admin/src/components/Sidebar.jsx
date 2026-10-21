import { useEffect, useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import Icon from "./Icon";
import { MENU, findParentKey } from "../config/menu";

function Sidebar({ collapsed, mobileOpen, onNavigate }) {
  const location = useLocation();
  const [openMenus, setOpenMenus] = useState({});

  // Auto-expand the submenu that contains the current route (e.g. on refresh/deep link).
  useEffect(() => {
    const parentKey = findParentKey(location.pathname);
    if (parentKey) {
      setOpenMenus((prev) => ({ ...prev, [parentKey]: true }));
    }
  }, [location.pathname]);

  const toggleMenu = (key) => {
    setOpenMenus((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <aside
      className={`dash-sidebar ${collapsed ? "collapsed" : ""} ${
        mobileOpen ? "mobile-open" : ""
      }`}
    >
      <div className="dash-logo-row">
        <div className="dash-logo-mark">P</div>
        <span className="dash-logo-text">ProxERP</span>
      </div>

      <nav className="dash-nav">
        {MENU.map((item) => (
          <div key={item.key}>
            {item.children ? (
              <button
                className="dash-nav-item"
                onClick={() => toggleMenu(item.key)}
              >
                <Icon name={item.icon} />
                <span className="label">{item.label}</span>
                <span className={`chev ${openMenus[item.key] ? "open" : ""}`}>
                  <Icon name="chevron" size={14} />
                </span>
              </button>
            ) : (
              <NavLink
                to={item.to}
                end
                className={({ isActive }) =>
                  `dash-nav-item ${isActive ? "active" : ""}`
                }
                onClick={onNavigate}
              >
                <Icon name={item.icon} />
                <span className="label">{item.label}</span>
              </NavLink>
            )}

            {item.children && (
              <div
                className={`dash-submenu ${openMenus[item.key] ? "open" : ""}`}
              >
                {item.children.map((child) => (
                  <NavLink
                    key={child.key}
                    to={child.to}
                    className={({ isActive }) =>
                      `dash-submenu-item ${isActive ? "active" : ""}`
                    }
                    onClick={onNavigate}
                  >
                    {child.label}
                  </NavLink>
                ))}
              </div>
            )}
          </div>
        ))}
      </nav>

      <div className="dash-sidebar-footer">v1.0.0 · ProxERP</div>
    </aside>
  );
}

export default Sidebar;