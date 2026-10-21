import { useState } from "react";
import RoleManageModal from "./RoleManageModal";

export default function RoleField({ roles, setRoles, value, onChange, disabled, error }) {
  const [showManage, setShowManage] = useState(false);
  const selected = roles.find((r) => r.id === value) || null;

  const refreshRoles = async (list) => {
    if (list) setRoles(list);
  };

  return (
    <div className="ex-field">
      <label className="ex-label">Role</label>
      <div style={{ display: "flex", gap: 8 }}>
        <div
          className={`ex-input ex-select-trigger ${error ? "err" : ""} ${disabled ? "disabled" : ""}`}
          onClick={() => !disabled && setShowManage(true)}
        >
          <span className={selected ? "" : "ex-select-placeholder"}>
            {selected ? selected.name : "Select role..."}
          </span>
          <span style={{ color: "#bbb" }}>▾</span>
        </div>
        {!disabled && (
          <button type="button" className="ex-btn-icon" onClick={() => setShowManage(true)} title="Manage roles">
            +
          </button>
        )}
      </div>
      {error && <div className="ex-err-text">{error}</div>}

      {showManage && (
        <RoleManageModal
          onClose={() => setShowManage(false)}
          onRolesChanged={() => {}}
          onSelect={(role) => {
            setRoles((prev) => {
              const exists = prev.some((r) => r.id === role.id);
              return exists ? prev.map((r) => (r.id === role.id ? role : r)) : [...prev, role];
            });
            onChange(role.id);
            setShowManage(false);
          }}
        />
      )}
    </div>
  );
}