import { useState } from "react";
import Icon from "../../components/Icon";
import Modal from "../../components/Modal";
import PasswordField from "../../components/PasswordField";
import api from "../../api/Axios";

const EMPTY_FORM = {
  name: "",
  email: "",
  address: "",
  phoneNumber: "",
  password: "",
  confirmPassword: "",
};

function validate(form) {
  const errors = {};

  if (!form.name.trim()) errors.name = "Name is required";

  if (!form.email.trim()) {
    errors.email = "Email is required";
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
    errors.email = "Enter a valid email address";
  }

  if (!form.phoneNumber.trim()) {
    errors.phoneNumber = "Phone number is required";
  } else if (!/^[0-9+\-\s()]{7,15}$/.test(form.phoneNumber)) {
    errors.phoneNumber = "Enter a valid phone number";
  }

  if (!form.password) {
    errors.password = "Password is required";
  } else if (form.password.length < 6) {
    errors.password = "Must be at least 6 characters";
  }

  if (!form.confirmPassword) {
    errors.confirmPassword = "Please confirm the password";
  } else if (form.password && form.confirmPassword !== form.password) {
    errors.confirmPassword = "Passwords do not match";
  }

  return errors;
}

function CreateUser() {
  const [form, setForm] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null); // { type: 'success' | 'error', message }

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
    if (errors[name]) setErrors((er) => ({ ...er, [name]: undefined }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const validationErrors = validate(form);
    setErrors(validationErrors);
    if (Object.keys(validationErrors).length > 0) return;

    setLoading(true);
    try {
      const res = await api.post("/users", form);
      setResult({
        type: "success",
        message: `${res.data.data.name} was created successfully.`,
      });
      setForm(EMPTY_FORM);
    } catch (err) {
      setResult({
        type: "error",
        message:
          err.response?.data?.message ||
          "Could not reach the server. Please try again.",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="um-page">
      <style>{`
        .um-page { font-family: "Inter","Segoe UI",system-ui,-apple-system,sans-serif; color: #111; display: flex; justify-content: center; }

        .um-form-card {
          background: #fff;
          border: 1px solid #ececec;
          border-radius: 16px;
          padding: 32px 36px;
          width: 100%;
          max-width: 720px;
          margin: 8px auto 0;
        }
        .um-form-title { margin: 0 0 4px; font-size: 17px; font-weight: 700; }
        .um-form-sub { margin: 0 0 24px; font-size: 13px; color: #8a8a8a; }

        .um-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
        .um-grid .span-2 { grid-column: 1 / -1; }
        @media (max-width: 560px) { .um-grid { grid-template-columns: 1fr; } }

        .um-field { display: flex; flex-direction: column; gap: 6px; margin-bottom: 4px; }
        .um-field label { font-size: 12.5px; font-weight: 600; color: #4a4a4a; }
        .um-field input, .um-field textarea {
          width: 100%; box-sizing: border-box; padding: 11px 13px; font-size: 14px;
          color: #111; background: #fafafa; border: 1px solid #e4e4e4; border-radius: 10px;
          outline: none; font-family: inherit;
          transition: border-color .15s ease, background .15s ease, box-shadow .15s ease;
        }
        .um-field input::placeholder { color: #b8b8b8; }
        .um-field input:focus, .um-field textarea:focus {
          background: #fff; border-color: #0a0a0a; box-shadow: 0 0 0 3.5px rgba(0,0,0,0.06);
        }
        .um-field input.has-error, .um-field input:invalid[data-touched] { border-color: #d64545; }
        .um-field input.has-error { background: #fff8f8; border-color: #d64545; }

        .um-password-wrap { position: relative; display: flex; align-items: center; }
        .um-password-wrap input { padding-right: 44px; }
        .um-eye-btn {
          position: absolute; right: 8px; border: none; background: transparent;
          color: #8a8a8a; cursor: pointer; padding: 6px; border-radius: 6px; display: flex;
        }
        .um-eye-btn:hover { color: #0a0a0a; background: #f0f0f0; }

        .um-inline-error {
          font-size: 11.8px; color: #d64545; display: flex; align-items: center; gap: 4px;
        }

        .um-submit {
          margin-top: 8px; padding: 12px 20px; font-size: 14px; font-weight: 600;
          color: #fff; background: #0a0a0a; border: none; border-radius: 10px; cursor: pointer;
          display: flex; align-items: center; justify-content: center; gap: 8px; min-width: 160px;
          min-height: 44px; transition: transform .12s ease, opacity .12s ease;
          box-shadow: 0 10px 24px -8px rgba(0,0,0,0.35);
        }
        .um-submit:hover:not(:disabled) { transform: translateY(-1px); }
        .um-submit:disabled { opacity: .65; cursor: not-allowed; }

        .um-spinner {
          width: 16px; height: 16px; border: 2px solid rgba(255,255,255,.35);
          border-top-color: #fff; border-radius: 50%; animation: um-spin .7s linear infinite;
        }
        @keyframes um-spin { to { transform: rotate(360deg); } }

        /* Modal */
        .um-modal-backdrop {
          position: fixed; inset: 0; background: rgba(10,10,10,0.45);
          display: flex; align-items: center; justify-content: center;
          z-index: 100; padding: 16px;
        }
        .um-modal {
          background: #fff; border-radius: 16px; width: 100%;
          box-shadow: 0 30px 60px -20px rgba(0,0,0,0.35);
          max-height: 90vh; display: flex; flex-direction: column; overflow: hidden;
        }
        .um-modal-head {
          display: flex; align-items: center; justify-content: space-between;
          padding: 16px 18px; border-bottom: 1px solid #f0f0f0;
        }
        .um-modal-head h3 { margin: 0; font-size: 15px; font-weight: 700; }
        .um-modal-body { padding: 18px; overflow-y: auto; }
        .um-modal-foot { padding: 14px 18px; border-top: 1px solid #f0f0f0; display: flex; justify-content: flex-end; gap: 10px; }

        .um-icon-btn {
          width: 30px; height: 30px; display: flex; align-items: center; justify-content: center;
          border-radius: 8px; border: none; background: transparent; color: #666; cursor: pointer;
        }
        .um-icon-btn:hover { background: #f4f4f4; }

        .um-result { display: flex; flex-direction: column; align-items: center; text-align: center; gap: 12px; padding: 8px 4px 4px; }
        .um-result-icon {
          width: 52px; height: 52px; border-radius: 50%; display: flex; align-items: center; justify-content: center;
        }
        .um-result-icon.success { background: #eafaf0; color: #17803d; }
        .um-result-icon.error { background: #fdecec; color: #b00020; }
        .um-result p { margin: 0; font-size: 13.5px; color: #555; }

        .um-btn-secondary {
          padding: 10px 18px; font-size: 13.5px; font-weight: 600; border-radius: 9px;
          border: 1px solid #e4e4e4; background: #fff; color: #333; cursor: pointer;
        }
        .um-btn-secondary:hover { background: #f7f7f7; }
        .um-btn-primary {
          padding: 10px 18px; font-size: 13.5px; font-weight: 600; border-radius: 9px;
          border: none; background: #0a0a0a; color: #fff; cursor: pointer;
        }
      `}</style>

      <div className="um-form-card">
        <h2 className="um-form-title">Create User</h2>
        <p className="um-form-sub">
          This creates a login account and a profile record together.
        </p>

        <form onSubmit={handleSubmit} noValidate>
          <div className="um-grid">
            <div className="um-field span-2">
              <label htmlFor="name">Full name</label>
              <input
                id="name"
                name="name"
                placeholder="e.g. Arjun Menon"
                value={form.name}
                onChange={handleChange}
                disabled={loading}
                className={errors.name ? "has-error" : ""}
              />
              {errors.name && (
                <span className="um-inline-error">
                  <Icon name="alert" size={13} /> {errors.name}
                </span>
              )}
            </div>

            <div className="um-field">
              <label htmlFor="email">Email</label>
              <input
                id="email"
                name="email"
                type="email"
                placeholder="you@company.com"
                value={form.email}
                onChange={handleChange}
                disabled={loading}
                className={errors.email ? "has-error" : ""}
              />
              {errors.email && (
                <span className="um-inline-error">
                  <Icon name="alert" size={13} /> {errors.email}
                </span>
              )}
            </div>

            <div className="um-field">
              <label htmlFor="phoneNumber">Phone number</label>
              <input
                id="phoneNumber"
                name="phoneNumber"
                placeholder="+91 98765 43210"
                value={form.phoneNumber}
                onChange={handleChange}
                disabled={loading}
                className={errors.phoneNumber ? "has-error" : ""}
              />
              {errors.phoneNumber && (
                <span className="um-inline-error">
                  <Icon name="alert" size={13} /> {errors.phoneNumber}
                </span>
              )}
            </div>

            <div className="um-field span-2">
              <label htmlFor="address">Address</label>
              <input
                id="address"
                name="address"
                placeholder="Street, city, state"
                value={form.address}
                onChange={handleChange}
                disabled={loading}
              />
            </div>

            <PasswordField
              id="password"
              label="Password"
              value={form.password}
              onChange={handleChange}
              error={errors.password}
              disabled={loading}
            />

            <PasswordField
              id="confirmPassword"
              label="Confirm password"
              value={form.confirmPassword}
              onChange={handleChange}
              error={errors.confirmPassword}
              disabled={loading}
            />
          </div>

          <button type="submit" className="um-submit" disabled={loading}>
            {loading ? <span className="um-spinner" /> : "Create user"}
          </button>
        </form>
      </div>

      <Modal
        open={!!result}
        onClose={() => setResult(null)}
        title={result?.type === "success" ? "User created" : "Couldn't create user"}
        footer={
          <button className="um-btn-primary" onClick={() => setResult(null)}>
            OK
          </button>
        }
      >
        <div className="um-result">
          <div className={`um-result-icon ${result?.type}`}>
            <Icon name={result?.type === "success" ? "check" : "alert"} size={24} />
          </div>
          <p>{result?.message}</p>
        </div>
      </Modal>
    </div>
  );
}

export default CreateUser;