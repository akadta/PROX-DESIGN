import api from "./Axios";


export const registerEmployee = (payload) => api.post("/main-user-employees", payload);
export const listEmployees = ({ page = 1, limit = 50, search = "", status = "" }) =>
  api.get("/main-user-employees", { params: { page, limit, search, status } });
export const updateEmployee = (id, payload) => api.put(`/main-user-employees/${id}`, payload);
export const deleteEmployee = (id) => api.delete(`/main-user-employees/${id}`);
export const toggleEmployeeActive = (id) => api.patch(`/main-user-employees/${id}/toggle-active`);
export const listMainUserRoles = () => api.get("/main-user-roles");
export const createMainUserRole = (name) => api.post("/main-user-roles", { name });
export const updateMainUserRole = (id, name) => api.put(`/main-user-roles/${id}`, { name });