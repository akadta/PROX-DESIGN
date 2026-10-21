// src/pages/design/book/PublicBookView.jsx
import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { useParams } from "react-router-dom";
import HTMLFlipBook from "react-pageflip";
import { ChevronLeft, ChevronRight } from "lucide-react";
import publicApi from "../../../api/publicApi";

const PAGE_NUM_POS = {
  "top-left": { top: 20, left: 20 },
  "top-center": { top: 20, left: "50%", transform: "translateX(-50%)" },
  "top-right": { top: 20, right: 20 },
  "bottom-left": { bottom: 20, left: 20 },
  "bottom-center": { bottom: 20, left: "50%", transform: "translateX(-50%)" },
  "bottom-right": { bottom: 20, right: 20 },
};
function PageNumberBadge({ book, page, number, total }) {
  // Covers (and blanks, handled separately) never get a page number.
  if (!page || number == null || total == null) return null;
  const override = page?.background?.pageNumber;
  if (override?.mode === "hidden") return null;
  const style = override?.mode === "custom" ? override : book.pageNumberDefault;
  if (!style?.enabled) return null;
  const text = (style.format || "{n}").replace("{n}", number).replace("{total}", total);

  const posStyle =
    style.freeDrag && style.xFrac != null
      ? { left: `${style.xFrac * 100}%`, top: `${style.yFrac * 100}%` }
      : PAGE_NUM_POS[style.position || "bottom-center"];

  return (
    <div
      style={{
        position: "absolute",
        ...posStyle,
        color: style.color || "#111",
        fontSize: style.fontSize || 16,
        fontFamily: "system-ui, sans-serif",
        pointerEvents: "none",
      }}
    >
      {text}
    </div>
  );
}

const MOBILE_BREAKPOINT = 768;

