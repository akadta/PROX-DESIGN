import { jwtDecode } from "jwt-decode";

export function isTokenValid(token) {
  if (!token) return false;

  try {
    const decoded = jwtDecode(token);
    const currentTime = Date.now() / 1000; // in seconds

    if (!decoded.exp) return false;
    if (decoded.exp < currentTime) return false;

    return true;
  } catch (error) {
    return false;
  }
}

// gets token from either storage, depending on "remember me"
export function getToken() {
  return localStorage.getItem("token") || sessionStorage.getItem("token");
}

// decodes + validates in one step, returns payload or null
export function getDecodedToken() {
  const token = getToken();
  if (!isTokenValid(token)) return null;

  try {
    return jwtDecode(token); // { id, roleId, role, exp, iat }
  } catch {
    return null;
  }
}

// clears token from both storages
export function clearToken() {
  localStorage.removeItem("token");
  sessionStorage.removeItem("token");
}
