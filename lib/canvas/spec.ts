export type CanvasUnit = "in" | "cm";
export type CanvasFit = "fill" | "fit";

export interface CanvasSpec {
  width: number;
  height: number;
  unit: CanvasUnit;
  fit: CanvasFit;
}

function tidyMeasurement(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(1).replace(/\.0$/, "");
}

export function formatCanvasSize(canvas: CanvasSpec): string {
  return `${tidyMeasurement(canvas.width)} × ${tidyMeasurement(canvas.height)} ${canvas.unit}`;
}

export function formatCanvasCellSize(canvas: CanvasSpec, columns: number): string {
  if (columns <= 0) return "";
  const rows = Math.max(1, Math.round((columns * canvas.height) / canvas.width));
  const cellWidth = canvas.width / columns;
  const cellHeight = canvas.height / rows;
  const width = tidyMeasurement(cellWidth);
  const height = tidyMeasurement(cellHeight);
  return cellWidth.toFixed(2) === cellHeight.toFixed(2)
    ? `${width} ${canvas.unit} squares`
    : `${width} × ${height} ${canvas.unit} cells`;
}

export function isCanvasSpec(value: unknown): value is CanvasSpec {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<CanvasSpec>;
  return (
    typeof candidate.width === "number" &&
    Number.isFinite(candidate.width) &&
    candidate.width > 0 &&
    typeof candidate.height === "number" &&
    Number.isFinite(candidate.height) &&
    candidate.height > 0 &&
    (candidate.unit === "in" || candidate.unit === "cm") &&
    (candidate.fit === "fill" || candidate.fit === "fit")
  );
}
