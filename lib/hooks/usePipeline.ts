"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { fileToImageData } from "@/lib/image/loadImage";
import { DEFAULT_COLOR_COUNT } from "@/lib/image/constants";
import type { PipelineResult } from "@/lib/image/types";
import type { WorkerRequest, WorkerResponse } from "@/lib/worker/messages";

export type PipelineStatus = "idle" | "processing" | "ready" | "error";

/**
 * Runs the image pipeline (oil paint + palette + paint-by-numbers) in a Web
 * Worker so the UI never blocks. `process` handles a fresh file; `setColorCount`
 * re-quantizes the already-computed oil image without re-running the filter.
 */
export function usePipeline() {
  const workerRef = useRef<Worker | null>(null);
  const idRef = useRef(0);
  const originalRef = useRef<ImageData | null>(null);
  const oilRef = useRef<ImageData | null>(null);

  const [status, setStatus] = useState<PipelineStatus>("idle");
  const [result, setResult] = useState<PipelineResult | null>(null);
  const [colorCount, setColorCountState] = useState(DEFAULT_COLOR_COUNT);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const worker = new Worker(new URL("../worker/pipeline.worker.ts", import.meta.url));
    workerRef.current = worker;

    worker.onmessage = (e: MessageEvent<WorkerResponse>) => {
      const msg = e.data;
      const original = originalRef.current;
      if (!original) return;

      if (msg.type === "process") {
        oilRef.current = msg.oil;
        setResult({
          w: original.width,
          h: original.height,
          original,
          oil: msg.oil,
          pbnBase: msg.pbnBase,
          palette: msg.palette,
          labels: msg.labels,
        });
        setStatus("ready");
      } else if (msg.type === "requantize" && oilRef.current) {
        setResult({
          w: original.width,
          h: original.height,
          original,
          oil: oilRef.current,
          pbnBase: msg.pbnBase,
          palette: msg.palette,
          labels: msg.labels,
        });
        setStatus("ready");
      }
    };

    worker.onerror = (e) => {
      setError(e.message || "Image worker failed.");
      setStatus("error");
    };

    return () => {
      worker.terminate();
      workerRef.current = null;
    };
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
      try {
        const imageData = await fileToImageData(file);
        originalRef.current = imageData;
        const req: WorkerRequest = {
          type: "process",
          id: ++idRef.current,
          imageData,
          colorCount,
        };
        workerRef.current?.postMessage(req);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not read that image.");
        setStatus("error");
      }
    },
    [colorCount],
  );

  const setColorCount = useCallback((n: number) => {
    setColorCountState(n);
    if (oilRef.current) {
      setStatus("processing");
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
  }, []);

  return { status, result, error, colorCount, process, setColorCount, reset };
}
