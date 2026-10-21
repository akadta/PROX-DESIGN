import { useState } from "react";
import { Outlet } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import Navbar from "../components/Navbar";

const COLLAPSE_KEY = "sidebar:collapsed";

function MainLayout() {
  const [collapsed, setCollapsed] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(COLLAPSE_KEY)) ?? false;
    } catch {
      return false;
    }
  });
  const [mobileOpen, setMobileOpen] = useState(false);

  const toggleCollapse = () => {
    setCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem(COLLAPSE_KEY, JSON.stringify(next));
      return next;
    });
  };

  return (
    <div className="dash-root">
      <style>{`
        * { box-sizing: border-box; }

        .dash-root {
          min-height: 100vh;
          background: #f7f7f7;
          font-family: "Inter", "Segoe UI", system-ui, -apple-system, sans-serif;
          color: #111;
        }

        /* ---------- Sidebar ---------- */
        .dash-sidebar {
          position: fixed;
          top: 0;
          left: 0;
          height: 100vh;
          width: 232px;
          background: #ffffff;
          border-right: 1px solid #ececec;
          display: flex;
          flex-direction: column;
          z-index: 40;
          transition: width 0.18s ease, transform 0.22s ease;
        }
        .dash-sidebar.collapsed { width: 68px; }

        .dash-logo-row {
          display: flex;
          align-items: center;
          gap: 10px;
          height: 56px;
          padding: 0 16px;
          border-bottom: 1px solid #f0f0f0;
          flex-shrink: 0;
          overflow: hidden;
        }
        .dash-logo-mark {
          width: 28px;
          height: 28px;
          min-width: 28px;
          background: #0a0a0a;
          color: #fff;
          border-radius: 7px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 700;
          font-size: 13px;
        }
        .dash-logo-text {
          font-weight: 600;
          font-size: 14px;
          white-space: nowrap;
          letter-spacing: -0.2px;
        }

        .dash-nav {
          flex: 1;
          overflow-y: auto;
          padding: 10px 8px;
        }

        .dash-nav-item {
          display: flex;
          align-items: center;
          gap: 10px;
          width: 100%;
          padding: 9px 10px;
          margin-bottom: 2px;
          border: none;
          background: transparent;
          border-radius: 8px;
          font-size: 13.2px;
          font-weight: 500;
          color: #444;
          cursor: pointer;
          text-align: left;
          text-decoration: none;
          transition: background 0.12s ease, color 0.12s ease;
          white-space: nowrap;
          overflow: hidden;
        }
        .dash-nav-item:hover { background: #f4f4f4; color: #111; }
        .dash-nav-item.active { background: #0a0a0a; color: #fff; }
        .dash-nav-item .label { flex: 1; overflow: hidden; text-overflow: ellipsis; }
        .dash-nav-item .chev { transition: transform 0.15s ease; flex-shrink: 0; }
        .dash-nav-item .chev.open { transform: rotate(90deg); }

        .dash-submenu {
          overflow: hidden;
          max-height: 0;
          transition: max-height 0.18s ease;
        }
        .dash-submenu.open { max-height: 240px; }

        .dash-submenu-item {
          display: block;
          width: 100%;
          text-align: left;
          padding: 8px 10px 8px 40px;
          border: none;
          background: transparent;
          font-size: 12.6px;
          color: #777;
          border-radius: 8px;
          cursor: pointer;
          white-space: nowrap;
          text-decoration: none;
        }
        .dash-submenu-item:hover { background: #f4f4f4; color: #111; }
        .dash-submenu-item.active { background: #f0f0f0; color: #0a0a0a; font-weight: 600; }

        .dash-sidebar.collapsed .dash-logo-text,
        .dash-sidebar.collapsed .label,
        .dash-sidebar.collapsed .chev,
        .dash-sidebar.collapsed .dash-submenu { display: none; }

        .dash-sidebar-footer {
          padding: 12px;
          border-top: 1px solid #f0f0f0;
          font-size: 11px;
          color: #b4b4b4;
          white-space: nowrap;
          overflow: hidden;
        }
        .dash-sidebar.collapsed .dash-sidebar-footer { text-align: center; }

        /* ---------- Layout shift ---------- */
        .dash-main {
          margin-left: 232px;
          transition: margin-left 0.18s ease;
          min-height: 100vh;
          display: flex;
          flex-direction: column;
        }
        .dash-main.collapsed { margin-left: 68px; }

        /* ---------- Navbar ---------- */
        .dash-navbar {
          height: 56px;
          background: #ffffff;
          border-bottom: 1px solid #ececec;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 20px;
          position: sticky;
          top: 0;
          z-index: 30;
        }
        .dash-navbar-left {
          display: flex;
          align-items: center;
          gap: 14px;
        }
        .dash-icon-btn {
          width: 34px;
          height: 34px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 8px;
          border: 1px solid transparent;
          background: transparent;
          color: #444;
          cursor: pointer;
          transition: background 0.12s ease;
        }
        .dash-icon-btn:hover { background: #f4f4f4; }
        .dash-mobile-toggle { display: none; }

        .dash-page-title {
          font-size: 14px;
          font-weight: 600;
          color: #111;
          letter-spacing: -0.1px;
        }

        .dash-navbar-right {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .dash-user-trigger {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 5px 10px 5px 6px;
          border: 1px solid #ececec;
          border-radius: 999px;
          background: transparent;
          cursor: pointer;
          transition: background 0.12s ease;
        }
        .dash-user-trigger:hover { background: #f7f7f7; }

        .dash-avatar {
          width: 26px;
          height: 26px;
          border-radius: 50%;
          background: #0a0a0a;
          color: #fff;
          font-size: 10.5px;
          font-weight: 700;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }
        .dash-user-name {
          font-size: 12.5px;
          font-weight: 600;
          color: #222;
          max-width: 120px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .dash-dropdown-wrap { position: relative; }

        .dash-dropdown {
          position: absolute;
          right: 0;
          top: calc(100% + 8px);
          width: 200px;
          background: #fff;
          border: 1px solid #ececec;
          border-radius: 12px;
          box-shadow: 0 12px 32px -8px rgba(0,0,0,0.15);
          padding: 6px;
          z-index: 50;
        }
        .dash-dropdown-user {
          padding: 10px 10px 8px;
          border-bottom: 1px solid #f0f0f0;
          margin-bottom: 6px;
        }
        .dash-dropdown-user .name { font-size: 13px; font-weight: 600; color: #111; }
        .dash-dropdown-user .email { font-size: 11.5px; color: #999; margin-top: 2px; }

        .dash-dropdown-item {
          display: flex;
          align-items: center;
          gap: 9px;
          width: 100%;
          padding: 8px 10px;
          border: none;
          background: transparent;
          border-radius: 8px;
          font-size: 13px;
          color: #333;
          cursor: pointer;
          text-align: left;
        }
        .dash-dropdown-item:hover { background: #f4f4f4; }
        .dash-dropdown-item.danger { color: #b00020; }
        .dash-dropdown-item.danger:hover { background: #fdecec; }

        /* ---------- Content ---------- */
        .dash-content {
          flex: 1;
          padding: 24px;
        }
        .dash-card {
          background: #fff;
          border: 1px solid #ececec;
          border-radius: 14px;
          padding: 22px;
          min-height: 260px;
        }
        .dash-card h2 {
          margin: 0 0 6px;
          font-size: 16px;
          font-weight: 700;
          color: #111;
        }
        .dash-card p {
          margin: 0;
          font-size: 13px;
          color: #8a8a8a;
        }

        /* ---------- Mobile overlay ---------- */
        .dash-overlay { display: none; }

        @media (max-width: 860px) {
          .dash-sidebar {
            transform: translateX(-100%);
            width: 240px;
          }
          .dash-sidebar.mobile-open { transform: translateX(0); }
          .dash-sidebar.collapsed { width: 240px; }
          .dash-sidebar.collapsed .dash-logo-text,
          .dash-sidebar.collapsed .label,
          .dash-sidebar.collapsed .chev { display: flex; }
          .dash-sidebar.collapsed .dash-submenu { display: block; }

          .dash-main, .dash-main.collapsed { margin-left: 0; }

          .dash-desktop-toggle { display: none; }
          .dash-mobile-toggle { display: flex; }

          .dash-overlay.show {
            display: block;
            position: fixed;
            inset: 0;
            background: rgba(0,0,0,0.35);
            z-index: 35;
          }

          .dash-user-name { display: none; }
          .dash-content { padding: 16px; }
        }
      `}</style>

      <div
        className={`dash-overlay ${mobileOpen ? "show" : ""}`}
        onClick={() => setMobileOpen(false)}
      />

      <Sidebar
        collapsed={collapsed}
        mobileOpen={mobileOpen}
        onNavigate={() => setMobileOpen(false)}
      />

      <div className={`dash-main ${collapsed ? "collapsed" : ""}`}>
        <Navbar
          collapsed={collapsed}
          onToggleCollapse={toggleCollapse}
          onToggleMobile={() => setMobileOpen((v) => !v)}
        />

        <main className="dash-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

export default MainLayout;