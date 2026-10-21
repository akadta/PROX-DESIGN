import { useEffect, useState } from "react";
import { registerEmployee, updateEmployee, listMainUserRoles } from "../../../api/mainUserEmployeeApi";

export default function EmployeeFormModal({ mode = "create", employee, onClose, onSaved }) {
  const isView = mode === "view";
  const isEdit = mode === "edit";

  const [roles, setRoles] = useState([]);
  const [form, setForm] = useState({
    name: employee?.name || "",
    email: employee?.email || "",
    address: employee?.address || "",
    phoneNumber: employee?.phoneNumber || "",
    password: "",
    mainUserRoleId: employee?.mainUserRoleId || "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    listMainUserRoles().then((res) => setRoles(res.data.data));
  }, []);

  const handleChange = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSaving(true);
    try {
      if (isEdit) {
        await updateEmployee(employee.id, form);
      } else {
        await registerEmployee(form);
      }
      onSaved();
    } catch (err) {
      setError(err.response?.data?.message || "Something went wrong");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="modal show d-block"
      tabIndex="-1"
      style={{ backgroundColor: "rgba(0,0,0,0.4)" }}
    >
      <div className="modal-dialog modal-dialog-centered modal-dialog-scrollable">
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title">
              {isView ? "Employee Details" : isEdit ? "Edit Employee" : "Add Employee"}
            </h5>
            <button type="button" className="btn-close" onClick={onClose}></button>
          </div>

          <div className="modal-body">
            {error && <div className="alert alert-danger py-2">{error}</div>}

            <form onSubmit={handleSubmit} id="employeeForm">
              <div className="mb-3">
                <label className="form-label">Name</label>
                <input
                  type="text"
                  name="name"
                  className="form-control"
                  value={form.name}
                  onChange={handleChange}
                  disabled={isView}
                  required
                />
              </div>

              <div className="mb-3">
                <label className="form-label">Email</label>
                <input
                  type="email"
                  name="email"
                  className="form-control"
                  value={form.email}
                  onChange={handleChange}
                  disabled={isView}
                  required
                />
              </div>

              <div className="mb-3">
                <label className="form-label">Phone Number</label>
                <input
                  type="text"
                  name="phoneNumber"
                  className="form-control"
                  value={form.phoneNumber}
                  onChange={handleChange}
                  disabled={isView}
                  required
                />
              </div>

              <div className="mb-3">
                <label className="form-label">Address</label>
                <input
                  type="text"
                  name="address"
                  className="form-control"
                  value={form.address}
                  onChange={handleChange}
                  disabled={isView}
                />
              </div>

              {!isEdit && !isView && (
                <div className="mb-3">
                  <label className="form-label">Password</label>
                  <input
                    type="password"
                    name="password"
                    className="form-control"
                    value={form.password}
                    onChange={handleChange}
                    required
                  />
                </div>
              )}

              <div className="mb-3">
                <label className="form-label">Role</label>
                <select
                  name="mainUserRoleId"
                  className="form-select"
                  value={form.mainUserRoleId}
                  onChange={handleChange}
                  disabled={isView}
                  required
                >
                  <option value="">Select role...</option>
                  {roles.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name}
                    </option>
                  ))}
                </select>
              </div>
            </form>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-outline-secondary" onClick={onClose}>
              {isView ? "Close" : "Cancel"}
            </button>
            {!isView && (
              <button
                type="submit"
                form="employeeForm"
                className="btn btn-primary"
                disabled={saving}
              >
                {saving ? (
                  <>
                    <span className="spinner-border spinner-border-sm me-2" />
                    Saving...
                  </>
                ) : (
                  "Save"
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}