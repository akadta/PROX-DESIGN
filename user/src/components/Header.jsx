import { useState, useRef } from "react";
import {
  Search,
  Bell,
  ChevronDown,
  Menu,
  LogOut,
  User,
  Settings,
} from "lucide-react";
import { useOutsideClose } from "../hooks/useOutsideClose";
import { useNavigate } from "react-router-dom";

export default function Header({ onToggle, authUser }) {
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const ref = useRef(null);
  useOutsideClose(ref, () => setMenuOpen(false));

  return (
    <header
      className="d-flex align-items-center justify-content-between gap-3 border-bottom bg-white px-3 px-sm-4"
      style={{ height: 64, borderColor: "#EAEAED" }}
    >
      <div className="d-flex align-items-center gap-3 min-w-0">
        <button
          className="btn btn-light rounded-circle d-flex align-items-center justify-content-center border-0"
          style={{ width: 36, height: 36 }}
          onClick={onToggle}
        >
          <Menu size={18} strokeWidth={1.8} />
        </button>
        <div className="min-w-0">
          <h1
            className="fw-semibold mb-0 text-truncate"
            style={{ fontSize: 18 }}
          >
            Hello, {authUser.name ?? "No name"}
          </h1>
          {/* <p
            className="mb-0 text-truncate d-none d-sm-block"
            style={{ fontSize: 12.5, color: "#6C6C74" }}
          >
            Here's your current balance overview and store traffic
          </p> */}
        </div>
      </div>

      <div className="d-flex align-items-center gap-2">
        {/* <div
          className="d-none d-md-flex align-items-center gap-2 rounded-pill border px-3 py-2"
          style={{ background: "#F7F7F8", borderColor: "#EAEAED" }}
        >
          <Search size={15} strokeWidth={1.8} color="#6C6C74" />
          <input
            placeholder="Search"
            className="border-0 bg-transparent"
            style={{ fontSize: 13, width: 150, outline: "none" }}
          />
        </div>
        <button
          className="btn btn-light rounded-circle d-flex d-md-none align-items-center justify-content-center border-0"
          style={{ width: 36, height: 36 }}
        >
          <Search size={17} strokeWidth={1.8} />
        </button>
        <button
          className="btn btn-light rounded-circle position-relative d-flex align-items-center justify-content-center border-0"
          style={{ width: 36, height: 36 }}
        >
          <Bell size={17} strokeWidth={1.8} />
          <span
            className="position-absolute rounded-circle"
            style={{
              top: 7,
              right: 7,
              width: 6,
              height: 6,
              background: "#AD8438",
              boxShadow: "0 0 0 2px #fff",
            }}
          />
        </button> */}

        <div className="position-relative" ref={ref}>
          <button
            onClick={() => setMenuOpen((v) => !v)}
            className="btn d-flex align-items-center gap-2 rounded-pill border py-1 px-2"
            style={{ borderColor: "#EAEAED" }}
          >
            <span
              className="d-flex align-items-center justify-content-center rounded-circle text-white fw-semibold"
              style={{
                width: 32,
                height: 32,
                background: "#0A0A0B",
                fontSize: 12,
              }}
            >
              PxD
            </span>
            <ChevronDown
              size={14}
              color="#6C6C74"
              className="d-none d-sm-block"
              style={{
                transition: "transform .2s",
                transform: menuOpen ? "rotate(180deg)" : "none",
              }}
            />
          </button>

          {menuOpen && (
            <div
              className="position-absolute end-0 bg-white border rounded-4 shadow-sm"
              style={{
                top: "calc(100% + 10px)",
                width: 220,
                borderColor: "#EAEAED",
                zIndex: 50,
                overflow: "hidden",
              }}
            >
              <div
                className="border-bottom px-3 py-2"
                style={{ borderColor: "#EAEAED" }}
              >
                <p className="fw-semibold mb-0" style={{ fontSize: 14 }}>
                  {authUser.name ?? "No name"}
                </p>
                <p className="mb-0" style={{ fontSize: 12, color: "#6C6C74" }}>
                  {authUser.email ?? "No email"}
                </p>
                <p className="mb-0" style={{ fontSize: 13, color: "#6C6C74" }}>
                  {authUser.role ?? "No role"}
                </p>
              </div>
              {/* <button className="btn d-flex align-items-center gap-2 w-100 text-start rounded-0 border-0 px-3 py-2">
                <User size={16} strokeWidth={1.8} /> My profile
              </button>
              <button className="btn d-flex align-items-center gap-2 w-100 text-start rounded-0 border-0 px-3 py-2">
                <Settings size={16} strokeWidth={1.8} /> Preferences
              </button> */}
              <hr className="my-1" />
              <button
                className="btn d-flex align-items-center gap-2 w-100 text-start rounded-0 border-0 px-3 py-2 text-danger"
                onClick={() => {
                  localStorage.removeItem("token");
                  navigate("/");
                }}
              >
                <LogOut size={16} strokeWidth={1.8} /> Log out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
