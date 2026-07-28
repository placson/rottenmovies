"use client";

import { useEffect, useRef, useState } from "react";
import { BrowserMultiFormatReader } from "@zxing/browser";
import { BarcodeFormat, DecodeHintType } from "@zxing/library";
import type { IScannerControls } from "@zxing/browser";

type Props = {
  onDetected: (isbn: string) => void;
  onClose: () => void;
};

export default function Scanner({ onDetected, onClose }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const hints = new Map();
    // Book barcodes are EAN-13 (ISBN-13). Include a few related formats.
    hints.set(DecodeHintType.POSSIBLE_FORMATS, [
      BarcodeFormat.EAN_13,
      BarcodeFormat.EAN_8,
      BarcodeFormat.UPC_A,
      BarcodeFormat.UPC_E,
    ]);

    const reader = new BrowserMultiFormatReader(hints);
    let controls: IScannerControls | undefined;
    let done = false;

    reader
      .decodeFromConstraints(
        { video: { facingMode: { ideal: "environment" } } },
        videoRef.current!,
        (result, _err, ctrl) => {
          controls = ctrl;
          if (result && !done) {
            done = true;
            // Haptic feedback on supported phones.
            if (navigator.vibrate) navigator.vibrate(80);
            onDetected(result.getText());
          }
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
      done = true;
      try {
        controls?.stop();
      } catch {
        /* ignore */
      }
    };
  }, [onDetected]);

  return (
    <div className="scanner-overlay" role="dialog" aria-label="Barcode scanner">
      <div className="scanner-top">
        <span>Point at a book&rsquo;s barcode</span>
        <button className="scanner-close" onClick={onClose} aria-label="Close scanner">
          ✕
        </button>
      </div>

      <div className="scanner-video-wrap">
        <video ref={videoRef} className="scanner-video" muted playsInline />
        <div className="scanner-reticle" />
      </div>

      {error ? (
        <p className="scanner-error">{error}</p>
      ) : (
        <p className="scanner-hint">Hold steady — it scans automatically.</p>
      )}
    </div>
  );
}
