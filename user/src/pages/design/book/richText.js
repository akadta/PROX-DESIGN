// src/pages/design/book/richText.js
// Measures/lays out mixed bold+italic+underline+highlight+color+super/sub
// text into positioned word tokens, since Konva's <Text> can't do per-word
// styling natively.

let _ctx;
function measureCtx() {
  if (!_ctx) _ctx = document.createElement("canvas").getContext("2d");
  return _ctx;
}

function fontString(bold, italic, fontSize, fontFamily) {
  return `${italic ? "italic " : ""}${bold ? "bold " : ""}${fontSize}px ${fontFamily}`;
}

function measureWord(word, bold, italic, fontSize, fontFamily) {
  const ctx = measureCtx();
  ctx.font = fontString(bold, italic, fontSize, fontFamily);
  return ctx.measureText(word).width;
}

// script sizing/offset relative to the line's base font size
const SCRIPT_SCALE = 0.65;
const SUPER_OFFSET = -0.3; // * baseFontSize, negative = up
const SUB_OFFSET = 0.15; // * baseFontSize, positive = down

// segments: [{ text, bold, italic, underline, highlight, color, script }]
// wordSpacing: extra px inserted after each space, shape-level setting
export function layoutSegments(
  segments,
  maxWidth,
  baseFontSize,
  fontFamily,
  align = "left",
  wordSpacing = 0,
) {
  const tokens = [];
  (segments || []).forEach((seg) => {
    seg.text.split(/(\n|\s+)/).forEach((p) => {
      if (p === "") return;
      const isScript = seg.script === "super" || seg.script === "sub";
      tokens.push({
        text: p,
        isBreak: p === "\n",
        isSpace: /^\s+$/.test(p) && p !== "\n",
        bold: !!seg.bold,
        italic: !!seg.italic,
        underline: !!seg.underline,
        highlight: seg.highlight || null,
        color: seg.color || null,
        script: seg.script || null,
        fontSize: isScript ? Math.round(baseFontSize * SCRIPT_SCALE) : baseFontSize,
        yOffset:
          seg.script === "super"
            ? baseFontSize * SUPER_OFFSET
            : seg.script === "sub"
              ? baseFontSize * SUB_OFFSET
              : 0,
      });
    });
  });

  const lines = [];
  let current = [];
  let currentWidth = 0;

  const pushLine = () => {
    lines.push({ tokens: current, width: currentWidth });
    current = [];
    currentWidth = 0;
  };

  tokens.forEach((tok) => {
    if (tok.isBreak) {
      pushLine();
      return;
    }
    let w = measureWord(tok.text, tok.bold, tok.italic, tok.fontSize, fontFamily);
    if (tok.isSpace) w += wordSpacing;
    if (!tok.isSpace && currentWidth + w > maxWidth && current.length) pushLine();
    current.push({ ...tok, width: w });
    currentWidth += w;
  });
  if (current.length || lines.length === 0) pushLine();

  const lineHeight = baseFontSize * 1.35;
  const positioned = [];
  let y = 0;
  let maxLineWidth = 0;

  lines.forEach((line) => {
    let x = 0;
    if (align === "center") x = Math.max(0, (maxWidth - line.width) / 2);
    if (align === "right") x = Math.max(0, maxWidth - line.width);
    line.tokens.forEach((tok) => {
      if (!tok.isSpace) positioned.push({ ...tok, x, y: y + tok.yOffset });
      x += tok.width;
    });
    maxLineWidth = Math.max(maxLineWidth, line.width);
    y += lineHeight;
  });

  return {
    positioned,
    width: align === "left" ? Math.min(maxWidth, maxLineWidth) : maxWidth,
    height: Math.max(y, lineHeight),
  };
}

// Walks the modal's contentEditable DOM into a flat segments array.
function walk(node, ctx, out) {
  if (node.nodeType === Node.TEXT_NODE) {
    if (node.textContent) out.push({ text: node.textContent, ...ctx });
    return;
  }
  if (node.nodeType !== Node.ELEMENT_NODE) return;
  const tag = node.tagName;
  if (tag === "BR") {
    out.push({ text: "\n", ...ctx });
    return;
  }
  const next = { ...ctx };
  if (tag === "B" || tag === "STRONG") next.bold = true;
  if (node.style?.fontWeight === "bold" || Number(node.style?.fontWeight) >= 700) next.bold = true;
  if (tag === "I" || tag === "EM") next.italic = true;
  if (node.style?.fontStyle === "italic") next.italic = true;
  if (tag === "U") next.underline = true;
  if (node.style?.textDecorationLine === "underline" || node.style?.textDecoration?.includes("underline"))
    next.underline = true;
  if (tag === "SUP") next.script = "super";
  if (tag === "SUB") next.script = "sub";
  const c = node.getAttribute?.("color") || node.style?.color;
  if (c) next.color = c;
  const hi = node.style?.backgroundColor;
  if (hi && hi !== "transparent") next.highlight = hi;

  node.childNodes.forEach((child) => walk(child, next, out));
  if (tag === "DIV" || tag === "P") out.push({ text: "\n", ...ctx });
}

export function htmlToSegments(containerEl) {
  const out = [];
  walk(
    containerEl,
    { bold: false, italic: false, underline: false, highlight: null, color: null, script: null },
    out,
  );
  while (out.length && out[out.length - 1].text === "\n") out.pop();
  return out;
}

export function segmentsToPlainText(segments) {
  return (segments || []).map((s) => s.text).join("").replace(/\n/g, " ").trim();
}