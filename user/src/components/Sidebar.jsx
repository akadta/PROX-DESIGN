import { useEffect } from "react";
import { NavLink, useLocation } from "react-router-dom";

import {
  Home,
  BarChart3,
  Calendar,
  PiggyBank,
  Settings,
  ChevronDown,
  ChevronRight,
  Wallet,
  Palette,
  Users,
} from "lucide-react";

const CARDS = [
  { name: "Obsidian Reserve", last4: "4106", kind: "Mastercard", tone: "dark" },
];

/* add `path` to each leaf/sub item as new routes get built.
   `mainUserOnly: true` hides the item for employee accounts. */
const NAV = [
  { icon: Home, label: "Home", path: "/dashboard" },
  {
    icon: Palette,
    label: "Design",
    sub: [
      { label: "Book", path: "/book" },
      //   { label: "Reports", path: "/dashboard/analytics/reports" },
    ],
  },
  {
    icon: Users,
    label: "Employees",
    mainUserOnly: true,
    sub: [
      { label: "Register", path: "/employee/registration" },
      { label: "List", path: "/employees/list" },
    ],
  },
];

export default function Sidebar({
  open,
  setOpen,
  openGroup,
  setOpenGroup,
  authUser,
}) {
  const location = useLocation();

  const isMainUser = authUser?.accountType === "mainUser";
  const visibleNav = NAV.filter((item) => !item.mainUserOnly || isMainUser);

  useEffect(() => {
    const activeGroup = visibleNav.find(
      (item) =>
        item.sub && item.sub.some((s) => location.pathname.startsWith(s.path)),
    );
    if (activeGroup) setOpenGroup(activeGroup.label);
  }, [location.pathname]);

  const linkStyle = ({ isActive }) => ({
    padding: "10px 12px",
    fontSize: 13.5,
    fontWeight: 500,
    background: isActive ? "#0A0A0B" : "transparent",
    color: isActive ? "#fff" : "#6C6C74",
    textDecoration: "none",
  });

  const subLinkStyle = ({ isActive }) => ({
    padding: "8px 12px",
    fontSize: 12.5,
    fontWeight: 500,
    background: isActive ? "#0A0A0B" : "transparent",
    color: isActive ? "#fff" : "#6C6C74",
    textDecoration: "none",
  });

  return (
    <>
      {open && (
        <div
          className="position-fixed top-0 start-0 w-100 h-100 d-lg-none"
          style={{ background: "rgba(0,0,0,.4)", zIndex: 1040 }}
          onClick={() => setOpen(false)}
        />
      )}
      <aside
        className="d-flex flex-column bg-white border-end"
        style={{
          width: 260,
          minWidth: 260,
          height: "100vh",
          position: "sticky",
          top: 0,
          marginLeft: open ? 0 : -260,
          transition: "margin-left .25s ease",
          zIndex: 1045,
          borderColor: "#EAEAED",
        }}
      >
        <div
          className="d-flex align-items-center gap-2 px-3"
          style={{ height: 64 }}
        >
          <div
            className="d-flex align-items-center justify-content-center rounded-3"
            style={{ width: 36, height: 36, background: "#0A0A0B" }}
          >
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none">
              <path
                d="M12 1.5 22.5 12 12 22.5 1.5 12 12 1.5Z"
                stroke="#fff"
                strokeWidth="1.4"
              />
              <path d="M12 6.5 17.5 12 12 17.5 6.5 12 12 6.5Z" fill="#fff" />
            </svg>
          </div>
          <span className="fw-semibold" style={{ fontSize: 17 }}>
            ProxDesign
          </span>
        </div>

        <nav className="flex-grow-1 overflow-auto px-2 py-1">
          {visibleNav.map((item) => {
            const Icon = item.icon;
            const isGroup = !!item.sub;
            const isOpenGroup = openGroup === item.label;

            if (!isGroup) {
              return (
                <NavLink
                  key={item.label}
                  to={item.path}
                  onClick={() => window.innerWidth < 992 && setOpen(false)}
                  className="btn d-flex align-items-center gap-2 w-100 text-start rounded-3 mb-1 border-0"
                  style={linkStyle}
                >
                  <Icon size={18} strokeWidth={1.8} />
                  <span>{item.label}</span>
                </NavLink>
              );
            }

            return (
              <div key={item.label}>
                <button
                  onClick={() => setOpenGroup(isOpenGroup ? null : item.label)}
                  className="btn d-flex align-items-center gap-2 w-100 text-start rounded-3 mb-1 border-0"
                  style={{
                    padding: "10px 12px",
                    fontSize: 13.5,
                    fontWeight: 500,
                    background: "transparent",
                    color: "#6C6C74",
                  }}
                >
                  <Icon size={18} strokeWidth={1.8} />
                  <span>{item.label}</span>
                  <ChevronDown
                    size={14}
                    className="ms-auto"
                    style={{
                      transition: "transform .2s ease",
                      transform: isOpenGroup ? "rotate(180deg)" : "none",
                    }}
                  />
                </button>

                {isOpenGroup && (
                  <div className="mb-1" style={{ paddingLeft: 30 }}>
                    {item.sub.map((s) => (
                      <NavLink
                        key={s.label}
                        to={s.path}
                        onClick={() =>
                          window.innerWidth < 992 && setOpen(false)
                        }
                        className="btn d-flex align-items-center gap-2 w-100 text-start rounded-3 mb-1 border-0"
                        style={subLinkStyle}
                      >
                        <ChevronRight size={12} />
                        <span>{s.label}</span>
                      </NavLink>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </nav>
      </aside>
    </>
  );
}