// src/pages/design/book/AIPanel.jsx
import { useState } from "react";
import api from "../../../api/Axios";

const LANGUAGES = [
  "English",
  "Malayalam",
  "Hindi",
  "Tamil",
  "Arabic",
  "French",
  "Spanish",
];

export default function AIPanel({
  bookId,
  elements,
  onInsertText,      // (text) => void   e.g. addMalayalamTextValue / addText-with-value
  onApplyAction,      // (action) => void  handles update/delete/add from /ai/command
  onBookGenerated,    // () => void  called after a full-book generation succeeds (reload the book)
  onClose,
}) {
  const [mode, setMode] = useState("generate"); // "generate" | "command" | "fullbook"

  // --- full-book generation state ---
  const [bookTopic, setBookTopic] = useState("");
  const [bookPageCount, setBookPageCount] = useState(5);
  const [bookLanguage, setBookLanguage] = useState("English");
  const [bookLoading, setBookLoading] = useState(false);
  const [bookError, setBookError] = useState(null);
  const [bookDone, setBookDone] = useState(false);

  // --- generate mode state ---
  const [topic, setTopic] = useState("");
  const [language, setLanguage] = useState("English");
  const [tone, setTone] = useState("neutral");
  const [length, setLength] = useState("short");
  const [genOutput, setGenOutput] = useState("");
  const [genLoading, setGenLoading] = useState(false);
  const [genError, setGenError] = useState(null);

  // --- command mode state ---
  const [instruction, setInstruction] = useState("");
  const [cmdLoading, setCmdLoading] = useState(false);
  const [cmdError, setCmdError] = useState(null);
  const [lastAction, setLastAction] = useState(null);

  const runGenerate = async () => {
    if (!topic.trim()) return;
    setGenLoading(true);
    setGenError(null);
    setGenOutput("");
    try {
      const { data } = await api.post("/ai/generate", { topic, language, tone, length });
      setGenOutput(data.text || "");
    } catch (err) {
      console.error(err);
      setGenError(
        err.response?.data?.error || "Couldn't reach the AI service. Please try again.",
      );
    } finally {
      setGenLoading(false);
    }
  };

  const insertGenerated = () => {
    if (!genOutput.trim()) return;
    onInsertText(genOutput.trim());
    onClose();
  };

  const runCommand = async () => {
    if (!instruction.trim()) return;
    setCmdLoading(true);
    setCmdError(null);
    setLastAction(null);
    try {
      const { data } = await api.post("/ai/command", { instruction, elements });
      setLastAction(data);
      if (data.action === "none") {
        setCmdError(data.reason || "Couldn't confidently map that instruction to an action.");
      } else {
        onApplyAction(data);
      }
    } catch (err) {
      console.error(err);
      setCmdError(
        err.response?.data?.error || "Couldn't reach the AI service. Please try again.",
      );
    } finally {
      setCmdLoading(false);
    }
  };

  const runFullBookGeneration = async () => {
    if (!bookTopic.trim()) return;
    setBookLoading(true);
    setBookError(null);
    setBookDone(false);
    try {
      await api.post(`/ai/generate-book/${bookId}`, {
        topic: bookTopic,
        pageCount: bookPageCount,
        language: bookLanguage,
      });
      setBookDone(true);
      onBookGenerated?.();
    } catch (err) {
      console.error(err);
      setBookError(
        err.response?.data?.error ||
          "Couldn't generate the book. This can take 30-60s for several pages - try again if it timed out.",
      );
    } finally {
      setBookLoading(false);
    }
  };

  return (
    <div className="modal show d-block" style={{ backgroundColor: "rgba(0,0,0,0.4)" }}>
      <div className="modal-dialog modal-dialog-centered modal-lg">
        <div className="modal-content rounded-4">
          <div className="modal-header border-0">
            <h5 className="modal-title fw-bold">AI Assistant</h5>
            <button className="btn-close" onClick={onClose}></button>
          </div>

          <div className="modal-body">
            <div className="d-flex gap-2 mb-3">
              <button
                type="button"
                className={`btn btn-sm flex-fill ${mode === "generate" ? "btn-dark" : "btn-outline-secondary"}`}
                onClick={() => setMode("generate")}
              >
                Generate Content
              </button>
              <button
                type="button"
                className={`btn btn-sm flex-fill ${mode === "command" ? "btn-dark" : "btn-outline-secondary"}`}
                onClick={() => setMode("command")}
              >
                Edit / Delete / Add via Command
              </button>
              {/* <button
                type="button"
                className={`btn btn-sm flex-fill ${mode === "fullbook" ? "btn-dark" : "btn-outline-secondary"}`}
                onClick={() => setMode("fullbook")}
              >
                Generate Full Book
              </button> */}
            </div>

            {mode === "generate" && (
              <>
                <label className="form-label small mb-1">Topic</label>
                <input
                  type="text"
                  className="form-control mb-2"
                  placeholder="e.g. football, my hometown, a birthday message"
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                />

                <div className="row g-2 mb-2">
                  <div className="col-4">
                    <label className="form-label small mb-1">Language</label>
                    <select
                      className="form-select form-select-sm"
                      value={language}
                      onChange={(e) => setLanguage(e.target.value)}
                    >
                      {LANGUAGES.map((l) => (
                        <option key={l} value={l}>{l}</option>
                      ))}
                    </select>
                  </div>
                  <div className="col-4">
                    <label className="form-label small mb-1">Tone</label>
                    <select
                      className="form-select form-select-sm"
                      value={tone}
                      onChange={(e) => setTone(e.target.value)}
                    >
                      <option value="neutral">Neutral</option>
                      <option value="friendly">Friendly</option>
                      <option value="formal">Formal</option>
                      <option value="playful">Playful</option>
                      <option value="poetic">Poetic</option>
                    </select>
                  </div>
                  <div className="col-4">
                    <label className="form-label small mb-1">Length</label>
                    <select
                      className="form-select form-select-sm"
                      value={length}
                      onChange={(e) => setLength(e.target.value)}
                    >
                      <option value="short">Short</option>
                      <option value="medium">Medium</option>
                      <option value="long">Long</option>
                    </select>
                  </div>
                </div>

                <button
                  className="btn btn-sm btn-outline-dark w-100 mb-2"
                  disabled={genLoading || !topic.trim()}
                  onClick={runGenerate}
                >
                  {genLoading ? "Generating..." : "Generate"}
                </button>

                {genError && <p className="small text-danger mb-2">{genError}</p>}

                <label className="form-label small mb-1">Preview</label>
                <div
                  className="form-control mb-2"
                  style={{ minHeight: 100, background: "#f8f9fa", whiteSpace: "pre-wrap" }}
                >
                  {genLoading ? (
                    <span className="text-muted small">Working...</span>
                  ) : (
                    genOutput || <span className="text-muted small">Generated text will appear here</span>
                  )}
                </div>
              </>
            )}

            {mode === "command" && (
              <>
                <label className="form-label small mb-1">
                  Tell the AI what to do (any language)
                </label>
                <textarea
                  className="form-control mb-2"
                  rows={3}
                  placeholder="e.g. 'make the title bigger', 'delete the circle', 'hide the second image'"
                  value={instruction}
                  onChange={(e) => setInstruction(e.target.value)}
                />
                <button
                  className="btn btn-sm btn-outline-dark w-100 mb-2"
                  disabled={cmdLoading || !instruction.trim()}
                  onClick={runCommand}
                >
                  {cmdLoading ? "Thinking..." : "Run"}
                </button>
                {cmdError && <p className="small text-danger mb-2">{cmdError}</p>}
                {lastAction && lastAction.action !== "none" && (
                  <p className="small text-success mb-0">
                    Done: {lastAction.action} {lastAction.reason ? `— ${lastAction.reason}` : ""}
                  </p>
                )}
                <p className="small text-muted mt-2 mb-0">
                  The AI only sees element positions/types/text, not full image data. It picks
                  one action per command - for multiple changes, run it a few times.
                </p>
              </>
            )}

            {mode === "fullbook" && (
              <>
                <p className="small text-muted mb-2">
                  Generates a cover photo and full pages (text + illustration) sized exactly
                  to this book's dimensions, and adds them as new pages. You can then edit
                  everything normally in the canvas.
                </p>
                <label className="form-label small mb-1">Book topic / theme</label>
                <input
                  type="text"
                  className="form-control mb-2"
                  placeholder="e.g. a story about football, my trip to Kerala, a recipe book"
                  value={bookTopic}
                  onChange={(e) => setBookTopic(e.target.value)}
                />
                <div className="row g-2 mb-2">
                  <div className="col-6">
                    <label className="form-label small mb-1">Number of pages</label>
                    <input
                      type="number"
                      min="1"
                      max="20"
                      className="form-control form-control-sm"
                      value={bookPageCount}
                      onChange={(e) => setBookPageCount(Number(e.target.value))}
                    />
                  </div>
                  <div className="col-6">
                    <label className="form-label small mb-1">Text language</label>
                    <select
                      className="form-select form-select-sm"
                      value={bookLanguage}
                      onChange={(e) => setBookLanguage(e.target.value)}
                    >
                      {LANGUAGES.map((l) => (
                        <option key={l} value={l}>{l}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <button
                  className="btn btn-sm btn-outline-dark w-100 mb-2"
                  disabled={bookLoading || !bookTopic.trim()}
                  onClick={runFullBookGeneration}
                >
                  {bookLoading ? "Generating book (this can take a minute)..." : "Generate Full Book"}
                </button>
                {bookError && <p className="small text-danger mb-0">{bookError}</p>}
                {bookDone && (
                  <p className="small text-success mb-0">
                    Book generated - new pages and cover added. Close this panel to see them.
                  </p>
                )}
              </>
            )}
          </div>

          <div className="modal-footer border-0">
            <button className="btn btn-outline-secondary" onClick={onClose}>
              Close
            </button>
            {mode === "generate" && (
              <button
                className="btn btn-dark"
                disabled={!genOutput.trim()}
                onClick={insertGenerated}
              >
                Insert as Text
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}