import { useEffect, useMemo, useState } from "react";
import Icon from "../../components/Icon";
import Modal from "../../components/Modal";
import api from "../../api/Axios";

function UsersList() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [query, setQuery] = useState("");

  const [viewUser, setViewUser] = useState(null);
  const [editUser, setEditUser] = useState(null);
  const [editForm, setEditForm] = useState(null);
  const [editErrors, setEditErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [toast, setToast] = useState(null); // { type, message }

  const fetchUsers = async () => {
    setLoading(true);
    setLoadError("");
    try {
      const res = await api.get("/users");
      setUsers(res.data.data || []);
    } catch (err) {
      setLoadError(err.response?.data?.message || "Failed to load users");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3500);
    return () => clearTimeout(t);
  }, [toast]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return users;
    return users.filter((u) =>
      [u.name, u.email, u.phoneNumber, u.address, u.role]
        .filter(Boolean)
        .some((field) => field.toLowerCase().includes(q))
    );
  }, [users, query]);

  const openEdit = (user) => {
    setEditUser(user);
    setEditForm({
      name: user.name,
      email: user.email,
      phoneNumber: user.phoneNumber,
      address: user.address || "",
    });
    setEditErrors({});
    setSaveError("");
  };

  const handleEditChange = (e) => {
    const { name, value } = e.target;
    setEditForm((f) => ({ ...f, [name]: value }));
    if (editErrors[name]) setEditErrors((er) => ({ ...er, [name]: undefined }));
  };

  const validateEdit = (form) => {
    const errs = {};
    if (!form.name.trim()) errs.name = "Name is required";
    if (!form.email.trim()) {
      errs.email = "Email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      errs.email = "Enter a valid email address";
    }
    if (!form.phoneNumber.trim()) errs.phoneNumber = "Phone number is required";
    return errs;
  };

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    const errs = validateEdit(editForm);
    setEditErrors(errs);
    if (Object.keys(errs).length > 0) return;

    setSaving(true);
    setSaveError("");
    try {
      const res = await api.put(`/users/${editUser.id}`, editForm);
      setUsers((prev) =>
        prev.map((u) =>
          u.id === editUser.id ? { ...u, ...res.data.data } : u
        )
      );
      setEditUser(null);
      setToast({ type: "success", message: "User updated successfully" });
    } catch (err) {
      setSaveError(
        err.response?.data?.message || "Could not reach the server. Please try again."
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="ul-page">
      <style>{`
        .ul-page { font-family: "Inter","Segoe UI",system-ui,-apple-system,sans-serif; color: #111; }

        .ul-toolbar {
          display: flex; align-items: center; justify-content: space-between;
          gap: 12px; margin-bottom: 16px; flex-wrap: wrap;
        }
        .ul-title { margin: 0; font-size: 17px; font-weight: 700; }
        .ul-count { font-size: 12.5px; color: #9a9a9a; font-weight: 500; }

        .ul-search {
          display: flex; align-items: center; gap: 8px;
          background: #fff; border: 1px solid #e4e4e4; border-radius: 10px;
          padding: 9px 12px; min-width: 260px; color: #9a9a9a;
        }
        .ul-search input {
          border: none; outline: none; font-size: 13.5px; width: 100%;
          background: transparent; color: #111; font-family: inherit;
        }
        .ul-search input::placeholder { color: #b8b8b8; }

        .ul-table-card {
          background: #fff; border: 1px solid #ececec; border-radius: 14px; overflow: hidden;
        }
        .ul-table-scroll {
          overflow-x: auto; overflow-y: auto; max-height: 62vh;
        }
        table.ul-table { border-collapse: collapse; width: 100%; min-width: 780px; }
        .ul-table thead th {
          position: sticky; top: 0; z-index: 2;
          background: #fafafa; text-align: left; font-size: 11.5px; font-weight: 700;
          text-transform: uppercase; letter-spacing: 0.04em; color: #8a8a8a;
          padding: 12px 16px; border-bottom: 1px solid #ececec; white-space: nowrap;
        }
        .ul-table tbody td {
          padding: 13px 16px; font-size: 13.4px; color: #222; border-bottom: 1px solid #f2f2f2;
          white-space: nowrap; max-width: 240px; overflow: hidden; text-overflow: ellipsis;
        }
        .ul-table tbody tr:hover { background: #fafafa; }
        .ul-table tbody tr:last-child td { border-bottom: none; }

        .ul-name-cell { display: flex; align-items: center; gap: 10px; }
        .ul-avatar {
          width: 30px; height: 30px; border-radius: 50%; background: #0a0a0a; color: #fff;
          font-size: 11px; font-weight: 700; display: flex; align-items: center; justify-content: center;
          flex-shrink: 0;
        }

        .ul-badge {
          display: inline-flex; align-items: center; padding: 3px 9px; border-radius: 999px;
          font-size: 11px; font-weight: 600;
        }
        .ul-badge.active { background: #eafaf0; color: #17803d; }
        .ul-badge.inactive { background: #f3f3f3; color: #888; }

        .ul-actions { display: flex; gap: 6px; }
        .ul-action-btn {
          width: 30px; height: 30px; display: flex; align-items: center; justify-content: center;
          border-radius: 8px; border: 1px solid #ececec; background: #fff; color: #555; cursor: pointer;
          transition: background .12s ease, color .12s ease;
        }
        .ul-action-btn:hover { background: #0a0a0a; color: #fff; border-color: #0a0a0a; }

        .ul-empty, .ul-loading, .ul-error {
          display: flex; flex-direction: column; align-items: center; justify-content: center;
          gap: 8px; padding: 60px 20px; color: #9a9a9a; font-size: 13.5px;
        }
        .ul-spinner {
          width: 22px; height: 22px; border: 2.5px solid #eee; border-top-color: #0a0a0a;
          border-radius: 50%; animation: ul-spin .7s linear infinite;
        }
        @keyframes ul-spin { to { transform: rotate(360deg); } }

        /* Modal (shared look with CreateUser) */
        .um-modal-backdrop {
          position: fixed; inset: 0; background: rgba(10,10,10,0.45);
          display: flex; align-items: center; justify-content: center; z-index: 100; padding: 16px;
        }
        .um-modal {
          background: #fff; border-radius: 16px; width: 100%;
          box-shadow: 0 30px 60px -20px rgba(0,0,0,0.35);
          max-height: 90vh; display: flex; flex-direction: column; overflow: hidden;
        }
        .um-modal-head { display: flex; align-items: center; justify-content: space-between; padding: 16px 18px; border-bottom: 1px solid #f0f0f0; }
        .um-modal-head h3 { margin: 0; font-size: 15px; font-weight: 700; }
        .um-modal-body { padding: 18px; overflow-y: auto; }
        .um-modal-foot { padding: 14px 18px; border-top: 1px solid #f0f0f0; display: flex; justify-content: flex-end; gap: 10px; }
        .um-icon-btn { width: 30px; height: 30px; display: flex; align-items: center; justify-content: center; border-radius: 8px; border: none; background: transparent; color: #666; cursor: pointer; }
        .um-icon-btn:hover { background: #f4f4f4; }
        .um-btn-secondary { padding: 10px 18px; font-size: 13.5px; font-weight: 600; border-radius: 9px; border: 1px solid #e4e4e4; background: #fff; color: #333; cursor: pointer; }
        .um-btn-secondary:hover { background: #f7f7f7; }
        .um-btn-primary { padding: 10px 18px; font-size: 13.5px; font-weight: 600; border-radius: 9px; border: none; background: #0a0a0a; color: #fff; cursor: pointer; display: flex; align-items: center; gap: 8px; }
        .um-btn-primary:disabled { opacity: .6; cursor: not-allowed; }

        .ul-view-row { display: flex; justify-content: space-between; padding: 9px 0; border-bottom: 1px solid #f3f3f3; font-size: 13.4px; }
        .ul-view-row:last-child { border-bottom: none; }
        .ul-view-row span:first-child { color: #9a9a9a; }
        .ul-view-row span:last-child { color: #111; font-weight: 500; text-align: right; max-width: 65%; }

        .ul-field { display: flex; flex-direction: column; gap: 6px; margin-bottom: 14px; }
        .ul-field label { font-size: 12.5px; font-weight: 600; color: #4a4a4a; }
        .ul-field input {
          width: 100%; box-sizing: border-box; padding: 10px 12px; font-size: 13.8px;
          color: #111; background: #fafafa; border: 1px solid #e4e4e4; border-radius: 9px;
          outline: none; font-family: inherit;
        }
        .ul-field input:focus { background: #fff; border-color: #0a0a0a; box-shadow: 0 0 0 3.5px rgba(0,0,0,0.06); }
        .ul-field input.has-error { border-color: #d64545; background: #fff8f8; }
        .ul-inline-error { font-size: 11.5px; color: #d64545; display: flex; align-items: center; gap: 4px; }

        .ul-form-banner { background: #fdecec; color: #b00020; font-size: 12.8px; padding: 9px 12px; border-radius: 8px; margin-bottom: 14px; }

        .ul-spinner-sm { width: 14px; height: 14px; border: 2px solid rgba(255,255,255,.35); border-top-color: #fff; border-radius: 50%; animation: ul-spin .7s linear infinite; }

        .ul-toast {
          position: fixed; bottom: 24px; right: 24px; z-index: 200;
          display: flex; align-items: center; gap: 8px; padding: 12px 16px;
          background: #0a0a0a; color: #fff; border-radius: 10px; font-size: 13px; font-weight: 500;
          box-shadow: 0 12px 28px -10px rgba(0,0,0,0.4);
        }
        .ul-toast.error { background: #b00020; }
      `}</style>

      <div className="ul-toolbar">
        <div>
          <h2 className="ul-title">All Users</h2>
          <span className="ul-count">{filtered.length} of {users.length} users</span>
        </div>
        <div className="ul-search">
          <Icon name="search" size={16} />
          <input
            placeholder="Search by name, email, phone, address…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
      </div>

      <div className="ul-table-card">
        <div className="ul-table-scroll">
          <table className="ul-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Phone</th>
                <th>Address</th>
                <th>Role</th>
                <th>Status</th>
                <th style={{ textAlign: "right" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {!loading && !loadError && filtered.map((u) => {
                const initials = (u.name || "U").split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();
                return (
                  <tr key={u.id}>
                    <td>
                      <div className="ul-name-cell">
                        <div className="ul-avatar">{initials}</div>
                        {u.name}
                      </div>
                    </td>
                    <td>{u.email}</td>
                    <td>{u.phoneNumber}</td>
                    <td>{u.address || "—"}</td>
                    <td>{u.role}</td>
                    <td>
                      <span className={`ul-badge ${u.isActive ? "active" : "inactive"}`}>
                        {u.isActive ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td>
                      <div className="ul-actions" style={{ justifyContent: "flex-end" }}>
                        <button className="ul-action-btn" onClick={() => setViewUser(u)}>
                          <Icon name="eye" size={15} />
                        </button>
                        <button className="ul-action-btn" onClick={() => openEdit(u)}>
                          <Icon name="edit" size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {loading && (
            <div className="ul-loading">
              <span className="ul-spinner" />
              Loading users…
            </div>
          )}

          {!loading && loadError && (
            <div className="ul-error">
              <Icon name="alert" size={20} />
              {loadError}
            </div>
          )}

          {!loading && !loadError && filtered.length === 0 && (
            <div className="ul-empty">
              <Icon name="search" size={20} />
              No users match your search.
            </div>
          )}
        </div>
      </div>

      {/* View modal */}
      <Modal open={!!viewUser} onClose={() => setViewUser(null)} title="User details">
        {viewUser && (
          <div>
            <div className="ul-view-row"><span>Name</span><span>{viewUser.name}</span></div>
            <div className="ul-view-row"><span>Email</span><span>{viewUser.email}</span></div>
            <div className="ul-view-row"><span>Phone</span><span>{viewUser.phoneNumber}</span></div>
            <div className="ul-view-row"><span>Address</span><span>{viewUser.address || "—"}</span></div>
            <div className="ul-view-row"><span>Role</span><span>{viewUser.role}</span></div>
            <div className="ul-view-row">
              <span>Status</span>
              <span className={`ul-badge ${viewUser.isActive ? "active" : "inactive"}`}>
                {viewUser.isActive ? "Active" : "Inactive"}
              </span>
            </div>
            <div className="ul-view-row">
              <span>Created</span>
              <span>{new Date(viewUser.createdAt).toLocaleDateString()}</span>
            </div>
          </div>
        )}
      </Modal>

      {/* Edit modal */}
      <Modal
        open={!!editUser}
        onClose={() => setEditUser(null)}
        title="Edit user"
        footer={
          <>
            <button className="um-btn-secondary" onClick={() => setEditUser(null)}>
              Cancel
            </button>
            <button className="um-btn-primary" onClick={handleSaveEdit} disabled={saving}>
              {saving && <span className="ul-spinner-sm" />}
              Save changes
            </button>
          </>
        }
      >
        {editForm && (
          <form onSubmit={handleSaveEdit} noValidate>
            {saveError && <div className="ul-form-banner">{saveError}</div>}

            <div className="ul-field">
              <label>Full name</label>
              <input
                name="name"
                value={editForm.name}
                onChange={handleEditChange}
                className={editErrors.name ? "has-error" : ""}
              />
              {editErrors.name && (
                <span className="ul-inline-error"><Icon name="alert" size={12} /> {editErrors.name}</span>
              )}
            </div>

            <div className="ul-field">
              <label>Email</label>
              <input
                name="email"
                type="email"
                value={editForm.email}
                onChange={handleEditChange}
                className={editErrors.email ? "has-error" : ""}
              />
              {editErrors.email && (
                <span className="ul-inline-error"><Icon name="alert" size={12} /> {editErrors.email}</span>
              )}
            </div>

            <div className="ul-field">
              <label>Phone number</label>
              <input
                name="phoneNumber"
                value={editForm.phoneNumber}
                onChange={handleEditChange}
                className={editErrors.phoneNumber ? "has-error" : ""}
              />
              {editErrors.phoneNumber && (
                <span className="ul-inline-error"><Icon name="alert" size={12} /> {editErrors.phoneNumber}</span>
              )}
            </div>

            <div className="ul-field" style={{ marginBottom: 0 }}>
              <label>Address</label>
              <input name="address" value={editForm.address} onChange={handleEditChange} />
            </div>
          </form>
        )}
      </Modal>

      {toast && (
        <div className={`ul-toast ${toast.type}`}>
          <Icon name={toast.type === "success" ? "check" : "alert"} size={16} />
          {toast.message}
        </div>
      )}
    </div>
  );
}

export default UsersList;