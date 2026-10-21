// src/pages/design/book/BookDesign.jsx
import { useEffect, useRef, useState, useCallback } from "react";
import {
  INDEX_PRESETS,
  buildIndexEntries,
  generateIndexContent,
} from "./indexPresets";
import { useParams, useNavigate } from "react-router-dom";
import {
  Stage,
  Layer,
  Group,
  Image as KonvaImage,
  Text,
  Rect,
  Circle,
  RegularPolygon,
  Star,
  Line,
  Transformer,
} from "react-konva";
import useImage from "use-image";
import debounce from "lodash/debounce";
import Konva from "konva";
import WebFont from "webfontloader";
import HTMLFlipBook from "react-pageflip";
import {
  ArrowLeft,
  ArrowLeftRight,
  Undo2,
  Redo2,
  Eye,
  EyeOff,
  Trash2,
  GripVertical,
  Combine,
  Type as TypeIcon,
  Image as ImageIcon,
  Square,
  Circle as CircleIcon,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  Triangle as TriangleIcon,
  Star as StarIcon,
  Minus as LineIcon,
} from "lucide-react";
import api from "../../../api/Axios";
import TransliterateModal from "./TransliterateModal";
import AIPanel from "./AIPanel";
import RichTextModal from "./RichTextModal";
import { layoutSegments } from "./richText";

const BASE_URL = import.meta.env.VITE_BASE_URL.replace("/api", "");

const GOOGLE_FONTS = [
  "Roboto",
  "Open Sans",
  "Lato",
  "Montserrat",
  "Poppins",
  "Playfair Display",
  "Merriweather",
  "Oswald",
  "Raleway",
  "Nunito",
  "Inter",
  "Work Sans",
  "Rubik",
  "Karla",
  "Dancing Script",
  "Pacifico",
  "Lobster",
  "Bebas Neue",
  "Anton",
  "Abril Fatface",
  "Cormorant Garamond",
  "Josefin Sans",
  "Quicksand",
  "Noto Sans Malayalam",
  "Manjari",
  "Baloo Chettan 2",
];

const MAX_HISTORY = 60;
// Lowered from 3 -> 2. Halves pixel count (9x -> 4x) on every high-res
// capture, which is the single biggest thing slowing down the "save +
// switch page" path. Still crisp enough for thumbnails/PDF preview.
const EXPORT_PIXEL_RATIO = 2;

const EXPORT_QUALITY_PRESETS = {
  high: {
    label: "Exact — original clarity, no compression, no resizing",
    mimeType: null,
    quality: null,
    maxDim: null,
    native: false,
  },
  clear_compact: {
    label: "Clear & Compact — fully sharp, no oversampling, no compression",
    mimeType: null,
    quality: null,
    maxDim: null,
    native: true,
  },
  medium: {
    label: "Balanced — small size, near-original clarity",
    mimeType: "image/jpeg",
    quality: 0.92,
    maxDim: 2400,
    native: false,
  },
  small: {
    label: "Smallest — noticeably compressed",
    mimeType: "image/jpeg",
    quality: 0.75,
    maxDim: 1600,
    native: false,
  },
};
const BORDER_PRESETS = [
  { id: "solid-thin", label: "Solid Thin", width: 2 },
  { id: "solid-medium", label: "Solid Medium", width: 4 },
  { id: "solid-thick", label: "Solid Thick", width: 8 },
  { id: "dashed", label: "Dashed", width: 3, dash: [10, 6] },
  { id: "dashed-fine", label: "Fine Dashed", width: 2, dash: [4, 4] },
  { id: "dotted", label: "Dotted", width: 3, dash: [1, 6], lineCap: "round" },
  { id: "dash-dot", label: "Dash-Dot", width: 2, dash: [10, 4, 2, 4] },
  { id: "long-dash", label: "Long Dash", width: 3, dash: [20, 8] },
  { id: "rounded", label: "Rounded", width: 4, radius: 24 },
  { id: "rounded-thick", label: "Rounded Thick", width: 8, radius: 30 },
  { id: "double", label: "Double Line", width: 2, double: true, gap: 6 },
  {
    id: "double-thick",
    label: "Double Thick",
    width: 3,
    double: true,
    gap: 10,
  },
];

// Fixed, sane transformer sizing shared by every element type. These are NOT
// divided by stage scale — doing that is what made anchors balloon to 30-40px
// whenever the page was zoomed out to fit the screen.
const HANDLE = {
  anchorSize: 9,
  anchorCornerRadius: 2,
  anchorStrokeWidth: 1.5,
  borderStrokeWidth: 1.5,
  rotateAnchorOffset: 24,
};

function resolveSrc(src) {
  if (!src) return src;
  if (src.startsWith("http") || src.startsWith("data:")) return src;
  return `${BASE_URL}${src}`;
}

function clamp(val, min, max) {
  if (max < min) return min;
  return Math.max(min, Math.min(val, max));
}

// A flat 50px floor let a text box get narrower than a single character at
// normal font sizes, causing "s / a / s / a / s"-style vertical wrapping.
// Scale the floor with font size instead, so there's always room for a
// handful of characters before it has to wrap.
function minTextWidth(fontSize) {
  return clamp((fontSize || 16) * 3, 60, 200);
}

function unionRect(a, b) {
  if (!a) return b;
  if (!b) return a;
  const x = Math.min(a.x, b.x);
  const y = Math.min(a.y, b.y);
  const x2 = Math.max(a.x + a.width, b.x + b.width);
  const y2 = Math.max(a.y + a.height, b.y + b.height);
  return { x, y, width: x2 - x, height: y2 - y };
}

function elementSize(shape) {
  if (shape.type === "shape") {
    if (shape.shapeType === "circle") {
      return {
        width: (shape.radius || 0) * 2,
        height: (shape.radius || 0) * 2,
      };
    }
    if (shape.shapeType === "triangle" || shape.shapeType === "star") {
      return {
        width: (shape.outerRadius || shape.radius || 0) * 2,
        height: (shape.outerRadius || shape.radius || 0) * 2,
      };
    }
    if (shape.shapeType === "line") {
      return { width: shape.width || 200, height: shape.strokeWidth || 4 };
    }
  }
  if (shape.type === "group") {
    return {
      width: (shape.width || 100) * (shape.scaleX ?? 1),
      height: (shape.height || 100) * (shape.scaleY ?? 1),
    };
  }
  return { width: shape.width || 100, height: shape.height || 40 };
}

// ---- content-area (margin + padding) containment helpers ----
// These make "padding" an actual boundary instead of just a dashed guide:
// every committed change re-clamps every element's position to stay inside
// margin+padding, on both axes.
function contentBoundsFor(background, book) {
  const inset = (background.margin || 0) + (background.padding || 0);
  return {
    x: inset,
    y: inset,
    width: Math.max(10, book.widthPx - inset * 2),
    height: Math.max(10, book.heightPx - inset * 2),
  };
}

function elementBoxForClamp(el) {
  if (el.type === "text") {
    const padding = el.padding ?? 8;
    return {
      width: (el.width || 300) + padding * 2,
      height: (el.fontSize || 16) * 1.4 + padding * 2,
    };
  }
  return elementSize(el);
}

function clampElementToBounds(el, bounds) {
  const isRadial =
    el.type === "shape" &&
    (el.shapeType === "circle" ||
      el.shapeType === "triangle" ||
      el.shapeType === "star");

  if (isRadial) {
    const r = el.radius || el.outerRadius || 0;
    const minX = bounds.x + r;
    const maxX = Math.max(minX, bounds.x + bounds.width - r);
    const minY = bounds.y + r;
    const maxY = Math.max(minY, bounds.y + bounds.height - r);
    return { ...el, x: clamp(el.x, minX, maxX), y: clamp(el.y, minY, maxY) };
  }

  const { width: w, height: h } = elementBoxForClamp(el);
  const minX = bounds.x;
  const maxX = Math.max(minX, bounds.x + bounds.width - w);
  const minY = bounds.y;
  const maxY = Math.max(minY, bounds.y + bounds.height - h);
  return { ...el, x: clamp(el.x, minX, maxX), y: clamp(el.y, minY, maxY) };
}

function clipForShape(shapeType, width, height) {
  if (shapeType === "circle") {
    return function (ctx) {
      ctx.beginPath();
      ctx.ellipse(
        width / 2,
        height / 2,
        width / 2,
        height / 2,
        0,
        0,
        Math.PI * 2,
      );
      ctx.closePath();
    };
  }
  return undefined;
}

function CanvasImage({
  shape,
  name,
  isSelected,
  onSelect,
  onContext,
  onChange,
  pageWidth,
  pageHeight,
}) {
  const [img] = useImage(resolveSrc(shape.src), "anonymous");
  const shapeRef = useRef();
  const trRef = useRef();

  useEffect(() => {
    if (isSelected && trRef.current) {
      trRef.current.nodes([shapeRef.current]);
      trRef.current.getLayer().batchDraw();
    }
  }, [isSelected]);

  useEffect(() => {
    if (!shapeRef.current) return;
    shapeRef.current.cache();
    shapeRef.current.getLayer()?.batchDraw();
  }, [
    img,
    shape.brightness,
    shape.contrast,
    shape.clipShape,
    shape.width,
    shape.height,
  ]);

  // Reset any leftover scale AFTER the new width/height have actually been
  // applied via props, so the shape never visibly snaps back to its old size.
  // useEffect(() => {
  //   if (!shapeRef.current) return;
  //   shapeRef.current.scaleX(1);
  //   shapeRef.current.scaleY(1);
  // }, [shape.width, shape.height]);

  if (shape.hidden) return null;

  return (
    <>
      <KonvaImage
        image={img}
        ref={shapeRef}
        name={name}
        {...shape}
        clipFunc={clipForShape(shape.clipShape, shape.width, shape.height)}
        filters={[Konva.Filters.Brighten, Konva.Filters.Contrast]}
        brightness={shape.brightness ?? 0}
        contrast={shape.contrast ?? 0}
        draggable
        onClick={onSelect}
        onTap={onSelect}
        onContextMenu={(e) => onContext(e, shape)}
        onDragEnd={(e) => {
          const x = clamp(
            e.target.x(),
            0,
            Math.max(0, pageWidth - shape.width),
          );
          const y = clamp(
            e.target.y(),
            0,
            Math.max(0, pageHeight - shape.height),
          );
          e.target.position({ x, y });
          onChange({ ...shape, x, y });
        }}
      onTransformEnd={() => {
          const node = shapeRef.current;
          const scaleX = node.scaleX();
          const scaleY = node.scaleY();
          node.scaleX(1);
          node.scaleY(1);
          onChange({
            ...shape,
            x: node.x(),
            y: node.y(),
            width: Math.max(20, node.width() * scaleX),
            height: Math.max(20, node.height() * scaleY),
            rotation: node.rotation(),
          });
        }}
      />
      {isSelected && (
        <Transformer
          ref={trRef}
          anchorSize={HANDLE.anchorSize}
          anchorCornerRadius={HANDLE.anchorCornerRadius}
          anchorStrokeWidth={HANDLE.anchorStrokeWidth}
          borderStrokeWidth={HANDLE.borderStrokeWidth}
          keepRatio={false}
          rotateAnchorOffset={HANDLE.rotateAnchorOffset}
        />
      )}
    </>
  );
}

function CanvasText({
  shape,
  name,
  isSelected,
  onSelect,
  onContext,
  onChange,
  onEditRichText,
  pageWidth,
  pageHeight,
}) {
  const groupRef = useRef();
  const textRef = useRef();
  const trRef = useRef();
  const [measured, setMeasured] = useState({
    width: shape.width || 300,
    height: (shape.fontSize || 28) * 1.4,
  });

  useEffect(() => {
    if (isSelected && trRef.current) {
      trRef.current.nodes([groupRef.current]);
      trRef.current.getLayer().batchDraw();
    }
  }, [isSelected]);
  // The selection box (Transformer) is sized off `measured`, which itself
// updates one render after `shape.text`/segments change. Without this,
// after an edit (e.g. Translation "Update"), the Transformer briefly shows
// the OLD bounding box until the element is deselected/reselected. Force a
// redraw whenever measured changes so the box always matches current text.
useEffect(() => {
  if (isSelected && trRef.current) {
    trRef.current.forceUpdate();
    trRef.current.getLayer()?.batchDraw();
  }
}, [measured, isSelected]);

  useEffect(() => {
    if (shape.segments && shape.segments.length) {
      const { width, height } = layoutSegments(
        shape.segments,
        shape.width || 300,
        shape.fontSize,
        shape.fontFamily,
        shape.align || "left",
        shape.wordSpacing || 0,
      );
      setMeasured({ width, height });
    } else if (textRef.current) {
      setMeasured({
        width: textRef.current.width(),
        height: textRef.current.height(),
      });
    }
  }, [
    shape.text,
    shape.segments,
    shape.fontSize,
    shape.fontFamily,
    shape.width,
    shape.align,
    shape.wordSpacing,
  ]);

  // Reset any leftover scale AFTER the new width/fontSize have actually been
  // applied via props, so the box never visibly snaps back mid-resize.
  // useEffect(() => {
  //   if (!groupRef.current) return;
  //   groupRef.current.scaleX(1);
  //   groupRef.current.scaleY(1);
  // }, [shape.width, shape.fontSize]);

  if (shape.hidden) return null;

  const padding = shape.padding ?? 8;
  const hasBg = !!shape.bgColor;
  const hasBorder = !!shape.borderWidth;

  return (
    <>
      <Group
        ref={groupRef}
        name={name}
        x={shape.x}
        y={shape.y}
        rotation={shape.rotation || 0}
        draggable
        onClick={onSelect}
        onTap={onSelect}
        onContextMenu={(e) => onContext(e, shape)}
        onDblClick={onEditRichText}
        onDblTap={onEditRichText}
        onDragEnd={(e) => {
          const w = measured.width + padding * 2;
          const h = measured.height + padding * 2;
          const x = clamp(e.target.x(), 0, Math.max(0, pageWidth - w));
          const y = clamp(e.target.y(), 0, Math.max(0, pageHeight - h));
          e.target.position({ x, y });
          onChange({ ...shape, x, y });
        }}
        onTransformEnd={() => {
          const node = groupRef.current;
          const scaleX = node.scaleX();
          const scaleY = node.scaleY();
          node.scaleX(1);
          node.scaleY(1);
          // Side handles (middle-left/middle-right) only change scaleX, so
          // scaleY stays 1 and font size is untouched — text just rewraps.
          // Corner handles change both, so font size scales along with them.
          const newFontSize = clamp(
            Math.round((shape.fontSize || 16) * scaleY),
            6,
            400,
          );
          const newWidth = clamp(
            (shape.width || 300) * scaleX,
            minTextWidth(newFontSize),
            Math.max(minTextWidth(newFontSize), pageWidth - node.x()),
          );
          onChange({
            ...shape,
            x: node.x(),
            y: node.y(),
            width: newWidth,
            fontSize: newFontSize,
            rotation: node.rotation(),
          });
          // scale is reset by the effect above once the new size lands in props
        }}
      >
        <Rect
          x={-padding}
          y={-padding}
          width={measured.width + padding * 2}
          height={measured.height + padding * 2}
          fill={hasBg ? shape.bgColor : "transparent"}
          opacity={shape.bgOpacity ?? 1}
          stroke={hasBorder ? shape.borderColor || "#000000" : undefined}
          strokeWidth={shape.borderWidth || 0}
          cornerRadius={shape.borderRadius || 0}
        />
        {shape.segments && shape.segments.length ? (
          layoutSegments(
            shape.segments,
            shape.width || 300,
            shape.fontSize,
            shape.fontFamily,
            shape.align || "left",
            shape.wordSpacing || 0,
          ).positioned.map((tok, i) => (
            <Group key={i} listening={false}>
              {tok.highlight && (
                <Rect
                  x={tok.x}
                  y={tok.y}
                  width={tok.width}
                  height={tok.fontSize * 1.2}
                  fill={tok.highlight}
                />
              )}
              <Text
                x={tok.x}
                y={tok.y}
                text={tok.text}
                fontSize={tok.fontSize}
                fontFamily={shape.fontFamily}
                fontStyle={
                  [tok.italic ? "italic" : "", tok.bold ? "bold" : ""]
                    .filter(Boolean)
                    .join(" ") || "normal"
                }
                textDecoration={tok.underline ? "underline" : ""}
                fill={tok.color || shape.fill}
              />
            </Group>
          ))
        ) : (
          <Text
            ref={textRef}
            text={shape.text}
            fontSize={shape.fontSize}
            fontFamily={shape.fontFamily}
            fill={shape.fill}
            align={shape.align || "left"}
            width={shape.width || 300}
            wrap="word"
          />
        )}
      </Group>
      {isSelected && (
        <Transformer
          ref={trRef}
          rotateEnabled={true}
          rotateAnchorOffset={HANDLE.rotateAnchorOffset}
          anchorSize={HANDLE.anchorSize}
          anchorCornerRadius={HANDLE.anchorCornerRadius}
          anchorStrokeWidth={HANDLE.anchorStrokeWidth}
          borderStrokeWidth={HANDLE.borderStrokeWidth}
        />
      )}
    </>
  );
}

