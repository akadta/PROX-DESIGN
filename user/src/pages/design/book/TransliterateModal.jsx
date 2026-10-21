import { useState, useRef, useEffect } from "react";
import api from "../../../api/Axios";

const LANGUAGES = [
  "Malayalam",
  "English",
  "Hindi",
  "Tamil",
  "Telugu",
  "Kannada",
  "Arabic",
  "French",
  "Spanish",
  "German",
  "Chinese",
  "Japanese",
  "Russian",
];
// Free, no-key endpoints
const INPUT_TOOLS_URL = "https://inputtools.google.com/request";
const TRANSLATE_URL = "https://translate.googleapis.com/translate_a/single";
const MYMEMORY_URL = "https://api.mymemory.translated.net/get";

// ---- Manglish -> Malayalam, word by word, via Google Input Tools ----
async function transliterateWord(word) {
  if (!word.trim()) return word;
  try {
    const res = await fetch(
      `${INPUT_TOOLS_URL}?text=${encodeURIComponent(word)}&itc=ml-t-i0-und&num=1&ie=utf-8&oe=utf-8`,
    );
    const data = await res.json();
    // data = ["SUCCESS", [[word, [suggestion1, suggestion2...]]]]
    if (data[0] === "SUCCESS" && data[1]?.[0]?.[1]?.[0]) {
      return data[1][0][1][0];
    }
    return word;
  } catch (err) {
    console.error("Transliteration failed for word:", word, err);
    return word;
  }
}

async function transliterateSentence(text) {
  // Preserve spacing/punctuation — only transliterate word tokens
  const tokens = text.split(/(\s+)/);
  const results = await Promise.all(
    tokens.map((tok) => (/^\s+$/.test(tok) || !tok ? tok : transliterateWord(tok))),
  );
  return results.join("");
}

// ---- Any language -> Malayalam, via Google's free translate endpoint,
// falling back to MyMemory if that fails ----
async function translateGoogle(text) {
  const res = await fetch(
    `${TRANSLATE_URL}?client=gtx&sl=auto&tl=ml&dt=t&q=${encodeURIComponent(text)}`,
  );
  if (!res.ok) throw new Error("Google translate endpoint failed");
  const data = await res.json();
  // data[0] is an array of [translatedChunk, originalChunk, ...]
  return data[0].map((chunk) => chunk[0]).join("");
}

async function translateMyMemory(text) {
  const res = await fetch(
    `${MYMEMORY_URL}?q=${encodeURIComponent(text)}&langpair=auto|ml`,
  );
  if (!res.ok) throw new Error("MyMemory endpoint failed");
  const data = await res.json();
  if (!data?.responseData?.translatedText) throw new Error("MyMemory empty response");
  return data.responseData.translatedText;
}

async function translateToMalayalam(text) {
  try {
    return await translateGoogle(text);
  } catch (err) {
    console.warn("Google translate failed, falling back to MyMemory:", err);
    return await translateMyMemory(text);
  }
}

// AI-powered translation to any language via Groq (backend /ai/translate)
async function translateWithAI(text, targetLanguage) {
  const { data } = await api.post("/ai/translate", { text, targetLanguage });
  return data.text || "";
}

export default function TransliterateModal({ onInsert, onUpdate, hasSelection, onClose, initialText = "", initialMode = "translate" }) {
      const [mode, setMode] = useState(initialMode); // "manglish" | "translate"
  const [input, setInput] = useState(initialText);
  const [targetLanguage, setTargetLanguage] = useState("Malayalam");
  const [output, setOutput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const debounceRef = useRef(null);

  useEffect(() => {
    clearTimeout(debounceRef.current);
    setError(null);
    if (!input.trim()) {
      setOutput("");
      return;
    }
   debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        let result;
        if (mode === "manglish") {
          result = await transliterateSentence(input);
        } else if (targetLanguage === "Malayalam") {
          result = await translateToMalayalam(input);
        } else {
          result = await translateWithAI(input, targetLanguage);
        }
        setOutput(result);
      } catch (err) {
        console.error(err);
        setError("Couldn't reach the translation service. Please try again.");
      } finally {
        setLoading(false);
      }
    }, 400);
    return () => clearTimeout(debounceRef.current);
  }, [input, mode, targetLanguage]);

  const handleInsert = () => {
    if (!output.trim()) return;
    onInsert(output);
    onClose();
  };

  return (
    <div
      className="modal show d-block"
      style={{ backgroundColor: "rgba(0,0,0,0.4)" }}
    >
      <div className="modal-dialog modal-dialog-centered modal-lg">
        <div className="modal-content rounded-4">
          <div className="modal-header border-0">
<h5 className="modal-title fw-bold">Translate / Transliterate Text</h5>
            <button className="btn-close" onClick={onClose}></button>
          </div>

          <div className="modal-body">
            <div className="d-flex gap-2 mb-3">
              <button
                type="button"
                className={`btn btn-sm flex-fill ${mode === "manglish" ? "btn-dark" : "btn-outline-secondary"}`}
                onClick={() => {
                  setMode("manglish");
                  setOutput("");
                }}
              >
                Manglish → Malayalam
              </button>
           <button
                type="button"
                className={`btn btn-sm flex-fill ${mode === "translate" ? "btn-dark" : "btn-outline-secondary"}`}
                onClick={() => {
                  setMode("translate");
                  setOutput("");
                }}
              >
                Translate
              </button>
            </div>

           {mode === "translate" && (
              <>
                <label className="form-label small mb-1">Translate to</label>
                <select
                  className="form-select form-select-sm mb-2"
                  value={targetLanguage}
                  onChange={(e) => setTargetLanguage(e.target.value)}
                >
                  {LANGUAGES.map((l) => (
                    <option key={l} value={l}>{l}</option>
                  ))}
                </select>
              </>
            )}
            <label className="form-label small mb-1">
              {mode === "manglish" ? "Type in Manglish (e.g. sukham, ente veedu)" : "Type in any language"}
            </label>
            <textarea
              className="form-control mb-2"
              rows={3}
              autoFocus
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={mode === "manglish" ? "eg: ninak sugamano" : "eg: how are you"}
            />

<label className="form-label small mb-1">
              {mode === "manglish" ? "Malayalam Preview" : `${targetLanguage} Preview`}
            </label>            <div
              className="form-control mb-1"
              style={{ minHeight: 80, fontSize: 20, background: "#f8f9fa" }}
            >
              {loading ? (
                <span className="text-muted small">Working...</span>
              ) : (
                output || <span className="text-muted small">Preview will appear here</span>
              )}
            </div>
            {error && <p className="small text-danger mb-1">{error}</p>}
            <p className="small text-muted mb-0">
              You can edit the Malayalam preview after inserting it, from the text panel on the canvas.
            </p>
          </div>

         <div className="modal-footer border-0">
  <button className="btn btn-outline-secondary" onClick={onClose}>
    Cancel
  </button>
  {hasSelection && (
    <button
      className="btn btn-outline-dark"
      disabled={!output.trim() || loading}
      onClick={() => {
        onUpdate(output);
        onClose();
      }}
    >
      Update Selected Text
    </button>
  )}
  <button
    className="btn btn-dark"
    disabled={!output.trim() || loading}
    onClick={handleInsert}
  >
    Insert as New
  </button>
</div>
        </div>
      </div>
    </div>
  );
}