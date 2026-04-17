import { useEffect, useRef, useState, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";

const FRAME_W = 400;
const FRAME_H = 160;
const VIEW_W = 400;
const VIEW_H = 160;
const OUTPUT_W = 400;
const OUTPUT_H = 160;

interface LogoCropperProps {
  open: boolean;
  imageSrc: string | null;
  onCancel: () => void;
  onConfirm: (dataUrl: string) => void;
}

export function LogoCropper({ open, imageSrc, onCancel, onConfirm }: LogoCropperProps) {
  const imgRef = useRef<HTMLImageElement | null>(null);
  const [naturalSize, setNaturalSize] = useState<{ w: number; h: number } | null>(null);
  const [zoom, setZoom] = useState(1);
  const [minZoom, setMinZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const dragRef = useRef<{ startX: number; startY: number; baseX: number; baseY: number } | null>(null);

  useEffect(() => {
    if (!open || !imageSrc) {
      setNaturalSize(null);
      setZoom(1);
      setMinZoom(1);
      setOffset({ x: 0, y: 0 });
    }
  }, [open, imageSrc]);

  const handleImgLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    const w = img.naturalWidth;
    const h = img.naturalHeight;
    setNaturalSize({ w, h });
    const fitZoom = Math.max(VIEW_W / w, VIEW_H / h);
    setMinZoom(fitZoom);
    setZoom(fitZoom);
    setOffset({ x: (VIEW_W - w * fitZoom) / 2, y: (VIEW_H - h * fitZoom) / 2 });
  };

  const clampOffset = useCallback(
    (next: { x: number; y: number }, currentZoom: number) => {
      if (!naturalSize) return next;
      const scaledW = naturalSize.w * currentZoom;
      const scaledH = naturalSize.h * currentZoom;
      const minX = Math.min(0, VIEW_W - scaledW);
      const maxX = Math.max(0, VIEW_W - scaledW);
      const minY = Math.min(0, VIEW_H - scaledH);
      const maxY = Math.max(0, VIEW_H - scaledH);
      return {
        x: Math.min(maxX, Math.max(minX, next.x)),
        y: Math.min(maxY, Math.max(minY, next.y)),
      };
    },
    [naturalSize]
  );

  const handleZoomChange = (val: number[]) => {
    const newZoom = val[0];
    if (!naturalSize) {
      setZoom(newZoom);
      return;
    }
    const cx = VIEW_W / 2;
    const cy = VIEW_H / 2;
    const imgX = (cx - offset.x) / zoom;
    const imgY = (cy - offset.y) / zoom;
    const newOffset = clampOffset(
      { x: cx - imgX * newZoom, y: cy - imgY * newZoom },
      newZoom
    );
    setZoom(newZoom);
    setOffset(newOffset);
  };

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    dragRef.current = { startX: e.clientX, startY: e.clientY, baseX: offset.x, baseY: offset.y };
  };

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragRef.current) return;
    const dx = e.clientX - dragRef.current.startX;
    const dy = e.clientY - dragRef.current.startY;
    setOffset(clampOffset({ x: dragRef.current.baseX + dx, y: dragRef.current.baseY + dy }, zoom));
  };

  const onPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {}
    dragRef.current = null;
  };

  const handleConfirm = () => {
    if (!imgRef.current || !naturalSize) return;
    const canvas = document.createElement("canvas");
    canvas.width = OUTPUT_W;
    canvas.height = OUTPUT_H;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";

    const sx = -offset.x / zoom;
    const sy = -offset.y / zoom;
    const sw = FRAME_W / zoom;
    const sh = FRAME_H / zoom;

    ctx.clearRect(0, 0, OUTPUT_W, OUTPUT_H);
    ctx.drawImage(imgRef.current, sx, sy, sw, sh, 0, 0, OUTPUT_W, OUTPUT_H);

    const dataUrl = canvas.toDataURL("image/png");
    onConfirm(dataUrl);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onCancel(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Crop logo</DialogTitle>
          <DialogDescription>
            Drag to position, zoom to resize. The framed area becomes your logo.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div
            className="relative mx-auto overflow-hidden rounded border bg-[conic-gradient(from_0deg,#f3f4f6_0deg_90deg,#e5e7eb_90deg_180deg,#f3f4f6_180deg_270deg,#e5e7eb_270deg_360deg)] bg-[length:16px_16px] cursor-grab active:cursor-grabbing select-none touch-none"
            style={{ width: VIEW_W, height: VIEW_H, maxWidth: "100%" }}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
          >
            {imageSrc && (
              <img
                ref={imgRef}
                src={imageSrc}
                alt="Crop source"
                onLoad={handleImgLoad}
                draggable={false}
                style={{
                  position: "absolute",
                  left: offset.x,
                  top: offset.y,
                  width: naturalSize ? naturalSize.w * zoom : "auto",
                  height: naturalSize ? naturalSize.h * zoom : "auto",
                  maxWidth: "none",
                  pointerEvents: "none",
                }}
              />
            )}
          </div>

          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Zoom</Label>
            <Slider
              value={[zoom]}
              min={minZoom}
              max={Math.max(minZoom * 4, minZoom + 0.01)}
              step={0.01}
              onValueChange={handleZoomChange}
              disabled={!naturalSize}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onCancel}>Cancel</Button>
          <Button onClick={handleConfirm} disabled={!naturalSize}>Use logo</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
