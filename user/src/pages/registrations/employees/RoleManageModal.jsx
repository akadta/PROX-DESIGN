import { useEffect, useState } from "react";
import Portal from "../../../components/Portal";
import { listMainUserRoles, createMainUserRole, updateMainUserRole } from "../../../api/mainUserEmployeeApi";

export default function RoleManageModal({ onClose, onRolesChanged, onSelect }) {
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [editingId, setEditingId] = useState(null);
  const [editValue, setEditValue] = useState("");
  const [savingId, setSavingId] = useState(null);

  const [newName, setNewName] = useState("");
  const [creating, setCreating] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const res = await listMainUserRoles();
      setRoles(res.data.data || []);
    } catch {
      setError("Could not load roles");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!newName.trim()) return;
    setError("");
    setCreating(true);
    try {
      const res = await createMainUserRole(newName.trim());
      setRoles((r) => [...r, res.data.data]);
      setNewName("");
      onRolesChanged?.();
    } catch (err) {
      setError(err.response?.data?.message || "Could not create role");
    } finally {
      setCreating(false);
    }
  };

  const startEdit = (role) => {
    setEditingId(role.id);
    setEditValue(role.name);
    setError("");
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditValue("");
  };

  const saveEdit = async (role) => {
    if (!editValue.trim()) return;
    setError("");
    setSavingId(role.id);
    try {
      const res = await updateMainUserRole(role.id, editValue.trim());
      setRoles((rs) => rs.map((r) => (r.id === role.id ? res.data.data : r)));
      setEditingId(null);
      onRolesChanged?.();
    } catch (err) {
      setError(err.response?.data?.message || "Could not update role");
    } finally {
      setSavingId(null);
    }
  };

  return (
    <Portal>
      <div className="ex-modal-backdrop" onClick={(e) => e.stopPropagation()}>
        <div className="ex-modal wide">
          <div className="ex-modal-head">
            <h3>Manage Roles</h3>
            <button type="button" className="ex-modal-close" onClick={onClose}>✕</button>
          </div>

          <div className="ex-modal-body">
            {error && <div className="ex-inline-alert">{error}</div>}

            <div className="ex-role-list">
              {loading ? (
                <div className="ex-role-empty">Loading roles…</div>
              ) : roles.length === 0 ? (
                <div className="ex-role-empty">No roles yet. Add one below.</div>
              ) : (
                roles.map((role) => (
                  <div key={role.id} className={`ex-role-row ${editingId === role.id ? "editing" : ""}`}>
                    {editingId === role.id ? (
                      <>
                        <input
                          autoFocus
                          className="ex-input"
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          style={{ padding: "6px 10px" }}
                        />
                        <button
                          type="button"
                          className="ex-btn ex-btn-primary"
                          style={{ padding: "6px 12px" }}
                          onClick={() => saveEdit(role)}
                          disabled={savingId === role.id}
                        >
                          {savingId === role.id ? <span className="ex-spin" /> : "Save"}
                        </button>
                        <button type="button" className="ex-btn ex-btn-outline" style={{ padding: "6px 12px" }} onClick={cancelEdit}>
                          Cancel
                        </button>
                      </>
                    ) : (
                      <>
                        <span className="ex-role-name">{role.name}</span>
                        {onSelect && (
                          <button
                            type="button"
                            className="ex-btn ex-btn-outline"
                            style={{ padding: "5px 11px", fontSize: 12 }}
                            onClick={() => onSelect(role)}
                          >
                            Use
                          </button>
                        )}
                        <button type="button" className="ex-btn-icon" style={{ width: 30, height: 30 }} onClick={() => startEdit(role)} title="Edit">
                          ✎
                        </button>
                      </>
                    )}
                  </div>
                ))
              )}
            </div>

            <div className="ex-divider" />

            <form onSubmit={handleCreate} style={{ display: "flex", gap: 8 }}>
              <input
                className="ex-input"
                placeholder="New role name..."
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
              />
              <button type="submit" className="ex-btn ex-btn-primary" disabled={creating} style={{ flexShrink: 0 }}>
                {creating ? <span className="ex-spin" /> : "+ Add"}
              </button>
            </form>
          </div>

          <div className="ex-modal-foot">
            <button type="button" className="ex-btn ex-btn-outline" onClick={onClose}>Close</button>
          </div>
        </div>
      </div>
    </Portal>
  );
}