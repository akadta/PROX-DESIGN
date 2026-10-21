// src/pages/design/book/pageNumber.js
export function resolvePageNumberStyle(book, page) {
  const override = page?.background?.pageNumber;
  if (override?.mode === "hidden") return null;
  if (override?.mode === "custom") return override;
  const def = book.pageNumberDefault;
  if (!def || !def.enabled) return null;
  return def;
}

export function pageNumberPosition(position, w, h, margin = 24) {
  const styles = {
    "top-left": { top: margin, left: margin },
    "top-center": { top: margin, left: "50%", transform: "translateX(-50%)" },
    "top-right": { top: margin, right: margin },
    "bottom-left": { bottom: margin, left: margin },
    "bottom-center": { bottom: margin, left: "50%", transform: "translateX(-50%)" },
    "bottom-right": { bottom: margin, right: margin },
  };
  return styles[position] || styles["bottom-center"];
}

export function formatPageNumber(format, n, total) {
  return (format || "{n}").replace("{n}", n).replace("{total}", total);
}