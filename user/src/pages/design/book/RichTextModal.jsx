import { useRef, useState, useEffect } from "react";
import { htmlToSegments } from "./richText";

function segmentsToHtml(segments, fallbackText) {
  const list =
    segments && segments.length
      ? segments
      : [{ text: fallbackText || "", bold: false, italic: false, underline: false, highlight: null, color: null, script: null }];
  return list
    .map((s) => {
      let html = s.text.replace(/\n/g, "<br/>").replace(/</g, "&lt;");
      if (s.script === "super") html = `<sup>${html}</sup>`;
      if (s.script === "sub") html = `<sub>${html}</sub>`;
      if (s.italic) html = `<i>${html}</i>`;
      if (s.bold) html = `<b>${html}</b>`;
      if (s.underline) html = `<u>${html}</u>`;
      const styles = [];
      if (s.color) styles.push(`color:${s.color}`);
      if (s.highlight) styles.push(`background-color:${s.highlight}`);
      if (styles.length) html = `<span style="${styles.join(";")}">${html}</span>`;
      return html;
    })
    .join("");
}

// rgb(r, g, b) / rgba(...) -> #rrggbb ; passes through if already hex
function rgbToHex(rgb) {
  if (!rgb) return null;
  if (rgb.startsWith("#")) return rgb.length === 7 ? rgb : null;
  const m = rgb.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
  if (!m) return null;
  const toHex = (n) => Number(n).toString(16).padStart(2, "0");
  return `#${toHex(m[1])}${toHex(m[2])}${toHex(m[3])}`;
}

export default function RichTextModal({ shape, onSave, onClose }) {
  const editorRef = useRef(null);
  const savedRange = useRef(null);
  const [color, setColor] = useState(shape.fill || "#111111");
  const [highlight, setHighlight] = useState("#fff59d");

useEffect(() => {
    if (editorRef.current) {
      editorRef.current.innerHTML = segmentsToHtml(shape.segments, shape.text);
      editorRef.current.focus();
      document.execCommand("styleWithCSS", false, true);
    }
  }, []);

  useEffect(() => {
    const handler = () => {
      const sel = window.getSelection();
      if (!sel.rangeCount) return;
      const range = sel.getRangeAt(0);
      if (!editorRef.current || !editorRef.current.contains(range.commonAncestorContainer)) return;

      savedRange.current = range.cloneRange();

      try {
        const fc = rgbToHex(document.queryCommandValue("foreColor"));
        if (fc) setColor(fc);
      } catch {}
      try {
        const bg =
          rgbToHex(document.queryCommandValue("hiliteColor")) ||
          rgbToHex(document.queryCommandValue("backColor"));
        if (bg && bg !== "#ffffff") setHighlight(bg);
      } catch {}
    };
    document.addEventListener("selectionchange", handler);
    return () => document.removeEventListener("selectionchange", handler);
  }, []);

 
  const restoreSelection = () => {
    const sel = window.getSelection();
    sel.removeAllRanges();
    if (savedRange.current) sel.addRange(savedRange.current);
  };

  const applyBold = (e) => { e.preventDefault(); document.execCommand("bold"); };
  const applyItalic = (e) => { e.preventDefault(); document.execCommand("italic"); };
  const applyUnderline = (e) => { e.preventDefault(); document.execCommand("underline"); };
  const applySuper = (e) => { e.preventDefault(); document.execCommand("superscript"); };
  const applySub = (e) => { e.preventDefault(); document.execCommand("subscript"); };

  const applyColor = (e) => {
    const val = e.target.value;
    setColor(val);
    editorRef.current.focus();
    restoreSelection();
    document.execCommand("foreColor", false, val);
  };

  const applyHighlight = (e) => {
    const val = e.target.value;
    setHighlight(val);
    editorRef.current.focus();
    restoreSelection();
    // hiliteColor is the standard command; backColor is the Firefox/legacy fallback
    if (!document.execCommand("hiliteColor", false, val)) {
      document.execCommand("backColor", false, val);
    }
  };

  const clearHighlight = (e) => {
    e.preventDefault();
    editorRef.current.focus();
    restoreSelection();
    if (!document.execCommand("hiliteColor", false, "transparent")) {
      document.execCommand("backColor", false, "transparent");
    }
  };
  const handleSave = () => {
    const segments = htmlToSegments(editorRef.current);
    onSave(segments);
    onClose();
  };

  return (
    <div className="modal show d-block" style={{ backgroundColor: "rgba(0,0,0,0.4)" }}>
      <div className="modal-dialog modal-dialog-centered">
        <div className="modal-content rounded-4">
          <div className="modal-header border-0">
            <h5 className="modal-title fw-bold">Edit Text</h5>
            <button className="btn-close" onClick={onClose}></button>
          </div>
          <div className="modal-body">
           <div className="d-flex align-items-center gap-2 mb-2 flex-wrap">
              <button type="button" className="btn btn-sm btn-outline-dark fw-bold" onMouseDown={applyBold} title="Bold">B</button>
              <button type="button" className="btn btn-sm btn-outline-dark fst-italic" onMouseDown={applyItalic} title="Italic">I</button>
              <button type="button" className="btn btn-sm btn-outline-dark text-decoration-underline" onMouseDown={applyUnderline} title="Underline">U</button>
              <button type="button" className="btn btn-sm btn-outline-dark" onMouseDown={applySuper} title="Superscript">X<sup>2</sup></button>
              <button type="button" className="btn btn-sm btn-outline-dark" onMouseDown={applySub} title="Subscript">X<sub>2</sub></button>
              <div className="d-flex align-items-center gap-1">
                <span className="small text-muted">Text</span>
                <input type="color" className="form-control form-control-color" value={color} onChange={applyColor} title="Text color" />
              </div>
              <div className="d-flex align-items-center gap-1">
                <span className="small text-muted">Highlight</span>
                <input type="color" className="form-control form-control-color" value={highlight} onChange={applyHighlight} title="Highlight color" />
                <button type="button" className="btn btn-sm btn-outline-secondary py-0" onClick={clearHighlight} title="Remove highlight">None</button>
              </div>
            </div>
            <p className="small text-muted mb-2">Select a word first, then click a style.</p>
         <div
              ref={editorRef}
              contentEditable
              suppressContentEditableWarning
              className="form-control"
              style={{ minHeight: 120, fontSize: 18, whiteSpace: "pre-wrap" }}
            />
          </div>
          <div className="modal-footer border-0">
            <button className="btn btn-outline-secondary" onClick={onClose}>Cancel</button>
            <button className="btn btn-dark" onClick={handleSave}>Save</button>
          </div>
        </div>
      </div>
    </div>
  );
}