function CanvasShape({
  shape,
  name,
  isSelected,
  onSelect,
  onContext,
  onChange,
  pageWidth,
  pageHeight,
}) {
  const shapeRef = useRef();
  const trRef = useRef();

  useEffect(() => {
    if (isSelected && trRef.current) {
      trRef.current.nodes([shapeRef.current]);
      trRef.current.getLayer().batchDraw();
    }
  }, [isSelected]);

  // useEffect(() => {
  //   if (!shapeRef.current) return;
  //   shapeRef.current.scaleX(1);
  //   shapeRef.current.scaleY(1);
  // }, [shape.width, shape.height, shape.radius, shape.outerRadius]);

  if (shape.hidden) return null;

  const { width: w, height: h } = elementSize(shape);

  const dragEnd = (e) => {
    let x, y;
    if (
      shape.shapeType === "circle" ||
      shape.shapeType === "triangle" ||
      shape.shapeType === "star"
    ) {
      const r = shape.radius || shape.outerRadius || 0;
      x = clamp(e.target.x(), r, Math.max(r, pageWidth - r));
      y = clamp(e.target.y(), r, Math.max(r, pageHeight - r));
    } else {
      x = clamp(e.target.x(), 0, Math.max(0, pageWidth - w));
      y = clamp(e.target.y(), 0, Math.max(0, pageHeight - h));
    }
    e.target.position({ x, y });
    onChange({ ...shape, x, y });
  };

  const transformEnd = () => {
    const node = shapeRef.current;
    const sx = node.scaleX();
    const sy = node.scaleY();
    node.scaleX(1);
    node.scaleY(1);
    const next = {
      ...shape,
      x: node.x(),
      y: node.y(),
      rotation: node.rotation(),
    };
    if (shape.shapeType === "circle") {
      next.radius = Math.max(5, shape.radius * sx);
    } else if (shape.shapeType === "triangle") {
      next.radius = Math.max(5, (shape.radius || 60) * sx);
    } else if (shape.shapeType === "star") {
      next.outerRadius = Math.max(5, (shape.outerRadius || 60) * sx);
      next.innerRadius = Math.max(3, (shape.innerRadius || 30) * sx);
    } else if (shape.shapeType === "line") {
      next.width = Math.max(10, (shape.width || 200) * sx);
      next.strokeWidth = Math.max(1, (shape.strokeWidth || 4) * sy);
    } else {
      next.width = Math.max(10, (shape.width || 100) * sx);
      next.height = Math.max(10, (shape.height || 100) * sy);
    }
    onChange(next);
  };

  const commonProps = {
    ref: shapeRef,
    name,
    draggable: true,
    onClick: onSelect,
    onTap: onSelect,
    onContextMenu: (e) => onContext(e, shape),
    onDragEnd: dragEnd,
    onTransformEnd: transformEnd,
    rotation: shape.rotation || 0,
    x: shape.x,
    y: shape.y,
  };

  let node;
  if (shape.shapeType === "circle") {
    node = <Circle {...commonProps} radius={shape.radius} fill={shape.fill} />;
  } else if (shape.shapeType === "triangle") {
    node = (
      <RegularPolygon
        {...commonProps}
        sides={3}
        radius={shape.radius || 60}
        fill={shape.fill}
      />
    );
  } else if (shape.shapeType === "star") {
    node = (
      <Star
        {...commonProps}
        numPoints={shape.points || 5}
        innerRadius={shape.innerRadius || 30}
        outerRadius={shape.outerRadius || 60}
        fill={shape.fill}
      />
    );
  } else if (shape.shapeType === "line") {
    node = (
      <Line
        {...commonProps}
        points={[0, 0, shape.width || 200, 0]}
        stroke={shape.fill}
        strokeWidth={shape.strokeWidth || 4}
        lineCap="round"
      />
    );
  } else {
    node = (
      <Rect
        {...commonProps}
        width={shape.width}
        height={shape.height}
        fill={shape.fill}
        cornerRadius={shape.cornerRadius || 0}
      />
    );
  }

  return (
    <>
      {node}
      {isSelected && (
        <Transformer
          ref={trRef}
          anchorSize={HANDLE.anchorSize}
          anchorCornerRadius={HANDLE.anchorCornerRadius}
          anchorStrokeWidth={HANDLE.anchorStrokeWidth}
          borderStrokeWidth={HANDLE.borderStrokeWidth}
          keepRatio={shape.shapeType === "circle" || shape.shapeType === "star"}
          rotateAnchorOffset={HANDLE.rotateAnchorOffset}
        />
      )}
    </>
  );
}

// Renders a "grouped" element: several text/image/shape nodes that stay live
// and editable, moved/resized together as one unit. This replaces the old
// behaviour of flattening merged layers into a single raster PNG.
function GroupChildImage({ child }) {
  const [img] = useImage(resolveSrc(child.src), "anonymous");
  return (
    <KonvaImage
      image={img}
      x={child.x}
      y={child.y}
      width={child.width}
      height={child.height}
      rotation={child.rotation || 0}
      clipFunc={clipForShape(child.clipShape, child.width, child.height)}
      listening={false}
    />
  );
}

function CanvasGroup({
  shape,
  name,
  isSelected,
  onSelect,
  onContext,
  onChange,
  pageWidth,
  pageHeight,
}) {
  const groupRef = useRef();
  const trRef = useRef();

  useEffect(() => {
    if (isSelected && trRef.current) {
      trRef.current.nodes([groupRef.current]);
      trRef.current.getLayer().batchDraw();
    }
  }, [isSelected]);

  if (shape.hidden) return null;

  const scaleX = shape.scaleX ?? 1;
  const scaleY = shape.scaleY ?? 1;
  const w = (shape.width || 100) * scaleX;
  const h = (shape.height || 100) * scaleY;

  return (
    <>
      <Group
        ref={groupRef}
        name={name}
        x={shape.x}
        y={shape.y}
        rotation={shape.rotation || 0}
        scaleX={scaleX}
        scaleY={scaleY}
        draggable
        onClick={onSelect}
        onTap={onSelect}
        onContextMenu={(e) => onContext(e, shape)}
        onDragEnd={(e) => {
          const x = clamp(e.target.x(), 0, Math.max(0, pageWidth - w));
          const y = clamp(e.target.y(), 0, Math.max(0, pageHeight - h));
          e.target.position({ x, y });
          onChange({ ...shape, x, y });
        }}
        onTransformEnd={() => {
          const node = groupRef.current;
          onChange({
            ...shape,
            x: node.x(),
            y: node.y(),
            rotation: node.rotation(),
            scaleX: node.scaleX(),
            scaleY: node.scaleY(),
          });
        }}
      >
        {/* invisible hit-area so clicking anywhere in the bounding box selects the group */}
        <Rect
          x={0}
          y={0}
          width={shape.width || 100}
          height={shape.height || 100}
          fill="transparent"
        />
        {(shape.children || []).map((child, i) => {
          if (child.type === "text") {
            return (
              <Text
                key={i}
                x={child.x}
                y={child.y}
                text={child.text}
                fontSize={child.fontSize}
                fontFamily={child.fontFamily}
                fill={child.fill}
                align={child.align || "left"}
                width={child.width || 300}
                wrap="word"
                rotation={child.rotation || 0}
                listening={false}
              />
            );
          }
          if (child.type === "image") {
            return <GroupChildImage key={i} child={child} />;
          }
          if (child.shapeType === "circle") {
            return (
              <Circle
                key={i}
                x={child.x}
                y={child.y}
                radius={child.radius}
                fill={child.fill}
                rotation={child.rotation || 0}
                listening={false}
              />
            );
          }
          return (
            <Rect
              key={i}
              x={child.x}
              y={child.y}
              width={child.width}
              height={child.height}
              fill={child.fill}
              rotation={child.rotation || 0}
              listening={false}
            />
          );
        })}
      </Group>
      {isSelected && (
        <Transformer
          ref={trRef}
          anchorSize={HANDLE.anchorSize}
          anchorCornerRadius={HANDLE.anchorCornerRadius}
          anchorStrokeWidth={HANDLE.anchorStrokeWidth}
          borderStrokeWidth={HANDLE.borderStrokeWidth}
          keepRatio={false}
          rotateAnchorOffset={HANDLE.rotateAnchorOffset}
        />
      )}
    </>
  );
}

