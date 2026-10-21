// src/pages/design/book/BookNew.jsx
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../../api/Axios";

export default function BookNew() {
  const navigate = useNavigate();
  const [title, setTitle] = useState("");
  const [unit, setUnit] = useState("cm");
  const [width, setWidth] = useState("");
  const [height, setHeight] = useState("");
  const [locked, setLocked] = useState(true);
  const [coverFile, setCoverFile] = useState(null);
  const [useCoverForSize, setUseCoverForSize] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const fd = new FormData();
      fd.append("title", title);
      fd.append("locked", locked);
      if (useCoverForSize && coverFile) {
        fd.append("coverFile", coverFile);
      } else {
        fd.append("unit", unit);
        fd.append("width", width);
        fd.append("height", height);
      }
      const { data } = await api.post("/books", fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      navigate(`/book/${data.id}/design`);
    } catch (err) {
      console.error(err);
      alert("Failed to create book");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container py-5" style={{ maxWidth: "560px" }}>
      <h1 className="fw-bold mb-4">Create New Book</h1>
      <form onSubmit={handleSubmit}>
        <div className="mb-3">
          <label className="form-label">Book Name</label>
          <input
            type="text"
            className="form-control"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
          />
        </div>

        <div className="form-check mb-3">
          <input
            type="checkbox"
            className="form-check-input"
            id="useCoverForSize"
            checked={useCoverForSize}
            onChange={(e) => setUseCoverForSize(e.target.checked)}
          />
          <label className="form-check-label" htmlFor="useCoverForSize">
            Auto-detect size from uploaded cover image
          </label>
        </div>

        {!useCoverForSize && (
          <div className="row g-2 mb-3">
            <div className="col-3">
              <select
                className="form-select"
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
              >
                <option value="cm">cm</option>
                <option value="in">inch</option>
                <option value="px">px</option>
              </select>
            </div>
            <div className="col-4">
              <input
                type="number"
                placeholder="Width"
                className="form-control"
                value={width}
                onChange={(e) => setWidth(e.target.value)}
                required={!useCoverForSize}
              />
            </div>
            <div className="col-5">
              <input
                type="number"
                placeholder="Height"
                className="form-control"
                value={height}
                onChange={(e) => setHeight(e.target.value)}
                required={!useCoverForSize}
              />
            </div>
          </div>
        )}

        <div className="form-check mb-3">
          <input
            type="checkbox"
            className="form-check-input"
            id="lockedRatio"
            checked={locked}
            onChange={(e) => setLocked(e.target.checked)}
          />
          <label className="form-check-label" htmlFor="lockedRatio">
            Lock aspect ratio for all pages
          </label>
        </div>

        <div className="mb-4">
          <label className="form-label d-block">Cover Photo</label>
          <input
            type="file"
            className="form-control"
            accept="image/png,image/jpeg,image/webp"
            onChange={(e) => setCoverFile(e.target.files[0])}
            required={useCoverForSize}
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="btn btn-dark w-100 py-2 fw-medium"
        >
          {loading ? "Creating..." : "Save & Continue to Design"}
        </button>
      </form>
    </div>
  );
}
