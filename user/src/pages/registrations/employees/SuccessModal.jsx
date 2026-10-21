import Portal from "../../../components/Portal";

export default function SuccessModal({ type = "success", message, onClose }) {
  return (
    <Portal>
      <div className="ex-modal-backdrop" onClick={(e) => e.stopPropagation()}>
        <div className="ex-modal" style={{ maxWidth: 380 }}>
          <div className="ex-modal-body" style={{ textAlign: "center", paddingTop: 28 }}>
            <div className="ex-success-icon">{type === "success" ? "✓" : "!"}</div>
            <h3 style={{ margin: "0 0 6px", fontSize: 14.5, fontWeight: 700 }}>
              {type === "success" ? "Success" : "Something went wrong"}
            </h3>
            <p style={{ margin: 0, fontSize: 12.8, color: "#777" }}>{message}</p>
          </div>
          <div className="ex-modal-foot" style={{ justifyContent: "center" }}>
            <button type="button" className="ex-btn ex-btn-primary" style={{ minWidth: 100 }} onClick={onClose}>
              OK
            </button>
          </div>
        </div>
      </div>
    </Portal>
  );
}