export default function BookDesign() {
  const { bookId } = useParams();
  const navigate = useNavigate();
  const [book, setBook] = useState(null);
  const [pages, setPages] = useState([]);
  const [activePageIdx, setActivePageIdx] = useState(0);
  const [elements, setElements] = useState([]);
  const [background, setBackground] = useState({
    color: "#ffffff",
    image: null,
    gradient: null,
    margin: 0,
    padding: 0,
    border: null,
  });
  const [selectedId, setSelectedId] = useState(null);
  const [selectedLayerIds, setSelectedLayerIds] = useState(new Set());
  const [showToolbar, setShowToolbar] = useState(false);
  const [showPages, setShowPages] = useState(false);

  const [showPageManager, setShowPageManager] = useState(false);
  const [swapSourceIdx, setSwapSourceIdx] = useState(null);

  const [showLayers, setShowLayers] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportPreset, setExportPreset] = useState("medium");
  const [exporting, setExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState({
    done: 0,
    total: 0,
    bytes: 0,
  });
  const [scale, setScale] = useState(1); // auto-fit scale, recomputed on resize
  const [zoom, setZoom] = useState(1); // user zoom multiplier on top of the fit scale (Ctrl+scroll / buttons)
  const effectiveScale = scale * zoom;
  const [saveStatus, setSaveStatus] = useState("idle"); // idle | saving | saved
  const [contextMenu, setContextMenu] = useState(null); // { x, y, idx }
  const clipboardRef = useRef(null);
  const [settingsModalShape, setSettingsModalShape] = useState(null);
  const [showPageStyle, setShowPageStyle] = useState(false);
  const [applyingStyleToAll, setApplyingStyleToAll] = useState(false);
  const [showIndexPresets, setShowIndexPresets] = useState(false);
  const [showBookSettings, setShowBookSettings] = useState(false);

  const [showTransliterateModal, setShowTransliterateModal] = useState(false);
  const [showAIPanel, setShowAIPanel] = useState(false);
  const [richTextModalIdx, setRichTextModalIdx] = useState(null);
  const [historyTick, setHistoryTick] = useState(0); // forces re-render for undo/redo button state
  const stageRef = useRef();
  const layerRef = useRef();
  const canvasWrapRef = useRef();
  const pendingSaveRef = useRef(null);
  const [bgImg] = useImage(resolveSrc(background.image), "anonymous");

  const elementsRef = useRef(elements);
  const backgroundRef = useRef(background);
  useEffect(() => {
    elementsRef.current = elements;
  }, [elements]);
  useEffect(() => {
    backgroundRef.current = background;
  }, [background]);

  // Tracks whether there's anything unsaved since the last successful save.
  // Lets page-switch/add-page skip the expensive high-res save entirely when
  // nothing actually changed (very common — people click through pages just
  // to look).
  const isDirtyRef = useRef(false);
  // Set right before loadPage() runs, so the elements/background state
  // change it causes doesn't get mistaken for a user edit and kick off an
  // autosave of the page we just navigated AWAY from onto the new page id.
  const skipNextAutosaveRef = useRef(false);

  // ---- undo / redo history ----
  const undoStackRef = useRef([]);
  const redoStackRef = useRef([]);

  const snapshot = () => ({
    elements: elementsRef.current,
    background: backgroundRef.current,
  });

  const resetHistory = () => {
    undoStackRef.current = [];
    redoStackRef.current = [];
    setHistoryTick((t) => t + 1);
  };

  // Use this instead of setElements/setBackground for any discrete, undo-able
  // change. Also the single place that enforces "content stays inside
  // margin+padding" — every commit re-clamps element positions against
  // whatever the (possibly just-changed) background bounds are.
  const commit = useCallback(
    (nextElements, nextBackground) => {
      undoStackRef.current.push(snapshot());
      if (undoStackRef.current.length > MAX_HISTORY)
        undoStackRef.current.shift();
      redoStackRef.current = [];
      isDirtyRef.current = true;

      const bg =
        nextBackground !== undefined ? nextBackground : backgroundRef.current;
      const baseElements =
        nextElements !== undefined ? nextElements : elementsRef.current;
      const bounds = book ? contentBoundsFor(bg, book) : null;
      const finalElements = bounds
        ? baseElements.map((el) => clampElementToBounds(el, bounds))
        : baseElements;

      setElements(finalElements);
      if (nextBackground !== undefined) setBackground(nextBackground);
      setHistoryTick((t) => t + 1);
    },
    [book],
  );

  const undo = useCallback(() => {
    if (!undoStackRef.current.length) return;
    const prev = undoStackRef.current.pop();
    redoStackRef.current.push(snapshot());
    isDirtyRef.current = true;
    setElements(prev.elements);
    setBackground(prev.background);
    setSelectedId(null);
    setHistoryTick((t) => t + 1);
  }, []);

  const redo = useCallback(() => {
    if (!redoStackRef.current.length) return;
    const next = redoStackRef.current.pop();
    undoStackRef.current.push(snapshot());
    isDirtyRef.current = true;
    setElements(next.elements);
    setBackground(next.background);
    setSelectedId(null);
    setHistoryTick((t) => t + 1);
  }, []);
  const deleteSelected = () => {
    if (selectedId === null) return;
    commit(elements.filter((_, i) => i !== selectedId));
    setSelectedId(null);
    setContextMenu(null);
  };

  const copySelected = useCallback(() => {
    if (selectedId === null) return;
    clipboardRef.current = JSON.parse(JSON.stringify(elements[selectedId]));
  }, [selectedId, elements]);

  const duplicateSelected = useCallback(() => {
    if (selectedId === null) return;
    const copy = JSON.parse(JSON.stringify(elements[selectedId]));
    const offset = 24;
    copy.x = clamp((copy.x || 0) + offset, 0, book.widthPx - 10);
    copy.y = clamp((copy.y || 0) + offset, 0, book.heightPx - 10);
    commit([...elements, copy]);
    setSelectedId(elements.length);
  }, [selectedId, elements, book, commit]);

  const pasteClipboard = useCallback(() => {
    if (!clipboardRef.current || !book) return;
    const copy = JSON.parse(JSON.stringify(clipboardRef.current));
    const offset = 24;
    copy.x = clamp((copy.x || 0) + offset, 0, book.widthPx - 10);
    copy.y = clamp((copy.y || 0) + offset, 0, book.heightPx - 10);
    commit([...elements, copy]);
    setSelectedId(elements.length);
  }, [book, elements, commit]);

  useEffect(() => {
    const handler = (e) => {
      const key = e.key.toLowerCase();
      const tag = e.target.tagName;
      const isTyping =
        tag === "INPUT" || tag === "TEXTAREA" || e.target.isContentEditable;

      if ((e.ctrlKey || e.metaKey) && key === "z" && !e.shiftKey) {
        e.preventDefault();
        undo();
      } else if (
        ((e.ctrlKey || e.metaKey) && key === "z" && e.shiftKey) ||
        ((e.ctrlKey || e.metaKey) && key === "y")
      ) {
        e.preventDefault();
        redo();
      } else if ((e.ctrlKey || e.metaKey) && key === "c" && !isTyping) {
        e.preventDefault();
        copySelected();
      } else if ((e.ctrlKey || e.metaKey) && key === "v" && !isTyping) {
        e.preventDefault();
        pasteClipboard();
      } else if (
        (e.key === "Delete" || e.key === "Backspace") &&
        !isTyping &&
        selectedId !== null
      ) {
        e.preventDefault();
        deleteSelected();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [undo, redo, copySelected, pasteClipboard, deleteSelected, selectedId]);

  useEffect(() => {
    WebFont.load({ google: { families: GOOGLE_FONTS } });
  }, []);

  useEffect(() => {
    api.get(`/books/${bookId}`).then(({ data }) => {
      setBook(data);
      setPages(data.pages);

      const savedPageId = localStorage.getItem(`book-${bookId}-lastPage`);
      const savedIdx = data.pages.findIndex(
        (p) => String(p.id) === savedPageId,
      );
      const startIdx = savedIdx !== -1 ? savedIdx : 0;

      setActivePageIdx(startIdx);
      loadPage(data.pages[startIdx]);
    });
  }, [bookId]);

  useEffect(() => {
    if (!book || !canvasWrapRef.current) return;
    const computeScale = () => {
      const wrap = canvasWrapRef.current;
      if (!wrap) return;
      const availableW = wrap.clientWidth - 32;
      const availableH = wrap.clientHeight - 32;
      const s = Math.min(
        availableW / book.widthPx,
        availableH / book.heightPx,
        1,
      );
      setScale(s > 0 ? s : 1);
    };
    computeScale();
    const ro = new ResizeObserver(computeScale);
    ro.observe(canvasWrapRef.current);
    window.addEventListener("resize", computeScale);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", computeScale);
    };
  }, [book]);

  // ---- zoom: Ctrl+scroll (also fires for trackpad pinch) zooms the canvas ----
  const zoomIn = useCallback(
    () => setZoom((z) => clamp(Math.round((z + 0.1) * 100) / 100, 0.3, 4)),
    [],
  );
  const zoomOut = useCallback(
    () => setZoom((z) => clamp(Math.round((z - 0.1) * 100) / 100, 0.3, 4)),
    [],
  );
  const zoomReset = useCallback(() => setZoom(1), []);

  const handleWheel = useCallback((e) => {
    if (!e.ctrlKey && !e.metaKey) return; // plain scroll still scrolls the page normally
    e.preventDefault();
    const direction = e.deltaY > 0 ? -1 : 1;
    setZoom((z) =>
      clamp(Math.round((z + direction * 0.1) * 100) / 100, 0.3, 4),
    );
  }, []);

  const loadPage = (page) => {
    skipNextAutosaveRef.current = true;
    setElements(page?.content?.elements || []);
    setBackground({
      color: "#ffffff",
      image: null,
      gradient: null,
      margin: 0,
      padding: 0,
      border: null,
      ...(page?.content?.background || {}),
    });
    setSelectedId(null);
    setSelectedLayerIds(new Set());
    resetHistory();
    isDirtyRef.current = false;
  };

  const activePage = pages[activePageIdx];
  const isIndexPage = background?.meta?.isIndexPage === true;

  useEffect(() => {
    if (activePage) {
      localStorage.setItem(`book-${bookId}-lastPage`, String(activePage.id));
    }
  }, [activePage, bookId]);

  // ---- save (returns a promise so callers can await completion) ----
  const saveChainRef = useRef(Promise.resolve());

  const saveNow = useCallback(
    (pageId, els, bg, highRes = false) => {
      setSaveStatus("saving");

      // Only rasterize the canvas (expensive, main-thread-blocking) for
      // high-res saves — page switch, Ctrl+S, add page. Routine 1s-debounced
      // autosaves while the person is actively editing now save JSON only,
      // which is what was causing the stutter while typing/dragging.
      let previewImage = null;
      if (highRes) {
        // Selection handles (Transformer anchors/border) live on the same
        // Konva stage as the content, so if something is selected when we
        // capture, the handles get rasterized straight into the saved PNG —
        // that's the "editing box" showing up in the public book. Deselect,
        // force a synchronous redraw, capture, then restore selection.
        const transformerNodes = stageRef.current.find("Transformer");
        const prevVisibility = transformerNodes.map((n) => n.visible());
        transformerNodes.forEach((n) => n.visible(false));
        stageRef.current.batchDraw();
        try {
          const captureScale = (1 / effectiveScale) * EXPORT_PIXEL_RATIO;
          previewImage = stageRef.current.toDataURL({
            pixelRatio: captureScale,
          });
        } catch (err) {
          console.error("Preview capture failed, saving content anyway:", err);
        } finally {
          transformerNodes.forEach((n, i) => n.visible(prevVisibility[i]));
          stageRef.current.batchDraw();
        }
      }

      const run = () =>
        api
          .patch(`/pages/${pageId}`, {
            content: { elements: els, background: bg },
            ...(highRes && previewImage ? { previewImage } : {}),
          })
          .then((res) => {
            setSaveStatus("saved");
            isDirtyRef.current = false;
            setPages((prev) =>
              prev.map((p) =>
                p.id === pageId
                  ? {
                      ...p,
                      content: { elements: els, background: bg },
                      ...(highRes && previewImage ? { previewImage } : {}),
                    }
                  : p,
              ),
            );
            return res;
          })
          .catch((err) => {
            console.error("Save failed:", err);
            setSaveStatus("idle");
            throw err;
          });

      const chained = saveChainRef.current.then(run, run);
      saveChainRef.current = chained.catch(() => {});
      return chained;
    },
    [effectiveScale, selectedId],
  );

  const debouncedSave = useRef(
    debounce((pageId, els, bg) => {
      const promise = saveNow(pageId, els, bg, true);
      pendingSaveRef.current = promise;
    }, 1000),
  ).current;

  useEffect(() => {
    if (skipNextAutosaveRef.current) {
      skipNextAutosaveRef.current = false;
      return;
    }
    if (activePage) {
      setSaveStatus("saving");
      debouncedSave(activePage.id, elements, background);
    }
  }, [elements, background]);

  // cancel any pending debounced save if the editor unmounts
  useEffect(() => {
    return () => {
      debouncedSave.cancel();
    };
  }, [debouncedSave]);

  // ---- ctrl+s ----
  useEffect(() => {
    const handler = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault();
        debouncedSave.cancel();
        if (activePage && isDirtyRef.current) {
          saveNow(activePage.id, elements, background, true);
        }
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [activePage, elements, background, saveNow, debouncedSave]);

  // Live update (no history entry) - used while dragging sliders/typing etc, for smooth preview.
  const updateElementLive = (idx, newAttrs) => {
    setElements((prev) => prev.map((el, i) => (i === idx ? newAttrs : el)));
  };

  // Committed update (creates an undo step, and re-clamps into padding via commit) -
  // used on drag/transform end and discrete field edits.
  const updateElement = (idx, newAttrs) => {
    commit(elements.map((el, i) => (i === idx ? newAttrs : el)));
  };

  const deleteLayer = (idx) => {
    commit(elements.filter((_, i) => i !== idx));
    if (selectedId === idx) setSelectedId(null);
    setSelectedLayerIds((prev) => {
      const next = new Set(prev);
      next.delete(idx);
      return next;
    });
  };

  const toggleLayerHidden = (idx) => {
    commit(
      elements.map((el, i) => (i === idx ? { ...el, hidden: !el.hidden } : el)),
    );
  };

  const bringToFront = () => {
    if (selectedId === null) return;
    const copy = [...elements];
    const [item] = copy.splice(selectedId, 1);
    copy.push(item);
    commit(copy);
    setSelectedId(copy.length - 1);
  };

  const sendToBack = () => {
    if (selectedId === null) return;
    const copy = [...elements];
    const [item] = copy.splice(selectedId, 1);
    copy.unshift(item);
    commit(copy);
    setSelectedId(0);
  };

  // reorder via layers panel drag & drop (fromIdx/toIdx are actual array indices)
  const reorderLayer = (fromIdx, toIdx) => {
    if (fromIdx === toIdx) return;
    const copy = [...elements];
    const [item] = copy.splice(fromIdx, 1);
    copy.splice(toIdx, 0, item);
    commit(copy);
    setSelectedId(null);
  };

  const toggleLayerMergeSelect = (idx) => {
    setSelectedLayerIds((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  };

  // ---- group selected layers into one movable/resizable unit ----
  const mergeSelectedLayers = () => {
    const indices = Array.from(selectedLayerIds).sort((a, b) => a - b);
    if (indices.length < 2) return;

    let box = null;
    indices.forEach((i) => {
      const el = elements[i];
      const { width, height } = elementSize(el);
      const ex = el.shapeType === "circle" ? el.x - el.radius : el.x;
      const ey = el.shapeType === "circle" ? el.y - el.radius : el.y;
      box = unionRect(box, { x: ex, y: ey, width, height });
    });
    if (!box || box.width <= 0 || box.height <= 0) return;

    const indexSet = new Set(indices);
    const children = indices.map((i) => {
      const el = elements[i];
      return { ...el, x: el.x - box.x, y: el.y - box.y };
    });

    const kept = elements.filter((_, i) => !indexSet.has(i));
    const groupElement = {
      type: "group",
      x: box.x,
      y: box.y,
      width: box.width,
      height: box.height,
      rotation: 0,
      scaleX: 1,
      scaleY: 1,
      children,
    };
    commit([...kept, groupElement]);
    setSelectedLayerIds(new Set());
    setSelectedId(kept.length); // the newly created group is now last
  };

  // ---- split a group back into independent, editable elements ----
  const ungroupSelected = () => {
    if (selectedId === null) return;
    const group = elements[selectedId];
    if (!group || group.type !== "group") return;

    const theta = ((group.rotation || 0) * Math.PI) / 180;
    const sx = group.scaleX ?? 1;
    const sy = group.scaleY ?? 1;
    const cos = Math.cos(theta);
    const sin = Math.sin(theta);
    const avgScale = (sx + sy) / 2;

    const expanded = (group.children || []).map((child) => {
      const lx = child.x * sx;
      const ly = child.y * sy;
      const rx = lx * cos - ly * sin;
      const ry = lx * sin + ly * cos;

      const next = {
        ...child,
        x: group.x + rx,
        y: group.y + ry,
        rotation: (child.rotation || 0) + (group.rotation || 0),
      };
      if (child.type === "shape" && child.shapeType === "circle") {
        next.radius = (child.radius || 0) * avgScale;
      } else {
        if (child.width !== undefined) next.width = (child.width || 0) * sx;
        if (child.height !== undefined) next.height = (child.height || 0) * sy;
      }
      return next;
    });

    const rest = elements.filter((_, i) => i !== selectedId);
    commit([...rest, ...expanded]);
    setSelectedId(null);
    setContextMenu(null);
  };

  const addText = () => {
    const fontSize = clamp(book.widthPx * 0.07, 16, 96);
    const width = Math.min(book.widthPx * 0.6, book.widthPx - 40);
    commit([
      ...elements,
      {
        type: "text",
        x: clamp((book.widthPx - width) / 2, 0, book.widthPx - width),
        y: (book.heightPx - fontSize) / 2,
        text: "Double click to edit",
        fontSize,
        fill: "#111111",
        fontFamily: "Roboto",
        width,
        align: "left",
      },
    ]);
  };

  const addMalayalamTextValue = (text) => {
    const fontSize = clamp(book.widthPx * 0.07, 16, 96);
    const width = Math.min(book.widthPx * 0.6, book.widthPx - 40);
    commit([
      ...elements,
      {
        type: "text",
        x: clamp((book.widthPx - width) / 2, 0, book.widthPx - width),
        y: (book.heightPx - fontSize) / 2,
        text,
        fontSize,
        fill: "#111111",
        fontFamily: "Noto Sans Malayalam",
        width,
        align: "left",
      },
    ]);
  };

  const addTextMalayalam = () => addMalayalamTextValue("ഇവിടെ ടൈപ്പ് ചെയ്യുക");

  const addImage = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const fd = new FormData();
    fd.append("file", file);
    api
      .post("/assets/upload", fd, {
        headers: { "Content-Type": "multipart/form-data" },
      })
      .then(({ data }) => {
        const size = clamp(
          Math.min(book.widthPx, book.heightPx) * 0.28,
          60,
          500,
        );
        commit([
          ...elements,
          {
            type: "image",
            x: (book.widthPx - size) / 2,
            y: (book.heightPx - size) / 2,
            width: size,
            height: size,
            src: data.url,
            brightness: 0,
            contrast: 0,
            clipShape: "none",
          },
        ]);
      });
    e.target.value = "";
  };

  const addShape = (shapeType) => {
    const unit = Math.min(book.widthPx, book.heightPx);
    const cx = book.widthPx / 2;
    const cy = book.heightPx / 2;
    const base = { type: "shape", shapeType, x: cx, y: cy, fill: "#3b82f6" };
    let extra = {};
    if (shapeType === "circle") extra = { radius: unit * 0.09 };
    else if (shapeType === "triangle") extra = { radius: unit * 0.1 };
    else if (shapeType === "star")
      extra = { outerRadius: unit * 0.1, innerRadius: unit * 0.045, points: 5 };
    else if (shapeType === "line")
      extra = {
        width: book.widthPx * 0.3,
        strokeWidth: Math.max(2, unit * 0.006),
      };
    else extra = { width: book.widthPx * 0.18, height: book.heightPx * 0.13 }; // rect
    commit([...elements, { ...base, ...extra }]);
  };

  const addBackgroundImage = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const fd = new FormData();
    fd.append("file", file);
    api
      .post("/assets/upload", fd, {
        headers: { "Content-Type": "multipart/form-data" },
      })
      .then(({ data }) => {
        commit(undefined, { ...background, image: data.url });
      });
    e.target.value = "";
  };

  const [coverUploading, setCoverUploading] = useState(false);
  const [backCoverUploading, setBackCoverUploading] = useState(false);

  const handleReplaceCover = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const fd = new FormData();
    fd.append("coverFile", file);
    setCoverUploading(true);
    api
      .post(`/books/${book.id}/cover`, fd, {
        headers: { "Content-Type": "multipart/form-data" },
      })
      .then(({ data }) => setBook(data))
      .finally(() => setCoverUploading(false));
    e.target.value = "";
  };

  const handleReplaceBackCover = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const fd = new FormData();
    fd.append("backCoverFile", file);
    setBackCoverUploading(true);
    api
      .patch(`/books/${book.id}/settings`, fd, {
        headers: { "Content-Type": "multipart/form-data" },
      })
      .then(({ data }) => setBook(data))
      .finally(() => setBackCoverUploading(false));
    e.target.value = "";
  };

  const clearBackgroundImage = () =>
    commit(undefined, { ...background, image: null });

  const setGradient = (patch) => {
    const current = background.gradient || {
      type: "linear",
      color1: "#6366f1",
      color2: "#ec4899",
      angle: 90,
      intensity: 1,
    };
    commit(undefined, { ...background, gradient: { ...current, ...patch } });
  };

  const clearGradient = () =>
    commit(undefined, { ...background, gradient: null });

  // Captures one page at the chosen quality preset, saves it, returns the
  // real byte size of what was captured (not a guess — computed from the
  // actual base64 payload after capture).
  const capturePageWithPreset = useCallback(
    async (page, presetKey) => {
      const preset = EXPORT_QUALITY_PRESETS[presetKey];
      loadPage(page);
      await new Promise((r) => setTimeout(r, 350)); // let images/fonts settle

      const transformerNodes = stageRef.current.find("Transformer");
      const prevVisibility = transformerNodes.map((n) => n.visible());
      transformerNodes.forEach((n) => n.visible(false));
      stageRef.current.batchDraw();

      let dataUrl;
      try {
        let captureScale;
        if (preset.native) {
          // Render at exactly the page's real pixel size — 1:1, no
          // oversampling from zoom/EXPORT_PIXEL_RATIO. Still lossless PNG,
          // so text and lines stay perfectly crisp at normal view/print
          // size; the only thing removed is wasted invisible extra pixels.
          captureScale = 1 / effectiveScale;
        } else if (preset.maxDim) {
          const rawScale = (1 / effectiveScale) * EXPORT_PIXEL_RATIO;
          captureScale = Math.max(
            1,
            Math.min(
              rawScale,
              preset.maxDim / Math.max(book.widthPx, book.heightPx),
            ),
          );
        } else {
          captureScale = (1 / effectiveScale) * EXPORT_PIXEL_RATIO;
        }
        const opts = { pixelRatio: captureScale };
        if (preset.mimeType) {
          opts.mimeType = preset.mimeType;
          opts.quality = preset.quality;
        }
        dataUrl = stageRef.current.toDataURL(opts);
      } finally {
        transformerNodes.forEach((n, i) => n.visible(prevVisibility[i]));
        stageRef.current.batchDraw();
      }

      await api.patch(`/pages/${page.id}`, {
        content: page.content,
        previewImage: dataUrl,
      });
      setPages((prev) =>
        prev.map((p) =>
          p.id === page.id ? { ...p, previewImage: dataUrl } : p,
        ),
      );

      const base64 = dataUrl.split(",")[1] || "";
      return Math.floor((base64.length * 3) / 4); // real bytes, not estimated
    },
    [book, effectiveScale],
  );

  const runExport = async () => {
    setExporting(true);
    setExportProgress({ done: 0, total: pages.length, bytes: 0 });
    let totalBytes = 0;
    for (let i = 0; i < pages.length; i++) {
      const bytes = await capturePageWithPreset(pages[i], exportPreset);
      totalBytes += bytes;
      setExportProgress({
        done: i + 1,
        total: pages.length,
        bytes: totalBytes,
      });
    }

    try {
      const res = await api.get(`/books/${book.id}/pdf`, {
        responseType: "blob",
      });
      const url = window.URL.createObjectURL(res.data);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${book.title || "book"}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error("PDF download failed:", err);
      alert("Failed to generate PDF. Please try again.");
    } finally {
      setExporting(false);
      setShowExportModal(false);
    }
  };

  // ---- non-blocking page switch: navigate immediately, save the outgoing
  // page in the background (only if it's actually dirty) ----
  const switchPage = (idx) => {
    debouncedSave.cancel();
    const prevPage = activePage;
    const prevElements = elements;
    const prevBackground = background;
    const shouldSave = isDirtyRef.current;

    // Sync the outgoing page's edits into local `pages` state RIGHT NOW,

    // Sync the outgoing page's edits into local `pages` state RIGHT NOW,
    // synchronously — don't wait for the network save. This is what was
    // missing: pages[i].content was never updated after edits, only
    // previewImage was, so navigating away and back re-loaded stale content.
    if (prevPage) {
      setPages((prev) =>
        prev.map((p) =>
          p.id === prevPage.id
            ? {
                ...p,
                content: { elements: prevElements, background: prevBackground },
              }
            : p,
        ),
      );
    }
    setActivePageIdx(idx);
    loadPage(pages[idx]);
    setContextMenu(null);

    if (prevPage && shouldSave) {
      setTimeout(() => {
        saveNow(prevPage.id, prevElements, prevBackground, true);
      }, 0);
    }
  };

  const addPage = async (copyContent) => {
    debouncedSave.cancel();
    if (activePage && isDirtyRef.current) {
      setPages((prev) =>
        prev.map((p) =>
          p.id === activePage.id
            ? { ...p, content: { elements, background } }
            : p,
        ),
      );
      saveNow(activePage.id, elements, background, true); // fire and forget
    }
    const { data } = await api.post(`/books/${bookId}/pages`, {
      copyFromPageId: copyContent ? activePage.id : undefined,
      sameBackground: copyContent,
    });
    const newPages = [...pages, data];
    setPages(newPages);
    setActivePageIdx(newPages.length - 1);
    loadPage(data);
    setContextMenu(null);
    await saveNow(
      data.id,
      data.content?.elements || [],
      data.content?.background || background,
      true,
    );
  };

  const deletePage = async (idx) => {
    if (pages.length <= 1) {
      alert("A book needs at least one page.");
      return;
    }
    if (!confirm(`Delete Page ${idx + 1}? This cannot be undone.`)) return;
    debouncedSave.cancel();
    await api.delete(`/pages/${pages[idx].id}`);
    const remaining = pages.filter((_, i) => i !== idx);
    setPages(remaining);
    const nextIdx =
      idx === 0
        ? 0
        : idx - 1 >= remaining.length
          ? remaining.length - 1
          : Math.min(idx, remaining.length - 1);
    setActivePageIdx(nextIdx);
    loadPage(remaining[nextIdx]);
  };

  const reorderPages = async (fromIdx, toIdx) => {
    if (fromIdx === toIdx) return;
    const copy = [...pages];
    const [item] = copy.splice(fromIdx, 1);
    copy.splice(toIdx, 0, item);

    const prevActiveId = activePage?.id;
    setPages(copy);
    if (prevActiveId) {
      setActivePageIdx(copy.findIndex((p) => p.id === prevActiveId));
    }

    try {
      await api.patch(`/books/${bookId}/pages/reorder`, {
        orderedIds: copy.map((p) => p.id),
      });
    } catch (err) {
      console.error("Reorder failed:", err);
      alert("Couldn't save new page order. Please try again.");
    }
  };

  // ---- true swap: exchange two pages' positions, nothing else moves ----
  const swapPages = async (idxA, idxB) => {
    if (idxA === idxB || idxA == null || idxB == null) return;
    const copy = [...pages];
    [copy[idxA], copy[idxB]] = [copy[idxB], copy[idxA]];

    const prevActiveId = activePage?.id;
    setPages(copy);
    if (prevActiveId) {
      setActivePageIdx(copy.findIndex((p) => p.id === prevActiveId));
    }

    try {
      await api.patch(`/books/${bookId}/pages/reorder`, {
        orderedIds: copy.map((p) => p.id),
      });
    } catch (err) {
      console.error("Swap failed:", err);
      alert("Couldn't save the swap. Please try again.");
    }
  };

  // ---- Page Style -> Apply to all pages ----
  // Copies only margin / padding / border to every page (each page keeps its
  // own elements, background color/gradient/image). Content on every page
  // that would now sit outside the new padding is nudged back inside.
  const applyPageStyleToAll = async () => {
    if (pages.length <= 1) return;
    if (
      !confirm(
        "Apply this margin, padding, and border to ALL pages in the book?\n\nEach page keeps its own text, images and shapes — only these page-style settings change.",
      )
    )
      return;

    setApplyingStyleToAll(true);
    try {
      const styleFields = {
        margin: background.margin || 0,
        padding: background.padding || 0,
        border: background.border || null,
      };
      const bounds = contentBoundsFor({ ...background, ...styleFields }, book);

      const results = await Promise.all(
        pages.map(async (p) => {
          const isActive = p.id === activePage.id;
          const pageElements = isActive ? elements : p.content?.elements || [];
          const pageBackground = {
            ...(isActive ? background : p.content?.background || {}),
            ...styleFields,
          };
          const clampedElements = pageElements.map((el) =>
            clampElementToBounds(el, bounds),
          );
          const content = {
            elements: clampedElements,
            background: pageBackground,
          };
          await api.patch(`/pages/${p.id}`, { content });
          return { id: p.id, content };
        }),
      );

      setPages((prev) =>
        prev.map((p) => {
          const r = results.find((x) => x.id === p.id);
          return r ? { ...p, content: r.content } : p;
        }),
      );

      const activeResult = results.find((r) => r.id === activePage.id);
      if (activeResult) {
        setElements(activeResult.content.elements);
        setBackground(activeResult.content.background);
        isDirtyRef.current = false;
      }
    } catch (err) {
      console.error("Apply page style to all pages failed:", err);
      alert("Couldn't apply the style to all pages. Please try again.");
    } finally {
      setApplyingStyleToAll(false);
    }
  };

  const addIndexPage = async (presetId = "classic-serif") => {
    debouncedSave.cancel();
    if (activePage && isDirtyRef.current) {
      saveNow(activePage.id, elements, background, true);
    }
    const preset =
      INDEX_PRESETS.find((p) => p.id === presetId) || INDEX_PRESETS[0];
    const entries = buildIndexEntries(pages, book.coverImage ? 1 : 0);
    const { background: genBg, elements: genEls } = generateIndexContent(
      preset,
      book,
      entries,
    );
    genBg.meta.indexEntries = entries;

    const { data } = await api.post(`/books/${bookId}/pages`, {
      insertAtStart: true,
    });
    const newPages = [data, ...pages].sort((a, b) => a.order - b.order);
    setPages(newPages);
    const idx = newPages.findIndex((p) => p.id === data.id);
    setActivePageIdx(idx);
    loadPage(data);
    setElements(genEls);
    setBackground(genBg);
    isDirtyRef.current = true;
    await saveNow(data.id, genEls, genBg, true);
    setShowIndexPresets(false);
  };

  const applyIndexPreset = (presetId) => {
    const preset = INDEX_PRESETS.find((p) => p.id === presetId);
    if (!preset) return;
    const prevEntries = background?.meta?.indexEntries || [];
    const entries = buildIndexEntries(
      pages,
      book.coverImage ? 1 : 0,
      prevEntries,
    );
    const { background: genBg, elements: genEls } = generateIndexContent(
      preset,
      book,
      entries,
    );
    genBg.meta.indexEntries = entries;
    commit(genEls, genBg);
    setShowIndexPresets(false);
  };

  const refreshIndexEntries = () => {
    if (!isIndexPage) return;
    const preset =
      INDEX_PRESETS.find((p) => p.id === background.meta.indexPresetId) ||
      INDEX_PRESETS[0];
    const entries = buildIndexEntries(
      pages,
      book.coverImage ? 1 : 0,
      background.meta.indexEntries,
    );
    const { background: genBg, elements: genEls } = generateIndexContent(
      preset,
      book,
      entries,
    );
    genBg.meta.indexEntries = entries;
    commit(genEls, genBg);
  };

  // Applies the { action, targetIndex, changes, newElement } result from
  // POST /api/ai/command directly onto the current page's elements.
  const applyAIAction = (result) => {
    if (!result || result.action === "none") return;
    if (
      result.action === "update" &&
      result.targetIndex != null &&
      elements[result.targetIndex]
    ) {
      updateElement(result.targetIndex, {
        ...elements[result.targetIndex],
        ...result.changes,
      });
    } else if (
      result.action === "delete" &&
      result.targetIndex != null &&
      elements[result.targetIndex]
    ) {
      deleteLayer(result.targetIndex);
    } else if (result.action === "add" && result.newElement) {
      commit([...elements, result.newElement]);
    }
  };

  const handleContextMenu = (e, shape) => {
    e.evt.preventDefault();
    const idx = elements.indexOf(shape);
    setSelectedId(idx);
    setContextMenu({ x: e.evt.clientX, y: e.evt.clientY, idx });
  };

  if (!book || !activePage)
    return <div className="container py-5">Loading...</div>;

  const selectedShape = selectedId !== null ? elements[selectedId] : null;

  const bgProps = (() => {
    const g = background.gradient;
    if (!g) return { fill: background.color || "#ffffff" };
    const cx = book.widthPx / 2;
    const cy = book.heightPx / 2;
    if (g.type === "radial") {
      const r =
        (Math.max(book.widthPx, book.heightPx) / 2) * (g.intensity ?? 1);
      return {
        fillRadialGradientStartPoint: { x: cx, y: cy },
        fillRadialGradientStartRadius: 0,
        fillRadialGradientEndPoint: { x: cx, y: cy },
        fillRadialGradientEndRadius: Math.max(1, r),
        fillRadialGradientColorStops: [0, g.color1, 1, g.color2],
      };
    }
    const angle = ((g.angle ?? 90) * Math.PI) / 180;
    const len =
      (Math.sqrt(book.widthPx ** 2 + book.heightPx ** 2) / 2) *
      (g.intensity ?? 1);
    const x1 = cx - Math.cos(angle) * len;
    const y1 = cy - Math.sin(angle) * len;
    const x2 = cx + Math.cos(angle) * len;
    const y2 = cy + Math.sin(angle) * len;
    return {
      fillLinearGradientStartPoint: { x: x1, y: y1 },
      fillLinearGradientEndPoint: { x: x2, y: y2 },
      fillLinearGradientColorStops: [0, g.color1, 1, g.color2],
    };
  })();

  return (
    <div
      className="d-flex flex-column"
      style={{ height: "100vh", overflow: "hidden" }}
    >
      {/* Top bar */}
      <div className="d-flex align-items-center justify-content-between border-bottom p-2 bg-white flex-shrink-0 px-3">
        <div className="d-flex align-items-center gap-2">
          <button
            className="btn btn-sm btn-outline-secondary"
            onClick={() => navigate(-1)}
            title="Back"
          >
            <ArrowLeft size={16} />
          </button>
          <button
            className="btn btn-sm btn-outline-secondary d-md-none"
            onClick={() => setShowToolbar(true)}
          >
            Tools
          </button>
          <span className="fw-semibold small text-truncate">{book.title}</span>
        </div>
        <div className="d-flex align-items-center gap-2">
          <button
            className="btn btn-sm btn-outline-secondary"
            onClick={undo}
            disabled={!undoStackRef.current.length}
            title="Undo (Ctrl+Z)"
          >
            <Undo2 size={16} />
          </button>
          <button
            className="btn btn-sm btn-outline-secondary"
            onClick={redo}
            disabled={!redoStackRef.current.length}
            title="Redo (Ctrl+Shift+Z)"
          >
            <Redo2 size={16} />
          </button>
          <SaveIndicator status={saveStatus} />
          <button
            className="btn btn-sm btn-outline-secondary"
            onClick={() => setShowPageStyle(true)}
          >
            Page Style
          </button>
          <button
            className="btn btn-sm btn-outline-secondary"
            onClick={() => setShowBookSettings(true)}
          >
            Book Settings
          </button>
          <button
            className="btn btn-sm btn-outline-primary"
            onClick={() => setShowAIPanel(true)}
          >
            ✨ AI
          </button>
          <button
            className="btn btn-sm btn-dark"
            onClick={() => setShowPreview(true)}
          >
            Preview
          </button>
          <button
            className="btn btn-sm btn-outline-dark"
            onClick={() => setShowExportModal(true)}
          >
            Export PDF
          </button>
          <button
            className="btn btn-sm btn-outline-secondary d-md-none"
            onClick={() => setShowLayers(true)}
          >
            Layers
          </button>
          <button
            className="btn btn-sm btn-outline-secondary d-md-none"
            onClick={() => setShowPages(true)}
          >
            Pages
          </button>
        </div>
      </div>

      <div className="d-flex flex-grow-1" style={{ minHeight: 0 }}>
        {/* Left toolbar - desktop */}
        <div
          className="d-none d-md-flex flex-column border-end bg-white p-2 gap-1 flex-shrink-0"
          style={{ width: "230px", overflowY: "auto", fontSize: "0.85rem" }}
        >
          <ToolbarButtons
            addText={addText}
            addTextMalayalam={addTextMalayalam}
            onOpenTransliterate={() => setShowTransliterateModal(true)}
            addImage={addImage}
            addShape={addShape}
            addPage={addPage}
            background={background}
            setBackground={(updater) =>
              commit(
                undefined,
                typeof updater === "function" ? updater(background) : updater,
              )
            }
            addBackgroundImage={addBackgroundImage}
            clearBackgroundImage={clearBackgroundImage}
            setGradient={setGradient}
            clearGradient={clearGradient}
          />

          <button
            onClick={() => setShowIndexPresets(true)}
            className="btn btn-outline-secondary btn-sm w-100 mt-1"
          >
            + Index Page
          </button>
          {isIndexPage && (
            <div className="border rounded-2 p-2 mt-1 small bg-light">
              <p className="fw-semibold mb-1">Index Page</p>
              <button
                className="btn btn-sm btn-outline-secondary w-100 mb-1"
                onClick={() => setShowIndexPresets(true)}
              >
                Change Style
              </button>
              <button
                className="btn btn-sm btn-outline-secondary w-100"
                onClick={refreshIndexEntries}
              >
                Refresh Page List
              </button>
            </div>
          )}

          {selectedShape && (
            <SelectedPanel
              shape={selectedShape}
              onChangeLive={(attrs) => updateElementLive(selectedId, attrs)}
              onChangeCommit={(attrs) => updateElement(selectedId, attrs)}
              onFront={bringToFront}
              onBack={sendToBack}
              onDelete={deleteSelected}
              onOpenSettings={() => setSettingsModalShape(selectedId)}
              onUngroup={ungroupSelected}
              onDuplicate={duplicateSelected}
            />
          )}
        </div>

        {/* Canvas */}
        <div
          className="flex-grow-1 position-relative"
          style={{ minWidth: 0, minHeight: 0 }}
        >
          <div
            ref={canvasWrapRef}
            className="w-100 h-100 d-flex p-3"
            style={{
              overflow: "auto",
              alignItems: zoom <= 1 ? "center" : "flex-start",
              justifyContent: zoom <= 1 ? "center" : "flex-start",
            }}
            onWheel={handleWheel}
          >
            <div style={{ border: "2px dashed #adb5bd", padding: 2 }}>
              <Stage
                ref={stageRef}
                width={book.widthPx * effectiveScale}
                height={book.heightPx * effectiveScale}
                scaleX={effectiveScale}
                scaleY={effectiveScale}
                style={{ boxShadow: "0 4px 20px rgba(0,0,0,0.08)" }}
                onMouseDown={(e) => {
                  if (e.target === e.target.getStage()) {
                    setSelectedId(null);
                    setContextMenu(null);
                  }
                }}
                onContextMenu={(e) => e.evt.preventDefault()}
              >
                <Layer
                  ref={layerRef}
                  clipX={0}
                  clipY={0}
                  clipWidth={book.widthPx}
                  clipHeight={book.heightPx}
                >
                  <Rect
                    x={0}
                    y={0}
                    width={book.widthPx}
                    height={book.heightPx}
                    {...bgProps}
                    listening={false}
                  />
                  {background.image && (
                    <KonvaImage
                      image={bgImg}
                      x={0}
                      y={0}
                      width={book.widthPx}
                      height={book.heightPx}
                      listening={false}
                    />
                  )}

                  {background.border &&
                    (() => {
                      const preset =
                        BORDER_PRESETS.find(
                          (p) => p.id === background.border.presetId,
                        ) || BORDER_PRESETS[0];
                      const m = background.margin || 0;
                      const bw = background.border.width || preset.width || 3;
                      const color = background.border.color || "#000000";
                      const radius =
                        background.border.radius ?? preset.radius ?? 0;

                      if (preset.double) {
                        const gap = preset.gap || 6;
                        return (
                          <>
                            <Rect
                              x={m}
                              y={m}
                              width={book.widthPx - m * 2}
                              height={book.heightPx - m * 2}
                              stroke={color}
                              strokeWidth={bw}
                              cornerRadius={radius}
                              listening={false}
                            />
                            <Rect
                              x={m + gap}
                              y={m + gap}
                              width={book.widthPx - (m + gap) * 2}
                              height={book.heightPx - (m + gap) * 2}
                              stroke={color}
                              strokeWidth={bw}
                              cornerRadius={radius}
                              listening={false}
                            />
                          </>
                        );
                      }

                      return (
                        <Rect
                          x={m}
                          y={m}
                          width={book.widthPx - m * 2}
                          height={book.heightPx - m * 2}
                          stroke={color}
                          strokeWidth={bw}
                          cornerRadius={radius}
                          dash={preset.dash || undefined}
                          lineCap={preset.lineCap || "butt"}
                          listening={false}
                        />
                      );
                    })()}

                  {background.padding > 0 && (
                    <Rect
                      x={(background.margin || 0) + background.padding}
                      y={(background.margin || 0) + background.padding}
                      width={
                        book.widthPx -
                        ((background.margin || 0) + background.padding) * 2
                      }
                      height={
                        book.heightPx -
                        ((background.margin || 0) + background.padding) * 2
                      }
                      stroke="#999999"
                      strokeWidth={1}
                      dash={[4, 4]}
                      opacity={0.5}
                      listening={false}
                    />
                  )}

                  {elements.map((shape, idx) => {
                    const commonSelectProps = {
                      name: `el-${idx}`,
                      shape,
                      isSelected: selectedId === idx,
                      onSelect: () => setSelectedId(idx),
                      onContext: handleContextMenu,
                      onChange: (attrs) => updateElement(idx, attrs),
                      onEditRichText: () => setRichTextModalIdx(idx),
                      pageWidth: book.widthPx,
                      pageHeight: book.heightPx,
                    };
                    if (shape.type === "image")
                      return <CanvasImage key={idx} {...commonSelectProps} />;
                    if (shape.type === "shape")
                      return <CanvasShape key={idx} {...commonSelectProps} />;
                    if (shape.type === "group")
                      return <CanvasGroup key={idx} {...commonSelectProps} />;
                    return <CanvasText key={idx} {...commonSelectProps} />;
                  })}
                  {(() => {
                    const override = background.pageNumber;
                    const style =
                      override?.mode === "custom"
                        ? override
                        : override?.mode === "hidden"
                          ? null
                          : book.pageNumberDefault;
                    if (!style || !style.enabled) return null;
                    const text = (style.format || "{n}")
                      .replace("{n}", activePageIdx + 1)
                      .replace("{total}", pages.length);
                    const isFreeDrag =
                      override?.mode === "custom" && override?.freeDrag;

                    let x, y, width, align;
                    if (isFreeDrag && override.xFrac != null) {
                      x = override.xFrac * book.widthPx;
                      y = override.yFrac * book.heightPx;
                      width = undefined;
                      align = "left";
                    } else {
                      const m = 24;
                      const posMap = {
                        "top-left": { x: m, y: m, align: "left" },
                        "top-center": {
                          x: 0,
                          y: m,
                          align: "center",
                          width: book.widthPx,
                        },
                        "top-right": {
                          x: book.widthPx - m - 100,
                          y: m,
                          align: "right",
                          width: 100,
                        },
                        "bottom-left": {
                          x: m,
                          y: book.heightPx - m - 24,
                          align: "left",
                        },
                        "bottom-center": {
                          x: 0,
                          y: book.heightPx - m - 24,
                          align: "center",
                          width: book.widthPx,
                        },
                        "bottom-right": {
                          x: book.widthPx - m - 100,
                          y: book.heightPx - m - 24,
                          align: "right",
                          width: 100,
                        },
                      };
                      const pos = posMap[style.position || "bottom-center"];
                      x = pos.x;
                      y = pos.y;
                      width = pos.width;
                      align = pos.align;
                    }

                    return (
                      <Text
                        text={text}
                        x={x}
                        y={y}
                        width={width}
                        align={align}
                        fontSize={style.fontSize || 16}
                        fill={style.color || "#111111"}
                        draggable={isFreeDrag}
                        listening={isFreeDrag}
                        onDragEnd={
                          isFreeDrag
                            ? (e) => {
                                const nx = clamp(
                                  e.target.x() / book.widthPx,
                                  0,
                                  1,
                                );
                                const ny = clamp(
                                  e.target.y() / book.heightPx,
                                  0,
                                  1,
                                );
                                commit(undefined, {
                                  ...background,
                                  pageNumber: {
                                    ...background.pageNumber,
                                    xFrac: nx,
                                    yFrac: ny,
                                  },
                                });
                              }
                            : undefined
                        }
                      />
                    );
                  })()}
                </Layer>
              </Stage>
            </div>
          </div>

          {/* Zoom control */}
          <div
            className="position-absolute d-flex align-items-center gap-1 bg-white border rounded-pill shadow-sm px-1 py-1"
            style={{ top: 12, right: 12, zIndex: 10 }}
          >
            <button
              className="btn btn-sm btn-light rounded-circle p-0"
              style={{ width: 28, height: 28, lineHeight: 1 }}
              onClick={zoomOut}
              title="Zoom out"
            >
              −
            </button>
            <button
              className="btn btn-sm btn-light px-2 py-0 small"
              style={{ minWidth: 48 }}
              onClick={zoomReset}
              title="Reset zoom"
            >
              {Math.round(zoom * 100)}%
            </button>
            <button
              className="btn btn-sm btn-light rounded-circle p-0"
              style={{ width: 28, height: 28, lineHeight: 1 }}
              onClick={zoomIn}
              title="Zoom in"
            >
              +
            </button>
          </div>
        </div>

        {/* Right: Layers + Pages - desktop */}
        <div
          className="d-none d-md-flex flex-column border-start bg-white flex-shrink-0"
          style={{ width: "210px", overflowY: "auto", fontSize: "0.85rem" }}
        >
          <div className="p-2 border-bottom">
            <p className="fw-semibold small text-muted text-uppercase mb-2">
              Layers
            </p>
            <LayersPanel
              elements={elements}
              selectedId={selectedId}
              setSelectedId={setSelectedId}
              selectedLayerIds={selectedLayerIds}
              toggleLayerMergeSelect={toggleLayerMergeSelect}
              toggleLayerHidden={toggleLayerHidden}
              deleteLayer={deleteLayer}
              reorderLayer={reorderLayer}
              mergeSelectedLayers={mergeSelectedLayers}
            />
          </div>
          <div className="p-2">
            <div className="d-flex align-items-center justify-content-between mb-2">
              <p className="fw-semibold small text-muted text-uppercase mb-0">
                Pages{" "}
                <span className="text-muted fw-normal">({pages.length})</span>
              </p>
              <button
                className="btn btn-sm btn-outline-secondary py-0 px-1"
                style={{ fontSize: 11 }}
                onClick={() => {
                  setSwapSourceIdx(null);
                  setShowPageManager(true);
                }}
                title="Swap or freely reorder pages"
              >
                <ArrowLeftRight size={11} className="me-1" />
                Swap
              </button>
            </div>
            <div className="d-flex flex-column gap-2">
              <PageList
                book={book}
                pages={pages}
                activePageIdx={activePageIdx}
                switchPage={switchPage}
                deletePage={deletePage}
                reorderPages={reorderPages}
                onSwapClick={(idx) => {
                  setSwapSourceIdx(idx);
                  setShowPageManager(true);
                }}
                onReplaceCover={handleReplaceCover}
                onReplaceBackCover={handleReplaceBackCover}
                coverUploading={coverUploading}
                backCoverUploading={backCoverUploading}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Context menu */}
      {contextMenu && (
        <div
          className="position-fixed bg-white border rounded shadow-sm py-1 text-center"
          style={{
            top: contextMenu.y,
            left: contextMenu.x,
            zIndex: 2000,
            minWidth: 160,
          }}
        >
          {elements[contextMenu.idx]?.type === "group" && (
            <button
              className="dropdown-item small py-2 text-center"
              onClick={ungroupSelected}
            >
              Ungroup
            </button>
          )}
          <button
            className="dropdown-item small py-2 text-center"
            onClick={() => {
              copySelected();
              setContextMenu(null);
            }}
          >
            Copy
          </button>
          <button
            className="dropdown-item small py-2 text-center"
            onClick={() => {
              pasteClipboard();
              setContextMenu(null);
            }}
          >
            Paste (offset)
          </button>
          <button
            className="dropdown-item small py-2 text-center"
            onClick={() => {
              setSettingsModalShape(contextMenu.idx);
              setContextMenu(null);
            }}
          >
            Settings
          </button>
          {elements[contextMenu.idx]?.type === "text" && (
            <button
              className="dropdown-item small py-2 text-center"
              onClick={() => {
                setSelectedId(contextMenu.idx);
                setShowTransliterateModal(true);
                setContextMenu(null);
              }}
            >
              Translation
            </button>
          )}
          <button
            className="dropdown-item small py-2 text-center"
            onClick={() => {
              bringToFront();
              setContextMenu(null);
            }}
          >
            Bring to Front
          </button>
          <button
            className="dropdown-item small py-2 text-center"
            onClick={() => {
              sendToBack();
              setContextMenu(null);
            }}
          >
            Send to Back
          </button>
          <button
            className="dropdown-item small py-2 text-center"
            onClick={() => {
              toggleLayerHidden(contextMenu.idx);
              setContextMenu(null);
            }}
          >
            Hide / Unhide
          </button>
          <button
            className="dropdown-item small py-2 text-danger text-center"
            onClick={deleteSelected}
          >
            Delete
          </button>
        </div>
      )}
      {contextMenu && (
        <div
          className="position-fixed top-0 start-0 w-100 h-100"
          style={{ zIndex: 1999 }}
          onClick={() => setContextMenu(null)}
        />
      )}

      {/* Settings modal */}
      {settingsModalShape !== null && elements[settingsModalShape] && (
        <SettingsModal
          shape={elements[settingsModalShape]}
          bookWidth={book.widthPx}
          bookHeight={book.heightPx}
          onChange={(attrs) => updateElement(settingsModalShape, attrs)}
          onClose={() => setSettingsModalShape(null)}
        />
      )}
      {/* Page Style modal */}
      {showPageStyle && (
        <PageStyleModal
          background={background}
          onChangeLive={(next) => setBackground(next)}
          onChangeCommit={(next) => commit(undefined, next)}
          onApplyToAll={applyPageStyleToAll}
          applying={applyingStyleToAll}
          pageCount={pages.length}
          onClose={() => setShowPageStyle(false)}
        />
      )}
      {showIndexPresets && (
        <IndexPresetModal
          currentPresetId={background?.meta?.indexPresetId}
          onPick={(id) =>
            isIndexPage ? applyIndexPreset(id) : addIndexPage(id)
          }
          onClose={() => setShowIndexPresets(false)}
        />
      )}

      {showBookSettings && (
        <BookSettingsModal
          book={book}
          onClose={() => setShowBookSettings(false)}
          onSaved={(updated) => setBook(updated)}
        />
      )}

      {showPageManager && (
        <PageManagerModal
          pages={pages}
          activePageIdx={activePageIdx}
          initialSource={swapSourceIdx}
          onSwap={swapPages}
          onReorder={reorderPages}
          onSwitchPage={(idx) => switchPage(idx)}
          onClose={() => {
            setShowPageManager(false);
            setSwapSourceIdx(null);
          }}
        />
      )}

      {showAIPanel && (
        <AIPanel
          bookId={book.id}
          elements={elements}
          onInsertText={(text) => addMalayalamTextValue(text)}
          onApplyAction={applyAIAction}
          onBookGenerated={() => {
            // Full-book generation created new pages + a cover directly in
            // the DB - reload this book so they show up in the editor.
            api.get(`/books/${bookId}`).then(({ data }) => {
              setBook(data);
              setPages(data.pages);
            });
          }}
          onClose={() => setShowAIPanel(false)}
        />
      )}
      {showTransliterateModal && (
        <TransliterateModal
          hasSelection={selectedShape?.type === "text"}
          initialText={
            selectedShape?.type === "text" ? selectedShape.text || "" : ""
          }
          initialMode="translate"
          onInsert={(text) => addMalayalamTextValue(text)}
         onUpdate={(text) => {
  if (selectedId !== null) {
    const { segments, ...rest } = elements[selectedId];
    updateElement(selectedId, { ...rest, text });
  }
}}
          onClose={() => setShowTransliterateModal(false)}
        />
      )}
      {richTextModalIdx !== null && elements[richTextModalIdx] && (
        <RichTextModal
          shape={elements[richTextModalIdx]}
          onSave={(segments) => {
            updateElement(richTextModalIdx, {
              ...elements[richTextModalIdx],
              segments,
              text: segments
                .map((s) => s.text)
                .join("")
                .replace(/\n/g, " ")
                .trim(),
            });
          }}
          onClose={() => setRichTextModalIdx(null)}
        />
      )}

      {/* Preview modal */}
      {/* Preview modal */}
      {showPreview && (
        <PreviewModal
          book={book}
          pages={pages}
          onClose={() => setShowPreview(false)}
          onBookUpdate={(updated) => setBook(updated)}
        />
      )}

      {/* Export PDF modal */}
      {showExportModal && (
        <div
          className="modal show d-block"
          style={{ backgroundColor: "rgba(0,0,0,0.4)" }}
        >
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content rounded-4">
              <div className="modal-header border-0">
                <h5 className="modal-title fw-bold">Export PDF</h5>
                {!exporting && (
                  <button
                    className="btn-close"
                    onClick={() => setShowExportModal(false)}
                  ></button>
                )}
              </div>
              <div className="modal-body">
                {!exporting ? (
                  <>
                    <p className="small text-muted mb-3">
                      Choose how each page should be rendered. Higher clarity
                      means a larger file.
                    </p>
                    {Object.entries(EXPORT_QUALITY_PRESETS).map(
                      ([key, preset]) => (
                        <div
                          key={key}
                          className={`border rounded-3 p-2 mb-2 ${
                            exportPreset === key
                              ? "border-dark bg-light"
                              : "border-secondary-subtle"
                          }`}
                          role="button"
                          onClick={() => setExportPreset(key)}
                        >
                          <div className="form-check mb-0">
                            <input
                              className="form-check-input"
                              type="radio"
                              checked={exportPreset === key}
                              onChange={() => setExportPreset(key)}
                            />
                            <label className="form-check-label">
                              {preset.label}
                            </label>
                          </div>
                        </div>
                      ),
                    )}
                  </>
                ) : (
                  <div>
                    <p className="small mb-2">
                      Rendering page {exportProgress.done} of{" "}
                      {exportProgress.total}...
                    </p>
                    <div className="progress mb-2" style={{ height: 8 }}>
                      <div
                        className="progress-bar bg-dark"
                        style={{
                          width: `${(exportProgress.done / Math.max(1, exportProgress.total)) * 100}%`,
                        }}
                      ></div>
                    </div>
                    <p className="small text-muted mb-0">
                      Size so far:{" "}
                      {(exportProgress.bytes / (1024 * 1024)).toFixed(1)} MB
                    </p>
                  </div>
                )}
              </div>
              <div className="modal-footer border-0">
                {!exporting && (
                  <>
                    <button
                      className="btn btn-outline-secondary"
                      onClick={() => setShowExportModal(false)}
                    >
                      Cancel
                    </button>
                    <button className="btn btn-dark" onClick={runExport}>
                      Generate & Download
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Mobile offcanvas: Tools */}
      <div
        className={`offcanvas offcanvas-start ${showToolbar ? "show" : ""}`}
        style={{ visibility: showToolbar ? "visible" : "hidden" }}
      >
        <div className="offcanvas-header">
          <h5 className="offcanvas-title">Tools</h5>
          <button
            className="btn-close"
            onClick={() => setShowToolbar(false)}
          ></button>
        </div>
        <div className="offcanvas-body d-flex flex-column gap-2">
          <ToolbarButtons
            addText={addText}
            addTextMalayalam={addTextMalayalam}
            onOpenTransliterate={() => setShowTransliterateModal(true)}
            addImage={addImage}
            addShape={addShape}
            addPage={addPage}
            background={background}
            setBackground={(updater) =>
              commit(
                undefined,
                typeof updater === "function" ? updater(background) : updater,
              )
            }
            addBackgroundImage={addBackgroundImage}
            clearBackgroundImage={clearBackgroundImage}
            setGradient={setGradient}
            clearGradient={clearGradient}
          />

          <button
            onClick={() => setShowIndexPresets(true)}
            className="btn btn-outline-secondary btn-sm w-100 mt-1"
          >
            + Index Page
          </button>
          {isIndexPage && (
            <div className="border rounded-2 p-2 mt-1 small bg-light">
              <p className="fw-semibold mb-1">Index Page</p>
              <button
                className="btn btn-sm btn-outline-secondary w-100 mb-1"
                onClick={() => setShowIndexPresets(true)}
              >
                Change Style
              </button>
              <button
                className="btn btn-sm btn-outline-secondary w-100"
                onClick={refreshIndexEntries}
              >
                Refresh Page List
              </button>
            </div>
          )}

          {selectedShape && (
            <SelectedPanel
              shape={selectedShape}
              onChangeLive={(attrs) => updateElementLive(selectedId, attrs)}
              onChangeCommit={(attrs) => updateElement(selectedId, attrs)}
              onFront={bringToFront}
              onBack={sendToBack}
              onDelete={deleteSelected}
              onOpenSettings={() => setSettingsModalShape(selectedId)}
              onUngroup={ungroupSelected}
              onDuplicate={duplicateSelected}
            />
          )}
        </div>
      </div>

      {/* Mobile offcanvas: Layers */}
      <div
        className={`offcanvas offcanvas-end ${showLayers ? "show" : ""}`}
        style={{ visibility: showLayers ? "visible" : "hidden" }}
      >
        <div className="offcanvas-header">
          <h5 className="offcanvas-title">Layers</h5>
          <button
            className="btn-close"
            onClick={() => setShowLayers(false)}
          ></button>
        </div>
        <div className="offcanvas-body">
          <LayersPanel
            elements={elements}
            selectedId={selectedId}
            setSelectedId={setSelectedId}
            selectedLayerIds={selectedLayerIds}
            toggleLayerMergeSelect={toggleLayerMergeSelect}
            toggleLayerHidden={toggleLayerHidden}
            deleteLayer={deleteLayer}
            reorderLayer={reorderLayer}
            mergeSelectedLayers={mergeSelectedLayers}
          />
        </div>
      </div>

      {/* Mobile offcanvas: Pages */}
      <div
        className={`offcanvas offcanvas-end ${showPages ? "show" : ""}`}
        style={{ visibility: showPages ? "visible" : "hidden" }}
      >
        <div className="offcanvas-header">
          <h5 className="offcanvas-title">Pages</h5>
          <button
            className="btn btn-sm btn-outline-secondary me-2"
            onClick={() => {
              setSwapSourceIdx(null);
              setShowPageManager(true);
            }}
          >
            <ArrowLeftRight size={13} className="me-1" />
            Swap
          </button>
          <button
            className="btn-close"
            onClick={() => setShowPages(false)}
          ></button>
        </div>
        <div className="offcanvas-body d-flex flex-column gap-2">
          <PageList
            book={book}
            pages={pages}
            activePageIdx={activePageIdx}
            switchPage={switchPage}
            deletePage={deletePage}
            reorderPages={reorderPages}
            onSwapClick={(idx) => {
              setSwapSourceIdx(idx);
              setShowPageManager(true);
            }}
            onReplaceCover={handleReplaceCover}
            onReplaceBackCover={handleReplaceBackCover}
            coverUploading={coverUploading}
            backCoverUploading={backCoverUploading}
          />
        </div>
      </div>

      {(showToolbar || showPages || showLayers) && (
        <div
          className="offcanvas-backdrop fade show"
          onClick={() => {
            setShowToolbar(false);
            setShowPages(false);
            setShowLayers(false);
          }}
        ></div>
      )}
    </div>
  );
}

function SaveIndicator({ status }) {
  if (status === "saving") {
    return (
      <span className="d-flex align-items-center gap-2 small text-muted">
        <span
          className="spinner-border spinner-border-sm"
          role="status"
          style={{ width: 14, height: 14 }}
        ></span>
        Saving...
      </span>
    );
  }
  if (status === "saved") {
    return <span className="small text-success">✓ Saved</span>;
  }
  return <span className="small text-muted">Idle</span>;
}

function MalayalamTextButton({ addTextMalayalam, onOpenTransliterate }) {
  const [open, setOpen] = useState(false);
  return (
    <div>
      <div className="d-flex gap-1">
        <button
          onClick={addTextMalayalam}
          className="btn btn-outline-secondary btn-sm flex-fill"
        >
          + Malayalam Text
        </button>
        <button
          type="button"
          className="btn btn-outline-secondary btn-sm px-2"
          onClick={() => setOpen((o) => !o)}
        >
          {open ? "▲" : "▼"}
        </button>
      </div>
      {open && (
        <button
          className="btn btn-outline-secondary btn-sm w-100 mt-1"
          onClick={() => {
            onOpenTransliterate();
            setOpen(false);
          }}
        >
          Manglish / Translate → Malayalam
        </button>
      )}
    </div>
  );
}

function ToolbarButtons({
  addText,
  addTextMalayalam,
  onOpenTransliterate,
  addImage,
  addShape,
  addPage,
  background,
  setBackground,
  addBackgroundImage,
  clearBackgroundImage,
  setGradient,
  clearGradient,
}) {
  return (
    <>
      <p className="fw-semibold small text-muted mb-1">Add</p>
      <button onClick={addText} className="btn btn-outline-secondary btn-sm">
        + Add Text
      </button>
      <MalayalamTextButton
        addTextMalayalam={addTextMalayalam}
        onOpenTransliterate={onOpenTransliterate}
      />
      <label className="btn btn-outline-secondary btn-sm mb-0">
        + Add Image
        <input type="file" hidden accept="image/*" onChange={addImage} />
      </label>
      <div className="d-flex gap-1">
        <button
          onClick={() => addShape("rect")}
          className="btn btn-outline-secondary btn-sm flex-fill p-1"
          title="Rectangle"
        >
          <Square size={14} />
        </button>
        <button
          onClick={() => addShape("circle")}
          className="btn btn-outline-secondary btn-sm flex-fill p-1"
          title="Circle"
        >
          <CircleIcon size={14} />
        </button>
        <button
          onClick={() => addShape("triangle")}
          className="btn btn-outline-secondary btn-sm flex-fill p-1"
          title="Triangle"
        >
          <TriangleIcon size={14} />
        </button>
        <button
          onClick={() => addShape("star")}
          className="btn btn-outline-secondary btn-sm flex-fill p-1"
          title="Star"
        >
          <StarIcon size={14} />
        </button>
        <button
          onClick={() => addShape("line")}
          className="btn btn-outline-secondary btn-sm flex-fill p-1"
          title="Line"
        >
          <LineIcon size={14} />
        </button>
      </div>

      <div className="border-top pt-2 mt-2">
        <p className="fw-semibold small text-muted mb-1">Background</p>
        <label className="form-label small mb-1">Solid Color</label>
        <input
          type="color"
          className="form-control form-control-color w-100 mb-2"
          value={background.color}
          onChange={(e) => {
            setBackground((prev) => ({
              ...prev,
              color: e.target.value,
              gradient: null,
            }));
          }}
        />
        <label className="form-label small mb-1">Gradient</label>
        <div className="d-flex gap-1 mb-1">
          <button
            type="button"
            className={`btn btn-sm flex-fill py-0 ${
              background.gradient?.type !== "radial"
                ? "btn-dark"
                : "btn-outline-secondary"
            }`}
            onClick={() => setGradient({ type: "linear" })}
          >
            Linear
          </button>
          <button
            type="button"
            className={`btn btn-sm flex-fill py-0 ${
              background.gradient?.type === "radial"
                ? "btn-dark"
                : "btn-outline-secondary"
            }`}
            onClick={() => setGradient({ type: "radial" })}
          >
            Radial
          </button>
        </div>
        <div className="d-flex gap-2 mb-1">
          <input
            type="color"
            className="form-control form-control-color"
            value={background.gradient?.color1 || "#6366f1"}
            onChange={(e) => setGradient({ color1: e.target.value })}
          />
          <input
            type="color"
            className="form-control form-control-color"
            value={background.gradient?.color2 || "#ec4899"}
            onChange={(e) => setGradient({ color2: e.target.value })}
          />
        </div>
        {background.gradient?.type !== "radial" && (
          <>
            <label className="form-label small mb-0">Angle</label>
            <input
              type="range"
              min="0"
              max="360"
              className="form-range mb-1"
              value={background.gradient?.angle ?? 90}
              onChange={(e) => setGradient({ angle: Number(e.target.value) })}
            />
          </>
        )}
        <label className="form-label small mb-0">Intensity</label>
        <input
          type="range"
          min="0.3"
          max="2"
          step="0.05"
          className="form-range mb-2"
          value={background.gradient?.intensity ?? 1}
          onChange={(e) => setGradient({ intensity: Number(e.target.value) })}
        />
        {background.gradient && (
          <button
            className="btn btn-sm btn-outline-secondary w-100 mb-2"
            onClick={clearGradient}
          >
            Clear Gradient
          </button>
        )}
        <label className="btn btn-outline-secondary btn-sm w-100 mb-1">
          Set Background Image
          <input
            type="file"
            hidden
            accept="image/*"
            onChange={addBackgroundImage}
          />
        </label>
        {background.image && (
          <button
            className="btn btn-sm btn-outline-danger w-100"
            onClick={clearBackgroundImage}
          >
            Remove Background Image
          </button>
        )}
      </div>

      <div className="border-top pt-2 mt-2">
        <button
          onClick={() => addPage(false)}
          className="btn btn-outline-secondary btn-sm w-100 mb-2"
        >
          + Blank Page
        </button>
        <button
          onClick={() => addPage(true)}
          className="btn btn-outline-secondary btn-sm w-100"
        >
          + Copy Current Page
        </button>
      </div>
    </>
  );
}

function SelectedPanel({
  shape,
  onChangeLive,
  onChangeCommit,
  onFront,
  onBack,
  onDelete,
  onOpenSettings,
  onUngroup,
  onDuplicate,
}) {
  const alignBtn = (val, Icon) => (
    <button
      type="button"
      className={`btn btn-sm py-1 px-2 ${
        shape.align === val ? "btn-dark" : "btn-outline-secondary"
      }`}
      onClick={() => onChangeCommit({ ...shape, align: val })}
    >
      <Icon size={13} />
    </button>
  );

  return (
    <div className="border-top pt-2 mt-2">
      <p className="fw-semibold small mb-1">Selected</p>

      {shape.type === "text" && (
        <>
          <textarea
            className="form-control form-control-sm mb-1"
            rows={2}
            value={shape.text}
            onChange={(e) => onChangeLive({ ...shape, text: e.target.value })}
            onBlur={(e) => onChangeCommit({ ...shape, text: e.target.value })}
          />
          <div className="d-flex gap-1 mb-1">
            {alignBtn("left", AlignLeft)}
            {alignBtn("center", AlignCenter)}
            {alignBtn("right", AlignRight)}
            {alignBtn("justify", AlignJustify)}
          </div>
          <select
            className="form-select form-select-sm mb-1"
            value={shape.fontFamily}
            onChange={(e) =>
              onChangeCommit({ ...shape, fontFamily: e.target.value })
            }
          >
            {GOOGLE_FONTS.map((f) => (
              <option key={f} value={f}>
                {f}
              </option>
            ))}
          </select>
          <div className="d-flex gap-1 mb-1">
            <input
              type="number"
              min="6"
              max="400"
              className="form-control form-control-sm"
              value={shape.fontSize}
              onChange={(e) =>
                onChangeCommit({
                  ...shape,
                  fontSize: clamp(Number(e.target.value) || 6, 6, 400),
                })
              }
              title="Font size"
            />
            <input
              type="color"
              className="form-control form-control-color"
              style={{ width: 40 }}
              value={shape.fill || "#111111"}
              onChange={(e) =>
                onChangeCommit({ ...shape, fill: e.target.value })
              }
              title="Text color"
            />
          </div>
          <label className="form-label small mb-0">Box width</label>
          <input
            type="range"
            min={minTextWidth(shape.fontSize)}
            max={2000}
            className="form-range mb-1"
            value={shape.width || 300}
            onChange={(e) =>
              onChangeLive({ ...shape, width: Number(e.target.value) })
            }
            onMouseUp={(e) =>
              onChangeCommit({ ...shape, width: Number(e.target.value) })
            }
            onTouchEnd={(e) =>
              onChangeCommit({ ...shape, width: Number(e.target.value) })
            }
          />

          {/* --- NEW: Word spacing, inserted here --- */}
          <label className="form-label small mb-0">Word spacing</label>
          <input
            type="range"
            min="0"
            max="40"
            className="form-range mb-1"
            value={shape.wordSpacing || 0}
            onChange={(e) =>
              onChangeLive({ ...shape, wordSpacing: Number(e.target.value) })
            }
            onMouseUp={(e) =>
              onChangeCommit({ ...shape, wordSpacing: Number(e.target.value) })
            }
            onTouchEnd={(e) =>
              onChangeCommit({ ...shape, wordSpacing: Number(e.target.value) })
            }
          />

          <div className="d-flex align-items-center gap-1 mb-1">
            <span className="small text-muted" style={{ width: 60 }}>
              Bg
            </span>
            <input
              type="color"
              className="form-control form-control-color"
              style={{ width: 36 }}
              value={shape.bgColor || "#ffffff"}
              onChange={(e) =>
                onChangeCommit({ ...shape, bgColor: e.target.value })
              }
            />
            <button
              type="button"
              className="btn btn-sm btn-outline-secondary py-0"
              onClick={() => onChangeCommit({ ...shape, bgColor: null })}
            >
              None
            </button>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              className="form-range"
              value={shape.bgOpacity ?? 1}
              onChange={(e) =>
                onChangeLive({ ...shape, bgOpacity: Number(e.target.value) })
              }
              onMouseUp={(e) =>
                onChangeCommit({ ...shape, bgOpacity: Number(e.target.value) })
              }
            />
          </div>
          <div className="d-flex align-items-center gap-1 mb-2">
            <span className="small text-muted" style={{ width: 60 }}>
              Border
            </span>
            <input
              type="color"
              className="form-control form-control-color"
              style={{ width: 36 }}
              value={shape.borderColor || "#000000"}
              onChange={(e) =>
                onChangeCommit({ ...shape, borderColor: e.target.value })
              }
            />
            <input
              type="number"
              min="0"
              className="form-control form-control-sm"
              style={{ width: 55 }}
              value={shape.borderWidth || 0}
              onChange={(e) =>
                onChangeCommit({
                  ...shape,
                  borderWidth: Number(e.target.value),
                })
              }
            />
            <input
              type="number"
              min="0"
              placeholder="radius"
              className="form-control form-control-sm"
              value={shape.borderRadius || 0}
              onChange={(e) =>
                onChangeCommit({
                  ...shape,
                  borderRadius: Number(e.target.value),
                })
              }
            />
          </div>
        </>
      )}

      {shape.type === "shape" && (
        <>
          <label className="form-label small mb-0">Color</label>
          <input
            type="color"
            className="form-control form-control-color mb-1 w-100"
            value={shape.fill}
            onChange={(e) => onChangeCommit({ ...shape, fill: e.target.value })}
          />
          {shape.shapeType === "rect" && (
            <>
              <label className="form-label small mb-0">Corner radius</label>
              <input
                type="range"
                min="0"
                max={Math.min(shape.width || 100, shape.height || 100) / 2}
                className="form-range mb-1"
                value={shape.cornerRadius || 0}
                onChange={(e) =>
                  onChangeLive({
                    ...shape,
                    cornerRadius: Number(e.target.value),
                  })
                }
                onMouseUp={(e) =>
                  onChangeCommit({
                    ...shape,
                    cornerRadius: Number(e.target.value),
                  })
                }
              />
            </>
          )}
          {shape.shapeType === "line" && (
            <>
              <label className="form-label small mb-0">Thickness</label>
              <input
                type="range"
                min="1"
                max="60"
                className="form-range mb-1"
                value={shape.strokeWidth || 4}
                onChange={(e) =>
                  onChangeLive({
                    ...shape,
                    strokeWidth: Number(e.target.value),
                  })
                }
                onMouseUp={(e) =>
                  onChangeCommit({
                    ...shape,
                    strokeWidth: Number(e.target.value),
                  })
                }
              />
            </>
          )}
        </>
      )}

      {shape.type === "image" && (
        <>
          <select
            className="form-select form-select-sm mb-1"
            value={shape.clipShape || "none"}
            onChange={(e) =>
              onChangeCommit({ ...shape, clipShape: e.target.value })
            }
          >
            <option value="none">Rectangle</option>
            <option value="circle">Circle</option>
          </select>
          <label className="form-label small mb-0">Brightness</label>
          <input
            type="range"
            min="-1"
            max="1"
            step="0.05"
            className="form-range mb-1"
            value={shape.brightness ?? 0}
            onChange={(e) =>
              onChangeLive({ ...shape, brightness: Number(e.target.value) })
            }
            onMouseUp={(e) =>
              onChangeCommit({ ...shape, brightness: Number(e.target.value) })
            }
            onTouchEnd={(e) =>
              onChangeCommit({ ...shape, brightness: Number(e.target.value) })
            }
          />
          <label className="form-label small mb-0">Contrast</label>
          <input
            type="range"
            min="-100"
            max="100"
            step="5"
            className="form-range mb-1"
            value={shape.contrast ?? 0}
            onChange={(e) =>
              onChangeLive({ ...shape, contrast: Number(e.target.value) })
            }
            onMouseUp={(e) =>
              onChangeCommit({ ...shape, contrast: Number(e.target.value) })
            }
            onTouchEnd={(e) =>
              onChangeCommit({ ...shape, contrast: Number(e.target.value) })
            }
          />
        </>
      )}

      {shape.type === "group" && (
        <>
          <p className="small text-muted mb-1">
            {shape.children?.length || 0} elements grouped.
          </p>
          <button
            className="btn btn-sm btn-outline-primary w-100 mb-1"
            onClick={onUngroup}
          >
            Ungroup
          </button>
        </>
      )}

      {onDuplicate && (
        <button
          className="btn btn-sm btn-outline-secondary w-100 mb-1"
          onClick={onDuplicate}
        >
          Duplicate
        </button>
      )}
      <button
        className="btn btn-sm btn-outline-secondary w-100 mb-1"
        onClick={onOpenSettings}
      >
        Position / Size
      </button>
      <div className="d-flex gap-1 mb-1">
        <button
          className="btn btn-sm btn-outline-secondary flex-fill"
          onClick={onFront}
        >
          Front
        </button>
        <button
          className="btn btn-sm btn-outline-secondary flex-fill"
          onClick={onBack}
        >
          Back
        </button>
      </div>
      <button
        className="btn btn-sm btn-outline-danger w-100"
        onClick={onDelete}
      >
        Delete
      </button>
    </div>
  );
}

// ---- Layers panel: hide/unhide, delete, drag-reorder, multi-select group ----
function LayersPanel({
  elements,
  selectedId,
  setSelectedId,
  selectedLayerIds,
  toggleLayerMergeSelect,
  toggleLayerHidden,
  deleteLayer,
  reorderLayer,
  mergeSelectedLayers,
}) {
  const dragIdxRef = useRef(null);

  // display front-most (last in array) at the top, like Photoshop
  const order = [...elements.map((_, i) => i)].reverse();

  const iconFor = (el) => {
    if (el.type === "text") return <TypeIcon size={14} />;
    if (el.type === "image") return <ImageIcon size={14} />;
    if (el.type === "group") return <Combine size={14} />;
    if (el.shapeType === "circle") return <CircleIcon size={14} />;
    if (el.shapeType === "triangle") return <TriangleIcon size={14} />;
    if (el.shapeType === "star") return <StarIcon size={14} />;
    if (el.shapeType === "line") return <LineIcon size={14} />;
    return <Square size={14} />;
  };

  const labelFor = (el) => {
    if (el.type === "text") return el.text?.slice(0, 18) || "Text";
    if (el.type === "image") return "Image";
    if (el.type === "group") return `Group (${el.children?.length || 0})`;
    if (el.shapeType === "circle") return "Circle";
    if (el.shapeType === "triangle") return "Triangle";
    if (el.shapeType === "star") return "Star";
    if (el.shapeType === "line") return "Line";
    return "Rectangle";
  };

  return (
    <div>
      {selectedLayerIds.size >= 2 && (
        <div className="d-flex justify-content-end mb-1">
          <button
            className="btn btn-sm btn-outline-primary py-0 px-1"
            title="Group selected layers (stays editable)"
            onClick={mergeSelectedLayers}
          >
            <Combine size={12} /> Group
          </button>
        </div>
      )}
      {order.length === 0 && (
        <p className="small text-muted">No elements yet</p>
      )}
      <div className="d-flex flex-column gap-1">
        {order.map((idx) => {
          const el = elements[idx];
          return (
            <div
              key={idx}
              draggable
              onDragStart={() => (dragIdxRef.current = idx)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                if (dragIdxRef.current !== null) {
                  reorderLayer(dragIdxRef.current, idx);
                  dragIdxRef.current = null;
                }
              }}
              className={`d-flex align-items-center gap-1 p-1 rounded border ${
                selectedId === idx
                  ? "border-dark bg-light"
                  : "border-secondary-subtle"
              }`}
              style={{ cursor: "pointer", opacity: el.hidden ? 0.5 : 1 }}
              onClick={() => setSelectedId(idx)}
            >
              <span className="text-muted" style={{ cursor: "grab" }}>
                <GripVertical size={14} />
              </span>
              <input
                type="checkbox"
                className="form-check-input m-0"
                checked={selectedLayerIds.has(idx)}
                onClick={(e) => e.stopPropagation()}
                onChange={() => toggleLayerMergeSelect(idx)}
              />
              {iconFor(el)}
              <span className="small text-truncate flex-grow-1">
                {labelFor(el)}
              </span>
              <button
                className="btn btn-sm p-0 px-1"
                title={el.hidden ? "Unhide" : "Hide"}
                onClick={(e) => {
                  e.stopPropagation();
                  toggleLayerHidden(idx);
                }}
              >
                {el.hidden ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
              <button
                className="btn btn-sm p-0 px-1 text-danger"
                title="Delete"
                onClick={(e) => {
                  e.stopPropagation();
                  deleteLayer(idx);
                }}
              >
                <Trash2 size={14} />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function SettingsModal({ shape, bookWidth, bookHeight, onChange, onClose }) {
  const fitToPage = () => {
    onChange({ ...shape, x: 0, y: 0, width: bookWidth, height: bookHeight });
  };
  const centerOnPage = () => {
    const w = shape.width || shape.radius * 2 || 100;
    const h = shape.height || shape.radius * 2 || 100;
    onChange({ ...shape, x: (bookWidth - w) / 2, y: (bookHeight - h) / 2 });
  };

  return (
    <div
      className="modal show d-block"
      style={{ backgroundColor: "rgba(0,0,0,0.4)" }}
    >
      <div className="modal-dialog modal-dialog-centered">
        <div className="modal-content rounded-4">
          <div className="modal-header border-0">
            <h5 className="modal-title fw-bold">Element Settings</h5>
            <button className="btn-close" onClick={onClose}></button>
          </div>
          <div className="modal-body">
            <div className="row g-2 mb-3">
              <div className="col-6">
                <label className="form-label small">X</label>
                <input
                  type="number"
                  className="form-control form-control-sm"
                  value={Math.round(shape.x ?? 0)}
                  onChange={(e) =>
                    onChange({ ...shape, x: Number(e.target.value) })
                  }
                />
              </div>
              <div className="col-6">
                <label className="form-label small">Y</label>
                <input
                  type="number"
                  className="form-control form-control-sm"
                  value={Math.round(shape.y ?? 0)}
                  onChange={(e) =>
                    onChange({ ...shape, y: Number(e.target.value) })
                  }
                />
              </div>
              {shape.width !== undefined && (
                <>
                  <div className="col-6">
                    <label className="form-label small">Width</label>
                    <input
                      type="number"
                      className="form-control form-control-sm"
                      value={Math.round(shape.width ?? 0)}
                      onChange={(e) =>
                        onChange({ ...shape, width: Number(e.target.value) })
                      }
                    />
                  </div>
                  <div className="col-6">
                    <label className="form-label small">Height</label>
                    <input
                      type="number"
                      className="form-control form-control-sm"
                      value={Math.round(shape.height ?? 0)}
                      onChange={(e) =>
                        onChange({ ...shape, height: Number(e.target.value) })
                      }
                    />
                  </div>
                </>
              )}
              {shape.radius !== undefined && (
                <div className="col-6">
                  <label className="form-label small">Radius</label>
                  <input
                    type="number"
                    className="form-control form-control-sm"
                    value={Math.round(shape.radius ?? 0)}
                    onChange={(e) =>
                      onChange({ ...shape, radius: Number(e.target.value) })
                    }
                  />
                </div>
              )}
              <div className="col-6">
                <label className="form-label small">Rotation</label>
                <input
                  type="number"
                  className="form-control form-control-sm"
                  value={shape.rotation || 0}
                  onChange={(e) =>
                    onChange({ ...shape, rotation: Number(e.target.value) })
                  }
                />
              </div>
            </div>
            <div className="d-flex gap-2">
              <button
                className="btn btn-sm btn-outline-secondary flex-fill"
                onClick={fitToPage}
              >
                Fit to Page
              </button>
              <button
                className="btn btn-sm btn-outline-secondary flex-fill"
                onClick={centerOnPage}
              >
                Center
              </button>
            </div>
          </div>
          <div className="modal-footer border-0">
            <button className="btn btn-dark" onClick={onClose}>
              Done
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function PageStyleModal({
  background,
  onChangeLive,
  onChangeCommit,
  onClose,
  onApplyToAll,
  applying,
  pageCount,
}) {
  const border = background.border;

  const applyPreset = (presetId) => {
    const preset = BORDER_PRESETS.find((p) => p.id === presetId);
    onChangeCommit({
      ...background,
      border: {
        presetId,
        width: preset.width,
        color: border?.color || "#000000",
        radius: preset.radius ?? 0,
      },
    });
  };

  const removeBorder = () => onChangeCommit({ ...background, border: null });

  return (
    <div
      className="modal show d-block"
      style={{ backgroundColor: "rgba(0,0,0,0.4)" }}
    >
      <div className="modal-dialog modal-dialog-centered">
        <div className="modal-content rounded-4">
          <div className="modal-header border-0">
            <h5 className="modal-title fw-bold">Page Style</h5>
            <button className="btn-close" onClick={onClose}></button>
          </div>
          <div
            className="modal-body"
            style={{ maxHeight: "70vh", overflowY: "auto" }}
          >
            <label className="form-label small mb-1">Margin (px)</label>
            <input
              type="range"
              min="0"
              max="150"
              className="form-range mb-1"
              value={background.margin || 0}
              onChange={(e) =>
                onChangeLive({ ...background, margin: Number(e.target.value) })
              }
              onMouseUp={(e) =>
                onChangeCommit({
                  ...background,
                  margin: Number(e.target.value),
                })
              }
              onTouchEnd={(e) =>
                onChangeCommit({
                  ...background,
                  margin: Number(e.target.value),
                })
              }
            />
            <p className="small text-muted mb-3">{background.margin || 0}px</p>

            <label className="form-label small mb-1">Padding (px)</label>
            <input
              type="range"
              min="0"
              max="150"
              className="form-range mb-1"
              value={background.padding || 0}
              onChange={(e) =>
                onChangeLive({
                  ...background,
                  padding: Number(e.target.value),
                })
              }
              onMouseUp={(e) =>
                onChangeCommit({
                  ...background,
                  padding: Number(e.target.value),
                })
              }
              onTouchEnd={(e) =>
                onChangeCommit({
                  ...background,
                  padding: Number(e.target.value),
                })
              }
            />
            <p className="small text-muted mb-3">
              {background.padding || 0}px — dashed guide line. Text, images and
              shapes are kept inside this padding automatically: dragging,
              resizing, or changing this value will push content back inside the
              boundary.
            </p>

            <div className="d-flex align-items-center justify-content-between mb-2">
              <label className="form-label small mb-0">Border Style</label>
              {border && (
                <button
                  className="btn btn-sm btn-link text-danger p-0"
                  onClick={removeBorder}
                >
                  Remove border
                </button>
              )}
            </div>
            <div className="row g-2 mb-3">
              {BORDER_PRESETS.map((p) => (
                <div className="col-4" key={p.id}>
                  <button
                    type="button"
                    className={`btn btn-sm w-100 py-2 ${
                      border?.presetId === p.id
                        ? "btn-dark"
                        : "btn-outline-secondary"
                    }`}
                    onClick={() => applyPreset(p.id)}
                  >
                    {p.label}
                  </button>
                </div>
              ))}
            </div>

            {border && (
              <>
                <div className="d-flex align-items-center gap-2 mb-2">
                  <span className="small text-muted" style={{ width: 90 }}>
                    Color
                  </span>
                  <input
                    type="color"
                    className="form-control form-control-color"
                    value={border.color || "#000000"}
                    onChange={(e) =>
                      onChangeCommit({
                        ...background,
                        border: { ...border, color: e.target.value },
                      })
                    }
                  />
                </div>

                <label className="form-label small mb-1">Border width</label>
                <input
                  type="range"
                  min="1"
                  max="30"
                  className="form-range mb-1"
                  value={border.width || 3}
                  onChange={(e) =>
                    onChangeLive({
                      ...background,
                      border: { ...border, width: Number(e.target.value) },
                    })
                  }
                  onMouseUp={(e) =>
                    onChangeCommit({
                      ...background,
                      border: { ...border, width: Number(e.target.value) },
                    })
                  }
                  onTouchEnd={(e) =>
                    onChangeCommit({
                      ...background,
                      border: { ...border, width: Number(e.target.value) },
                    })
                  }
                />
                <p className="small text-muted mb-3">{border.width || 3}px</p>

                <label className="form-label small mb-1">Corner radius</label>
                <input
                  type="range"
                  min="0"
                  max="80"
                  className="form-range mb-1"
                  value={border.radius || 0}
                  onChange={(e) =>
                    onChangeLive({
                      ...background,
                      border: { ...border, radius: Number(e.target.value) },
                    })
                  }
                  onMouseUp={(e) =>
                    onChangeCommit({
                      ...background,
                      border: { ...border, radius: Number(e.target.value) },
                    })
                  }
                  onTouchEnd={(e) =>
                    onChangeCommit({
                      ...background,
                      border: { ...border, radius: Number(e.target.value) },
                    })
                  }
                />
                <p className="small text-muted mb-0">{border.radius || 0}px</p>
              </>
            )}

            <div className="border-top pt-3 mt-3">
              <label className="form-label small mb-1">
                Page Number (this page)
              </label>
              <select
                className="form-select form-select-sm mb-2"
                value={background.pageNumber?.mode || "inherit"}
                onChange={(e) => {
                  const mode = e.target.value;
                  onChangeCommit({
                    ...background,
                    pageNumber:
                      mode === "inherit"
                        ? null
                        : { ...(background.pageNumber || {}), mode },
                  });
                }}
              >
                <option value="inherit">Use book default</option>
                <option value="custom">Custom for this page</option>
                <option value="hidden">Hide on this page</option>
              </select>

              {background.pageNumber?.mode === "custom" && (
                <>
                  {!background.pageNumber.freeDrag ? (
                    <>
                      <select
                        className="form-select form-select-sm mb-2"
                        value={
                          background.pageNumber.position || "bottom-center"
                        }
                        onChange={(e) =>
                          onChangeCommit({
                            ...background,
                            pageNumber: {
                              ...background.pageNumber,
                              position: e.target.value,
                            },
                          })
                        }
                      >
                        {[
                          "top-left",
                          "top-center",
                          "top-right",
                          "bottom-left",
                          "bottom-center",
                          "bottom-right",
                        ].map((p) => (
                          <option key={p} value={p}>
                            {p.replace("-", " ")}
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        className="btn btn-sm btn-outline-secondary w-100 mb-2"
                        onClick={() =>
                          onChangeCommit({
                            ...background,
                            pageNumber: {
                              ...background.pageNumber,
                              freeDrag: true,
                              xFrac: background.pageNumber.xFrac ?? 0.5,
                              yFrac: background.pageNumber.yFrac ?? 0.92,
                            },
                          })
                        }
                      >
                        Enable Drag Positioning
                      </button>
                    </>
                  ) : (
                    <div className="alert alert-light border small py-2 mb-2">
                      Drag the page number directly on the canvas to position it
                      exactly.
                      <button
                        type="button"
                        className="btn btn-sm btn-outline-secondary w-100 mt-2"
                        onClick={() =>
                          onChangeCommit({
                            ...background,
                            pageNumber: {
                              ...background.pageNumber,
                              freeDrag: false,
                            },
                          })
                        }
                      >
                        Use Position List Instead
                      </button>
                    </div>
                  )}

                  <div className="d-flex gap-2 mb-2">
                    <input
                      type="color"
                      className="form-control form-control-color"
                      value={background.pageNumber.color || "#111111"}
                      onChange={(e) =>
                        onChangeCommit({
                          ...background,
                          pageNumber: {
                            ...background.pageNumber,
                            color: e.target.value,
                          },
                        })
                      }
                    />
                    <input
                      type="number"
                      className="form-control form-control-sm"
                      min="8"
                      max="72"
                      value={background.pageNumber.fontSize || 16}
                      onChange={(e) =>
                        onChangeCommit({
                          ...background,
                          pageNumber: {
                            ...background.pageNumber,
                            fontSize: Number(e.target.value),
                          },
                        })
                      }
                    />
                  </div>
                  <input
                    type="text"
                    className="form-control form-control-sm"
                    placeholder="Format e.g. Page {n} of {total}"
                    value={background.pageNumber.format || "{n}"}
                    onChange={(e) =>
                      onChangeCommit({
                        ...background,
                        pageNumber: {
                          ...background.pageNumber,
                          format: e.target.value,
                        },
                      })
                    }
                  />
                </>
              )}
            </div>

            <div className="border-top pt-3 mt-3">
              <button
                type="button"
                className="btn btn-sm btn-outline-primary w-100"
                disabled={applying || pageCount <= 1}
                onClick={onApplyToAll}
              >
                {applying
                  ? "Applying to all pages..."
                  : `Apply margin, padding & border to all ${pageCount} pages`}
              </button>
              <p className="small text-muted mt-1 mb-0">
                Only these page-style settings are copied — each page keeps its
                own text, images and shapes. Content that would fall outside the
                new padding on any page is nudged back inside automatically.
              </p>
            </div>
          </div>
          <div className="modal-footer border-0">
            <button className="btn btn-dark" onClick={onClose}>
              Done
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function IndexPresetModal({ onPick, onClose, currentPresetId }) {
  return (
    <div
      className="modal show d-block"
      style={{ backgroundColor: "rgba(0,0,0,0.4)" }}
    >
      <div className="modal-dialog modal-dialog-centered modal-lg">
        <div className="modal-content rounded-4">
          <div className="modal-header border-0">
            <h5 className="modal-title fw-bold">Choose an Index Style</h5>
            <button className="btn-close" onClick={onClose}></button>
          </div>
          <div
            className="modal-body"
            style={{ maxHeight: "65vh", overflowY: "auto" }}
          >
            <div className="row g-2">
              {INDEX_PRESETS.map((p) => (
                <div className="col-6 col-md-4" key={p.id}>
                  <button
                    type="button"
                    className={`btn w-100 py-3 ${currentPresetId === p.id ? "btn-dark" : "btn-outline-secondary"}`}
                    onClick={() => onPick(p.id)}
                  >
                    {p.label}
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function BookSettingsModal({ book, onClose, onSaved }) {
  const [backCoverFile, setBackCoverFile] = useState(null);
  const [bindingSide, setBindingSide] = useState(book.bindingSide || "right");
  const [publicTemplate, setPublicTemplate] = useState(
    book.publicTemplate || "realistic",
  );
  const [pn, setPn] = useState(
    book.pageNumberDefault || {
      enabled: false,
      position: "bottom-center",
      color: "#111111",
      fontSize: 16,
      format: "{n}",
    },
  );
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    try {
      const fd = new FormData();
      if (backCoverFile) fd.append("backCoverFile", backCoverFile);
      fd.append("bindingSide", bindingSide);
      fd.append("publicTemplate", publicTemplate);
      fd.append("pageNumberDefault", JSON.stringify(pn));
      const { data } = await api.patch(`/books/${book.id}/settings`, fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      onSaved(data);
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="modal show d-block"
      style={{ backgroundColor: "rgba(0,0,0,0.4)" }}
    >
      <div className="modal-dialog modal-dialog-centered">
        <div className="modal-content rounded-4">
          <div className="modal-header border-0">
            <h5 className="modal-title fw-bold">Book Settings</h5>
            <button className="btn-close" onClick={onClose}></button>
          </div>
          <div
            className="modal-body"
            style={{ maxHeight: "70vh", overflowY: "auto" }}
          >
            <label className="form-label small">Back Cover</label>
            <input
              type="file"
              className="form-control form-control-sm mb-3"
              accept="image/*"
              onChange={(e) => setBackCoverFile(e.target.files[0])}
            />

            <label className="form-label small">Single-page binding side</label>
            <select
              className="form-select form-select-sm mb-3"
              value={bindingSide}
              onChange={(e) => setBindingSide(e.target.value)}
            >
              <option value="right">Opens to the right</option>
              <option value="left">Opens to the left</option>
            </select>

            <label className="form-label small">Public View Template</label>
            <select
              className="form-select form-select-sm mb-3"
              value={publicTemplate}
              onChange={(e) => setPublicTemplate(e.target.value)}
            >
              <option value="realistic">Realistic Flipbook</option>
              <option value="clean">Clean Professional</option>
              <option value="gallery">Gallery / Minimal Scroll</option>
            </select>

            <div className="border-top pt-3">
              <div className="form-check form-switch mb-2">
                <input
                  className="form-check-input"
                  type="checkbox"
                  checked={pn.enabled}
                  onChange={(e) => setPn({ ...pn, enabled: e.target.checked })}
                />
                <label className="form-check-label small">
                  Show page numbers by default
                </label>
              </div>
              {pn.enabled && (
                <>
                  <select
                    className="form-select form-select-sm mb-2"
                    value={pn.position}
                    onChange={(e) => setPn({ ...pn, position: e.target.value })}
                  >
                    {[
                      "top-left",
                      "top-center",
                      "top-right",
                      "bottom-left",
                      "bottom-center",
                      "bottom-right",
                    ].map((p) => (
                      <option key={p} value={p}>
                        {p.replace("-", " ")}
                      </option>
                    ))}
                  </select>
                  <div className="d-flex gap-2 mb-2">
                    <input
                      type="color"
                      className="form-control form-control-color"
                      value={pn.color}
                      onChange={(e) => setPn({ ...pn, color: e.target.value })}
                    />
                    <input
                      type="number"
                      className="form-control form-control-sm"
                      value={pn.fontSize}
                      onChange={(e) =>
                        setPn({ ...pn, fontSize: Number(e.target.value) })
                      }
                    />
                  </div>
                  <input
                    type="text"
                    className="form-control form-control-sm"
                    value={pn.format}
                    placeholder="Page {n} of {total}"
                    onChange={(e) => setPn({ ...pn, format: e.target.value })}
                  />
                </>
              )}
            </div>
          </div>
          <div className="modal-footer border-0">
            <button className="btn btn-dark" disabled={saving} onClick={save}>
              {saving ? "Saving..." : "Save Settings"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
const PAGE_NUM_POS = {
  "top-left": { top: 20, left: 20 },
  "top-center": { top: 20, left: "50%", transform: "translateX(-50%)" },
  "top-right": { top: 20, right: 20 },
  "bottom-left": { bottom: 20, left: 20 },
  "bottom-center": { bottom: 20, left: "50%", transform: "translateX(-50%)" },
  "bottom-right": { bottom: 20, right: 20 },
};

function PreviewPageNumberBadge({ book, page, number, total }) {
  if (!page || number == null || total == null) return null;
  const override = page?.content?.background?.pageNumber;
  if (override?.mode === "hidden") return null;
  const style = override?.mode === "custom" ? override : book.pageNumberDefault;
  if (!style?.enabled) return null;
  const text = (style.format || "{n}")
    .replace("{n}", number)
    .replace("{total}", total);

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

function PreviewModal({ book, pages, onClose, onBookUpdate }) {
  const [dims, setDims] = useState({ width: 400, height: 520 });
  const [isMobile, setIsMobile] = useState(
    typeof window !== "undefined" ? window.innerWidth < 768 : false,
  );
  const [pageIdx, setPageIdx] = useState(0);
  const flipRef = useRef();
  const [pageLayout, setPageLayout] = useState(book.pageLayout || "duplex");
  const [bindingSide, setBindingSide] = useState(book.bindingSide || "right");
  const [flipStyle, setFlipStyle] = useState(book.flipStyle || "realistic");
  const [savingSettings, setSavingSettings] = useState(false);

  // Use local toggle state for the preview build below, not the stale `book` prop
  const effectiveBook = { ...book, pageLayout, bindingSide, flipStyle };

  const applySettingsToBook = async (patch) => {
    setSavingSettings(true);
    try {
      const { data } = await api.patch(`/books/${book.id}/settings`, {
        pageLayout: patch.pageLayout ?? pageLayout,
        bindingSide: patch.bindingSide ?? bindingSide,
      });
      onBookUpdate?.(data);
    } catch (err) {
      console.error("Failed to save layout settings:", err);
    } finally {
      setSavingSettings(false);
    }
  };

  useEffect(() => {
    const ratio = book.widthPx / book.heightPx;

    const compute = () => {
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const mobile = vw < 768;
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
    window.addEventListener("resize", compute);
    return () => window.removeEventListener("resize", compute);
  }, [book]);

  const goPrev = () => flipRef.current?.pageFlip?.().flipPrev();
  const goNext = () => flipRef.current?.pageFlip?.().flipNext();

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "ArrowLeft") goPrev();
      if (e.key === "ArrowRight") goNext();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Build the flip sequence exactly like the public view: cover, then each
  // page (inserting a blank leaf after/before depending on binding side
  // when single-sided), then back cover, then an even-count pad on desktop.
  const flipPages = (() => {
    const list = [];
    if (effectiveBook.coverImage) {
      list.push({
        key: "cover",
        src: resolveSrc(effectiveBook.coverImage),
        blank: false,
        cover: true,
      });
    }
    pages.forEach((p, i) => {
      list.push({
        key: p.id,
        src: p.previewImage || resolveSrc(p.background),
        blank: false,
        page: p,
        number: i + 1,
        total: pages.length,
      });
      if (effectiveBook.pageLayout === "simplex") {
        const blankEntry = { key: `${p.id}-blank`, src: null, blank: true };
        if (effectiveBook.bindingSide === "left") {
          list.splice(list.length - 1, 0, blankEntry);
        } else {
          list.push(blankEntry);
        }
      }
    });
    if (effectiveBook.backCoverImage) {
      list.push({
        key: "back-cover",
        src: resolveSrc(effectiveBook.backCoverImage),
        blank: false,
        cover: true,
      });
    }
    if (!isMobile) {
      const contentCount = effectiveBook.coverImage
        ? list.length - 1
        : list.length;
      if (contentCount % 2 !== 0) {
        list.push({ key: "pad-end", src: null, blank: true });
      }
    }
    return list;
  })();
  const totalPages = flipPages.length;
  const bookWidth = isMobile ? dims.width : dims.width * 2;
  const remountKey = `${isMobile ? "m" : "d"}-${Math.round(dims.width)}x${Math.round(dims.height)}-${pageLayout}-${bindingSide}`;
  return (
    <div
      className="position-fixed top-0 start-0 w-100 h-100 d-flex flex-column align-items-center justify-content-center"
      style={{ backgroundColor: "rgba(0,0,0,0.85)", zIndex: 2000 }}
    >
      <button
        className="btn btn-light rounded-circle position-absolute"
        onClick={onClose}
        style={{ width: 40, height: 40, top: 20, right: 20, zIndex: 2001 }}
      >
        ×
      </button>

      <div
        className="position-absolute d-flex align-items-center gap-2 bg-white rounded-pill shadow-sm px-3 py-2"
        style={{ top: 20, left: 20, zIndex: 2001, fontSize: 13 }}
      >
        <select
          className="form-select form-select-sm"
          style={{ width: 130 }}
          value={pageLayout}
          onChange={(e) => {
            const val = e.target.value;
            setPageLayout(val);
            applySettingsToBook({ pageLayout: val });
          }}
        >
          <option value="duplex">Double-sided</option>
          <option value="simplex">Single-sided</option>
        </select>
        {pageLayout === "simplex" && (
          <select
            className="form-select form-select-sm"
            style={{ width: 110 }}
            value={bindingSide}
            onChange={(e) => {
              const val = e.target.value;
              setBindingSide(val);
              applySettingsToBook({ bindingSide: val });
            }}
          >
            <option value="right">Bind right</option>
            <option value="left">Bind left</option>
          </select>
        )}
        {savingSettings && (
          <span className="spinner-border spinner-border-sm text-secondary"></span>
        )}
      </div>

      <div style={{ position: "relative", padding: isMobile ? 24 : 60 }}>
        <div
          style={{
            width: bookWidth,
            height: dims.height,
            position: "relative",
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
            flippingTime={effectiveBook.flipStyle === "fade" ? 500 : 900}
            useMouseEvents={true}
            clickEventForward={true}
            swipeDistance={20}
            showPageCorners={true}
            disableFlipByClick={false}
            className="pageflip-book"
            style={{
              boxShadow:
                "0 1px 2px rgba(0,0,0,0.08), 0 20px 40px rgba(0,0,0,0.18)",
              transformStyle: "preserve-3d",
            }}
            onFlip={(e) => setPageIdx(e.data)}
          >
            {flipPages.map((p, i) =>
              p.blank ? (
                <div
                  key={p.key}
                  className="page"
                  style={{
                    background: "#ffffff",
                    width: "100%",
                    height: "100%",
                  }}
                ></div>
              ) : (
                <div
                  key={p.key}
                  className="page"
                  style={{
                    background: "#ffffff",
                    position: "relative",
                    overflow: "hidden",
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
                  <PreviewPageNumberBadge
                    book={effectiveBook}
                    page={p.page}
                    number={p.number}
                    total={p.total}
                  />
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

      <div className="d-flex align-items-center gap-3 mt-3">
        <button
          onClick={goPrev}
          className="btn btn-light rounded-circle"
          style={{ width: 40, height: 40 }}
        >
          ‹
        </button>
        <span
          className="text-white small"
          style={{ minWidth: 60, textAlign: "center" }}
        >
          {pageIdx + 1} / {totalPages}
        </span>
        <button
          onClick={goNext}
          className="btn btn-light rounded-circle"
          style={{ width: 40, height: 40 }}
        >
          ›
        </button>
      </div>

      <style>{`
          .pageflip-book { user-select: none; }
          .pageflip-book .page { background: #ffffff !important; backface-visibility: hidden; -webkit-backface-visibility: hidden; }
          .pageflip-book .stf__item, .pageflip-book .stf__block { background: #ffffff; }
        `}</style>
    </div>
  );
}

function PageList({
  book,
  activePageIdx,
  pages,
  switchPage,
  deletePage,
  reorderPages,
  onSwapClick,
  onReplaceCover,
  onReplaceBackCover,
  coverUploading,
  backCoverUploading,
}) {
  const dragIdxRef = useRef(null);
  const [dragOverIdx, setDragOverIdx] = useState(null);
  const [viewerSrc, setViewerSrc] = useState(null); // set to show a fullscreen preview
  const baseUrl = import.meta.env.VITE_BASE_URL.replace("/api", "");
  const resolve = (src) =>
    src
      ? src.startsWith("http") || src.startsWith("data:")
        ? src
        : `${baseUrl}${src}`
      : null;
  const SlotRow = ({ label, image, onReplace, uploading }) => (
    <div className="d-flex align-items-center gap-2 border rounded-2 p-1 mb-1 border-secondary-subtle">
      <div
        onClick={() => image && setViewerSrc(resolve(image))}
        role="button"
        className="d-flex align-items-center gap-2 flex-grow-1"
      >
        <div
          className="bg-light d-flex align-items-center justify-content-center flex-shrink-0 position-relative"
          style={{
            width: 36,
            height: 46,
            overflow: "hidden",
            border: "1px solid #eee",
          }}
        >
          {image ? (
            <img
              src={resolve(image)}
              alt={label}
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
            />
          ) : (
            <span className="text-muted" style={{ fontSize: 9 }}>
              No image
            </span>
          )}
          {uploading && (
            <div
              className="position-absolute top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center"
              style={{ background: "rgba(255,255,255,0.7)" }}
            >
              <span
                className="spinner-border spinner-border-sm"
                style={{ width: 16, height: 16 }}
              ></span>
            </div>
          )}
        </div>
        <span className="small">{label}</span>
      </div>
      <label
        className="btn btn-sm btn-outline-secondary py-0 px-1 mb-0"
        style={{
          fontSize: 11,
          pointerEvents: uploading ? "none" : "auto",
          opacity: uploading ? 0.6 : 1,
        }}
        title={`Replace ${label}`}
      >
        {uploading ? (
          <span
            className="spinner-border spinner-border-sm"
            style={{ width: 10, height: 10 }}
          ></span>
        ) : (
          "Replace"
        )}
        <input
          type="file"
          hidden
          accept="image/*"
          onChange={onReplace}
          disabled={uploading}
        />
      </label>
    </div>
  );

  return (
    <>
      <SlotRow
        label="Cover"
        image={book.coverImage}
        onReplace={onReplaceCover}
        uploading={coverUploading}
      />
      <SlotRow
        label="Back Cover"
        image={book.backCoverImage}
        onReplace={onReplaceBackCover}
        uploading={backCoverUploading}
      />
      <hr className="my-1" />
      {pages.map((p, idx) => (
        <div
          key={p.id}
          draggable
          onDragStart={() => (dragIdxRef.current = idx)}
          onDragOver={(e) => {
            e.preventDefault();
            if (dragOverIdx !== idx) setDragOverIdx(idx);
          }}
          onDragLeave={() => setDragOverIdx(null)}
          onDrop={(e) => {
            e.preventDefault();
            if (dragIdxRef.current !== null && dragIdxRef.current !== idx) {
              reorderPages(dragIdxRef.current, idx);
            }
            dragIdxRef.current = null;
            setDragOverIdx(null);
          }}
          onDragEnd={() => {
            dragIdxRef.current = null;
            setDragOverIdx(null);
          }}
          className={`d-flex align-items-center gap-1 border rounded-2 p-1 ${
            idx === activePageIdx
              ? "border-dark border-2"
              : "border-secondary-subtle"
          }`}
          style={{
            cursor: "grab",
            background: dragOverIdx === idx ? "#f0f0f0" : undefined,
          }}
        >
          <span className="text-muted" style={{ cursor: "grab" }}>
            <GripVertical size={14} />
          </span>
          <div
            onClick={() => switchPage(idx)}
            role="button"
            className={`flex-grow-1 text-center small ${
              idx === activePageIdx ? "fw-semibold" : ""
            }`}
          >
            Page {idx + 1}
          </div>
          <button
            className="btn btn-sm p-0 px-1 text-primary"
            title="Swap this page with another"
            onClick={(e) => {
              e.stopPropagation();
              onSwapClick(idx);
            }}
          >
            <ArrowLeftRight size={13} />
          </button>
          <button
            className="btn btn-sm p-0 px-1 text-danger"
            title="Delete page"
            onClick={(e) => {
              e.stopPropagation();
              deletePage(idx);
            }}
          >
            <Trash2 size={13} />
          </button>
        </div>
      ))}

      {viewerSrc && (
        <div
          className="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center"
          style={{ backgroundColor: "rgba(0,0,0,0.8)", zIndex: 3000 }}
          onClick={() => setViewerSrc(null)}
        >
          <img
            src={viewerSrc}
            style={{
              maxWidth: "90vw",
              maxHeight: "90vh",
              objectFit: "contain",
            }}
          />
          <button
            className="btn btn-light rounded-circle position-absolute"
            style={{ width: 40, height: 40, top: 20, right: 20 }}
            onClick={() => setViewerSrc(null)}
          >
            ×
          </button>
        </div>
      )}
    </>
  );
}

function PageManagerModal({
  pages,
  activePageIdx,
  initialSource,
  onSwap,
  onReorder,
  onSwitchPage,
  onClose,
}) {
  const [swapMode, setSwapMode] = useState(initialSource != null);
  const [sourceIdx, setSourceIdx] = useState(initialSource ?? null);
  const [swapCount, setSwapCount] = useState(0);
  const dragIdxRef = useRef(null);
  const [dragOverIdx, setDragOverIdx] = useState(null);
  const baseUrl = import.meta.env.VITE_BASE_URL.replace("/api", "");
  const resolve = (src) =>
    src
      ? src.startsWith("http") || src.startsWith("data:")
        ? src
        : `${baseUrl}${src}`
      : null;

  const handleCardClick = (idx) => {
    if (!swapMode) {
      onSwitchPage(idx);
      onClose();
      return;
    }
    if (sourceIdx === null) {
      setSourceIdx(idx);
      return;
    }
    if (sourceIdx === idx) {
      setSourceIdx(null);
      return;
    }
    onSwap(sourceIdx, idx);
    setSwapCount((c) => c + 1);
    setSourceIdx(null); // stays in swap mode, ready for the next pair
  };

  return (
    <div
      className="modal show d-block"
      style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
    >
      <div className="modal-dialog modal-dialog-centered modal-xl">
        <div className="modal-content rounded-4">
          <div className="modal-header border-0">
            <div>
              <h5 className="modal-title fw-bold mb-0">Manage Pages</h5>
              <p className="small text-muted mb-0">
                {swapMode
                  ? sourceIdx === null
                    ? "Swap Mode: click a page, then click another to swap them. Repeat for as many swaps as you like."
                    : `Page ${sourceIdx + 1} selected — click any other page to swap with it.`
                  : "Drag a page onto another to move it, or turn on Swap Mode to exchange two exactly."}
              </p>
            </div>
            <button className="btn-close" onClick={onClose}></button>
          </div>
          <div
            className="modal-body"
            style={{ maxHeight: "70vh", overflowY: "auto" }}
          >
            <div className="d-flex align-items-center gap-2 mb-3">
              <button
                type="button"
                className={`btn btn-sm ${swapMode ? "btn-dark" : "btn-outline-secondary"}`}
                onClick={() => {
                  setSwapMode((m) => !m);
                  setSourceIdx(null);
                }}
              >
                <ArrowLeftRight size={13} className="me-1" />
                Swap Mode {swapMode ? "On" : "Off"}
              </button>
              {swapMode && swapCount > 0 && (
                <span className="small text-success">
                  {swapCount} swap{swapCount > 1 ? "s" : ""} made
                </span>
              )}
            </div>

            <div className="row g-3">
              {pages.map((p, idx) => (
                <div className="col-6 col-md-3 col-lg-2" key={p.id}>
                  <div
                    draggable={!swapMode}
                    onDragStart={() => (dragIdxRef.current = idx)}
                    onDragOver={(e) => {
                      if (swapMode) return;
                      e.preventDefault();
                      if (dragOverIdx !== idx) setDragOverIdx(idx);
                    }}
                    onDragLeave={() => setDragOverIdx(null)}
                    onDrop={(e) => {
                      if (swapMode) return;
                      e.preventDefault();
                      if (
                        dragIdxRef.current !== null &&
                        dragIdxRef.current !== idx
                      ) {
                        onReorder(dragIdxRef.current, idx);
                      }
                      dragIdxRef.current = null;
                      setDragOverIdx(null);
                    }}
                    onDragEnd={() => {
                      dragIdxRef.current = null;
                      setDragOverIdx(null);
                    }}
                    onClick={() => handleCardClick(idx)}
                    role="button"
                    className={`border rounded-3 p-1 position-relative ${
                      sourceIdx === idx
                        ? "border-primary border-2"
                        : idx === activePageIdx
                          ? "border-dark border-2"
                          : "border-secondary-subtle"
                    }`}
                    style={{
                      cursor: swapMode ? "pointer" : "grab",
                      background: dragOverIdx === idx ? "#f0f0f0" : "#fff",
                    }}
                  >
                    <div
                      className="bg-light d-flex align-items-center justify-content-center"
                      style={{
                        width: "100%",
                        aspectRatio: "3/4",
                        overflow: "hidden",
                      }}
                    >
                      {p.previewImage ? (
                        <img
                          src={resolve(p.previewImage)}
                          alt={`Page ${idx + 1}`}
                          style={{
                            width: "100%",
                            height: "100%",
                            objectFit: "cover",
                          }}
                        />
                      ) : (
                        <span className="text-muted small">No preview</span>
                      )}
                    </div>
                    <p className="small text-center mb-0 mt-1 fw-semibold">
                      Page {idx + 1}
                    </p>
                    {sourceIdx === idx && (
                      <span
                        className="badge bg-primary position-absolute"
                        style={{ top: 6, right: 6 }}
                      >
                        Selected
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="modal-footer border-0">
            <button className="btn btn-dark" onClick={onClose}>
              Done
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
