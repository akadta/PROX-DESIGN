import { useState } from "react";
import Icon from "./Icon";

function PasswordField({ id, label, value, onChange, error, placeholder, disabled }) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="um-field">
      <label htmlFor={id}>{label}</label>
      <div className="um-password-wrap">
        <input
          id={id}
          name={id}
          type={visible ? "text" : "password"}
          autoComplete="new-password"
          placeholder={placeholder || "••••••••"}
          value={value}
          onChange={onChange}
          disabled={disabled}
          className={error ? "has-error" : ""}
        />
        <button
          type="button"
          className="um-eye-btn"
          onClick={() => setVisible((v) => !v)}
          tabIndex={-1}
        >
          <Icon name={visible ? "eyeOff" : "eye"} size={17} />
        </button>
      </div>
      {error && <span className="um-inline-error">{error}</span>}
    </div>
  );
}

export default PasswordField;