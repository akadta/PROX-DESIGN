// src/pages/design/book/BookMain.jsx
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../../api/Axios";
import PublishModal from "./PublishModal";

export default function BookMain() {
  const navigate = useNavigate();
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [publishTarget, setPublishTarget] = useState(null);
  const [pdfLoadingId, setPdfLoadingId] = useState(null);

  const loadBooks = () => {
    api
      .get("/books")
      .then(({ data }) => setBooks(data))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadBooks();
  }, []);

  const toggleActive = async (id) => {
    const { data } = await api.patch(`/books/${id}/toggle-active`);
    setBooks((prev) => prev.map((b) => (b.id === id ? data : b)));
  };

  const unpublish = async (id) => {
    const { data } = await api.post(`/books/${id}/unpublish`);
    setBooks((prev) => prev.map((b) => (b.id === id ? data : b)));
  };

  const deleteBook = async (id) => {
    if (!confirm("Delete this book permanently?")) return;
    await api.delete(`/books/${id}`);
    setBooks((prev) => prev.filter((b) => b.id !== id));
  };

  const downloadPdf = async (id, title) => {
    setPdfLoadingId(id);
    try {
      const { data } = await api.get(`/books/${id}/pdf`, {
        responseType: "blob",
      });

      // If the server returned an error, it comes back as a JSON blob
      // (since responseType is "blob") — detect and surface it instead
      // of silently downloading a broken/empty file.
      if (data.type === "application/json") {
        const text = await data.text();
        const parsed = JSON.parse(text);
        throw new Error(parsed.error || "Failed to generate PDF");
      }

      const url = window.URL.createObjectURL(
        new Blob([data], { type: "application/pdf" }),
      );
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `${title}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error("PDF download failed:", err);
      alert("Failed to generate PDF. Please try again.");
    } finally {
      setPdfLoadingId(null);
    }
  };
  if (loading) return <div className="container py-5">Loading...</div>;

  const baseUrl = import.meta.env.VITE_BASE_URL.replace("/api", "");

  return (
    <div className="container py-4 py-md-5">
      {pdfLoadingId && (
        <div
          className="position-fixed top-0 start-0 w-100 h-100 d-flex flex-column align-items-center justify-content-center"
          style={{ backgroundColor: "rgba(0,0,0,0.5)", zIndex: 3000 }}
        >
          <div
            className="spinner-border text-light mb-3"
            style={{ width: 48, height: 48 }}
            role="status"
          ></div>
          <p className="text-white fw-semibold">Generating PDF...</p>
        </div>
      )}
      <div className="d-flex align-items-center justify-content-between mb-4 flex-wrap gap-2">
        <h1 className="fw-bold mb-0">Your Books</h1>
        <button
          onClick={() => navigate("/book/new")}
          className="btn btn-dark px-4"
        >
          + New Book
        </button>
      </div>

      <div className="row g-3 g-md-4">
        {books.map((book) => (
          <div key={book.id} className="col-6 col-sm-4 col-md-3">
            <div className="card h-100 border shadow-sm">
              <div
                onClick={() => navigate(`/book/${book.id}/design`)}
                role="button"
                className="bg-light d-flex align-items-center justify-content-center overflow-hidden"
                style={{ aspectRatio: "3 / 4" }}
              >
                {book.coverImage ? (
                  <img
                    src={`${baseUrl}${book.coverImage}`}
                    alt={book.title}
                    className="w-100 h-100"
                    style={{ objectFit: "cover" }}
                  />
                ) : (
                  <span className="text-muted small">No cover</span>
                )}
              </div>

              <div className="card-body p-2 p-md-3">
                <p className="fw-semibold small text-truncate mb-2">
                  {book.title}
                </p>

                <div className="d-flex align-items-center justify-content-between mb-2">
                  <button
                    onClick={() => toggleActive(book.id)}
                    className={`btn btn-sm rounded-pill ${
                      book.isActive ? "btn-dark" : "btn-outline-secondary"
                    }`}
                  >
                    {book.isActive ? "Active" : "Inactive"}
                  </button>

                  {book.isPublished ? (
                    <button
                      onClick={() => unpublish(book.id)}
                      className="btn btn-sm btn-link text-decoration-underline text-muted p-0"
                    >
                      Unpublish
                    </button>
                  ) : (
                    <button
                      onClick={() => setPublishTarget(book)}
                      className="btn btn-sm btn-link text-decoration-underline p-0"
                    >
                      Publish
                    </button>
                  )}
                </div>

                {book.isPublished && book.publicSlug && (
                  <a
                    href={`/p/${book.publicSlug}`}
                    target="_blank"
                    rel="noreferrer"
                    className="d-block small text-truncate mb-2"
                  >
                    /p/{book.publicSlug}
                  </a>
                )}

                <div className="d-flex align-items-center justify-content-between">
                  <button
                    onClick={() => downloadPdf(book.id, book.title)}
                    className="btn btn-sm btn-outline-secondary"
                    disabled={pdfLoadingId === book.id}
                    style={{ minWidth: 60 }}
                  >
                    {pdfLoadingId === book.id ? (
                      <span
                        className="spinner-border spinner-border-sm"
                        role="status"
                      ></span>
                    ) : (
                      "PDF"
                    )}
                  </button>
                  <button
                    onClick={() => deleteBook(book.id)}
                    className="btn btn-sm btn-outline-danger"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {publishTarget && (
        <PublishModal
          book={publishTarget}
          onClose={() => setPublishTarget(null)}
          onPublished={(updated) => {
            setBooks((prev) =>
              prev.map((b) => (b.id === updated.id ? updated : b)),
            );
            setPublishTarget(null);
          }}
        />
      )}
    </div>
  );
}
