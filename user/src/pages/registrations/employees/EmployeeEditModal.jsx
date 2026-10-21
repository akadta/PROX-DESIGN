import { useEffect, useState } from "react";
import Portal from "../../../components/Portal";
import RoleField from "./RoleField";
import SuccessModal from "./SuccessModal";
import { updateEmployee, listMainUserRoles } from "../../../api/mainUserEmployeeApi";

export default function EmployeeEditModal({ mode = "edit", employee, onClose, onSaved }) {
  const isView = mode === "view";
  const [roles, setRoles] = useState([]);
  const [form, setForm] = useState({
    name: employee.name,
    email: employee.email,
    address: employee.address || "",
    phoneNumber: employee.phoneNumber,
    mainUserRoleId: employee.mainUserRole?.id || "",
  });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    listMainUserRoles().then((res) => setRoles(res.data.data || []));
  }, []);

  const handleChange = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  const validate = () => {
    const errs = {};
    if (!form.name.trim()) errs.name = "Name is required";
    if (!form.email.trim()) errs.email = "Email is required";
    if (!form.phoneNumber.trim()) errs.phoneNumber = "Phone number is required";
    if (!form.mainUserRoleId) errs.mainUserRoleId = "Role is required";
    return errs;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate();
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;

    setError("");
    setSaving(true);
    try {
      await updateEmployee(employee.id, form);
      setSuccess(true);
    } catch (err) {
      setError(err.response?.data?.message || "Something went wrong");
    } finally {
      setSaving(false);
    }
  };

  if (success) {
    return (
      <SuccessModal
        type="success"
        message="Employee updated successfully."
        onClose={() => {
          setSuccess(false);
          onSaved();
        }}
      />
    );
  }

  return (
    <Portal>
      <div className="ex-modal-backdrop" onClick={(e) => e.stopPropagation()}>
        <div className="ex-modal">
          <div className="ex-modal-head">
            <h3>{isView ? "Employee Details" : "Edit Employee"}</h3>
            <button type="button" className="ex-modal-close" onClick={onClose}>
              ✕
            </button>
          </div>

          <div className="ex-modal-body">
            {error && <div className="ex-inline-alert">{error}</div>}

            <form onSubmit={handleSubmit} id="employeeEditForm" noValidate>
              <div className="ex-field">
                <label className="ex-label">Name</label>
                <input
                  name="name"
                  className={`ex-input ${errors.name ? "err" : ""}`}
                  value={form.name}
                  onChange={handleChange}
                  disabled={isView}
                />
                {errors.name && <div className="ex-err-text">{errors.name}</div>}
              </div>

              <div className="ex-field">
                <label className="ex-label">Email</label>
                <input
                  name="email"
                  type="email"
                  className={`ex-input ${errors.email ? "err" : ""}`}
                  value={form.email}
                  onChange={handleChange}
                  disabled={isView}
                />
                {errors.email && <div className="ex-err-text">{errors.email}</div>}
              </div>

              <div className="ex-field">
                <label className="ex-label">Phone Number</label>
                <input
                  name="phoneNumber"
                  className={`ex-input ${errors.phoneNumber ? "err" : ""}`}
                  value={form.phoneNumber}
                  onChange={handleChange}
                  disabled={isView}
                />
                {errors.phoneNumber && <div className="ex-err-text">{errors.phoneNumber}</div>}
              </div>

              <div className="ex-field">
                <label className="ex-label">Address</label>
                <input
                  name="address"
                  className="ex-input"
                  value={form.address}
                  onChange={handleChange}
                  disabled={isView}
                />
              </div>

              <RoleField
                roles={roles}
                setRoles={setRoles}
                value={form.mainUserRoleId}
                onChange={(id) => setForm((f) => ({ ...f, mainUserRoleId: id }))}
                disabled={isView}
                error={errors.mainUserRoleId}
              />
            </form>
          </div>

          <div className="ex-modal-foot">
            <button type="button" className="ex-btn ex-btn-outline" onClick={onClose}>
              {isView ? "Close" : "Cancel"}
            </button>
            {!isView && (
              <button type="submit" form="employeeEditForm" className="ex-btn ex-btn-primary" disabled={saving}>
                {saving && <span className="ex-spin" />}
                {saving ? "Saving..." : "Save"}
              </button>
            )}
          </div>
        </div>
      </div>
    </Portal>
  );
}