"use client";

import { useEffect, useRef, useState } from "react";
import { BrowserMultiFormatReader } from "@zxing/browser";
import { BarcodeFormat, DecodeHintType } from "@zxing/library";
import type { IScannerControls } from "@zxing/browser";
import { normalizeIsbn } from "@/lib/books";

export type ScanStatus = {
  text: string;
  kind: "ok" | "warn" | "err";
} | null;

export type ScanTally = { added: number; dupes: number; failed: number };

type Props = {
  onDetected: (isbn: string) => void;
  onClose: () => void;
  /** Live feedback shown inside the scanner while it stays open. */
  status?: ScanStatus;
  tally?: ScanTally;
};

// Pace continuous scanning: ignore any read within this window of the last
// accepted one, and block the *same* code for longer so lingering on a book
// doesn't re-add it.
const COOLDOWN_MS = 1300;
const SAME_CODE_BLOCK_MS = 6000;

export default function Scanner({
  onDetected,
  onClose,
  status = null,
  tally,
}: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [flash, setFlash] = useState(false);

  // Keep the latest callback without restarting the camera on every render.
  const onDetectedRef = useRef(onDetected);
  useEffect(() => {
    onDetectedRef.current = onDetected;
  }, [onDetected]);

  useEffect(() => {
    const hints = new Map();
    hints.set(DecodeHintType.POSSIBLE_FORMATS, [
      BarcodeFormat.EAN_13,
      BarcodeFormat.EAN_8,
      BarcodeFormat.UPC_A,
      BarcodeFormat.UPC_E,
    ]);

    const reader = new BrowserMultiFormatReader(hints);
    let controls: IScannerControls | undefined;
    let active = true;
    let lastCode: string | null = null;
    let lastAt = 0;

    reader
      .decodeFromConstraints(
        { video: { facingMode: { ideal: "environment" } } },
        videoRef.current!,
        (result, _err, ctrl) => {
          controls = ctrl;
          if (!result || !active) return;
          const text = result.getText();
          // One physical barcode can decode to different raw strings (an
          // EAN-13 with vs. without its 5-digit price supplement), and both
          // normalize to the same ISBN. Debounce on the normalized key so a
          // single book isn't accepted twice and flagged as "already had".
          const key = normalizeIsbn(text) || text;
          const now = Date.now();
          // Debounce: too soon since last accept, or same code held in view.
          if (now - lastAt < COOLDOWN_MS) return;
          if (key === lastCode && now - lastAt < SAME_CODE_BLOCK_MS) return;
          lastCode = key;
          lastAt = now;
          if (navigator.vibrate) navigator.vibrate(45);
          setFlash(true);
          window.setTimeout(() => setFlash(false), 180);
          onDetectedRef.current(text);
        }
      )
      .then((ctrl) => {
        controls = ctrl;
      })
      .catch((e: unknown) => {
        const msg = e instanceof Error ? e.message : String(e);
        setError(
          /permission|denied|allowed/i.test(msg)
            ? "Camera permission was denied. Allow camera access and try again."
            : `Couldn't start the camera: ${msg}`
        );
      });

    return () => {
      active = false;
      try {
        controls?.stop();
      } catch {
        /* ignore */
      }
    };
  }, []);

  return (
    <div className="scanner-overlay" role="dialog" aria-label="Barcode scanner">
      <div className="scanner-top">
        <span>Keep pointing at each book&rsquo;s barcode</span>
        <button className="scanner-close" onClick={onClose} aria-label="Done scanning">
          Done
        </button>
      </div>

      <div className="scanner-video-wrap">
        <video ref={videoRef} className="scanner-video" muted playsInline />
        <div className={`scanner-reticle ${flash ? "hit" : ""}`} />
      </div>

      <div className="scanner-status">
        {error ? (
          <p className="scanner-error">{error}</p>
        ) : status ? (
          <p className={`scan-msg ${status.kind}`}>{status.text}</p>
        ) : (
          <p className="scanner-hint">
            Scans keep going. Move to the next book after each
            beep/buzz.
          </p>
        )}
        {tally && (
          <div className="scan-tally" aria-live="polite">
            <span className="ok">{tally.added} added</span>
            <span className="warn">{tally.dupes} already had</span>
            {tally.failed > 0 && <span className="err">{tally.failed} missed</span>}
          </div>
        )}
      </div>
    </div>
  );
}
