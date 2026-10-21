import { useEffect, useState } from "react";
import { Navigate, Outlet } from "react-router-dom";
import { getToken, isTokenValid, clearToken } from "../utils/auth";
{
  /**
   * Anywhere you need to show name/role in the UI (navbar, dashboard):
    import { getDecodedToken } from "../utils/auth";

const user = getDecodedToken(); // { id, roleId, role, name? }
    */
}
function ProtectedRoutes() {
  const [valid, setValid] = useState(() => isTokenValid(getToken()));

  useEffect(() => {
    if (!isTokenValid(getToken())) clearToken();

    function handleStorageChange(e) {
      if (e.key === "token") setValid(isTokenValid(e.newValue));
    }
    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, []);

  if (!valid) return <Navigate to="/" replace />;
  return <Outlet />;
}

export default ProtectedRoutes;
