import { useState, useEffect } from "react";
import { Outlet } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import Header from "../components/Header";
import { useBootstrapCss } from "../hooks/useBootstrapCss";
import api from "../api/Axios";

function MainLayout() {
  useBootstrapCss();

  const [sidebarOpen, setSidebarOpen] = useState(() => {
    const saved = localStorage.getItem("sidebarOpen");
    if (saved !== null) return saved === "true";
    return window.innerWidth >= 992;
  });

  const [openGroup, setOpenGroup] = useState(() => {
    return localStorage.getItem("openGroup") || null;
  });

  const [authUser, setAuthUser] = useState({});

  // persist sidebarOpen
  useEffect(() => {
    localStorage.setItem("sidebarOpen", sidebarOpen);
  }, [sidebarOpen]);

  // persist openGroup
  useEffect(() => {
    if (openGroup) {
      localStorage.setItem("openGroup", openGroup);
    } else {
      localStorage.removeItem("openGroup");
    }
  }, [openGroup]);

  useEffect(() => {
    async function authUser() {
      try {
const res = await api.get("/main/auth/user");
        setAuthUser(res.data.user);
        console.log(res.data.user)
  
      } catch (err) {
        console.error(err.message?.data);
      }
    }
    authUser();
  }, []);

  return (
    <div
      className="d-flex"
      style={{
        minHeight: "100vh",
        background: "#fff",
        fontFamily: "system-ui, sans-serif",
      }}
    >
      <Sidebar
        open={sidebarOpen}
        setOpen={setSidebarOpen}
        openGroup={openGroup}
        setOpenGroup={setOpenGroup}
        authUser={authUser}
      />

      <div className="flex-fill d-flex flex-column min-w-0">
        <Header
          onToggle={() => setSidebarOpen((v) => !v)}
          authUser={authUser}
        />
        <main className="flex-fill p-3 p-sm-4" style={{ overflowY: "auto" }}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}

export default MainLayout;
