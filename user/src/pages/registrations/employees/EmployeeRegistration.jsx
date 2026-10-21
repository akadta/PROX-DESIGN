import { useEffect, useState } from "react";
import EmployeeTheme from "./EmployeeTheme";
import RoleField from "./RoleField";
import SuccessModal from "./SuccessModal";
import { registerEmployee, listMainUserRoles } from "../../../api/mainUserEmployeeApi";

const EMPTY_FORM = { name: "", email: "", address: "", phoneNumber: "", password: "", mainUserRoleId: "" };

function EmployeeRegistration() {
  const [form, setForm] = useState(EMPTY_FORM);
  const [roles, setRoles] = useState([]);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState(null);

  useEffect(() => {
    listMainUserRoles().then((res) => setRoles(res.data.data || []));
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
    if (errors[name]) setErrors((er) => ({ ...er, [name]: undefined }));
  };

  const validate = () => {
    const errs = {};
    if (!form.name.trim()) errs.name = "Name is required";
    if (!form.email.trim()) errs.email = "Email is required";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) errs.email = "Enter a valid email";
    if (!form.phoneNumber.trim()) errs.phoneNumber = "Phone number is required";
    if (!form.password || form.password.length < 6) errs.password = "Minimum 6 characters";
    if (!form.mainUserRoleId) errs.mainUserRoleId = "Role is required";
    return errs;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate();
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;

    setSaving(true);
    try {
      const res = await registerEmployee(form);
      setResult({ type: "success", message: `${res.data.employee.name} was registered successfully.` });
      setForm(EMPTY_FORM);
    } catch (err) {
      setResult({ type: "error", message: err.response?.data?.message || "Something went wrong." });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="ex-wrap">
      <EmployeeTheme />

      <div style={{ maxWidth: 520, margin: "0 auto" }}>
        <h1 className="ex-h1">Register Employee</h1>
        <p className="ex-sub">Create a login account and employee profile.</p>

        <div className="ex-card">
          <div className="ex-card-pad">
            <form onSubmit={handleSubmit} noValidate>
              <div className="ex-field">
                <label className="ex-label">Name</label>
                <input
                  name="name"
                  className={`ex-input ${errors.name ? "err" : ""}`}
                  value={form.name}
                  onChange={handleChange}
                  placeholder="e.g. Arjun Menon"
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
                  placeholder="you@company.com"
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
                  placeholder="+91 98765 43210"
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
                  placeholder="Street, city, state"
                />
              </div>

              <div className="ex-field">
                <label className="ex-label">Password</label>
                <input
                  name="password"
                  type="password"
                  autoComplete="new-password"
                  className={`ex-input ${errors.password ? "err" : ""}`}
                  value={form.password}
                  onChange={handleChange}
                />
                {errors.password && <div className="ex-err-text">{errors.password}</div>}
              </div>

              <RoleField
                roles={roles}
                setRoles={setRoles}
                value={form.mainUserRoleId}
                onChange={(id) => {
                  setForm((f) => ({ ...f, mainUserRoleId: id }));
                  if (errors.mainUserRoleId) setErrors((er) => ({ ...er, mainUserRoleId: undefined }));
                }}
                error={errors.mainUserRoleId}
              />

              <button type="submit" className="ex-btn ex-btn-primary" disabled={saving} style={{ marginTop: 6, width: "100%" }}>
                {saving && <span className="ex-spin" />}
                {saving ? "Registering..." : "Register Employee"}
              </button>
            </form>
          </div>
        </div>
      </div>

      {result && (
        <SuccessModal type={result.type} message={result.message} onClose={() => setResult(null)} />
      )}
    </div>
  );
}

export default EmployeeRegistration;