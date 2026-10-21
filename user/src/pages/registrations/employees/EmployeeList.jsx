import { useEffect, useState, useCallback } from "react";
import EmployeeTheme from "./EmployeeTheme";
import EmployeeEditModal from "./EmployeeEditModal";
import { listEmployees, deleteEmployee, toggleEmployeeActive } from "../../../api/mainUserEmployeeApi";

let searchTimer;

function EmployeeList() {
  const [rows, setRows] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 50, total: 0, totalPages: 1 });
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);
  const [modal, setModal] = useState(null);

  const fetchData = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const res = await listEmployees({ page, limit: pagination.limit, search, status });
      setRows(res.data.data);
      setPagination(res.data.pagination);
    } finally {
      setLoading(false);
    }
  }, [search, status, pagination.limit]);

  useEffect(() => { fetchData(1); }, [status]);
  useEffect(() => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => fetchData(1), 400);
    return () => clearTimeout(searchTimer);
  }, [search]);

  const handleToggle = async (id) => { await toggleEmployeeActive(id); fetchData(pagination.page); };
  const handleDelete = async (id) => {
    if (!window.confirm("Delete this employee?")) return;
    await deleteEmployee(id);
    fetchData(pagination.page);
  };

  return (
    <div className="ex-wrap">
      <EmployeeTheme />
      <h1 className="ex-h1">Employees</h1>
      <p className="ex-sub">{pagination.total} total</p>

      <div className="ex-toolbar">
        <input
          className="ex-input"
          style={{ maxWidth: 300 }}
          placeholder="Search name, email, phone..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select className="ex-input" style={{ maxWidth: 160 }} value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">All statuses</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
      </div>

      <div className="ex-card" style={{ overflow: "hidden" }}>
        <div className="ex-table-scroll">
          <table className="ex-table">
            <thead>
              <tr>
                <th>Name</th><th>Email</th><th>Phone</th><th>Role</th><th>Status</th><th style={{ textAlign: "right" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} style={{ textAlign: "center", padding: 30, color: "#999" }}>Loading…</td></tr>
              ) : rows.length === 0 ? (
                <tr><td colSpan={6} style={{ textAlign: "center", padding: 30, color: "#999" }}>No employees found</td></tr>
              ) : (
                rows.map((emp) => (
                  <tr key={emp.id}>
                    <td>{emp.name}</td>
                    <td>{emp.email}</td>
                    <td>{emp.phoneNumber}</td>
                    <td>{emp.mainUserRole?.name || "—"}</td>
                    <td>
                      <span className={`ex-badge ${emp.isActive ? "active" : "inactive"}`} onClick={() => handleToggle(emp.id)}>
                        {emp.isActive ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td>
                      <div className="ex-actions" style={{ justifyContent: "flex-end" }}>
                        <button className="ex-btn-icon" onClick={() => setModal({ mode: "view", employee: emp })} title="View">👁</button>
                        <button className="ex-btn-icon" onClick={() => setModal({ mode: "edit", employee: emp })} title="Edit">✎</button>
                        <button className="ex-btn-icon" onClick={() => handleDelete(emp.id)} title="Delete">🗑</button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 14, alignItems: "center" }}>
        <span style={{ fontSize: 12, color: "#999", marginRight: 8 }}>Page {pagination.page} / {pagination.totalPages}</span>
        <button className="ex-btn ex-btn-outline" disabled={pagination.page <= 1} onClick={() => fetchData(pagination.page - 1)}>Prev</button>
        <button className="ex-btn ex-btn-outline" disabled={pagination.page >= pagination.totalPages} onClick={() => fetchData(pagination.page + 1)}>Next</button>
      </div>

      {modal && (
        <EmployeeEditModal
          mode={modal.mode}
          employee={modal.employee}
          onClose={() => setModal(null)}
          onSaved={() => { setModal(null); fetchData(pagination.page); }}
        />
      )}
    </div>
  );
}

export default EmployeeList;