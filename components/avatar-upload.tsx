"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Camera, X, Check, Loader2, ZoomIn, ZoomOut } from "lucide-react";

const PREVIEW_SIZE = 256; // px — diameter of the circular crop preview (must equal OUTPUT_SIZE for 1:1 WYSIWYG)
const OUTPUT_SIZE  = 256; // px — exported square (with circular clip)

interface AvatarCropModalProps {
  file: File;
  onClose: () => void;
  onUploaded: (url: string) => void;
}

export function AvatarCropModal({ file, onClose, onUploaded }: AvatarCropModalProps) {
  const [imgSrc,      setImgSrc]      = useState("");
  const [naturalSize, setNaturalSize] = useState({ w: 0, h: 0 });
  const [scale,       setScale]       = useState(1);
  const [offset,      setOffset]      = useState({ x: 0, y: 0 });
  const [dragging,    setDragging]    = useState(false);
  const [dragStart,   setDragStart]   = useState({ x: 0, y: 0 });
  const [status, setStatus] = useState<"idle" | "uploading" | "done" | "error">("idle");

  const cropAreaRef = useRef<HTMLDivElement>(null);

  // Create object URL from the picked file
  useEffect(() => {
    const url = URL.createObjectURL(file);
    setImgSrc(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  // When image loads → compute fill scale and reset offset
  const handleImageLoad = useCallback((e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    const w = img.naturalWidth;
    const h = img.naturalHeight;
    setNaturalSize({ w, h });
    setScale(Math.max(PREVIEW_SIZE / w, PREVIEW_SIZE / h));
    setOffset({ x: 0, y: 0 });
  }, []);

  // Attach passive:false wheel listener via ref (React synthetic events are passive in some builds)
  useEffect(() => {
    const el = cropAreaRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const factor = e.deltaY > 0 ? 0.92 : 1.08;
      setScale(prev => {
        const min = naturalSize.w > 0
          ? Math.max(PREVIEW_SIZE / naturalSize.w, PREVIEW_SIZE / naturalSize.h)
          : 0.5;
        return Math.max(min, Math.min(8, prev * factor));
      });
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [naturalSize]);

  // Mouse drag
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setDragging(true);
    setDragStart({ x: e.clientX - offset.x, y: e.clientY - offset.y });
  }, [offset]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!dragging) return;
    setOffset({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
  }, [dragging, dragStart]);

  const handleMouseUp = useCallback(() => setDragging(false), []);

  // Touch drag
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (e.touches.length !== 1) return;
    setDragging(true);
    setDragStart({ x: e.touches[0].clientX - offset.x, y: e.touches[0].clientY - offset.y });
  }, [offset]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!dragging || e.touches.length !== 1) return;
    setOffset({ x: e.touches[0].clientX - dragStart.x, y: e.touches[0].clientY - dragStart.y });
  }, [dragging, dragStart]);

  // Zoom buttons
  const zoom = useCallback((dir: 1 | -1) => {
    setScale(prev => {
      const factor = dir > 0 ? 1.15 : 0.87;
      const min = naturalSize.w > 0
        ? Math.max(PREVIEW_SIZE / naturalSize.w, PREVIEW_SIZE / naturalSize.h)
        : 0.5;
      return Math.max(min, Math.min(8, prev * factor));
    });
  }, [naturalSize]);

  // Save: render to canvas → base64 → POST
  const handleSave = useCallback(async () => {
    if (status !== "idle" || !imgSrc || naturalSize.w === 0) return;
    setStatus("uploading");

    try {
      const img = new Image();
      img.src = imgSrc;
      await new Promise<void>((resolve, reject) => {
        img.onload  = () => resolve();
        img.onerror = () => reject(new Error("img load failed"));
      });

      const canvas = document.createElement("canvas");
      canvas.width  = OUTPUT_SIZE;
      canvas.height = OUTPUT_SIZE;
      const ctx = canvas.getContext("2d")!;

      // Circular clip
      ctx.beginPath();
      ctx.arc(OUTPUT_SIZE / 2, OUTPUT_SIZE / 2, OUTPUT_SIZE / 2, 0, Math.PI * 2);
      ctx.clip();

      // Source-rectangle approach: compute which pixels of the original image are
      // visible inside the crop circle, then map them exactly onto the canvas.
      // This is true WYSIWYG — the canvas output matches the preview 1:1.
      //
      // In the preview the image is centered at:
      //   cx = PREVIEW_SIZE/2 + offset.x  (screen px)
      //   cy = PREVIEW_SIZE/2 + offset.y  (screen px)
      // Each screen pixel corresponds to (1/scale) source pixels, so the center of
      // the visible crop square in source image coordinates is:
      //   srcCX = naturalSize.w/2 - offset.x / scale
      //   srcCY = naturalSize.h/2 - offset.y / scale
      // The crop square is OUTPUT_SIZE screen pixels wide, i.e. OUTPUT_SIZE/scale
      // source pixels wide (PREVIEW_SIZE === OUTPUT_SIZE, so no correction needed).
      const srcSize = OUTPUT_SIZE / scale;
      const srcCX   = naturalSize.w / 2 - offset.x / scale;
      const srcCY   = naturalSize.h / 2 - offset.y / scale;
      ctx.drawImage(
        img,
        srcCX - srcSize / 2,  // sx — left edge of the source rectangle
        srcCY - srcSize / 2,  // sy — top  edge of the source rectangle
        srcSize,               // sWidth
        srcSize,               // sHeight
        0,                     // dx
        0,                     // dy
        OUTPUT_SIZE,           // dWidth
        OUTPUT_SIZE            // dHeight
      );

      const base64 = canvas.toDataURL("image/png");

      const res = await fetch("/api/profile/avatar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ base64 }),
      });

      if (!res.ok) throw new Error("upload failed");

      const data = await res.json() as { ok: boolean; avatar_url: string };
      setStatus("done");
      setTimeout(() => {
        onUploaded(data.avatar_url);
        onClose();
      }, 700);
    } catch {
      setStatus("error");
      setTimeout(() => setStatus("idle"), 2000);
    }
  }, [status, imgSrc, naturalSize, scale, offset, onUploaded, onClose]);

  const imgW = naturalSize.w * scale;
  const imgH = naturalSize.h * scale;

  return (
    <>
      {/* Backdrop */}
      <div
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 99993,
          background: "rgba(3,10,20,0.88)",
          backdropFilter: "blur(6px)",
        }}
        onClick={onClose}
      />

      {/* Modal card */}
      <div
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 99994,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          pointerEvents: "none",
        }}
      >
        <div
          style={{
            background: "linear-gradient(160deg, #0D2140 0%, #091628 100%)",
            border: "1px solid #1E3A5C",
            borderRadius: "16px",
            padding: "28px 24px 24px",
            width: "min(340px, 94vw)",
            boxShadow: "0 0 80px rgba(0,0,0,0.9), 0 0 0 1px rgba(255,214,10,0.06)",
            pointerEvents: "auto",
          }}
        >
          {/* Header */}
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "18px" }}>
            <div>
              <p style={{
                fontFamily: "var(--font-arcade)",
                fontSize: "9px",
                letterSpacing: "0.12em",
                color: "#FFD60A",
                textShadow: "0 0 10px rgba(255,214,10,0.7)",
                marginBottom: "4px",
              }}>
                CAMBIAR AVATAR
              </p>
              <p style={{ fontSize: "11px", color: "#7A9AC0", lineHeight: 1.4 }}>
                Arrastrá para centrar · Scroll para zoom
              </p>
            </div>
            <button
              onClick={onClose}
              style={{
                background: "rgba(255,255,255,0.05)",
                border: "1px solid #1E3A5C",
                borderRadius: "6px",
                padding: "5px",
                cursor: "pointer",
                color: "#5A7A96",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <X style={{ width: "14px", height: "14px" }} />
            </button>
          </div>

          {/* Circular crop preview */}
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "16px" }}>
            <div style={{ position: "relative" }}>
              {/* Outer glow ring */}
              <div style={{
                position: "absolute",
                inset: "-3px",
                borderRadius: "50%",
                background: "linear-gradient(135deg, #00D67A, #0056D6, #FFD60A)",
                zIndex: 0,
                opacity: 0.7,
              }} />

              {/* Crop circle */}
              <div
                ref={cropAreaRef}
                style={{
                  position: "relative",
                  zIndex: 1,
                  width: `${PREVIEW_SIZE}px`,
                  height: `${PREVIEW_SIZE}px`,
                  borderRadius: "50%",
                  overflow: "hidden",
                  background: "#030303",
                  cursor: dragging ? "grabbing" : "grab",
                  userSelect: "none",
                  touchAction: "none",
                }}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleMouseUp}
              >
                {imgSrc && naturalSize.w > 0 && (
                  <img
                    src={imgSrc}
                    alt=""
                    draggable={false}
                    style={{
                      position: "absolute",
                      // Only set width; let the browser compute height from the natural
                      // aspect ratio. Setting both dimensions explicitly can introduce
                      // subpixel rounding that stretches non-square images.
                      width: `${imgW}px`,
                      left:  `${PREVIEW_SIZE / 2 - imgW / 2 + offset.x}px`,
                      top:   `${PREVIEW_SIZE / 2 - imgH / 2 + offset.y}px`,
                      pointerEvents: "none",
                    }}
                  />
                )}

                {/* Loading state */}
                {(!imgSrc || naturalSize.w === 0) && (
                  <div style={{
                    position: "absolute",
                    inset: 0,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "#5A7A96",
                  }}>
                    <Loader2 style={{ width: "24px", height: "24px", animation: "spin 1s linear infinite" }} />
                  </div>
                )}
              </div>

              {/* Hidden img to trigger onLoad and get natural dimensions */}
              {imgSrc && (
                <img
                  src={imgSrc}
                  alt=""
                  onLoad={handleImageLoad}
                  style={{ position: "absolute", width: 0, height: 0, opacity: 0, pointerEvents: "none" }}
                />
              )}
            </div>

            {/* Zoom controls */}
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <button
                onClick={() => zoom(-1)}
                style={{
                  background: "rgba(255,255,255,0.05)",
                  border: "1px solid #1E3A5C",
                  borderRadius: "8px",
                  padding: "8px",
                  cursor: "pointer",
                  color: "#A8B5CC",
                  display: "flex",
                }}
              >
                <ZoomOut style={{ width: "14px", height: "14px" }} />
              </button>

              {/* Zoom bar */}
              <div style={{
                flex: 1,
                height: "3px",
                borderRadius: "2px",
                background: "#0D1F35",
                position: "relative",
                minWidth: "100px",
              }}>
                <div style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  height: "100%",
                  borderRadius: "2px",
                  background: "linear-gradient(90deg, #00D67A, #0056D6)",
                  width: `${Math.min(100, ((scale - 0.5) / 7.5) * 100)}%`,
                  transition: "width 0.1s",
                }} />
              </div>

              <button
                onClick={() => zoom(1)}
                style={{
                  background: "rgba(255,255,255,0.05)",
                  border: "1px solid #1E3A5C",
                  borderRadius: "8px",
                  padding: "8px",
                  cursor: "pointer",
                  color: "#A8B5CC",
                  display: "flex",
                }}
              >
                <ZoomIn style={{ width: "14px", height: "14px" }} />
              </button>
            </div>

            {/* Action buttons */}
            <div style={{ display: "flex", gap: "10px", width: "100%" }}>
              <button
                onClick={onClose}
                style={{
                  flex: 1,
                  padding: "11px",
                  borderRadius: "8px",
                  border: "1px solid #1E3A5C",
                  background: "transparent",
                  color: "#7A9AC0",
                  fontSize: "13px",
                  cursor: "pointer",
                  fontWeight: 500,
                }}
              >
                Cancelar
              </button>

              <button
                onClick={handleSave}
                disabled={status !== "idle" || naturalSize.w === 0}
                style={{
                  flex: 2,
                  padding: "11px",
                  borderRadius: "8px",
                  border: "none",
                  background: status === "done"
                    ? "linear-gradient(135deg, #00D67A 0%, #00B865 100%)"
                    : status === "error"
                    ? "#D7263D"
                    : "linear-gradient(135deg, #00D67A 0%, #009855 100%)",
                  color: status === "error" ? "#fff" : "#000",
                  fontSize: "13px",
                  fontWeight: 700,
                  cursor: status === "idle" && naturalSize.w > 0 ? "pointer" : "not-allowed",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "7px",
                  opacity: naturalSize.w === 0 ? 0.5 : 1,
                  transition: "background 0.3s",
                }}
              >
                {status === "uploading" ? (
                  <>
                    <Loader2 style={{ width: "14px", height: "14px", animation: "spin 1s linear infinite" }} />
                    Subiendo…
                  </>
                ) : status === "done" ? (
                  <>
                    <Check style={{ width: "14px", height: "14px" }} />
                    ¡Guardado!
                  </>
                ) : status === "error" ? (
                  "Error — reintentar"
                ) : (
                  <>
                    <Camera style={{ width: "14px", height: "14px" }} />
                    Guardar avatar
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
