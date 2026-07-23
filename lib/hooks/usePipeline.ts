"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { fileToImageData, dataUrlToImageData } from "@/lib/image/loadImage";
import { DEFAULT_COLOR_COUNT } from "@/lib/image/constants";
import { isImageQuality, resolveImageQuality } from "@/lib/image/quality";
import type { ImageQuality, PipelineResult, ResolvedImageQuality } from "@/lib/image/types";
import type { PipelineStage, WorkerRequest, WorkerResponse } from "@/lib/worker/messages";

export type PipelineStatus = "idle" | "processing" | "ready" | "error";
const QUALITY_KEY = "huely-image-quality";

/**
 * Runs the image pipeline (oil paint + palette + paint-by-numbers) in a Web
 * Worker so the UI never blocks. `process` handles a fresh file; `setColorCount`
 * re-quantizes the already-computed oil image without re-running the filter.
 * Exposes staged progress ("painting" → "colors" → "numbering") and a preview
 * URL of the picked photo so processing can show it dimmed (spec 03).
 */
export function usePipeline() {
  const workerRef = useRef<Worker | null>(null);
  const idRef = useRef(0);
  const originalRef = useRef<ImageData | null>(null);
  const oilRef = useRef<ImageData | null>(null);
  const resolvedQualityRef = useRef<ResolvedImageQuality>("balanced");
  const qualityRef = useRef<ImageQuality>("auto");

  const [status, setStatus] = useState<PipelineStatus>("idle");
  const [stage, setStage] = useState<PipelineStage | null>(null);
  const [result, setResult] = useState<PipelineResult | null>(null);
  const [colorCount, setColorCountState] = useState(DEFAULT_COLOR_COUNT);
  const [quality, setQualityState] = useState<ImageQuality>("auto");
  const [error, setError] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const previewRef = useRef<string | null>(null);

  const clearPreview = () => {
    if (previewRef.current) URL.revokeObjectURL(previewRef.current);
    previewRef.current = null;
    setPreviewUrl(null);
  };

  useEffect(() => {
    const worker = new Worker(new URL("../worker/pipeline.worker.ts", import.meta.url));
    workerRef.current = worker;

    worker.onmessage = (e: MessageEvent<WorkerResponse>) => {
      const msg = e.data;
      if (msg.type === "stage") {
        if (msg.id === idRef.current) setStage(msg.stage);
        return;
      }
      const original = originalRef.current;
      if (!original || msg.id !== idRef.current) return;

      if (msg.type === "process") {
        oilRef.current = msg.oil;
        setResult({
          w: msg.oil.width,
          h: msg.oil.height,
          original,
          oil: msg.oil,
          pbnBase: msg.pbnBase,
          palette: msg.palette,
          labels: msg.labels,
          index: msg.index,
          quality: resolvedQualityRef.current,
        });
        setStatus("ready");
        setStage(null);
      } else if (msg.type === "requantize" && oilRef.current) {
        setResult({
          w: oilRef.current.width,
          h: oilRef.current.height,
          original,
          oil: oilRef.current,
          pbnBase: msg.pbnBase,
          palette: msg.palette,
          labels: msg.labels,
          index: msg.index,
          quality: resolvedQualityRef.current,
        });
        setStatus("ready");
        setStage(null);
      }
    };

    worker.onerror = (e) => {
      setError(e.message || "Image worker failed.");
      setStatus("error");
      setStage(null);
    };

    return () => {
      worker.terminate();
      workerRef.current = null;
    };
  }, []);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(QUALITY_KEY);
      if (isImageQuality(saved)) {
        qualityRef.current = saved;
        setQualityState(saved);
      }
    } catch {
      // Keep Auto when storage is unavailable.
    }
  }, []);

  const process = useCallback(
    async (file: File) => {
      if (!file.type.startsWith("image/")) {
        setError("That doesn't look like an image.");
        setStatus("error");
        return;
      }
      setError(null);
      setStatus("processing");
      setStage("painting");
      clearPreview();
      const url = URL.createObjectURL(file);
      previewRef.current = url;
      setPreviewUrl(url);
      try {
        const profile = resolveImageQuality(qualityRef.current);
        const prepared = await fileToImageData(file, profile);
        originalRef.current = prepared.reference;
        resolvedQualityRef.current = profile.id;
        const req: WorkerRequest = {
          type: "process",
          id: ++idRef.current,
          imageData: prepared.working,
          colorCount,
        };
        const worker = workerRef.current;
        if (!worker) throw new Error("Image processor is still starting. Try again.");
        worker.postMessage(req, [prepared.working.data.buffer as ArrayBuffer]);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not read that image.");
        setStatus("error");
        setStage(null);
      }
    },
    [colorCount],
  );

  // Re-run the full pipeline from a cached (device-local) source image, at the
  // saved color count — used to reopen a project as a full-res workspace.
  const processDataUrl = useCallback(
    async (url: string, count: number) => {
      setError(null);
      setStatus("processing");
      setStage("painting");
      clearPreview();
      previewRef.current = null;
      setPreviewUrl(url);
      try {
        const profile = resolveImageQuality(qualityRef.current);
        const prepared = await dataUrlToImageData(url, profile);
        setColorCountState(count);
        originalRef.current = prepared.reference;
        resolvedQualityRef.current = profile.id;
        const req: WorkerRequest = {
          type: "process",
          id: ++idRef.current,
          imageData: prepared.working,
          colorCount: count,
        };
        const worker = workerRef.current;
        if (!worker) throw new Error("Image processor is still starting. Try again.");
        worker.postMessage(req, [prepared.working.data.buffer as ArrayBuffer]);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not open that project.");
        setStatus("error");
        setStage(null);
      }
    },
    [],
  );

  const setQuality = useCallback((next: ImageQuality) => {
    qualityRef.current = next;
    setQualityState(next);
    try {
      localStorage.setItem(QUALITY_KEY, next);
    } catch {
      // Preference remains active for this session.
    }
  }, []);

  const setColorCount = useCallback((n: number) => {
    setColorCountState(n);
    if (oilRef.current) {
      setStatus("processing");
      setStage("colors");
      const req: WorkerRequest = {
        type: "requantize",
        id: ++idRef.current,
        oil: oilRef.current,
        colorCount: n,
      };
      workerRef.current?.postMessage(req);
    }
  }, []);

  const reset = useCallback(() => {
    originalRef.current = null;
    oilRef.current = null;
    setResult(null);
    setError(null);
    setStatus("idle");
    setStage(null);
    clearPreview();
  }, []);

  return {
    status,
    stage,
    result,
    error,
    colorCount,
    quality,
    previewUrl,
    process,
    processDataUrl,
    setColorCount,
    setQuality,
    reset,
  };
}
