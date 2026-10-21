function EmployeeTheme() {
  return (
    <style>{`
      .ex-wrap { font-family: "Inter","Segoe UI",system-ui,-apple-system,sans-serif; color: #0a0a0a; }
      .ex-h1 { font-size: 18px; font-weight: 700; margin: 0 0 2px; letter-spacing: -0.01em; }
      .ex-sub { font-size: 12.5px; color: #999; margin: 0 0 20px; }

      .ex-card { background: #fff; border: 1px solid #ececec; border-radius: 10px; }
      .ex-card-pad { padding: 24px; }

      .ex-label { font-size: 12px; font-weight: 600; color: #555; margin-bottom: 6px; display: block; letter-spacing: 0.01em; }
      .ex-input {
        width: 100%; box-sizing: border-box; padding: 9px 12px; font-size: 13.5px;
        color: #0a0a0a; background: #fff; border: 1px solid #dcdcdc; border-radius: 7px;
        outline: none; font-family: inherit; transition: border-color .12s ease, box-shadow .12s ease;
      }
      .ex-input::placeholder { color: #bbb; }
      .ex-input:focus { border-color: #0a0a0a; box-shadow: 0 0 0 3px rgba(0,0,0,0.05); }
      .ex-input:disabled { background: #fafafa; color: #777; }
      .ex-input.err { border-color: #0a0a0a; background: #fafafa; }

      .ex-field { margin-bottom: 16px; }
      .ex-err-text { font-size: 11px; color: #0a0a0a; font-weight: 600; margin-top: 5px; }

      .ex-inline-alert {
        font-size: 12.5px; padding: 9px 12px; border-radius: 7px; margin-bottom: 16px;
        border: 1px solid #0a0a0a; background: #fafafa; color: #0a0a0a; display: flex; gap: 8px; align-items: flex-start;
      }
      .ex-inline-alert.subtle { border-color: #e2e2e2; background: #fbfbfb; color: #555; }

      .ex-btn {
        font-size: 13px; font-weight: 600; border-radius: 7px; padding: 9px 18px; border: 1px solid #0a0a0a;
        cursor: pointer; display: inline-flex; align-items: center; justify-content: center; gap: 7px;
        transition: opacity .12s ease, transform .1s ease;
      }
      .ex-btn:active { transform: translateY(1px); }
      .ex-btn-primary { background: #0a0a0a; color: #fff; }
      .ex-btn-primary:hover:not(:disabled) { opacity: .88; }
      .ex-btn-primary:disabled { opacity: .45; cursor: not-allowed; }
      .ex-btn-outline { background: #fff; color: #0a0a0a; }
      .ex-btn-outline:hover { background: #f5f5f5; }
      .ex-btn-icon {
        width: 36px; height: 36px; border-radius: 7px; border: 1px solid #dcdcdc; background: #fff;
        color: #0a0a0a; display: flex; align-items: center; justify-content: center; cursor: pointer; flex-shrink: 0;
        transition: background .12s ease, border-color .12s ease;
      }
      .ex-btn-icon:hover { background: #0a0a0a; color: #fff; border-color: #0a0a0a; }
      .ex-spin {
        width: 13px; height: 13px; border: 2px solid rgba(255,255,255,.4); border-top-color: #fff;
        border-radius: 50%; animation: ex-spin .65s linear infinite;
      }
      .ex-spin.dark { border: 2px solid #ddd; border-top-color: #0a0a0a; }
      @keyframes ex-spin { to { transform: rotate(360deg); } }

      /* modal */
      .ex-modal-backdrop {
        position: fixed; inset: 0; background: rgba(10,10,10,0.5); z-index: 200;
        display: flex; align-items: center; justify-content: center; padding: 16px;
      }
      .ex-modal {
        background: #fff; border-radius: 12px; width: 100%; max-width: 460px;
        box-shadow: 0 24px 60px -20px rgba(0,0,0,0.4); max-height: 88vh; display: flex; flex-direction: column; overflow: hidden;
      }
      .ex-modal.wide { max-width: 560px; }
      .ex-modal-head {
        display: flex; align-items: center; justify-content: space-between; padding: 16px 20px;
        border-bottom: 1px solid #f0f0f0; flex-shrink: 0;
      }
      .ex-modal-head h3 { margin: 0; font-size: 14.5px; font-weight: 700; }
      .ex-modal-close {
        width: 26px; height: 26px; border-radius: 6px; border: none; background: transparent;
        color: #999; cursor: pointer; display: flex; align-items: center; justify-content: center; font-size: 16px;
      }
      .ex-modal-close:hover { background: #f4f4f4; color: #0a0a0a; }
      .ex-modal-body { padding: 20px; overflow-y: auto; }
      .ex-modal-foot { padding: 14px 20px; border-top: 1px solid #f0f0f0; display: flex; justify-content: flex-end; gap: 8px; flex-shrink: 0; }

      /* role manage modal */
      .ex-role-row {
        display: flex; align-items: center; gap: 8px; padding: 8px 10px; border: 1px solid #eee;
        border-radius: 7px; margin-bottom: 6px; background: #fff;
      }
      .ex-role-row.editing { border-color: #0a0a0a; background: #fafafa; }
      .ex-role-name { flex: 1; font-size: 13px; }
      .ex-role-list { max-height: 220px; overflow-y: auto; margin-bottom: 14px; }
      .ex-role-empty { font-size: 12.5px; color: #aaa; text-align: center; padding: 18px 0; }
      .ex-divider { border-top: 1px solid #f0f0f0; margin: 14px 0; }

      /* success modal */
      .ex-success-icon {
        width: 46px; height: 46px; border-radius: 50%; background: #0a0a0a; color: #fff;
        display: flex; align-items: center; justify-content: center; font-size: 20px; margin: 0 auto 14px;
      }

      /* select trigger (custom, matches input) */
      .ex-select-trigger {
        display: flex; align-items: center; justify-content: space-between; cursor: pointer;
      }
      .ex-select-trigger.disabled { cursor: not-allowed; }
      .ex-select-placeholder { color: #bbb; }

      /* table */
      .ex-toolbar { display: flex; flex-wrap: wrap; gap: 10px; justify-content: space-between; margin-bottom: 16px; }
      .ex-table-scroll { overflow: auto; max-height: 64vh; }
      table.ex-table { border-collapse: collapse; width: 100%; min-width: 760px; }
      .ex-table thead th {
        position: sticky; top: 0; background: #fafafa; text-align: left; font-size: 11px; font-weight: 700;
        text-transform: uppercase; letter-spacing: .04em; color: #999; padding: 11px 16px; border-bottom: 1px solid #eee; white-space: nowrap;
      }
      .ex-table tbody td { padding: 12px 16px; font-size: 13px; border-bottom: 1px solid #f4f4f4; white-space: nowrap; }
      .ex-table tbody tr:hover { background: #fafafa; }
      .ex-table tbody tr:last-child td { border-bottom: none; }

      .ex-badge { display: inline-flex; align-items: center; padding: 3px 10px; border-radius: 999px; font-size: 10.5px; font-weight: 700; letter-spacing: .02em; border: 1px solid; cursor: pointer; }
      .ex-badge.active { background: #0a0a0a; color: #fff; border-color: #0a0a0a; }
      .ex-badge.inactive { background: #fff; color: #999; border-color: #ddd; }

      .ex-actions { display: flex; gap: 6px; }
    `}</style>
  );
}

export default EmployeeTheme;