export default function PublicBookView() {
  const { slug } = useParams();
  const [book, setBook] = useState(null);
  const [notFound, setNotFound] = useState(false);
  const [dims, setDims] = useState({ width: 300, height: 420 });
  const [isMobile, setIsMobile] = useState(
    typeof window !== "undefined" ? window.innerWidth < MOBILE_BREAKPOINT : false,
  );
  const [pageIdx, setPageIdx] = useState(0);
  const flipRef = useRef();

  useEffect(() => {
    publicApi
      .get(`/public/books/${slug}`)
      .then(({ data }) => setBook(data))
      .catch(() => setNotFound(true));
  }, [slug]);

  useEffect(() => {
    if (!book) return;
    const ratio = book.widthPx / book.heightPx;

    const compute = () => {
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const mobile = vw < MOBILE_BREAKPOINT;
      setIsMobile(mobile);

      if (mobile) {
        const maxW = vw * 0.86;
        const maxH = vh * 0.66;
        let width = maxW;
        let height = width / ratio;
        if (height > maxH) {
          height = maxH;
          width = height * ratio;
        }
        setDims({ width, height });
      } else {
        const maxSpreadW = vw * (vw < 1100 ? 0.82 : 0.7);
        const maxH = vh * 0.7;
        let perPageWidth = maxSpreadW / 2;
        let height = perPageWidth / ratio;
        if (height > maxH) {
          height = maxH;
          perPageWidth = height * ratio;
        }
        setDims({ width: perPageWidth, height });
      }
    };

    compute();

    let t;
    const onResize = () => {
      clearTimeout(t);
      t = setTimeout(compute, 150);
    };
    window.addEventListener("resize", onResize);
    return () => {
      clearTimeout(t);
      window.removeEventListener("resize", onResize);
    };
  }, [book]);

  const goPrev = useCallback(() => flipRef.current?.pageFlip?.().flipPrev(), []);
  const goNext = useCallback(() => flipRef.current?.pageFlip?.().flipNext(), []);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "ArrowLeft") goPrev();
      if (e.key === "ArrowRight") goNext();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [goPrev, goNext]);

  const flipPages = useMemo(() => {
    if (!book) return [];

    const baseUrl = import.meta.env.VITE_BASE_URL.replace("/api", "");
    const resolveSrc = (src) => (src ? `${baseUrl}${src}` : "");

    const pages = [];

    if (book.coverImage) {
      pages.push({
        key: "cover",
        src: resolveSrc(book.coverImage),
        blank: false,
        cover: true,
      });
    }

    book.pages.forEach((page, i) => {
      pages.push({
        key: page.id,
        src: page.previewImage || resolveSrc(page.background),
        blank: false,
        page,
        number: i + 1,
        total: book.pages.length,
      });
      if (book.pageLayout === "simplex") {
        const blankEntry = { key: `${page.id}-blank`, src: null, blank: true };
        if (book.bindingSide === "left") {
          pages.splice(pages.length - 1, 0, blankEntry);
        } else {
          pages.push(blankEntry);
        }
      }
    });

    if (book.backCoverImage) {
      pages.push({ key: "back-cover", src: resolveSrc(book.backCoverImage), blank: false, cover: true });
    }

    if (!isMobile) {
      const contentCount = book.coverImage ? pages.length - 1 : pages.length;
      if (contentCount % 2 !== 0) {
        pages.push({ key: "pad-end", src: null, blank: true });
      }
    }

    return pages;
  }, [book, isMobile]);

  if (notFound)
    return (
      <div className="d-flex align-items-center justify-content-center min-vh-100 text-muted">
        Book not found or unpublished.
      </div>
    );
  if (!book)
    return (
      <div className="d-flex align-items-center justify-content-center min-vh-100">
        <div
          className="spinner-border text-secondary"
          role="status"
          style={{ width: 36, height: 36 }}
        ></div>
      </div>
    );

  const totalPages = flipPages.length;
  const bookWidth = isMobile ? dims.width : dims.width * 2;
  const remountKey = `${isMobile ? "m" : "d"}-${Math.round(dims.width)}x${Math.round(dims.height)}`;

  return (
    <div
      style={{
        height: "100vh",
        width: "100vw",
        overflow: "hidden",
        position: "relative",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        background: "#e9e9e9",
      }}
    >
      <div style={{ position: "relative", padding: isMobile ? 24 : 60 }}>
        <div
          style={{
            position: "absolute",
            top: (isMobile ? 24 : 60) + dims.height * 0.85,
            left: (isMobile ? 24 : 60) - (isMobile ? 14 : 30),
            width: bookWidth + (isMobile ? 28 : 60),
            height: isMobile ? 30 : 50,
            background:
              "radial-gradient(ellipse at center, rgba(0,0,0,0.22) 0%, rgba(0,0,0,0) 72%)",
            filter: `blur(${isMobile ? 6 : 10}px)`,
            zIndex: 0,
            pointerEvents: "none",
          }}
        />

        <div
          style={{
            width: bookWidth,
            height: dims.height,
            position: "relative",
            zIndex: 2,
            perspective: "2400px",
            transformStyle: "preserve-3d",
          }}
        >
          <HTMLFlipBook
            key={remountKey}
            ref={flipRef}
            width={dims.width}
            height={dims.height}
            size="fixed"
            showCover={!isMobile}
            usePortrait={isMobile}
            mobileScrollSupport={false}
            drawShadow={true}
            maxShadowOpacity={0.6}
            flippingTime={book.flipStyle === "fade" ? 500 : 900}
            useMouseEvents={true}
            clickEventForward={true}
            swipeDistance={20}
            showPageCorners={true}
            disableFlipByClick={false}
            className="pageflip-book"
            style={{
              boxShadow:
                "0 1px 2px rgba(0,0,0,0.08), 0 20px 40px rgba(0,0,0,0.18)",
              borderRadius: "1px",
              transformStyle: "preserve-3d",
            }}
            onFlip={(e) => setPageIdx(e.data)}
          >
          {flipPages.map((p, i) =>
              p.blank ? (
                <div
                  key={p.key}
                  className="page"
                  style={{ background: "#ffffff", width: "100%", height: "100%" }}
                ></div>
              ) : (
                <div
                  key={p.key}
                  className="page"
                  style={{
                    background: "#ffffff",
                    position: "relative",
                    overflow: "hidden",
                    // faint inset border along the cover's edge, suggesting
                    // hardcover board thickness — very subtle, only on cover
                    ...(p.cover && {
                      boxShadow: "inset 0 0 0 1px rgba(0,0,0,0.05)",
                    }),
                  }}
                >
                  <img
                    src={p.src}
                    className="w-100 h-100" 
                    style={{ objectFit: "contain", display: "block" }}
                    draggable={false}
                  />
                  <PageNumberBadge book={book} page={p.page} number={p.number} total={p.total} />
                  {!isMobile && !p.cover && (
                    <div
                      style={{
                        position: "absolute",
                        top: 0,
                        bottom: 0,
                        width: "6%",
                        pointerEvents: "none",
                        ...(i % 2 === 0
                          ? {
                              right: 0,
                              background:
                                "linear-gradient(270deg, rgba(0,0,0,0.08) 0%, rgba(0,0,0,0) 100%)",
                            }
                          : {
                              left: 0,
                              background:
                                "linear-gradient(90deg, rgba(0,0,0,0.08) 0%, rgba(0,0,0,0) 100%)",
                            }),
                      }}
                    />
                  )}
                </div>
              ),
            )}
          </HTMLFlipBook>
        </div>
      </div>

      <div
        className="d-flex align-items-center gap-3 mt-3 mt-md-4"
        style={{ zIndex: 2 }}
      >
        <button
          onClick={goPrev}
          aria-label="Previous page"
          style={navBtnStyle}
          onMouseEnter={(e) => (e.currentTarget.style.background = "#f0f0f0")}
          onMouseLeave={(e) => (e.currentTarget.style.background = "#ffffff")}
        >
          <ChevronLeft size={18} color="#444" />
        </button>

        <span
          style={{
            color: "#666",
            letterSpacing: 1,
            fontSize: 13,
            fontFamily: "system-ui, sans-serif",
            minWidth: 60,
            textAlign: "center",
          }}
        >
          {pageIdx + 1} / {totalPages}
        </span>

        <button
          onClick={goNext}
          aria-label="Next page"
          style={navBtnStyle}
          onMouseEnter={(e) => (e.currentTarget.style.background = "#f0f0f0")}
          onMouseLeave={(e) => (e.currentTarget.style.background = "#ffffff")}
        >
          <ChevronRight size={18} color="#444" />
        </button>
      </div>

     <style>{`
        .pageflip-book {
          user-select: none;
        }
        .pageflip-book .page {
          background: #ffffff !important;
          backface-visibility: hidden;
          -webkit-backface-visibility: hidden;
        }
        .pageflip-book .stf__item,
        .pageflip-book .stf__block {
          background: #ffffff;
        }
      `}</style>
    </div>
  );
}

const navBtnStyle = {
  width: 40,
  height: 40,
  borderRadius: "50%",
  background: "#ffffff",
  border: "1px solid #ddd",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  cursor: "pointer",
  transition: "background 0.15s ease",
  boxShadow: "0 2px 6px rgba(0,0,0,0.08)",
};