import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import Icon from "./Icon";
import { findActiveMenu } from "../config/menu";

function Navbar({ collapsed, onToggleCollapse, onToggleMobile }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  const storedUser = (() => {
    try {
      return JSON.parse(localStorage.getItem("user")) || {};
    } catch {
      return {};
    }
  })();

  useEffect(() => {
    const onClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("/", { replace: true });
  };

  const activeMenu = findActiveMenu(location.pathname);
  const initials = (storedUser.name || "U")
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <header className="dash-navbar">
      <div className="dash-navbar-left">
        <button
          className="dash-icon-btn dash-mobile-toggle"
          onClick={onToggleMobile}
        >
          <Icon name="hamburger" />
        </button>
        <button
          className="dash-icon-btn dash-desktop-toggle"
          onClick={onToggleCollapse}
        >
          <Icon name={collapsed ? "hamburger" : "collapse"} />
        </button>
        <span className="dash-page-title">
          {activeMenu?.label || "Dashboard"}
        </span>
      </div>

      <div className="dash-navbar-right">
        <button className="dash-icon-btn">
          <Icon name="bell" />
        </button>

        <div className="dash-dropdown-wrap" ref={dropdownRef}>
          <button
            className="dash-user-trigger"
            onClick={() => setDropdownOpen((v) => !v)}
          >
            <div className="dash-avatar">{initials}</div>
            <span className="dash-user-name">{storedUser.name || "User"}</span>
            <Icon name="chevron" size={12} />
          </button>

          {dropdownOpen && (
            <div className="dash-dropdown">
              <div className="dash-dropdown-user">
                <div className="name">{storedUser.name || "User"}</div>
                <div className="email">{storedUser.email || ""}</div>
              </div>
              {/* <button className="dash-dropdown-item">
                <Icon name="user" size={16} />
                Profile
              </button>
              <button className="dash-dropdown-item">
                <Icon name="settings" size={16} />
                Settings
              </button> */}
              <button
                className="dash-dropdown-item danger"
                onClick={handleLogout}
              >
                <Icon name="logout" size={16} />
                Logout
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

export default Navbar;