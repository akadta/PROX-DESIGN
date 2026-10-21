import { useEffect } from "react";
import Icon from "./Icon";

function Modal({ open, onClose, title, children, footer, width = 460 }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === "Escape") onClose?.();
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="um-modal-backdrop" onMouseDown={onClose}>
      <div
        className="um-modal"
        style={{ maxWidth: width }}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="um-modal-head">
          <h3>{title}</h3>
          <button className="um-icon-btn" onClick={onClose}>
            <Icon name="close" size={16} />
          </button>
        </div>
        <div className="um-modal-body">{children}</div>
        {footer && <div className="um-modal-foot">{footer}</div>}
      </div>
    </div>
  );
}

export default Modal;