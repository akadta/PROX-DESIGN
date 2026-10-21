// src/pages/design/book/PublishModal.jsx
import { useState } from "react";
import api from "../../../api/Axios";

const FLIP_STYLES = [
  { value: "realistic", label: "Realistic Page Flip" },
  { value: "fade", label: "Fade Transition" },
  { value: "slide", label: "Slide" },
];

const PAGE_LAYOUTS = [
  { value: "duplex", label: "Double-sided (each page has a front & back)" },
  { value: "simplex", label: "Single-sided (back of every page left blank)" },
];

export default function PublishModal({ book, onClose, onPublished }) {
  const [flipStyle, setFlipStyle] = useState(book.flipStyle || "realistic");
  const [pageLayout, setPageLayout] = useState(book.pageLayout || "duplex");
  const [loading, setLoading] = useState(false);

  const handlePublish = async () => {
    setLoading(true);
    try {
      const { data } = await api.post(`/books/${book.id}/publish`, {
        flipStyle,
        pageLayout,
      });
      onPublished(data);
    } catch (err) {
      console.error(err);
      alert("Failed to publish");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="modal show d-block"
      tabIndex="-1"
      style={{ backgroundColor: "rgba(0,0,0,0.4)" }}
    >
      <div className="modal-dialog modal-dialog-centered">
        <div className="modal-content rounded-4">
          <div className="modal-header border-0">
            <h5 className="modal-title fw-bold">Publish "{book.title}"</h5>
            <button
              type="button"
              className="btn-close"
              onClick={onClose}
            ></button>
          </div>
          <div className="modal-body">
            <p className="text-muted small mb-2">
              Choose how readers will flip through the book.
            </p>
            {FLIP_STYLES.map((s) => (
              <label
                key={s.value}
                className={`d-flex align-items-center gap-2 border rounded-3 px-3 py-2 mb-2 ${
                  flipStyle === s.value ? "border-dark bg-light" : ""
                }`}
                style={{ cursor: "pointer" }}
              >
                <input
                  type="radio"
                  className="form-check-input mt-0"
                  name="flipStyle"
                  value={s.value}
                  checked={flipStyle === s.value}
                  onChange={() => setFlipStyle(s.value)}
                />
                <span className="small">{s.label}</span>
              </label>
            ))}

            <p className="text-muted small mb-2 mt-3">
              Choose the page layout.
            </p>
            {PAGE_LAYOUTS.map((s) => (
              <label
                key={s.value}
                className={`d-flex align-items-center gap-2 border rounded-3 px-3 py-2 mb-2 ${
                  pageLayout === s.value ? "border-dark bg-light" : ""
                }`}
                style={{ cursor: "pointer" }}
              >
                <input
                  type="radio"
                  className="form-check-input mt-0"
                  name="pageLayout"
                  value={s.value}
                  checked={pageLayout === s.value}
                  onChange={() => setPageLayout(s.value)}
                />
                <span className="small">{s.label}</span>
              </label>
            ))}
          </div>
          <div className="modal-footer border-0">
            <button onClick={onClose} className="btn btn-outline-secondary">
              Cancel
            </button>
            <button
              onClick={handlePublish}
              disabled={loading}
              className="btn btn-dark"
            >
              {loading ? "Publishing..." : "Publish"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
