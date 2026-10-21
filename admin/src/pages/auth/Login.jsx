import { useState } from "react";
import { useNavigate } from "react-router-dom";

// Point this at your Express server (server.js -> app.use("/api", authRoutes))
const API_URL = import.meta.env?.VITE_API_URL || "http://localhost:5000";

function Login() {
  const navigate = useNavigate();

  const [form, setForm] = useState({ email: "", password: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    if (error) setError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!form.email || !form.password) {
      setError("Email and password are required");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.message || "Invalid email or password");
        setLoading(false);
        return;
      }

      // persist session
      localStorage.setItem("token", data.token);
      localStorage.setItem("user", JSON.stringify(data.user));

      navigate("/dashboard", { replace: true });
    } catch (err) {
      setError("Could not reach the server. Please try again.");
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <style>{`
        .login-page {
          position: relative;
          min-height: 100vh;
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #ffffff;
          overflow: hidden;
          font-family: "Inter", "Segoe UI", system-ui, -apple-system, sans-serif;
        }

        .login-bg-grid {
          position: absolute;
          inset: 0;
          background-image:
            linear-gradient(to right, rgba(0, 0, 0, 0.035) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(0, 0, 0, 0.035) 1px, transparent 1px);
          background-size: 44px 44px;
          mask-image: radial-gradient(circle at 50% 40%, black 0%, transparent 75%);
        }

        .login-glow {
          position: absolute;
          top: -20%;
          left: 50%;
          width: 900px;
          height: 900px;
          transform: translateX(-50%);
          background: radial-gradient(circle, rgba(0, 0, 0, 0.9) 0%, rgba(0, 0, 0, 0) 60%);
          opacity: 0.06;
          filter: blur(40px);
          pointer-events: none;
        }

        .login-card {
          position: relative;
          z-index: 1;
          width: 100%;
          max-width: 400px;
          margin: 24px;
          padding: 44px 40px 32px;
          background: #ffffff;
          border: 1px solid #ececec;
          border-radius: 20px;
          box-shadow:
            0 1px 2px rgba(0, 0, 0, 0.04),
            0 24px 48px -16px rgba(0, 0, 0, 0.12);
        }

        .login-brand {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 32px;
        }

        .login-mark {
          width: 34px;
          height: 34px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 9px;
          background: #0a0a0a;
          color: #fff;
          font-weight: 700;
          font-size: 15px;
          letter-spacing: -0.5px;
        }

        .login-brand span {
          font-weight: 600;
          font-size: 15px;
          color: #0a0a0a;
          letter-spacing: -0.2px;
        }

        .login-title {
          margin: 0 0 6px;
          font-size: 26px;
          font-weight: 700;
          color: #0a0a0a;
          letter-spacing: -0.5px;
        }

        .login-subtitle {
          margin: 0 0 30px;
          font-size: 14px;
          color: #8a8a8a;
        }

        .login-form {
          display: flex;
          flex-direction: column;
          gap: 18px;
        }

        .login-field {
          display: flex;
          flex-direction: column;
          gap: 7px;
        }

        .login-field label {
          font-size: 12.5px;
          font-weight: 600;
          color: #4a4a4a;
          letter-spacing: 0.2px;
        }

        .login-field input {
          width: 100%;
          box-sizing: border-box;
          padding: 12px 14px;
          font-size: 14.5px;
          color: #0a0a0a;
          background: #fafafa;
          border: 1px solid #e4e4e4;
          border-radius: 11px;
          outline: none;
          transition: border-color 0.15s ease, background 0.15s ease, box-shadow 0.15s ease;
        }

        .login-field input::placeholder {
          color: #b8b8b8;
        }

        .login-field input:focus {
          background: #ffffff;
          border-color: #0a0a0a;
          box-shadow: 0 0 0 3.5px rgba(0, 0, 0, 0.06);
        }

        .login-field input:disabled {
          opacity: 0.6;
        }

        .login-password-wrap {
          position: relative;
          display: flex;
          align-items: center;
        }

        .login-password-wrap input {
          padding-right: 56px;
        }

        .login-eye {
          position: absolute;
          right: 10px;
          border: none;
          background: transparent;
          color: #8a8a8a;
          font-size: 12px;
          font-weight: 600;
          cursor: pointer;
          padding: 6px 8px;
          border-radius: 6px;
          transition: color 0.15s ease, background 0.15s ease;
        }

        .login-eye:hover {
          color: #0a0a0a;
          background: #f0f0f0;
        }

        .login-error {
          padding: 10px 12px;
          font-size: 13px;
          color: #0a0a0a;
          background: #f5f5f5;
          border: 1px solid #dcdcdc;
          border-left: 3px solid #0a0a0a;
          border-radius: 8px;
        }

        .login-submit {
          margin-top: 6px;
          padding: 13px 16px;
          font-size: 14.5px;
          font-weight: 600;
          color: #ffffff;
          background: #0a0a0a;
          border: none;
          border-radius: 11px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          min-height: 46px;
          transition: transform 0.12s ease, box-shadow 0.12s ease, opacity 0.12s ease;
          box-shadow: 0 10px 24px -8px rgba(0, 0, 0, 0.35);
        }

        .login-submit:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 14px 28px -8px rgba(0, 0, 0, 0.4);
        }

        .login-submit:active:not(:disabled) {
          transform: translateY(0);
        }

        .login-submit:disabled {
          opacity: 0.65;
          cursor: not-allowed;
        }

        .login-spinner {
          width: 17px;
          height: 17px;
          border: 2px solid rgba(255, 255, 255, 0.35);
          border-top-color: #ffffff;
          border-radius: 50%;
          animation: login-spin 0.7s linear infinite;
        }

        @keyframes login-spin {
          to {
            transform: rotate(360deg);
          }
        }

        .login-footer {
          margin-top: 28px;
          text-align: center;
          font-size: 11.5px;
          color: #b0b0b0;
          letter-spacing: 0.3px;
        }
      `}</style>

      <div className="login-bg-grid" />
      <div className="login-glow" />

      <div className="login-card">
        <div className="login-brand">
          <div className="login-mark">P</div>
          <span>ProxERP</span>
        </div>

        <h1 className="login-title">Welcome back</h1>
        <p className="login-subtitle">Sign in to continue to your dashboard</p>

        <form className="login-form" onSubmit={handleSubmit} noValidate>
          <div className="login-field">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              placeholder="you@company.com"
              value={form.email}
              onChange={handleChange}
              disabled={loading}
            />
          </div>

          <div className="login-field">
            <label htmlFor="password">Password</label>
            <div className="login-password-wrap">
              <input
                id="password"
                name="password"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                placeholder="••••••••"
                value={form.password}
                onChange={handleChange}
                disabled={loading}
              />
              <button
                type="button"
                className="login-eye"
                onClick={() => setShowPassword((s) => !s)}
                tabIndex={-1}
              >
                {showPassword ? "Hide" : "Show"}
              </button>
            </div>
          </div>

          {error && <div className="login-error">{error}</div>}

          <button type="submit" className="login-submit" disabled={loading}>
            {loading ? <span className="login-spinner" /> : "Sign in"}
          </button>
        </form>

        <div className="login-footer">
          Protected access — ProxERP Internal
        </div>
      </div>
    </div>
  );
}

export default Login;